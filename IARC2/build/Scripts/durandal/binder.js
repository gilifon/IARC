define(["durandal/system","knockout"],function(e,t){function n(t){return void 0===t?{applyBindings:!0}:e.isBoolean(t)?{applyBindings:t}:(void 0===t.applyBindings&&(t.applyBindings=!0),t)}function a(a,s,d,p){if(!s||!d)return r.throwOnErrors?e.error(o):e.log(o,s,p),void 0;if(!s.getAttribute)return r.throwOnErrors?e.error(l):e.log(l,s,p),void 0;var m=s.getAttribute("data-view");try{var c;return a&&a.binding&&(c=a.binding(s)),c=n(c),r.binding(p,s,c),c.applyBindings?(e.log("Binding",m,p),t.applyBindings(d,s)):a&&t.utils.domData.set(s,i,{$data:a}),r.bindingComplete(p,s,c),a&&a.bindingComplete&&a.bindingComplete(s),t.utils.domData.set(s,g,c),c}catch(L){L.message=L.message+";\nView: "+m+";\nModuleId: "+e.getModuleId(p),r.throwOnErrors?e.error(L):e.log(L.message)}}var r,o="Insufficient Information to Bind",l="Unexpected View Type",g="durandal-binding-instruction",i="__ko_bindingContext__";return r={binding:e.noop,bindingComplete:e.noop,throwOnErrors:!1,getBindingInstruction:function(e){return t.utils.domData.get(e,g)},bindContext:function(e,t,n){return n&&e&&(e=e.createChildContext(n)),a(n,t,e,n||(e?e.$data:null))},bind:function(e,t){return a(e,t,e,e)}}});