<?php
// JSON API for the admin (/api/admin/*, Clerk sign-in required) and the public news pages
// (/api/public/*). public/.htaccess sends every /api/... request here.
//
// Writes may arrive as POST with "X-HTTP-Method-Override: PUT|PATCH|DELETE": some shared
// hosting firewalls block real PUT/DELETE requests, so the admin always uses that form.

declare(strict_types=1);

require dirname(__DIR__) . '/lib/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$override = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '');
if ($method === 'POST' && in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) $method = $override;
$path = '/' . trim(preg_replace('#^/api#', '', (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH)), '/');

$routes = [
    ['GET', '#^/status$#', 'route_status', false],
    ['GET', '#^/public/posts$#', 'route_public_posts', false],
    ['GET', '#^/public/posts/([a-z0-9-]{1,120})$#', 'route_public_post', false],
    ['GET', '#^/public/events$#', 'route_public_events', false],
    ['GET', '#^/public/events/([a-z0-9-]{1,120})$#', 'route_public_event', false],
    ['POST', '#^/admin/login$#', 'route_login', false],
    ['POST', '#^/public/registrations$#', 'route_create_registration', false],
    // registrations live in a file, so these work before the database is connected
    ['GET', '#^/admin/registrations$#', 'route_registrations', 'nodb'],
    ['GET', '#^/admin/registrations/backups$#', 'route_registration_backups', 'nodb'],
    ['GET', '#^/admin/registrations/backups/(registracijos-\\d{4}-\\d{2}-\\d{2}\\.csv)$#', 'route_registration_backup', 'nodb'],
    ['DELETE', '#^/admin/registrations/demo$#', 'route_delete_demo_registrations', 'nodb'],
    ['PATCH', '#^/admin/registrations/(\\d+)$#', 'route_update_registration', 'nodb'],
    ['DELETE', '#^/admin/registrations/(\\d+)$#', 'route_delete_registration', 'nodb'],
    ['POST', '#^/admin/import/wordpress$#', 'route_import_wordpress', true],
    ['GET', '#^/admin/me$#', 'route_me', true],
    ['GET', '#^/admin/content$#', 'route_content', true],
    ['PUT', '#^/admin/content/([a-z.]{1,64})$#', 'route_save_content', true],
    ['GET', '#^/admin/seo$#', 'route_seo', true],
    ['PUT', '#^/admin/seo/([a-z]{1,32})$#', 'route_save_seo', true],
    ['GET', '#^/admin/posts$#', 'route_posts', true],
    ['POST', '#^/admin/posts$#', 'route_create_post', true],
    ['GET', '#^/admin/posts/slug-check$#', 'route_slug_check', true],
    ['GET', '#^/admin/posts/(\d+)$#', 'route_post', true],
    ['PUT', '#^/admin/posts/(\d+)$#', 'route_update_post', true],
    ['DELETE', '#^/admin/posts/(\d+)$#', 'route_delete_post', true],
    ['GET', '#^/admin/events$#', 'route_events', true],
    ['POST', '#^/admin/events$#', 'route_create_event', true],
    ['GET', '#^/admin/events/slug-check$#', 'route_event_slug_check', true],
    ['GET', '#^/admin/events/(\d+)$#', 'route_event', true],
    ['PUT', '#^/admin/events/(\d+)$#', 'route_update_event', true],
    ['DELETE', '#^/admin/events/(\d+)$#', 'route_delete_event', true],
    ['GET', '#^/admin/(venues|organizers|types)$#', 'route_lookups', true],
    ['POST', '#^/admin/(venues|organizers|types)$#', 'route_create_lookup', true],
    ['PUT', '#^/admin/(venues|organizers|types)/(\d+)$#', 'route_update_lookup', true],
    ['DELETE', '#^/admin/(venues|organizers|types)/(\d+)$#', 'route_delete_lookup', true],
    ['GET', '#^/admin/media$#', 'route_media', true],
    ['POST', '#^/admin/media$#', 'route_upload', true],
    ['PATCH', '#^/admin/media/(\d+)$#', 'route_update_media', true],
    ['DELETE', '#^/admin/media/(\d+)$#', 'route_delete_media', true],
];

