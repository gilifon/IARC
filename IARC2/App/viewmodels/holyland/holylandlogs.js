define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var logs = ko.observableArray();
    var counter = ko.observableArray();
    var DXCCcounter = ko.observableArray();
    var searchInput = ko.observable();

    this.getlogs = function () {
        httpService.get("Server/hl_2015.php?d=" + Date.now()).done(function (data) {
            logs(data);
            counter(Enumerable.From(logs()).Count());
            DXCCcounter(Enumerable.From(logs()).Select("$.country").Distinct().Count());
        }).error(utilities.handleError);
    }  
this.getCount = function () {
    httpService.get("Server/hl2015_count.php?d=" + Date.now()).done(function (data) {
        counter(data);
    }).error(utilities.handleError);
    }	

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandlogs');
            shell.selectedMainMenu('holyland');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
			getlogs();
			//getCount();
            searchInput('');
        },
        compositionComplete: function () {
            
        },
        logs: logs,
        counter: counter,
        DXCCcounter:DXCCcounter,
		searchInput: searchInput,
        year: moment()._d.getUTCFullYear()
    };

    return vm;
});