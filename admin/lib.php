<?php
declare(strict_types=1);
if (!defined('AMANAH_API')) { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/api/storage.php';

function admin_start_session(): void {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('amanah_admin');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/admin/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function admin_configuration(): array {
    $file = amanah_private_directory() . '/admin-config.php';
    if (!is_file($file)) { throw new RuntimeException('Admin is not configured.'); }
    $config = require $file;
    if (!is_array($config) || !isset($config['username'], $config['password_hash']) || !is_string($config['username']) || !is_string($config['password_hash']) || (password_get_info($config['password_hash'])['algoName'] ?? 'unknown') === 'unknown') { throw new UnexpectedValueException('Invalid admin configuration.'); }
    return $config;
}

function admin_authenticated(array $config): bool {
    $now = time();
    $valid = isset($_SESSION['admin'], $_SESSION['last_seen'], $_SESSION['issued'], $_SESSION['identity']) && $_SESSION['admin'] === $config['username'] && hash_equals(hash('sha256', $config['password_hash']), (string) $_SESSION['identity']) && $now - $_SESSION['last_seen'] <= 3600 && $now - $_SESSION['issued'] <= 8 * 3600;
    if (!$valid) { unset($_SESSION['admin'], $_SESSION['last_seen'], $_SESSION['issued'], $_SESSION['identity']); return false; }
    $_SESSION['last_seen'] = $now;
    return true;
}

function admin_csrf_valid(): bool {
    return isset($_POST['csrf'], $_SESSION['csrf']) && is_string($_POST['csrf']) && hash_equals($_SESSION['csrf'], $_POST['csrf']);
}

function admin_login_attempt(array $config, string $username, string $password): string {
    $directory = amanah_private_directory() . '/login-attempts';
    if (!is_dir($directory) && !mkdir($directory, 0700, true)) { throw new RuntimeException('Login unavailable.'); }
    $file = $directory . '/' . hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown')) . '.json';
    $handle = fopen($file, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) { throw new RuntimeException('Login unavailable.'); }
    try {
        $raw = stream_get_contents($handle);
        $attempt = $raw === '' ? ['start' => time(), 'count' => 0] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($attempt) || !isset($attempt['start'], $attempt['count'])) { throw new RuntimeException('Invalid login counter.'); }
        if (time() - $attempt['start'] >= 900) { $attempt = ['start' => time(), 'count' => 0]; }
        if ($attempt['count'] >= 5) { return 'limited'; }
        $passwordValid = password_verify($password, $config['password_hash']);
        $valid = hash_equals($config['username'], $username) && $passwordValid;
        $attempt['count'] = $valid ? 0 : $attempt['count'] + 1;
        $json = json_encode($attempt, JSON_THROW_ON_ERROR);
        rewind($handle);
        if (!ftruncate($handle, 0) || fwrite($handle, $json) !== strlen($json) || !fflush($handle)) { throw new RuntimeException('Cannot update login counter.'); }
        if (!$valid) { return 'invalid'; }
        session_regenerate_id(true);
        $_SESSION = ['admin' => $config['username'], 'issued' => time(), 'last_seen' => time(), 'identity' => hash('sha256', $config['password_hash']), 'csrf' => bin2hex(random_bytes(32)), 'published' => []];
        return 'ok';
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function admin_text(array $input, string $key): string {
    if (!isset($input[$key]) || !is_string($input[$key])) { return ''; }
    return trim($input[$key]);
}

function admin_post_id(string $value): int {
    if (!preg_match('/^[1-9][0-9]{0,15}$/D', $value) || (int) $value > 9007199254740991) { throw new InvalidArgumentException('Invalid article ID.'); }
    return (int) $value;
}

function admin_find_post(int $id): array {
    foreach (amanah_read_file_content()['posts'] as $post) { if ($post['id'] === $id) { return $post; } }
    throw new AmanahPostNotFound('Article not found.');
}

function admin_blocks_text(array $blocks): string {
    return implode("\n\n", array_map(static fn($block) => (['h2' => '# ', 'h3' => '## ', 'li' => '- '][$block['type']] ?? '') . $block['text'], $blocks));
}

function admin_post_fields(array $input, ?array $original = null): array {
    $title = admin_text($input, 'title');
    $body = str_replace(["\r\n", "\r"], "\n", admin_text($input, 'body'));
    $school = admin_text($input, 'school');
    $category = admin_text($input, 'category');
    $date = admin_text($input, 'date');
    $errors = [];
    if (mb_strlen($title) < 5 || mb_strlen($title) > 200) { $errors['title'] = 'Isi judul sepanjang 5–200 karakter.'; }
    if (mb_strlen($body) < 20 || mb_strlen($body) > 100000) { $errors['body'] = 'Isi tulisan sepanjang 20–100.000 karakter.'; }
    if (!in_array($school, ['SEKOLAH AMANAH', 'TK AMANAH', 'SD AMANAH', 'SMP AMANAH', 'SMK AMANAH'], true) && ($original === null || $school !== $original['school'])) { $errors['school'] = 'Pilih jenjang sekolah.'; }
    if (!in_array($category, ['prestasi', 'kegiatan', 'artikel'], true)) { $errors['category'] = 'Pilih jenis tulisan.'; }
    $day = DateTimeImmutable::createFromFormat('!Y-m-d', $date, new DateTimeZone('Asia/Jakarta'));
    $today = new DateTimeImmutable('today', new DateTimeZone('Asia/Jakarta'));
    if (!$day || $day->format('Y-m-d') !== $date || $day > $today) { $errors['date'] = 'Gunakan tanggal yang valid, maksimal hari ini.'; }
    if ($errors) { throw new AdminValidation($errors); }
    $blocks = [];
    $paragraph = [];
    $flush = static function () use (&$blocks, &$paragraph): void {
        if ($paragraph) { $blocks[] = ['type' => 'p', 'text' => implode("\n", $paragraph)]; $paragraph = []; }
    };
    foreach (explode("\n", $body) as $line) {
        $line = trim($line);
        if ($line === '') { $flush(); }
        elseif (str_starts_with($line, '## ')) { $flush(); $blocks[] = ['type' => 'h3', 'text' => trim(substr($line, 3))]; }
        elseif (str_starts_with($line, '# ')) { $flush(); $blocks[] = ['type' => 'h2', 'text' => trim(substr($line, 2))]; }
        elseif (str_starts_with($line, '- ')) { $flush(); $blocks[] = ['type' => 'li', 'text' => trim(substr($line, 2))]; }
        else { $paragraph[] = $line; }
    }
    $flush();
    if (!$blocks || count($blocks) > 2000) { throw new AdminValidation(['body' => 'Tulisan terlalu panjang atau belum berisi teks.']); }
    return ['title' => $title, 'school' => $school, 'category' => $category, 'date' => $date . 'T' . (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('H:i:s'), 'blocks' => $blocks, 'image' => ''];
}

final class AdminValidation extends RuntimeException {
    public array $errors;
    public function __construct(array $errors) { parent::__construct('Invalid form fields.'); $this->errors = $errors; }
}

function admin_save_photo(array $upload): string {
    if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) { return ''; }
    if (($upload['error'] ?? null) !== UPLOAD_ERR_OK || !isset($upload['tmp_name']) || !is_string($upload['tmp_name']) || !is_uploaded_file($upload['tmp_name'])) { throw new AdminValidation(['photo' => 'Foto gagal diunggah. Pilih ulang foto maksimal 8 MB.']); }
    $temporary = $upload['tmp_name'];
    $size = filesize($temporary);
    if ($size === false || $size < 1 || $size > 8 * 1024 * 1024) { throw new AdminValidation(['photo' => 'Ukuran foto maksimal 8 MB.']); }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($temporary);
    $types = ['image/jpeg' => ['jpg', IMAGETYPE_JPEG], 'image/png' => ['png', IMAGETYPE_PNG], 'image/webp' => ['webp', IMAGETYPE_WEBP]];
    $dimensions = @getimagesize($temporary);
    if (!isset($types[$mime]) || !$dimensions || $dimensions[2] !== $types[$mime][1] || $dimensions[0] * $dimensions[1] > 30000000 || max($dimensions[0], $dimensions[1]) > 12000) { throw new AdminValidation(['photo' => 'Gunakan foto JPEG, PNG, atau WebP yang valid, maksimal 30 megapiksel.']); }
    $limit = ini_get('memory_limit');
    $memory = (int) $limit;
    if (str_ends_with(strtolower($limit), 'g')) { $memory *= 1024 * 1024 * 1024; }
    elseif (str_ends_with(strtolower($limit), 'm')) { $memory *= 1024 * 1024; }
    elseif (str_ends_with(strtolower($limit), 'k')) { $memory *= 1024; }
    if ($memory > 0 && memory_get_usage(true) + $dimensions[0] * $dimensions[1] * 8 + 20 * 1024 * 1024 > $memory) { throw new AdminValidation(['photo' => 'Resolusi foto terlalu besar untuk diproses. Kecilkan foto lalu coba lagi.']); }
    $source = @imagecreatefromstring(file_get_contents($temporary));
    if (!$source) { throw new AdminValidation(['photo' => 'Foto tidak dapat dibaca. Pilih berkas foto lain.']); }
    $target = null;
    $path = '';
    try {
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($temporary);
            $orientation = (int) ($exif['Orientation'] ?? 1);
            if (in_array($orientation, [2, 4, 5, 7], true)) { imageflip($source, IMG_FLIP_HORIZONTAL); }
            $degrees = [3 => 180, 4 => 180, 5 => -90, 6 => -90, 7 => 90, 8 => 90][$orientation] ?? 0;
            if ($degrees) { $rotated = imagerotate($source, $degrees, 0); if ($rotated) { imagedestroy($source); $source = $rotated; } }
        }
        $width = imagesx($source); $height = imagesy($source);
        $scale = min(1, 2048 / max($width, $height));
        $newWidth = max(1, (int) round($width * $scale)); $newHeight = max(1, (int) round($height * $scale));
        $target = imagecreatetruecolor($newWidth, $newHeight);
        imagealphablending($target, false); imagesavealpha($target, true);
        imagecopyresampled($target, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        $folder = dirname(__DIR__) . '/assets/uploads';
        if (!is_dir($folder) && !mkdir($folder, 0755, true)) { throw new RuntimeException('Photo folder unavailable.'); }
        $name = date('Ymd') . '-' . bin2hex(random_bytes(12)) . '.' . $types[$mime][0];
        $path = $folder . '/' . $name;
        $saved = match ($mime) { 'image/jpeg' => imagejpeg($target, $path, 86), 'image/png' => imagepng($target, $path, 6), 'image/webp' => imagewebp($target, $path, 86) };
        if (!$saved || !chmod($path, 0644)) { throw new RuntimeException('Photo cannot be saved.'); }
        return 'assets/uploads/' . $name;
    } catch (Throwable $error) {
        if ($path !== '' && is_file($path)) { unlink($path); }
        throw $error;
    } finally {
        imagedestroy($source);
        if ($target) { imagedestroy($target); }
    }
}
