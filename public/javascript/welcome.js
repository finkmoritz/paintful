$('document').ready(function(){
    buildGameIdInput('', undefined);
});

$(function () {
    const socket = io();

    socket.on('redirect', function(destination) {
        console.log('received: redirect '+destination);
        window.location.href = destination;
    });

    $('#joinGameForm').submit(function(e){
        e.preventDefault(); // prevents page reloading
        if(validateGameId()) {
            const gameId = $('#gameIdInput').val();
            if(gameId !== undefined) {
                console.log('emit: validate gameId '+gameId);
                socket.emit('validate gameId', gameId);
            }
        }
        return false;
    });

    socket.on('invalid', function (data) {
        console.log('received: invalid '+JSON.stringify(data));
        buildGameIdInput(data.value, data.msg);
    });
});

function buildGameIdInput(value, error) {
    common.buildTextInput('#gameIdInputGroup','gameIdInput',value,
        'Game ID:','123456',true,
        'Join an existing game.',error,'Join');
}

function validateGameId() {
    let gameId = document.getElementById('gameIdInput').value;
    let gameIdError = validation.gameIdError(gameId);
    if(gameIdError !== undefined) {
        buildGameIdInput(gameId, gameIdError);
        return false;
    }
    return true;
}