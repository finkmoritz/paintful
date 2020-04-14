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
        console.log('Upload saved: '+JSON.stringify(e.file));
        setPainting(socket.id, e.file.name);
        let game = getGame(socket.id);
        if(allPaintingsSubmitted(game)) {
            game = nextRound(game);
            console.log('emit to '+game.id+': update game '+JSON.stringify(game));
            io.in(game.id).emit('update game', game);
        } else {
            console.log('emit to '+socket.id+': update game '+JSON.stringify(game));
            io.to(socket.id).emit('update game', game);
        }
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

    socket.on('guess', function (guess) {
        console.log('guess: '+guess);
        setGuess(socket.id, guess);
        let game = getGame(socket.id);
        if(allGuessesSubmitted(game)) {
            game = showChoices(game);
            console.log('emit to '+game.id+': update game '+JSON.stringify(game));
            io.in(game.id).emit('update game', game);
        } else {
            console.log('emit to '+socket.id+': update game '+JSON.stringify(game));
            io.to(socket.id).emit('update game', game);
        }
    });

    socket.on('choice', function (choice) {
        console.log('choice: '+choice);
        setChoice(socket.id, choice);
        let game = getGame(socket.id);
        if(allChoicesSubmitted(game)) {
            game = evaluateRound(game);
            console.log('emit to '+game.id+': update game '+JSON.stringify(game));
            io.in(game.id).emit('update game', game);
        } else {
            console.log('emit to '+socket.id+': update game '+JSON.stringify(game));
            io.to(socket.id).emit('update game', game);
        }
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
        this.quest = '';
        this.painting = undefined;
        this.guess = undefined;
        this.choice = undefined;
        this.score = 0;
        this.tendency = 0;
        this.waitText = '';
    }
}

class Game {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.started = false;
        this.currentRound = -1;
        this.choices = [];
    }
}

let maxGameId = 0;
const games = new Map();
const socketIdToGameKey = new Map();
const uploadDir = "/tmp";

function getGame(socketId) {
    let gameKey = socketIdToGameKey.get(socketId);
    console.log('games:');
    logMap(games);
    return games.get(gameKey);
}

function addPlayer(game, socketId, username) {
    const colors = ['blue', 'red', 'green', 'yellow'];
    const nPlayers = game.players.length;
    let newPlayer = new Player(socketId, username, colors[nPlayers]);
    newPlayer.quest = generateQuest();
    game.players.push(newPlayer);
}

function generateQuest() {
    const adjectives = ['Angry', 'Frightened', 'Lazy', 'Burning'];
    const nominals = ['Unicorn', 'Mailman', 'Bird', 'Pizza'];
    let randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    let randomNominal = nominals[Math.floor(Math.random() * nominals.length)];
    return randomAdjective+' '+randomNominal;
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
    const game = new Game(++maxGameId);
    games.set(maxGameId, game);
    addPlayer(game, socketId, username);
    socketIdToGameKey.set(socketId, maxGameId);
    return game;
}

function joinGame(socketId, username, gameId) {
    socketIdToGameKey.set(socketId, gameId);
    const game = getGame(socketId);
    addPlayer(game, socketId, username);
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

function setPainting(socketId, painting) {
    const player = getPlayer(socketId);
    player.painting = painting;
    player.currentScreen = 'screenWait';
    player.waitText = 'Waiting for the other players to finish their painting...';
}

function allPaintingsSubmitted(game) {
    for(let p of game.players) {
        if(p.painting === undefined) {
            return false;
        }
    }
    return true;
}

function nextRound(game) {
    game.currentRound += 1;
    for(let p of game.players) {
        p.currentScreen = 'screenGuess';
        p.guess = undefined;
        p.choice = undefined;
        p.tendency = 0;
    }
    game.players[game.currentRound].currentScreen = 'screenWait';
    game.players[game.currentRound].waitText = 'Waiting until the other players have made their guess on your painting...';
    return game;
}

function setGuess(socketId, guess) {
    const player = getPlayer(socketId);
    player.guess = guess;
    player.currentScreen = 'screenWait';
    player.waitText = 'Waiting for the other players to submit their guess...';
}

function allGuessesSubmitted(game) {
    let currentPlayer = game.players[game.currentRound];
    for(let p of game.players) {
        if(p.socketId !== currentPlayer.socketId && p.guess === undefined) {
            return false;
        }
    }
    return true;
}

function showChoices(game) {
    game.choices = [];
    game.choices.push(game.players[game.currentRound].quest);
    for(let p of game.players) {
        if(p.guess !== undefined) {
            game.choices.push(p.guess);
        }
    }
    for(let p of game.players) {
        p.currentScreen = 'screenChoices';
    }
    game.players[game.currentRound].currentScreen = 'screenWait';
    game.players[game.currentRound].waitText = 'Waiting until the other players have made their guess on your painting...';
    return game;
}

function setChoice(socketId, choice) {
    const player = getPlayer(socketId);
    player.choice = choice;
    player.currentScreen = 'screenWait';
    player.waitText = 'Waiting for the other players to submit their choice...';
}

function allChoicesSubmitted(game) {
    let currentPlayer = game.players[game.currentRound];
    for(let p of game.players) {
        if(p.socketId !== currentPlayer.socketId && p.choice === undefined) {
            return false;
        }
    }
    return true;
}

function evaluateRound(game) {
    const correctAnswer = game.players[game.currentRound].quest;
    for(let p of game.players) {
        if(p.choice === undefined) continue;
        if(p.guess === correctAnswer) {
            p.score += 5;
            p.tendency += 5;
        }
        if(p.choice === correctAnswer) {
            p.score += 2;
            p.tendency += 2;
        } else {
            for(let otherPlayer of game.players) {
                if(p.socketId === otherPlayer.socketId) continue;
                if(p.choice === otherPlayer.guess) {
                    otherPlayer.score += 1;
                    otherPlayer.tendency += 1;
                    //TODO break; when choices displayed are unique
                }
            }
        }
    }
    for(let p of game.players) {
        p.currentScreen = 'screenResults';
    }
    return game;
}

function logMap(map) {
    for(let k of map.keys()) {
        console.log(k+' -> '+JSON.stringify(map.get(k)));
    }
}