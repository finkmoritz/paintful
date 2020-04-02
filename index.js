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
    socket.on('new game', function(username) {
        console.log('new game '+username);
        let gameId = newGame(socket.id, username);
        socket.join(gameId);
        console.log('emit to '+gameId+': update game '+JSON.stringify(games.get(gameId)));
        io.in(gameId).emit('update game', games.get(gameId));
    });
    socket.on('join game', function(data) {
        let gameId = parseInt(data.gameId);
        console.log('join game '+data.username+', '+gameId);
        joinGame(socket.id, data.username, gameId);
        socket.join(gameId);
        console.log('emit to '+gameId+': update game '+JSON.stringify(games.get(gameId)));
        io.in(gameId).emit('update game', games.get(gameId));
    });
});

server.listen(3000, function(){
    console.log('listening on *:3000');
});

class Player {
    constructor(socketId, username) {
        this.socketId = socketId;
        this.username = username;
    }
}

class Game {
    constructor(id, players, currentScreen) {
        this.id = id;
        this.players = players;
        this.currentScreen = currentScreen;
    }
}

let maxGameId = 0;
const games = new Map();
const socketIdToGameKey = new Map();

function getGame(socketId) {
    let gameKey = socketIdToGameKey.get(socketId);
    return games.get(gameKey);
}

function newGame(socketId, username) {
    const players = [];
    players.push(createPlayer(socketId, username));
    games.set(++maxGameId, new Game(maxGameId, players, 'screenPlayers'));
    socketIdToGameKey.set(socketId, maxGameId);
    return maxGameId;
}

function joinGame(socketId, username, gameId) {
    socketIdToGameKey.set(socketId, gameId);
    getGame(socketId).players.push(createPlayer(socketId, username));
}

function createPlayer(socketId, username) {
    return new Player(socketId, username);
}