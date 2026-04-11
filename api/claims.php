<?php
// ============================================================
//  api/claims.php
//  GET  /api/claims.php           → list all claims (admin)
//  POST /api/claims.php           → submit a claim (student)
//  PUT  /api/claims.php?id=N      → approve/reject (admin)
// ============================================================
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$db     = getDB();

// ── GET — list claims ──────────────────────────────────────
if ($method === 'GET') {
    $rows = $db->query(
        'SELECT cr.*, i.item_name, u.name AS claimant_name, u.email AS claimant_email
         FROM claim_requests cr
         JOIN items i ON i.id = cr.item_id
         JOIN users u ON u.id = cr.user_id
         ORDER BY cr.created_at DESC'
    )->fetchAll();
    respond(['claims' => $rows]);
}

// ── POST — submit claim ────────────────────────────────────
if ($method === 'POST') {
    $itemId      = (int)($body['item_id']      ?? 0);
    $userId      = (int)($body['user_id']      ?? 0);
    $contactInfo = trim($body['contact_info']  ?? '');
    $description = trim($body['description']   ?? '');

    if (!$itemId || !$userId || !$contactInfo || !$description) {
        respond(['error' => 'All fields are required.'], 400);
    }

    $stmt = $db->prepare(
        'INSERT INTO claim_requests (item_id, user_id, contact_info, description)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$itemId, $userId, $contactInfo, $description]);

    respond(['success' => true, 'message' => 'Claim submitted successfully.'], 201);
}

// ── PUT — update claim status ──────────────────────────────
if ($method === 'PUT' && $id) {
    $status  =      $body['status']     ?? 'Pending';   // Approved | Rejected
    $adminId = (int)($body['admin_id']  ?? 0);

    if (!in_array($status, ['Approved', 'Rejected', 'Pending'])) {
        respond(['error' => 'Invalid status.'], 400);
    }

    $db->prepare('UPDATE claim_requests SET status = ? WHERE id = ?')
       ->execute([$status, $id]);

    if ($adminId) {
        $stmt = $db->prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)');
        $stmt->execute([$adminId, 'UPDATE_CLAIM', "Claim ID $id set to $status"]);
    }

    respond(['success' => true]);
}

respond(['error' => 'Method not allowed.'], 405);