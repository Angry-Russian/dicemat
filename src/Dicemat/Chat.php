<?php
namespace Dicemat;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

echo "AAAAAAAARG!";

class Chat implements MessageComponentInterface{
	public function onOpen(ConnectionInterface  $con){

	}

	public function onMessage(ConnectionInterface  $from, $msg){

	}

	public function onClose(ConnectionInterface  $con){

	}

	public function onError(ConnectionInterface  $con, \Exception $e){

	}
}