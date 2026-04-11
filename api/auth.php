<?php
require_once __DIR__ . '/../config.php';
$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

if ($action === 'register') {
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
}

if ($action === 'login') {
    $email    = trim($body['email']    ?? '');
    $password =      $body['password'] ?? '';
    $role     =      $body['role']     ?? 'student';
    if (!$email || !$password) {
        respond(['error' => 'Email and password are required.'], 400);
    }
    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        respond(['error' => 'Invalid email or password.'], 401);
    }
    if ($role === 'admin' && $user['role'] !== 'admin') {
        respond(['error' => 'You do not have admin privileges.'], 403);
    }
    if ($role === 'student' && $user['role'] !== 'student') {
        respond(['error' => 'Please select the correct role.'], 403);
    }
    respond([
        'success' => true,
        'user'    => [
            'id'        => $user['id'],
            'name'      => $user['name'],
            'id_number' => $user['id_number'],
            'email'     => $user['email'],
            'role'      => $user['role'],
        ]
    ]);
}

if (isset($_GET['users'])) {
    $db   = getDB();
    $stmt = $db->query('SELECT id, name, id_number, email, role, created_at FROM users ORDER BY created_at DESC');
    respond(['users' => $stmt->fetchAll()]);
}

respond(['error' => 'Invalid action.'], 400);