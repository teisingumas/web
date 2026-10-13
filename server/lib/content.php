<?php
declare(strict_types=1);

// Page copy (content_sections) and per-page SEO (page_seo).

function decode_json_object(string $json): array
{
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

/** All saved sections: key => ['data' => array, 'updatedAt' => iso]. */
function load_section_rows(PDO $pdo): array
{
    $rows = [];
    foreach ($pdo->query('SELECT section_key, data, updated_at FROM content_sections') as $row) {
        if (!section_def($row['section_key'])) continue;
        $rows[$row['section_key']] = ['data' => decode_json_object($row['data']), 'updatedAt' => iso_utc($row['updated_at'])];
    }
    return $rows;
}

/** Saved sections for the public page: key => data. */
function load_sections(PDO $pdo): array
{
    return array_map(fn($row) => $row['data'], load_section_rows($pdo));
}

function save_section(PDO $pdo, string $key, $data): array
{
    $def = section_def($key);
    if (!$def) throw not_found('Tokios skilties nėra.');
    $errors = [];
    $clean = validate_fields($def['fields'], $data, '', $errors);
    if ($errors) throw validation_error($errors);
    $json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $pdo->prepare('INSERT INTO content_sections (section_key, data) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP')->execute([$key, $json]);
    return ['data' => $clean, 'updatedAt' => iso_utc(now_utc())];
}

function seo_page_keys(): array
{
    return array_map(fn($p) => $p['key'], schema()['pages']);
}

function seo_defaults(string $pageKey): array
{
    $seo = page_def($pageKey)['seo'] ?? [];
    return [
        'title' => $seo['title'] ?? '',
        'description' => $seo['description'] ?? '',
        'keywords' => $seo['keywords'] ?? '',
        'ogImage' => ['src' => '', 'alt' => ''],
        'noindex' => false,
        'updatedAt' => null,
    ];
}

/** SEO for every page: saved values over the defaults from schema.json. */
function load_seo(PDO $pdo): array
{
    $out = [];
    foreach (seo_page_keys() as $key) $out[$key] = seo_defaults($key);
    foreach ($pdo->query('SELECT * FROM page_seo') as $row) {
        if (!isset($out[$row['page_key']])) continue;
        $out[$row['page_key']] = [
            'title' => $row['title'],
            'description' => $row['description'],
            'keywords' => $row['keywords'],
            'ogImage' => ['src' => $row['og_image'], 'alt' => $row['og_image_alt']],
            'noindex' => (bool) $row['noindex'],
            'updatedAt' => iso_utc($row['updated_at']),
        ];
    }
    return $out;
}

function save_seo(PDO $pdo, string $pageKey, $data): array
{
    if (!in_array($pageKey, seo_page_keys(), true)) throw not_found('Tokio puslapio nėra.');
    $errors = [];
    $clean = validate_fields(schema()['seoFields'], $data, '', $errors);
    if ($errors) throw validation_error($errors);
    $pdo->prepare('INSERT INTO page_seo (page_key, title, description, keywords, og_image, og_image_alt, noindex) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), keywords = VALUES(keywords),
        og_image = VALUES(og_image), og_image_alt = VALUES(og_image_alt), noindex = VALUES(noindex), updated_at = CURRENT_TIMESTAMP')
        ->execute([$pageKey, $clean['title'], $clean['description'], $clean['keywords'], $clean['ogImage']['src'], $clean['ogImage']['alt'], $clean['noindex'] ? 1 : 0]);
    return $clean + ['updatedAt' => iso_utc(now_utc())];
}
