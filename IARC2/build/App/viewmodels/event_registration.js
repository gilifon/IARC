define(["services/utilities","services/httpService","services/displayService"],function(t,n,e){var a=require("viewmodels/shell"),r=ko.observable(),g=ko.observable(),o=ko.observable(),l=ko.observableArray(),s=function(){n.get("Server/get_events.php?d="+Date.now()).done(function(t){l(t)}).error(t.handleError)};this.Send=ko.asyncCommand({execute:function(a){if(null==g())e.display("אל תשכח להכניס אות קריאה..","error");else if(null==r())e.display("אל תשכח להכניס שם..","error");else if(null==o())e.display("אל תשכח להכניס אימייל..","error");else{var l={info:{name:r(),callsign:g(),email:o(),event_id:this.id}};n.post("Server/event_registration.php",l).done(function(t){e.display(t),a(!0)}).error(function(){e.display("Something went wrong..","error"),t.handleError(),a(!0)})}},canExecute:function(){return!0}});var i={activate:function(){a.selectedSubMenu("eventregistration"),a.selectedMainMenu("aguda"),s()},compositionComplete:function(){},name:r,callsign:g,email:o,getItems:s,items:l};return i});