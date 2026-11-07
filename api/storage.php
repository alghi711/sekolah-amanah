<?php
declare(strict_types=1);
if (!defined('AMANAH_API')) { http_response_code(404); exit; }

function amanah_private_directory(): string {
    return rtrim(getenv('AMANAH_PRIVATE_DIR') ?: dirname(__DIR__, 2) . '/amanah-private', '/\\');
}

function amanah_content_file(): string { return amanah_private_directory() . '/content.json'; }

function amanah_is_list($value): bool {
    return is_array($value) && ($value === [] || array_keys($value) === range(0, count($value) - 1));
}

function amanah_valid_content_url($value, bool $empty = false): bool {
    if (!is_string($value)) { return false; }
    if ($empty && $value === '') { return true; }
    if (str_starts_with($value, 'assets/') && !str_contains($value, '..') && preg_match('~^assets/[a-zA-Z0-9/_.-]+$~D', $value)) { return true; }
    return filter_var($value, FILTER_VALIDATE_URL) !== false && in_array(strtolower((string) parse_url($value, PHP_URL_SCHEME)), ['http', 'https'], true);
}

function amanah_validate_content(array $data): void {
    foreach (['source', 'imported', 'profiles', 'partners', 'logo', 'eventBanner', 'posts'] as $key) {
        if (!array_key_exists($key, $data)) { throw new UnexpectedValueException('Missing content setting.'); }
    }
    if (!amanah_valid_content_url($data['source']) || !amanah_valid_content_url($data['logo']) || !amanah_valid_content_url($data['eventBanner']) || !is_string($data['imported']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $data['imported'])) { throw new UnexpectedValueException('Invalid content settings.'); }
    if (!amanah_is_list($data['posts']) || !amanah_is_list($data['profiles']) || !amanah_is_list($data['partners'])) { throw new UnexpectedValueException('Invalid content lists.'); }
    foreach ($data['partners'] as $url) { if (!amanah_valid_content_url($url)) { throw new UnexpectedValueException('Invalid partner image.'); } }
    foreach ($data['profiles'] as $profile) {
        if (!is_array($profile) || !isset($profile['slug'], $profile['url'], $profile['paragraphs']) || !is_string($profile['slug']) || !amanah_valid_content_url($profile['url']) || !amanah_is_list($profile['paragraphs'])) { throw new UnexpectedValueException('Invalid profile setting.'); }
        foreach ($profile['paragraphs'] as $paragraph) { if (!is_string($paragraph)) { throw new UnexpectedValueException('Invalid profile paragraph.'); } }
    }
    $ids = [];
    foreach ($data['posts'] as $post) {
        if (!is_array($post) || !isset($post['id'], $post['title'], $post['date'], $post['school'], $post['category'], $post['url'], $post['image'], $post['blocks']) || !is_int($post['id']) || $post['id'] <= 0 || $post['id'] > 9007199254740991 || isset($ids[$post['id']]) || !amanah_is_list($post['blocks'])) { throw new UnexpectedValueException('Invalid saved article.'); }
        $ids[$post['id']] = true;
        foreach (['title', 'date', 'school', 'category'] as $field) { if (!is_string($post[$field]) || $post[$field] === '') { throw new UnexpectedValueException('Invalid article field.'); } }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s', $post['date']);
        if (!$date || $date->format('Y-m-d\TH:i:s') !== $post['date'] || !in_array($post['category'], ['prestasi', 'kegiatan', 'artikel'], true) || !amanah_valid_content_url($post['url']) || !amanah_valid_content_url($post['image'], true)) { throw new UnexpectedValueException('Invalid article metadata.'); }
        foreach ($post['blocks'] as $block) {
            if (!is_array($block) || !isset($block['type'], $block['text']) || !is_string($block['type']) || !in_array($block['type'], ['p', 'li', 'h2', 'h3'], true) || !is_string($block['text'])) { throw new UnexpectedValueException('Invalid article block.'); }
        }
    }
    if (isset($data['_submissions'])) {
        if (!is_array($data['_submissions'])) { throw new UnexpectedValueException('Invalid submission index.'); }
        foreach ($data['_submissions'] as $key => $id) { if (!is_string($key) || !preg_match('/^[a-f0-9]{64}$/D', $key) || !is_int($id) || !isset($ids[$id])) { throw new UnexpectedValueException('Invalid submission reference.'); } }
    }
}

