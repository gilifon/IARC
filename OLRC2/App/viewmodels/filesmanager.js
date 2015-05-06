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
    var uploader;

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
        //cancelFile();
    }
    //this.cancelFile = function () {
    //    var control = $('#fileToUpload');
    //    var newControl = control.clone();
    //    newControl.on('change', submit);
    //    control.replaceWith(newControl);
    //}
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
    //this.browseClick = function () {
    //    $('#fileToUpload').trigger('click');
    //}
    //this.submit = function () {
    //    filename($("#fileToUpload").val().split(/(\\|\/)/g).pop());
    //    if (desc() === '') {
    //        displayService.display('חובה להכניס תיאור', 'error');
    //        clearControl();
    //        return false;
    //    }
    //    $.ajaxFileUpload
	//	(
	//		{
	//		    url: 'Server/doajaxfileupload.php',
	//		    secureuri: false,
	//		    fileElementId: 'fileToUpload',
	//		    dataType: 'json',
	//		    data: { name: 'logan', id: 'id' },
	//		    success: function (data, status) {
	//		        if (typeof (data.error) != 'undefined') {
	//		            if (data.error != '') {
	//		                displayService.display(data.error, 'error');
	//		                clearControl();
	//		            }
	//		            else {
	//		                addItem();
	//		            }
	//		        }
	//		    },
	//		    error: function (data, status, e) {
	//		        displayService.display(e, 'error');
	//		        clearControl();
	//		    }
	//		}
	//	)
    //    return false;
    //}
    this.reorder = function (selector) {
        $.ajax({
            type: "POST",
            url: "./Server/reorder.php",
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
            data: { 'list': utilities.getOrder(selector), 'table': 'files' }
        }).done(function (data) {
            files.getData();
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }
    this.Send = function () {
            if (desc() !== '' && uploader.getQueueSize() > 0) {
                uploader.submit();
            }
            else {
                displayService.display('חובה להכניס תיאור', 'error');
                complete(true);
            }
        }
    
    return {
        compositionComplete: function () {
            files.getData();
            $.placeholder.fix();

            $(".sortable").sortable({
                placeholder: "ui-state-highlight",
                update: function (event, ui) { reorder(".sortable tr"); }
            });
            $(".sortable").disableSelection();

            var btn = document.getElementById('upload-btn'),
       wrap = document.getElementById('pic-progress-wrap'),
       picBox = document.getElementById('picbox'),
       errBox = document.getElementById('errormsg');

            uploader = new ss.SimpleUpload({
                button: btn,
                url: './Server/uploadHandler.php?dir=files',
                //progressUrl: '/ws/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                //maxSize: 100,
                //allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
                //accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (file_name, extension, btn) {
                    filename(file_name);
                },
                //onExtError: function (filename, extension) {
                //    alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only PNG, JPG, and GIF files are allowed.');
                //},
                //onSizeError: function (filename, fileSize) {
                //    alert(filename + ' is too big. (100K max file size)');
                //},
                onSubmit: function (filename, ext) {
                    var prog = document.createElement('div'),
                        outer = document.createElement('div'),
                        bar = document.createElement('div'),
                        size = document.createElement('div');

                    prog.className = 'prog';
                    size.className = 'size';
                    outer.className = 'progress progress-striped active';
                    bar.className = 'progress-bar progress-bar-success';

                    outer.appendChild(bar);
                    prog.innerHTML = '<span style="vertical-align:middle;">' + utilities.safe_tags(filename) + ' - </span>';
                    prog.appendChild(size);
                    prog.appendChild(outer);
                    wrap.appendChild(prog); // 'wrap' is an element on the page

                    this.setProgressBar(bar);
                    this.setProgressContainer(prog);
                    this.setFileSizeBox(size);

                    errBox.innerHTML = '';
                    //btn.value = 'Choose another file';

                },
                startXHR: function () {
                    // Dynamically add a "Cancel" button to be displayed when upload begins
                    // By doing it here ensures that it will only be added in browses which 
                    // support cancelling uploads
                    var abort = document.createElement('button');

                    wrap.appendChild(abort);
                    abort.className = 'btn btn-sm btn-info';
                    abort.innerHTML = 'Cancel';

                    // Adds click event listener that will cancel the upload
                    // The second argument is whether the button should be removed after the upload
                    // true = yes, remove abort button after upload
                    // false/default = do not remove
                    this.setAbortBtn(abort, true);
                },
                onComplete: function (file_name, response) {
                    if (!response) {
                        errBox.innerHTML = 'Unable to upload file';
                        complete(true);
                        return;
                    }
                    if (response.success === true) {
                        filename(response.file);
                        addItem();
                    } else {
                        if (response.msg) {
                            errBox.innerHTML = response.msg;
                        } else {
                            errBox.innerHTML = 'Unable to upload file';
                        }
                        complete(true);
                    }
                }
            });
        },
        addItem: addItem,
        desc: desc,
        itemList: files.fileList,
        remove: remove,
        //submit: submit,
        //cancelFile: cancelFile,
        Send: Send
    };
});
