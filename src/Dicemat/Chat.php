<?php
namespace Dicemat;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface{

	protected $clients;
	protected $broadcasters;

	public function __construct(){
		$this->clients = new \SplObjectStorage;
		$this->broadcasters = array();
	}

	public function onOpen(ConnectionInterface  $con){
		$this->clients->attach($con);
		$this->broadcasters[$con->resourceId] = array("name"=>"", "clients"=>array());
		//echo "New connection! ({$con->resourceId})\n";
	}

	public function onMessage(ConnectionInterface  $from, $msg){

		$req = json_decode($msg);
		$sender = $this->broadcasters[$from->resourceId]['name']?:"Anonymous";

		switch($req->type){
			case "roll":
				//echo "\"{$sender}\" is rolling:".PHP_EOL;
				//var_dump($req);
				//var_dump(json_encode($req));
				$req->name = $this->broadcasters[$from->resourceId]['name'];
				$req->id = $from->resourceId;
				foreach($this->broadcasters[$from->resourceId]['clients'] as $cli){
					if($cli!==$from) $cli->send(json_encode($req));
				}
			break;
			case "identify":
				$this->broadcasters[$from->resourceId]["name"] = $req->name;
				foreach($this->broadcasters[$from->resourceId]["clients"] as $cli){
					$cli->send('{"type":"rename", "id":'.$from->resourceId.', "name":"'.$req->name.'"}');
				};

			break;
			case "connect":
				//echo "$sender ({$from->resourceId}) attempting to connect to ";
				$success = false;
				$client = null;
				if($req->name){
					foreach($this->clients as $cli){
						if($this->broadcasters[$cli->resourceId]['name'] === $req->name && !in_array($from, $this->broadcasters[$cli->resourceId]['clients'])){
							//echo $this->broadcasters[$cli->resourceId]['name']. "(".$cli->resourceId.")";
							array_push($this->broadcasters[$cli->resourceId]['clients'], $from);
							$success = $cli->send('{"type":"connect", "id":'.$from->resourceId.', "name":"'.$sender.'", "avatar":""}');
							$client = $cli->resourceId;
						}
					}
					if($success && $client !== null){
						$from->send('{"type":"confirm", "id":'. $client .', "name":"'. ($this->broadcasters[$client]['name']?:"Anonymous") .'"}');
					}
				}else{

				}
				//echo PHP_EOL;
			break;
			case "remove": break;
			default:  break;
		}
	}

	public function onClose(ConnectionInterface  $con){

		$sender = $this->broadcasters[$con->resourceId]['name']?:"Anonymous";

		foreach($this->clients as $cli){
			if(($ind = array_search($con, $this->broadcasters[$cli->resourceId]['clients'])) !== false && $cli !== $con){
				$cli->send('{"type":"leave", "id":'.$con->resourceId.', "name":"'.$sender.'"}');
				//echo "sending Guest Disconnected signal to ".$cli->resourceId.PHP_EOL;
			}
		}

		foreach($this->broadcasters[$con->resourceId]['clients'] as $cli){
			if($cli!==$con){
				$cli->send('{"type":"quit", "id":'.$con->resourceId.', "name":"'.$sender.'"}');
				//echo "sending Host Disconnected signal to ".$cli->resourceId.PHP_EOL;
			}
		}

        $this->clients->detach($con);
        //echo "Connection {$con->resourceId} has disconnected\n";
	}

	public function onError(ConnectionInterface  $con, \Exception $e){
        //echo "An error has occurred: {$e->getMessage()}\n";
        $con->close();
	}
}