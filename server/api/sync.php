<?php
// POST /api/sync -> apply events to shared state and optionally send push on timerStop
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
$subsPath = __DIR__ . '/../data/subscriptions.json';
$state = ['kids' => [], 'pin' => '', 'runningTimers' => []];
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
$runningTimers = $state['runningTimers'] ?? [];
$triggerPushes = [];

$expireTimers = function () use (&$kids, &$runningTimers, &$triggerPushes) {
    $nowMs = (int) round(microtime(true) * 1000);
    $changed = false;
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
                    break;
                }
            }
            unset($existing);
            $triggerPushes[] = $kidId;
            unset($runningTimers[$kidId]);
            $changed = true;
        }
    }
    return $changed;
};

$stateChanged = $expireTimers();

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
                unset($runningTimers[$event['kidId']]);
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
        case 'timerStart':
            if (isset($event['kidId'], $event['startedAt'], $event['mode'])) {
                $runningTimers[$event['kidId']] = [
                    'kidId' => $event['kidId'],
                    'mode' => $event['mode'],
                    'startedAt' => $event['startedAt'],
                    'minutes' => $event['minutes'] ?? 0,
                ];
            }
            break;
        case 'timerStop':
            if (isset($event['kidId']) && isset($runningTimers[$event['kidId']])) {
                $triggerPushes[] = $event['kidId'];
                unset($runningTimers[$event['kidId']]);
            }
            break;
    }
}
unset($existing);

$stateChanged = $expireTimers() || $stateChanged;

$state = ['kids' => $kids, 'pin' => $pin, 'runningTimers' => $runningTimers];
if (!is_dir(dirname($dataPath))) {
    mkdir(dirname($dataPath), 0775, true);
}
if (!file_exists($dataPath) || $stateChanged) {
    file_put_contents($dataPath, json_encode($state));
} else {
    // still persist to record incoming events even wenn kein Auto-Stop griff
    file_put_contents($dataPath, json_encode($state));
}

// optional push on timerStop
if (!empty($triggerPushes) && file_exists($subsPath)) {
    $publicKey = getenv('MEDIENZEIT_VAPID_PUBLIC');
    $privateKey = getenv('MEDIENZEIT_VAPID_PRIVATE');
    $subject = getenv('MEDIENZEIT_VAPID_SUBJECT') ?: 'mailto:you@example.com';
    if ($publicKey && $privateKey) {
        require_once __DIR__ . '/../vendor/autoload.php';
        $subs = json_decode(file_get_contents($subsPath), true) ?: [];
        $payloads = [];
        foreach ($triggerPushes as $kidId) {
            $kidName = null;
            foreach ($kids as $k) if ($k['id'] === $kidId) { $kidName = $k['name']; break; }
            $payloads[] = json_encode([
                'title' => 'Timer',
                'body' => ($kidName ? "$kidName: " : '') . 'Timer ist abgelaufen',
                'url' => '/',
            ]);
        }
        $webPush = new Minishlink\WebPush\WebPush([
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);
        foreach ($subs as $s) {
            try {
                $subObj = Minishlink\WebPush\Subscription::create($s);
                foreach ($payloads as $p) {
                    $webPush->sendOneNotification($subObj, $p);
                }
            } catch (Exception $e) {
                // ignore
            }
        }
        foreach ($webPush->flush() as $report) {
            // optional logging
        }
    }
}

http_response_code(200);
echo json_encode(['ok' => true, 'kids' => $kids, 'runningTimers' => $runningTimers]);
