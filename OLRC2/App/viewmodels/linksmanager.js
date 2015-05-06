define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    this.displayService = require('services/displayService');
    this.links = require('viewmodels/links');

    //members
    var target = ko.observable('');
    var desc = ko.observable('');

    //methods
    this.remove = function (link) {
        if (confirm('You are about to delete this link. Are you sure?')) {
            $.ajax({
                type: "POST",
                url: "./Server/link/delete.php",
                headers: {
                    "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
                },
                data: { 'link': link }
            }).done(function (data) {
                displayService.display(data);
                
                links.getData();
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
        var x = { 'newlink': { 't': target, 'd': desc } };
        
        if ($.trim(target()) === '' || $.trim(desc()) === '') {
            displayService.display('חובה להכניס כתובת ותיאור','error');
            return;
        }
        $.ajax({
            type: "POST",
            url: "./Server/link/add.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: x
        }).done(function (data) {
            clearControl();
            displayService.display(data);
            links.getData();
            app.trigger('audit');
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }
    this.reorder = function (selector) {
        $.ajax({
            type: "POST",
            url: "./Server/reorder.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: { 'list': utilities.getOrder(selector), 'table': 'links' }
        }).done(function (data) {
            links.getData();
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {
        compositionComplete: function () {
            links.getData();
            $.placeholder.fix();

            $(".sortable").sortable({
                placeholder: "ui-state-highlight",
                update: function (event, ui) { reorder(".sortable tr"); }
            });
            $(".sortable").disableSelection();
        },
        addItem: addItem,
        target: target,
        desc: desc,
        itemList: links.linkList,
        remove:remove
    };
});
