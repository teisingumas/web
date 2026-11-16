<?php
// Serves uploaded images at /media/<name> from the data folder outside public_html.
// Names are content hashes, so a name always means the same bytes: cache for a year.

declare(strict_types=1);

require dirname(__DIR__) . '/lib/bootstrap.php';

$name = (string) ($_GET['f'] ?? '');
$path = media_dir() . '/' . $name;
if (!preg_match(MEDIA_NAME_PATTERN, $name) || !is_file($path)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    echo 'Nuotrauka nerasta.';
    exit;
}

$etag = '"' . substr($name, 0, 20) . '"';
header('Cache-Control: public, max-age=31536000, immutable');
header('ETag: ' . $etag);
header('X-Content-Type-Options: nosniff');
if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}
$ext = pathinfo($name, PATHINFO_EXTENSION);
header('Content-Type: ' . ['webp' => 'image/webp', 'jpg' => 'image/jpeg', 'png' => 'image/png'][$ext]);
header('Content-Length: ' . filesize($path));
readfile($path);
