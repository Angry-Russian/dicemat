<?php
namespace Dicemat;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface{

	protected $clients;

	public function __construct(){
		$this->clients = new \SplObjectStorage;
	}

	public function onOpen(ConnectionInterface  $con){
		$this->clients->attach($con);
		echo "New connection! ({$con->resourceId})\n";
	}

	public function onMessage(ConnectionInterface  $from, $msg){
		echo sprintf("Connection %d sending message %s\n", $from->resourceId, $msg);
		foreach($this->clients as $cli){
			if($cli !== $from) $cli->send($msg);
		}
	}

	public function onClose(ConnectionInterface  $con){
        $this->clients->detach($con);
        echo "Connection {$conn->resourceId} has disconnected\n";
	}

	public function onError(ConnectionInterface  $con, \Exception $e){
        echo "An error has occurred: {$e->getMessage()}\n";
        $con->close();
	}
}