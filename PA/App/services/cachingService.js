define(function (require) {

    var addToCach = function (key, value) {
        amplify.store(key, value);
    };

    var getFromCach = function (key) {
        return amplify.store(key);
    };

    var setLogin = function (value) {
        amplify.store('IsLoggedIn', value);
    };

    var getLogin = function () {
        return (amplify.store('IsLoggedIn') === undefined || amplify.store('IsLoggedIn') === null || amplify.store('IsLoggedIn') === '') ? false : amplify.store('IsLoggedIn');
    };

    var cachingService = {
        add: addToCach,
        get: getFromCach,
        setLogin: setLogin,
        getLogin: getLogin
    };

    return cachingService;

});