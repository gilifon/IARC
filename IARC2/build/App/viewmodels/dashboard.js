define(function(){var t=require("viewmodels/shell"),n=ko.observable("1"),e=function(){return Math.floor(7*Math.random()+1)},a={activate:function(){t.selectedSubMenu(""),t.selectedMainMenu("main"),n(e())},compositionComplete:function(){},getActiveImage:e,activeImage:n};return a});