define(["durandal/system","durandal/binder","knockout"],function(e,t,n){function a(e){var t=e[0];return"_"===t||"$"===t}function r(t){if(!t||e.isElement(t)||t.ko===n||t.jquery)return!1;var a=p.call(t);return-1==m.indexOf(a)&&!(t===!0||t===!1)}function o(e,t){var n=e.__observable__,a=!0;if(!n||!n.__full__){n=n||(e.__observable__={}),n.__full__=!0,c.forEach(function(n){e[n]=function(){a=!1;var e=w[n].apply(t,arguments);return a=!0,e}}),L.forEach(function(n){e[n]=function(){a&&t.valueWillMutate();var r=u[n].apply(e,arguments);return a&&t.valueHasMutated(),r}}),h.forEach(function(n){e[n]=function(){for(var r=0,o=arguments.length;o>r;r++)g(arguments[r]);a&&t.valueWillMutate();var l=u[n].apply(e,arguments);return a&&t.valueHasMutated(),l}}),e.splice=function(){for(var n=2,r=arguments.length;r>n;n++)g(arguments[n]);a&&t.valueWillMutate();var o=u.splice.apply(e,arguments);return a&&t.valueHasMutated(),o};for(var r=0,o=e.length;o>r;r++)g(e[r])}}function g(t){var g,l;if(r(t)&&(g=t.__observable__,!g||!g.__full__)){if(g=g||(t.__observable__={}),g.__full__=!0,e.isArray(t)){var s=n.observableArray(t);o(t,s)}else for(var d in t)a(d)||g[d]||(l=t[d],e.isFunction(l)||i(t,d,l));v&&e.log("Converted",t)}}function l(e,t,n){var a;e(t),a=e.peek(),n?a.destroyAll||(a||(a=[],e(a)),o(a,e)):g(a)}function i(t,a,r){var i,s,d=t.__observable__||(t.__observable__={});if(void 0===r&&(r=t[a]),e.isArray(r))i=n.observableArray(r),o(r,i),s=!0;else if("function"==typeof r){if(!n.isObservable(r))return null;i=r}else e.isPromise(r)?(i=n.observable(),r.then(function(t){if(e.isArray(t)){var a=n.observableArray(t);o(t,a),t=a}i(t)})):(i=n.observable(r),g(r));return Object.defineProperty(t,a,{configurable:!0,enumerable:!0,get:i,set:n.isWriteableObservable(i)?function(t){t&&e.isPromise(t)?t.then(function(t){l(i,t,e.isArray(t))}):l(i,t,s)}:void 0}),d[a]=i,i}function s(t,n,a){var r,o=this,g={owner:t,deferEvaluation:!0};return"function"==typeof a?g.read=a:("value"in a&&e.error('For ko.defineProperty, you must not specify a "value" for the property. You must provide a "get" function.'),"function"!=typeof a.get&&e.error('For ko.defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".'),g.read=a.get,g.write=a.set),r=o.computed(g),t[n]=r,i(t,n,r)}var d,p=Object.prototype.toString,m=["[object Function]","[object String]","[object Boolean]","[object Number]","[object Date]","[object RegExp]"],c=["remove","removeAll","destroy","destroyAll","replace"],L=["pop","reverse","sort","shift","splice"],h=["push","unshift"],u=Array.prototype,w=n.observableArray.fn,v=!1;return d=function(e,t){var a,r,o;return e?(a=e.__observable__,a&&(r=a[t])?r:(o=e[t],n.isObservable(o)?o:i(e,t,o))):null},d.defineProperty=s,d.convertProperty=i,d.convertObject=g,d.install=function(e){var n=t.binding;t.binding=function(e,t,a){a.applyBindings&&!a.skipConversion&&g(e),n(e,t)},v=e.logConversion},d});