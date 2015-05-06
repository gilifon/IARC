define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');

    //members
    this.lessonList = ko.observableArray();
    this.lessonList2 = ko.observableArray();

    //methods
    this.getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/lesson/get.php?d=" + Date.now(),
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
        }).done(function (data) {
            
            //linq to javascript example
            var queryResult = Enumerable.From(data).Where(function (x) { return x.s == '0' }).ToArray();
            lessonList(queryResult);

            var queryResult2 = Enumerable.From(data).Where(function (x) { return x.s == '1' }).ToArray();
            lessonList2(queryResult2);

            $(".fancy").click(function () {
                $.fancybox({
                    'padding': 0,
                    'autoScale': false,
                    'transitionIn': 'none',
                    'transitionOut': 'none',
                    'title': this.title,
                    'width': 1152,
                    'height': 693,
                    'href': this.href.replace(new RegExp("watch\\?v=", "i"), 'v/'),
                    'type': 'iframe'
                });

                return false;
            });

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
        lessonList: lessonList,
        lessonList2: lessonList2,
        getData: getData
    };
});


