<?php
declare(strict_types=1);

// HTML from the rich-text editors is rebuilt from an allow-list, so whatever reaches the database
// (and the public pages) is only these tags and attributes — no scripts, styles or event handlers.

const SANITIZE_PROFILES = [
    // FAQ answers, short notes
    'inline' => ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    // news posts
    // (x-align: text-align on paragraphs, headings and quotes; x-youtube, x-gallery: the editor's video and gallery blocks)
    'post' => ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr', 'img', 'x-align', 'x-youtube', 'x-gallery'],
];

// Removed together with their content.
const SANITIZE_DROP = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'template', 'svg', 'math', 'noscript', 'head', 'title', 'meta', 'link'];

const SANITIZE_RENAME = ['b' => 'strong', 'i' => 'em', 'h1' => 'h2', 'h4' => 'h3', 'h5' => 'h3', 'h6' => 'h3', 'strike' => 's', 'del' => 's'];

function sanitize_html(string $html, string $profile): string
{
    $html = trim($html);
    if ($html === '') return '';
    $allowed = SANITIZE_PROFILES[$profile];
    $doc = new DOMDocument();
    $previous = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?><body><div>' . $html . '</div></body>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);
    $root = $doc->getElementsByTagName('div')->item(0);
    if (!$root) return '';
    $out = '';
    foreach ($root->childNodes as $child) $out .= sanitize_node($child, $allowed);
    // drop empty paragraphs the editor leaves at the end
    $out = preg_replace('#(<p></p>)+$#', '', $out) ?? $out;
    return trim($out);
}

function sanitize_node(DOMNode $node, array $allowed): string
{
    if ($node instanceof DOMText) {
        return htmlspecialchars($node->nodeValue ?? '', ENT_NOQUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }
    if (!$node instanceof DOMElement) return '';
    $tag = strtolower($node->tagName);
    if (in_array($tag, SANITIZE_DROP, true)) return '';
    $tag = SANITIZE_RENAME[$tag] ?? $tag;

    if ($tag === 'div') {
        if (in_array('x-youtube', $allowed, true) && $node->hasAttribute('data-youtube')) return sanitize_youtube($node->getAttribute('data-youtube'));
        if (in_array('x-gallery', $allowed, true) && $node->hasAttribute('data-gallery')) return sanitize_gallery($node, $allowed);
    }

    $inner = '';
    foreach ($node->childNodes as $child) $inner .= sanitize_node($child, $allowed);
    if (!in_array($tag, $allowed, true)) {
        // unknown wrapper (span, div, font…): keep the content, drop the tag; a block of plain text becomes a paragraph
        $isBlock = in_array($tag, ['div', 'section', 'article', 'figure'], true);
        $hasBlocks = (bool) preg_match('#<(p|ul|ol|h2|h3|blockquote|hr|img|div)[\s>]#', $inner);
        return $isBlock && $inner !== '' && !$hasBlocks && in_array('p', $allowed, true) ? "<p>$inner</p>" : $inner;
    }

    switch ($tag) {
        case 'br':
        case 'hr':
            return "<$tag>";
        case 'img':
            $src = trim($node->getAttribute('src'));
            if (!valid_image_src($src)) return '';
            $alt = trim(preg_replace('/\s+/u', ' ', $node->getAttribute('alt')) ?? '');
            return '<img src="' . e($src) . '" alt="' . e(mb_substr($alt, 0, 160)) . '" loading="lazy">';
        case 'a':
            $href = safe_href($node->getAttribute('href'));
            if ($href === null) return $inner;
            $external = (bool) preg_match('#^https?://#i', $href);
            return '<a href="' . e($href) . '"' . ($external ? ' target="_blank" rel="noopener noreferrer"' : '') . '>' . $inner . '</a>';
        case 'p':
        case 'h2':
        case 'h3':
        case 'blockquote':
            return "<$tag" . sanitize_align($node, $allowed) . ">$inner</$tag>";
        default:
            return "<$tag>$inner</$tag>";
    }
}

/** ' style="text-align:center"' for a centered / right / justified block (left is the default), else ''. */
function sanitize_align(DOMElement $node, array $allowed): string
{
    if (!in_array('x-align', $allowed, true)) return '';
    if (!preg_match('/(?:^|;)\s*text-align\s*:\s*(center|right|justify)\s*(?:;|$)/i', $node->getAttribute('style'), $m)) return '';
    return ' style="text-align:' . strtolower($m[1]) . '"';
}

/** A YouTube video block: only the 11-character id is kept, the player markup is built here. */
function sanitize_youtube(string $id): string
{
    $id = trim($id);
    if (!preg_match('/^[A-Za-z0-9_-]{11}$/', $id)) return '';
    return '<div class="yt-embed" data-youtube="' . $id . '"><iframe src="https://www.youtube-nocookie.com/embed/' . $id . '"'
        . ' title="YouTube vaizdo įrašas" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"'
        . ' allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
}

/** A gallery block: only its valid images are kept. */
function sanitize_gallery(DOMElement $node, array $allowed): string
{
    $images = '';
    foreach ($node->getElementsByTagName('img') as $img) $images .= sanitize_node($img, $allowed);
    return $images === '' ? '' : '<div class="gallery" data-gallery>' . $images . '</div>';
}

/** Allowed link targets: http(s), mailto, tel, site paths and #anchors. */
function safe_href(string $href): ?string
{
    $href = trim($href);
    if ($href === '' || preg_match('/[\x00-\x1F\x7F]/', $href)) return null;
    if (preg_match('#^(https?://|mailto:|tel:)#i', $href)) return $href;
    if (preg_match('#^/(?!/)#', $href) || str_starts_with($href, '#')) return $href;
    // "www.example.lt" typed without the scheme
    if (preg_match('#^www\.[^\s/]+\.[a-z]{2,}#i', $href)) return 'https://' . $href;
    return null;
}

/** Plain text of sanitized HTML, for length checks and meta descriptions. */
function html_text(string $html): string
{
    $text = html_entity_decode(strip_tags(str_replace(['<br>', '</p>', '</li>', '</h2>', '</h3>'], ' ', $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
}
