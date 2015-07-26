var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bp = require('body-parser');
var port = 2500;

app.set('views', __dirname + '/views');
app.set('viev_engine', 'ejs');

app.get('/', function(req, res){
	res.sendfile('assets/index.html');
});
app.use(express.static(__dirname + '/assets'));

var names = {}, // socket.id : name
	clients = {}; // name : socket.id

io.on('connection', function(socket){

	socket.emit('self', socket.id);

	socket.on('roll', function(data){
		data.id = socket.id;
		data.name = names[socket.id];
		for(var i in socket.rooms){
			socket.broadcast.to(socket.rooms[i]).emit('roll', data);
		}
	});

	socket.on('identify', function(name){
		console.log('identifying', socket.id, 'as', name);
		if(clients[name] || name === 'Anonymous')
			socket.emit('err', 'That name is already taken.');
		else{
			// name change, clear the old using uid, then set the new
			clients[names[socket.id]] = undefined;
			clients[name] = socket.id;
			names[socket.id] = name;

			// notify party members of change
			for(var i in socket.rooms){
				socket.broadcast.to(socket.rooms[i]).emit('rename', {
					id:socket.id,
					name:name
				});
			}
		}
	});

	socket.on('join', function(room){
		console.log('Adding', socket.id, 'to room', room);

		// leave prior rooms
		for(var i in socket.rooms){
			var r = socket.rooms[i];
			if(r != socket.id){
				socket.broadcast.to(r).emit('leave', socket.id);
				socket.leave(r);
			}
		}

		// TODO:get Member List
		var roomInfo = io.sockets.adapter.rooms[room] || {};
		var memberList = Object.keys(roomInfo);
		var memberInfo = {};
		for(var i in memberList){
			var id = memberList[i];
			memberInfo[id] = names[id] || "Anonymous";
		}

		console.log(memberInfo);
		socket.join(room);
		// tell members that a new member has joined
		socket.broadcast.to(room).emit('join', {
			id:socket.id, name:names[socket.id]
		});
		socket.emit('memberlist', memberInfo);
	});

	socket.on('leave', function(id){
		socket.leave(id);
		socket.to(id).emit('leave', socket.id);
	});

	socket.on('disconnect', function(s){
		clients[names[socket.id]] =	names[socket.id] = undefined;
		io.to(socket.id).emit('quit', socket.id)
		for(var room in socket.rooms){
			io.to(socket.rooms[room]).emit('leave', socket.id);
		}
		console.log('disconnect ('+socket.id+'), leaving from', socket.rooms);
	});
});

http.listen(port, function(){
	console.log('Listening on port', port);
});
