define(function (require) {

    var addToCach = function (key, value) {
        amplify.store(key, value);
    };

    var getFromCach = function (key) {
        return amplify.store(key);
    };

    var cachingService = {
        add: addToCach,
        get: getFromCach
    };

    return cachingService;

});