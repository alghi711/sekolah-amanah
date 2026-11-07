<?php
// Local PHP preview only. Hostinger uses the bundled .htaccess instead.
$root = rtrim($_SERVER['DOCUMENT_ROOT'], '/\\');
$route = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('~^/(?:amanah-private(?:/|$)|api/(?:database|storage)\.php$|admin/lib\.php$)~', $route)) {
    http_response_code(404);
    return true;
}
if ($route === '/content.js') {
    $_GET['format'] = 'js';
    require $root . '/api/content.php';
    return true;
}
if (preg_match('~^/(tk|sd|smp|smk)\.html$~', $route, $match)) {
    $_GET['school'] = $match[1];
    require $root . '/api/profile.php';
    return true;
}
return false;
