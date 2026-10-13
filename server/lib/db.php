<?php
declare(strict_types=1);

/** The tables, created automatically on first use (no phpMyAdmin import needed). */
const MEGUSTA_TABLES = [
    // Page copy: one row per section, its fields as JSON (see src/content/schema.json).
    "CREATE TABLE IF NOT EXISTS content_sections (
        section_key VARCHAR(64) NOT NULL PRIMARY KEY,
        data LONGTEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS page_seo (
        page_key VARCHAR(32) NOT NULL PRIMARY KEY,
        title VARCHAR(70) NOT NULL,
        description VARCHAR(160) NOT NULL,
        keywords VARCHAR(255) NOT NULL DEFAULT '',
        og_image VARCHAR(255) NOT NULL DEFAULT '',
        og_image_alt VARCHAR(160) NOT NULL DEFAULT '',
        noindex TINYINT(1) NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS media (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(80) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime VARCHAR(32) NOT NULL,
        width SMALLINT UNSIGNED NOT NULL,
        height SMALLINT UNSIGNED NOT NULL,
        size_bytes INT UNSIGNED NOT NULL,
        alt VARCHAR(160) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_media_file (file_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS blog_posts (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(120) NOT NULL,
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        title VARCHAR(160) NOT NULL DEFAULT '',
        excerpt VARCHAR(300) NOT NULL DEFAULT '',
        body_html MEDIUMTEXT NOT NULL,
        cover_image VARCHAR(255) NOT NULL DEFAULT '',
        cover_alt VARCHAR(160) NOT NULL DEFAULT '',
        seo_title VARCHAR(70) NOT NULL DEFAULT '',
        seo_description VARCHAR(160) NOT NULL DEFAULT '',
        seo_keywords VARCHAR(255) NOT NULL DEFAULT '',
        published_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_post_slug (slug),
        KEY idx_post_status (status, published_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // Old addresses of renamed posts: they answer with a 301 to the post's current address.
    "CREATE TABLE IF NOT EXISTS post_redirects (
        old_slug VARCHAR(120) NOT NULL PRIMARY KEY,
        post_id INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_redirect_post (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

function db_configured(): bool
{
    $db = config_value('db');
    return is_array($db) && !empty($db['name']) && !empty($db['user']);
}

/** Shared PDO connection; throws when the database is not configured or unreachable. */
function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!db_configured()) throw new RuntimeException('Database is not configured');
    $c = config_value('db');
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'] ?? 'localhost', (int) ($c['port'] ?? 3306), $c['name']);
    $pdo = new PDO($dsn, $c['user'], $c['pass'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    // Timestamps are stored in UTC; the browser shows them in Lithuanian time.
    $pdo->exec("SET time_zone = '+00:00'");
    migrate($pdo, substr(md5(($c['host'] ?? 'localhost') . '/' . $c['name']), 0, 8));
    return $pdo;
}

/** Creates the tables once per database; a marker file in the data folder skips the check afterwards. */
function migrate(PDO $pdo, string $dbId): void
{
    $marker = data_dir() . '/.schema-v' . MEGUSTA_SCHEMA_VERSION . '-' . $dbId;
    if (is_file($marker)) return;
    foreach (MEGUSTA_TABLES as $sql) $pdo->exec($sql);
    if (ensure_dir(data_dir())) @file_put_contents($marker, now_utc());
}
