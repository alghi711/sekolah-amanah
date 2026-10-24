<?php
// Save as amanah-private/database.php, beside public_html (not inside it).
if (!defined('AMANAH_API')) { http_response_code(404); exit; }
return array(
    'host' => 'localhost',
    'port' => 3306,
    'database' => 'u123456789_amanah',
    'username' => 'u123456789_amanah',
    'password' => 'ISI_PASSWORD_DATABASE_DI_HOSTINGER',
);
