define(function (require) {
    
    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');

    //properties
    this.linkList = ko.observableArray();

    //methods
    this.getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/link/get.php?d=" + Date.now(),
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            }
        }).done(function (data) {
            linkList(data);
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {

        viewAttached: function (view) {
            getData();
        },
        activate: function () {

        },
        linkList: linkList,
        getData: getData
    };
});
