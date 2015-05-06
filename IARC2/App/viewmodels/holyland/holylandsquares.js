define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var searchInput = ko.observable();

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandsquares');
            shell.selectedMainMenu('holyland');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
        },
        compositionComplete: function () {
            searchInput('');
        },
        searchInput: searchInput
    };

    return vm;
});