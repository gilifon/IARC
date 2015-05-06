define(function () {
    var httpGet = function (url, query, headers) {
        return $.ajax({
            type: 'GET',
            url: url,
            data: query,
            contentType: 'application/json',
            headers: headers
        });
    };

    var httpPost = function (url, data, headers) {
        return $.ajax({
            url: url,
            //data: ko.toJSON(data),
            data: data,
            type: 'POST',
            //contentType: 'application/json',
            //dataType: 'json',
            headers: headers
        });
    };

    var httpService = {
        get: httpGet,
        post: httpPost
    };

    return httpService;
});