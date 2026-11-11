<?php
declare(strict_types=1);

// Copies posts from the old WordPress site (megusta.lt) into the news list: text, publishing date,
// SEO title and description, the cover and every photo (downloaded to our own media library),
// galleries, YouTube videos and links. The address (slug) stays the same as on WordPress, so
// /slug keeps working for Google and for every backlink.

const WP_IMPORT_HOSTS = ['megusta.lt', 'www.megusta.lt'];
const WP_IMPORT_MAX_IMAGES = 60;

/** GETs a page or image from the allowed host; returns the body. */
function wp_fetch(string $url, int $maxBytes = 15_000_000): string
{
    $parts = parse_url($url);
    $host = strtolower((string) ($parts['host'] ?? ''));
    if (($parts['scheme'] ?? '') !== 'https' || !in_array($host, WP_IMPORT_HOSTS, true)) {
        throw new ApiError(422, 'bad_url', 'Importuoti galima tik iš https://megusta.lt adresų.');
    }
    if (!function_exists('curl_init')) throw new ApiError(500, 'no_curl', 'Serveryje nėra cURL plėtinio.');
    $ch = curl_init($url);
    $body = '';
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_TIMEOUT => 40,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; MeGustaImport/1.0)',
        CURLOPT_HTTPHEADER => ['Accept-Language: lt'],
        CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$body, $maxBytes) {
            $body .= $chunk;
            return strlen($body) > $maxBytes ? 0 : strlen($chunk);
        },
    ]);
    $ok = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $final = strtolower((string) parse_url((string) curl_getinfo($ch, CURLINFO_EFFECTIVE_URL), PHP_URL_HOST));
    curl_close($ch);
    if (!in_array($final, WP_IMPORT_HOSTS, true)) throw new ApiError(422, 'bad_url', 'Adresas nukreipė į kitą svetainę.');
    if ($ok === false || $code >= 400) throw new ApiError(502, 'fetch_failed', "Nepavyko atsisiųsti {$url} (HTTP {$code}).");
    return $body;
}

/** Absolute https URL of $href relative to the post address. */
function wp_abs(string $href, string $base): string
{
    $href = trim(html_entity_decode($href));
    if ($href === '' || str_starts_with($href, 'data:')) return '';
    if (str_starts_with($href, '//')) return 'https:' . $href;
    if (preg_match('#^https?://#i', $href)) return preg_replace('#^http://#i', 'https://', $href);
    $b = parse_url($base);
    $root = 'https://' . $b['host'];
    if (str_starts_with($href, '/')) return $root . $href;
    return $root . rtrim(dirname($b['path'] ?? '/'), '/') . '/' . $href;
}

/** "…/2026/11/2006-150x150.jpg" → "…/2026/11/2006.jpg" (the original WordPress made the thumbnail from). */
function wp_original_image(string $url): string
{
    return preg_replace('#-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))$#i', '$1', $url) ?? $url;
}

function wp_is_image_url(string $url): bool
{
    return (bool) preg_match('#\.(jpe?g|png|webp)(\?.*)?$#i', $url);
}

/**
 * Reads one WordPress post page. Pure (no network, no database), so it can be tested on saved HTML.
 * Returns title, slug, publishedAt (UTC ISO), excerpt, seo*, cover {src, alt} and bodyHtml, where
 * images still point at megusta.lt (wp_import_images swaps them for our own copies).
 */
function wp_parse_post(string $html, string $url): array
{
    $doc = new DOMDocument();
    $prev = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?>' . $html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_BIGLINES);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);
    $xp = new DOMXPath($doc);

    $meta = function (string $query) use ($xp): string {
        $n = $xp->query($query)->item(0);
        return $n instanceof DOMElement ? trim($n->getAttribute('content')) : '';
    };

    $titleNode = $xp->query("//h1[contains(concat(' ', normalize-space(@class), ' '), ' jupiterx-post-title ')]")->item(0)
        ?? $xp->query('//article//h1')->item(0);
    $title = $titleNode ? trim(preg_replace('/\s+/u', ' ', $titleNode->textContent) ?? '') : '';
    if ($title === '') $title = trim(explode('|', $meta('//meta[@property="og:title"]'))[0]);

    $path = trim((string) parse_url($url, PHP_URL_PATH), '/');
    $slug = $path === '' ? '' : strtolower(basename($path));

    $published = $meta('//meta[@property="article:published_time"]');
    if ($published === '') {
        $t = $xp->query('//time[@itemprop="datePublished"]')->item(0);
        $published = $t instanceof DOMElement ? $t->getAttribute('datetime') : '';
    }

    $description = $meta('//meta[@name="description"]') ?: $meta('//meta[@property="og:description"]');
    $seoTitle = $meta('//meta[@property="og:title"]');

    // cover: the post's own image, else the social-share image
    $coverImg = $xp->query("//div[contains(@class,'jupiterx-post-image')]//img[@itemprop='image']")->item(0);
    $coverSrc = $coverImg instanceof DOMElement ? ($coverImg->getAttribute('data-lazy-src') ?: $coverImg->getAttribute('src')) : '';
    if ($coverSrc === '') $coverSrc = $meta('//meta[@property="og:image"]');
    $cover = ['src' => wp_abs($coverSrc, $url), 'alt' => $coverImg instanceof DOMElement ? trim($coverImg->getAttribute('alt')) : ''];

    $content = $xp->query("//div[contains(concat(' ', normalize-space(@class), ' '), ' jupiterx-post-content ')]")->item(0)
        ?? $xp->query("//div[contains(@class,'entry-content')]")->item(0);
    $body = '';
    if ($content instanceof DOMElement) {
        wp_clean_content($doc, $xp, $content, $url);
        foreach ($content->childNodes as $child) $body .= $doc->saveHTML($child);
    }

    return [
        'title' => $title, 'slug' => $slug, 'publishedAt' => $published, 'excerpt' => $description,
        'seoTitle' => $seoTitle, 'seoDescription' => $description, 'cover' => $cover, 'bodyHtml' => $body,
    ];
}

