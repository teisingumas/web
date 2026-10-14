<?php
// /sitemap.xml: the pages plus every published news post and event.

declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

$urls = [];
$seo = [];
$posts = [];
$events = [];
try {
    if (db_configured()) {
        $pdo = db();
        $seo = load_seo($pdo);
        $posts = $pdo->query("SELECT slug, updated_at FROM blog_posts WHERE " . PUBLIC_POST . " ORDER BY published_at DESC")->fetchAll();
        $events = $pdo->query("SELECT e.slug, e.updated_at FROM events e WHERE " . EVENT_PUBLIC . " ORDER BY e.start_date DESC")->fetchAll();
    }
} catch (Throwable $e) {
    log_error('Sitemap without database', $e);
}
foreach (schema()['pages'] as $page) {
    if (!empty($seo[$page['key']]['noindex'])) continue;
    $urls[] = ['loc' => absolute_url($page['path']), 'lastmod' => $seo[$page['key']]['updatedAt'] ?? null];
}
foreach ($posts as $post) $urls[] = ['loc' => absolute_url('/' . $post['slug']), 'lastmod' => iso_utc($post['updated_at'])];
foreach ($events as $event) $urls[] = ['loc' => absolute_url('/kalendorius/' . $event['slug']), 'lastmod' => iso_utc($event['updated_at'])];

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: no-cache');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as $url) {
    echo '  <url><loc>' . e($url['loc']) . '</loc>' . ($url['lastmod'] ? '<lastmod>' . e(substr($url['lastmod'], 0, 10)) . '</lastmod>' : '') . "</url>\n";
}
echo "</urlset>\n";
