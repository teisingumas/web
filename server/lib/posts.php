<?php
declare(strict_types=1);

// News posts. Drafts are visible only in the admin; published posts live at /<slug>.

const NEWS_PER_PAGE = 6;
const SLUG_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

function slugify(string $s): string
{
    $s = mb_strtolower($s, 'UTF-8');
    $s = strtr($s, ['ą' => 'a', 'č' => 'c', 'ę' => 'e', 'ė' => 'e', 'į' => 'i', 'š' => 's', 'ų' => 'u', 'ū' => 'u', 'ž' => 'z']);
    if (class_exists('Normalizer')) {
        $s = (string) Normalizer::normalize($s, Normalizer::FORM_D);
        $s = preg_replace('/\p{Mn}+/u', '', $s) ?? $s;
    }
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    return trim(substr(trim($s, '-'), 0, 120), '-');
}

function post_card(array $row): array
{
    return [
        'slug' => $row['slug'],
        'title' => $row['title'],
        'excerpt' => $row['excerpt'],
        'cover' => ['src' => $row['cover_image'], 'alt' => $row['cover_alt']],
        'publishedAt' => iso_utc($row['published_at']),
    ];
}

function post_public(array $row): array
{
    return post_card($row) + ['bodyHtml' => $row['body_html'], 'updatedAt' => iso_utc($row['updated_at'])];
}

function post_admin(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'status' => $row['status'],
        'title' => $row['title'],
        'excerpt' => $row['excerpt'],
        'bodyHtml' => $row['body_html'],
        'cover' => ['src' => $row['cover_image'], 'alt' => $row['cover_alt']],
        'seoTitle' => $row['seo_title'],
        'seoDescription' => $row['seo_description'],
        'seoKeywords' => $row['seo_keywords'],
        'publishedAt' => iso_utc($row['published_at']),
        'createdAt' => iso_utc($row['created_at']),
        'updatedAt' => iso_utc($row['updated_at']),
    ];
}

/** One page of published posts for /naujienos. */
function public_posts_page(PDO $pdo, int $page): array
{
    $total = (int) $pdo->query("SELECT COUNT(*) FROM blog_posts WHERE status = 'published'")->fetchColumn();
    $pages = max(1, (int) ceil($total / NEWS_PER_PAGE));
    $page = max(1, $page);
    $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?");
    $stmt->execute([NEWS_PER_PAGE, ($page - 1) * NEWS_PER_PAGE]);
    return ['items' => array_map('post_card', $stmt->fetchAll()), 'page' => $page, 'pages' => $pages, 'total' => $total];
}

function find_published_post(PDO $pdo, string $slug): ?array
{
    if (!preg_match(SLUG_PATTERN, $slug)) return null;
    $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'");
    $stmt->execute([$slug]);
    return $stmt->fetch() ?: null;
}

