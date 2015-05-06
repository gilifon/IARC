define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("/ws/markolit.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }
    var vm = {
        activate: function () {
            shell.selectedSubMenu('market');
            shell.selectedMainMenu('aguda');
        },
        getItems: getItems,
        compositionComplete: function () {
            getItems();
        },
        items: items
    };

    return vm;
});