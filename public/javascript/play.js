$('document').ready(function(){
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
            default: console.log('Unknown screen: '+currentScreen);
        }
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
    const screens = ['screenWait', 'screenUsername', 'screenPlayers', 'screenDraw'];
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
    document.getElementById('questDisplay').innerHTML = getMyPlayer(game, socketId).quest;
}