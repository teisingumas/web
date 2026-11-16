<?php
declare(strict_types=1);

// Registrations from the /registracija form. Kept in a JSON file in the data folder (outside
// public_html), so they work with or without the MySQL database. Every change also writes the
// day's backup copy (CSV that Excel opens) into megusta-data/registrations/backups/.

const REG_STATUSES = ['nesusisiekta', 'susisiekta', 'neatvyks'];

function reg_dir(): string
{
    return data_dir() . '/registrations';
}

function reg_file(): string
{
    return reg_dir() . '/registrations.json';
}

/**
 * Runs $fn with the list under an exclusive lock; $fn returns [newList|null, result].
 * The first ever use seeds 30 sample rows (flagged demo) so the admin has something to show.
 */
function reg_tx(callable $fn)
{
    if (!ensure_dir(reg_dir() . '/backups')) throw new ApiError(500, 'storage', 'Nepavyko sukurti registracijų aplanko serveryje.');
    $fh = fopen(reg_file(), 'c+');
    if (!$fh) throw new ApiError(500, 'storage', 'Nepavyko atidaryti registracijų failo.');
    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $list = $raw === '' ? null : json_decode((string) $raw, true);
        if (!is_array($list)) $list = reg_demo_rows();
        [$next, $result] = $fn($list);
        if ($next === null && $raw === '') $next = $list;
        if ($next !== null) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode(array_values($next), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
            fflush($fh);
            reg_backup(array_values($next));
        }
        return $result;
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

function reg_next_id(array $list): int
{
    $max = 0;
    foreach ($list as $r) $max = max($max, (int) $r['id']);
    return $max + 1;
}

function reg_str($v, int $max): string
{
    $s = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $v) ?? '');
    return mb_substr($s, 0, $max);
}

/** POST /api/public/registrations: the public form. */
function reg_create(array $b): array
{
    if (!empty($b['website'])) return ['ok' => true]; // honeypot
    $row = [
        'email' => reg_str($b['email'] ?? '', 160),
        'birthDate' => reg_str($b['birthDate'] ?? '', 10),
        'dancer' => reg_str($b['dancer'] ?? '', 120),
        'styles' => reg_str($b['styles'] ?? '', 400),
        'phone' => reg_str($b['phone'] ?? '', 24),
        'parentPhone' => reg_str($b['parentPhone'] ?? '', 24),
        'district' => reg_str($b['district'] ?? '', 120),
        'experience' => reg_str($b['experience'] ?? '', 2000),
        'source' => reg_str($b['source'] ?? '', 60),
    ];
    $fields = [];
    if (!filter_var($row['email'], FILTER_VALIDATE_EMAIL)) $fields['email'] = 'Neteisingas el. paštas.';
    if (mb_strlen($row['dancer']) < 3) $fields['dancer'] = 'Įrašykite vardą ir pavardę.';
    if (strlen(preg_replace('/\D/', '', $row['phone'])) < 7) $fields['phone'] = 'Įrašykite telefono numerį.';
    if (empty($b['consent'])) $fields['consent'] = 'Reikalingas sutikimas.';
    if ($fields) throw validation_error($fields);
    return reg_tx(function (array $list) use ($row) {
        if (count($list) > 20000) throw new ApiError(507, 'full', 'Registracijų sąrašas pilnas.');
        $row = ['id' => reg_next_id($list), 'createdAt' => gmdate('c')] + $row
            + ['status' => 'nesusisiekta', 'notes' => '', 'statusAt' => null, 'demo' => false];
        $list[] = $row;
        return [$list, ['ok' => true, 'id' => $row['id']]];
    });
}

function reg_list(): array
{
    return reg_tx(fn (array $list) => [null, ['items' => array_reverse($list)]]);
}

/** PATCH {status?, notes?} */
function reg_update(int $id, array $b): array
{
    return reg_tx(function (array $list) use ($id, $b) {
        foreach ($list as &$r) {
            if ((int) $r['id'] !== $id) continue;
            if (array_key_exists('status', $b)) {
                if (!in_array($b['status'], REG_STATUSES, true)) throw validation_error(['status' => 'Neteisinga būsena.']);
                if ($r['status'] !== $b['status']) $r['statusAt'] = gmdate('c');
                $r['status'] = $b['status'];
            }
            if (array_key_exists('notes', $b)) $r['notes'] = reg_str($b['notes'], 4000);
            return [$list, $r];
        }
        throw not_found('Tokios registracijos nėra.');
    });
}

