define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var hagal = ko.observableArray();

    this.getHagal = function () {
        httpService.get("/ws/hagal.php?d=" + Date.now()).done(function (data) { hagal(data); }).error(utilities.handleError);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('hagalarchive');
            shell.selectedMainMenu('hagal');
        },
        compositionComplete: function () {
            getHagal();
        },
        hagal: hagal
    };

    return vm;
});