define(['services/utilities', 'services/httpService', 'services/cachingService', 'services/displayService'], function (utilities, httpService, cachingService, displayService) {

    var shell = require('viewmodels/shell');

    var uid = ko.observable();
    var firstname = ko.observable();
    var lastname = ko.observable();
    var efirstname = ko.observable();
    var elastname = ko.observable();
    var email = ko.observable();
    var licensenum = ko.observable();
    var callsign = ko.observable();
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
    var oldfile = ko.observable();
    var file = ko.observable();
    var family_head = ko.observable();
    var membership = ko.observableArray();
    var licenseclasses = ko.observableArray([{ text: 'דרגה א', value: 'A' }, { text: 'דרגה ב', value: 'G' }, { text: 'דרגה ג', value: 'N' }, { text: 'דרגה ד', value: 'T' }, { text: 'מאזין', value: 'SWL' }]);
    var licenseclass = ko.observable();
    var isEdit = ko.observable('0');
    var uploader;
    
    var Clear = function () {
        $('#registration-form').parsley().reset();
        $('#picbox').html('<img width="100%" src="http://www.iarc.org/members/images/noImage.jpg">');
        uid("");
        firstname("");
        lastname("");
        efirstname("");
        elastname("");
        email("");
        licensenum("");
        callsign("");
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
        file("");
        family_head(0);
        licenseclass("");
        uploader.removeCurrent();
    }

    var SetForm = function (data) {
        $('#registration-form').parsley().reset();
        isEdit('0');
        uid(data.details.uniq);
        firstname(data.details.name_heb);
        lastname(data.details.family_heb);
        efirstname(data.details.family_eng);
        elastname(data.details.name_eng);
        email(data.details.email_fwd);
        licensenum(data.details.moc_id);
        callsign(data.details.call);
        birthdate(data.details.dob);
        id(data.details.ID);
        country(data.details.country);
        gender(data.details.gender);
        city(data.details.city);
        address(data.details.address);
        house(data.details.apart);
        zip(data.details.zipcode);
        phone(data.details.tel);
        mobile(data.details.cel);
        licenseclass(data.details.moc_lic);
        family_head(data.details.family_head);
        oldfile(data.details.image);
        $.each(data.history, function (i, d) {
            membership.push(d.year.toString());
        });
        $('#picbox').html((data.details.image != '') ? '<img width="100%" src="http://www.iarc.org/members/images/' + encodeURIComponent(data.details.image) + '">' : '<img width="100%" src="http://www.iarc.org/members/images/noImage.jpg">');
    }
    //var ImageGen = function ()
    //{
    //    httpService.post("/ws/image_gen.php").
    //        done(function (data) {
    //            alert("OK! " + data)
    //        }).
    //        error(function () {
    //            alert("Oops, an error has occured"); utilities.handleError();
    //        });
    //}
    var Send = ko.asyncCommand({
        execute: function (complete) {
            $('#registration-form').parsley().validate();
            if ($('#registration-form').parsley().isValid()) {
                $('#registration-form').parsley().reset();
                if (uploader.getQueueSize() > 0) {
                    uploader.submit();
                }
                else {
                    var info = {
                        'info':
                        {
                            'uid': uid(), 'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                            'email': email(), 'licensenum': licensenum(), 'callsign': callsign(), 'birthdate': birthdate(),
                            'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                            'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                            'mobile': mobile(), 'licenseclass': licenseclass(), 'timestamp': Date.now(), 'filename': '', 'oldfile': oldfile(), updatefile: false
                        }
                    };
                    httpService.post("/ws/private_area/setuserinfo.php", info).
                        done(function (data) {
                            if (data.success) {
                                displayService.display('העדכון נשמר בהצלחה.');
                            }
                            else {
                                utilities.handleError();
                            }
                            complete(true);
                        }).
                        error(function () {
                            utilities.handleError();
                            complete(true);
                        });
                }
            }
            else {
                complete(true);
            }
        },
        canExecute: function (isExecuting) {
            return !isExecuting;
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
        $('#licensenum').tooltip();
        $('#callsign').tooltip();
    }

    var vm = {
        activate: function () {

            shell.selectedMainMenu('details');
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
            httpService.get("/ws/private_area/getuserinfo.php", '', {
                "Authorization": cachingService.get('Auth')
            }).done(function (data) {
                SetForm(data);
            }).error(utilities.handleError);

            SetTooltips();
            $('#birthdate').datetimepicker({
                pickTime: false
            });
            $("#birthdate").on("dp.change", function (e) {
                birthdate(moment(e.date).format('YYYY-MM-DD'));
            });
            $('#firstname').focus();
 

            var btn = document.getElementById('upload-btn'),
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
                maxSize: 100,
                allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
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
                    alert(filename + ' is too big. (100K max file size)');
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
                        complete(true);
                        return;
                    }
                    if (response.success === true) {
                        picBox.innerHTML = '<img width="100%" src="http://www.iarc.org/members/images/' + encodeURIComponent(response.file) + '">';

                        var info = {
                            'info':
                            {
                                'uid': uid(), 'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'licensenum': licensenum(), 'callsign': callsign(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'licenseclass': licenseclass(), 'timestamp': Date.now(), 'filename': response.file, 'oldfile': oldfile(), updatefile: true
                            }
                        };
                        httpService.post("/ws/private_area/setuserinfo.php", info).
                        done(function (data) {
                            if (data.success) {
                                displayService.display('העדכון נשמר בהצלחה.');
                            }
                            else {
                                utilities.handleError();
                            }
                            complete(true);
                        }).
                        error(function () {
                            utilities.handleError();
                            complete(true);
                        });

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
        uid: uid,
        firstname: firstname,
        lastname: lastname,
        efirstname: efirstname,
        elastname: elastname,
        email: email,
        licensenum: licensenum,
        callsign: callsign,
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
        file: file,
        oldfile: oldfile,
        Clear: Clear,
        Send: Send,
        licenseclasses: licenseclasses,
        licenseclass: licenseclass,
        membership: membership,
        family_head: family_head,
        uploader: uploader,
        isEdit: isEdit
        //ImageGen: ImageGen
    };


    return vm;
});



