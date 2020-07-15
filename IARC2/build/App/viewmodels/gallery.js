define(function () {

    var shell = require('viewmodels/shell');

    //properties
    this.list = ko.observableArray();

    //methods
    this.getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/get_videos.php?d=" + Date.now(),
        }).done(function (data) {
            list(data);
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    var vm = {
        compositionComplete: function (view) {
            getData();
        },
        activate: function () {
            shell.selectedSubMenu('videogallery');
            shell.selectedMainMenu('gallery');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});