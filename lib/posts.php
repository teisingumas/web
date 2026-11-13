<?php
declare(strict_types=1);

// News posts. Drafts are visible only in the admin; published posts live at /<slug>.

const NEWS_PER_PAGE = 6;
const SLUG_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';
// A post is public once it is published and its publishing time has come (a later time = scheduled).
const PUBLIC_POST = "status = 'published' AND published_at <= UTC_TIMESTAMP()";
const POST_TIMEZONE = 'Europe/Vilnius';

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

function post_public(array $row, ?PDO $pdo = null): array
{
    $post = post_card($row) + ['bodyHtml' => $row['body_html'], 'updatedAt' => iso_utc($row['updated_at'])];
    if ($pdo) $post['nearby'] = post_nearby($pdo, $row);
    return $post;
}

/**
 * Links shown under an article so every post is reachable from other posts:
 * the next newer and older one, plus the latest three others.
 */
function post_nearby(PDO $pdo, array $row): array
{
    $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE " . PUBLIC_POST . " AND (published_at < ? OR (published_at = ? AND id < ?))
        ORDER BY published_at DESC, id DESC LIMIT 1");
    $stmt->execute([$row['published_at'], $row['published_at'], $row['id']]);
    $older = $stmt->fetch() ?: null;
    $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE " . PUBLIC_POST . " AND (published_at > ? OR (published_at = ? AND id > ?))
        ORDER BY published_at ASC, id ASC LIMIT 1");
    $stmt->execute([$row['published_at'], $row['published_at'], $row['id']]);
    $newer = $stmt->fetch() ?: null;

    $skip = array_values(array_filter([(int) $row['id'], $older ? (int) $older['id'] : null, $newer ? (int) $newer['id'] : null]));
    $marks = implode(',', array_fill(0, count($skip), '?'));
    $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE " . PUBLIC_POST . " AND id NOT IN ($marks) ORDER BY published_at DESC, id DESC LIMIT 3");
    $stmt->execute($skip);
    return [
        'newer' => $newer ? post_card($newer) : null,
        'older' => $older ? post_card($older) : null,
        'more' => array_map('post_card', $stmt->fetchAll()),
    ];
}

/** Slug and title of every published post (newest first): plain links for crawlers on /naujienos. */
function all_published_links(PDO $pdo, int $limit = 2000): array
{
    $stmt = $pdo->prepare("SELECT slug, title FROM blog_posts WHERE " . PUBLIC_POST . " ORDER BY published_at DESC, id DESC LIMIT ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
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
        'scheduled' => $row['status'] === 'published' && $row['published_at'] !== null && $row['published_at'] > now_utc(),
        'createdAt' => iso_utc($row['created_at']),
        'updatedAt' => iso_utc($row['updated_at']),
    ];
}

/** One page of published posts for /naujienos. */
function public_posts_page(PDO $pdo, int $page): array
{
    $total = (int) $pdo->query('SELECT COUNT(*) FROM blog_posts WHERE ' . PUBLIC_POST)->fetchColumn();
    $pages = max(1, (int) ceil($total / NEWS_PER_PAGE));
    $page = max(1, $page);
    $stmt = $pdo->prepare('SELECT * FROM blog_posts WHERE ' . PUBLIC_POST . ' ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?');
    $stmt->execute([NEWS_PER_PAGE, ($page - 1) * NEWS_PER_PAGE]);
    return ['items' => array_map('post_card', $stmt->fetchAll()), 'page' => $page, 'pages' => $pages, 'total' => $total];
}

function find_published_post(PDO $pdo, string $slug): ?array
{
    if (!preg_match(SLUG_PATTERN, $slug)) return null;
    $stmt = $pdo->prepare('SELECT * FROM blog_posts WHERE slug = ? AND ' . PUBLIC_POST);
    $stmt->execute([$slug]);
    return $stmt->fetch() ?: null;
}

