<?php
namespace Dicemat;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface{

	protected $clients;
	protected $broacasters;

	public function __construct(){
		$this->clients = new \SplObjectStorage;
		$this->broacasters = array();
	}

	public function onOpen(ConnectionInterface  $con){
		$this->clients->attach($con);
		$this->broacasters[$con->resourceId] = array("name"=>"", "clients"=>array());
		echo "New connection! ({$con->resourceId})\n";
	}

	public function onMessage(ConnectionInterface  $from, $msg){

		$req = json_decode($msg);
		$sender = $this->broacasters[$from->resourceId]['name'];

		switch($req->type){
			case "roll":
				echo "\"{$sender}\" is rolling:".PHP_EOL;
				var_dump($req);
				foreach($this->broacasters[$from->resourceId]['clients'] as $cli){
					if($cli!==$from) $cli->send($msg);
				}
			break;
			case "identify":
				$this->broacasters[$from->resourceId]["name"] = $req->id;
			break;
			case "connect":
				echo "$sender attempting to connect to ";
				foreach($this->clients as $cli){
					if($this->broacasters[$cli->resourceId]['name'] === $req->id){
						echo $this->broacasters[$cli->resourceId]['name'];
						array_push($this->broacasters[$cli->resourceId]['clients'], $from);
					}
				}
				echo PHP_EOL;
			break;
			case "remove": break;
			default:  break;
		}
	}

	public function onClose(ConnectionInterface  $con){
        $this->clients->detach($con);
        echo "Connection {$con->resourceId} has disconnected\n";
	}

	public function onError(ConnectionInterface  $con, \Exception $e){
        echo "An error has occurred: {$e->getMessage()}\n";
        $con->close();
	}
}