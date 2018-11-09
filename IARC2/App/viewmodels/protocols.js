define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var annual = ko.observableArray();
    var protocol = ko.observableArray();
    var finance = ko.observableArray();

    this.getAnnual = function () {
        httpService.get("Server/annual.php?d=" + Date.now()).done(function (data) { annual(data); }).error(utilities.handleError);
    }
    this.getProtocol = function () {
        httpService.get("Server/protocol.php?d=" + Date.now()).done(function (data) { protocol(data); }).error(utilities.handleError);
    }
    this.getFinance = function () {
        httpService.get("Server/finance.php?d=" + Date.now()).done(function (data) { finance(data); }).error(utilities.handleError);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('protocols');
            shell.selectedMainMenu('aguda');
        },
        compositionComplete: function () {
            getAnnual();
            getProtocol();
            getFinance();
        },
        annual: annual,
        protocol: protocol,
        finance: finance
    };

    return vm;
});