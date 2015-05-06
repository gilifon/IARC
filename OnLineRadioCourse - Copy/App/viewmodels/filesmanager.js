define(function (require) {
    
    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    this.displayService = require('services/displayService');
    this.files = require('viewmodels/files');

    //members
    var desc = ko.observable('');
    var filename = ko.observable('');

    //methods
    this.remove = function (file) {
        if (confirm('You are about to delete this file. Are you sure?')) {
            $.ajax({
                type: "POST",
                url: "./Server/file/delete.php",
                headers: {
                    "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
                },
                data: { 'file': file }
            }).done(function (data) {
                displayService.display(data);
                files.getData();
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
        var x = { 'newfile': { 't': filename, 'd': desc } };

        if ($.trim(desc()) === '') {
            displayService.display('חובה להכניס תיאור', 'error');
            return;
        }
        $.ajax({
            type: "POST",
            url: "./Server/file/add.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: x
        }).done(function (data) {
            clearControl()
            displayService.display(data);
            files.getData();
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
    this.reorder = function () {
        $.ajax({
            type: "POST",
            url: "./Server/reorder.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: { 'list': utilities.getOrder(), 'table': 'files' }
        }).done(function (data) {
            files.getData();
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }
    
    return {
        viewAttached: function () {
            files.getData();
            $.placeholder.fix();

            $(".sortable").sortable({
                placeholder: "ui-state-highlight",
                update: function (event, ui) { reorder(); }
            });
            $(".sortable").disableSelection();
        },
        addItem: addItem,
        desc: desc,
        itemList: files.fileList,
        remove: remove,
        submit: submit,
        cancelFile: cancelFile
    };
});
