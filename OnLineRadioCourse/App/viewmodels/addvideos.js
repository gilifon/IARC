define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    this.displayService = require('services/displayService');
    this.videos = require('viewmodels/videos');

    //members
    var target = ko.observable('');
    var desc = ko.observable('');

    //methods
    this.remove = function (video) {
        if (confirm('You are about to delete this video. Are you sure?')) {
            $.ajax({
                type: "POST",
                url: "./Server/video/delete.php",
                headers: {
                    "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
                },
                data: { 'video': video }
            }).done(function (data) {
                displayService.display(data);
                videos.getData();
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
        var x = { 'newvideo': { 't': target, 'd': desc } };
        
        if ($.trim(target()) === '' || $.trim(desc()) === '') {
            displayService.display('חובה להכניס כתובת ותיאור','error');
            return;
        }
        $.ajax({
            type: "POST",
            url: "./Server/video/add.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: x
        }).done(function (data) {
            clearControl();
            displayService.display(data);
            videos.getData();
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
            data: { 'list': utilities.getOrder(selector), 'table': 'videos'}
        }).done(function (data) {
            videos.getData();
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {
        viewAttached: function () {
            videos.getData();
            $.placeholder.fix();

            $(".sortable1").sortable({
                placeholder: "ui-state-highlight",
                update: function (event, ui) { reorder(".sortable1 tr"); }
            }).disableSelection();

            $(".sortable2").sortable({
                placeholder: "ui-state-highlight",
                update: function (event, ui) { reorder(".sortable2 tr"); }
            }).disableSelection();

        },
        addItem: addItem,
        target: target,
        desc: desc,
        itemList: videos.videoList,
        itemList2: videos.videoList2,
        remove:remove
    };
});
