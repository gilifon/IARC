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

            if (name() == null || name() == "") {
                displayService.display("אל תשכח להכניס שם..", "error");
            }
            else if (email() == null || email() == "") {
                displayService.display("אל תשכח להכניס אימייל..", "error");
            }
            else if (!email().includes("@")) {
                displayService.display("בטוח שזה המייל שלך? תבדוק שוב..", "error");
            }
            else if (phone() == null || phone() == "") {
                displayService.display("אל תשכח להכניס טלפון..", "error");
            }
            else if (!(/^\d{2,3}-?\d{7}$/.test(phone()))) {
                displayService.display("משהו בטלפון לא נראה נכון, תבדוק שוב..", "error");
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
