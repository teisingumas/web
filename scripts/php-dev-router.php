<?php
// Local development only (not deployed): `php -S localhost:8080 -t dist scripts/php-dev-router.php`
// does what public/.htaccess does on Hostinger. Point MEGUSTA_CONFIG at a local config file.

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$docroot = $_SERVER['DOCUMENT_ROOT'];

if (preg_match('#^/lib(/|$)#', $path)) {
    http_response_code(403);
    return true;
}
if (preg_match('#^/api(/|$)#', $path)) {
    require $docroot . '/api/index.php';
    return true;
}
if (preg_match('#^/media/([a-f0-9]{20}\.(webp|jpg|png))$#', $path, $m)) {
    $_GET['f'] = $m[1];
    require $docroot . '/api/media.php';
    return true;
}
if ($path === '/sitemap.xml') {
    require $docroot . '/sitemap.php';
    return true;
}
if ($path === '/robots.txt') {
    require $docroot . '/robots.php';
    return true;
}
if ($path !== '/' && is_file($docroot . $path)) return false;
require $docroot . '/index.php';
return true;
