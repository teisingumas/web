<?php
declare(strict_types=1);

// Calendar events, their venues and organizers. Drafts are visible only in the admin; published
// events live at /kalendorius/<slug>. Like blog posts, an event is public once it is published and
// its publishing time has come (a later time = scheduled).

const EVENT_SELECT = "SELECT e.*, v.name AS venue_name, v.address AS venue_address, o.name AS organizer_name, o.website AS organizer_website
    FROM events e
    LEFT JOIN event_venues v ON v.id = e.venue_id
    LEFT JOIN event_organizers o ON o.id = e.organizer_id";
const EVENT_PUBLIC = "e.status = 'published' AND e.published_at <= UTC_TIMESTAMP()";
// the last day an event takes up: it stays "upcoming" until that day is over
const EVENT_LAST_DAY = 'COALESCE(e.end_date, e.start_date)';
const UPCOMING_EVENTS_LIMIT = 200;
const PAST_EVENTS_LIMIT = 15;

/** Today's date in Lithuania (date_default_timezone_set in bootstrap.php). */
function today_local(): string
{
    return date('Y-m-d');
}

/** Label of an event tag ("varzybos" => "Varžybos"); unknown values count as the first one. */
function event_type_label(string $type): string
{
    foreach (schema()['options']['eventTypes'] as $o) if ($o['value'] === $type) return $o['label'];
    return schema()['options']['eventTypes'][0]['label'];
}

function hm(?string $time): ?string
{
    return $time === null ? null : substr($time, 0, 5);
}

function event_card(array $row): array
{
    $hasVenue = $row['venue_id'] !== null && $row['venue_name'] !== null;
    $address = $hasVenue ? (string) $row['venue_address'] : '';
    return [
        'slug' => $row['slug'],
        'title' => $row['title'],
        'excerpt' => $row['excerpt'],
        'cover' => ['src' => $row['cover_image'], 'alt' => $row['cover_alt']],
        'type' => $row['type'],
        'typeLabel' => event_type_label($row['type']),
        'allDay' => (bool) $row['all_day'],
        'startDate' => $row['start_date'],
        'startTime' => hm($row['start_time']),
        'endDate' => $row['end_date'],
        'endTime' => hm($row['end_time']),
        'venue' => $hasVenue ? ['name' => $row['venue_name'], 'address' => $address] : null,
        'organizer' => $row['organizer_id'] !== null && $row['organizer_name'] !== null
            ? ['name' => $row['organizer_name'], 'website' => (string) $row['organizer_website']] : null,
        'showMap' => (bool) $row['show_map'] && $address !== '',
        'price' => $row['price'] === null ? null : (float) $row['price'],
    ];
}

function event_public(array $row, ?PDO $pdo = null): array
{
    $event = event_card($row) + ['bodyHtml' => $row['body_html'], 'updatedAt' => iso_utc($row['updated_at'])];
    if ($pdo) $event['more'] = event_more($pdo, (int) $row['id']);
    return $event;
}

