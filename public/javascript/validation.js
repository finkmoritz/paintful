(function(exports){

    exports.usernameError = function(username){
        if(username === '') {
            return 'Username cannot be empty';
        }
        if(!/^[a-z0-9]+$/i.test(username)) {
            return 'Username can only contain alphanumeric characters';
        }
    };

    exports.gameIdError = function(gameId){
        if(gameId === '') {
            return 'Game ID cannot be empty';
        }
        if(!/^[0-9]+$/i.test(gameId)) {
            return 'Game ID must be a number';
        }
    };

    exports.guessError = function(guess){
        if(guess === '') {
            return 'Guess cannot be empty';
        }
        if(!/^[a-z]+ [a-z]+$/i.test(guess)) {
            return 'Guess must consist of two words';
        }
    };

}(typeof exports === 'undefined' ? this.validation = {} : exports));