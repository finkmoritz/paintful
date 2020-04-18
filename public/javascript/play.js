let choice = undefined;

$('document').ready(function(){
    buildUsernameInput('', undefined);
    showOnly('screenUsername');
});

window.onbeforeunload = function(){
    return 'Are you sure you want to leave?';
};

$(function () {
    const socket = io();
    const instance = new SocketIOFileUpload(socket, {
        chunkSize: 1024 * 1000
    });

    $('#usernameInputForm').submit(function(e){
        e.preventDefault(); // prevents page reloading
        const gameId = getUrlParam('gameId');
        if(gameId) {
            if(validateUsername()) {
                console.log('emit: join game '+$('#usernameInput').val()+' '+gameId);
                socket.emit('join game', { username: $('#usernameInput').val(), gameId: gameId });
            }
        } else {
            console.log('emit: new game '+$('#usernameInput').val());
            socket.emit('new game', $('#usernameInput').val());
        }
        return false;
    });

    $('#startGameForm').submit(function(e){
        e.preventDefault(); // prevents page reloading
        socket.emit('start game');
        return false;
    });

    $('#uploadPainting').submit(function(e){
        e.preventDefault(); // prevents page reloading
        document.getElementById('drawingCanvas').toBlob(function (blob) {
            const file = new File([blob], socket.id+'.png');
            console.log('Submit file: '+file);
            instance.submitFiles([file]);
        });
        return false;
    });

    $('#guessInputForm').submit(function(e){
        e.preventDefault(); // prevents page reloading
        if(validateGuess()) {
            socket.emit('guess', $('#guessInput').val());
        }
        return false;
    });

    $('#choiceInputForm').submit(function(e){
        e.preventDefault(); // prevents page reloading
        socket.emit('choice', choice);
        choice = undefined;
        return false;
    });

    $('#nextRoundForm').submit(function(e){
        e.preventDefault(); // prevents page reloading
        socket.emit('next round');
        return false;
    });

    socket.on('update game', function(game){
        console.log('received: update game '+JSON.stringify(game));
        let myPlayer = getMyPlayer(game, socket.id);
        let currentScreen = myPlayer.currentScreen;
        showOnly(currentScreen);
        buildGameInfo(game);
        switch (currentScreen) {
            case 'screenWait':
                buildScreenWait(myPlayer.waitText);
                break;
            case 'screenPlayers':
                buildScreenPlayers(game);
                break;
            case 'screenDraw':
                buildScreenDraw(game, socket.id);
                break;
            case 'screenGuess':
                buildScreenGuess(game);
                break;
            case 'screenChoices':
                buildScreenChoices(game);
                break;
            case 'screenResults':
                buildScreenResults(game);
                break;
            default: console.log('Unknown screen: '+currentScreen);
        }
    });

    socket.on('error', function(msg){
        console.log('received: error '+msg);
        showAlert(true, msg);
    });

    socket.on('invalid', function (data) {
        console.log('received: invalid '+JSON.stringify(data));
        showInvalidInput(data.type, data.value, data.msg);
    });
});

function getMyPlayer(game, socketId) {
    for(let p of game.players) {
        if(p.socketId === socketId) {
            return p;
        }
    }
}

function showOnly(screenOn) {
    const screens = ['screenWait', 'screenUsername', 'screenPlayers', 'screenDraw', 'screenGuess', 'screenChoices', 'screenResults'];
    for (let screen of screens) {
        document.getElementById(screen).style.display = 'none';
    }
    document.getElementById(screenOn).style.display = 'block';
}

function getUrlParam(key) {
    const url = new URL(window.location.href);
    return  url.searchParams.get(key);
}

function buildGameInfo(game) {
    document.getElementById('gameIdDisplay').innerHTML = 'Game #'+game.id;
    document.getElementById('scoreDisplay').innerHTML = "";
    for(let p of game.players) {
        $('#scoreDisplay').append($('<span class="col badge badge-pill" style="color: '+p.color+';"></span>').text(p.username+': '+p.score));
    }
    let currentPlayer = game.players[game.currentRound];
    if(!game.finished && currentPlayer) {
        setBorder(true, currentPlayer.color);
    } else {
        setBorder(false, '');
    }
}

