﻿define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var logs = ko.observableArray();
	var counter = ko.observableArray();
    var searchInput = ko.observable();

    this.getlogs = function () {
        httpService.get("/ws/hl_2015.php?d=" + Date.now()).done(function (data) { logs(data); }).error(utilities.handleError);
    }  
this.getCount = function () {
        httpService.get("/ws/hl2015_count.php?d=" + Date.now()).done(function (data) { counter(data); }).error(utilities.handleError);
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
			getCount();
            searchInput('');
        },
        compositionComplete: function () {
            
        },
        logs: logs,
		counter:counter,
        searchInput: searchInput
    };

    return vm;
});