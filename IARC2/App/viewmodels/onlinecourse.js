define(['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {    

    var shell = require('viewmodels/shell');

    var firstname = ko.observable();
    var lastname = ko.observable();
    var efirstname = ko.observable();
    var elastname = ko.observable();
    var email = ko.observable();
    var birthdate = ko.observable();
    var id = ko.observable();
    var country = ko.observable();
    var gender = ko.observable('m');
    var city = ko.observable();
    var address = ko.observable();
    var house = ko.observable();
    var zip = ko.observable();
    var phone = ko.observable();
    var mobile = ko.observable();
    var reason = ko.observable();
    var cv = ko.observable();
    var file = ko.observable();
    var paymentfile = ko.observable();
    var uploader;
    var uploader2;

    var Clear = function () {
        $('#registration-form').parsley().reset();
        firstname("");
        lastname("");
        efirstname("");
        elastname("");
        email("");
        birthdate("");
        id("");
        country("");
        gender('m');
        city("");
        address("");
        house("");
        zip("");
        phone("");
        mobile("");
        reason("");
        cv("");
        file("");
        uploader.removeCurrent();
    }

    var Send = ko.asyncCommand({
        execute: function (complete) {
            $('#registration-form').parsley().validate();
            if ($('#registration-form').parsley().isValid()) {
                if (uploader.getQueueSize() > 0) {
                    uploader.submit();
                }
                else {
                    if (uploader2.getQueueSize() > 0) {
                        uploader2.submit();
                    }
                    else {
                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': Date.now(), 'filename': ''
                            }
                        };
                        httpService.post("/ws/register_online_course.php", info).done(function (data) { alert("OK! " + data); Clear(); complete(true); }).error(function () { alert("Oops, an error has occured"); utilities.handleError(); complete(true); });
                    }
                }
            }
            else {
                complete(true);
            }
        },
        canExecute: function (isExecuting) {
            //return !isExecuting;
            return true;
        }
    });

    this.safe_tags = function (str) {
        return String(str)
                 .replace(/&/g, '&amp;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#39;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');
    }

    var SetTooltips = function ()
    {
        $('#mobile').tooltip();
        $('#phone').tooltip();
        $('#id').tooltip();
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('onlinecourse');
            shell.selectedMainMenu('aguda');
            ko.bindingHandlers.datetimepicker = {
                init: function (element, valueAccessor, allBindingsAccessor) {
                    $(element).datetimepicker({
                        format: 'dd/MM/yyyy HH:mm:ss PP',
                        language: 'en',
                        pick12HourFormat: true
                    }).on("changeDate", function (ev) {
                        var observable = valueAccessor();
                        observable(ev.date);
                    });
                },
                update: function (element, valueAccessor) {
                    var value = ko.utils.unwrapObservable(valueAccessor());
                    $(element).datetimepicker("setValue", value);
                }
            };
        },
        compositionComplete: function () {
            SetTooltips();
            $('#birthdate').datetimepicker({
                pickTime: false
            });
            $("#birthdate").on("dp.change", function (e) {
                birthdate(moment(e.date).format('DD-MM-YYYY'));
            });
            $('#firstname').focus();

            var btn = document.getElementById('upload-btn'),
            btn2 = document.getElementById('payment-btn'),
                
       wrap = document.getElementById('pic-progress-wrap'),
       picBox = document.getElementById('picbox'),
       errBox = document.getElementById('errormsg');


            uploader = new ss.SimpleUpload({
                button: btn,
                url: '/ws/uploadHandler.php?dir=img',
                //progressUrl: '/ws/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                maxSize: 600,
                //allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
                accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (filename, extension, btn) {
                    file(filename);
                },
                onExtError: function (filename, extension) {
                    alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only PNG, JPG, and GIF files are allowed.');
                },
                onSizeError: function (filename, fileSize) {
                    alert(filename + ' is too big. (600K max file size)');
                },
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
                    prog.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(filename) + ' - </span>';
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
                onComplete: function (filename, response) {
                    file(response.file);
                    if (uploader2.getQueueSize() > 0) {
                        uploader2.submit();
                    }
                    else 
                    {
                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': response.timestamp, 'filename': file, 'paymentfilename': paymentfile
                            }
                        };
                        httpService.post("/ws/register_online_course.php", info).done(function (data) { alert("Very well! " + data); Clear(); }).error(function () { utilities.handleError(); });
                    }
                }
            });

            


            uploader2 = new ss.SimpleUpload({
                button: btn2,
                url: '/ws/uploadHandler.php?dir=payment',
                //progressUrl: '/ws/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                maxSize: 600,
                //allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
                accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (filename, extension, btn) {
                    paymentfile(filename);
                },
                onExtError: function (filename, extension) {
                    alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only PNG, JPG, and GIF files are allowed.');
                },
                onSizeError: function (filename, fileSize) {
                    alert(filename + ' is too big. (600K max file size)');
                },
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
                    prog.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(filename) + ' - </span>';
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
                onComplete: function (filename, response) {
                    if (!response) {
                        errBox.innerHTML = 'Unable to upload file';
                        return;
                    }
                    if (response.success === true) {
                        paymentfile(response.file);
                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': response.timestamp, 'filename': file, 'paymentfilename': paymentfile
                            }
                        };
                        httpService.post("/ws/register_online_course.php", info).done(function (data) { alert("Very well! " + data); Clear(); }).error(function () { utilities.handleError(); });

                    } else {
                        if (response.msg) {
                            errBox.innerHTML = response.msg;
                        } else {
                            errBox.innerHTML = 'Unable to upload file';
                        }

                    }
                }
            });
            


        },
        firstname: firstname,
        lastname: lastname,
        efirstname: efirstname,
        elastname: elastname,
        email: email,
        birthdate: birthdate,
        id: id,
        country: country,
        gender: gender,
        city: city,
        address: address,
        house: house,
        zip: zip,
        phone: phone,
        mobile: mobile,
        reason: reason,
        cv: cv,
        file: file,
        paymentfile: paymentfile,
        Clear: Clear,
        Send: Send,
        uploader: uploader,
        uploader2: uploader2
    };


    return vm;
});