function buildScreenWait(waitText) {
    document.getElementById('screenWait').innerHTML = waitText;
}

function buildScreenPlayers(game) {
    $('#playersList').empty();
    for(let p of game.players) {
        $('#playersList').append($('<li class="list-group-item" style="color: '+p.color+';">').text(p.username));
    }
}

function buildScreenDraw(game, socketId) {
    document.getElementById('questText').innerHTML = 'Draw: '+getMyPlayer(game, socketId).quest;
}

function buildScreenGuess(game) {
    let painting = game.players[game.currentRound].painting;
    let url = 'http://'+window.location.host+'/download?painting='+painting;
    document.getElementById('imgDisplay').innerHTML = "";
    $('#imgDisplay').append($('<img src="'+url+'"/>'));
    buildGuessInput('', undefined);
}

function buildScreenChoices(game) {
    let painting = game.players[game.currentRound].painting;
    let url = 'http://'+window.location.host+'/download?painting='+painting;
    document.getElementById('imgDisplayChoices').innerHTML = "";
    $('#imgDisplayChoices').append($('<img src="'+url+'"/>'));
    document.getElementById('choiceButtons').innerHTML = "";
    let shuffledChoices = new Set(common.shuffle(game.choices));
    for(let choice of shuffledChoices) {
        $('#choiceButtons').append($('<input class="col btn btn-primary choice-button" type="submit" value="'+choice+'" onclick="choice=this.value;" />'));
    }
}

function buildScreenResults(game) {
    const trophy = '&#127942;';
    document.getElementById('resultsTable').innerHTML = "";
    game.players.sort(function (a,b) {
        return b.score - a.score;
    });
    for(let p of game.players) {
        let resultsRow;
        if(p.tendency > 0) {
            resultsRow = $('<tr class="table-success"></tr>');
        } else if(p.tendency < 0) {
            resultsRow = $('<tr class="table-danger"></tr>');
        } else {
            resultsRow = $('<tr></tr>');
        }
        resultsRow.append($('<th scope="row"></th>').text(p.username));
        resultsRow.append($('<td></td>').text(p.guess));
        resultsRow.append($('<td></td>').text(p.choice));
        resultsRow.append($('<td></td>').text(p.tendency > 0 ? '+'+p.tendency : p.tendency));
        resultsRow.append($('<td></td>').html(p.isWinner?p.score+' '+trophy:p.score));
        $('#resultsTable').append(resultsRow);
    }
    if(game.finished) {
        $('#nextRoundForm').hide();
    } else {
        $('#nextRoundForm').show();
    }
}

function showAlert(show, msg) {
    if(show) {
        document.getElementById('alertMsg').innerHTML = msg;
        $('.alert-banner').show();
    } else {
        $('.alert-banner').hide();
    }
}

function showInvalidInput(type, value, msg) {
    switch (type) {
        case 'username':
            buildUsernameInput(value, msg);
            break;
        case 'guess':
            buildGuessInput(value, msg);
            break;
        default: console.error('Unknown invalid type: '+type);
    }
}

function buildUsernameInput(value, error) {
    common.buildTextInput('#usernameInputGroup','usernameInput',value,
        'Choose a name:','',true,
        'This will be your username.',error,'Play');
}

function buildGuessInput(value, error) {
    common.buildTextInput('#guessInputGroup','guessInput',value,
        'What does this painting show?','',true,
        'Hot Unicorn, Crazy Mailman, etc...',error,'Submit');
}

function validateUsername() {
    let username = document.getElementById('usernameInput').value;
    let usernameError = validation.usernameError(username);
    if(usernameError !== undefined) {
        buildUsernameInput(username, usernameError);
        return false;
    }
    return true;
}

function validateGuess() {
    let guess = document.getElementById('guessInput').value;
    let guessError = validation.guessError(guess);
    if(guessError !== undefined) {
        buildGuessInput(guess, guessError);
        return false;
    }
    return true;
}

function setBorder(on, color) {
    if(on) {
        document.body.style.border = 'solid '+color+' 5px';
    } else {
        document.body.style.border = 'none';
    }
}