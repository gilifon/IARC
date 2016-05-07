define(['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {    

    var shell = require('viewmodels/shell');

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
    var reason = ko.observable();
    var cv = ko.observable();
    var file = ko.observable();
    var uploader;

    var Clear = function () {
        $('#registration-form').parsley().reset();
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
                    //displayService.display('שכחת לבחור תמונה', 'error');
                    //complete(true);
                    
                    var info = {
                        'info':
                        {
                            'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                            'email': email(), 'licensenum': licensenum(), 'callsign': callsign(), 'birthdate': birthdate(),
                            'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                            'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                            'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': Date.now(), 'filename': ''
                        }
                    };
                    httpService.post("/ws/register.php", info).done(function (data) { alert("OK! " + data); Clear(); complete(true); }).error(function () { alert("Oops, an error has occured"); utilities.handleError(); complete(true); });
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
        $('#licensenum').tooltip();
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('register');
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
                        //complete(true);
                        return;
                    }
                    if (response.success === true) {
                        //picBox.innerHTML = '<img src="http://www.iarc.org/ws/img_uploads/' + encodeURIComponent(response.file) + '">';

                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'licensenum': licensenum(), 'callsign': callsign(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': response.timestamp, 'filename': response.file
                            }
                        };
                        httpService.post("/ws/register.php", info).done(function (data) { alert("Very well! " + data); Clear(); }).error(function () { utilities.handleError(); });

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
        reason: reason,
        cv: cv,
        file: file,
        Clear: Clear,
        Send: Send,
        uploader: uploader
    };


    return vm;
});

