define(['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {    

    var shell = require('viewmodels/shell');

    var callsign = ko.observable();
    

    
    this.Send = ko.asyncCommand({
        execute: function (complete) {
            if (callsign() == null) {
                displayService.display("אל תשכח להכניס אות קריאה..", "error");
            }
            else {
                var info = {
                    'info':
                    {
                        'callsign': callsign()
                    }
                };
                httpService.post("/ws/event_registration.php", info).done(function (data) {
                    displayService.display(data);
                    complete(true);
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
        },
        compositionComplete: function () {
        },
        callsign: callsign        
    };


    return vm;
});
