define(["services/utilities","services/httpService"],function(t,n){var e=require("viewmodels/shell"),a=ko.observable();this.results=ko.observableArray(),this.years=ko.computed(function(){var t=Enumerable.From(this.results()).Select("i=>i.year").Distinct().OrderBy(function(t){return t.year}).Reverse().ToArray();return t},this),this.categories=ko.computed(function(){var t=Enumerable.From(this.results()).Select("i=>i.category").Distinct().ToArray();return t},this),this.getResults=function(){n.get("Server/hl_4x.php?d="+Date.now()).done(function(t){results(t)}).error(t.handleError)};var r={activate:function(){e.selectedSubMenu("holylandresults_isr"),e.selectedMainMenu("holyland"),a.subscribe(function(n){void 0!==n&&t.applyRowSearch("#dataTable tbody tr",n)}),getResults()},compositionComplete:function(){},searchInput:a};return r});