/** The public post a renamed post's old address now belongs to, or null. */
function find_redirect_target(PDO $pdo, string $slug): ?array
{
    if (!preg_match(SLUG_PATTERN, $slug)) return null;
    $stmt = $pdo->prepare("SELECT p.* FROM post_redirects r JOIN blog_posts p ON p.id = r.post_id WHERE r.old_slug = ? AND p.status = 'published' AND p.published_at <= UTC_TIMESTAMP()");
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

    // "YYYY-MM-DDTHH:MM" in Lithuanian time (or empty = automatic)
    $chosenAt = null;
    if (array_key_exists('publishedAt', $in) && trim((string) $in['publishedAt']) !== '') {
        $chosenAt = parse_local_datetime((string) $in['publishedAt']);
        if ($chosenAt === null) $errors['publishedAt'] = 'Neteisinga publikavimo data.';
    }

    $seo = [];
    foreach (['seoTitle' => 70, 'seoDescription' => 160, 'seoKeywords' => 255] as $key => $max) {
        $seo[$key] = clean_line($in[$key] ?? '', false);
        if (mb_strlen($seo[$key]) > $max) $errors[$key] = too_long($max, mb_strlen($seo[$key]));
    }

    if ($status === 'published') {
        if ($excerpt === '') $errors['excerpt'] = 'Prieš publikuojant įrašykite trumpą santrauką (ji rodoma naujienų sąraše).';
        if (html_text($body) === '' && !preg_match('/data-youtube|<img /', $body)) $errors['bodyHtml'] = 'Prieš publikuojant parašykite naujienos tekstą.';
        if ($cover['src'] === '') $errors['cover.src'] = 'Prieš publikuojant įkelkite viršelio nuotrauką.';
    }
    if ($errors) {
        throw validation_error($errors, $status === 'published' && !$existing ? 'Kad publikuotumėte, užpildykite pažymėtus laukus.' : 'Patikrinkite pažymėtus laukus.');
    }

    // Publishing time: the chosen one (past = backdated, future = scheduled), else the current one, else now.
    $publishedAt = $existing['published_at'] ?? null;
    // (the form works in whole minutes: an unchanged time keeps its seconds)
    if ($chosenAt !== null && !($publishedAt && substr($publishedAt, 0, 16) === substr($chosenAt, 0, 16))) $publishedAt = $chosenAt;
    if ($status === 'published' && !$publishedAt) $publishedAt = now_utc();

    $values = [$slug, $status, $title, $excerpt, $body, $cover['src'], $cover['alt'], $seo['seoTitle'], $seo['seoDescription'], $seo['seoKeywords'], $publishedAt];
    $wasPublic = $existing && $existing['status'] === 'published' && $existing['published_at'] !== null && $existing['published_at'] <= now_utc();
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
    // The address is now this post's: no old redirect may point away from it, and the old address of a
    // renamed public post keeps working through a 301.
    $pdo->prepare('DELETE FROM post_redirects WHERE old_slug = ?')->execute([$slug]);
    if ($wasPublic && $existing['slug'] !== $slug) {
        $pdo->prepare('REPLACE INTO post_redirects (old_slug, post_id) VALUES (?, ?)')->execute([$existing['slug'], $id]);
    }
    return post_admin(find_post($pdo, $id));
}

/** "2026-10-14T09:30" (Lithuanian time) to a UTC database datetime, or null when it is not a real date. */
function parse_local_datetime(string $value): ?string
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/', trim($value), $m)) return null;
    [, $y, $mo, $d, $h, $mi] = array_map('intval', $m);
    if ($y < 2000 || $y > 2100 || !checkdate($mo, $d, $y) || $h > 23 || $mi > 59) return null;
    $local = new DateTimeImmutable(sprintf('%04d-%02d-%02d %02d:%02d:00', $y, $mo, $d, $h, $mi), new DateTimeZone(POST_TIMEZONE));
    return $local->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
}

function admin_delete_post(PDO $pdo, int $id): void
{
    find_post($pdo, $id);
    $pdo->prepare('DELETE FROM post_redirects WHERE post_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM blog_posts WHERE id = ?')->execute([$id]);
}
