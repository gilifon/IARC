define(function (require) {
    
    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');

    //members
    this.fileList = ko.observableArray();

    //methods
    this.getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/file/get.php?d=" + Date.now(),
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            }
        }).done(function (data) {
            fileList(data);
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {
        viewAttached: function () {
            getData();
        },
        activate: function () {
            
        },
        fileList: fileList,
        getData: getData
    };
});
