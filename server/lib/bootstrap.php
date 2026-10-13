<?php
// Shared setup for index.php, the API and the small helper scripts.
// Secrets live in megusta-config.php one folder above public_html, never in git.

declare(strict_types=1);

const MEGUSTA_SCHEMA_VERSION = 1;

date_default_timezone_set('Europe/Vilnius');
ini_set('display_errors', '0');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/sanitize.php';
require_once __DIR__ . '/content.php';
require_once __DIR__ . '/posts.php';
require_once __DIR__ . '/media.php';
require_once __DIR__ . '/auth.php';

/** Path of the config file: MEGUSTA_CONFIG (local testing) or next to public_html. */
function config_path(): string
{
    $env = getenv('MEGUSTA_CONFIG');
    if ($env) return $env;
    // lib/ is inside public_html, so two levels up is domains/<domain>/
    return dirname(__DIR__, 2) . '/megusta-config.php';
}

/** The config array, or [] when the file is missing (the site still works with built-in content). */
function config(): array
{
    static $config = null;
    if ($config !== null) return $config;
    $path = config_path();
    $config = is_file($path) ? (require $path) : [];
    if (!is_array($config)) $config = [];
    return $config;
}

function config_value(string $key, $default = null)
{
    $c = config();
    return array_key_exists($key, $c) ? $c[$key] : $default;
}

/** Folder for uploaded images and caches, outside public_html so deployments never touch it. */
function data_dir(): string
{
    $dir = config_value('data_dir') ?: dirname(config_path()) . '/megusta-data';
    return rtrim((string) $dir, '/');
}

function ensure_dir(string $dir): bool
{
    return is_dir($dir) || @mkdir($dir, 0755, true);
}

/** https://example.lt (no trailing slash): from the config, otherwise from the request. */
function site_url(): string
{
    $url = (string) config_value('site_url', '');
    if ($url !== '') return rtrim($url, '/');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
    $host = preg_replace('/[^A-Za-z0-9.:\-]/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    return ($https ? 'https' : 'http') . '://' . $host;
}

function absolute_url(string $pathOrUrl): string
{
    if ($pathOrUrl === '' || preg_match('#^https?://#i', $pathOrUrl)) return $pathOrUrl;
    return site_url() . '/' . ltrim($pathOrUrl, '/');
}

function log_error(string $message, ?Throwable $e = null): void
{
    $line = '[megusta] ' . $message;
    if ($e) $line .= ': ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine();
    error_log($line);
}

/** UTC timestamp for the database. */
function now_utc(): string
{
    return gmdate('Y-m-d H:i:s');
}

/** Database UTC datetime to ISO 8601 for the browser. */
function iso_utc(?string $value): ?string
{
    if (!$value) return null;
    return str_replace(' ', 'T', $value) . 'Z';
}
