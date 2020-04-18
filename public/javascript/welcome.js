$('document').ready(function(){
    buildTextInput('#gameIdInputGroup','gameIdInput','',
        'Game ID:','123456',true,
        'Join an existing game.',undefined,'Join');
});

$(function () {
    const socket = io();

    socket.on('redirect', function(destination) {
        console.log('received: redirect '+destination);
        window.location.href = destination;
    });

    $('#joinGameForm').submit(function(e){
        e.preventDefault(); // prevents page reloading
        const gameId = $('#gameIdInput').val();
        if(gameId) {
            console.log('emit: validate gameId '+gameId);
            socket.emit('validate gameId', gameId);
        }
        return false;
    });

    socket.on('invalid', function (data) {
        console.log('received: invalid '+JSON.stringify(data));
        buildTextInput('#gameIdInputGroup','gameIdInput',data.value,
            'Game ID:','123456',true,
            'Join an existing game.',data.msg,'Join');
    });
});

function buildTextInput(container, id, value, label, placeholder, autofocus, helpText, errorText, buttonTitle) {
    $(container).empty();
    let formGroup;
    if (errorText !== undefined) {
        formGroup = $('<div class="form-group has-danger"></div>');
    } else {
        formGroup = $('<div class="form-group"></div>');
    }
    if (label !== undefined) {
        formGroup.append($('<label for="' + id + '">' + label + '</label>'));
    }
    if (errorText !== undefined) {
        formGroup.append($('<input id="' + id + '" class="form-control is-invalid" type="text" value="' + value + '" placeholder="' + placeholder + '" ' + (autofocus ? 'autofocus' : '') + ' />'));
        formGroup.append($('<div class="invalid-feedback">' + errorText + '</div>'));
    } else {
        formGroup.append($('<input id="' + id + '" class="form-control" type="text" value="' + value + '" placeholder="' + placeholder + '" ' + (autofocus ? 'autofocus' : '') + ' />'));
    }
    if (helpText !== undefined) {
        formGroup.append($('<small class="form-text text-muted">' + helpText + '</small>'));
    }
    if (buttonTitle) {
        formGroup.append($('<input class="btn btn-primary" type="submit" value="' + buttonTitle + '" />'));
    }
    $(container).append(formGroup);
}