<?php
// POST /api/subscribe -> speichert Push-Subscription im Filesystem (server/data/subscriptions.json)
header('Content-Type: application/json');

$apiKey = getenv('MEDIENZEIT_API_KEY');
if ($apiKey) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(.*)/i', $auth, $m) || trim($m[1]) !== $apiKey) {
        http_response_code(401);
        echo json_encode(['error' => 'unauthorized']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = file_get_contents('php://input');
$payload = json_decode($body, true);
if (!is_array($payload) || !isset($payload['subscription'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

$dataPath = __DIR__ . '/../data/subscriptions.json';
$subs = [];
if (file_exists($dataPath)) {
    $json = file_get_contents($dataPath);
    if ($json !== false) {
        $decoded = json_decode($json, true);
        if (is_array($decoded)) {
            $subs = $decoded;
        }
    }
}

$incoming = $payload['subscription'];
$endpoint = $incoming['endpoint'] ?? '';
if ($endpoint) {
    $subs = array_values(array_filter($subs, fn($s) => ($s['endpoint'] ?? '') !== $endpoint));
    $subs[] = $incoming;
}

if (!is_dir(dirname($dataPath))) {
    mkdir(dirname($dataPath), 0775, true);
}
file_put_contents($dataPath, json_encode($subs));

echo json_encode(['ok' => true, 'count' => count($subs)]);
