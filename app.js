var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bp = require('body-parser');
var port = 2500;

console.log('Setting settings');
app.set('views', __dirname + '/views');
app.set('viev_engine', 'ejs');

app.use(bp.urlencoded());
app.get('/', function(req, res){
	console.log('From', process.cwd(), 'looking for assets/index.html');
	res.sendfile('index.html', {root: __dirname + "/assets"});
});
app.use(express.static(__dirname + '/assets'));

var names = {}, // socket.id : name
	clients = {}; // name : socket.id


io.on('connection', function(socket){

        socket.on('roll', function(data){
        	data.id = socket.id;
        	data.name = names[socket.id];
        	socket.broadcast.to(socket.id).emit('roll', data);
        });

        socket.on('identify', function(name){
        	console.log('Identifying %s as %s', socket.id, name);
			if(clients[name] || name === 'Anonymous')
        		socket.emit('e', 'That name is already taken.');
        	else{
        		clients[names[socket.id]] = undefined;
        		names[socket.id] = name;
        		clients[name] = socket.id;
	        	socket.broadcast.to(socket.id).emit('rename', {
	        		id:socket.id,
	        		name:name
	        	});
	        }
        });

        socket.on('join', function(name){
        	if(clients[name]){
        		socket.join(clients[name]);
        		socket.emit('confirm', {id: clients[name], name:name});
        		socket.to(clients[name]).emit('join', {
        			id:socket.id, name:names[socket.id]
        		})

        	}
        });

        socket.on('leave', function(id){
        	socket.leave(id);
        	socket.to(id).emit('leave', socket.id);
        });

        socket.on('disconnect', function(s){
        	clients[names[socket.id]] =  names[socket.id] = undefined;
        	io.to(socket.id).emit('quit', socket.id)
        	for(var room in socket.rooms){
        		io.to(socket.rooms[room]).emit('quit', socket.id);
        	}
        	console.log('disconnect ('+socket.id+'), leaving from', socket.rooms);
        });
});

http.listen(port, function(){
	console.log('Listening on port', port);
	console.log('Running in', process.cwd());
});
