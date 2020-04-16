let choice = undefined;

$('document').ready(function(){
    buildTextInput('#usernameInputGroup','usernameInput','',
        'Choose a name:','',true,
        'This will be your username.',undefined,'Play');
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
            console.log('emit: join game '+$('#usernameInput').val()+' '+gameId);
            socket.emit('join game', { username: $('#usernameInput').val(), gameId: gameId });
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
        socket.emit('guess', $('#guessInput').val());
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
    })
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
}

function buildScreenChoices(game) {
    let painting = game.players[game.currentRound].painting;
    let url = 'http://'+window.location.host+'/download?painting='+painting;
    document.getElementById('imgDisplayChoices').innerHTML = "";
    $('#imgDisplayChoices').append($('<img src="'+url+'"/>'));
    document.getElementById('choiceButtons').innerHTML = "";
    //TODO only display unique choices
    for(let choice of game.choices) {
        $('#choiceButtons').append($('<input class="col btn btn-primary choice-button" type="submit" value="'+choice+'" onclick="choice=this.value;" />'));
    }
}

function buildScreenResults(game) {
    document.getElementById('resultsTable').innerHTML = "";
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
        resultsRow.append($('<td></td>').text(p.score));
        $('#resultsTable').append(resultsRow);
    }
    if(game.finished) {
        $('#nextRoundForm').hide();
    } else {
        $('#nextRoundForm').show();
    }
}

function buildTextInput(container, id, value, label, placeholder, autofocus, helpText, errorText, buttonTitle) {
    $(container).empty();
    let formGroup;
    if(errorText !== undefined) {
        formGroup = $('<div class="form-group has-danger"></div>');
    } else {
        formGroup = $('<div class="form-group"></div>');
    }
    if(label !== undefined) {
        formGroup.append($('<label for="'+id+'">'+label+'</label>'));
    }
    if(errorText !== undefined) {
        formGroup.append($('<input id="'+id+'" class="form-control is-invalid" type="text" value="'+value+'" placeholder="'+placeholder+'" '+(autofocus?'autofocus':'')+' />'));
        formGroup.append($('<div class="invalid-feedback">'+errorText+'</div>'));
    } else {
        formGroup.append($('<input id="'+id+'" class="form-control" type="text" value="'+value+'" placeholder="'+placeholder+'" '+(autofocus?'autofocus':'')+' />'));
    }
    if(helpText !== undefined) {
        formGroup.append($('<small class="form-text text-muted">'+helpText+'</small>'));
    }
    if(buttonTitle) {
        formGroup.append($('<input class="btn btn-primary" type="submit" value="'+buttonTitle+'" />'));
    }
    $(container).append(formGroup);
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
            buildTextInput('#usernameInputGroup','usernameInput',value,
                'Choose a name:','',true,
                'This will be your username.',msg,'Play');
            break;
        default: console.error('Unknown invalid type: '+type);
    }
}