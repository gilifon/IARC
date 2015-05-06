define(function (require) {

    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    
    var role = ko.observable(cachingService.get('role'));

    return {
        activate: function() {
            role(cachingService.get('role'));
        },
        Image: 'Content/images/Ham_Radio.png',
        role: role
    };
});
