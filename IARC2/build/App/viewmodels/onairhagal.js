define(["services/utilities","services/httpService"],function(t,e){var n=require("viewmodels/shell"),a=ko.observableArray();this.getHagalFiles=function(){e.get("Server/broadcasted_hagal.php?d="+Date.now()).done(function(t){a(t)}).error(t.handleError)};var r={activate:function(){n.selectedSubMenu("onairhagal"),n.selectedMainMenu("hagal"),getHagalFiles()},files:a};return r});