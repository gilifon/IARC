define(function (require) {
    
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');

    //this.presentationList = ko.observableArray([
    //    { d: 'קבלים נגדים וסלילים', t: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', i: 1 },
    //    { d: 'מגברים', t: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', i: 2 },
    //    { d: 'אנטנות', t: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', i: 3 },
    //    { d: 'נהלי קשר ובטיחות', t: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', i: 4 },
    //    { d: 'הכנה וחזרות לקראת המבחן', t: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', i: 5 }
    //]);

    this.presentationList = ko.observableArray();

    var getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/presentation/get.php?d=" + Date.now(),
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            }
        }).done(function (data) {
            presentationList(data);

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
        viewAttached: function () {

            getData();

            


        },
        activate: function () {
            
        },
        presentationList: presentationList,
        getData:getData
    };
});
