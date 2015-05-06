define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    this.displayService = require('services/displayService');
    this.enums = require('services/enums');

    //members
    this.itemList = ko.observableArray();
    var un = ko.observable('');
    var pw = ko.observable('');
    var pw2 = ko.observable('');
    var fn = ko.observable('');
    var ln = ko.observable('');
    var em = ko.observable('');
    var ad = ko.observable('');
    var role = ko.observable(false);
    var course = ko.observable(2);
    var roleName = ko.computed(function() {
        return role() ? 'restricted' : 'user';
    });

    //methods

    this.getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/user/get.php?d=" + Date.now(),
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            }
        }).done(function (data) {
            itemList(data);
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }
    this.remove = function (item) {
        if (confirm('You are about to delete this user. Are you sure?')) {
            $.ajax({
                type: "POST",
                url: "./Server/user/delete.php",
                headers: {
                    "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
                },
                data: { 'user': item }
            }).done(function (data) {
                displayService.display(data);
                getData();
            }).error(function (xhr, ajaxOptions, thrownError) {
                alert(jQuery.parseJSON(xhr.responseText).error);
            });

        }

    }
    this.clearControl = function () {
        un('');
        pw('');
        pw2('');
        fn('');
        ln('');
        em('');
        ad('');
    }
    this.addItem = function() {
        var x = { 'newuser': { 'un': un, 'pw': pw, 'fn': fn, 'ln': ln, 'em': em, role: roleName, course: course } };

        if ($.trim(un()) === '' || $.trim(pw()) === '' || $.trim(pw2()) === '' || $.trim(fn()) === '' || $.trim(ln()) === '' || $.trim(em()) === '') {
            displayService.display('כל השדות הם שדות חובה!', 'error');
            return;
        } else if (pw() !== pw2()) {
            displayService.display('הסיסמה וסיסמת האימות לא זהות!', 'error');
            return;
        }
        //else if ()
        //{
        //    //^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$
        //}
        $.ajax({
            type: "POST",
            url: "./Server/user/add.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: x
        }).done(function(data) {
            if (data.status == enums.Status.OK) {
                clearControl();
                displayService.display(data.msg);
                getData();
            } else {
                displayService.display(data.msg, 'error');
            }
        }).error(function(xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    };

    return {
        un: un,
        pw: pw,
        pw2: pw2,
        fn: fn,
        ln: ln,
        em: em,
        ad: ad,
        role: role,
        course: course,
        viewAttached: function () {
            getData();
            $.placeholder.fix();
        },
        addItem: addItem,
        itemList: itemList,
        remove: remove
    };
});