function reg_delete(int $id): array
{
    return reg_tx(function (array $list) use ($id) {
        $left = array_values(array_filter($list, fn ($r) => (int) $r['id'] !== $id));
        if (count($left) === count($list)) throw not_found('Tokios registracijos nėra.');
        return [$left, ['ok' => true]];
    });
}

function reg_delete_demo(): array
{
    return reg_tx(function (array $list) {
        $left = array_values(array_filter($list, fn ($r) => empty($r['demo'])));
        return [$left, ['ok' => true, 'deleted' => count($list) - count($left)]];
    });
}

// --- backups ------------------------------------------------------------------------------

const REG_COLUMNS = [
    'id' => 'Nr.', 'createdAt' => 'Gauta', 'dancer' => 'Šokėjas', 'birthDate' => 'Gimimo data', 'email' => 'El. paštas',
    'phone' => 'Telefonas', 'parentPhone' => 'Tėvų telefonas', 'styles' => 'Stiliai', 'district' => 'Mikrorajonas',
    'experience' => 'Patirtis', 'source' => 'Iš kur sužinojo', 'status' => 'Būsena', 'statusAt' => 'Būsena pakeista', 'notes' => 'Pastabos',
];

/** One CSV per day (UTF-8 with BOM, ";" separated: Excel opens it with Lithuanian letters intact). */
function reg_backup(array $list): void
{
    $out = fopen('php://temp', 'w+');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, array_values(REG_COLUMNS), ';', '"', '');
    foreach ($list as $r) {
        $line = [];
        foreach (array_keys(REG_COLUMNS) as $k) {
            $v = (string) ($r[$k] ?? '');
            if (($k === 'createdAt' || $k === 'statusAt') && $v !== '') $v = date('Y-m-d H:i', strtotime($v));
            // keep Excel from treating "+370…" or "=…" as a formula
            if ($v !== '' && ($v[0] === '=' || $v[0] === '@' || (strpbrk($v[0], '+-') !== false && !str_contains($v, ' ')))) $v = "'" . $v;
            $line[] = $v;
        }
        fputcsv($out, $line, ';', '"', '');
    }
    rewind($out);
    @file_put_contents(reg_dir() . '/backups/registracijos-' . date('Y-m-d') . '.csv', stream_get_contents($out), LOCK_EX);
    fclose($out);
}

function reg_backups(): array
{
    $files = glob(reg_dir() . '/backups/registracijos-*.csv') ?: [];
    rsort($files);
    return ['items' => array_map(fn ($f) => ['name' => basename($f), 'size' => filesize($f), 'modifiedAt' => gmdate('c', filemtime($f))], $files)];
}

function reg_backup_download(string $name): void
{
    $path = reg_dir() . '/backups/' . $name;
    if (!preg_match('/^registracijos-\d{4}-\d{2}-\d{2}\.csv$/', $name) || !is_file($path)) throw not_found('Tokios kopijos nėra.');
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $name . '"');
    header('Cache-Control: no-store');
    readfile($path);
    exit;
}

// --- 30 sample rows -----------------------------------------------------------------------

