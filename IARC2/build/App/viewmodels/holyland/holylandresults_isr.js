define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var searchInput = ko.observable();
    this.results = ko.observableArray();

    this.years = ko.computed(function () {
        var temp = Enumerable.From(this.results()).Select("i=>i.year").Distinct().OrderBy(function (x) { return x.year }).Reverse().ToArray();
        return temp;
    }, this);

    this.categories = ko.computed(function () {
            var temp = Enumerable.From(this.results()).Select("i=>i.category").Distinct().ToArray();
            return temp;
        }, this);

    this.getResults = function () {
        httpService.get("Server/hl_4x.php?d=" + Date.now()).done(function (data) { results(data); }).error(utilities.handleError);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandresults_isr');
            shell.selectedMainMenu('holyland');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
            getResults();
        },
        compositionComplete: function () {
            
        },
        searchInput: searchInput
    };

    return vm;
});