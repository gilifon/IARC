define(['services/cachingService', 'services/utilities'],
    function (cachingService, utilities) {

    var role = ko.observable(cachingService.get('role'));

    return {
        activate: function() {
            role(cachingService.get('role'));
        },
        Image: 'Content/images/Ham_Radio.png',
        role: role
    };
});
