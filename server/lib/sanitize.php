<?php
declare(strict_types=1);

// HTML from the rich-text editors is rebuilt from an allow-list, so whatever reaches the database
// (and the public pages) is only these tags and attributes — no scripts, styles or event handlers.

const SANITIZE_PROFILES = [
    // FAQ answers, short notes
    'inline' => ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    // news posts
    'post' => ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr', 'img'],
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

    $inner = '';
    foreach ($node->childNodes as $child) $inner .= sanitize_node($child, $allowed);
    if (!in_array($tag, $allowed, true)) {
        // unknown wrapper (span, div, font…): keep the content, drop the tag; a block of plain text becomes a paragraph
        $isBlock = in_array($tag, ['div', 'section', 'article', 'figure'], true);
        $hasBlocks = (bool) preg_match('#<(p|ul|ol|h2|h3|blockquote|hr|img)[\s>]#', $inner);
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
        default:
            return "<$tag>$inner</$tag>";
    }
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
