define(['services/holylandUtility'], function (holylandUtility) {

    var shell = require('viewmodels/shell');
    var initMap = function (position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var myLatlng = new google.maps.LatLng(lat, lng);
        var mapOptions = { center: new google.maps.LatLng(32.01258834091205, 34.816575050354004), zoom: 12 };
        var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        var marker = new google.maps.Marker({
            position: myLatlng,
            map: map,
            title: 'Good Luck in Holyland Contest!'
        });

        var drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYGON,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [
                  google.maps.drawing.OverlayType.POLYGON,
                ]
            }
        });
        drawingManager.setMap(map);

        google.maps.event.addListener(drawingManager, 'polygoncomplete', function (polygon) {
            var coordinates = (polygon.getPath().getArray());
            console.log(coordinates);
            for (var i=0; i<coordinates.length; i++)
            {
                console.log('lat:' + coordinates[i].lat() + ' lng: ' + coordinates[i].lng());
            }
        });

        ko.utils.arrayForEach(holylandUtility.Areas(), function (area) {
            area.poly.setMap(map);
        });

    }

    var setAreas = function (position)
    {
        initMap(position);
        var square = holylandUtility.getAreaByPosition(position);
        $('#square').html(square);
    }

    var vm = {
        compositionComplete: function () {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(setAreas);

            } else {
                x.innerHTML = "Geolocation is not supported by this browser.";
            }

        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});