define(['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var list = ko.observableArray();
    var events = ko.observableArray();

    var getList = function () {
        httpService.get("Server/get_event_registrants.php?d=" + Date.now()).done(function (result) { list(result); }).error(utilities.handleError);
    }
    var getEvents= function () {
        httpService.get("Server/get_events.php?d=" + Date.now()).done(function (data) { events(data); }).error(utilities.handleError);
    }

    var getEventRegistrants = function (eventid) {
        return ko.utils.arrayFilter(list(), function (registrant) {
            return (registrant.event_id === eventid);
        });
    }
    
    
    var vm = {
        activate: function () {
            getList();
            getEvents();
        },
        compositionComplete: function () {
            
        },
        list: list,
        events: events,
        getEventRegistrants: getEventRegistrants
    };

    return vm;
});