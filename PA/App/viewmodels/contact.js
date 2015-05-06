﻿define(function () {

    var shell = require('viewmodels/shell');

    var vm = {
        compositionComplete: function () {
            Contact.initMap();
        },
        activate: function () {
            shell.selectedSubMenu('');
            shell.selectedMainMenu('contact');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});