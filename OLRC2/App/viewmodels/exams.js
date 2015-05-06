define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');

    //properties
    this.examList = ko.observableArray();

    //methods
    this.getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/exam/get.php?d=" + Date.now(),
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            }
        }).done(function (data) {
            examList(data);
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {
        
        compositionComplete: function (view) {
            getData();
        },
        activate: function () {
            
        },
        examList: examList,
        getData: getData
    };
});


