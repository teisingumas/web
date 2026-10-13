<?php
// JSON API for the admin (/api/admin/*, Clerk sign-in required) and the public news pages
// (/api/public/*). public/.htaccess sends every /api/... request here.
//
// Writes may arrive as POST with "X-HTTP-Method-Override: PUT|PATCH|DELETE": some shared
// hosting firewalls block real PUT/DELETE requests, so the admin always uses that form.

declare(strict_types=1);

require dirname(__DIR__) . '/lib/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$override = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '');
if ($method === 'POST' && in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) $method = $override;
$path = '/' . trim(preg_replace('#^/api#', '', (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH)), '/');

$routes = [
    ['GET', '#^/status$#', 'route_status', false],
    ['GET', '#^/public/posts$#', 'route_public_posts', false],
    ['GET', '#^/public/posts/([a-z0-9-]{1,120})$#', 'route_public_post', false],
    ['GET', '#^/admin/me$#', 'route_me', true],
    ['GET', '#^/admin/content$#', 'route_content', true],
    ['PUT', '#^/admin/content/([a-z.]{1,64})$#', 'route_save_content', true],
    ['GET', '#^/admin/seo$#', 'route_seo', true],
    ['PUT', '#^/admin/seo/([a-z]{1,32})$#', 'route_save_seo', true],
    ['GET', '#^/admin/posts$#', 'route_posts', true],
    ['POST', '#^/admin/posts$#', 'route_create_post', true],
    ['GET', '#^/admin/posts/slug-check$#', 'route_slug_check', true],
    ['GET', '#^/admin/posts/(\d+)$#', 'route_post', true],
    ['PUT', '#^/admin/posts/(\d+)$#', 'route_update_post', true],
    ['DELETE', '#^/admin/posts/(\d+)$#', 'route_delete_post', true],
    ['GET', '#^/admin/media$#', 'route_media', true],
    ['POST', '#^/admin/media$#', 'route_upload', true],
    ['PATCH', '#^/admin/media/(\d+)$#', 'route_update_media', true],
    ['DELETE', '#^/admin/media/(\d+)$#', 'route_delete_media', true],
];

try {
    $matchedPath = false;
    foreach ($routes as [$routeMethod, $pattern, $handler, $auth]) {
        if (!preg_match($pattern, $path, $m)) continue;
        $matchedPath = true;
        if ($routeMethod !== $method) continue;
        if ($auth) {
            if (!db_configured()) throw new ApiError(503, 'not_configured', 'Svetainės duomenų bazė dar neprijungta (megusta-config.php).');
            require_admin();
        }
        $result = $handler(...array_slice($m, 1));
        json_out(200, $result);
        exit;
    }
    throw $matchedPath ? new ApiError(405, 'method', 'Netinkamas užklausos metodas.') : not_found('Tokio API adreso nėra.');
} catch (ApiError $e) {
    error_out($e);
} catch (PDOException $e) {
    log_error("API $method $path", $e);
    error_out(new ApiError(500, 'database', 'Duomenų bazės klaida. Bandykite dar kartą po minutės.'));
} catch (Throwable $e) {
    log_error("API $method $path", $e);
    error_out(new ApiError(500, 'server', 'Serverio klaida. Bandykite dar kartą.'));
}

// --- setup check (shown on /adminas until everything is ready) -----------------------------

function route_status(): array
{
    $configFound = is_file(config_path());
    $db = false;
    if (db_configured()) {
        try {
            db();
            $db = true;
        } catch (Throwable $e) {
            log_error('Database connection failed', $e);
        }
    }
    $dataDir = ensure_dir(data_dir() . '/media') && is_writable(data_dir() . '/media');
    $checks = [
        'php' => version_compare(PHP_VERSION, '8.1.0', '>='),
        'config' => $configFound,
        'database' => $db,
        'clerk' => clerk_frontend_api() !== null,
        'admins' => count((array) config_value('admin_user_ids', [])) > 0,
        'storage' => $dataDir,
        'images' => function_exists('imagecreatefromstring') && class_exists('finfo'),
    ];
    $out = ['ready' => !in_array(false, $checks, true), 'checks' => $checks, 'phpVersion' => PHP_VERSION];
    // Where the config file must go (only while it is missing).
    if (!$configFound) $out['configPath'] = config_path();
    return $out;
}

// --- public ---------------------------------------------------------------------------------

function route_public_posts(): array
{
    if (!db_configured()) return ['items' => [], 'page' => 1, 'pages' => 1, 'total' => 0];
    return public_posts_page(db(), (int) ($_GET['page'] ?? 1));
}

function route_public_post(string $slug): array
{
    $row = db_configured() ? find_published_post(db(), $slug) : null;
    if (!$row) throw not_found('Naujiena nerasta.');
    return post_public($row);
}

// --- admin ----------------------------------------------------------------------------------

function route_me(): array
{
    return ['userId' => require_admin()];
}

function route_content(): array
{
    return ['sections' => (object) load_section_rows(db())];
}

function route_save_content(string $key): array
{
    $body = json_body();
    return save_section(db(), $key, $body['data'] ?? null);
}

function route_seo(): array
{
    return ['pages' => load_seo(db())];
}

function route_save_seo(string $page): array
{
    return save_seo(db(), $page, json_body());
}

function route_posts(): array
{
    return admin_list_posts(db(), (string) ($_GET['status'] ?? ''), (string) ($_GET['q'] ?? ''), (int) ($_GET['page'] ?? 1));
}

function route_post(string $id): array
{
    return post_admin(find_post(db(), (int) $id));
}

function route_create_post(): array
{
    return admin_save_post(db(), null, json_body());
}

function route_update_post(string $id): array
{
    return admin_save_post(db(), (int) $id, json_body());
}

function route_delete_post(string $id): array
{
    admin_delete_post(db(), (int) $id);
    return ['ok' => true];
}

function route_slug_check(): array
{
    $slug = strtolower(trim((string) ($_GET['slug'] ?? '')));
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    $problem = slug_problem(db(), $slug, $id);
    return ['ok' => $problem === null, 'message' => $problem];
}

function route_media(): array
{
    return ['items' => list_media(db())];
}

function route_upload(): array
{
    // post_max_size overflow: PHP drops the whole body
    if (empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        throw new ApiError(413, 'too_large', 'Nuotrauka per didelė. Didžiausias leidžiamas dydis — 2 MB.');
    }
    return store_upload(db(), $_FILES['file'] ?? [], (string) ($_POST['alt'] ?? ''));
}

function route_update_media(string $id): array
{
    $body = json_body();
    return update_media_alt(db(), (int) $id, $body['alt'] ?? '');
}

function route_delete_media(string $id): array
{
    delete_media(db(), (int) $id);
    return ['ok' => true];
}