function amanah_read_file_content(bool $public = true): array {
    $file = amanah_content_file();
    if (!is_file($file) || filesize($file) > 32 * 1024 * 1024) { throw new RuntimeException('Content file unavailable.'); }
    $json = file_get_contents($file);
    if ($json === false) { throw new RuntimeException('Content cannot be read.'); }
    $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data)) { throw new UnexpectedValueException('Invalid content.'); }
    amanah_validate_content($data);
    usort($data['posts'], static fn($a, $b) => strcmp($b['date'], $a['date']) ?: $b['id'] <=> $a['id']);
    if ($public) { unset($data['_submissions']); }
    return $data;
}

function amanah_write_json(string $file, array $data): void {
    amanah_validate_content($data);
    $json = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if (strlen($json) > 32 * 1024 * 1024) { throw new RuntimeException('Content storage limit reached.'); }
    $temporary = tempnam(dirname($file), '.amanah-');
    if ($temporary === false) { throw new RuntimeException('Cannot prepare content save.'); }
    try {
        if (file_put_contents($temporary, $json) !== strlen($json) || !chmod($temporary, 0600) || !rename($temporary, $file)) { throw new RuntimeException('Cannot save content.'); }
    } finally {
        if (is_file($temporary)) { unlink($temporary); }
    }
}

function amanah_publish_post(array $post, string $submission): int {
    $directory = amanah_private_directory();
    $lock = fopen($directory . '/content.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) { throw new RuntimeException('Content is busy.'); }
    try {
        $data = amanah_read_file_content(false);
        $key = hash('sha256', $submission);
        if (isset($data['_submissions'][$key])) { return (int) $data['_submissions'][$key]; }
        $ids = array_column($data['posts'], 'id');
        do { $id = (int) (microtime(true) * 1000) * 1000 + random_int(0, 999); } while (in_array($id, $ids, true));
        $post['id'] = $id;
        $post['url'] = 'https://sekolahamanah.sch.id/?berita=' . $id . '#kabar';
        array_unshift($data['posts'], $post);
        $data['_submissions'][$key] = $id;
        if (count($data['_submissions']) > 1000) { $data['_submissions'] = array_slice($data['_submissions'], -1000, null, true); }
        $backups = $directory . '/backups';
        if (!is_dir($backups) && !mkdir($backups, 0700, true)) { throw new RuntimeException('Cannot create backup folder.'); }
        $backup = $backups . '/content-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(5)) . '.json';
        if (!copy(amanah_content_file(), $backup) || !chmod($backup, 0600)) { throw new RuntimeException('Cannot back up content.'); }
        amanah_write_json(amanah_content_file(), $data);
        return $id;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

final class AmanahPostNotFound extends RuntimeException {}
final class AmanahPostConflict extends RuntimeException {}

function amanah_post_version(array $post): string {
    return hash('sha256', json_encode($post, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

function amanah_update_post(int $id, array $fields, string $version): int {
    $directory = amanah_private_directory();
    $lock = fopen($directory . '/content.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) { throw new RuntimeException('Content is busy.'); }
    try {
        $data = amanah_read_file_content(false);
        $index = array_search($id, array_column($data['posts'], 'id'), true);
        if ($index === false) { throw new AmanahPostNotFound('Article not found.'); }
        $original = $data['posts'][$index];
        if (!hash_equals(amanah_post_version($original), $version)) { throw new AmanahPostConflict('Article has changed.'); }
        foreach (['title', 'school', 'category', 'date', 'blocks', 'image'] as $field) {
            $data['posts'][$index][$field] = $fields[$field];
        }
        amanah_validate_content($data);
        if ($data['posts'][$index] === $original) { return $id; }
        $backups = $directory . '/backups';
        if (!is_dir($backups) && !mkdir($backups, 0700, true)) { throw new RuntimeException('Cannot create backup folder.'); }
        $backup = $backups . '/content-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(5)) . '.json';
        if (!copy(amanah_content_file(), $backup) || !chmod($backup, 0600)) { throw new RuntimeException('Cannot back up content.'); }
        amanah_write_json(amanah_content_file(), $data);
        return $id;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function amanah_category_label(string $category): string {
    return ['prestasi' => 'PRESTASI', 'kegiatan' => 'KEGIATAN', 'artikel' => 'ARTIKEL'][$category] ?? 'KEGIATAN';
}
