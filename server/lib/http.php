<?php
declare(strict_types=1);

/** An error the API turns into a JSON response with a Lithuanian message for the admin. */
final class ApiError extends RuntimeException
{
    public int $status;
    public string $codeName;
    public array $extra;

    public function __construct(int $status, string $codeName, string $message, array $extra = [])
    {
        parent::__construct($message);
        $this->status = $status;
        $this->codeName = $codeName;
        $this->extra = $extra;
    }
}

function validation_error(array $fields, string $message = 'Patikrinkite pažymėtus laukus.'): ApiError
{
    return new ApiError(422, 'validation', $message, ['fields' => $fields]);
}

function not_found(string $message = 'Nerasta.'): ApiError
{
    return new ApiError(404, 'not_found', $message);
}

function json_out(int $status, $data): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function error_out(ApiError $e): void
{
    json_out($e->status, ['error' => $e->codeName, 'message' => $e->getMessage()] + $e->extra);
}

/** Decoded JSON body (an object); rejects anything else. */
function json_body(int $maxBytes = 2_000_000): array
{
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $maxBytes) throw new ApiError(413, 'too_large', 'Per daug duomenų vienu kartu.');
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) throw new ApiError(413, 'too_large', 'Per daug duomenų vienu kartu.');
    $data = json_decode($raw === '' ? '{}' : $raw, true);
    if (!is_array($data) || array_is_list($data) && $data !== []) throw new ApiError(400, 'bad_json', 'Netinkamas užklausos formatas.');
    return $data;
}

/** HTML-escape for attribute and text output. */
function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}
