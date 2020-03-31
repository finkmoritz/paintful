$('document').ready(function(){
    showOnly('screenUsername');
});

window.onbeforeunload = function(){
    return 'Are you sure you want to leave?';
};

$(function () {
    const socket = io();

    $('form').submit(function(e){
        e.preventDefault(); // prevents page reloading
        socket.emit('new player', $('#usernameInput').val());
        $('#usernameInput').val('');
        return false;
    });

    socket.on('show', function(screenOn){
        showOnly(screenOn);
    });
    socket.on('add player', function(player){
        $('#playersList').append($('<li>').text(player));
    });
});

function showOnly(screenOn) {
    const screens = ['screenUsername', 'screenPlayers'];
    console.log('screenOn='+screenOn);
    for (let screen of screens) {
        document.getElementById(screen).style.display = 'none';
    }
    document.getElementById(screenOn).style.display = 'block';
}