/*

define('viewmodels/register', ["services/utilities", "services/httpService", "services/displayService"], function (t, e, n) {
    var r,
 a,
 i = require("viewmodels/shell"),
 l = ko.observable(),
 s = ko.observable(),
 o = ko.observable(),
 d = ko.observable(),
 c = ko.observable(),
 u = ko.observable(),
 v = ko.observable(),
 p = ko.observable(),
 g = ko.observable(),
 h = ko.observable(),
 m = ko.observable("m"),
 f = ko.observable(),
 b = ko.observable(),
 y = ko.observable(),
 w = ko.observable(),
 x = ko.observable(),
 k = ko.observable(),
 S = ko.observable(),
 A = ko.observable(),
 M = ko.observable(),
 C = ko.observable(),
 R = function () {
     $("#registration-form").parsley().reset(),

 l(""),
 s(""),
 o(""),
 d(""),
 c(""),
 u(""),
 v(""),
 p(""),
 g(""),
 h(""),
 m("m"),
 f(""),
 b(""),
 y(""),
 w(""),
 x(""),
 k(""),
 S(""),
 A(""),
 M(""),
 C(""),
 r.removeCurrent(),
 a.removeCurrent()
 },

 I = ko.asyncCommand({
     execute: function (t) {
         $("#registration-form").parsley().validate();
         //$("#registration-form").parsley().isValid() ? 1 == r.getQueueSize() && 1 == a.getQueueSize() ? r.submit() : (n.display("אל תשכח לצרף תמונה ואישור תשלום", "error"), t(!0)) : t(!0)
         if ($("#registration-form").parsley().isValid())
         {
             r.submit();
             t(!0);
         }
             
     },
     canExecute: function () { return !0 }
 });

    this.safe_tags = function (t) {
        return String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    };

    var T = function () {
        $("#mobile").tooltip(),
    $("#phone").tooltip(),
    $("#id").tooltip(),
    $("#licensenum").tooltip()
    },

D = {
    activate: function () {
        i.selectedSubMenu("register"),
        i.selectedMainMenu("aguda"),
        ko.bindingHandlers.datetimepicker = {
            init: function (t,
            e) {
                $(t).datetimepicker({
                    format: "dd/MM/yyyy HH:mm:ss PP",
                    language: "en",
                    pick12HourFormat: !0
                }).on("changeDate",
                function (t) { var n = e(); n(t.date) })
            },
            update: function (t,
            e) {
                var n = ko.utils.unwrapObservable(e()); $(t).datetimepicker("setValue",
                n)
            }
        }
    },

    compositionComplete: function () {
        T(),
        $("#birthdate").datetimepicker({ pickTime: !1 }),
        $("#birthdate").on("dp.change",
        function (t) { p(moment(t.date).format("DD-MM-YYYY")) }),
        $("#firstname").focus(); var n = document.getElementById("upload-btn"),
        i = document.getElementById("pic-progress-wrap"),
        I = document.getElementById("payment-btn"),
        D = document.getElementById("payment-progress-wrap"); document.getElementById("picbox"); var _ = document.getElementById("errormsg");
        r = new ss.SimpleUpload({
            button: n,
            url: "/ws/uploadHandler.php?dir=img",
            name: "uploadfile",
            multiple: !1,
            queue: !1,
            maxUploads: 1,
            allowedExtensions: ["jpg", "jpeg", "png", "gif"],
            accept: "image/*",
            hoverClass: "btn-hover",
            focusClass: "active",
            disabledClass: "disabled",
            responseType: "json",
            autoSubmit: !1,
            onChange: function (t) { M(t) },
            onExtError: function (t) { alert(t + " is not a permitted file type." + "\n\n" + "Only PNG, JPG, and GIF files are allowed.") },
            onSizeError: function (t) { alert(t + " is too big. (100K max file size)") },
            onSubmit: function (t) {
                var e = document.createElement("div"),
                n = document.createElement("div"),
                r = document.createElement("div"),
                a = document.createElement("div"); e.className = "prog",
                a.className = "size",
                n.className = "progress progress-striped active",
                r.className = "progress-bar progress-bar-success",
                n.appendChild(r),
                e.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(t) + " - </span>",
                e.appendChild(a),
                e.appendChild(n),
                i.appendChild(e),
                this.setProgressBar(r),
                this.setProgressContainer(e),
                this.setFileSizeBox(a),
                _.innerHTML = ""
            },
            startXHR: function () {
                var t = document.createElement("button");
                i.appendChild(t),
                t.className = "btn btn-sm btn-info",
                t.innerHTML = "Cancel",
                this.setAbortBtn(t,
                !0)
            },
            onComplete: function (t,
            e) {
                return e ? (e.success === !0 ? (M(e.file),
                a.submit()) : _.innerHTML = e.msg ? e.msg : "Unable to upload file",
                void 0) : (_.innerHTML = "Unable to upload file",
                void 0)
            }
        }),
        a = new ss.SimpleUpload({
            button: I,
            url: "/ws/uploadHandler.php?dir=payment",
            name: "uploadfile",
            multiple: !1,
            queue: !1,
            maxUploads: 1,
            maxSize: 2e3,
            hoverClass: "btn-hover",
            focusClass: "active",
            disabledClass: "disabled",
            responseType: "json",
            autoSubmit: !1,
            onChange: function (t) { C(t) },
            onExtError: function (t) { alert(t + " is not a permitted file type." + "\n\n" + "Only PNG, JPG, and GIF files are allowed.") },
            onSizeError: function (t) { alert(t + " is too big. (2M max file size)") },
            onSubmit: function (t) {
                var e = document.createElement("div"),
                n = document.createElement("div"),
                r = document.createElement("div"),
                a = document.createElement("div"); e.className = "prog",
                a.className = "size",
                n.className = "progress progress-striped active",
                r.className = "progress-bar progress-bar-success",
                n.appendChild(r),
                e.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(t) + " - </span>",
                e.appendChild(a),
                e.appendChild(n),
                D.appendChild(e),
                this.setProgressBar(r),
                this.setProgressContainer(e),
                this.setFileSizeBox(a),
                _.innerHTML = ""
            },
            startXHR: function () {
                var t = document.createElement("button"); D.appendChild(t),
                t.className = "btn btn-sm btn-info",
                t.innerHTML = "Cancel",
                this.setAbortBtn(t,
                !0)
            },
            onComplete: function (n,
            r) {
                if (!r) return _.innerHTML = "Unable to upload file",
                void 0; if (r.success === !0) {
                    var a = {
                        info: {
                            firstname: l(),
                            lastname: s(),
                            efirstname: o(),
                            elastname: d(),
                            email: c(),
                            licensenum: u(),
                            callsign: v(),
                            birthdate: p(),
                            id: g(),
                            country: h(),
                            gender: m(),
                            city: f(),
                            address: b(),
                            house: y(),
                            zip: w(),
                            phone: x(),
                            mobile: k(),
                            reason: S(),
                            cv: A(),
                            timestamp: r.timestamp,
                            filename: M(),
                            paymentfilename: r.file
                        }
                    }; e.post("/ws/register.php",
                    a).done(function (t) {
                        alert("Very well! " + t),
                        R()
                    }).error(function () { t.handleError() })
                } else _.innerHTML = r.msg ? r.msg : "Unable to upload file"
            }
        })
    },
    firstname: l,
    lastname: s,
    efirstname: o,
    elastname: d,
    email: c,
    licensenum: u,
    callsign: v,
    birthdate: p,
    id: g,
    country: h,
    gender: m,
    city: f,
    address: b,
    house: y,
    zip: w,
    phone: x,
    mobile: k,
    reason: S,
    cv: A,
    file: M,
    paymentfile: C,
    Clear: R,
    Send: I,
    uploader: r,
    payment_uploader: a
};
    return D
});*/