(function(exports){

    exports.shuffle = function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

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
    };

    exports.getMobileOperatingSystem = function() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;

        // Windows Phone must come first because its UA also contains "Android"
        if (/windows phone/i.test(userAgent)) {
            return "Windows Phone";
        }

        if (/android/i.test(userAgent)) {
            return "Android";
        }

        // iOS detection from: http://stackoverflow.com/a/9039885/177710
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            return "iOS";
        }

        return "unknown";
    };

}(typeof exports === 'undefined' ? this.common = {} : exports));