try {
    $matchedPath = false;
    foreach ($routes as [$routeMethod, $pattern, $handler, $auth]) {
        if (!preg_match($pattern, $path, $m)) continue;
        $matchedPath = true;
        if ($routeMethod !== $method) continue;
        if ($auth === 'nodb') {
            require_admin();
        } elseif ($auth) {
            if (!db_configured()) throw new ApiError(503, 'not_configured', 'Svetainės duomenų bazė dar neprijungta (megusta-config.php).');
            require_admin();
        }
        $result = $handler(...array_slice($m, 1));
        json_out(200, $result);
        exit;
    }
    throw $matchedPath ? new ApiError(405, 'method', 'Netinkamas užklausos metodas.') : not_found('Tokio API adreso nėra.');
} catch (ApiError $e) {
    error_out($e);
} catch (PDOException $e) {
    log_error("API $method $path", $e);
    error_out(new ApiError(500, 'database', 'Duomenų bazės klaida. Bandykite dar kartą po minutės.'));
} catch (Throwable $e) {
    log_error("API $method $path", $e);
    error_out(new ApiError(500, 'server', 'Serverio klaida. Bandykite dar kartą.'));
}

// --- setup check (shown on /adminas until everything is ready) -----------------------------

function route_status(): array
{
    $configFound = is_file(config_path());
    $db = false;
    if (db_configured()) {
        try {
            db();
            $db = true;
        } catch (Throwable $e) {
            log_error('Database connection failed', $e);
        }
    }
    $dataDir = ensure_dir(data_dir() . '/media') && is_writable(data_dir() . '/media');
    $checks = [
        'php' => version_compare(PHP_VERSION, '8.1.0', '>='),
        'config' => $configFound,
        'database' => $db,
        'clerk' => demo_login_enabled() || clerk_frontend_api() !== null,
        'admins' => demo_login_enabled() || count((array) config_value('admin_user_ids', [])) > 0,
        'storage' => $dataDir,
        'images' => function_exists('imagecreatefromstring') && class_exists('finfo'),
    ];
    $out = ['ready' => !in_array(false, $checks, true), 'checks' => $checks, 'phpVersion' => PHP_VERSION];
    // Where the config file must go (only while it is missing).
    if (!$configFound) $out['configPath'] = config_path();
    return $out;
}

// --- public ---------------------------------------------------------------------------------

function route_public_posts(): array
{
    if (!db_configured()) return ['items' => [], 'page' => 1, 'pages' => 1, 'total' => 0];
    return public_posts_page(db(), (int) ($_GET['page'] ?? 1));
}

function route_public_post(string $slug): array
{
    $row = db_configured() ? (find_published_post(db(), $slug) ?? find_redirect_target(db(), $slug)) : null;
    if (!$row) throw not_found('Naujiena nerasta.');
    return post_public($row, db());
}

function route_public_events(): array
{
    if (!db_configured()) return ['upcoming' => [], 'past' => []];
    return public_events(db());
}

function route_public_event(string $slug): array
{
    $row = db_configured() ? (find_published_event(db(), $slug) ?? find_event_redirect_target(db(), $slug)) : null;
    if (!$row) throw not_found('Renginys nerastas.');
    return event_public($row, db());
}

// --- admin ----------------------------------------------------------------------------------

function route_login(): array
{
    $body = json_decode((string) file_get_contents('php://input'), true);
    return demo_login(is_array($body) ? $body : []);
}

function route_create_registration(): array
{
    return reg_create(json_body(50_000));
}

function route_registrations(): array
{
    return reg_list();
}

function route_registration_backups(): array
{
    return reg_backups();
}

function route_registration_backup(string $name): array
{
    reg_backup_download($name);
    return [];
}

function route_update_registration(string $id): array
{
    return reg_update((int) $id, json_body(50_000));
}

