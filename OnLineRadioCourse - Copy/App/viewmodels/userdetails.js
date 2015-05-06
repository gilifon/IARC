define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    this.displayService = require('services/displayService');
    this.login = require('viewmodels/login');

    //members
    var oldpw = ko.observable('');
    var newpw = ko.observable('');
    var newpw2 = ko.observable('');

    //methods
    this.clearControl = function () {
        oldpw('');
        newpw('');
        newpw2('');
    }
    this.changePassword = function () {
        var x = { 'pw': { 'oldpw': oldpw, 'newpw': newpw, 'newpw2': newpw2} };
        
        if (oldpw() === '' || newpw() === '' || newpw2() === '' ) {
            displayService.display('כל השדות הם שדות חובה!','error');
            return;
        }
        if (oldpw() !== cachingService.get('password')) {
            displayService.display('הסיסמה הישנה לא נכונה!', 'error');
            return;
        }
        if (newpw() != newpw2()) {
            displayService.display('הסיסמה החדשה וסיסמת האימות לא זהות!', 'error');
            return;
        }
        $.ajax({
            type: "POST",
            url: "./Server/user/changepass.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: { 'authorization': utilities.encode64(login.username + ":" + oldpw + ":" + newpw) }
        }).done(function (data) {
            clearControl();
            displayService.display(data);
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {
        oldpw: oldpw,
        newpw: newpw,
        newpw2: newpw2,
        viewAttached: function () {
            $.placeholder.fix();
        },
        changePassword: changePassword,
        username: login.username,
        firstname: login.firstname,
        lastname: login.lastname,
        email: login.email
    };
});
