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
    $state = ['kids' => [], 'pin' => '', 'runningTimers' => [], 'revision' => 0];
} else {
    if (!array_key_exists('runningTimers', $state)) $state['runningTimers'] = [];
    if (!array_key_exists('revision', $state)) $state['revision'] = 0;
}

$kids = $state['kids'] ?? [];
$runningTimers = $state['runningTimers'] ?? [];
$revision = isset($state['revision']) ? (int)$state['revision'] : 0;
$changed = false;
$nowMs = (int) round(microtime(true) * 1000);

foreach ($kids as &$kid) {
    if (!isset($kid['logs']) || !is_array($kid['logs'])) {
        $kid['logs'] = [];
    }
}
unset($kid);

foreach ($kids as &$kid) {
    if (!isset($kid['logs']) || !is_array($kid['logs'])) {
        $kid['logs'] = [];
    }
}
unset($kid);

foreach ($runningTimers as $kidId => $timer) {
    $mode = $timer['mode'] ?? 'timer';
    if ($mode !== 'timer') continue;
    $startedAt = isset($timer['startedAt']) ? (int) $timer['startedAt'] : null;
    $minutes = isset($timer['minutes']) ? (int) $timer['minutes'] : null;
    if ($startedAt === null || $minutes === null) continue;
    $durationMs = max(0, $minutes) * 60 * 1000;
    if ($durationMs === 0) continue;
    if ($nowMs - $startedAt >= $durationMs) {
        foreach ($kids as &$existing) {
            if (isset($existing['id']) && $existing['id'] === $kidId) {
                $existing['mediaUsed'] = max(0, ($existing['mediaUsed'] ?? 0) + $minutes);
                if (!isset($existing['logs']) || !is_array($existing['logs'])) $existing['logs'] = [];
                $existing['logs'][] = ['type' => 'timer', 'minutes' => $minutes, 'timestamp' => $nowMs];
                break;
            }
        }
        unset($existing);
        unset($runningTimers[$kidId]);
        $changed = true;
    }
}

$state = ['kids' => $kids, 'pin' => $state['pin'] ?? '', 'runningTimers' => $runningTimers, 'revision' => $revision];
if ($changed) {
    $state['revision'] = $revision + 1;
    file_put_contents($dataPath, json_encode($state));
}

echo json_encode($state);
