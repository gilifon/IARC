define(function () {

    var shell = require('viewmodels/shell');

    var activeImage = ko.observable('1');
    var getActiveImage = function ()
    {
        return Math.floor(Math.random() * 7 + 1);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('');
            shell.selectedMainMenu('main');
            activeImage(getActiveImage());
        },
        compositionComplete: function ()
        {
            //$('.carousel').carousel({
            //    interval: 5000,
            //    pause: 'none'
            //});
            //$('.tooltips').tooltip();
            //$('.popovers').popover();
        },
        getActiveImage: getActiveImage,
        activeImage: activeImage
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});