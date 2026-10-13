<?php
// Every page request lands here (public/.htaccess). It takes the built index.html and adds:
//  - the page's SEO tags (title, description, keywords, canonical, Open Graph, JSON-LD),
//  - the saved content as window.__MEGUSTA__, so edits show on the next load without a rebuild,
//  - for news pages, a plain copy of the article / list for crawlers that do not run JavaScript,
//  - a real 404 status for addresses that do not exist.
// If the database is unreachable the site still renders with its built-in content.

declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

// Fallbacks for the two sections the server needs (the full defaults live in src/content/defaults.ts).
const SITE_DEFAULTS = ['siteName' => 'Me Gusta', 'ogImage' => ['src' => '/img/og-default.jpg', 'alt' => 'Me Gusta šokių studija Kaune']];
const CONTACT_DEFAULTS = ['email' => 'labas@megusta.lt', 'phone' => '+370 606 44888', 'address' => 'Savanorių pr. 271, Kaunas'];
const PRERENDER_STYLE = 'max-width:760px;margin:0 auto;padding:168px 24px 80px;font-family:Outfit,sans-serif;color:var(--text,#f0f0f0);line-height:1.7';

$template = @file_get_contents(__DIR__ . '/index.html');
if ($template === false) {
    http_response_code(500);
    echo 'index.html not found';
    exit;
}

$rawPath = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
// One address per page: /naujiena/ (the old WordPress form) and /naujienos/2, /naujienos/3 ... redirect
// (the news pager swaps the posts in place; every post is listed in sitemap.xml).
if ($rawPath !== '/' && str_ends_with($rawPath, '/') && trim($rawPath, '/') !== '') redirect_to(rtrim($rawPath, '/'));
if (preg_match('#^/naujienos/\d{1,4}$#i', $rawPath)) redirect_to('/naujienos');
$path = strtolower($rawPath) ?: '/';

$pdo = null;
$sections = [];
$seoPages = [];
try {
    if (db_configured()) {
        $pdo = db();
        $sections = load_sections($pdo);
        $seoPages = load_seo($pdo);
    }
} catch (Throwable $e) {
    log_error('Page render without database', $e);
    $pdo = null;
}
foreach (seo_page_keys() as $key) $seoPages[$key] ??= seo_defaults($key);

$site = array_merge(SITE_DEFAULTS, $sections['global.seo'] ?? []);
$contacts = array_merge(CONTACT_DEFAULTS, $sections['global.contacts'] ?? []);
$siteName = $site['siteName'] ?: SITE_DEFAULTS['siteName'];

$inline = [
    'content' => (object) $sections,
    'titles' => array_map(fn($s) => $s['title'], $seoPages),
];
$status = 200;
$jsonLd = [];
$prerender = '';
$meta = null;

$pagePaths = ['/' => 'home', '/tvarkarastis' => 'tvarkarastis', '/registracija' => 'registracija',
    '/registracija/informacija' => 'registracija', '/registracija/kainos' => 'registracija'];

if (isset($pagePaths[$path])) {
    $key = $pagePaths[$path];
    $meta = page_meta($seoPages[$key], page_def($key)['path']);
    if ($key === 'home') $jsonLd[] = local_business_ld($siteName, $contacts, $sections['global.socials'] ?? [], $meta['image']);
} elseif ($path === '/naujienos') {
    $n = 1;
    $meta = page_meta($seoPages['naujienos'], '/naujienos');
    if ($pdo || !db_configured()) {
        // before the database is set up there are simply no posts yet
        $data = $pdo ? public_posts_page($pdo, $n) : ['items' => [], 'page' => 1, 'pages' => 1, 'total' => 0];
        if ($n > $data['pages']) {
            $status = 404;
            $meta = not_found_meta();
            $inline['view'] = ['type' => 'notfound', 'path' => $path];
        } else {
            $inline['view'] = ['type' => 'news', 'page' => $n, 'data' => $data];
            $prerender = news_prerender($data, $sections['news']['title'] ?? 'Naujienos');
        }
    }
} elseif ($path === '/adminas' || $path === '/apzvalga' || str_starts_with($path, '/apzvalga/')) {
    $meta = ['title' => 'Turinio valdymas — ' . $siteName, 'description' => '', 'keywords' => '', 'image' => '', 'imageAlt' => '',
        'canonical' => '', 'noindex' => true, 'type' => 'website'];
    $inline = ['clerkPublishableKey' => (string) config_value('clerk_publishable_key', '')];
    header('X-Frame-Options: DENY');
} elseif (preg_match('#^/([a-z0-9]+(?:-[a-z0-9]+)*)$#', $path, $m) && strlen($m[1]) <= 120) {
    $row = $pdo ? find_published_post($pdo, $m[1]) : null;
    if ($row) {
        $post = post_public($row);
        $inline['view'] = ['type' => 'post', 'slug' => $row['slug'], 'post' => $post];
        $meta = post_meta($row, $siteName);
        $jsonLd[] = article_ld($row, $siteName, $meta);
        $prerender = post_prerender($row);
    } elseif ($pdo || !db_configured()) {
        $status = 404;
        $meta = not_found_meta();
        $inline['view'] = ['type' => 'notfound', 'path' => $path];
    }
} else {
    $status = 404;
    $meta = not_found_meta();
    $inline['view'] = ['type' => 'notfound', 'path' => $path];
}
// database down and an unknown single-segment address: let the app try (it shows an error state)
$meta ??= page_meta($seoPages['home'], '/');

