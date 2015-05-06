define(['durandal/app', 'services/cachingService', 'services/utilities', 'services/displayService', 'viewmodels/login'],
    function (app, cachingService, utilities, displayService, login) {

    //members
    this.lessonList = ko.observableArray();
    this.lessonList2 = ko.observableArray();
    this.lessonList3 = ko.observableArray();

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

            var queryResult3 = Enumerable.From(data).Where(function (x) { return x.s == '2' }).ToArray();
            lessonList3(queryResult3);

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
        
        compositionComplete: function (view) {
            getData();
        },
        activate: function () {
            
        },
        lessonList: lessonList,
        lessonList2: lessonList2,
        lessonList3: lessonList3,
        getData: getData,
        course: login.course,
        isadmin: login.isadmin
    };
});


