<?php
define('DB_HOST', 'sql105.epizy.com');
define('DB_USER', 'if0_41625169');
define('DB_PASS', 'Et45P9AeONTS6');
define('DB_NAME', 'if0_41625169_db_tuklas');

function getDB() {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8',
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    return $pdo;
}

function respond(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}