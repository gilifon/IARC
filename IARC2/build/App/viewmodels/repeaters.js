define(function(){var e=require("viewmodels/shell"),t=function(){var e=new google.maps.LatLng(30.614596,34.804811),t=new google.maps.LatLng(31.768689,35.216128),n=new google.maps.LatLng(32.583741,35.181742),a=new google.maps.LatLng(32.074502,34.791491),r=new google.maps.LatLng(32.762539,35.018685),o=new google.maps.LatLng(29.572127,34.964874),g=new google.maps.LatLng(31.256257,34.785504),l=new google.maps.LatLng(31.344768,35.049863),s=new google.maps.LatLng(32.980831,35.506225),i=new google.maps.LatLng(32.072165,34.816521),d=new google.maps.LatLng(32.315934,34.862816),p=new google.maps.LatLng(32.0553536,34.8621609),m=new google.maps.LatLng(32.764199,35.016099),c=new google.maps.LatLng(33.128886,35.785405),L={center:new google.maps.LatLng(31.44741,35.079346),zoom:8},h=new google.maps.Map(document.getElementById("map-canvas"),L),w=new google.maps.Marker({position:e,map:h,animation:google.maps.Animation.DROP,title:"ממסר מצפה רמון - R0 - 145.000"}),u=new google.maps.Marker({position:t,map:h,animation:google.maps.Animation.DROP,title:"ממסר ירושלים - R1 - 145.625"}),v=new google.maps.Marker({position:n,map:h,animation:google.maps.Animation.DROP,title:"ממסר מגידו - R3 - 145.675"}),b=new google.maps.Marker({position:a,map:h,animation:google.maps.Animation.DROP,title:"ממסר תל-אביב - R7 - 145.775"}),f=new google.maps.Marker({position:r,map:h,animation:google.maps.Animation.DROP,title:"ממסר חיפה - R12 - 144.700"}),y=new google.maps.Marker({position:o,map:h,animation:google.maps.Animation.DROP,title:"ממסר אילת - R12B - 145.300"}),_=new google.maps.Marker({position:g,map:h,animation:google.maps.Animation.DROP,title:"ממסר באר-שבע - R12C - 145.300"}),x=new google.maps.Marker({position:l,map:h,animation:google.maps.Animation.DROP,title:"ממסר יתיר - R13 - 145.325"}),S=new google.maps.Marker({position:s,map:h,animation:google.maps.Animation.DROP,title:"ממסר צפת - R14 - 145.350"}),k=new google.maps.Marker({position:i,map:h,animation:google.maps.Animation.DROP,title:"ממסר גבעתיים - R15 - 144.775"}),C=new google.maps.Marker({position:d,map:h,animation:google.maps.Animation.DROP,title:"ממסר נתניה - R16 - 145.400"}),A=new google.maps.Marker({position:p,map:h,animation:google.maps.Animation.DROP,title:"ממסר קרית אונו - R18 - 145.450"}),B=new google.maps.Marker({position:m,map:h,animation:google.maps.Animation.DROP,title:"ממסר חיפה - UHF - R73 - 438.725"}),M=new google.maps.Marker({position:c,map:h,animation:google.maps.Animation.DROP,title:"ממסר בנטל - R4.5 - 145.7125"});B.setIcon("http://maps.google.com/mapfiles/ms/icons/green-dot.png");var j,R={strokeColor:"#555555",strokeOpacity:.7,strokeWeight:1,fillColor:"#555555",fillOpacity:.3,map:h,radius:7e4},H=function(e){h.getZoom()<11&&(R.center=e.latLng,R.radius=e.radius,j=new google.maps.Circle(R),j.setMap(h))},T=function(){j.setMap(null)};google.maps.event.addListener(w,"mouseover",function(e){e.radius=8e4,H(e)}),google.maps.event.addListener(w,"mouseout",T),google.maps.event.addListener(u,"mouseover",function(e){e.radius=7e4,H(e)}),google.maps.event.addListener(u,"mouseout",T),google.maps.event.addListener(v,"mouseover",function(e){e.radius=6e4,H(e)}),google.maps.event.addListener(v,"mouseout",T),google.maps.event.addListener(b,"mouseover",function(e){e.radius=7e4,H(e)}),google.maps.event.addListener(b,"mouseout",T),google.maps.event.addListener(f,"mouseover",function(e){e.radius=8e4,H(e)}),google.maps.event.addListener(f,"mouseout",T),google.maps.event.addListener(y,"mouseover",function(e){e.radius=6e4,H(e)}),google.maps.event.addListener(y,"mouseout",T),google.maps.event.addListener(_,"mouseover",function(e){e.radius=8e4,H(e)}),google.maps.event.addListener(_,"mouseout",T),google.maps.event.addListener(x,"mouseover",function(e){e.radius=7e4,H(e)}),google.maps.event.addListener(x,"mouseout",T),google.maps.event.addListener(S,"mouseover",function(e){e.radius=13e4,H(e)}),google.maps.event.addListener(S,"mouseout",T),google.maps.event.addListener(k,"mouseover",function(e){e.radius=7e4,H(e)}),google.maps.event.addListener(k,"mouseout",T),google.maps.event.addListener(C,"mouseover",function(e){e.radius=5e4,H(e)}),google.maps.event.addListener(C,"mouseout",T),google.maps.event.addListener(A,"mouseover",function(e){e.radius=4e4,H(e)}),google.maps.event.addListener(A,"mouseout",T),google.maps.event.addListener(B,"mouseover",function(e){e.radius=8e4,H(e)}),google.maps.event.addListener(B,"mouseout",T),google.maps.event.addListener(M,"mouseover",function(e){e.radius=5e4,H(e)}),google.maps.event.addListener(M,"mouseout",T)},n={activate:function(){e.selectedSubMenu("repeaters"),e.selectedMainMenu("israelham")},compositionComplete:function(){t()}};return n});