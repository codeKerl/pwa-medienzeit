<?php
// POST /api/sync -> apply events to shared state
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
if (!is_array($payload) || !isset($payload['events']) || !is_array($payload['events'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

$dataPath = __DIR__ . '/../data/state.json';
$state = ['kids' => [], 'pin' => ''];
if (file_exists($dataPath)) {
    $json = file_get_contents($dataPath);
    if ($json !== false) {
        $decoded = json_decode($json, true);
        if (is_array($decoded)) {
            $state = array_merge($state, $decoded);
        }
    }
}

$kids = $state['kids'];
$pin = $state['pin'];

foreach ($payload['events'] as $event) {
    if (!is_array($event) || !isset($event['type'])) continue;
    switch ($event['type']) {
        case 'addKid':
            if (isset($event['kid']) && is_array($event['kid'])) {
                $kid = $event['kid'];
                $found = false;
                foreach ($kids as &$existing) {
                    if ($existing['id'] === $kid['id']) { $existing = $kid; $found = true; break; }
                }
                if (!$found) { $kids[] = $kid; }
            }
            break;
        case 'deleteKid':
            if (isset($event['kidId'])) {
                $kids = array_values(array_filter($kids, fn($k) => $k['id'] !== $event['kidId']));
            }
            break;
        case 'updateKid':
            if (isset($event['kidId'], $event['kid'])) {
                foreach ($kids as &$existing) {
                    if ($existing['id'] === $event['kidId']) {
                        $existing = array_merge($existing, $event['kid']);
                        break;
                    }
                }
            }
            break;
        case 'logMedia':
            if (isset($event['kidId'], $event['minutes'])) {
                foreach ($kids as &$existing) {
                    if ($existing['id'] === $event['kidId']) {
                        $existing['mediaUsed'] = max(0, ($existing['mediaUsed'] ?? 0) + $event['minutes']);
                        break;
                    }
                }
            }
            break;
        case 'logReading':
            if (isset($event['kidId'], $event['minutes'])) {
                foreach ($kids as &$existing) {
                    if ($existing['id'] === $event['kidId']) {
                        $existing['readingLogged'] = max(0, ($existing['readingLogged'] ?? 0) + $event['minutes']);
                        break;
                    }
                }
            }
            break;
        case 'resetWeek':
            if (isset($event['kidId'])) {
                foreach ($kids as &$existing) {
                    if ($existing['id'] === $event['kidId']) {
                        $existing['mediaUsed'] = 0; $existing['readingLogged'] = 0; break;
                    }
                }
            } else {
                foreach ($kids as &$existing) { $existing['mediaUsed'] = 0; $existing['readingLogged'] = 0; }
            }
            break;
    }
}
unset($existing);

$state = ['kids' => $kids, 'pin' => $pin];
if (!is_dir(dirname($dataPath))) {
    mkdir(dirname($dataPath), 0775, true);
}
file_put_contents($dataPath, json_encode($state));

http_response_code(200);
echo json_encode(['ok' => true, 'kids' => $kids]);
