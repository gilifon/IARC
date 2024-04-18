define(['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {

    var shell = require('viewmodels/shell');


    var name = ko.observable();
    var email = ko.observable();
    var callsign = ko.observable();
    var operator = ko.observable();
    var operators = ko.observableArray(['SINGLE-OP', 'MULTI-OP', "SWL", "CHECKLOG"]);
    var overlays = ko.observableArray(["NONE", "PORTABLE", "M5", "M10", "YN"]);
    var overlay = ko.observable();
    var band = ko.observable();
    var bands = ko.observableArray(["ALL", "80", "40", "20", "15", "10"]);
    var mode = ko.observable();
    var modes = ko.observableArray(["MIX", "SSB", "CW"]);
    var power = ko.observable();
    var powers = ko.observableArray(["HIGH","LOW","QRP"]);
    var file = ko.observable();
    var uploader;

    var Clear = function () {
        $('#registration-form').parsley().reset();
        name("");
        email("");
        callsign("");
        operator("");
        overlay("");
        band("");
        mode("");
        power("");
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
                    displayService.display('Do not forget to select your log file', 'error');
                }
            }
            complete(true);
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

    var SetTooltips = function () {
        $('#mobile').tooltip();
        $('#phone').tooltip();
        $('#id').tooltip();
        $('#licensenum').tooltip();
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('logupload');
            shell.selectedMainMenu('holyland');
        },
        compositionComplete: function () {
            SetTooltips();
            $('.operator_selectpicker').selectpicker();
            $('.band_selectpicker').selectpicker();
            $('.mode_selectpicker').selectpicker();
            $('.power_selectpicker').selectpicker();
            $('.overlay_selectpicker').selectpicker();
            var btn = document.getElementById('upload-btn'),
       wrap = document.getElementById('pic-progress-wrap'),
       picBox = document.getElementById('picbox'),
       errBox = document.getElementById('errormsg');


            uploader = new ss.SimpleUpload({
                button: btn,
                url: 'Server/uploadHandler.php?dir=log',
                //progressUrl: 'Server/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                maxSize: 300,
                allowedExtensions: ['txt', 'cabrillo.txt', 'log', 'cbr'],
                //accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (filename, extension, btn) {
                    file(filename);
                },
                onExtError: function (filename, extension) {
                    //alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only ADI, ADIF, and CAB files are allowed.');
                    displayService.display(filename + ' is not a permitted file type.' + "\n\n" + 'Only TXT, LOG and CBR files are allowed.', 'error');
                },
                onSizeError: function (filename, fileSize) {
                    //alert(filename + ' is too big. (300K max file size)');
                    displayService.display(filename + ' is too big. (300K max file size)', 'error');
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
                        overlay_val = $('.overlay_selectpicker').val();
                        var info = {
                            'info':
                            {
                                'name': name(), 'email': email(), 'callsign': callsign(), 'operator': $('.operator_selectpicker').val(), 'overlay': (overlay_val == "NONE") ? "" : overlay_val, 'band': $('.band_selectpicker').val(), 'mode': $('.mode_selectpicker').val(), 'power': $('.power_selectpicker').val(), 'timestamp': response.timestamp, 'filename': response.file
                                //'timestamp': response.timestamp, 'filename': response.file
                            }
                        };
                        httpService.post("Server/upload_log.php", info).done(function (data) {
                            if (data.success === true) {
                                displayService.display(data.msg);
                                httpService.get("Server/calculate_holyland_results.php");
                            }
                            else {
                                displayService.display(data.msg, 'error');
                            }
                            Clear();
                        }).error(function () { utilities.handleError(); });

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
        name: name,
        email: email,
        callsign: callsign,
        operator: operator,
        operators: operators,
        overlay: overlay,
        overlays: overlays,
        band: band,
        bands: bands,
        mode: mode,
        modes: modes,
        power: power,
        powers: powers,
        file: file,
        Clear: Clear,
        Send: Send,
        uploader: uploader
    };


    return vm;
});



