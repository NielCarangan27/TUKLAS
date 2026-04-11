<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$db     = getDB();

if ($method === 'GET') {
    $rows = $db->query('SELECT * FROM items ORDER BY created_at DESC')->fetchAll();
    respond(['items' => $rows]);
}

if ($method === 'POST') {
    $itemName    = trim($body['item_name'] ?? '');
    $description = trim($body['description'] ?? '');
    $imageUrl    = trim($body['image_url'] ?? '');
    $location    = trim($body['location'] ?? '');
    $dateFound   = trim($body['date_found'] ?? '');
    $adminId     = (int)($body['registered_by'] ?? 0);

    if (!$itemName || !$location) {
        respond(['error' => 'Item name and location are required.'], 400);
    }

    $stmt = $db->prepare(
        'INSERT INTO items (item_name, description, image_url, location, date_found) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$itemName, $description, $imageUrl, $location, $dateFound ?: null]);
    $newId = $db->lastInsertId();

    if ($adminId) {
        $db->prepare('INSERT INTO activity_logs (performed_by, action) VALUES (?, ?)')
           ->execute([$adminId, "Registered item: $itemName"]);
    }

    $item = $db->prepare('SELECT * FROM items WHERE id = ?');
    $item->execute([$newId]);
    respond(['success' => true, 'item' => $item->fetch()], 201);
}

if ($method === 'PUT' && $id) {
    $itemName  = trim($body['item_name'] ?? '');
    $location  = trim($body['location'] ?? '');
    $status    = $body['status'] ?? 'Available';

    $db->prepare('UPDATE items SET item_name=?, location=?, status=? WHERE id=?')
       ->execute([$itemName, $location, $status, $id]);
    respond(['success' => true]);
}

if ($method === 'DELETE' && $id) {
    $db->prepare('DELETE FROM items WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed.'], 405);