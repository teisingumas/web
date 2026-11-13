<?php
declare(strict_types=1);

// Plain HTML copies of the main pages (home, /registracija, /kainos, /tvarkarastis, /kontaktai) for
// crawlers and link previews that do not run JavaScript. Google recommends having the main content in
// the HTML the server returns; the React app replaces this copy as soon as it starts, so visitors see
// the usual page. The copy uses the same texts as the page (saved content laid over the defaults).

/** Starting texts from src/content/defaults.ts (written to lib/defaults.json by scripts/copy-server.mjs). */
function content_defaults(): array
{
    static $defaults = null;
    if ($defaults !== null) return $defaults;
    $file = __DIR__ . '/defaults.json';
    $defaults = is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
    return $defaults;
}

/** Same rule as mergeSection() in src/content/index.ts: a saved section is laid over its default. */
function merged_sections(array $saved): array
{
    $out = content_defaults();
    foreach ($saved as $key => $value) {
        if (is_array($value) && !array_is_list($value)) $out[$key] = array_merge($out[$key] ?? [], $value);
    }
    return $out;
}

function pr_text($value): string
{
    return e(is_scalar($value) ? trim((string) $value) : '');
}

function pr_list($value): array
{
    return is_array($value) && array_is_list($value) ? $value : [];
}

/** <p>text</p> when the text is not empty. */
function pr_p($value): string
{
    $t = pr_text($value);
    return $t !== '' ? "<p>$t</p>" : '';
}

function pr_wrap(string $inner): string
{
    return '<div data-prerender style="' . PRERENDER_STYLE . '">' . $inner . '</div>';
}

function pr_pricing(array $pricing, string $heading = 'h2'): string
{
    $out = '';
    if (($pricing['title'] ?? '') !== '' && $heading !== '') $out .= "<$heading>" . pr_text($pricing['title']) . "</$heading>";
    $plans = '';
    foreach (pr_list($pricing['plans'] ?? null) as $plan) {
        $features = '';
        foreach (pr_list($plan['features'] ?? null) as $f) $features .= '<li>' . pr_text($f) . '</li>';
        $plans .= '<li><h3>' . pr_text($plan['name'] ?? '') . '</h3>'
            . pr_p($plan['desc'] ?? '')
            . '<p>' . pr_text($plan['price'] ?? '') . ' € ' . pr_text($plan['period'] ?? '') . '</p>'
            . ($features !== '' ? "<ul>$features</ul>" : '') . '</li>';
    }
    if ($plans !== '') $out .= "<ul>$plans</ul>";
    return $out . pr_p($pricing['note'] ?? '');
}

function pr_faq(array $faq): string
{
    $out = '';
    foreach (pr_list($faq['groups'] ?? null) as $group) {
        $items = '';
        foreach (pr_list($group['items'] ?? null) as $item) {
            // answers are rich text, cleaned by sanitize_html() when saved
            $items .= '<h4>' . pr_text($item['q'] ?? '') . '</h4><div>' . (is_string($item['a'] ?? null) ? $item['a'] : '') . '</div>';
        }
        $out .= '<section><h3>' . pr_text($group['title'] ?? '') . '</h3>' . $items . '</section>';
    }
    return $out;
}

function pr_hours(array $hours): string
{
    $li = '';
    foreach ($hours as $h) $li .= '<li>' . pr_text($h['days'] ?? '') . ' ' . pr_text($h['hours'] ?? '') . '</li>';
    return $li !== '' ? "<ul>$li</ul>" : '';
}

function pr_contacts(array $contacts): string
{
    $phone = (string) ($contacts['phone'] ?? '');
    return '<p>' . pr_text($contacts['address'] ?? '') . '</p>'
        . '<p><a href="tel:' . e(preg_replace('/[^\d+]/', '', $phone) ?? '') . '">' . e($phone) . '</a></p>'
        . '<p><a href="mailto:' . e((string) ($contacts['email'] ?? '')) . '">' . pr_text($contacts['email'] ?? '') . '</a></p>';
}

