const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});
app.get('/play.html', function(req, res){
    res.sendFile(__dirname + '/play.html');
});
app.get('/about.html', function(req, res){
    res.sendFile(__dirname + '/about.html');
});

io.on('connection', function(socket){
    socket.on('new player', function(username){
        io.emit('show', 'screenPlayers');
        io.emit('add player', username);
    });
});

server.listen(3000, function(){
    console.log('listening on *:3000');
});