function find_post(PDO $pdo, int $id): array
{
    $stmt = $pdo->prepare('SELECT * FROM blog_posts WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) throw not_found('Naujiena nerasta. Galbūt ji jau ištrinta.');
    return $row;
}

function admin_list_posts(PDO $pdo, string $status, string $q, int $page, int $perPage = 20): array
{
    $where = [];
    $args = [];
    if (in_array($status, ['draft', 'published'], true)) {
        $where[] = 'status = ?';
        $args[] = $status;
    }
    $q = trim($q);
    if ($q !== '') {
        $where[] = '(title LIKE ? OR slug LIKE ?)';
        $like = '%' . addcslashes($q, '%_\\') . '%';
        array_push($args, $like, $like);
    }
    $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $count = $pdo->prepare("SELECT COUNT(*) FROM blog_posts $sqlWhere");
    $count->execute($args);
    $total = (int) $count->fetchColumn();
    $pages = max(1, (int) ceil($total / $perPage));
    $page = min(max(1, $page), $pages);
    $stmt = $pdo->prepare("SELECT * FROM blog_posts $sqlWhere ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?");
    $stmt->execute([...$args, $perPage, ($page - 1) * $perPage]);
    $counts = ['all' => 0, 'draft' => 0, 'published' => 0];
    foreach ($pdo->query('SELECT status, COUNT(*) AS n FROM blog_posts GROUP BY status') as $row) {
        $counts[$row['status']] = (int) $row['n'];
        $counts['all'] += (int) $row['n'];
    }
    $items = array_map(function ($row) {
        $post = post_admin($row);
        unset($post['bodyHtml']);
        return $post;
    }, $stmt->fetchAll());
    return ['items' => $items, 'total' => $total, 'page' => $page, 'pages' => $pages, 'counts' => $counts];
}

/** Message explaining why a slug cannot be used, or null. */
function slug_problem(PDO $pdo, string $slug, ?int $exceptId): ?string
{
    if ($slug === '') return 'Įrašykite adresą.';
    if (strlen($slug) > 120) return 'Adresas per ilgas (iki 120 ženklų).';
    if (!preg_match(SLUG_PATTERN, $slug)) return 'Adrese gali būti tik mažosios raidės be lietuviškų ženklų, skaičiai ir brūkšneliai, pvz. vasaros-stovykla-2026.';
    if (in_array($slug, schema()['reservedSlugs'], true)) return 'Šis adresas skirtas svetainės puslapiui. Pasirinkite kitą.';
    $stmt = $pdo->prepare('SELECT title FROM blog_posts WHERE slug = ? AND id <> ?');
    $stmt->execute([$slug, $exceptId ?? 0]);
    $other = $stmt->fetchColumn();
    if ($other !== false) return 'Šis adresas jau naudojamas naujienos „' . ($other ?: 'be pavadinimo') . '“.';
    return null;
}

function unique_slug(PDO $pdo, string $base, ?int $exceptId): string
{
    $base = $base !== '' ? $base : 'naujiena';
    if (in_array($base, schema()['reservedSlugs'], true)) $base .= '-1';
    for ($i = 1; $i < 500; $i++) {
        $candidate = $i === 1 ? $base : substr($base, 0, 115) . '-' . $i;
        if (slug_problem($pdo, $candidate, $exceptId) === null) return $candidate;
    }
    return $base . '-' . bin2hex(random_bytes(3));
}

/** Creates ($id null) or updates a post. Publishing needs every field a public page shows. */
function admin_save_post(PDO $pdo, ?int $id, array $in): array
{
    $existing = $id ? find_post($pdo, $id) : null;
    $errors = [];
    $status = ($in['status'] ?? 'draft') === 'published' ? 'published' : 'draft';

    $title = clean_line($in['title'] ?? '', false);
    if ($title === '') $errors['title'] = 'Įrašykite pavadinimą.';
    elseif (mb_strlen($title) > 160) $errors['title'] = too_long(160, mb_strlen($title));

    $slug = strtolower(clean_line($in['slug'] ?? '', false));
    $slugAuto = !empty($in['slugAuto']) || $slug === '';
    if ($slugAuto) {
        $slug = unique_slug($pdo, slugify($slug !== '' ? $slug : $title), $id);
    } elseif ($problem = slug_problem($pdo, $slug, $id)) {
        $errors['slug'] = $problem;
    }

    $excerpt = clean_line($in['excerpt'] ?? '', true);
    if (mb_strlen($excerpt) > 300) $errors['excerpt'] = too_long(300, mb_strlen($excerpt));

    $body = sanitize_html(is_string($in['bodyHtml'] ?? null) ? $in['bodyHtml'] : '', 'post');
    if (strlen($body) > 500_000) $errors['bodyHtml'] = 'Tekstas per ilgas.';

    $cover = validate_image(['alt' => 'required'], $in['cover'] ?? [], 'cover', $errors);

    $seo = [];
    foreach (['seoTitle' => 70, 'seoDescription' => 160, 'seoKeywords' => 255] as $key => $max) {
        $seo[$key] = clean_line($in[$key] ?? '', false);
        if (mb_strlen($seo[$key]) > $max) $errors[$key] = too_long($max, mb_strlen($seo[$key]));
    }

    if ($status === 'published') {
        if ($excerpt === '') $errors['excerpt'] = 'Prieš publikuojant įrašykite trumpą santrauką (ji rodoma naujienų sąraše).';
        if (html_text($body) === '') $errors['bodyHtml'] = 'Prieš publikuojant parašykite naujienos tekstą.';
        if ($cover['src'] === '') $errors['cover.src'] = 'Prieš publikuojant įkelkite viršelio nuotrauką.';
    }
    if ($errors) {
        throw validation_error($errors, $status === 'published' && !$existing ? 'Kad publikuotumėte, užpildykite pažymėtus laukus.' : 'Patikrinkite pažymėtus laukus.');
    }

    $publishedAt = $existing['published_at'] ?? null;
    if ($status === 'published' && !$publishedAt) $publishedAt = now_utc();

    $values = [$slug, $status, $title, $excerpt, $body, $cover['src'], $cover['alt'], $seo['seoTitle'], $seo['seoDescription'], $seo['seoKeywords'], $publishedAt];
    try {
        if ($existing) {
            $pdo->prepare('UPDATE blog_posts SET slug = ?, status = ?, title = ?, excerpt = ?, body_html = ?, cover_image = ?, cover_alt = ?,
                seo_title = ?, seo_description = ?, seo_keywords = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                ->execute([...$values, $id]);
        } else {
            $pdo->prepare('INSERT INTO blog_posts (slug, status, title, excerpt, body_html, cover_image, cover_alt, seo_title, seo_description, seo_keywords, published_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute($values);
            $id = (int) $pdo->lastInsertId();
        }
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') throw validation_error(['slug' => 'Šis adresas ką tik buvo panaudotas kitai naujienai. Pasirinkite kitą.']);
        throw $e;
    }
    return post_admin(find_post($pdo, $id));
}

function admin_delete_post(PDO $pdo, int $id): void
{
    find_post($pdo, $id);
    $pdo->prepare('DELETE FROM blog_posts WHERE id = ?')->execute([$id]);
}
