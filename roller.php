<?php


$var = json_decode(file_get_contents('php://input'));

switch ($_SERVER['REQUEST_METHOD']) {
  case 'PUT':
    echo "PUT\r\n";
    var_dump($var);
    var_dump($_REQUEST);
    //rest_put($request);  
    break;
  case 'POST':
    echo "POST\r\n";
    var_dump($var);
    var_dump($_REQUEST);
    //rest_post($request);  
    break;
  case 'GET':
    echo "GET\r\n";
    var_dump($var);
    var_dump($_REQUEST);
    //rest_get($request);  
    break;
  case 'HEAD':
    echo "HEAD\r\n";
    var_dump($var);
    var_dump($_REQUEST);
    //rest_head($request);  
    break;
  case 'DELETE':
    echo "DELETE\r\n";
    var_dump($var);
    var_dump($_REQUEST);
    //rest_delete($request);  
    break;
  case 'OPTIONS':
    echo "OPTIONS\r\n";
    var_dump($var);
    var_dump($_REQUEST);
    //rest_options($request);    
    break;
  default:
  	echo "UNSUPPORTED REQUEST [{$_SERVER['REQUEST_METHOD']}]";
    //rest_error($request);  
    break;
}
?>