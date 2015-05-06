define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    this.displayService = require('services/displayService');
    this.presentations = require('viewmodels/presentations');

    //members
    var target = ko.observable('');
    var desc = ko.observable('');

    //methods
    this.remove = function (presentation) {
        if (confirm('You are about to delete this presentation. Are you sure?')) {
            $.ajax({
                type: "POST",
                url: "./Server/presentation/delete.php",
                headers: {
                    "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
                },
                data: { 'presentation': presentation }
            }).done(function (data) {
                displayService.display(data);
                
                presentations.getData();
            }).error(function (xhr, ajaxOptions, thrownError) {
                alert(jQuery.parseJSON(xhr.responseText).error);
            });

        }

    }
    this.clearControl = function () {
        target('');
        desc('');
    }
    this.addItem = function () {
        var x = { 'newpresentation': { 't': target, 'd': desc } };
        
        if ($.trim(target()) === '' || $.trim(desc()) === '') {
            displayService.display('חובה להכניס כתובת ותיאור','error');
            return;
        }
        $.ajax({
            type: "POST",
            url: "./Server/presentation/add.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: x
        }).done(function (data) {
            clearControl();
            displayService.display(data);
            presentations.getData();
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }
    this.reorder = function () {
        $.ajax({
            type: "POST",
            url: "./Server/reorder.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: { 'list': utilities.getOrder(), 'table': 'presentations' }
        }).done(function (data) {
            presentations.getData();
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {
        viewAttached: function () {
            presentations.getData();
            $.placeholder.fix();

            $(".sortable").sortable({
                placeholder: "ui-state-highlight",
                update: function (event, ui) { reorder(); }
            });
            $(".sortable").disableSelection();
        },
        addItem: addItem,
        target: target,
        desc: desc,
        itemList: presentations.presentationList,
        remove:remove
    };
});
