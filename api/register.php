<?php
require_once __DIR__ . '/../config.php';
$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$name     = trim($body['name']      ?? '');
$idNumber = trim($body['id_number'] ?? '');
$email    = trim($body['email']     ?? '');
$password =      $body['password']  ?? '';
if (!$name || !$idNumber || !$email || !$password) {
    respond(['error' => 'All fields are required.'], 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['error' => 'Invalid email address.'], 400);
}
if (strlen($password) < 6) {
    respond(['error' => 'Password must be at least 6 characters.'], 400);
}
$db   = getDB();
$stmt = $db->prepare('SELECT id FROM users WHERE email = ? OR id_number = ?');
$stmt->execute([$email, $idNumber]);
if ($stmt->fetch()) {
    respond(['error' => 'Email or ID number already registered.'], 409);
}
$hash = password_hash($password, PASSWORD_BCRYPT);
$db->prepare('INSERT INTO users (name, id_number, email, password_hash) VALUES (?, ?, ?, ?)')
   ->execute([$name, $idNumber, $email, $hash]);
respond(['success' => true, 'message' => 'Registration successful.']);