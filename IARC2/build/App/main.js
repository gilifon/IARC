requirejs.config({urlArgs:"version=2019.02",paths:{text:"../Scripts/text",durandal:"../Scripts/durandal",plugins:"../Scripts/durandal/plugins",transitions:"../Scripts/durandal/transitions"}}),define("jquery",function(){return jQuery}),define("knockout",ko),define(["durandal/system","durandal/app","durandal/viewLocator"],function(t,n,e){t.debug(!0),n.title="IARC - New",n.version="2019.02",n.configurePlugins({router:!0,dialog:!0,widget:!0}),n.start().then(function(){e.useConvention(),n.setRoot("viewmodels/shell","entrance")})});