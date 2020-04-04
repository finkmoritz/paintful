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
        showOnly(game.currentScreen);
        switch (game.currentScreen) {
            case 'screenPlayers':
                buildScreenPlayers(game);
                break;
            case 'screenDraw':
                buildScreenDraw(game);
                break;
            default: console.log('Unknown screen: '+game.currentScreen);
        }
    });

    document.getElementById('uploadStatus').innerHTML = "";
    socket.on('upload success', function(){
        console.log('received: upload success');
        document.getElementById('uploadStatus').innerHTML = "Successfully uploaded";
    });
});

function showOnly(screenOn) {
    const screens = ['screenUsername', 'screenPlayers', 'screenDraw'];
    for (let screen of screens) {
        document.getElementById(screen).style.display = 'none';
    }
    document.getElementById(screenOn).style.display = 'block';
}

function getUrlParam(key) {
    const url = new URL(window.location.href);
    return  url.searchParams.get(key);
}

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

function buildScreenPlayers(game) {
    $('#playersList').empty();
    for(let p of game.players) {
        $('#playersList').append($('<li>').text(p.username));
    }
}

function buildScreenDraw(game) {

}