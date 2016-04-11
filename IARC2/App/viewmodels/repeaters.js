define(function () {

    var shell = require('viewmodels/shell');
    var initMap = function () {

        //points
        var repeaters = [
        {
            lat: 30.614596,
            lng: 34.804811,
            description: "ממסר מצפה רמון",
            name: "R0"
        }
        ];

        
        var P0 = new google.maps.LatLng(30.614596, 34.804811);
        var P1 = new google.maps.LatLng(31.768689, 35.216128);
        var P3 = new google.maps.LatLng(32.583741, 35.181742);
        var P7 = new google.maps.LatLng(32.074502, 34.791491);
        var P12 = new google.maps.LatLng(32.762539, 35.018685);
        var P12B = new google.maps.LatLng(29.572127, 34.964874);
        var P12C = new google.maps.LatLng(31.256257, 34.785504);
        var P13 = new google.maps.LatLng(31.344768, 35.049863);
        var P14 = new google.maps.LatLng(32.980831, 35.506225);
        var P15 = new google.maps.LatLng(32.072165, 34.816521);
        var P16 = new google.maps.LatLng(32.315934, 34.862816);
        var P18 = new google.maps.LatLng(32.0553536, 34.8621609);
        var P73 = new google.maps.LatLng(32.764199, 35.016099);
        var P45 = new google.maps.LatLng(33.128886, 35.785405);
        
        
        
        //map
        var mapOptions = { center: new google.maps.LatLng(31.44741, 35.079346), zoom: 8 };
        var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        
        //markers
        var M0 = new google.maps.Marker({ position: P0, map: map, animation: google.maps.Animation.DROP, title: "ממסר מצפה רמון - R0 - 145.000" });
        var M1 = new google.maps.Marker({ position: P1, map: map, animation: google.maps.Animation.DROP, title: "ממסר ירושלים - R1 - 145.625" });
        var M3 = new google.maps.Marker({ position: P3, map: map, animation: google.maps.Animation.DROP, title: "ממסר מגידו - R3 - 145.675" });
        var M7 = new google.maps.Marker({ position: P7, map: map, animation: google.maps.Animation.DROP, title: "ממסר תל-אביב - R7 - 145.775" });
        var M12 = new google.maps.Marker({ position: P12, map: map, animation: google.maps.Animation.DROP, title: "ממסר חיפה - R12 - 144.700" });
        var M12B = new google.maps.Marker({ position: P12B, map: map, animation: google.maps.Animation.DROP, title: "ממסר אילת - R12B - 145.300" });
        var M12C = new google.maps.Marker({ position: P12C, map: map, animation: google.maps.Animation.DROP, title: "ממסר באר-שבע - R12C - 145.300" });
        var M13 = new google.maps.Marker({ position: P13, map: map, animation: google.maps.Animation.DROP, title: "ממסר יתיר - R13 - 145.325" });
        var M14 = new google.maps.Marker({ position: P14, map: map, animation: google.maps.Animation.DROP, title: "ממסר צפת - R14 - 145.350" });
        var M15 = new google.maps.Marker({ position: P15, map: map, animation: google.maps.Animation.DROP, title: "ממסר גבעתיים - R15 - 144.775" });
        var M16 = new google.maps.Marker({ position: P16, map: map, animation: google.maps.Animation.DROP, title: "ממסר נתניה - R16 - 145.400" });
        var M18 = new google.maps.Marker({ position: P18, map: map, animation: google.maps.Animation.DROP, title: "ממסר קרית אונו - R18 - 145.450" });
        var M73 = new google.maps.Marker({ position: P73, map: map, animation: google.maps.Animation.DROP, title: "ממסר חיפה - UHF - R73 - 438.725" });
        var M45 = new google.maps.Marker({ position: P45, map: map, animation: google.maps.Animation.DROP, title: "ממסר בנטל - R4.5 - 145.7125" });

        M73.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');

        var Circ;
        var CircleProp = {
            strokeColor: '#555555',
            strokeOpacity: 0.7,
            strokeWeight: 1,
            fillColor: '#555555',
            fillOpacity: 0.3,
            map: map,
            radius: 70000
        };
        
        var over_func = function (e) {
            if (map.getZoom() < 11) {
                CircleProp.center = e.latLng;
                CircleProp.radius = e.radius;
                Circ = new google.maps.Circle(CircleProp);
                Circ.setMap(map);
            }
        }
        var out_func = function (e) {
            Circ.setMap(null);
        }
        google.maps.event.addListener(M0, 'mouseover', function (e) { e.radius = 80000; over_func(e); });
        google.maps.event.addListener(M0, 'mouseout', out_func);
        google.maps.event.addListener(M1, 'mouseover', function (e) { e.radius = 70000; over_func(e); });
        google.maps.event.addListener(M1, 'mouseout', out_func);
        google.maps.event.addListener(M3, 'mouseover', function (e) { e.radius = 60000; over_func(e); });
        google.maps.event.addListener(M3, 'mouseout', out_func);
        google.maps.event.addListener(M7, 'mouseover', function (e) { e.radius = 70000; over_func(e); });
        google.maps.event.addListener(M7, 'mouseout', out_func);
        google.maps.event.addListener(M12, 'mouseover', function (e) { e.radius = 80000; over_func(e); });
        google.maps.event.addListener(M12, 'mouseout', out_func);
        google.maps.event.addListener(M12B, 'mouseover', function (e) { e.radius = 60000; over_func(e); });
        google.maps.event.addListener(M12B, 'mouseout', out_func);
        google.maps.event.addListener(M12C, 'mouseover', function (e) { e.radius = 80000; over_func(e); });
        google.maps.event.addListener(M12C, 'mouseout', out_func);
        google.maps.event.addListener(M13, 'mouseover', function (e) { e.radius = 70000; over_func(e); });
        google.maps.event.addListener(M13, 'mouseout', out_func);
        google.maps.event.addListener(M14, 'mouseover', function (e) { e.radius = 130000; over_func(e); });
        google.maps.event.addListener(M14, 'mouseout', out_func);
        google.maps.event.addListener(M15, 'mouseover', function (e) { e.radius = 70000; over_func(e); });
        google.maps.event.addListener(M15, 'mouseout', out_func);
        google.maps.event.addListener(M16, 'mouseover', function (e) { e.radius = 50000; over_func(e); });
        google.maps.event.addListener(M16, 'mouseout', out_func);
        google.maps.event.addListener(M18, 'mouseover', function (e) { e.radius = 40000; over_func(e); });
        google.maps.event.addListener(M18, 'mouseout', out_func);
        google.maps.event.addListener(M73, 'mouseover', function (e) { e.radius = 80000; over_func(e); });
        google.maps.event.addListener(M73, 'mouseout', out_func);
        google.maps.event.addListener(M45, 'mouseover', function (e) { e.radius = 50000; over_func(e); });
        google.maps.event.addListener(M45, 'mouseout', out_func);

    }
    var vm = {
        activate: function () {
            shell.selectedSubMenu('repeaters');
            shell.selectedMainMenu('israelham');
        },
        compositionComplete: function () {
            initMap();
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});