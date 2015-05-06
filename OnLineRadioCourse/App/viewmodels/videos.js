define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');

    //members
    this.videoList = ko.observableArray();
    this.videoList2 = ko.observableArray();

    //methods
    this.getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/video/get.php?d=" + Date.now(),
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
        }).done(function (data) {
            //videoList(data);
            
            //linq to javascript example
            var queryResult = Enumerable.From(data).Where(function (x) { return x.s == '0' }).ToArray();
            videoList(queryResult);

            var queryResult2 = Enumerable.From(data).Where(function (x) { return x.s == '1' }).ToArray();
            videoList2(queryResult2);

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
                    'type': 'swf',
                    'swf': {
                        'wmode': 'transparent',
                        'allowfullscreen': 'true'
                    }
                });

                return false;
            });

        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {
        viewAttached: function (view, parent) {
            getData(view);
            
        },
        activate: function () {
            
        },
        videoList: videoList,
        videoList2: videoList2,
        getData: getData
    };
});
