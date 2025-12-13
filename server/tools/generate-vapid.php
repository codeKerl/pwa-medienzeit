<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Minishlink\WebPush\VAPID;

$keys = VAPID::createVapidKeys();

echo "PUBLIC={$keys['publicKey']}\n";
echo "PRIVATE={$keys['privateKey']}\n";
