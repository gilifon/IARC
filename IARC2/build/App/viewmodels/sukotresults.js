define(["services/utilities","services/httpService"],function(e){var t=require("viewmodels/shell"),n=ko.observable(),a={activate:function(){t.selectedSubMenu("sukotresults"),t.selectedMainMenu("israelham"),n.subscribe(function(t){void 0!==t&&e.applyRowSearch("#dataTable tbody tr",t)}),n("")},searchInput:n};return a});