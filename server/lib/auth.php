<?php
declare(strict_types=1);

// Clerk session tokens: the admin sends the short-lived JWT from Clerk's getToken() as
// "Authorization: Bearer …". We check the RS256 signature with Clerk's public key (JWKS,
// fetched once and cached), the expiry, the issuer and the origin it was issued for, and that
// the account is one of admin_user_ids in megusta-config.php. Clerk's secret key is not needed.

function b64url_decode(string $s): string
{
    $decoded = base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
    if ($decoded === false) throw new ApiError(401, 'unauthorized', 'Prisijunkite iš naujo.');
    return $decoded;
}

/** "clerk.example.lt" or "xxx.clerk.accounts.dev", taken from the publishable key. */
function clerk_frontend_api(): ?string
{
    $key = (string) config_value('clerk_publishable_key', '');
    if (!preg_match('/^pk_(test|live)_([A-Za-z0-9+\/=_-]+)$/', $key, $m)) return null;
    $decoded = base64_decode(strtr($m[2], '-_', '+/'), true);
    if ($decoded === false) return null;
    $host = rtrim($decoded, '$');
    return preg_match('/^[a-z0-9.\-]+$/i', $host) ? strtolower($host) : null;
}

function asn1_length(int $len): string
{
    if ($len < 128) return chr($len);
    $bytes = ltrim(pack('N', $len), "\0");
    return chr(0x80 | strlen($bytes)) . $bytes;
}

/** RSA public key (JWK n/e) as PEM, for openssl_verify. */
function jwk_to_pem(string $n, string $e): string
{
    $int = function (string $bytes): string {
        if (ord($bytes[0]) > 0x7f) $bytes = "\0" . $bytes;
        return "\x02" . asn1_length(strlen($bytes)) . $bytes;
    };
    $rsa = $int(b64url_decode($n)) . $int(b64url_decode($e));
    $rsa = "\x30" . asn1_length(strlen($rsa)) . $rsa;
    $bitString = "\x03" . asn1_length(strlen($rsa) + 1) . "\0" . $rsa;
    $algorithm = hex2bin('300d06092a864886f70d0101010500');
    $spki = "\x30" . asn1_length(strlen($algorithm . $bitString)) . $algorithm . $bitString;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

/** kid => PEM. Cached for 12 h; $refresh forces a new download (a key Clerk rotated in). */
function clerk_keys(bool $refresh = false): array
{
    // A PEM pasted into the config ("JWT public key" in the Clerk dashboard) works without network access.
    $pem = (string) config_value('clerk_jwt_key', '');
    if ($pem !== '') return ['*' => $pem];

    $api = clerk_frontend_api();
    if (!$api) throw new ApiError(500, 'config', 'Neteisingas Clerk raktas (clerk_publishable_key) megusta-config.php faile.');
    $cache = data_dir() . '/cache/jwks-' . md5($api) . '.json';
    if (!$refresh && is_file($cache) && filemtime($cache) > time() - 43200) {
        $keys = json_decode((string) file_get_contents($cache), true);
        if (is_array($keys) && $keys) return $keys;
    }
    if ($refresh && is_file($cache) && filemtime($cache) > time() - 300) {
        // refreshed a moment ago; do not hammer Clerk with tokens signed by an unknown key
        return json_decode((string) file_get_contents($cache), true) ?: [];
    }
    $json = http_get("https://$api/.well-known/jwks.json");
    $jwks = $json ? json_decode($json, true) : null;
    if (!is_array($jwks['keys'] ?? null)) {
        log_error("Cannot load Clerk JWKS from $api");
        throw new ApiError(503, 'auth_unavailable', 'Nepavyko susisiekti su Clerk prisijungimo sistema. Bandykite po minutės.');
    }
    $keys = [];
    foreach ($jwks['keys'] as $jwk) {
        if (($jwk['kty'] ?? '') === 'RSA' && isset($jwk['kid'], $jwk['n'], $jwk['e'])) $keys[$jwk['kid']] = jwk_to_pem($jwk['n'], $jwk['e']);
    }
    if (ensure_dir(dirname($cache))) @file_put_contents($cache, json_encode($keys), LOCK_EX);
    return $keys;
}

function http_get(string $url): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_FOLLOWLOCATION => false]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $body !== false && $status === 200 ? (string) $body : null;
    }
    $body = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 8]]));
    return $body === false ? null : $body;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) if (strcasecmp($name, 'Authorization') === 0) $header = $value;
    }
    return preg_match('/^Bearer\s+([A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)$/', trim($header), $m) ? $m[1] : null;
}

/** Origins a token may be issued for: the site itself plus any listed in the config (local development). */
function allowed_origins(): array
{
    $origins = [site_url()];
    $host = preg_replace('/[^A-Za-z0-9.:\-]/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($host !== '') array_push($origins, "https://$host", "http://$host");
    foreach ((array) config_value('extra_origins', []) as $o) $origins[] = rtrim((string) $o, '/');
    return array_unique($origins);
}

/** Verifies the token and returns its claims; does not check the allowed users. */
function verify_session_token(string $jwt): array
{
    $unauthorized = new ApiError(401, 'unauthorized', 'Sesija baigėsi. Prisijunkite iš naujo.');
    [$h, $p, $s] = explode('.', $jwt);
    $header = json_decode(b64url_decode($h), true);
    $claims = json_decode(b64url_decode($p), true);
    if (!is_array($header) || !is_array($claims) || ($header['alg'] ?? '') !== 'RS256') throw $unauthorized;

    $kid = (string) ($header['kid'] ?? '');
    $keys = clerk_keys();
    $pem = $keys[$kid] ?? $keys['*'] ?? null;
    if (!$pem) {
        $keys = clerk_keys(true);
        $pem = $keys[$kid] ?? null;
    }
    if (!$pem || openssl_verify("$h.$p", b64url_decode($s), $pem, OPENSSL_ALGO_SHA256) !== 1) throw $unauthorized;

    $now = time();
    $leeway = 10;
    if (!isset($claims['exp']) || $claims['exp'] < $now - $leeway) throw $unauthorized;
    if (isset($claims['nbf']) && $claims['nbf'] > $now + $leeway) throw $unauthorized;
    $api = clerk_frontend_api();
    if ($api && ($claims['iss'] ?? '') !== "https://$api") throw $unauthorized;
    if (isset($claims['azp']) && !in_array(rtrim((string) $claims['azp'], '/'), allowed_origins(), true)) throw $unauthorized;
    if (!is_string($claims['sub'] ?? null) || $claims['sub'] === '') throw $unauthorized;
    return $claims;
}

/** The signed-in admin's Clerk user ID; throws 401/403 otherwise. */
function require_admin(): string
{
    $token = bearer_token();
    if (!$token) throw new ApiError(401, 'unauthorized', 'Prisijunkite.');
    $claims = verify_session_token($token);
    $allowed = array_map('strval', (array) config_value('admin_user_ids', []));
    if (!in_array($claims['sub'], $allowed, true)) {
        throw new ApiError(403, 'not_allowed', 'Ši paskyra neturi prieigos prie turinio valdymo.', ['userId' => $claims['sub']]);
    }
    return $claims['sub'];
}
