﻿define(['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {    

    var shell = require('viewmodels/shell');

    var name = ko.observable();
    var callsign = ko.observable();
    var email = ko.observable();
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("Server/get_events.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }
    
    this.Send = ko.asyncCommand({
        execute: function (complete) {
            if (callsign() == null) {
                displayService.display("אל תשכח להכניס אות קריאה..", "error");
            }
            else if (name() == null) {
                displayService.display("אל תשכח להכניס שם..", "error");
            }
            else if (email() == null) {
                displayService.display("אל תשכח להכניס אימייל..", "error");
            }
            else {
                var info = {
                    'info':
                    {
                        'name': name(),
                        'callsign': callsign(),
                        'email': email(),
                        'event_id': this.id
                    }
                };
                httpService.post("Server/event_registration.php", info).done(function (data) {
                    displayService.display(data);
                    complete(true);
                    //callsign('');
                    //name('');
                    //email('');
                }).error(function () { displayService.display("Something went wrong..", "error"); utilities.handleError(); complete(true); });
            }
        },
        canExecute: function (isExecuting) {
            //return !isExecuting;
            return true;
        }
    });

    var vm = {
        activate: function () {
            shell.selectedSubMenu('eventregistration');
            shell.selectedMainMenu('aguda');
            getItems();
        },
        compositionComplete: function () {
            
        },
        name: name,
        callsign: callsign,
        email: email,
        getItems: getItems,
        items: items
    };


    return vm;
});