function home_prerender(array $c): string
{
    $hero = $c['home.hero'] ?? [];
    $h1 = trim(implode(' ', array_filter([$hero['line1'] ?? '', $hero['line2'] ?? '', $hero['line3'] ?? ''], fn($s) => trim((string) $s) !== '')));
    $out = pr_p($hero['kicker'] ?? '') . '<h1>' . e($h1) . '</h1>' . pr_p($hero['text'] ?? '');

    $stats = '';
    foreach (pr_list($c['home.stats']['items'] ?? null) as $s) $stats .= '<li>' . pr_text($s['num'] ?? '') . ' ' . pr_text($s['label'] ?? '') . '</li>';
    if ($stats !== '') $out .= "<ul>$stats</ul>";

    $styles = $c['home.styles'] ?? [];
    $out .= '<section><h2>' . e(trim(($styles['title1'] ?? '') . ' ' . ($styles['title2'] ?? ''))) . '</h2>';
    foreach (pr_list($styles['items'] ?? null) as $s) {
        $levels = implode(', ', array_map('strval', pr_list($s['levels'] ?? null)));
        $out .= '<h3>' . pr_text($s['name'] ?? '') . '</h3>' . pr_p($s['tagline'] ?? '') . pr_p($s['description'] ?? '')
            . ($levels !== '' ? '<p>Amžiaus grupės: ' . e($levels) . '</p>' : '');
    }
    $out .= '</section>';

    $schedule = $c['home.schedule'] ?? [];
    $days = '';
    foreach (pr_list($schedule['days'] ?? null) as $d) {
        $classes = '';
        foreach (pr_list($d['classes'] ?? null) as $cl) {
            $classes .= '<li>' . pr_text($cl['time'] ?? '') . ' (' . pr_text($cl['duration'] ?? '') . ') ' . pr_text($cl['style'] ?? '') . ', ' . pr_text($cl['age'] ?? '') . '</li>';
        }
        $days .= '<h3>' . pr_text($d['day'] ?? '') . '</h3>' . ($classes !== '' ? "<ul>$classes</ul>" : '');
    }
    if ($days !== '') $out .= '<section><h2>' . pr_text($schedule['title'] ?? '') . '</h2>' . $days . '<p><a href="/tvarkarastis">Visas tvarkaraštis</a></p></section>';

    $out .= '<section>' . pr_pricing($c['pricing'] ?? []) . '<p><a href="/kainos">Kainos</a></p></section>';

    $trainers = $c['home.trainers'] ?? [];
    $list = '';
    foreach (pr_list($trainers['items'] ?? null) as $t) {
        $list .= '<li><h3>' . pr_text($t['name'] ?? '') . '</h3><p>' . pr_text($t['specialty'] ?? '')
            . (($t['experience'] ?? '') !== '' ? ', ' . pr_text($t['experience']) : '') . '</p>' . pr_p($t['bio'] ?? '') . '</li>';
    }
    if ($list !== '') $out .= '<section><h2>' . pr_text($trainers['title'] ?? '') . "</h2><ul>$list</ul></section>";

    $cta = $c['home.cta'] ?? [];
    $out .= '<section><h2>' . e(trim(($cta['line1'] ?? '') . ' ' . ($cta['line2'] ?? ''))) . '</h2>'
        . '<p><a href="/registracija">' . pr_text($cta['button'] ?? 'Registracija') . '</a></p></section>';
    return pr_wrap($out . pr_footer($c));
}

/** $tab: '' (the form tab), 'informacija' or 'kainos', matching /registracija, /registracija/informacija and /registracija/kainos. */
function registration_prerender(array $c, string $tab): string
{
    $reg = $c['registration'] ?? [];
    $contacts = $c['global.contacts'] ?? [];
    $out = pr_p($reg['kicker'] ?? '') . '<h1>Registracija</h1>'
        . '<nav><a href="/registracija">Registracija</a> · <a href="/registracija/informacija">Informacija</a> · <a href="/registracija/kainos">Kainos</a></nav>';
    if ($tab === 'informacija') {
        $out .= pr_p(trim(($reg['infoIntro'] ?? '') . ' ' . ($contacts['email'] ?? '') . ', ' . ($contacts['phone'] ?? '')));
        $out .= pr_faq($c['registration.faq'] ?? []);
    } elseif ($tab === 'kainos') {
        $out .= pr_pricing($c['pricing'] ?? []);
    } else {
        $out .= '<div>' . (is_string($reg['intro'] ?? null) ? $reg['intro'] : '') . '</div>';   // rich text, sanitized when saved
        $styles = '';
        foreach (pr_list($reg['styleOptions'] ?? null) as $s) $styles .= '<li>' . pr_text($s) . '</li>';
        if ($styles !== '') $out .= "<h2>Šokių stiliai</h2><ul>$styles</ul>";
        $steps = '';
        foreach (pr_list($reg['steps'] ?? null) as $s) $steps .= '<li>' . pr_text($s) . '</li>';
        if ($steps !== '') $out .= "<h2>Kas toliau</h2><ol>$steps</ol>";
        $hours = pr_hours(pr_list($reg['hours'] ?? null));
        if ($hours !== '') $out .= "<h2>Studijos darbo laikas</h2>$hours";
        $out .= pr_contacts($contacts);
    }
    return pr_wrap($out . pr_footer($c));
}

function pricing_prerender(array $c): string
{
    $pricing = $c['pricing'] ?? [];
    $out = pr_p($pricing['kicker'] ?? '') . '<h1>' . pr_text($pricing['title'] ?? 'Kainos') . '</h1>' . pr_pricing($pricing, '');
    $notes = '';
    foreach (pr_list($c['pricing.notes']['items'] ?? null) as $n) $notes .= '<li>* ' . pr_text($n['text'] ?? '') . '</li>';
    if ($notes !== '') $out .= "<ul>$notes</ul>";
    return pr_wrap($out . pr_faq($c['pricing.faq'] ?? []) . '<p><a href="/registracija">Registracija</a></p>' . pr_footer($c));
}