/** Rewrites the WordPress/theme markup inside the post body into plain blocks our editor understands. */
function wp_clean_content(DOMDocument $doc, DOMXPath $xp, DOMElement $content, string $base): void
{
    // galleries → one gallery block with the full-size photos
    foreach (iterator_to_array($xp->query(".//div[contains(@class,'mobx-gallery') or contains(@class,'gallery')]", $content)) as $g) {
        $urls = [];
        $items = $xp->query('.//figure', $g);
        if ($items->length === 0) $items = $xp->query('.//a', $g);
        foreach ($items as $item) {
            // one photo per item: the full-size file the link points at, else the thumbnail's original
            $link = $item->nodeName === 'a' ? $item : $item->getElementsByTagName('a')->item(0);
            $href = $link instanceof DOMElement ? $link->getAttribute('href') : '';
            $img = $item->nodeName === 'img' ? $item : $item->getElementsByTagName('img')->item(0);
            $thumb = $img instanceof DOMElement ? ($img->getAttribute('data-lazy-src') ?: $img->getAttribute('src')) : '';
            $abs = wp_abs(wp_is_image_url($href) ? $href : wp_original_image($thumb), $base);
            if ($abs !== '' && !in_array($abs, $urls, true)) $urls[] = $abs;
        }
        if (!$urls) { $g->parentNode->removeChild($g); continue; }
        $block = $doc->createElement('div');
        $block->setAttribute('data-gallery', '');
        foreach ($urls as $u) {
            $im = $doc->createElement('img');
            $im->setAttribute('src', $u);
            $im->setAttribute('alt', '');
            $block->appendChild($im);
        }
        $g->parentNode->replaceChild($block, $g);
    }

    // YouTube players → our video block
    foreach (iterator_to_array($content->getElementsByTagName('iframe')) as $f) {
        $src = $f->getAttribute('src') ?: $f->getAttribute('data-lazy-src') ?: $f->getAttribute('data-src');
        if (!preg_match('#youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{11})#', $src, $m)) { $f->parentNode->removeChild($f); continue; }
        $v = $doc->createElement('div');
        $v->setAttribute('data-youtube', $m[1]);
        $f->parentNode->replaceChild($v, $f);
    }

    // images: lazy-loading attributes → src, thumbnails → originals, absolute addresses
    foreach (iterator_to_array($content->getElementsByTagName('img')) as $img) {
        $src = $img->getAttribute('data-lazy-src') ?: $img->getAttribute('data-src') ?: $img->getAttribute('src');
        $abs = wp_abs(wp_original_image($src), $base);
        if ($abs === '') { $img->parentNode->removeChild($img); continue; }
        $img->setAttribute('src', $abs);
    }

    // a link that only wraps a photo is dropped (it pointed at WordPress's attachment page)
    foreach (iterator_to_array($content->getElementsByTagName('a')) as $a) {
        $href = wp_abs($a->getAttribute('href'), $base);
        if ($a->getElementsByTagName('img')->length > 0) {
            while ($a->firstChild) $a->parentNode->insertBefore($a->firstChild, $a);
            $a->parentNode->removeChild($a);
            continue;
        }
        // links to other posts/pages of the old site become site paths
        $p = parse_url($href);
        if (in_array(strtolower($p['host'] ?? ''), WP_IMPORT_HOSTS, true) && !str_contains($p['path'] ?? '', '/wp-content/')) {
            $path = '/' . trim((string) ($p['path'] ?? ''), '/');
            $a->setAttribute('href', ($path === '/' ? '/' : $path) . (isset($p['fragment']) ? '#' . $p['fragment'] : ''));
        } elseif ($href !== '') {
            $a->setAttribute('href', $href);
        }
    }
}

