define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var skf = ko.observableArray();
    var skfcount = ko.observable();
    var searchInput = ko.observable();

    this.getSKF = function () {
        httpService.get("Server/skf.php?d=" + Date.now()).done(function (data) { skf(data); }).error(utilities.handleError);
    }
    this.getSKFCount = function () {
        httpService.get("Server/skf_count.php?d=" + Date.now()).done(function (data) { skfcount(data); }).error(utilities.handleError);
    }
    

    var vm = {
        activate: function () {
            shell.selectedSubMenu('skf');
            shell.selectedMainMenu('english');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
        },
        compositionComplete: function () {
            getSKF();
            getSKFCount();
            searchInput('');
        },
        skf: skf,
        skfcount: skfcount,
        searchInput: searchInput
    };

    return vm;
});