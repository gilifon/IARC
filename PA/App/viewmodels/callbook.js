define(['services/utilities', 'services/httpService', 'services/cachingService', 'services/displayService'], function (utilities, httpService, cachingService, displayService) {

    var shell = require('viewmodels/shell');
    var members = ko.observableArray();
    var searchInput = ko.observable();

    this.getMembers = function () {
        httpService.get("/ws/private_area/getmembers.php", '', {
            "Authorization": cachingService.get('Auth')
        }).done(function (data) {
            members(data);
        }).error(utilities.handleError);
    }
    
    var vm = {
        activate: function () {
            shell.selectedSubMenu('callbook');
            shell.selectedMainMenu('services');
            getMembers();
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
        },
        compositionComplete: function () {
            searchInput('');
        },
        members: members,
        searchInput: searchInput
    };

    return vm;
});