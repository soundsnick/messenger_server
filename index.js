var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('ajax-request');

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

var connectedUsers = {};
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

app.use(express.static('assets'));
io.on('connection', function(socket){

	var user = {};
	var use_token = "";
	socket.on('auth', function(token){

		

		request({
		  url: "http://localhost:3000/api/userByToken?token="+token,
		  method: 'GET',
		}, function(err, res, body) {
			if(res){
				body = JSON.parse(body);
				user = body.body;
				use_token = token;
				connectedUsers[body.body.username] = socket;
				io.emit('user connected', {username: body.body.username});
				io.to(socket.id).emit('connected users', Object.keys(connectedUsers));
			}
		});
	});	

	socket.on('disconnect', function(){
		delete connectedUsers[user.username];
		io.emit('user disconnected', {username: user.username});
	});

	socket.on('chat message', function(msg){
		request({
		  url: "http://localhost:3000/api/userById?id="+msg.user_id,
		  method: 'GET',
		}, function(err, res, body) {
			if(res){
				body = JSON.parse(body);
				sender = body.body;			
				request({
				  url: "http://localhost:3000/api/userById?id="+msg.pid,
				  method: 'GET',
				}, function(err, res, body) {
					if(res){
						body = JSON.parse(body);
						receiver = body.body;
						request({
						  url: `http://localhost:3000/api/message/send?token=${use_token}&user_id=${sender.id}&pid=${receiver.id}&text=${msg.text}`,
						  method: 'GET',
						}, function(err, res, body) {
							if(res){
								body = JSON.parse(body);
								if(body.message == "success" && connectedUsers[receiver.username]){
									io.to(connectedUsers[receiver.username].id).emit('chat message', {user: {username: sender.username}, user_id: sender.id, pid: receiver.id, text: msg.text});
								}
							}
						});
					}
				});
			}
		});
	});
});


http.listen(3001, function(){
	console.log('listening on *:3001');
});