<?php
declare(strict_types=1);
define('AMANAH_API', true);
require __DIR__ . '/database.php';
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, array('GET', 'HEAD'), true)) { http_response_code(405); header('Allow: GET, HEAD'); exit; }
$javascript = ($_GET['format'] ?? '') === 'js';
header('Content-Type: ' . ($javascript ? 'application/javascript' : 'application/json') . '; charset=utf-8');
try {
    $data = amanah_content();
    $json = json_encode($data, JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE);
    header('X-Amanah-Data: mysql');
    if ($method !== 'HEAD') { echo $javascript ? 'window.AMANAH_CONTENT=' . $json . ';' : $json; }
} catch (Throwable $error) {
    amanah_log_database_error($error);
    if ($javascript) {
        header('X-Amanah-Data: fallback');
        if ($method !== 'HEAD') { readfile(dirname(__DIR__) . '/content.js'); }
    } else {
        http_response_code(503);
        if ($method !== 'HEAD') { echo '{"error":"Database belum tersedia. Periksa konfigurasi dan impor SQL di hosting."}'; }
    }
}
