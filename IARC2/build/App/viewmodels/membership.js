define(['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {

    var shell = require('viewmodels/shell');

    var name = ko.observable();
    var callsign = ko.observable();
    var account = ko.observable();
    var phone = ko.observable();
    var isRegistered = ko.observable(false);

    this.Send = ko.asyncCommand({
        execute: function (complete) {
            if (name() == null || name() == "") {
                displayService.display("אל תשכח להכניס שם..", "error");
            }
            else if (account() == null || account() == "") {
                displayService.display("אל תשכח להכניס מספר חשבון..", "error");
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
                        'account': account(),
                        'phone': phone()
                    }
                };
                httpService.post("Server/bank_transfer.php", info).done(function (data) {
                    complete(true);
                    isRegistered(data.response);
                    callsign('');
                    name('');
                    account('');
                    phone('');

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
            shell.selectedSubMenu('membershio');
            shell.selectedMainMenu('aguda');
        },
        compositionComplete: function () {

        },
        name: name,
        callsign: callsign,
        phone: phone,
        account: account,
        isRegistered: isRegistered
    };


    return vm;
});
