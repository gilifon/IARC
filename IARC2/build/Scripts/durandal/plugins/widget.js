define(["durandal/system","durandal/composition","jquery","knockout"],function(e,t,n,a){function r(e,n){var r=a.utils.domData.get(e,i);r||(r={parts:t.cloneNodes(a.virtualElements.childNodes(e))},a.virtualElements.emptyNode(e),a.utils.domData.set(e,i,r)),n.parts=r.parts}var o={},l={},g=["model","view","kind"],i="durandal-widget-data",s={getSettings:function(t){var n=a.utils.unwrapObservable(t())||{};if(e.isString(n))return{kind:n};for(var r in n)n[r]=-1!=a.utils.arrayIndexOf(g,r)?a.utils.unwrapObservable(n[r]):n[r];return n},registerKind:function(e){a.bindingHandlers[e]={init:function(){return{controlsDescendantBindings:!0}},update:function(t,n,a,o,l){var g=s.getSettings(n);g.kind=e,r(t,g),s.create(t,g,l,!0)}},a.virtualElements.allowedBindings[e]=!0},mapKind:function(e,t,n){t&&(l[e]=t),n&&(o[e]=n)},mapKindToModuleId:function(e){return o[e]||s.convertKindToModulePath(e)},convertKindToModulePath:function(e){return"widgets/"+e+"/viewmodel"},mapKindToViewId:function(e){return l[e]||s.convertKindToViewPath(e)},convertKindToViewPath:function(e){return"widgets/"+e+"/view"},createCompositionSettings:function(e,t){return t.model||(t.model=this.mapKindToModuleId(t.kind)),t.view||(t.view=this.mapKindToViewId(t.kind)),t.preserveContext=!0,t.activate=!0,t.activationData=t,t.mode="templated",t},create:function(e,n,a,r){r||(n=s.getSettings(function(){return n},e));var o=s.createCompositionSettings(e,n);t.compose(e,o,a)},install:function(e){if(e.bindingName=e.bindingName||"widget",e.kinds)for(var t=e.kinds,n=0;n<t.length;n++)s.registerKind(t[n]);a.bindingHandlers[e.bindingName]={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,a,o){var l=s.getSettings(t);r(e,l),s.create(e,l,o,!0)}},a.virtualElements.allowedBindings[e.bindingName]=!0}};return s});