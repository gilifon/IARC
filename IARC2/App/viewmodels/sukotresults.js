define(['services/utilities', 'services/httpService'], function (utilities) {
    var shell = require('viewmodels/shell');
    var searchInput = ko.observable();

    var vm = {
        activate: function () {
            shell.selectedSubMenu('sukotresults');
            shell.selectedMainMenu('israelham');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
            searchInput('');
        },
		searchInput: searchInput
    };

    return vm;
});