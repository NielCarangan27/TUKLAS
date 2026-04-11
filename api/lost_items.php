<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once __DIR__ . '/../config.php';
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
if ($method === 'GET') {
    $search   = $_GET['search']   ?? '';
    $location = $_GET['location'] ?? '';
    $status   = $_GET['status']   ?? '';
    $db       = getDB();
    $result   = [];
    // --- Lost items (student reports) ---
    if ($status === '' || $status === 'Lost' || $status === 'Claimed') {
        // Step 5: added private_description to SELECT
        $sql = 'SELECT id, item_name, description, private_description, NULL AS image_url, location, date_lost AS date_reported, status, created_at, reported_by AS user_id, "lost_report" AS source FROM lost_items WHERE 1=1';
        $params = [];
        if ($search)   { $sql .= ' AND item_name LIKE ?'; $params[] = "%$search%"; }
        if ($location) { $sql .= ' AND location LIKE ?';  $params[] = "%$location%"; }
        if ($status)   { $sql .= ' AND status = ?';       $params[] = $status; }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $result = array_merge($result, $stmt->fetchAll());
    }
    // --- Admin found items ---
    if ($status === '' || $status === 'Found' || $status === 'Claimed') {
        $sql = 'SELECT id, item_name, description, image_url, location, date_found AS date_reported, status, created_at, NULL AS user_id, "admin_found" AS source FROM items WHERE 1=1';
        $params = [];
        if ($search)   { $sql .= ' AND item_name LIKE ?'; $params[] = "%$search%"; }
        if ($location) { $sql .= ' AND location LIKE ?';  $params[] = "%$location%"; }
        if ($status)   { $sql .= ' AND (status = ? OR (? = "Found" AND (status IS NULL OR status = "")))'; $params[] = $status; $params[] = $status; }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $result = array_merge($result, $stmt->fetchAll());
    }
    // Add reporter names
    foreach ($result as &$row) {
        $row['reporter_name'] = null;
        if (!empty($row['user_id'])) {
            $u = $db->prepare('SELECT name FROM users WHERE id = ?');
            $u->execute([$row['user_id']]);
            $row['reporter_name'] = $u->fetchColumn() ?: null;
        }
    }
    respond(['items' => $result]);
}
if ($method === 'POST') {
    $itemName       = trim($body['item_name']           ?? '');
    $description    = trim($body['description']         ?? '');
    $privateDesc    = trim($body['private_description'] ?? ''); // Step 4
    $location       = trim($body['location']            ?? '');
    $dateLost       = trim($body['date_lost']           ?? '');
    $reportedBy     = (int)($body['reported_by']        ?? 0) ?: null;
    if (!$itemName || !$location || !$dateLost) {
        respond(['error' => 'Item name, location, and date are required.'], 400);
    }
    $db   = getDB();
    // Step 4: include private_description in INSERT
    $stmt = $db->prepare('INSERT INTO lost_items (item_name, description, private_description, location, date_lost, reported_by) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$itemName, $description, $privateDesc, $location, $dateLost, $reportedBy]);
    respond(['success' => true, 'message' => 'Lost item reported successfully.'], 201);
}
if ($method === 'PUT' && $id) {
    $status = $body['status'] ?? 'Lost';
    $db     = getDB();
    $db->prepare('UPDATE lost_items SET status = ? WHERE id = ?')->execute([$status, $id]);
    respond(['success' => true]);
}
if ($method === 'DELETE' && $id) {
    $db = getDB();
    $db->prepare('DELETE FROM lost_items WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}
respond(['error' => 'Method not allowed.'], 405);