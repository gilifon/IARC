define(['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {    

    var shell = require('viewmodels/shell');

    var name = ko.observable();
    var callsign = ko.observable();
    var email = ko.observable();
    var phone = ko.observable();
    var items = ko.observableArray();
    var eventid = ko.observableArray();

    this.Send = ko.asyncCommand({
        execute: function (complete) {
            //alert(this.id);
            eventid(this.id);

            if (name() == null) {
                displayService.display("אל תשכח להכניס שם..", "error");
            }
            else if (email() == null) {
                displayService.display("אל תשכח להכניס אימייל..", "error");
            }
            else if (phone() == null) {
                displayService.display("אל תשכח להכניס טלפון..", "error");
            }
            else {
                var info = {
                    'info':
                    {
                        'name': name(),
                        'callsign': callsign(),
                        'email': email(),
                        'phone': phone(),
                        'event_id': eventid()
                    }
                };
                httpService.post("Server/book_download.php", info).done(function (data) {
                    displayService.display(data);
                    complete(true);
                    callsign('');
                    name('');
                    email('');
                    phone('');
                    if (eventid() == 'B')
                        window.open("https://tinyurl.com/book-level-b", '_blank');
                    else if (eventid() == 'A')
                        window.open("https://tinyurl.com/book-level-a", '_blank');
                    eventid('');
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
            shell.selectedSubMenu('bookdownload');
            shell.selectedMainMenu('aguda');
        },
        compositionComplete: function () {
            
        },
        name: name,
        callsign: callsign,
        email: email,
        phone: phone,
        items: items,
        eventid: eventid
    };


    return vm;
});
