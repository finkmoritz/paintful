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
        this.finished = false;
        this.currentRound = -1;
        this.choices = [];
    }
}

let maxGameId = 0;
const games = new Map();
const socketIdToGameKey = new Map();

module.exports = {
    getGame: function(socketId) {
        let gameKey = socketIdToGameKey.get(socketId);
        return games.get(gameKey);
    },

    addPlayer: function(game, socketId, username) {
        const colors = ['blue', 'red', 'green', 'yellow'];
        const nPlayers = game.players.length;
        let newPlayer = new Player(socketId, username, colors[nPlayers]);
        newPlayer.quest = this.generateQuest();
        game.players.push(newPlayer);
    },

    generateQuest: function() {
        const adjectives = ['Angry', 'Frightened', 'Lazy', 'Burning'];
        const nominals = ['Unicorn', 'Mailman', 'Bird', 'Pizza'];
        let randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        let randomNominal = nominals[Math.floor(Math.random() * nominals.length)];
        return randomAdjective+' '+randomNominal;
    },

    getPlayer: function(socketId) {
        const game = this.getGame(socketId);
        for(let player of game.players) {
            if(player.socketId === socketId) {
                return player;
            }
        }
        return undefined;
    },

    newGame: function(socketId, username) {
        const game = new Game(++maxGameId);
        games.set(maxGameId, game);
        this.addPlayer(game, socketId, username);
        socketIdToGameKey.set(socketId, maxGameId);
        return game;
    },

    joinGame: function(socketId, username, gameId) {
        socketIdToGameKey.set(socketId, gameId);
        const game = this.getGame(socketId);
        this.addPlayer(game, socketId, username);
        return game;
    },

    startGame: function(socketId) {
        const game = this.getGame(socketId);
        game.started = true;
        for(let p of game.players) {
            p.currentScreen = 'screenDraw';
        }
        return game;
    },

    setPainting: function(socketId, painting) {
        const player = this.getPlayer(socketId);
        player.painting = painting;
        player.currentScreen = 'screenWait';
        player.waitText = 'Waiting for the other players to finish their painting...';
    },

    allPaintingsSubmitted: function(game) {
        for(let p of game.players) {
            if(p.painting === undefined) {
                return false;
            }
        }
        return true;
    },

    nextRound: function(game) {
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
    },

    setGuess: function(socketId, guess) {
        const player = this.getPlayer(socketId);
        player.guess = guess;
        player.currentScreen = 'screenWait';
        player.waitText = 'Waiting for the other players to submit their guess...';
    },

    allGuessesSubmitted: function(game) {
        let currentPlayer = game.players[game.currentRound];
        for(let p of game.players) {
            if(p.socketId !== currentPlayer.socketId && p.guess === undefined) {
                return false;
            }
        }
        return true;
    },

    showChoices: function(game) {
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
    },

    setChoice: function(socketId, choice) {
        const player = this.getPlayer(socketId);
        player.choice = choice;
        player.currentScreen = 'screenWait';
        player.waitText = 'Waiting for the other players to submit their choice...';
    },

    allChoicesSubmitted: function(game) {
        let currentPlayer = game.players[game.currentRound];
        for(let p of game.players) {
            if(p.socketId !== currentPlayer.socketId && p.choice === undefined) {
                return false;
            }
        }
        return true;
    },

    evaluateRound: function(game) {
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
        if(game.currentRound === game.players.length-1) {
            game.finished = true;
        }
        return game;
    },

    usernameIsValid: function(io, socket, username) {
        if(username === '') {
            io.to(socket.id).emit('invalid', {type:'username',value:username,msg:'Username cannot be empty'});
            return false;
        }
        if(!/^[a-z0-9]+$/i.test(username)) {
            io.to(socket.id).emit('invalid', {type:'username',value:username,msg:'Username can only contain alphanumeric characters'});
            return false;
        }
        let game = this.getGame(socket.id);
        if(game !== undefined) {
            for(let p of game.players) {
                if(p.username === username) {
                    io.to(socket.id).emit('invalid', {type:'username',value:username,msg:'User with name '+username+' already exists'});
                    return false;
                }
            }
        }
        return true;
    },

    gameIdIsValid: function(io, socket, gameId) {
        if(gameId === '') {
            io.to(socket.id).emit('invalid', {type:'gameId',value:gameId,msg:'Game ID cannot be empty'});
            return false;
        }
        if(!/^[0-9]+$/i.test(gameId)) {
            io.to(socket.id).emit('invalid', {type:'gameId',value:gameId,msg:'Game ID must be a number'});
            return false;
        }
        gameId = parseInt(gameId);
        let game = games.get(gameId);
        if(game === undefined) {
            io.to(socket.id).emit('invalid', {type:'gameId',value:gameId,msg:'Invalid game ID'});
            return false;
        } else if(game.started) {
            io.to(socket.id).emit('invalid', {type:'gameId',value:gameId,msg:'Game already started'});
            return false;
        }
        return true;
    },

    handleError: function(e, socket, io) {
        console.error('ERROR receiving message from socket with ID '+socket.id);
        console.error('Original error: '+e.stack);
        this.logMap(socketIdToGameKey);
        this.logMap(games);
        console.error('Rooms: '+JSON.stringify(socket.rooms));
        io.to(socket.id).emit('error', 'Oops, looks like something went wrong');
    },

    logMap: function(map) {
        for(let k of map.keys()) {
            console.log(k+' -> '+JSON.stringify(map.get(k)));
        }
    }
};