function route_delete_registration(string $id): array
{
    return reg_delete((int) $id);
}

function route_delete_demo_registrations(): array
{
    return reg_delete_demo();
}

function route_import_wordpress(): array
{
    $b = json_body(10_000);
    return wp_import_post(db(), (string) ($b['url'] ?? ''), !empty($b['publish']));
}

function route_me(): array
{
    return ['userId' => require_admin()];
}

function route_content(): array
{
    return ['sections' => (object) load_section_rows(db())];
}

function route_save_content(string $key): array
{
    $body = json_body();
    return save_section(db(), $key, $body['data'] ?? null);
}

function route_seo(): array
{
    return ['pages' => load_seo(db())];
}

function route_save_seo(string $page): array
{
    return save_seo(db(), $page, json_body());
}

function route_posts(): array
{
    return admin_list_posts(db(), (string) ($_GET['status'] ?? ''), (string) ($_GET['q'] ?? ''), (int) ($_GET['page'] ?? 1));
}

function route_post(string $id): array
{
    return post_admin(find_post(db(), (int) $id));
}

function route_create_post(): array
{
    return admin_save_post(db(), null, json_body());
}

function route_update_post(string $id): array
{
    return admin_save_post(db(), (int) $id, json_body());
}

function route_delete_post(string $id): array
{
    admin_delete_post(db(), (int) $id);
    return ['ok' => true];
}

function route_slug_check(): array
{
    $slug = strtolower(trim((string) ($_GET['slug'] ?? '')));
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    $problem = slug_problem(db(), $slug, $id);
    return ['ok' => $problem === null, 'message' => $problem];
}

function route_events(): array
{
    return admin_list_events(db(), (string) ($_GET['status'] ?? ''), (string) ($_GET['q'] ?? ''), (int) ($_GET['page'] ?? 1));
}

function route_event(string $id): array
{
    return event_admin(find_event(db(), (int) $id));
}

function route_create_event(): array
{
    return admin_save_event(db(), null, json_body());
}

function route_update_event(string $id): array
{
    return admin_save_event(db(), (int) $id, json_body());
}

function route_delete_event(string $id): array
{
    admin_delete_event(db(), (int) $id);
    return ['ok' => true];
}

function route_event_slug_check(): array
{
    $slug = strtolower(trim((string) ($_GET['slug'] ?? '')));
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    $problem = event_slug_problem(db(), $slug, $id);
    return ['ok' => $problem === null, 'message' => $problem];
}

/** /admin/venues, /admin/organizers and /admin/types share one set of handlers. */
function lookup_kind_of(string $plural): string
{
    return ['venues' => 'venue', 'organizers' => 'organizer', 'types' => 'type'][$plural];
}

function route_lookups(string $plural): array
{
    return admin_list_lookups(db(), lookup_kind_of($plural));
}

function route_create_lookup(string $plural): array
{
    return admin_save_lookup(db(), lookup_kind_of($plural), null, json_body());
}

function route_update_lookup(string $plural, string $id): array
{
    return admin_save_lookup(db(), lookup_kind_of($plural), (int) $id, json_body());
}

function route_delete_lookup(string $plural, string $id): array
{
    admin_delete_lookup(db(), lookup_kind_of($plural), (int) $id);
    return ['ok' => true];
}

function route_media(): array
{
    return ['items' => list_media(db())];
}

function route_upload(): array
{
    // post_max_size overflow: PHP drops the whole body
    if (empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        throw new ApiError(413, 'too_large', 'Nuotrauka per didelė. Didžiausias leidžiamas dydis — 2 MB.');
    }
    return store_upload(db(), $_FILES['file'] ?? [], (string) ($_POST['alt'] ?? ''));
}

function route_update_media(string $id): array
{
    $body = json_body();
    return update_media_alt(db(), (int) $id, $body['alt'] ?? '');
}

function route_delete_media(string $id): array
{
    delete_media(db(), (int) $id);
    return ['ok' => true];
}
