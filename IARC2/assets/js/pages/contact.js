var Contact = function () {

    return {
        
        //Map
        initMap: function () {
			var map;
			$(document).ready(function () {
			    map = new GMaps({
			        div: '#map',
			        lat: 32.034412,
			        lng: 34.893830
			    });
			    var marker = map.addMarker({
			        lat: 32.034412,
			        lng: 34.893830,
			        title: 'Loop, Inc.'
			    });
			});
        }

    };
}();