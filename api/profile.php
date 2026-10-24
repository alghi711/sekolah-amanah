<?php
declare(strict_types=1);
define('AMANAH_API', true);
require __DIR__ . '/database.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, array('GET', 'HEAD'), true)) { http_response_code(405); header('Allow: GET, HEAD'); exit; }
$key = $_GET['school'] ?? '';
if (!in_array($key, array('tk', 'sd', 'smp', 'smk'), true)) { http_response_code(404); exit; }
$html = file_get_contents(dirname(__DIR__) . '/' . $key . '.html');
try {
    $content = amanah_content();
    $posts = array_values(array_filter($content['posts'], static function ($post) use ($key) {
        return preg_match('/^' . preg_quote($key, '/') . '\b/i', $post['school']) === 1;
    }));
    $escape = static fn($value) => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $cards = '';
    foreach (array_slice($posts, 0, 3) as $post) {
        $url = 'index.html?berita=' . $post['id'] . '#kabar';
        $title = $escape($post['title']);
        $photo = $post['image'] === '' ? '' : '<a href="' . $escape($url) . '" class="profile-news-photo" tabindex="-1" aria-hidden="true"><img src="' . $escape($post['image']) . '" alt="" width="768" height="465" loading="lazy"></a>';
        $cards .= '<article class="profile-news-card">' . $photo . '<div class="profile-news-copy"><div class="profile-news-meta"><span>' . ($post['category'] === 'prestasi' ? 'PRESTASI' : 'KEGIATAN') . '</span><time datetime="' . $escape($post['date']) . '">' . $escape(substr($post['date'], 0, 10)) . '</time></div><h3><a href="' . $escape($url) . '">' . $title . '</a></h3><a class="profile-text-link" href="' . $escape($url) . '" aria-label="Baca ' . $title . '">Baca berita <span aria-hidden="true">↗</span></a></div></article>';
    }
    if (!$posts) { $cards = '<p>Belum ada berita untuk jenjang ini.</p>'; }
    $grid = '<div class="profile-news-grid' . (count($posts) === 1 ? ' single-story' : '') . '">' . $cards . '</div></section>';
    $html = preg_replace_callback('/<div class="profile-news-grid[^\"]*">[\s\S]*?<\/div><\/section>/', static fn() => $grid, $html, 1);
    header('X-Amanah-Data: mysql');
} catch (Throwable $error) {
    amanah_log_database_error($error);
    header('X-Amanah-Data: fallback');
}
if ($method !== 'HEAD') { echo $html; }
