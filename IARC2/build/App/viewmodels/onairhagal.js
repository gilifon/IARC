define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var files = ko.observableArray();

    this.getHagalFiles = function () {
        httpService.get("Server/broadcasted_hagal.php?d=" + Date.now()).done(function (data) { files(data); }).error(utilities.handleError);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('onairhagal');
            shell.selectedMainMenu('hagal');
            getHagalFiles();
        },
        files: files
    };

    return vm;
});