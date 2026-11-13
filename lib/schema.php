<?php
declare(strict_types=1);

// Validates and cleans content against src/content/schema.json (the admin forms use the same file,
// so both sides agree on what is required and how long a field may be). Errors are keyed by the
// field path, e.g. "items.2.name", and the admin shows them next to that field.

function schema(): array
{
    static $schema = null;
    if ($schema !== null) return $schema;
    foreach ([__DIR__ . '/schema.json', dirname(__DIR__, 2) . '/src/content/schema.json'] as $file) {
        if (is_file($file)) {
            $schema = json_decode((string) file_get_contents($file), true, 64, JSON_THROW_ON_ERROR);
            return $schema;
        }
    }
    throw new RuntimeException('schema.json not found');
}

function section_def(string $key): ?array
{
    return schema()['sections'][$key] ?? null;
}

function page_def(string $key): ?array
{
    foreach (schema()['pages'] as $page) if ($page['key'] === $key) return $page;
    return null;
}

function option_values($options): array
{
    $list = is_string($options) ? (schema()['options'][$options] ?? []) : (array) $options;
    return array_map(fn($o) => is_array($o) ? (string) $o['value'] : (string) $o, $list);
}

/** Validates $data against $fields; returns the cleaned value (unknown keys dropped). */
function validate_fields(array $fields, $data, string $prefix, array &$errors): array
{
    if (!is_array($data) || (array_is_list($data) && $data !== [])) $data = [];
    $out = [];
    foreach ($fields as $field) {
        $out[$field['key']] = validate_field($field, $data[$field['key']] ?? null, $prefix . $field['key'], $errors);
    }
    return $out;
}

function clean_line($value, bool $multiline): string
{
    $s = is_string($value) ? $value : (is_int($value) || is_float($value) ? (string) $value : '');
    $s = str_replace(["\r\n", "\r"], "\n", $s);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    if (!$multiline) $s = preg_replace('/\s*\n\s*/u', ' ', $s) ?? '';
    return trim($s);
}

function too_long(int $max, int $length): string
{
    return "Ne daugiau kaip {$max} ženklų (dabar {$length}).";
}

function validate_field(array $f, $value, string $path, array &$errors)
{
    $required = !empty($f['required']);
    switch ($f['type']) {
        case 'text':
        case 'textarea':
            $s = clean_line($value, $f['type'] === 'textarea');
            if ($s === '') {
                if ($required) $errors[$path] = 'Šis laukas privalomas.';
                return '';
            }
            $len = mb_strlen($s);
            if (isset($f['max']) && $len > $f['max']) {
                $errors[$path] = too_long((int) $f['max'], $len);
            } elseif (isset($f['format'])) {
                [$s, $message] = check_format((string) $f['format'], $s);
                if ($message) $errors[$path] = $message;
            }
            return $s;

        case 'richtext':
            $html = is_string($value) ? sanitize_html($value, 'inline') : '';
            $len = mb_strlen(html_text($html));
            if ($len === 0) {
                if ($required) $errors[$path] = 'Šis laukas privalomas.';
                return '';
            }
            if (isset($f['max']) && $len > $f['max']) $errors[$path] = too_long((int) $f['max'], $len);
            return $html;

        case 'checkbox':
            return $value === true || $value === 1 || $value === '1';

        case 'select':
            $s = clean_line($value, false);
            if ($s === '') {
                if ($required) $errors[$path] = 'Pasirinkite reikšmę.';
                return '';
            }
            if (!in_array($s, option_values($f['options']), true)) $errors[$path] = 'Pasirinkite reikšmę iš sąrašo.';
            return $s;

        case 'image':
            return validate_image($f, $value, $path, $errors);

        case 'tags':
            $items = [];
            foreach (is_array($value) ? $value : [] as $item) {
                $s = clean_line($item, false);
                if ($s !== '') $items[] = $s;
            }
            foreach ($items as $i => $s) {
                if (isset($f['max']) && mb_strlen($s) > $f['max']) $errors["$path.$i"] = too_long((int) $f['max'], mb_strlen($s));
            }
            if (isset($f['minItems']) && count($items) < $f['minItems']) $errors[$path] = "Reikia bent {$f['minItems']}.";
            if (isset($f['maxItems']) && count($items) > $f['maxItems']) $errors[$path] = "Ne daugiau kaip {$f['maxItems']}.";
            return $items;

        case 'list':
            $items = is_array($value) && array_is_list($value) ? $value : [];
            if (isset($f['min']) && count($items) < $f['min']) $errors[$path] = "Reikia bent {$f['min']}.";
            if (isset($f['max']) && count($items) > $f['max']) $errors[$path] = "Ne daugiau kaip {$f['max']}.";
            $out = [];
            foreach (array_slice($items, 0, (int) ($f['max'] ?? 200)) as $i => $item) {
                $clean = validate_fields($f['fields'], $item, "$path.$i.", $errors);
                $check = $f['check'] ?? null;
                if ($check && $check['type'] === 'timeOrder') {
                    $start = $clean[$check['start']] ?? '';
                    $end = $clean[$check['end']] ?? '';
                    if ($start !== '' && $end !== '' && !isset($errors["$path.$i.{$check['end']}"]) && strcmp($end, $start) <= 0) {
                        $errors["$path.$i.{$check['end']}"] = 'Pabaiga turi būti vėliau nei pradžia.';
                    }
                }
                $out[] = $clean;
            }
            return $out;
    }
    throw new LogicException('Unknown field type ' . $f['type']);
}

