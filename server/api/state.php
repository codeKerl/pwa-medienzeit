<?php
// GET /api/state -> returns current shared state
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

$dataPath = __DIR__ . '/../data/state.json';
if (!file_exists($dataPath)) {
    http_response_code(200);
    echo json_encode(['kids' => [], 'pin' => '']);
    exit;
}

$json = file_get_contents($dataPath);
if ($json === false) {
    http_response_code(500);
    echo json_encode(['kids' => [], 'pin' => '', 'error' => 'could not read state']);
    exit;
}

$state = json_decode($json, true);
if (!is_array($state)) {
    $state = ['kids' => [], 'pin' => '', 'runningTimers' => []];
} else if (!array_key_exists('runningTimers', $state)) {
    $state['runningTimers'] = [];
}
echo json_encode($state);
