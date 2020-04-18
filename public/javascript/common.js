(function(exports){

    exports.buildTextInput = function(container, id, value, label, placeholder, autofocus, helpText, errorText, buttonTitle) {
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

}(typeof exports === 'undefined' ? this.common = {} : exports));