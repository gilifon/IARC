define(function () {

    var shell = require('viewmodels/shell');

    var initMap = function () {

        //OLD VERSION
        //map = new GMaps({
        //    div: '#map',
        //    lat: 32.034412,
        //    lng: 34.893830
        //});
        //var marker = map.addMarker({
        //    lat: 32.034412,
        //    lng: 34.893830,
        //    title: 'Loop, Inc.'
        //});

        var latlng1 = new google.maps.LatLng(32.034412, 34.893830);
        var latlng2 = new google.maps.LatLng(32.054412, 34.873830);
        var mapOptions = {
            center: latlng1,
            zoom: 15
        };
        var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        //map.data.loadGeoJson('https://storage.googleapis.com/maps-devrel/google.json');

        var marker = new google.maps.Marker({ position: latlng1, map: map, animation: google.maps.Animation.DROP, title: "בנין חיל הקשר" });

        //var R1 = {
        //    strokeColor: '#000066',
        //    strokeOpacity: 0.8,
        //    strokeWeight: 1,
        //    fillColor: '#000066',
        //    fillOpacity: 0.35,
        //    map: map,
        //    center: latlng1,
        //    radius: 500
        //};
        //var R2 = {
        //    strokeColor: '#660000',
        //    strokeOpacity: 0.8,
        //    strokeWeight: 1,
        //    fillColor: '#660000',
        //    fillOpacity: 0.35,
        //    map: map,
        //    center: latlng2,
        //    radius: 700
        //};
        //// Add the circle for this city to the map.
        //C1 = new google.maps.Circle(R1);
        //C2 = new google.maps.Circle(R2);

        //google.maps.event.addListener(C1, 'mouseover', function () {
        //    C2.set('strokeOpacity', 0.1);
        //    C2.set('fillOpacity', 0.1);
        //});
        //google.maps.event.addListener(C1, 'mouseout', function () {
        //    C2.set('strokeOpacity', 0.8);
        //    C2.set('fillOpacity', 0.35);
        //});
        //google.maps.event.addListener(C2, 'mouseover', function () {
        //    C1.set('strokeOpacity', 0.1);
        //    C1.set('fillOpacity', 0.1);
        //});
        //google.maps.event.addListener(C2, 'mouseout', function () {
        //    C1.set('strokeOpacity', 0.8);
        //    C1.set('fillOpacity', 0.35);
        //});

    }

    var vm = {
        compositionComplete: function () {
            initMap();
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