/** Downloads every wp-content photo of the body and the cover into the media library; returns the post with local addresses. */
function wp_import_images(PDO $pdo, array $post, array &$notes): array
{
    $cache = [];
    $fetch = function (string $src, string $alt) use ($pdo, &$cache, &$notes) {
        if (isset($cache[$src])) return $cache[$src];
        if (count($cache) >= WP_IMPORT_MAX_IMAGES) { $notes[] = 'Per daug nuotraukų, praleista: ' . basename($src); return $cache[$src] = null; }
        $tmp = tempnam(sys_get_temp_dir(), 'wpimg');
        try {
            file_put_contents($tmp, wp_fetch($src));
            return $cache[$src] = store_local_image($pdo, $tmp, basename((string) parse_url($src, PHP_URL_PATH)), $alt);
        } catch (Throwable $e) {
            $notes[] = 'Nuotrauka neperkelta (' . basename($src) . '): ' . ($e instanceof ApiError ? $e->getMessage() : 'klaida');
            return $cache[$src] = null;
        } finally {
            @unlink($tmp);
        }
    };

    $doc = new DOMDocument();
    $prev = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?><body><div>' . $post['bodyHtml'] . '</div></body>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);
    foreach (iterator_to_array($doc->getElementsByTagName('img')) as $img) {
        $src = $img->getAttribute('src');
        if (!str_starts_with($src, 'https://')) continue;
        $saved = $fetch($src, $img->getAttribute('alt'));
        if ($saved) {
            $img->setAttribute('src', $saved['src']);
        } else {
            $img->parentNode->removeChild($img);
        }
    }
    $root = $doc->getElementsByTagName('div')->item(0);
    $body = '';
    foreach ($root->childNodes as $child) $body .= $doc->saveHTML($child);
    $post['bodyHtml'] = $body;

    if ($post['cover']['src'] !== '') {
        $saved = $fetch($post['cover']['src'], $post['cover']['alt'] ?: $post['title']);
        $post['cover'] = $saved ? ['src' => $saved['src'], 'alt' => $post['cover']['alt'] ?: $post['title']] : ['src' => '', 'alt' => ''];
    }
    return $post;
}

/** UTC ISO time → "YYYY-MM-DDTHH:MM" in Lithuanian time (what admin_save_post expects). */
function wp_local_time(string $iso): string
{
    if ($iso === '') return '';
    try {
        return (new DateTimeImmutable($iso))->setTimezone(new DateTimeZone('Europe/Vilnius'))->format('Y-m-d\TH:i');
    } catch (Throwable $e) {
        return '';
    }
}

/** Imports one post address. Returns ['status' => 'created'|'exists', 'id', 'title', 'notes' => [...]]. */
function wp_import_post(PDO $pdo, string $url, bool $publish): array
{
    @set_time_limit(180);
    $url = trim($url);
    $post = wp_parse_post(wp_fetch($url, 4_000_000), $url);
    if ($post['title'] === '' || $post['slug'] === '') throw new ApiError(422, 'not_a_post', 'Šiame adrese naujienos nerasta: ' . $url);

    $exists = $pdo->prepare('SELECT id, title FROM blog_posts WHERE slug = ?');
    $exists->execute([$post['slug']]);
    if ($row = $exists->fetch()) return ['status' => 'exists', 'id' => (int) $row['id'], 'title' => $row['title'], 'notes' => ['Naujiena su šiuo adresu jau yra, nepakeista.']];

    $notes = [];
    $post = wp_import_images($pdo, $post, $notes);
    $excerpt = mb_substr(clean_line($post['excerpt'] !== '' ? $post['excerpt'] : html_text($post['bodyHtml']), false), 0, 300);
    $status = $publish ? 'published' : 'draft';
    if ($publish && $post['cover']['src'] === '') { $status = 'draft'; $notes[] = 'Viršelio nuotrauka neperkelta, todėl įrašas paliktas juodraščiu.'; }

    $saved = admin_save_post($pdo, null, [
        'slug' => $post['slug'], 'slugAuto' => false, 'status' => $status,
        'title' => mb_substr($post['title'], 0, 160), 'excerpt' => $excerpt, 'bodyHtml' => $post['bodyHtml'],
        'cover' => $post['cover'],
        'seoTitle' => mb_substr($post['seoTitle'], 0, 70), 'seoDescription' => mb_substr($post['seoDescription'], 0, 160), 'seoKeywords' => '',
        'publishedAt' => wp_local_time($post['publishedAt']),
    ]);
    return ['status' => 'created', 'id' => (int) $saved['id'], 'title' => $saved['title'], 'notes' => $notes, 'published' => $status === 'published'];
}
