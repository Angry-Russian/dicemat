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

		$req = json_decode($msg);
		$sender = $this->clients[$from];

		switch($req->type){
			case "roll":
				foreach($this->referals[$sender] as $k=>$cli){
					if($cli!==$from) $cli->send($msg);
				}
			break;
			case "identify":
				$oldID = $this->clients[$from];
				$newID = $req->id;

				if($oldID !== $newID){
					$this->referals[$newID] = $this->referals[$oldID]?:array($from);
					$this->clients[$from] = $newID;
					unset($this->referals[$oldID]);
				}
				break;

			case "connect":
				foreach($req->clents as $c){
					array_push($this->referals[$c], $from);
				}
				break;
			case "remove":
				foreach($req->clients as $cli){
					if(($k = array_search($from, $this->referals[$cli]))!== false){
						unset($this->referals[$cli][$k]);
					}
				}
				break;
			default:  break;
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