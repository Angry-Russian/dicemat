<?php
namespace Dicemat;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface{

	protected $clients;
	protected $referals;

	public function __construct(){
		$this->clients = new \SplObjectStorage;
	}

	public function onOpen(ConnectionInterface  $con){
		$this->clients->attach($con);
		echo "New connection! ({$con->resourceId})\n";
	}

	public function onMessage(ConnectionInterface  $from, $msg){
		echo sprintf("Connection %d sending message %s\n", $from->resourceId, $msg);

		$req = json_decode($msg);

		/*switch($req->type){
			case "roll": break;
			case "identify": $referals[$req->id] = array($from); break;
			case "connect":
				foreach($req->clients as $ref){
					$ex = in_array($from, $referals[$ref]);
					if($referals[$ref] && !$ex) array_push($referals[$ref], $from);
					else if($ex) echo sprintf("connection %d already exists in $ref", $from->resourceId);
					else echo sprintf("%d -> %d : requested connection doesn't exist", $from->resourceId, $ref);
				}
				break;
			case "remove": break;
			default:  break;
		}//*/

		var_dump($from);
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