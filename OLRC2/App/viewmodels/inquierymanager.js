define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    this.displayService = require('services/displayService');
    this.enums = require('services/enums');

    //members
    this.itemList = ko.observableArray();
    

    //methods

    var getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/user/getinquieries.php?d=" + Date.now(),
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            }
        }).done(function (data) {
            itemList(data);
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }
    
    return {
        getData:getData,
        compositionComplete: function () {
            getData();
            $('table.sortable').shamirSortable(itemList);
            $.placeholder.fix();
        },
        itemList: itemList
    };
});