/** The next few upcoming events other than this one, linked under an event page. */
function event_more(PDO $pdo, int $exceptId): array
{
    $stmt = $pdo->prepare(EVENT_SELECT . ' WHERE ' . EVENT_PUBLIC . ' AND ' . EVENT_LAST_DAY . ' >= ? AND e.id <> ?
        ORDER BY e.start_date ASC, e.start_time ASC, e.id ASC LIMIT 3');
    $stmt->execute([today_local(), $exceptId]);
    return array_map('event_card', $stmt->fetchAll());
}

/** What /kalendorius shows: every upcoming event and the latest past ones. */
function public_events(PDO $pdo): array
{
    $today = today_local();
    $stmt = $pdo->prepare(EVENT_SELECT . ' WHERE ' . EVENT_PUBLIC . ' AND ' . EVENT_LAST_DAY . ' >= ?
        ORDER BY e.start_date ASC, ' . EVENT_LAST_DAY . ' ASC, e.start_time ASC, e.id ASC LIMIT ' . UPCOMING_EVENTS_LIMIT);
    $stmt->execute([$today]);
    $upcoming = array_map('event_card', $stmt->fetchAll());

    $stmt = $pdo->prepare(EVENT_SELECT . ' WHERE ' . EVENT_PUBLIC . ' AND ' . EVENT_LAST_DAY . ' < ?
        ORDER BY ' . EVENT_LAST_DAY . ' DESC, e.start_date DESC, e.start_time DESC, e.id DESC LIMIT ' . PAST_EVENTS_LIMIT);
    $stmt->execute([$today]);
    $past = array_map('event_card', $stmt->fetchAll());
    return ['upcoming' => $upcoming, 'past' => $past];
}

/** Slug and title of every published event: plain links for crawlers on /kalendorius. */
function all_published_event_links(PDO $pdo, int $limit = 2000): array
{
    $stmt = $pdo->prepare('SELECT e.slug, e.title FROM events e WHERE ' . EVENT_PUBLIC . ' ORDER BY e.start_date DESC, e.id DESC LIMIT ?');
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function find_published_event(PDO $pdo, string $slug): ?array
{
    if (!preg_match(SLUG_PATTERN, $slug)) return null;
    $stmt = $pdo->prepare(EVENT_SELECT . ' WHERE e.slug = ? AND ' . EVENT_PUBLIC);
    $stmt->execute([$slug]);
    return $stmt->fetch() ?: null;
}

/** The public event a renamed event's old address now belongs to, or null. */
function find_event_redirect_target(PDO $pdo, string $slug): ?array
{
    if (!preg_match(SLUG_PATTERN, $slug)) return null;
    $stmt = $pdo->prepare(EVENT_SELECT . ' JOIN event_redirects r ON r.event_id = e.id WHERE r.old_slug = ? AND ' . EVENT_PUBLIC);
    $stmt->execute([$slug]);
    return $stmt->fetch() ?: null;
}

function find_event(PDO $pdo, int $id): array
{
    $stmt = $pdo->prepare(EVENT_SELECT . ' WHERE e.id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) throw not_found('Renginys nerastas. Galbūt jis jau ištrintas.');
    return $row;
}

function event_admin(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'status' => $row['status'],
        'title' => $row['title'],
        'excerpt' => $row['excerpt'],
        'bodyHtml' => $row['body_html'],
        'cover' => ['src' => $row['cover_image'], 'alt' => $row['cover_alt']],
        'type' => $row['type'],
        'allDay' => (bool) $row['all_day'],
        'startDate' => $row['start_date'],
        'startTime' => hm($row['start_time']),
        'endDate' => $row['end_date'],
        'endTime' => hm($row['end_time']),
        'venueId' => $row['venue_id'] === null ? null : (int) $row['venue_id'],
        'organizerId' => $row['organizer_id'] === null ? null : (int) $row['organizer_id'],
        'showMap' => (bool) $row['show_map'],
        'price' => $row['price'] === null ? null : (float) $row['price'],
        'seoTitle' => $row['seo_title'],
        'seoDescription' => $row['seo_description'],
        'seoKeywords' => $row['seo_keywords'],
        'publishedAt' => iso_utc($row['published_at']),
        'scheduled' => $row['status'] === 'published' && $row['published_at'] !== null && $row['published_at'] > now_utc(),
        'createdAt' => iso_utc($row['created_at']),
        'updatedAt' => iso_utc($row['updated_at']),
        'venueName' => $row['venue_name'],
        'organizerName' => $row['organizer_name'],
    ];
}

function admin_list_events(PDO $pdo, string $status, string $q, int $page, int $perPage = 20): array
{
    $where = [];
    $args = [];
    if (in_array($status, ['draft', 'published'], true)) {
        $where[] = 'e.status = ?';
        $args[] = $status;
    }
    $q = trim($q);
    if ($q !== '') {
        $where[] = '(e.title LIKE ? OR e.slug LIKE ?)';
        $like = '%' . addcslashes($q, '%_\\') . '%';
        array_push($args, $like, $like);
    }
    $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $count = $pdo->prepare("SELECT COUNT(*) FROM events e $sqlWhere");
    $count->execute($args);
    $total = (int) $count->fetchColumn();
    $pages = max(1, (int) ceil($total / $perPage));
    $page = min(max(1, $page), $pages);
    // events without a date yet (new drafts) first, then the newest dates
    $stmt = $pdo->prepare(EVENT_SELECT . " $sqlWhere ORDER BY (e.start_date IS NULL) DESC, e.start_date DESC, e.id DESC LIMIT ? OFFSET ?");
    $stmt->execute([...$args, $perPage, ($page - 1) * $perPage]);
    $counts = ['all' => 0, 'draft' => 0, 'published' => 0];
    foreach ($pdo->query('SELECT status, COUNT(*) AS n FROM events GROUP BY status') as $row) {
        $counts[$row['status']] = (int) $row['n'];
        $counts['all'] += (int) $row['n'];
    }
    $items = array_map(function ($row) {
        $event = event_admin($row);
        unset($event['bodyHtml']);
        return $event;
    }, $stmt->fetchAll());
    return ['items' => $items, 'total' => $total, 'page' => $page, 'pages' => $pages, 'counts' => $counts];
}

/** Message explaining why an event address cannot be used, or null. (Event addresses live under /kalendorius/.) */
function event_slug_problem(PDO $pdo, string $slug, ?int $exceptId): ?string
{
    if ($slug === '') return 'Įrašykite adresą.';
    if (strlen($slug) > 120) return 'Adresas per ilgas (iki 120 ženklų).';
    if (!preg_match(SLUG_PATTERN, $slug)) return 'Adrese gali būti tik mažosios raidės be lietuviškų ženklų, skaičiai ir brūkšneliai, pvz. atvirų-durų-diena.';
    $stmt = $pdo->prepare('SELECT title FROM events WHERE slug = ? AND id <> ?');
    $stmt->execute([$slug, $exceptId ?? 0]);
    $other = $stmt->fetchColumn();
    if ($other !== false) return 'Šis adresas jau naudojamas renginio „' . ($other ?: 'be pavadinimo') . '“.';
    return null;
}

function unique_event_slug(PDO $pdo, string $base, ?int $exceptId): string
{
    $base = $base !== '' ? $base : 'renginys';
    for ($i = 1; $i < 500; $i++) {
        $candidate = $i === 1 ? $base : substr($base, 0, 115) . '-' . $i;
        if (event_slug_problem($pdo, $candidate, $exceptId) === null) return $candidate;
    }
    return $base . '-' . bin2hex(random_bytes(3));
}

/** "2026-10-18" when it is a real date, else null. */
function parse_ymd(string $value): ?string
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', trim($value), $m)) return null;
    [, $y, $mo, $d] = array_map('intval', $m);
    if ($y < 2000 || $y > 2100 || !checkdate($mo, $d, $y)) return null;
    return sprintf('%04d-%02d-%02d', $y, $mo, $d);
}

/** "09:30" (also "9:30" or "9.30") when it is a real time, else null. */
function parse_hm(string $value): ?string
{
    if (!preg_match('/^(\d{1,2})[:.](\d{2})$/', trim($value), $m) || (int) $m[1] > 23 || (int) $m[2] > 59) return null;
    return sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
}

/** The id of an existing venue / organizer, null when none was chosen; records an error for an unknown one. */
function chosen_lookup(PDO $pdo, string $kind, $value, string $errorKey, array &$errors): ?int
{
    if ($value === null || $value === '' || $value === false) return null;
    $id = (int) $value;
    $table = EVENT_LOOKUPS[$kind]['table'];
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM $table WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetchColumn()) {
        $errors[$errorKey] = EVENT_LOOKUPS[$kind]['gone'];
        return null;
    }
    return $id;
}

/** Creates ($id null) or updates an event. Publishing needs every field a public page shows. */
function admin_save_event(PDO $pdo, ?int $id, array $in): array
{
    $existing = $id ? find_event($pdo, $id) : null;
    $errors = [];
    $status = ($in['status'] ?? 'draft') === 'published' ? 'published' : 'draft';
    $publish = $status === 'published';

    $title = clean_line($in['title'] ?? '', false);
    if ($title === '') $errors['title'] = 'Įrašykite pavadinimą.';
    elseif (mb_strlen($title) > 160) $errors['title'] = too_long(160, mb_strlen($title));

    $slug = strtolower(clean_line($in['slug'] ?? '', false));
    $slugAuto = !empty($in['slugAuto']) || $slug === '';
    if ($slugAuto) {
        $slug = unique_event_slug($pdo, slugify($slug !== '' ? $slug : $title), $id);
    } elseif ($problem = event_slug_problem($pdo, $slug, $id)) {
        $errors['slug'] = $problem;
    }

    $excerpt = clean_line($in['excerpt'] ?? '', true);
    if (mb_strlen($excerpt) > 300) $errors['excerpt'] = too_long(300, mb_strlen($excerpt));

    $body = sanitize_html(is_string($in['bodyHtml'] ?? null) ? $in['bodyHtml'] : '', 'post');
    if (strlen($body) > 500_000) $errors['bodyHtml'] = 'Tekstas per ilgas.';

    $cover = validate_image(['alt' => 'required'], $in['cover'] ?? [], 'cover', $errors);

    $type = clean_line($in['type'] ?? '', false);
    if ($type === '') $type = option_values('eventTypes')[0];
    elseif (!in_array($type, option_values('eventTypes'), true)) $errors['type'] = 'Pasirinkite žymą iš sąrašo.';

    // When: dates are Lithuanian calendar dates, times are Lithuanian clock times.
    $allDay = !empty($in['allDay']);
    $startDate = $endDate = $startTime = $endTime = null;
    $raw = fn(string $key) => clean_line($in[$key] ?? '', false);
    if ($raw('startDate') !== '' && ($startDate = parse_ymd($raw('startDate'))) === null) $errors['startDate'] = 'Neteisinga pradžios data.';
    if ($raw('endDate') !== '' && ($endDate = parse_ymd($raw('endDate'))) === null) $errors['endDate'] = 'Neteisinga pabaigos data.';
    if (!$allDay) {
        if ($raw('startTime') !== '' && ($startTime = parse_hm($raw('startTime'))) === null) $errors['startTime'] = 'Laikas formatu VV:MM, pvz. 17:30.';
        if ($raw('endTime') !== '' && ($endTime = parse_hm($raw('endTime'))) === null) $errors['endTime'] = 'Laikas formatu VV:MM, pvz. 17:30.';
        if ($endTime !== null && $startTime === null && !isset($errors['startTime'])) $errors['startTime'] = 'Įrašykite pradžios laiką.';
    }
    if ($startDate !== null && $endDate !== null && $endDate < $startDate) $errors['endDate'] = 'Pabaigos data negali būti ankstesnė už pradžios datą.';
    // one-day event: the end time must follow the start time
    if ($startDate !== null && ($endDate === null || $endDate === $startDate) && $startTime !== null && $endTime !== null
        && $endTime <= $startTime && !isset($errors['endTime'])) {
        $errors['endTime'] = 'Pabaiga turi būti vėliau nei pradžia.';
    }
    if ($endDate === $startDate) $endDate = null;   // same day = not a multi-day event

    $venueId = chosen_lookup($pdo, 'venue', $in['venueId'] ?? null, 'venueId', $errors);
    $organizerId = chosen_lookup($pdo, 'organizer', $in['organizerId'] ?? null, 'organizerId', $errors);
    $showMap = !empty($in['showMap']);

    $price = null;
    $priceText = clean_line($in['price'] ?? '', false);
    if ($priceText !== '') {
        if (preg_match('/^\d{1,5}([.,]\d{1,2})?$/', $priceText)) $price = str_replace(',', '.', $priceText);
        else $errors['price'] = 'Įrašykite kainą skaičiais, pvz. 12 arba 12,50 (0 = nemokamas).';
    }

    $seo = [];
    foreach (['seoTitle' => 70, 'seoDescription' => 160, 'seoKeywords' => 255] as $key => $max) {
        $seo[$key] = clean_line($in[$key] ?? '', false);
        if (mb_strlen($seo[$key]) > $max) $errors[$key] = too_long($max, mb_strlen($seo[$key]));
    }

    // "YYYY-MM-DDTHH:MM" in Lithuanian time (or empty = automatic)
    $chosenAt = null;
    if (array_key_exists('publishedAt', $in) && trim((string) $in['publishedAt']) !== '') {
        $chosenAt = parse_local_datetime((string) $in['publishedAt']);
        if ($chosenAt === null) $errors['publishedAt'] = 'Neteisinga publikavimo data.';
    }

    if ($publish) {
        if ($excerpt === '') $errors['excerpt'] = 'Prieš publikuojant įrašykite trumpą aprašą (jis rodomas kalendoriuje).';
        if ($cover['src'] === '') $errors['cover.src'] = 'Prieš publikuojant įkelkite nuotrauką (thumbnail).';
        if ($startDate === null && !isset($errors['startDate'])) $errors['startDate'] = 'Prieš publikuojant nurodykite renginio datą.';
        if (!$allDay && $startTime === null && !isset($errors['startTime'])) $errors['startTime'] = 'Nurodykite pradžios laiką arba pažymėkite „Visos dienos renginys“.';
        if ($showMap) {
            $address = '';
            if ($venueId !== null) {
                $stmt = $pdo->prepare('SELECT address FROM event_venues WHERE id = ?');
                $stmt->execute([$venueId]);
                $address = (string) $stmt->fetchColumn();
            }
            if ($venueId === null) $errors['venueId'] = 'Kad rodytumėte žemėlapį, pasirinkite vietą.';
            elseif ($address === '') $errors['venueId'] = 'Pasirinktos vietos adresas nenurodytas, todėl žemėlapio parodyti negalima. Papildykite vietą skiltyje „Vietos“.';
        }
    }
    if ($errors) {
        throw validation_error($errors, $publish && !$existing ? 'Kad publikuotumėte, užpildykite pažymėtus laukus.' : 'Patikrinkite pažymėtus laukus.');
    }
    if ($allDay) [$startTime, $endTime] = [null, null];

    // Publishing time: the chosen one (past = backdated, future = scheduled), else the current one, else now.
    $publishedAt = $existing['published_at'] ?? null;
    // (the form works in whole minutes: an unchanged time keeps its seconds)
    if ($chosenAt !== null && !($publishedAt && substr($publishedAt, 0, 16) === substr($chosenAt, 0, 16))) $publishedAt = $chosenAt;
    if ($publish && !$publishedAt) $publishedAt = now_utc();

    $values = [$slug, $status, $title, $excerpt, $body, $cover['src'], $cover['alt'], $type, $allDay ? 1 : 0, $startDate, $startTime, $endDate, $endTime,
        $venueId, $organizerId, $showMap ? 1 : 0, $price, $seo['seoTitle'], $seo['seoDescription'], $seo['seoKeywords'], $publishedAt];
    $wasPublic = $existing && $existing['status'] === 'published' && $existing['published_at'] !== null && $existing['published_at'] <= now_utc();
    try {
        if ($existing) {
            $pdo->prepare('UPDATE events SET slug = ?, status = ?, title = ?, excerpt = ?, body_html = ?, cover_image = ?, cover_alt = ?, type = ?,
                all_day = ?, start_date = ?, start_time = ?, end_date = ?, end_time = ?, venue_id = ?, organizer_id = ?, show_map = ?, price = ?,
                seo_title = ?, seo_description = ?, seo_keywords = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                ->execute([...$values, $id]);
        } else {
            $pdo->prepare('INSERT INTO events (slug, status, title, excerpt, body_html, cover_image, cover_alt, type, all_day, start_date, start_time, end_date, end_time,
                venue_id, organizer_id, show_map, price, seo_title, seo_description, seo_keywords, published_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute($values);
            $id = (int) $pdo->lastInsertId();
        }
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') throw validation_error(['slug' => 'Šis adresas ką tik buvo panaudotas kitam renginiui. Pasirinkite kitą.']);
        throw $e;
    }
    // The address is now this event's: no old redirect may point away from it, and the old address of a
    // renamed public event keeps working through a 301.
    $pdo->prepare('DELETE FROM event_redirects WHERE old_slug = ?')->execute([$slug]);
    if ($wasPublic && $existing['slug'] !== $slug) {
        $pdo->prepare('REPLACE INTO event_redirects (old_slug, event_id) VALUES (?, ?)')->execute([$existing['slug'], $id]);
    }
    return event_admin(find_event($pdo, $id));
}

function admin_delete_event(PDO $pdo, int $id): void
{
    find_event($pdo, $id);
    $pdo->prepare('DELETE FROM event_redirects WHERE event_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM events WHERE id = ?')->execute([$id]);
}

// --- venues and organizers ----------------------------------------------------------------------

const EVENT_LOOKUPS = [
    'venue' => [
        'table' => 'event_venues', 'column' => 'venue_id', 'column2' => 'address',
        'gone' => 'Pasirinkta vieta nebeegzistuoja. Pasirinkite kitą.',
        'missing' => 'Vieta nerasta. Galbūt ji jau ištrinta.',
        'inUse' => 'Ši vieta naudojama renginiuose, todėl jos ištrinti negalima. Pirma pakeiskite vietą šiuose renginiuose.',
        'fields' => [
            ['key' => 'name', 'type' => 'text', 'required' => true, 'max' => 120],
            ['key' => 'address', 'type' => 'text', 'max' => 200],
        ],
    ],
    'organizer' => [
        'table' => 'event_organizers', 'column' => 'organizer_id', 'column2' => 'website',
        'gone' => 'Pasirinktas organizatorius nebeegzistuoja. Pasirinkite kitą.',
        'missing' => 'Organizatorius nerastas. Galbūt jis jau ištrintas.',
        'inUse' => 'Šis organizatorius priskirtas renginiams, todėl jo ištrinti negalima. Pirma pakeiskite organizatorių šiuose renginiuose.',
        'fields' => [
            ['key' => 'name', 'type' => 'text', 'required' => true, 'max' => 120],
            ['key' => 'website', 'type' => 'text', 'max' => 300, 'format' => 'url'],
        ],
    ],
];

function lookup_kind(string $kind): array
{
    if (!isset(EVENT_LOOKUPS[$kind])) throw not_found('Tokio sąrašo nėra.');
    return EVENT_LOOKUPS[$kind];
}

function lookup_public(string $kind, array $row): array
{
    $second = lookup_kind($kind)['column2'];
    return ['id' => (int) $row['id'], 'name' => $row['name'], $second => $row[$second], 'eventCount' => (int) ($row['event_count'] ?? 0)];
}

function find_lookup(PDO $pdo, string $kind, int $id): array
{
    $def = lookup_kind($kind);
    $stmt = $pdo->prepare("SELECT t.*, (SELECT COUNT(*) FROM events e WHERE e.{$def['column']} = t.id) AS event_count FROM {$def['table']} t WHERE t.id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) throw not_found($def['missing']);
    return $row;
}

function admin_list_lookups(PDO $pdo, string $kind): array
{
    $def = lookup_kind($kind);
    $rows = $pdo->query("SELECT t.*, (SELECT COUNT(*) FROM events e WHERE e.{$def['column']} = t.id) AS event_count FROM {$def['table']} t ORDER BY t.name ASC, t.id ASC")->fetchAll();
    return ['items' => array_map(fn($row) => lookup_public($kind, $row), $rows)];
}

function admin_save_lookup(PDO $pdo, string $kind, ?int $id, array $in): array
{
    $def = lookup_kind($kind);
    if ($id) find_lookup($pdo, $kind, $id);
    $errors = [];
    $clean = validate_fields($def['fields'], $in, '', $errors);
    if ($errors) throw validation_error($errors);
    $second = $def['column2'];
    if ($id) {
        $pdo->prepare("UPDATE {$def['table']} SET name = ?, $second = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")->execute([$clean['name'], $clean[$second], $id]);
    } else {
        $pdo->prepare("INSERT INTO {$def['table']} (name, $second) VALUES (?, ?)")->execute([$clean['name'], $clean[$second]]);
        $id = (int) $pdo->lastInsertId();
    }
    return lookup_public($kind, find_lookup($pdo, $kind, $id));
}

function admin_delete_lookup(PDO $pdo, string $kind, int $id): void
{
    $def = lookup_kind($kind);
    find_lookup($pdo, $kind, $id);
    $stmt = $pdo->prepare("SELECT title FROM events WHERE {$def['column']} = ? ORDER BY start_date DESC LIMIT 20");
    $stmt->execute([$id]);
    $usage = array_map(fn($title) => 'Renginys „' . ($title ?: 'be pavadinimo') . '“', $stmt->fetchAll(PDO::FETCH_COLUMN));
    if ($usage) throw new ApiError(409, 'in_use', $def['inUse'], ['usage' => $usage]);
    $pdo->prepare("DELETE FROM {$def['table']} WHERE id = ?")->execute([$id]);
}
