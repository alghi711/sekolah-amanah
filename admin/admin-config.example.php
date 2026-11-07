<?php
// Install the real configuration in amanah-private, outside public_html.
if (!defined('AMANAH_API')) { http_response_code(404); exit; }
return [
    'username' => 'Admin',
    'password_hash' => 'GENERATE_WITH_PHP_PASSWORD_HASH',
];
