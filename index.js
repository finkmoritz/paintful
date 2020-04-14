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
        let game = getGame(socket.id);
        console.log('emit to '+socket.id+': update game '+JSON.stringify(game));
        io.to(socket.id).emit('update game', game);
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
    constructor(socketId, username, color) {
        this.socketId = socketId;
        this.username = username;
        this.color = color;
        this.currentScreen = 'screenPlayers';
        this.painting = undefined;
        this.score = 0;
        this.waitText = '';
    }
}

class Game {
    constructor(id, players) {
        this.id = id;
        this.players = players;
        this.started = false;
    }
}

let maxGameId = 0;
const games = new Map();
const socketIdToGameKey = new Map();
const uploadDir = "/tmp";
const colors = ['blue', 'red', 'green', 'yellow'];

function getGame(socketId) {
    let gameKey = socketIdToGameKey.get(socketId);
    console.log('getGame('+socketId+'): '+JSON.stringify(socketIdToGameKey));
    console.log('games:');
    logMap(games);
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
    players.push(new Player(socketId, username, colors[0]));
    const game = new Game(maxGameId, players);
    games.set(++maxGameId, game);
    socketIdToGameKey.set(socketId, maxGameId);
    return game;
}

function joinGame(socketId, username, gameId) {
    socketIdToGameKey.set(socketId, gameId);
    const game = getGame(socketId);
    const nPlayers = game.players.length;
    game.players.push(new Player(socketId, username, colors[nPlayers]));
    return game;
}

function startGame(socketId) {
    const game = getGame(socketId);
    game.started = true;
    for(let p of game.players) {
        p.currentScreen = 'screenDraw';
    }
    return game;
}

function setPainting(socketId, pathToFile) {
    const player = getPlayer(socketId);
    player.painting = pathToFile;
    player.currentScreen = 'screenWait';
    player.waitText = 'Waiting for the other players to finish their painting...';
}

function logMap(map) {
    for(let k of map.keys()) {
        console.log(k+' -> '+JSON.stringify(map.get(k)));
    }
}