<?php
use Ratchet\Server\IoServer;
use Dicemat\Chat;

    require dirname(__DIR__) . '/vendor/autoload.php';
    echo "Arg?";
    $server = IoServer::factory(
        new Chat(),
        8080
    );

    $server->run();