/** Returns [normalized value, error message or null]. */
function check_format(string $format, string $s): array
{
    switch ($format) {
        case 'email':
            return [$s, filter_var($s, FILTER_VALIDATE_EMAIL) ? null : 'Įrašykite el. pašto adresą, pvz. vardas@pastas.lt.'];
        case 'phone':
            $digits = preg_replace('/\D/', '', $s) ?? '';
            $ok = preg_match('/^\+?[\d\s()\-]+$/', $s) && strlen($digits) >= 7 && strlen($digits) <= 15;
            return [$s, $ok ? null : 'Įrašykite telefono numerį, pvz. +370 600 00000.'];
        case 'url':
            $ok = preg_match('#^https?://[^\s"\'<>]+$#i', $s) && filter_var($s, FILTER_VALIDATE_URL);
            return [$s, $ok ? null : 'Įrašykite pilną nuorodą, prasidedančią https://'];
        case 'time':
            if (!preg_match('/^(\d{1,2})[:.](\d{2})$/', $s, $m) || (int) $m[1] > 23 || (int) $m[2] > 59) {
                return [$s, 'Laikas formatu VV:MM, pvz. 17:30.'];
            }
            return [sprintf('%02d:%02d', $m[1], $m[2]), null];
        case 'date':
            if (!preg_match('/^(\d{4})[.\-](\d{2})[.\-](\d{2})$/', $s, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                return [$s, 'Data formatu MMMM.MM.DD, pvz. 2026.09.02.'];
            }
            return ["{$m[1]}.{$m[2]}.{$m[3]}", null];
        case 'price':
            return [$s, preg_match('/^\d{1,5}([.,]\d{1,2})?$/', $s) ? null : 'Įrašykite kainą skaičiais, pvz. 55 arba 55,50.'];
        case 'stat':
            return [$s, preg_match('/^\d{1,5}[+%]?$/', $s) ? null : 'Skaičius, gale gali būti + arba %, pvz. 650+.'];
    }
    return [$s, null];
}

function valid_image_src(string $src): bool
{
    if (str_contains($src, '..')) return false;
    if (preg_match('#^/(media|img|assets)/[A-Za-z0-9/_\-.]+\.(webp|jpe?g|png|gif|avif|svg)$#i', $src)) return true;
    return (bool) (preg_match('#^https://[^\s"\'<>()\\\\]+$#i', $src) && filter_var($src, FILTER_VALIDATE_URL));
}

function validate_image(array $f, $value, string $path, array &$errors): array
{
    $value = is_array($value) ? $value : [];
    $src = clean_line($value['src'] ?? '', false);
    $altMode = $f['alt'] ?? 'required';
    $alt = $altMode === 'none' ? '' : clean_line($value['alt'] ?? '', false);
    $out = ['src' => $src, 'alt' => $alt];
    if (!empty($f['focus'])) {
        foreach (['x', 'y'] as $axis) {
            if (isset($value[$axis]) && is_numeric($value[$axis])) $out[$axis] = round(max(0, min(100, (float) $value[$axis])), 1);
        }
    }
    if ($src === '') {
        if (!empty($f['required'])) $errors["$path.src"] = 'Įkelkite nuotrauką.';
        $out['alt'] = '';
        return $out;
    }
    if (!valid_image_src($src)) $errors["$path.src"] = 'Netinkama nuotraukos nuoroda. Įkelkite nuotrauką iš naujo.';
    if (mb_strlen($alt) > 160) $errors["$path.alt"] = too_long(160, mb_strlen($alt));
    elseif ($altMode === 'required' && mb_strlen($alt) < 3) $errors["$path.alt"] = 'Trumpai aprašykite, kas nuotraukoje (alt tekstas).';
    return $out;
}
