define(["services/utilities","services/httpService"],function(t,n){require("viewmodels/shell");var e=ko.observableArray(),a=ko.observableArray(),r=function(){n.get("Server/get_event_registrants.php?d="+Date.now()).done(function(t){e(t)}).error(t.handleError)},g=function(){n.get("Server/get_events.php?d="+Date.now()).done(function(t){a(t)}).error(t.handleError)},o=function(t){return ko.utils.arrayFilter(e(),function(n){return n.event_id===t})},l={activate:function(){r(),g()},compositionComplete:function(){},list:e,events:a,getEventRegistrants:o};return l});