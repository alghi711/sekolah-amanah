<?php
if (!defined('AMANAH_API')) { http_response_code(404); exit; }

function amanah_database(): PDO {
    $file = getenv('AMANAH_DB_CONFIG') ?: dirname(__DIR__, 2) . '/amanah-private/database.php';
    if (!is_file($file)) { throw new RuntimeException('Database configuration is not installed.'); }
    $config = require $file;
    if (!is_array($config)) { throw new RuntimeException('Invalid database configuration.'); }
    foreach (array('host', 'database', 'username', 'password') as $key) {
        if (!isset($config[$key]) || !is_string($config[$key]) || $config[$key] === '') { throw new RuntimeException('Incomplete database configuration.'); }
    }
    if (preg_match('/[;\r\n]/', $config['host'] . $config['database'])) { throw new RuntimeException('Invalid database address.'); }
    $port = filter_var($config['port'] ?? 3306, FILTER_VALIDATE_INT, array('options' => array('min_range' => 1, 'max_range' => 65535)));
    if (!$port) { throw new RuntimeException('Invalid database port.'); }
    return new PDO('mysql:host=' . $config['host'] . ';port=' . $port . ';dbname=' . $config['database'] . ';charset=utf8mb4', $config['username'], $config['password'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_TIMEOUT => 5,
    ));
}

function amanah_public_url(string $url): string {
    if (str_starts_with($url, 'assets/') && !str_contains($url, '..') && !preg_match('/[\\\\\x00-\x20]/', $url)) { return $url; }
    if (filter_var($url, FILTER_VALIDATE_URL) && in_array(strtolower((string) parse_url($url, PHP_URL_SCHEME)), array('https', 'http'), true)) { return $url; }
    throw new UnexpectedValueException('Invalid public content URL.');
}

function amanah_read_content(PDO $db): array {
    $content = array();
    foreach ($db->query('SELECT name, value FROM amanah_settings')->fetchAll() as $row) {
        $content[$row['name']] = json_decode($row['value'], true, 512, JSON_THROW_ON_ERROR);
    }
    foreach (array('source', 'imported', 'profiles', 'partners', 'logo', 'eventBanner') as $key) {
        if (!array_key_exists($key, $content)) { throw new UnexpectedValueException('Missing site settings.'); }
    }
    if (!is_array($content['partners']) || !is_array($content['profiles'])) { throw new UnexpectedValueException('Invalid site settings.'); }
    $content['source'] = amanah_public_url($content['source']);
    $content['partners'] = array_map('amanah_public_url', $content['partners']);
    $content['logo'] = amanah_public_url($content['logo']);
    $content['eventBanner'] = amanah_public_url($content['eventBanner']);
    $content['posts'] = array();
    foreach ($db->query('SELECT id, post_date, title, school, category, url, image, blocks FROM amanah_posts ORDER BY post_date DESC, id DESC')->fetchAll() as $row) {
        $blocks = json_decode($row['blocks'], true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($blocks) || !in_array($row['category'], array('prestasi', 'kegiatan'), true)) { throw new UnexpectedValueException('Invalid article.'); }
        foreach ($blocks as $block) {
            if (!is_array($block) || !isset($block['type'], $block['text']) || !is_string($block['text']) || !in_array($block['type'], array('p', 'li', 'h2', 'h3'), true)) { throw new UnexpectedValueException('Invalid article block.'); }
        }
        $content['posts'][] = array(
            'id' => (int) $row['id'], 'date' => str_replace(' ', 'T', $row['post_date']),
            'title' => $row['title'], 'school' => $row['school'], 'category' => $row['category'],
            'url' => amanah_public_url($row['url']), 'image' => $row['image'] === '' ? '' : amanah_public_url($row['image']), 'blocks' => $blocks,
        );
    }
    return $content;
}

function amanah_content(): array { return amanah_read_content(amanah_database()); }

function amanah_log_database_error(Throwable $error): void {
    // Keep credentials, SQL statements and server addresses out of public responses and logs.
    error_log('[Amanah MySQL] Content unavailable: ' . get_class($error));
}