// Fall back to the site-wide sharing image.
if ($meta['image'] === '' && !empty($site['ogImage']['src'])) {
    $meta['image'] = $site['ogImage']['src'];
    $meta['imageAlt'] = $site['ogImage']['alt'] ?? '';
}

$head = render_head($meta, $siteName, $jsonLd, $inline);
$html = preg_replace('#<title>.*?</title>\s*#s', '', $template, 1);
$html = preg_replace('#<meta name="description"[^>]*>\s*#', '', $html, 1);
$html = str_replace('</head>', $head . "\n  </head>", $html);
if ($prerender !== '') $html = str_replace('<div id="root"></div>', '<div id="root">' . $prerender . '</div>', $html);

http_response_code($status);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
echo $html;

// ---------------------------------------------------------------------------------------------

function redirect_to(string $path): never
{
    $query = (string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_QUERY);
    header('Location: ' . $path . ($query !== '' ? "?$query" : ''), true, 301);
    exit;
}

function page_meta(array $seo, string $path): array
{
    return [
        'title' => $seo['title'],
        'description' => $seo['description'],
        'keywords' => $seo['keywords'],
        'image' => $seo['ogImage']['src'] ?? '',
        'imageAlt' => $seo['ogImage']['alt'] ?? '',
        'canonical' => $path,
        'noindex' => !empty($seo['noindex']),
        'type' => 'website',
    ];
}

function not_found_meta(): array
{
    return ['title' => 'Puslapis nerastas — Me Gusta', 'description' => '', 'keywords' => '', 'image' => '', 'imageAlt' => '',
        'canonical' => '', 'noindex' => true, 'type' => 'website'];
}

function truncate_text(string $text, int $max): string
{
    if (mb_strlen($text) <= $max) return $text;
    $cut = mb_substr($text, 0, $max - 1);
    $space = mb_strrpos($cut, ' ');
    return rtrim($space > $max * 0.6 ? mb_substr($cut, 0, $space) : $cut, " ,.;:—-") . '…';
}

function post_meta(array $row, string $siteName): array
{
    $title = $row['seo_title'] !== '' ? $row['seo_title'] : $row['title'];
    if (!str_contains($title, $siteName)) $title .= ' — ' . $siteName;
    $description = $row['seo_description'] !== '' ? $row['seo_description']
        : ($row['excerpt'] !== '' ? $row['excerpt'] : html_text($row['body_html']));
    return [
        'title' => $title,
        'description' => truncate_text($description, 160),
        'keywords' => $row['seo_keywords'],
        'image' => $row['cover_image'],
        'imageAlt' => $row['cover_alt'],
        'canonical' => '/' . $row['slug'],
        'noindex' => false,
        'type' => 'article',
        'published' => iso_utc($row['published_at']),
        'modified' => iso_utc($row['updated_at']),
    ];
}

