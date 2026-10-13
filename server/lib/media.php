<?php
declare(strict_types=1);

// Uploaded images. Files live in <data_dir>/media (outside public_html, so deployments never
// delete them) and are served by api/media.php at /media/<name>. Names are content hashes,
// so a file never changes and browsers may cache it for a year.

const MEDIA_MAX_BYTES = 2 * 1024 * 1024;
const MEDIA_MAX_SIDE = 2400;
const MEDIA_MAX_PIXELS = 40_000_000;
const MEDIA_NAME_PATTERN = '/^[a-f0-9]{20}\.(webp|jpg|png)$/';
const MEDIA_TYPES = ['image/jpeg' => 'JPG', 'image/png' => 'PNG', 'image/webp' => 'WebP'];

function media_dir(): string
{
    return data_dir() . '/media';
}

function media_public(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'src' => '/media/' . $row['file_name'],
        'fileName' => $row['file_name'],
        'originalName' => $row['original_name'],
        'width' => (int) $row['width'],
        'height' => (int) $row['height'],
        'size' => (int) $row['size_bytes'],
        'alt' => $row['alt'],
        'createdAt' => iso_utc($row['created_at']),
    ];
}

function list_media(PDO $pdo): array
{
    $rows = $pdo->query('SELECT * FROM media ORDER BY created_at DESC, id DESC')->fetchAll();
    return array_map('media_public', $rows);
}

function format_mb(int $bytes): string
{
    return number_format($bytes / 1024 / 1024, 1, ',', '') . ' MB';
}

/** Validates, re-encodes and stores one uploaded file ($_FILES entry). */
function store_upload(PDO $pdo, array $file, string $alt): array
{
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
        throw new ApiError(413, 'too_large', 'Nuotrauka per didelė. Didžiausias leidžiamas dydis — 2 MB.');
    }
    if ($error === UPLOAD_ERR_NO_FILE) throw validation_error(['file' => 'Pasirinkite nuotrauką.'], 'Pasirinkite nuotrauką.');
    if ($error !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '')) {
        throw new ApiError(400, 'upload_failed', 'Nepavyko įkelti failo. Bandykite dar kartą.');
    }
    $size = (int) filesize($file['tmp_name']);
    if ($size > MEDIA_MAX_BYTES) {
        throw new ApiError(413, 'too_large', 'Nuotrauka per didelė (' . format_mb($size) . '). Didžiausias leidžiamas dydis — 2 MB.');
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
    if (!isset(MEDIA_TYPES[$mime])) {
        throw new ApiError(415, 'bad_type', 'Šis failas nėra tinkama nuotrauka. Galima įkelti JPG, PNG arba WebP.');
    }
    $info = @getimagesize($file['tmp_name']);
    if (!$info || $info[0] < 1 || $info[1] < 1) throw new ApiError(415, 'bad_type', 'Nepavyko perskaityti nuotraukos. Galbūt failas sugadintas.');
    if ($info[0] * $info[1] > MEDIA_MAX_PIXELS) throw new ApiError(413, 'too_large', 'Nuotraukos raiška per didelė. Sumažinkite iki 6000 px pločio.');

    $alt = clean_line($alt, false);
    if (mb_strlen($alt) > 160) $alt = mb_substr($alt, 0, 160);
    [$bytes, $ext, $width, $height] = reencode_image($file['tmp_name'], $mime);

    $name = substr(sha1($bytes), 0, 20) . '.' . $ext;
    $existing = $pdo->prepare('SELECT * FROM media WHERE file_name = ?');
    $existing->execute([$name]);
    if ($row = $existing->fetch()) return media_public($row) + ['duplicate' => true];

    if (!ensure_dir(media_dir()) || @file_put_contents(media_dir() . '/' . $name, $bytes, LOCK_EX) === false) {
        log_error('Cannot write to ' . media_dir());
        throw new ApiError(500, 'storage', 'Nepavyko išsaugoti nuotraukos serveryje. Patikrinkite aplanko megusta-data teises.');
    }
    $original = mb_substr(clean_line(basename((string) ($file['name'] ?? 'nuotrauka')), false), 0, 255);
    $pdo->prepare('INSERT INTO media (file_name, original_name, mime, width, height, size_bytes, alt) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$name, $original, 'image/' . ($ext === 'jpg' ? 'jpeg' : $ext), $width, $height, strlen($bytes), $alt]);
    return media_public($pdo->query('SELECT * FROM media WHERE id = ' . (int) $pdo->lastInsertId())->fetch());
}

/**
 * Decodes with GD (which drops EXIF/GPS data), turns phone photos upright, scales the long side
 * to 2400 px and saves WebP (JPEG/PNG when the server's GD has no WebP).
 * Returns [bytes, extension, width, height].
 */
function reencode_image(string $path, string $mime): array
{
    @ini_set('memory_limit', '512M');
    $img = @imagecreatefromstring((string) file_get_contents($path));
    if (!$img) throw new ApiError(415, 'bad_type', 'Nepavyko perskaityti nuotraukos. Galbūt failas sugadintas.');

    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
        $orientation = (int) (@exif_read_data($path)['Orientation'] ?? 1);
        $rotated = match ($orientation) {
            3 => imagerotate($img, 180, 0),
            6 => imagerotate($img, -90, 0),
            8 => imagerotate($img, 90, 0),
            default => null,
        };
        if ($rotated) {
            imagedestroy($img);
            $img = $rotated;
        }
    }

    $w = imagesx($img);
    $h = imagesy($img);
    $scale = min(1, MEDIA_MAX_SIDE / max($w, $h));
    if ($scale < 1) {
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        $resized = imagecreatetruecolor($nw, $nh);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($img);
        [$img, $w, $h] = [$resized, $nw, $nh];
    } elseif (!imageistruecolor($img)) {
        imagepalettetotruecolor($img);
    }
    imagealphablending($img, false);
    imagesavealpha($img, true);

    ob_start();
    if (function_exists('imagewebp')) {
        imagewebp($img, null, 82);
        $ext = 'webp';
    } elseif ($mime === 'image/png') {
        imagepng($img, null, 8);
        $ext = 'png';
    } else {
        imagejpeg($img, null, 85);
        $ext = 'jpg';
    }
    $bytes = (string) ob_get_clean();
    imagedestroy($img);
    if ($bytes === '') throw new ApiError(500, 'encode', 'Nepavyko apdoroti nuotraukos.');
    return [$bytes, $ext, $w, $h];
}

