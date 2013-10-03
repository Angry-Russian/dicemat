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
		echo "New connection! ({$con->resourceId})\n";
	}

	public function onMessage(ConnectionInterface  $from, $msg){

		$req = json_decode($msg);
		$sender = $this->broadcasters[$from->resourceId]['name'];

		switch($req->type){
			case "roll":
				//echo "\"{$sender}\" is rolling:".PHP_EOL;
				//var_dump($req);
				foreach($this->broadcasters[$from->resourceId]['clients'] as $cli){
					if($cli!==$from) $cli->send($msg);
				}
			break;
			case "identify":
				$this->broadcasters[$from->resourceId]["name"] = $req->id;
			break;
			case "connect":
				echo "$sender attempting to connect to ";
				foreach($this->clients as $cli){
					if($this->broadcasters[$cli->resourceId]['name'] === $req->name){
						echo $this->broadcasters[$cli->resourceId]['name'];
						array_push($this->broadcasters[$cli->resourceId]['clients'], $from);
						$cli->send('{"type":"connect", "id":'.$from->resourceId.', "name":"'.$this->broadcasters[$from->resourceId]['name'] .'", "avatar":""}');
					}
				}
				echo PHP_EOL;
			break;
			case "remove": break;
			default:  break;
		}
	}

	public function onClose(ConnectionInterface  $con){

		foreach($this->clients as $cli){
			if(($ind = array_search($con, $this->broadcasters[$cli->resourceId]['clients'])) !== false && $cli !== $con){
				$cli->send('{"type":"leave", "id":'.$con->resourceId.'}');
				echo "sending Guest Disconnected signal to ".$cli->resourceId.PHP_EOL;
			}
		}

		foreach($this->broadcasters[$con->resourceId]['clients'] as $cli){
			if($cli!==$con){
				$cli->send('{"type":"quit", "id":'.$con->resourceId.'}');
				echo "sending Host Disconnected signal to ".$cli->resourceId.PHP_EOL;
			}
		}

        $this->clients->detach($con);
        echo "Connection {$con->resourceId} has disconnected\n";
	}

	public function onError(ConnectionInterface  $con, \Exception $e){
        echo "An error has occurred: {$e->getMessage()}\n";
        $con->close();
	}
}