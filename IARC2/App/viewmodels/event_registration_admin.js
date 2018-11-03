define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var list = ko.observableArray();

    this.getList= function () {
        httpService.get("/ws/get_event_registrants.php?d=" + Date.now()).done(function (result) { list(result); }).error(utilities.handleError);
    }
    
    var vm = {
        activate: function () {
            getList();
        },
        compositionComplete: function () {
            
        },
        list: list
    };

    return vm;
});