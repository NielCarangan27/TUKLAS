<?php
// ============================================================
//  api/logs.php
//  GET    /api/logs.php       → fetch all logs
//  POST   /api/logs.php       → insert a log entry
//  DELETE /api/logs.php       → clear all logs (admin)
// ============================================================
require_once __DIR__ . '/../config.php';
$method  = $_SERVER['REQUEST_METHOD'];
$body    = json_decode(file_get_contents('php://input'), true) ?? [];
$db      = getDB();

if ($method === 'GET') {
    $rows = $db->query(
        'SELECT al.*, u.name AS user_name
         FROM activity_logs al
         LEFT JOIN users u ON u.id = al.performed_by
         ORDER BY al.created_at DESC
         LIMIT 200'
    )->fetchAll();
    respond(['logs' => $rows]);
}

if ($method === 'POST') {
    $action       = trim($body['action']       ?? '');
    $performed_by = intval($body['performed_by'] ?? 0);

    if (!$action) {
        respond(['error' => 'Action is required.'], 400);
    }

    $stmt = $db->prepare(
        'INSERT INTO activity_logs (action, performed_by) VALUES (?, ?)'
    );
    $stmt->execute([$action, $performed_by ?: null]);
    respond(['success' => true, 'message' => 'Log saved.']);
}

if ($method === 'DELETE') {
    $db->exec('DELETE FROM activity_logs');
    respond(['success' => true, 'message' => 'All logs cleared.']);
}

respond(['error' => 'Method not allowed.'], 405);