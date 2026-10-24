<?php
// Local PHP preview only. Hostinger uses the bundled .htaccess instead.
$root = rtrim($_SERVER['DOCUMENT_ROOT'], '/\\');
$route = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
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
