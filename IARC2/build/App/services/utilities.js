define(function () {

    base64Keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";
    base64Encode = function (input) {
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4, i, output;
        output = "";
        i = 0;
        input = utf8Encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = "" + output + (base64Keys.charAt(enc1)) + (base64Keys.charAt(enc2)) + (enc3 < 64 ? base64Keys.charAt(enc3) : '') + (enc4 < 64 ? base64Keys.charAt(enc4) : '');
        }
        return output;
    };

    utf8Encode = function (string) {
        var c, s, utftext, _i, _len, _ref;
        string = string.replace(/\r\n/g, "\n");
        utftext = "";
        _ref = string.split('');
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            s = _ref[_i];
            c = s.charCodeAt(0);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if (c > 127 && c < 2048) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    };
    var applyRowSearch = function (searchItem, val) {
        var lval = val.toLowerCase();
        $(searchItem).each(function () {
            if ($(this).text().toLowerCase().indexOf(lval) < 0)
                $(this).hide();
            else $(this).show();
        });
        //if ($(searchItem).children().length == 0)
        //{
        //    $(searchItem).parent().parent().hide();
        //}
    }

    var handleError = function (xhr, ajaxOptions, thrownError) {
        try
        {
            var err = jQuery.parseJSON(xhr.responseText).error;
            alert("There was an error: " + err);
        }
        catch (ex)
        {
            alert(thrownError);
        }
        
    }

    var getBase64Auth = function (username, password) {
        var tok = username + ':' + password;
        var hash = base64Encode(tok);
        return hash;
    };

    var utilities = {
        base64Encode: base64Encode,
        getBase64Auth: getBase64Auth,
        applyRowSearch: applyRowSearch,
        handleError: handleError
    };
    return utilities;
});