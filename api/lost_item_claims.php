<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

if ($method === 'GET') {
    $db   = getDB();
    $rows = $db->query(
        'SELECT lic.*, li.item_name, u.name AS claimant_name, u.email AS claimant_email
         FROM lost_item_claims lic
         JOIN lost_items li ON li.id = lic.lost_item_id
         JOIN users u ON u.id = lic.user_id
         ORDER BY lic.created_at DESC'
    )->fetchAll();
    respond(['claims' => $rows]);
}

if ($method === 'POST') {
    $lostItemId  = (int)($body['lost_item_id']  ?? 0);
    $userId      = (int)($body['user_id']        ?? 0);
    $contactInfo = trim($body['contact_info']    ?? '');
    $description = trim($body['description']     ?? '');

    if (!$lostItemId || !$userId || !$contactInfo || !$description) {
        respond(['error' => 'All fields are required.'], 400);
    }

    $db   = getDB();
    $stmt = $db->prepare(
        'INSERT INTO lost_item_claims (lost_item_id, user_id, contact_info, description)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$lostItemId, $userId, $contactInfo, $description]);
    respond(['success' => true, 'message' => 'Claim submitted successfully.'], 201);
}

if ($method === 'PUT' && $id) {
    $status  = $body['status']   ?? 'Pending';
    $adminId = (int)($body['admin_id'] ?? 1);
    $db      = getDB();

    // Update claim status
    $db->prepare('UPDATE lost_item_claims SET status = ? WHERE id = ?')
       ->execute([$status, $id]);

    // Get claim details for logging
    $row = $db->prepare('SELECT lic.lost_item_id, li.item_name, u.name AS claimant_name
                         FROM lost_item_claims lic
                         JOIN lost_items li ON li.id = lic.lost_item_id
                         JOIN users u ON u.id = lic.user_id
                         WHERE lic.id = ?');
    $row->execute([$id]);
    $claim = $row->fetch();

    if ($claim) {
        // If approved, mark the lost item as Claimed
        if ($status === 'Approved') {
            $db->prepare('UPDATE lost_items SET status = ? WHERE id = ?')
               ->execute(['Claimed', $claim['lost_item_id']]);
        }

        // If rejected, set item back to Lost
        if ($status === 'Rejected') {
            $db->prepare('UPDATE lost_items SET status = ? WHERE id = ?')
               ->execute(['Lost', $claim['lost_item_id']]);
        }

        // Log the action in activity_logs
        $action  = $status === 'Approved' ? 'APPROVE_CLAIM' : 'REJECT_CLAIM';
        $details = "$status claim for \"{$claim['item_name']}\" by {$claim['claimant_name']}";
      $db->prepare('INSERT INTO activity_logs (performed_by, action) VALUES (?, ?)')
   ->execute([$adminId, $details]);
    }

    respond(['success' => true]);
}

respond(['error' => 'Method not allowed.'], 405);