function update_media_alt(PDO $pdo, int $id, $alt): array
{
    $alt = clean_line($alt, false);
    if (mb_strlen($alt) > 160) throw validation_error(['alt' => too_long(160, mb_strlen($alt))]);
    $stmt = $pdo->prepare('UPDATE media SET alt = ? WHERE id = ?');
    $stmt->execute([$alt, $id]);
    $row = $pdo->prepare('SELECT * FROM media WHERE id = ?');
    $row->execute([$id]);
    $found = $row->fetch();
    if (!$found) throw not_found('Nuotrauka nerasta.');
    return media_public($found);
}

/** Where an image is used, as readable labels ("Pagrindinis → Treneriai", "Naujiena „…“"). */
function media_usage(PDO $pdo, string $fileName): array
{
    $needle = '%/media/' . addcslashes($fileName, '%_\\') . '%';
    $usage = [];
    $stmt = $pdo->prepare('SELECT section_key FROM content_sections WHERE data LIKE ?');
    $stmt->execute([$needle]);
    $titles = [];
    foreach (schema()['pages'] as $page) foreach ($page['sections'] as $key) $titles[$key] = $page['label'] . ' → ' . (section_def($key)['title'] ?? $key);
    foreach (schema()['settingsSections'] as $key) $titles[$key] = 'Bendri nustatymai → ' . (section_def($key)['title'] ?? $key);
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $key) $usage[] = $titles[$key] ?? $key;
    $stmt = $pdo->prepare('SELECT page_key FROM page_seo WHERE og_image LIKE ?');
    $stmt->execute([$needle]);
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $key) $usage[] = (page_def($key)['label'] ?? $key) . ' → SEO';
    $stmt = $pdo->prepare('SELECT title FROM blog_posts WHERE cover_image LIKE ? OR body_html LIKE ?');
    $stmt->execute([$needle, $needle]);
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $title) $usage[] = 'Naujiena „' . ($title ?: 'be pavadinimo') . '“';
    return $usage;
}

function delete_media(PDO $pdo, int $id): void
{
    $stmt = $pdo->prepare('SELECT * FROM media WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) throw not_found('Nuotrauka nerasta.');
    $usage = media_usage($pdo, $row['file_name']);
    if ($usage) {
        throw new ApiError(409, 'in_use', 'Nuotrauka naudojama, todėl jos ištrinti negalima. Pirma pakeiskite ją šiose vietose.', ['usage' => $usage]);
    }
    $pdo->prepare('DELETE FROM media WHERE id = ?')->execute([$id]);
    $path = media_dir() . '/' . $row['file_name'];
    if (is_file($path)) @unlink($path);
}
