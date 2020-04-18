const Common = require('./public/javascript/common');
const Validation = require('./public/javascript/validation');
const fs = require("fs");
const path = require("path");

const adjectives = fs.readFileSync(path.join(__dirname, 'public', 'assets', 'adjectives.txt')).toString('utf-8').split("\n");;
const nouns = fs.readFileSync(path.join(__dirname, 'public', 'assets', 'nouns.txt')).toString('utf-8').split("\n");;

let maxGameId = 0;
const games = new Map();
const socketIdToGameKey = new Map();


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
        this.isWinner = false;
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
        let randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        let randomNominal = nouns[Math.floor(Math.random() * nouns.length)];
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
        game.players = Common.shuffle(game.players);
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
        const artist = game.players[game.currentRound];
        const correctAnswer = artist.quest;
        for(let p of game.players) {
            if(p.choice === undefined) continue;
            if(p.guess === correctAnswer) {
                p.score += 5;
                p.tendency += 5;
                artist.score += 5;
                artist.tendency += 5;
            }
            if(p.choice === correctAnswer) {
                p.score += 2;
                p.tendency += 2;
                artist.score += 2;
                artist.tendency += 2;
            } else {
                for(let otherPlayer of game.players) {
                    if(p.socketId === otherPlayer.socketId) continue;
                    if(p.choice === otherPlayer.guess) {
                        otherPlayer.score += 1;
                        otherPlayer.tendency += 1;
                    }
                }
            }
        }
        for(let p of game.players) {
            p.currentScreen = 'screenResults';
        }
        if(game.currentRound === game.players.length-1) {
            game.finished = true;
            this.determineWinners(game.players);
        }
        return game;
    },

    determineWinners: function(players) {
        let maxScore = 0;
        for(let p of players) {
            if(p.score > maxScore) {
                maxScore = p.score;
            }
        }
        for(let p of players) {
            if(p.score === maxScore) {
                p.isWinner = true;
            }
        }
    },

    usernameIsValid: function(io, socket, username) {
        let usernameError = Validation.usernameError(username);
        if(usernameError !== undefined) {
            io.to(socket.id).emit('invalid', {type:'username',value:username,msg:usernameError});
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
        let gameIdError = Validation.gameIdError(gameId);
        if(gameIdError !== undefined) {
            io.to(socket.id).emit('invalid', {type:'gameId',value:gameId,msg:gameIdError});
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

    guessIsValid: function(io, socket, guess) {
        let guessError = Validation.guessError(guess);
        if(guessError !== undefined) {
            io.to(socket.id).emit('invalid', {type:'guess',value:guess,msg:guessError});
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
