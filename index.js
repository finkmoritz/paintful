const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const favicon = require('serve-favicon');
const SocketIOFileUpload = require("socketio-file-upload");
const GameModule = require('./game-module');

const uploadDir = "/tmp";

SocketIOFileUpload.listen(app);

app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname,'public','assets','favicon.ico')));
app.use(SocketIOFileUpload.router);

io.eio.pingInterval = 15000; //send ping every x ms
io.eio.pingTimeout = 300000; //ms without pong to close connection

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});
app.get('/play.html', function(req, res){
    res.sendFile(__dirname + '/play.html');
});
app.get('/howtoplay.html', function(req, res){
    res.sendFile(__dirname + '/howtoplay.html');
});
app.get('/contribute.html', function(req, res){
    res.sendFile(__dirname + '/contribute.html');
});
app.get('/about.html', function(req, res){
    res.sendFile(__dirname + '/about.html');
});
app.get('/download', function(req, res){
    let file = req.query.painting;
    if(file !== undefined) {
        res.download(uploadDir+'/'+file);
    }
});

io.on('connection', function(socket){
    const uploader = new SocketIOFileUpload();
    uploader.listen(socket);
    uploader.dir = uploadDir;

    uploader.on("start", function (e) {
        console.log('Upload started: '+JSON.stringify(e.file));
    });

    uploader.on("saved", function (e) {
        try {
            console.log('Upload saved: '+JSON.stringify(e.file));
            GameModule.setPainting(socket.id, e.file.name);
            let game = GameModule.getGame(socket.id);
            if(GameModule.allPaintingsSubmitted(game)) {
                game = GameModule.nextRound(game);
                console.log('emit to '+game.id+': update game '+JSON.stringify(game));
                io.in(game.id).emit('update game', game);
            } else {
                console.log('emit to '+socket.id+': update game '+JSON.stringify(game));
                io.to(socket.id).emit('update game', game);
            }
        } catch(e) {
            GameModule.handleError(e, socket, io);
        }
    });

    socket.on('new game', function(username) {
        try {
            console.log('new game '+username);
            username = username.trim();
            if(!GameModule.usernameIsValid(io, socket, username)) {
                return;
            }
            const game = GameModule.newGame(socket.id, username);
            socket.join(game.id);
            console.log('emit to '+game.id+': update game '+JSON.stringify(game));
            io.in(game.id).emit('update game', game);
        } catch(e) {
            GameModule.handleError(e, socket, io);
        }
    });

    socket.on('join game', function(data) {
        try {
            let gameId = parseInt(data.gameId);
            let username = data.username.trim();
            console.log('join game '+username+', '+gameId);
            if(!GameModule.gameIdIsValid(io,socket,gameId) || !GameModule.usernameIsValid(io,socket,username)) {
                return;
            }
            const game = GameModule.joinGame(socket.id, username, gameId);
            socket.join(game.id);
            console.log('emit to '+game.id+': update game '+JSON.stringify(game));
            io.in(game.id).emit('update game', game);
        } catch(e) {
            GameModule.handleError(e, socket, io);
        }
    });

    socket.on('validate gameId', function(gameId) {
        try {
            console.log('validate gameId '+gameId);
            if(GameModule.gameIdIsValid(io,socket,gameId)) {
                io.to(socket.id).emit('redirect', '/play.html?gameId='+gameId);
            }
        } catch(e) {
            GameModule.handleError(e, socket, io);
        }
    });

    socket.on('start game', function () {
        try {
            console.log('start game');
            if(GameModule.getGame(socket.id).players.length < 3) {
                io.to(socket.id).emit('error', 'At least three players need to join a game before it can be started');
            } else {
                const game = GameModule.startGame(socket.id);
                console.log('emit to '+game.id+': update game '+JSON.stringify(game));
                io.in(game.id).emit('update game', game);
            }
        } catch(e) {
            GameModule.handleError(e, socket, io);
        }
    });

    socket.on('guess', function (guess) {
        try {
            console.log('guess: '+guess);
            guess = guess.trim();
            if(!GameModule.guessIsValid(io, socket, guess)) {
                return;
            }
            GameModule.setGuess(socket.id, guess);
            let game = GameModule.getGame(socket.id);
            if(GameModule.allGuessesSubmitted(game)) {
                game = GameModule.showChoices(game);
                console.log('emit to '+game.id+': update game '+JSON.stringify(game));
                io.in(game.id).emit('update game', game);
            } else {
                console.log('emit to '+socket.id+': update game '+JSON.stringify(game));
                io.to(socket.id).emit('update game', game);
            }
        } catch(e) {
            GameModule.handleError(e, socket, io);
        }
    });

    socket.on('choice', function (choice) {
        try {
            console.log('choice: '+choice);
            GameModule.setChoice(socket.id, choice);
            let game = GameModule.getGame(socket.id);
            if(GameModule.allChoicesSubmitted(game)) {
                game = GameModule.evaluateRound(game);
                console.log('emit to '+game.id+': update game '+JSON.stringify(game));
                io.in(game.id).emit('update game', game);
            } else {
                console.log('emit to '+socket.id+': update game '+JSON.stringify(game));
                io.to(socket.id).emit('update game', game);
            }
        } catch(e) {
            GameModule.handleError(e, socket, io);
        }
    });

    socket.on('next round', function () {
        try {
            console.log('next round');
            let game = GameModule.getGame(socket.id);
            game = GameModule.nextRound(game);
            console.log('emit to '+game.id+': update game '+JSON.stringify(game));
            io.in(game.id).emit('update game', game);
        } catch(e) {
            GameModule.handleError(e, socket, io);
        }
    });

    socket.on('disconnect', function() {
        console.log('Socket with ID '+socket.id+' disconnected');
    });
});

server.listen(3000, function(){
    console.log('listening on *:3000');
});