function timetable_prerender(array $c): string
{
    $tt = $c['timetable'] ?? [];
    $out = pr_p($tt['kicker'] ?? '') . '<h1>' . pr_text($tt['title'] ?? 'Tvarkaraštis') . '</h1>'
        . pr_p(trim('Galioja nuo ' . ($tt['validFrom'] ?? '') . ((($tt['season'] ?? '') !== '') ? '. ' . $tt['season'] : '')));
    foreach (pr_list($tt['halls'] ?? null) as $hall) {
        $out .= '<section><h2>' . pr_text($hall['label'] ?? '') . '</h2>';
        $days = pr_list($hall['days'] ?? null);
        if (!$days) $out .= pr_p($tt['emptyText'] ?? '');
        foreach ($days as $d) {
            $slots = '';
            foreach (pr_list($d['slots'] ?? null) as $s) {
                $slots .= '<li>' . pr_text($s['start'] ?? '') . '–' . pr_text($s['end'] ?? '') . ' ' . pr_text($s['group'] ?? '')
                    . (($s['trainer'] ?? '') !== '' ? ', ' . pr_text($s['trainer']) : '') . ' (' . pr_text($s['status'] ?? '') . ')</li>';
            }
            $out .= '<h3>' . pr_text($d['day'] ?? '') . '</h3>' . ($slots !== '' ? "<ul>$slots</ul>" : '');
        }
        $out .= '</section>';
    }
    return pr_wrap($out . pr_p($tt['note'] ?? '') . '<p><a href="/registracija">Registracija</a></p>' . pr_footer($c));
}

function contacts_prerender(array $c): string
{
    $contacts = $c['global.contacts'] ?? [];
    $out = '<p>Susisiek</p><h1>Kontaktai</h1>' . pr_contacts($contacts);
    $hours = pr_hours(pr_list($c['registration']['hours'] ?? null));
    if ($hours !== '') $out .= "<h2>Darbo laikas</h2>$hours";
    $socials = '';
    foreach (['facebook' => 'Facebook', 'instagram' => 'Instagram', 'tiktok' => 'TikTok', 'youtube' => 'YouTube'] as $key => $name) {
        $url = (string) ($c['global.socials'][$key] ?? '');
        if ($url !== '') $socials .= '<li><a href="' . e($url) . '" rel="noopener">' . $name . '</a></li>';
    }
    if ($socials !== '') $out .= "<h2>Socialiniai tinklai</h2><ul>$socials</ul>";
    return pr_wrap($out . pr_footer($c));
}

/** /gatves-sokiai: the page text lives in src/StreetDance.tsx; this is a short plain copy for crawlers. */
function street_dance_prerender(array $c): string
{
    $out = '<p>Šokių pamokos</p><h1>Gatvės šokiai</h1>'
        . '<p>Treniruočių metu pažindinamės su gatvės šokių istorija, gilinamės į įvairius stilius, tokius kaip Hip Hop, Locking, Popping, House, mokomės muzikalumo, šokame įvairias šokių choreografijas, improvizuojame, laviname fizinį pasiruošimą ir lankstumą. Ruošiamės įvairiems konkursams bei pasirodymams, taip pat ugdome bendravimą komandoje.</p>'
        . '<ul><li>Treniruotės trukmė: 45–60 min.</li><li>Sudeginama ~300 kcal</li><li>Amžiaus grupė: 4–99 m.</li><li>Pamokos: nuo 2 kartų per savaitę</li></ul>'
        . '<section><h2>Pradedančiųjų laikai</h2><ul>'
        . '<li>4–5 m.: I ir III, 17:30 (45 min.), treneris Paulina</li>'
        . '<li>6–7 m.: I ir III, 18:30 (45 min.), treneris Paulina</li>'
        . '<li>8–11 m.: I ir III, 18:00, treneris Rytis</li>'
        . '<li>12–15 m.: I ir III, 17:00, treneris Rytis</li>'
        . '<li>Nuo 18 m.: II ir IV, 19:00, trenerė Greta</li></ul></section>'
        . '<section><h2>Gatvės šokių stiliai</h2><ul><li>Hip-Hop</li><li>Locking</li><li>Popping</li><li>House</li></ul></section>'
        . '<p><a href="/registracija">Registruotis</a> · <a href="/tvarkarastis">Tvarkaraštis</a> · <a href="/kainos">Kainos</a></p>';
    return pr_wrap($out . pr_footer($c));
}

/** The site menu and footer text, so every page links to the others. */
function pr_footer(array $c): string
{
    $links = ['/' => 'Pagrindinis', '/kainos' => 'Kainos', '/tvarkarastis' => 'Tvarkaraštis', '/registracija' => 'Registracija',
        '/kalendorius' => 'Kalendorius', '/naujienos' => 'Naujienos', '/kontaktai' => 'Kontaktai'];
    $li = '';
    foreach ($links as $href => $label) $li .= '<li><a href="' . $href . '">' . $label . '</a></li>';
    return '<footer><nav aria-label="Svetainės meniu"><ul>' . $li . '</ul></nav>' . pr_p($c['global.footer']['text'] ?? '') . '</footer>';
}
