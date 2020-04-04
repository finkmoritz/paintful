const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const SocketIOFileUpload = require("socketio-file-upload");
SocketIOFileUpload.listen(app);

app.use(express.static(path.join(__dirname, 'public')));
app.use(SocketIOFileUpload.router);

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
    const uploader = new SocketIOFileUpload();
    uploader.listen(socket);
    uploader.dir = uploadDir;

    uploader.on("start", function (e) {
        console.log('Upload started: '+JSON.stringify(e.file));
    });

    uploader.on("saved", function (e) {
        console.log('Upload saved: '+JSON.stringify(e.file));
        setPainting(socket.id, e.file.path);
        console.log('emit to '+socket.id+': upload success');
        io.to(socket.id).emit('upload success');
    });

    socket.on('new game', function(username) {
        console.log('new game '+username);
        const game = newGame(socket.id, username);
        socket.join(game.id);
        console.log('emit to '+game.id+': update game '+JSON.stringify(game));
        io.in(game.id).emit('update game', game);
    });

    socket.on('join game', function(data) {
        let gameId = parseInt(data.gameId);
        console.log('join game '+data.username+', '+gameId);
        const game = joinGame(socket.id, data.username, gameId);
        socket.join(game.id);
        console.log('emit to '+game.id+': update game '+JSON.stringify(game));
        io.in(game.id).emit('update game', game);
    });

    socket.on('start game', function () {
        console.log('start game');
        const game = startGame(socket.id);
        console.log('emit to '+game.id+': update game '+JSON.stringify(game));
        io.in(game.id).emit('update game', game);
    });
});

server.listen(3000, function(){
    console.log('listening on *:3000');
});

class Player {
    constructor(socketId, username) {
        this.socketId = socketId;
        this.username = username;
        this.painting = undefined;
    }
}

class Game {
    constructor(id, players) {
        this.id = id;
        this.players = players;
        this.currentScreen = 'screenPlayers';
        this.started = false;
    }
}

let maxGameId = 0;
const games = new Map();
const socketIdToGameKey = new Map();
const uploadDir = "/tmp";

function getGame(socketId) {
    let gameKey = socketIdToGameKey.get(socketId);
    return games.get(gameKey);
}

function getPlayer(socketId) {
    const game = getGame(socketId);
    for(let player of game.players) {
        if(player.socketId === socketId) {
            return player;
        }
    }
    return undefined;
}

function newGame(socketId, username) {
    const players = [];
    players.push(createPlayer(socketId, username));
    const game = new Game(maxGameId, players);
    games.set(++maxGameId, game);
    socketIdToGameKey.set(socketId, maxGameId);
    return game;
}

function joinGame(socketId, username, gameId) {
    socketIdToGameKey.set(socketId, gameId);
    const game = getGame(socketId);
    game.players.push(createPlayer(socketId, username));
    return game;
}

function createPlayer(socketId, username) {
    return new Player(socketId, username);
}

function startGame(socketId) {
    const game = getGame(socketId);
    game.started = true;
    game.currentScreen = 'screenDraw';
    return game;
}

function setPainting(socketId, pathToFile) {
    const player = getPlayer(socketId);
    player.painting = pathToFile;
}