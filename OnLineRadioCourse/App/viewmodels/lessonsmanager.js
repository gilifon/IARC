define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    this.displayService = require('services/displayService');
    this.lessons = require('viewmodels/lessons');

    //members
    var section = ko.observable('1');
    var desc = ko.observable('');
    var filename = ko.observable('');

    //methods
    this.remove = function (lesson) {
        if (confirm('You are about to delete this lesson. Are you sure?')) {
            $.ajax({
                type: "POST",
                url: "./Server/lesson/delete.php",
                headers: {
                    "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
                },
                data: { 'lesson': lesson }
            }).done(function (data) {
                displayService.display(data);
                
                lessons.getData();
            }).error(function (xhr, ajaxOptions, thrownError) {
                alert(jQuery.parseJSON(xhr.responseText).error);
            });

        }

    }
    this.clearControl = function () {
        desc('');
        filename('');
        cancelFile();
    }
    this.cancelFile = function () {
        var control = $('#fileToUpload');
        var newControl = control.clone();
        newControl.on('change', submit);
        control.replaceWith(newControl);
    }
    this.addItem = function () {
        var x = { 'newlesson': { 't': filename, 'd': desc, 's': section } };

        if ($.trim(desc()) === '') {
            displayService.display('חובה להכניס תיאור', 'error');
            return;
        }
        $.ajax({
            type: "POST",
            url: "./Server/lesson/add.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: x
        }).done(function (data) {
            clearControl()
            displayService.display(data);
            lessons.getData();
        }).error(function (xhr, ajaxOptions, thrownError) {
            clearControl();
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }
    this.browseClick = function () {
        $('#fileToUpload').trigger('click');
    }
    this.submit = function () {
        filename($("#fileToUpload").val().split(/(\\|\/)/g).pop());
        if (desc() === '') {
            displayService.display('חובה להכניס תיאור', 'error');
            clearControl();
            return false;
        }
        $.ajaxFileUpload
		(
			{
			    url: 'Server/doajaxfileupload.php',
			    secureuri: false,
			    fileElementId: 'fileToUpload',
			    dataType: 'json',
			    data: { name: 'logan', id: 'id' },
			    success: function (data, status) {
			        if (typeof (data.error) != 'undefined') {
			            if (data.error != '') {
			                displayService.display(data.error, 'error');
			                clearControl();
			            }
			            else {
			                addItem();
			            }
			        }
			    },
			    error: function (data, status, e) {
			        displayService.display(e, 'error');
			        clearControl();
			    }
			}
		)
        return false;
    }
    this.reorder = function (selector) {
        $.ajax({
            type: "POST",
            url: "./Server/reorder.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: { 'list': utilities.getOrder(selector), 'table': 'lessons' }
        }).done(function (data) {
            lessons.getData();
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {
        viewAttached: function () {
            lessons.getData();
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
        desc: desc,
        section:section,
        itemList: lessons.lessonList,
        itemList2: lessons.lessonList2,
        remove: remove,
        submit: submit,
        cancelFile: cancelFile
    };
});