function json_script($data): string
{
    return json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function render_head(array $meta, string $siteName, array $jsonLd, array $inline): string
{
    $t = [];
    $t[] = '<title>' . e($meta['title']) . '</title>';
    if ($meta['description'] !== '') $t[] = '<meta name="description" content="' . e($meta['description']) . '" />';
    if ($meta['keywords'] !== '') $t[] = '<meta name="keywords" content="' . e($meta['keywords']) . '" />';
    if ($meta['noindex']) $t[] = '<meta name="robots" content="noindex, nofollow" />';
    if ($meta['canonical'] !== '') {
        $url = absolute_url($meta['canonical']);
        $t[] = '<link rel="canonical" href="' . e($url) . '" />';
        $t[] = '<meta property="og:url" content="' . e($url) . '" />';
    }
    $t[] = '<meta property="og:type" content="' . e($meta['type']) . '" />';
    $t[] = '<meta property="og:site_name" content="' . e($siteName) . '" />';
    $t[] = '<meta property="og:locale" content="lt_LT" />';
    $t[] = '<meta property="og:title" content="' . e($meta['title']) . '" />';
    if ($meta['description'] !== '') $t[] = '<meta property="og:description" content="' . e($meta['description']) . '" />';
    if ($meta['image'] !== '') {
        $t[] = '<meta property="og:image" content="' . e(absolute_url($meta['image'])) . '" />';
        if ($meta['imageAlt'] !== '') $t[] = '<meta property="og:image:alt" content="' . e($meta['imageAlt']) . '" />';
        $t[] = '<meta name="twitter:card" content="summary_large_image" />';
    }
    if (!empty($meta['published'])) $t[] = '<meta property="article:published_time" content="' . e($meta['published']) . '" />';
    if (!empty($meta['modified'])) $t[] = '<meta property="article:modified_time" content="' . e($meta['modified']) . '" />';
    foreach ($jsonLd as $ld) $t[] = '<script type="application/ld+json">' . json_script($ld) . '</script>';
    $t[] = '<script>window.__MEGUSTA__=' . json_script($inline) . '</script>';
    return '    ' . implode("\n    ", $t);
}

function local_business_ld(string $siteName, array $contacts, array $socials, string $image): array
{
    $parts = array_map('trim', explode(',', (string) $contacts['address']));
    $city = count($parts) > 1 ? array_pop($parts) : '';
    $ld = [
        '@context' => 'https://schema.org',
        '@type' => 'LocalBusiness',
        'name' => $siteName,
        'url' => site_url() . '/',
        'telephone' => $contacts['phone'],
        'email' => $contacts['email'],
        'address' => ['@type' => 'PostalAddress', 'streetAddress' => implode(', ', $parts), 'addressLocality' => $city, 'addressCountry' => 'LT'],
    ];
    if ($image !== '') $ld['image'] = absolute_url($image);
    $sameAs = array_values(array_filter(array_map('strval', $socials)));
    if ($sameAs) $ld['sameAs'] = $sameAs;
    return $ld;
}

function article_ld(array $row, string $siteName, array $meta): array
{
    $org = ['@type' => 'Organization', 'name' => $siteName, 'url' => site_url() . '/'];
    $ld = [
        '@context' => 'https://schema.org',
        '@type' => 'BlogPosting',
        'headline' => mb_substr($row['title'], 0, 110),
        'description' => $meta['description'],
        'datePublished' => $meta['published'],
        'dateModified' => $meta['modified'],
        'mainEntityOfPage' => absolute_url('/' . $row['slug']),
        'author' => $org,
        'publisher' => $org,
        'inLanguage' => 'lt',
    ];
    if ($row['cover_image'] !== '') $ld['image'] = absolute_url($row['cover_image']);
    return $ld;
}

// Plain HTML copies for crawlers; the app replaces them as soon as it starts.
function post_prerender(array $row): string
{
    $date = $row['published_at'] ? '<p><time datetime="' . e((string) iso_utc($row['published_at'])) . '">' . e(substr($row['published_at'], 0, 10)) . '</time></p>' : '';
    $cover = $row['cover_image'] !== '' ? '<img src="' . e($row['cover_image']) . '" alt="' . e($row['cover_alt']) . '" style="max-width:100%;height:auto">' : '';
    return '<div data-prerender style="' . PRERENDER_STYLE . '"><article><h1>' . e($row['title']) . '</h1>' . $date . $cover . $row['body_html']
        . '</article><p><a href="/naujienos">← Visos naujienos</a></p></div>';
}

function news_prerender(array $data, string $title): string
{
    $items = '';
    foreach ($data['items'] as $post) {
        $items .= '<li><a href="/' . e($post['slug']) . '">' . e($post['title']) . '</a>' . ($post['excerpt'] !== '' ? '<p>' . e($post['excerpt']) . '</p>' : '') . '</li>';
    }
    return '<div data-prerender style="' . PRERENDER_STYLE . '"><h1>' . e($title) . '</h1><ul>' . $items . '</ul></div>';
}