function reg_demo_rows(): array
{
    mt_srand(20261111);
    $first = ['Ugnė', 'Emilija', 'Kamilė', 'Gabija', 'Austėja', 'Lukas', 'Matas', 'Jokūbas', 'Rugilė', 'Amelija',
        'Saulė', 'Domas', 'Nojus', 'Liepa', 'Elzė', 'Smiltė', 'Kajus', 'Augustė', 'Rokas', 'Viltė'];
    $last = ['Kazlauskaitė', 'Petrauskaitė', 'Jankauskaitė', 'Stankevičiūtė', 'Vasiliauskaitė', 'Kazlauskas', 'Petrauskas',
        'Jankauskas', 'Žukauskaitė', 'Butkutė', 'Paulauskaitė', 'Urbonas', 'Kavaliauskas', 'Sakalauskaitė', 'Navickaitė',
        'Rimkutė', 'Baranauskas', 'Mockutė', 'Šimkus', 'Lukoševičiūtė'];
    $styles = ['Gatvės šokiai (nuo 4m. iki neribojamo amžiaus)', 'Pop Dance (nuo 8m. iki 15m.)', 'Lady Class (nuo 16m.)', 'Breakdance (nuo 7m.)'];
    $districts = ['Šilainiai', 'Dainava', 'Eiguliai', 'Žaliakalnis', 'Centras', 'Vilijampolė', 'Aleksotas', 'Pramonė', 'Kalniečiai', 'Garliava'];
    $sources = ['Iš pažįstamų', 'Instagram', 'Facebook', 'Google', 'Tik Tok', 'Renginyje', 'Iš pažįstamų', 'Instagram'];
    $exp = ['', '', '', 'Šokau 1 metus mokykloje', '2 metus lankiau šiuolaikinius šokius', '', 'Šiek tiek breiko vasaros stovykloje', 'Pusę metų hip hop kitoje studijoje'];
    $notes = ['', '', '', 'Skambinti po 17 val.', 'Ateis į pirmadienio treniruotę', 'Mama klausė dėl kainos su broliu', 'Neatsiliepė, bandyti dar kartą', ''];
    $rows = [];
    for ($i = 0; $i < 30; $i++) {
        $isGirl = mt_rand(0, 9) < 7;
        $fn = $first[mt_rand(0, $isGirl ? 13 : 19)];
        $boy = in_array($fn, ['Lukas', 'Matas', 'Jokūbas', 'Domas', 'Nojus', 'Kajus', 'Rokas'], true);
        $pool = array_values(array_filter($last, fn ($l) => $boy ? !preg_match('/(aitė|ūtė|utė)$/u', $l) : preg_match('/(aitė|ūtė|utė)$/u', $l)));
        $age = mt_rand(0, 4) === 0 ? mt_rand(16, 28) : mt_rand(6, 15);
        $created = time() - (int) round((29 - $i) * 2.05 * 86400) - mt_rand(0, 70000);
        $status = $i >= 24 ? 'nesusisiekta' : ['susisiekta', 'susisiekta', 'nesusisiekta', 'susisiekta', 'neatvyks'][mt_rand(0, 4)];
        $phone = '+370 6' . mt_rand(1000000, 9999999);
        $style = $age >= 16 ? $styles[[0, 2, 3][mt_rand(0, 2)]] : $styles[[0, 1, 3, 0][mt_rand(0, 3)]];
        if (mt_rand(0, 5) === 0 && $style !== $styles[0]) $style .= ', ' . $styles[0];
        $mail = mb_strtolower(strtr($fn, ['ė' => 'e', 'ū' => 'u', 'š' => 's', 'ž' => 'z', 'č' => 'c', 'ą' => 'a', 'į' => 'i', 'ų' => 'u', 'Ž' => 'z', 'Š' => 's']));
        $rows[] = [
            'id' => $i + 1,
            'createdAt' => gmdate('c', $created),
            'email' => $mail . mt_rand(10, 99) . '@pavyzdys.lt',
            'birthDate' => date('Y', time() - $age * 31557600) . '.' . sprintf('%02d.%02d', mt_rand(1, 12), mt_rand(1, 28)),
            'dancer' => $fn . ' ' . $pool[mt_rand(0, count($pool) - 1)],
            'styles' => $style,
            'phone' => $phone,
            'parentPhone' => $age < 16 ? '+370 6' . mt_rand(1000000, 9999999) : '',
            'district' => $districts[mt_rand(0, count($districts) - 1)],
            'experience' => $exp[mt_rand(0, count($exp) - 1)],
            'source' => $sources[mt_rand(0, count($sources) - 1)],
            'status' => $status,
            'notes' => $status === 'nesusisiekta' ? '' : $notes[mt_rand(0, count($notes) - 1)],
            'statusAt' => $status === 'nesusisiekta' ? null : gmdate('c', $created + mt_rand(3600, 100000)),
            'demo' => true,
        ];
    }
    mt_srand();
    return $rows;
}
