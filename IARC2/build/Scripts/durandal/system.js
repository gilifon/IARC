define(["require","jquery"],function(e,t){function n(e){var t="[object "+e+"]";a["is"+e]=function(e){return l.call(e)==t}}var a,r=!1,o=Object.keys,g=Object.prototype.hasOwnProperty,l=Object.prototype.toString,i=!1,s=Array.isArray,d=Array.prototype.slice;if(Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(e){console[e]=this.call(console[e],console)},Function.prototype.bind)}catch(p){i=!0}e.on&&e.on("moduleLoaded",function(e,t){a.setModuleId(e,t)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(e,t){a.setModuleId(e.defined[t.id],t.id)});var c=function(){},m=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var e=0;e<arguments.length;)console.log("Item "+(e+1)+": "+arguments[e]),e++;else 1==d.call(arguments).length&&"string"==typeof d.call(arguments)[0]?console.log(d.call(arguments).toString()):console.log.apply(console,d.call(arguments));else Function.prototype.bind&&!i||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,d.call(arguments))}catch(t){}},L=function(e){if(e instanceof Error)throw e;throw new Error(e)};a={version:"2.0.0",noop:c,getModuleId:function(e){return e?"function"==typeof e?e.prototype.__moduleId__:"string"==typeof e?null:e.__moduleId__:null},setModuleId:function(e,t){return e?"function"==typeof e?(e.prototype.__moduleId__=t,void 0):("string"!=typeof e&&(e.__moduleId__=t),void 0):void 0},resolveObject:function(e){return a.isFunction(e)?new e:e},debug:function(e){return 1==arguments.length&&(r=e,r?(this.log=m,this.error=L,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=c,this.error=c)),r},log:c,error:c,assert:function(e,t){e||a.error(new Error(t||"Assert:Failed"))},defer:function(e){return t.Deferred(e)},guid:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=0|16*Math.random(),n="x"==e?t:8|3&t;return n.toString(16)})},acquire:function(){var t,n=arguments[0],r=!1;return a.isArray(n)?(t=n,r=!0):t=d.call(arguments,0),this.defer(function(n){e(t,function(){var e=arguments;setTimeout(function(){e.length>1||r?n.resolve(d.call(e,0)):n.resolve(e[0])},1)},function(e){n.reject(e)})}).promise()},extend:function(e){for(var t=d.call(arguments,1),n=0;n<t.length;n++){var a=t[n];if(a)for(var r in a)e[r]=a[r]}return e},wait:function(e){return a.defer(function(t){setTimeout(t.resolve,e)}).promise()}},a.keys=o||function(e){if(e!==Object(e))throw new TypeError("Invalid object");var t=[];for(var n in e)g.call(e,n)&&(t[t.length]=n);return t},a.isElement=function(e){return!(!e||1!==e.nodeType)},a.isArray=s||function(e){return"[object Array]"==l.call(e)},a.isObject=function(e){return e===Object(e)},a.isBoolean=function(e){return"boolean"==typeof e},a.isPromise=function(e){return e&&a.isFunction(e.then)};for(var h=["Arguments","Function","String","Number","Date","RegExp"],u=0;u<h.length;u++)n(h[u]);return a});