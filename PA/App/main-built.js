(function () {
/**
 * almond 0.2.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name) && !defining.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    function onResourceLoad(name, defined, deps){
        if(requirejs.onResourceLoad && name){
            requirejs.onResourceLoad({defined:defined}, {id:name}, deps);
        }
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (defined.hasOwnProperty(depName) ||
                           waiting.hasOwnProperty(depName) ||
                           defining.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }

        onResourceLoad(name, defined, args);
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("../Scripts/almond-custom", function(){});

define('durandal/system',["require","jquery"],function(e,t){function n(e){var t="[object "+e+"]";r["is"+e]=function(e){return s.call(e)==t}}var r,i=!1,o=Object.keys,a=Object.prototype.hasOwnProperty,s=Object.prototype.toString,c=!1,u=Array.isArray,l=Array.prototype.slice;if(Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(e){console[e]=this.call(console[e],console)},Function.prototype.bind)}catch(d){c=!0}e.on&&e.on("moduleLoaded",function(e,t){r.setModuleId(e,t)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(e,t){r.setModuleId(e.defined[t.id],t.id)});var f=function(){},v=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var e=0;e<arguments.length;)console.log("Item "+(e+1)+": "+arguments[e]),e++;else 1==l.call(arguments).length&&"string"==typeof l.call(arguments)[0]?console.log(l.call(arguments).toString()):console.log.apply(console,l.call(arguments));else Function.prototype.bind&&!c||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,l.call(arguments))}catch(t){}},g=function(e){if(e instanceof Error)throw e;throw new Error(e)};r={version:"2.0.0",noop:f,getModuleId:function(e){return e?"function"==typeof e?e.prototype.__moduleId__:"string"==typeof e?null:e.__moduleId__:null},setModuleId:function(e,t){return e?"function"==typeof e?(e.prototype.__moduleId__=t,void 0):("string"!=typeof e&&(e.__moduleId__=t),void 0):void 0},resolveObject:function(e){return r.isFunction(e)?new e:e},debug:function(e){return 1==arguments.length&&(i=e,i?(this.log=v,this.error=g,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=f,this.error=f)),i},log:f,error:f,assert:function(e,t){e||r.error(new Error(t||"Assert:Failed"))},defer:function(e){return t.Deferred(e)},guid:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=0|16*Math.random(),n="x"==e?t:8|3&t;return n.toString(16)})},acquire:function(){var t,n=arguments[0],i=!1;return r.isArray(n)?(t=n,i=!0):t=l.call(arguments,0),this.defer(function(n){e(t,function(){var e=arguments;setTimeout(function(){e.length>1||i?n.resolve(l.call(e,0)):n.resolve(e[0])},1)},function(e){n.reject(e)})}).promise()},extend:function(e){for(var t=l.call(arguments,1),n=0;n<t.length;n++){var r=t[n];if(r)for(var i in r)e[i]=r[i]}return e},wait:function(e){return r.defer(function(t){setTimeout(t.resolve,e)}).promise()}},r.keys=o||function(e){if(e!==Object(e))throw new TypeError("Invalid object");var t=[];for(var n in e)a.call(e,n)&&(t[t.length]=n);return t},r.isElement=function(e){return!(!e||1!==e.nodeType)},r.isArray=u||function(e){return"[object Array]"==s.call(e)},r.isObject=function(e){return e===Object(e)},r.isBoolean=function(e){return"boolean"==typeof e},r.isPromise=function(e){return e&&r.isFunction(e.then)};for(var p=["Arguments","Function","String","Number","Date","RegExp"],h=0;h<p.length;h++)n(p[h]);return r});
define('durandal/viewEngine',["durandal/system","jquery"],function(e,t){var n;return n=t.parseHTML?function(e){return t.parseHTML(e)}:function(e){return t(e).get()},{viewExtension:".html",viewPlugin:"text",isViewUrl:function(e){return-1!==e.indexOf(this.viewExtension,e.length-this.viewExtension.length)},convertViewUrlToViewId:function(e){return e.substring(0,e.length-this.viewExtension.length)},convertViewIdToRequirePath:function(e){return this.viewPlugin+"!"+e+this.viewExtension},parseMarkup:n,processMarkup:function(e){var t=this.parseMarkup(e);return this.ensureSingleElement(t)},ensureSingleElement:function(e){if(1==e.length)return e[0];for(var n=[],r=0;r<e.length;r++){var i=e[r];if(8!=i.nodeType){if(3==i.nodeType){var o=/\S/.test(i.nodeValue);if(!o)continue}n.push(i)}}return n.length>1?t(n).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0):n[0]},createView:function(t){var n=this,r=this.convertViewIdToRequirePath(t);return e.defer(function(i){e.acquire(r).then(function(e){var r=n.processMarkup(e);r.setAttribute("data-view",t),i.resolve(r)}).fail(function(e){n.createFallbackView(t,r,e).then(function(e){e.setAttribute("data-view",t),i.resolve(e)})})}).promise()},createFallbackView:function(t,n){var r=this,i='View Not Found. Searched for "'+t+'" via path "'+n+'".';return e.defer(function(e){e.resolve(r.processMarkup('<div class="durandal-view-404">'+i+"</div>"))}).promise()}}});
define('durandal/viewLocator',["durandal/system","durandal/viewEngine"],function(e,t){function n(e,t){for(var n=0;n<e.length;n++){var r=e[n],i=r.getAttribute("data-view");if(i==t)return r}}function r(e){return(e+"").replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g,"\\$1")}return{useConvention:function(e,t,n){e=e||"viewmodels",t=t||"views",n=n||t;var i=new RegExp(r(e),"gi");this.convertModuleIdToViewId=function(e){return e.replace(i,t)},this.translateViewIdToArea=function(e,t){return t&&"partial"!=t?n+"/"+t+"/"+e:n+"/"+e}},locateViewForObject:function(t,n,r){var i;if(t.getView&&(i=t.getView()))return this.locateView(i,n,r);if(t.viewUrl)return this.locateView(t.viewUrl,n,r);var o=e.getModuleId(t);return o?this.locateView(this.convertModuleIdToViewId(o),n,r):this.locateView(this.determineFallbackViewId(t),n,r)},convertModuleIdToViewId:function(e){return e},determineFallbackViewId:function(e){var t=/function (.{1,})\(/,n=t.exec(e.constructor.toString()),r=n&&n.length>1?n[1]:"";return"views/"+r},translateViewIdToArea:function(e){return e},locateView:function(r,i,o){if("string"==typeof r){var a;if(a=t.isViewUrl(r)?t.convertViewUrlToViewId(r):r,i&&(a=this.translateViewIdToArea(a,i)),o){var s=n(o,a);if(s)return e.defer(function(e){e.resolve(s)}).promise()}return t.createView(a)}return e.defer(function(e){e.resolve(r)}).promise()}}});
define('durandal/binder',["durandal/system","knockout"],function(e,t){function n(t){return void 0===t?{applyBindings:!0}:e.isBoolean(t)?{applyBindings:t}:(void 0===t.applyBindings&&(t.applyBindings=!0),t)}function r(r,u,l,d){if(!u||!l)return i.throwOnErrors?e.error(o):e.log(o,u,d),void 0;if(!u.getAttribute)return i.throwOnErrors?e.error(a):e.log(a,u,d),void 0;var f=u.getAttribute("data-view");try{var v;return r&&r.binding&&(v=r.binding(u)),v=n(v),i.binding(d,u,v),v.applyBindings?(e.log("Binding",f,d),t.applyBindings(l,u)):r&&t.utils.domData.set(u,c,{$data:r}),i.bindingComplete(d,u,v),r&&r.bindingComplete&&r.bindingComplete(u),t.utils.domData.set(u,s,v),v}catch(g){g.message=g.message+";\nView: "+f+";\nModuleId: "+e.getModuleId(d),i.throwOnErrors?e.error(g):e.log(g.message)}}var i,o="Insufficient Information to Bind",a="Unexpected View Type",s="durandal-binding-instruction",c="__ko_bindingContext__";return i={binding:e.noop,bindingComplete:e.noop,throwOnErrors:!1,getBindingInstruction:function(e){return t.utils.domData.get(e,s)},bindContext:function(e,t,n){return n&&e&&(e=e.createChildContext(n)),r(n,t,e,n||(e?e.$data:null))},bind:function(e,t){return r(e,t,e,e)}}});
define('durandal/activator',["durandal/system","knockout"],function(e,t){function n(e){return void 0==e&&(e={}),e.closeOnDeactivate||(e.closeOnDeactivate=u.defaults.closeOnDeactivate),e.beforeActivate||(e.beforeActivate=u.defaults.beforeActivate),e.afterDeactivate||(e.afterDeactivate=u.defaults.afterDeactivate),e.affirmations||(e.affirmations=u.defaults.affirmations),e.interpretResponse||(e.interpretResponse=u.defaults.interpretResponse),e.areSameItem||(e.areSameItem=u.defaults.areSameItem),e}function r(t,n,r){return e.isArray(r)?t[n].apply(t,r):t[n](r)}function i(t,n,r,i,a){if(t&&t.deactivate){e.log("Deactivating",t);var o;try{o=t.deactivate(n)}catch(s){return e.error(s),i.resolve(!1),void 0}o&&o.then?o.then(function(){r.afterDeactivate(t,n,a),i.resolve(!0)},function(t){e.log(t),i.resolve(!1)}):(r.afterDeactivate(t,n,a),i.resolve(!0))}else t&&r.afterDeactivate(t,n,a),i.resolve(!0)}function a(t,n,i,a){if(t)if(t.activate){e.log("Activating",t);var o;try{o=r(t,"activate",a)}catch(s){return e.error(s),i(!1),void 0}o&&o.then?o.then(function(){n(t),i(!0)},function(t){e.log(t),i(!1)}):(n(t),i(!0))}else n(t),i(!0);else i(!0)}function o(t,n,r){return r.lifecycleData=null,e.defer(function(i){if(t&&t.canDeactivate){var a;try{a=t.canDeactivate(n)}catch(o){return e.error(o),i.resolve(!1),void 0}a.then?a.then(function(e){r.lifecycleData=e,i.resolve(r.interpretResponse(e))},function(t){e.error(t),i.resolve(!1)}):(r.lifecycleData=a,i.resolve(r.interpretResponse(a)))}else i.resolve(!0)}).promise()}function s(t,n,i,a){return i.lifecycleData=null,e.defer(function(o){if(t==n())return o.resolve(!0),void 0;if(t&&t.canActivate){var s;try{s=r(t,"canActivate",a)}catch(c){return e.error(c),o.resolve(!1),void 0}s.then?s.then(function(e){i.lifecycleData=e,o.resolve(i.interpretResponse(e))},function(t){e.error(t),o.resolve(!1)}):(i.lifecycleData=s,o.resolve(i.interpretResponse(s)))}else o.resolve(!0)}).promise()}function c(r,c){var u,l=t.observable(null);c=n(c);var d=t.computed({read:function(){return l()},write:function(e){d.viaSetter=!0,d.activateItem(e)}});return d.__activator__=!0,d.settings=c,c.activator=d,d.isActivating=t.observable(!1),d.canDeactivateItem=function(e,t){return o(e,t,c)},d.deactivateItem=function(t,n){return e.defer(function(e){d.canDeactivateItem(t,n).then(function(r){r?i(t,n,c,e,l):(d.notifySubscribers(),e.resolve(!1))})}).promise()},d.canActivateItem=function(e,t){return s(e,l,c,t)},d.activateItem=function(t,n){var r=d.viaSetter;return d.viaSetter=!1,e.defer(function(o){if(d.isActivating())return o.resolve(!1),void 0;d.isActivating(!0);var s=l();return c.areSameItem(s,t,u,n)?(d.isActivating(!1),o.resolve(!0),void 0):(d.canDeactivateItem(s,c.closeOnDeactivate).then(function(f){f?d.canActivateItem(t,n).then(function(f){f?e.defer(function(e){i(s,c.closeOnDeactivate,c,e)}).promise().then(function(){t=c.beforeActivate(t,n),a(t,l,function(e){u=n,d.isActivating(!1),o.resolve(e)},n)}):(r&&d.notifySubscribers(),d.isActivating(!1),o.resolve(!1))}):(r&&d.notifySubscribers(),d.isActivating(!1),o.resolve(!1))}),void 0)}).promise()},d.canActivate=function(){var e;return r?(e=r,r=!1):e=d(),d.canActivateItem(e)},d.activate=function(){var e;return r?(e=r,r=!1):e=d(),d.activateItem(e)},d.canDeactivate=function(e){return d.canDeactivateItem(d(),e)},d.deactivate=function(e){return d.deactivateItem(d(),e)},d.includeIn=function(e){e.canActivate=function(){return d.canActivate()},e.activate=function(){return d.activate()},e.canDeactivate=function(e){return d.canDeactivate(e)},e.deactivate=function(e){return d.deactivate(e)}},c.includeIn?d.includeIn(c.includeIn):r&&d.activate(),d.forItems=function(t){c.closeOnDeactivate=!1,c.determineNextItemToActivate=function(e,t){var n=t-1;return-1==n&&e.length>1?e[1]:n>-1&&n<e.length-1?e[n]:null},c.beforeActivate=function(e){var n=d();if(e){var r=t.indexOf(e);-1==r?t.push(e):e=t()[r]}else e=c.determineNextItemToActivate(t,n?t.indexOf(n):0);return e},c.afterDeactivate=function(e,n){n&&t.remove(e)};var n=d.canDeactivate;d.canDeactivate=function(r){return r?e.defer(function(e){function n(){for(var t=0;t<a.length;t++)if(!a[t])return e.resolve(!1),void 0;e.resolve(!0)}for(var i=t(),a=[],o=0;o<i.length;o++)d.canDeactivateItem(i[o],r).then(function(e){a.push(e),a.length==i.length&&n()})}).promise():n()};var r=d.deactivate;return d.deactivate=function(n){return n?e.defer(function(e){function r(r){d.deactivateItem(r,n).then(function(){a++,t.remove(r),a==o&&e.resolve()})}for(var i=t(),a=0,o=i.length,s=0;o>s;s++)r(i[s])}).promise():r()},d},d}var u,l={closeOnDeactivate:!0,affirmations:["yes","ok","true"],interpretResponse:function(n){return e.isObject(n)&&(n=n.can||!1),e.isString(n)?-1!==t.utils.arrayIndexOf(this.affirmations,n.toLowerCase()):n},areSameItem:function(e,t){return e==t},beforeActivate:function(e){return e},afterDeactivate:function(e,t,n){t&&n&&n(null)}};return u={defaults:l,create:c,isActivator:function(e){return e&&e.__activator__}}});
define('durandal/composition',["durandal/system","durandal/viewLocator","durandal/binder","durandal/viewEngine","durandal/activator","jquery","knockout"],function(e,t,n,i,r,a,o){function s(e){for(var t=[],n={childElements:t,activeView:null},i=o.virtualElements.firstChild(e);i;)1==i.nodeType&&(t.push(i),i.getAttribute(h)&&(n.activeView=i)),i=o.virtualElements.nextSibling(i);return n.activeView||(n.activeView=t[0]),n}function c(){w--,0===w&&setTimeout(function(){for(var e=b.length;e--;)b[e]();b=[]},1)}function u(t,n,i){if(i)n();else if(t.activate&&t.model&&t.model.activate){var r;r=e.isArray(t.activationData)?t.model.activate.apply(t.model,t.activationData):t.model.activate(t.activationData),r&&r.then?r.then(n):r||void 0===r?n():c()}else n()}function l(){var t=this;t.activeView&&t.activeView.removeAttribute(h),t.child&&(t.model&&t.model.attached&&(t.composingNewView||t.alwaysTriggerAttach)&&t.model.attached(t.child,t.parent,t),t.attached&&t.attached(t.child,t.parent,t),t.child.setAttribute(h,!0),t.composingNewView&&t.model&&(t.model.compositionComplete&&p.current.complete(function(){t.model.compositionComplete(t.child,t.parent,t)}),t.model.detached&&o.utils.domNodeDisposal.addDisposeCallback(t.child,function(){t.model.detached(t.child,t.parent,t)})),t.compositionComplete&&p.current.complete(function(){t.compositionComplete(t.child,t.parent,t)})),c(),t.triggerAttach=e.noop}function d(t){if(e.isString(t.transition)){if(t.activeView){if(t.activeView==t.child)return!1;if(!t.child)return!0;if(t.skipTransitionOnSameViewId){var n=t.activeView.getAttribute("data-view"),i=t.child.getAttribute("data-view");return n!=i}}return!0}return!1}function f(e){for(var t=0,n=e.length,i=[];n>t;t++){var r=e[t].cloneNode(!0);i.push(r)}return i}function v(e){var t=f(e.parts),n=p.getParts(t),i=p.getParts(e.child);for(var r in n)a(i[r]).replaceWith(n[r])}function g(t){var n,i,r=o.virtualElements.childNodes(t);if(!e.isArray(r)){var a=[];for(n=0,i=r.length;i>n;n++)a[n]=r[n];r=a}for(n=1,i=r.length;i>n;n++)o.removeNode(r[n])}var p,m={},h="data-active-view",b=[],w=0,y="durandal-composition-data",I="data-part",A="["+I+"]",x=["model","view","transition","area","strategy","activationData"],S={complete:function(e){b.push(e)}};return p={convertTransitionToModuleId:function(e){return"transitions/"+e},defaultTransitionName:null,current:S,addBindingHandler:function(e,t,n){var i,r,a="composition-handler-"+e;t=t||o.bindingHandlers[e],n=n||function(){return void 0},r=o.bindingHandlers[e]={init:function(e,i,r,s,c){var u={trigger:o.observable(null)};return p.current.complete(function(){t.init&&t.init(e,i,r,s,c),t.update&&(o.utils.domData.set(e,a,t),u.trigger("trigger"))}),o.utils.domData.set(e,a,u),n(e,i,r,s,c)},update:function(e,t,n,i,r){var s=o.utils.domData.get(e,a);return s.update?s.update(e,t,n,i,r):(s.trigger(),void 0)}};for(i in t)"init"!==i&&"update"!==i&&(r[i]=t[i])},getParts:function(t){var n={};e.isArray(t)||(t=[t]);for(var i=0;i<t.length;i++){var r=t[i];if(r.getAttribute){var o=r.getAttribute(I);o&&(n[o]=r);for(var s=a(A,r).not(a("[data-bind] "+A,r)),c=0;c<s.length;c++){var u=s.get(c);n[u.getAttribute(I)]=u}}}return n},cloneNodes:f,finalize:function(t){if(t.transition=t.transition||this.defaultTransitionName,t.child||t.activeView)if(d(t)){var i=this.convertTransitionToModuleId(t.transition);e.acquire(i).then(function(e){t.transition=e,e(t).then(function(){if(t.cacheViews){if(t.activeView){var e=n.getBindingInstruction(t.activeView);void 0==e.cacheViews||e.cacheViews||o.removeNode(t.activeView)}}else t.child?g(t.parent):o.virtualElements.emptyNode(t.parent);t.triggerAttach()})}).fail(function(t){e.error("Failed to load transition ("+i+"). Details: "+t.message)})}else{if(t.child!=t.activeView){if(t.cacheViews&&t.activeView){var r=n.getBindingInstruction(t.activeView);void 0==r.cacheViews||r.cacheViews?a(t.activeView).hide():o.removeNode(t.activeView)}t.child?(t.cacheViews||g(t.parent),a(t.child).show()):t.cacheViews||o.virtualElements.emptyNode(t.parent)}t.triggerAttach()}else t.cacheViews||o.virtualElements.emptyNode(t.parent),t.triggerAttach()},bindAndShow:function(e,t,r){t.child=e,t.composingNewView=t.cacheViews?-1==o.utils.arrayIndexOf(t.viewElements,e):!0,u(t,function(){if(t.binding&&t.binding(t.child,t.parent,t),t.preserveContext&&t.bindingContext)t.composingNewView&&(t.parts&&v(t),a(e).hide(),o.virtualElements.prepend(t.parent,e),n.bindContext(t.bindingContext,e,t.model));else if(e){var r=t.model||m,s=o.dataFor(e);if(s!=r){if(!t.composingNewView)return a(e).remove(),i.createView(e.getAttribute("data-view")).then(function(e){p.bindAndShow(e,t,!0)}),void 0;t.parts&&v(t),a(e).hide(),o.virtualElements.prepend(t.parent,e),n.bind(r,e)}}p.finalize(t)},r)},defaultStrategy:function(e){return t.locateViewForObject(e.model,e.area,e.viewElements)},getSettings:function(t){var n,a=t(),s=o.utils.unwrapObservable(a)||{},c=r.isActivator(a);if(e.isString(s))return s=i.isViewUrl(s)?{view:s}:{model:s,activate:!0};if(n=e.getModuleId(s))return s={model:s,activate:!0};!c&&s.model&&(c=r.isActivator(s.model));for(var u in s)s[u]=-1!=o.utils.arrayIndexOf(x,u)?o.utils.unwrapObservable(s[u]):s[u];return c?s.activate=!1:void 0===s.activate&&(s.activate=!0),s},executeStrategy:function(e){e.strategy(e).then(function(t){p.bindAndShow(t,e)})},inject:function(n){return n.model?n.view?(t.locateView(n.view,n.area,n.viewElements).then(function(e){p.bindAndShow(e,n)}),void 0):(n.strategy||(n.strategy=this.defaultStrategy),e.isString(n.strategy)?e.acquire(n.strategy).then(function(e){n.strategy=e,p.executeStrategy(n)}).fail(function(t){e.error("Failed to load view strategy ("+n.strategy+"). Details: "+t.message)}):this.executeStrategy(n),void 0):(this.bindAndShow(null,n),void 0)},compose:function(n,i,r,a){w++,a||(i=p.getSettings(function(){return i},n));var o=s(n);i.activeView=o.activeView,i.parent=n,i.triggerAttach=l,i.bindingContext=r,i.cacheViews&&!i.viewElements&&(i.viewElements=o.childElements),i.model?e.isString(i.model)?e.acquire(i.model).then(function(t){i.model=e.resolveObject(t),p.inject(i)}).fail(function(t){e.error("Failed to load composed module ("+i.model+"). Details: "+t.message)}):p.inject(i):i.view?(i.area=i.area||"partial",i.preserveContext=!0,t.locateView(i.view,i.area,i.viewElements).then(function(e){p.bindAndShow(e,i)})):this.bindAndShow(null,i)}},o.bindingHandlers.compose={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,r,a){var s=p.getSettings(t,e);if(s.mode){var c=o.utils.domData.get(e,y);if(!c){var u=o.virtualElements.childNodes(e);c={},"inline"===s.mode?c.view=i.ensureSingleElement(u):"templated"===s.mode&&(c.parts=f(u)),o.virtualElements.emptyNode(e),o.utils.domData.set(e,y,c)}"inline"===s.mode?s.view=c.view.cloneNode(!0):"templated"===s.mode&&(s.parts=c.parts),s.preserveContext=!0}p.compose(e,s,a,!0)}},o.virtualElements.allowedBindings.compose=!0,p});
define('durandal/events',["durandal/system"],function(e){var t=/\s+/,n=function(){},i=function(e,t){this.owner=e,this.events=t};return i.prototype.then=function(e,t){return this.callback=e||this.callback,this.context=t||this.context,this.callback?(this.owner.on(this.events,this.callback,this.context),this):this},i.prototype.on=i.prototype.then,i.prototype.off=function(){return this.owner.off(this.events,this.callback,this.context),this},n.prototype.on=function(e,n,r){var a,o,s;if(n){for(a=this.callbacks||(this.callbacks={}),e=e.split(t);o=e.shift();)s=a[o]||(a[o]=[]),s.push(n,r);return this}return new i(this,e)},n.prototype.off=function(n,i,r){var a,o,s,c;if(!(o=this.callbacks))return this;if(!(n||i||r))return delete this.callbacks,this;for(n=n?n.split(t):e.keys(o);a=n.shift();)if((s=o[a])&&(i||r))for(c=s.length-2;c>=0;c-=2)i&&s[c]!==i||r&&s[c+1]!==r||s.splice(c,2);else delete o[a];return this},n.prototype.trigger=function(e){var n,i,r,a,o,s,c,u;if(!(i=this.callbacks))return this;for(u=[],e=e.split(t),a=1,o=arguments.length;o>a;a++)u[a-1]=arguments[a];for(;n=e.shift();){if((c=i.all)&&(c=c.slice()),(r=i[n])&&(r=r.slice()),r)for(a=0,o=r.length;o>a;a+=2)r[a].apply(r[a+1]||this,u);if(c)for(s=[n].concat(u),a=0,o=c.length;o>a;a+=2)c[a].apply(c[a+1]||this,s)}return this},n.prototype.proxy=function(e){var t=this;return function(n){t.trigger(e,n)}},n.includeIn=function(e){e.on=n.prototype.on,e.off=n.prototype.off,e.trigger=n.prototype.trigger,e.proxy=n.prototype.proxy},n});
define('durandal/app',["durandal/system","durandal/viewEngine","durandal/composition","durandal/events","jquery"],function(e,t,n,r,i){function o(){return e.defer(function(t){return 0==s.length?(t.resolve(),void 0):(e.acquire(s).then(function(n){for(var r=0;r<n.length;r++){var i=n[r];if(i.install){var o=c[r];e.isObject(o)||(o={}),i.install(o),e.log("Plugin:Installed "+s[r])}else e.log("Plugin:Loaded "+s[r])}t.resolve()}).fail(function(t){e.error("Failed to load plugin(s). Details: "+t.message)}),void 0)}).promise()}var a,s=[],c=[];return a={title:"Application",configurePlugins:function(t,n){var r=e.keys(t);n=n||"plugins/",-1===n.indexOf("/",n.length-1)&&(n+="/");for(var i=0;i<r.length;i++){var o=r[i];s.push(n+o),c.push(t[o])}},start:function(){return e.log("Application:Starting"),this.title&&(document.title=this.title),e.defer(function(t){i(function(){o().then(function(){t.resolve(),e.log("Application:Started")})})}).promise()},setRoot:function(r,i,o){var a,s={activate:!0,transition:i};a=!o||e.isString(o)?document.getElementById(o||"applicationHost"):o,e.isString(r)?t.isViewUrl(r)?s.view=r:s.model=r:s.model=r,n.compose(a,s)}},r.includeIn(a),a});
requirejs.config({urlArgs:"version=1.000",paths:{text:"../Scripts/text",durandal:"../Scripts/durandal",plugins:"../Scripts/durandal/plugins",transitions:"../Scripts/durandal/transitions"}}),define("jquery",[],function(){return jQuery}),define("knockout",ko),define('main',["durandal/system","durandal/app","durandal/viewLocator"],function(e,t,n){e.debug(!0),t.title="איזור אישי - אגודת חובבי הרדיו בישראל",t.version="1.000",t.configurePlugins({router:!0,dialog:!0,widget:!0}),t.start().then(function(){n.useConvention(),t.setRoot("viewmodels/shell","entrance")})});
define('services/cachingService',[],function(){var e=function(e,t){amplify.store(e,t)},t=function(e){return amplify.store(e)},n=function(e){amplify.store("IsLoggedIn",e)},r=function(){return void 0===amplify.store("IsLoggedIn")||null===amplify.store("IsLoggedIn")||""===amplify.store("IsLoggedIn")?!1:amplify.store("IsLoggedIn")},i={add:e,get:t,setLogin:n,getLogin:r};return i});
define('services/displayService',["durandal/app"],function(){var e=function(e,t){switch(toastr.options={positionClass:"toast-top-full-width",fadeIn:300,fadeOut:1e3,timeOut:3e3,extendedTimeOut:1e3},t){case"error":toastr.error(e,"שגיאה!");break;case"info":toastr.info(e,"לידיעתך!");break;case"warning":toastr.warning(e,"אזהרה!");break;case"Success":toastr.warning(e,"יופי!");break;default:toastr.success(e,"יופי!")}};return{display:e}});
define('services/enums',[],function(){var e={Status:{OK:"0",INFO:"1",ERROR:"2"}};return e});
define('services/themeManager',[],function(){var e="style",t=30,n=function(n){var r,o;for(r=0,o=document.getElementsByTagName("link");r<o.length;r++)-1!=o[r].rel.indexOf("stylesheet")&&o[r].title&&(o[r].disabled=!0,o[r].title==n&&(o[r].disabled=!1)),i(e,n,t)},r=function(){var t=o(e);t.length&&n(t)},i=function(e,t,n,r){var i=r?"; domain="+r:"";document.cookie=e+"="+encodeURIComponent(t)+"; max-age="+86400*n+"; path=/"+i},o=function(e){var t=document.cookie;if(0!=t.length){t.match("(^|;)[s]*"+e+"=([^;]*)");var n=t.match(e+"=([^;]*)");return decodeURIComponent(n[1])}return""},a={switch_style:n,set_style_from_cookie:r};return a});
define('services/utilities',[],function(){base64Keys="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=",base64Encode=function(e){var t,n,r,i,o,a,s,c,u;for(u="",c=0,e=utf8Encode(e);c<e.length;)t=e.charCodeAt(c++),n=e.charCodeAt(c++),r=e.charCodeAt(c++),i=t>>2,o=(3&t)<<4|n>>4,a=(15&n)<<2|r>>6,s=63&r,isNaN(n)?a=s=64:isNaN(r)&&(s=64),u=""+u+base64Keys.charAt(i)+base64Keys.charAt(o)+(64>a?base64Keys.charAt(a):"")+(64>s?base64Keys.charAt(s):"");return u},utf8Encode=function(e){var t,n,r,i,o,a;for(e=e.replace(/\r\n/g,"\n"),r="",a=e.split(""),i=0,o=a.length;o>i;i++)n=a[i],t=n.charCodeAt(0),128>t?r+=String.fromCharCode(t):t>127&&2048>t?(r+=String.fromCharCode(192|t>>6),r+=String.fromCharCode(128|63&t)):(r+=String.fromCharCode(224|t>>12),r+=String.fromCharCode(128|63&t>>6),r+=String.fromCharCode(128|63&t));return r};var e=function(e,t){var n=e+":"+t,r=base64Encode(n);return r},t=function(e){var t=$(e),n=[t.size()],r=0;return t.each(function(){n[r]=$(this).attr("id"),r++}),n},n=function(e,t,n){return n=n||"0",e+="",e.length>=t?e:new Array(t-e.length+1).join(n)+e},r={encode64:base64Encode,getBase64Auth:e,getOrder:t,pad:n};return r});
define('plugins/history',["durandal/system","jquery"],function(e,t){function n(e,t,n){if(n){var i=e.href.replace(/(javascript:|#).*$/,"");e.replace(i+"#"+t)}else e.hash="#"+t}var i=/^[#\/]|\s+$/g,r=/^\/+|\/+$/g,o=/msie [\w.]+/,a=/\/$/,s={interval:50,active:!1};return"undefined"!=typeof window&&(s.location=window.location,s.history=window.history),s.getHash=function(e){var t=(e||s).location.href.match(/#(.*)$/);return t?t[1]:""},s.getFragment=function(e,t){if(null==e)if(s._hasPushState||!s._wantsHashChange||t){e=s.location.pathname;var n=s.root.replace(a,"");e.indexOf(n)||(e=e.substr(n.length))}else e=s.getHash();return e.replace(i,"")},s.activate=function(n){s.active&&e.error("History has already been activated."),s.active=!0,s.options=e.extend({},{root:"/"},s.options,n),s.root=s.options.root,s._wantsHashChange=s.options.hashChange!==!1,s._wantsPushState=!!s.options.pushState,s._hasPushState=!!(s.options.pushState&&s.history&&s.history.pushState);var a=s.getFragment(),c=document.documentMode,u=o.exec(navigator.userAgent.toLowerCase())&&(!c||7>=c);s.root=("/"+s.root+"/").replace(r,"/"),u&&s._wantsHashChange&&(s.iframe=t('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,s.navigate(a,!1)),s._hasPushState?t(window).on("popstate",s.checkUrl):s._wantsHashChange&&"onhashchange"in window&&!u?t(window).on("hashchange",s.checkUrl):s._wantsHashChange&&(s._checkUrlInterval=setInterval(s.checkUrl,s.interval)),s.fragment=a;var l=s.location,d=l.pathname.replace(/[^\/]$/,"$&/")===s.root;if(s._wantsHashChange&&s._wantsPushState){if(!s._hasPushState&&!d)return s.fragment=s.getFragment(null,!0),s.location.replace(s.root+s.location.search+"#"+s.fragment),!0;s._hasPushState&&d&&l.hash&&(this.fragment=s.getHash().replace(i,""),this.history.replaceState({},document.title,s.root+s.fragment+l.search))}return s.options.silent?void 0:s.loadUrl()},s.deactivate=function(){t(window).off("popstate",s.checkUrl).off("hashchange",s.checkUrl),clearInterval(s._checkUrlInterval),s.active=!1},s.checkUrl=function(){var e=s.getFragment();return e===s.fragment&&s.iframe&&(e=s.getFragment(s.getHash(s.iframe))),e===s.fragment?!1:(s.iframe&&s.navigate(e,!1),s.loadUrl(),void 0)},s.loadUrl=function(e){var t=s.fragment=s.getFragment(e);return s.options.routeHandler?s.options.routeHandler(t):!1},s.navigate=function(t,i){if(!s.active)return!1;if(void 0===i?i={trigger:!0}:e.isBoolean(i)&&(i={trigger:i}),t=s.getFragment(t||""),s.fragment!==t){s.fragment=t;var r=s.root+t;if(s._hasPushState)s.history[i.replace?"replaceState":"pushState"]({},document.title,r);else{if(!s._wantsHashChange)return s.location.assign(r);n(s.location,t,i.replace),s.iframe&&t!==s.getFragment(s.getHash(s.iframe))&&(i.replace||s.iframe.document.open().close(),n(s.iframe.location,t,i.replace))}return i.trigger?s.loadUrl(t):void 0}},s.navigateBack=function(){s.history.back()},s});
define('plugins/router',["durandal/system","durandal/app","durandal/activator","durandal/events","durandal/composition","plugins/history","knockout","jquery"],function(e,t,n,r,i,o,a,s){function c(e){return e=e.replace(b,"\\$&").replace(p,"(?:$1)?").replace(h,function(e,t){return t?e:"([^/]+)"}).replace(m,"(.*?)"),new RegExp("^"+e+"$")}function u(e){var t=e.indexOf(":"),n=t>0?t-1:e.length;return e.substring(0,n)}function l(e){return e.router&&e.router.loadUrl}function d(e,t){return-1!==e.indexOf(t,e.length-t.length)}function f(e,t){if(!e||!t)return!1;if(e.length!=t.length)return!1;for(var n=0,r=e.length;r>n;n++)if(e[n]!=t[n])return!1;return!0}var v,g,p=/\((.*?)\)/g,h=/(\(\?)?:\w+/g,m=/\*\w+/g,b=/[\-{}\[\]+?.,\\\^$|#\s]/g,y=/\/$/,w=function(){function i(t,n){e.log("Navigation Complete",t,n);var r=e.getModuleId(O);r&&E.trigger("router:navigation:from:"+r),O=t,D=n;var i=e.getModuleId(O);i&&E.trigger("router:navigation:to:"+i),l(t)||E.updateDocumentTitle(t,n),g.explicitNavigation=!1,g.navigatingBack=!1,E.trigger("router:navigation:complete",t,n,E)}function s(t,n){e.log("Navigation Cancelled"),E.activeInstruction(D),D&&E.navigate(D.fragment,!1),M(!1),g.explicitNavigation=!1,g.navigatingBack=!1,E.trigger("router:navigation:cancelled",t,n,E)}function p(t){e.log("Navigation Redirecting"),M(!1),g.explicitNavigation=!1,g.navigatingBack=!1,E.navigate(t,{trigger:!0,replace:!0})}function h(e,t,n){g.navigatingBack=!g.explicitNavigation&&O!=n.fragment,E.trigger("router:route:activating",t,n,E),e.activateItem(t,n.params).then(function(r){if(r){var o=O;i(t,n),l(t)&&_({router:t.router,fragment:n.fragment,queryString:n.queryString}),o==t&&E.attached()}else e.settings.lifecycleData&&e.settings.lifecycleData.redirect?p(e.settings.lifecycleData.redirect):s(t,n);v&&(v.resolve(),v=null)})}function m(t,n,r){var i=E.guardRoute(n,r);i?i.then?i.then(function(i){i?e.isString(i)?p(i):h(t,n,r):s(n,r)}):e.isString(i)?p(i):h(t,n,r):s(n,r)}function b(e,t,n){E.guardRoute?m(e,t,n):h(e,t,n)}function x(e){return D&&D.config.moduleId==e.config.moduleId&&O&&(O.canReuseForRoute&&O.canReuseForRoute.apply(O,e.params)||O.router&&O.router.loadUrl)}function I(){if(!M()){var t=V.shift();if(V=[],t){if(t.router){var r=t.fragment;return t.queryString&&(r+="?"+t.queryString),t.router.loadUrl(r),void 0}M(!0),E.activeInstruction(t),x(t)?b(n.create(),O,t):e.acquire(t.config.moduleId).then(function(n){var r=e.resolveObject(n);b(T,r,t)}).fail(function(n){e.error("Failed to load routed module ("+t.config.moduleId+"). Details: "+n.message)})}}}function _(e){V.unshift(e),I()}function S(e,t,n){for(var r=e.exec(t).slice(1),i=0;i<r.length;i++){var o=r[i];r[i]=o?decodeURIComponent(o):null}var a=E.parseQueryString(n);return a&&r.push(a),{params:r,queryParams:a}}function A(t){E.trigger("router:route:before-config",t,E),e.isRegExp(t)?t.routePattern=t.route:(t.title=t.title||E.convertRouteToTitle(t.route),t.moduleId=t.moduleId||E.convertRouteToModuleId(t.route),t.hash=t.hash||E.convertRouteToHash(t.route),t.routePattern=c(t.route)),E.trigger("router:route:after-config",t,E),E.routes.push(t),E.route(t.routePattern,function(e,n){var r=S(t.routePattern,e,n);_({fragment:e,queryString:n,config:t,params:r.params,queryParams:r.queryParams})})}function k(t){if(e.isArray(t.route))for(var n=0,r=t.route.length;r>n;n++){var i=e.extend({},t);i.route=t.route[n],n>0&&delete i.nav,A(i)}else A(t);return E}function C(e){e.isActive||(e.isActive=a.computed(function(){var t=T();return t&&t.__moduleId__==e.moduleId}))}var O,D,V=[],M=a.observable(!1),T=n.create(),E={handlers:[],routes:[],navigationModel:a.observableArray([]),activeItem:T,isNavigating:a.computed(function(){var e=T(),t=M(),n=e&&e.router&&e.router!=E&&e.router.isNavigating()?!0:!1;return t||n}),activeInstruction:a.observable(null),__router__:!0};return r.includeIn(E),T.settings.areSameItem=function(e,t,n,r){return e==t?f(n,r):!1},E.parseQueryString=function(e){var t,n;if(!e)return null;if(n=e.split("&"),0==n.length)return null;t={};for(var r=0;r<n.length;r++){var i=n[r];if(""!==i){var o=i.split("=");t[o[0]]=o[1]&&decodeURIComponent(o[1].replace(/\+/g," "))}}return t},E.route=function(e,t){E.handlers.push({routePattern:e,callback:t})},E.loadUrl=function(t){var n=E.handlers,r=null,i=t,a=t.indexOf("?");if(-1!=a&&(i=t.substring(0,a),r=t.substr(a+1)),E.relativeToParentRouter){var s=this.parent.activeInstruction();i=s.params.join("/"),i&&"/"==i[0]&&(i=i.substr(1)),i||(i=""),i=i.replace("//","/").replace("//","/")}i=i.replace(y,"");for(var c=0;c<n.length;c++){var u=n[c];if(u.routePattern.test(i))return u.callback(i,r),!0}return e.log("Route Not Found"),E.trigger("router:route:not-found",t,E),D&&o.navigate(D.fragment,{trigger:!1,replace:!0}),g.explicitNavigation=!1,g.navigatingBack=!1,!1},E.updateDocumentTitle=function(e,n){n.config.title?document.title=t.title?n.config.title+" | "+t.title:n.config.title:t.title&&(document.title=t.title)},E.navigate=function(e,t){return e&&-1!=e.indexOf("://")?(window.location.href=e,!0):(g.explicitNavigation=!0,o.navigate(e,t))},E.navigateBack=function(){o.navigateBack()},E.attached=function(){setTimeout(function(){M(!1),E.trigger("router:navigation:attached",O,D,E),I()},10)},E.compositionComplete=function(){E.trigger("router:navigation:composition-complete",O,D,E)},E.convertRouteToHash=function(e){if(E.relativeToParentRouter){var t=E.parent.activeInstruction(),n=t.config.hash+"/"+e;return o._hasPushState&&(n="/"+n),n=n.replace("//","/").replace("//","/")}return o._hasPushState?e:"#"+e},E.convertRouteToModuleId=function(e){return u(e)},E.convertRouteToTitle=function(e){var t=u(e);return t.substring(0,1).toUpperCase()+t.substring(1)},E.map=function(t,n){if(e.isArray(t)){for(var r=0;r<t.length;r++)E.map(t[r]);return E}return e.isString(t)||e.isRegExp(t)?(n?e.isString(n)&&(n={moduleId:n}):n={},n.route=t):n=t,k(n)},E.buildNavigationModel=function(t){var n=[],r=E.routes;t=t||100;for(var i=0;i<r.length;i++){var o=r[i];o.nav&&(e.isNumber(o.nav)||(o.nav=t),C(o),n.push(o))}return n.sort(function(e,t){return e.nav-t.nav}),E.navigationModel(n),E},E.mapUnknownRoutes=function(t,n){var r="*catchall",i=c(r);return E.route(i,function(a,s){var c=S(i,a,s),u={fragment:a,queryString:s,config:{route:r,routePattern:i},params:c.params,queryParams:c.queryParams};if(t)if(e.isString(t))u.config.moduleId=t,n&&o.navigate(n,{trigger:!1,replace:!0});else if(e.isFunction(t)){var l=t(u);if(l&&l.then)return l.then(function(){E.trigger("router:route:before-config",u.config,E),E.trigger("router:route:after-config",u.config,E),_(u)}),void 0}else u.config=t,u.config.route=r,u.config.routePattern=i;else u.config.moduleId=a;E.trigger("router:route:before-config",u.config,E),E.trigger("router:route:after-config",u.config,E),_(u)}),E},E.reset=function(){return D=O=void 0,E.handlers=[],E.routes=[],E.off(),delete E.options,E},E.makeRelative=function(t){return e.isString(t)&&(t={moduleId:t,route:t}),t.moduleId&&!d(t.moduleId,"/")&&(t.moduleId+="/"),t.route&&!d(t.route,"/")&&(t.route+="/"),t.fromParent&&(E.relativeToParentRouter=!0),E.on("router:route:before-config").then(function(e){t.moduleId&&(e.moduleId=t.moduleId+e.moduleId),t.route&&(e.route=""===e.route?t.route.substring(0,t.route.length-1):t.route+e.route)}),E},E.createChildRouter=function(){var e=w();return e.parent=E,e},E};return g=w(),g.explicitNavigation=!1,g.navigatingBack=!1,g.activate=function(t){return e.defer(function(n){if(v=n,g.options=e.extend({routeHandler:g.loadUrl},g.options,t),o.activate(g.options),o._hasPushState)for(var r=g.routes,i=r.length;i--;){var a=r[i];a.hash=a.hash.replace("#","")}s(document).delegate("a","click",function(e){if(g.explicitNavigation=!0,o._hasPushState&&!(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)){var t=s(this).attr("href"),n=this.protocol+"//";(!t||"#"!==t.charAt(0)&&t.slice(n.length)!==n)&&(e.preventDefault(),o.navigate(t))}})}).promise()},g.deactivate=function(){o.deactivate()},g.install=function(){a.bindingHandlers.router={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,r,o){var s=a.utils.unwrapObservable(t())||{};if(s.__router__)s={model:s.activeItem(),attached:s.attached,compositionComplete:s.compositionComplete,activate:!1};else{var c=a.utils.unwrapObservable(s.router||r.router)||g;s.model=c.activeItem(),s.attached=c.attached,s.compositionComplete=c.compositionComplete,s.activate=!1}i.compose(e,s,o)}},a.virtualElements.allowedBindings.router=!0},g});
define('viewmodels/shell',["plugins/router","durandal/app","services/utilities","services/cachingService"],function(e,t,n,r){var i=ko.observable(""),o=ko.observable(""),a=ko.observable(!1),s=ko.observable(!1),c=ko.observable(""),u=ko.observable("main"),l=t.version;return{selectedSubMenu:c,selectedMainMenu:u,username:i,password:o,version:l,router:e,cachingService:r,isLoggedIn:a,isAdmin:s,logout:function(){t.showMessage("תודה שגלשת באיזור האישי. להתראות."),r.setLogin(!1),a(!1),r.add("Auth",""),e.navigate("")},activate:function(){return e.map([{route:"",title:"Login",moduleId:"viewmodels/login",nav:!0,admin:!1},{route:"home",title:"Dashboard",moduleId:"viewmodels/dashboard",nav:!0,admin:!1}]).buildNavigationModel(),e.guardRoute=function(e,t){return""===t.fragment?a()?"#home":!0:e.admin?a()&&s()?!0:a()?(s()||displayService.display("דף זה נגיש למשתמשים מורשים בלבד!","error"),!1):!1:a()?!0:(alert("You requested home, but you are not logged in"),"#")},e.activate("")}}});
define('viewmodels/dashboard',['viewmodels/shell'],function(){var e=require("viewmodels/shell"),t=ko.observable("1"),n=function(){return Math.floor(7*Math.random()+1)},r={activate:function(){e.selectedSubMenu(""),e.selectedMainMenu("contact"),t(n())},compositionComplete:function(){},getActiveImage:n,activeImage:t};return r});
define('viewmodels/login',["viewmodels/shell","plugins/router","durandal/app","services/utilities","services/cachingService"],function(e,t,n,r,i){this.login=function(){i.setLogin(!1),$.ajax({type:"POST",url:"/ws/authenticate.php",headers:{Authorization:r.getBase64Auth(e.username(),e.password())}}).done(function(n){n.isAuthorized?(i.setLogin(!0),e.isLoggedIn(!0),e.isAdmin(!1),i.add("Auth",r.getBase64Auth(e.username(),e.password())),e.password(""),t.navigate("#home")):e.password("")}).error(function(){e.password("")})};var o={username:e.username,password:e.password,activate:function(){},compositionComplete:function(){}};return o});
define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('text!views/dashboard.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row">\r\n        <div class="col-md-6 text-right">\r\n            ברוכים הבאים לאיזור האישי\r\n        </div>\r\n    </div>\r\n\r\n</div>\r\n\r\n';});

define('text!views/detail.html',[],function () { return '<div class="messageBox autoclose" style="max-width: 425px">\r\n    <div class="modal-header">\r\n        <h3>Details</h3>\r\n    </div>\r\n    <div class="modal-body">\r\n        <p data-bind="html: description"></p>\r\n    </div>\r\n</div>';});

define('text!views/login.html',[],function () { return '<div class="container center">\r\n    <div class="margin-bottom-20">\r\n\r\n    </div>\r\n    <div class="row">\r\n        <div>\r\n            <h1>אגודת חובבי הרדיו בישראל - האיזור האישי</h1>\r\n            <h3 class="margin-bottom-20">ברוך הבא לאיזור האישי. כדי להיכנס, עליך להכניס שם וסיסמה.</h3>\r\n        </div>\r\n    </div>\r\n    <div class="row">\r\n        <form class="form-signin mg-btm">\r\n            <div class="main">\r\n                <input type="text" class="form-control" placeholder="שם משתמש" data-bind="value: username" autofocus>\r\n                <input type="password" class="form-control" placeholder="סיסמה" data-bind="value: password">\r\n                <span class="clearfix"></span>\r\n            </div>\r\n            <div class="login-footer">\r\n                <div class="row">\r\n                    <div class="col-xs-6 col-md-6">\r\n                        <div class="left-section">\r\n                            <a href="">שכחת סיסמה?</a>\r\n                        </div>\r\n                    </div>\r\n                    <div class="col-xs-6 col-md-6 pull-right">\r\n                        <button type="submit" class="btn btn-large btn-primary pull-right" data-bind="click:login">התחבר</button>\r\n                    </div>\r\n                </div>\r\n\r\n            </div>\r\n        </form>\r\n    </div>\r\n</div>\r\n';});

define('text!views/shell.html',[],function () { return '<!--=== Top ===-->\r\n<div class="top-v1">\r\n    <div class="container">\r\n        <div class="row">\r\n            <div class="col-md-6">\r\n                <ul class="list-unstyled top-v1-contacts text-left">\r\n                    <li>\r\n                        <i class="icon-off"></i><span data-bind="click: logout">התנתק</span>\r\n                    </li>\r\n                    <li><span data-bind="html: \'V\' + version" style="color: #f1f1f1"></span>\r\n                    </li>\r\n                </ul>\r\n            </div>\r\n            <div class="col-md-6">\r\n                <ul class="list-unstyled top-v1-contacts">\r\n                    <li>אגודת חובבי הרדיו בישראל (ע"ר)\r\n                    </li>\r\n                    <li>\r\n                        <i class="icon-envelope"></i>דואל: <a href="mailto:info@iarc.org">info@iarc.org</a>\r\n                    </li>\r\n                    <!--<li>\r\n                        <i class="icon-phone"></i>תמיכה: 054-7828077\n                    </li>-->\r\n                </ul>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n<!--/top-v1-->\r\n<!--=== End Top ===-->\r\n\r\n<!--=== Header ===-->\r\n<div class="header margin-bottom-10" data-bind="visible: isLoggedIn()">\r\n    <div class="navbar navbar-default" role="navigation">\r\n        <div class="container">\r\n            <!-- Collect the nav links, forms, and other content for toggling -->\r\n            <div class="_collapse _navbar-collapse _navbar-responsive-collapse">\r\n                <ul class="nav navbar-nav navbar-right">\r\n                    \r\n                    <li data-bind="css: { active: selectedMainMenu() == \'contact\' }">\r\n                        <a href="#Contact">צור קשר\n                        </a>\r\n                    </li>\r\n                    <li data-bind="css: { active: selectedMainMenu() == \'details\' }">\r\n                        <a href="#PA">פרטים אישיים</a>\r\n                    </li>\r\n                    \r\n                    <li class="dropdown" data-bind="css: { active: selectedMainMenu() == \'services\' }">\r\n                        <a href="#Aguda" class="dropdown-toggle">שירות לחבר\r\n                            <i class="caret"></i>\r\n                        </a>\r\n                        <ul class="dropdown-menu">\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'market\' }"><a href="#Membership">קניה\\מכירה</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'mail\' }"><a href="#Register">תיבת דואר</a></li>\r\n                        </ul>\r\n                    </li>\r\n                    <li data-bind="css: { active: selectedMainMenu() == \'main\' }">\r\n                        <a href="#">הודעות\n                        </a>\r\n                    </li>\r\n                </ul>\r\n            </div>\r\n            <!-- /navbar-collapse -->\r\n        </div>\r\n    </div>\r\n</div>\r\n<!--/header-->\r\n<!--=== End Header ===-->\r\n\r\n<!--=== Content Part ===-->\r\n<div class="container">\r\n    <!-- End Sidebar -->\r\n    <div class="col-md-12 pull-right container-fluid page-host" data-bind="router: { transition: \'entrance\', cacheViews: true }"></div>\r\n\r\n</div>\r\n<!--/container-->\r\n<!-- End Content Part -->\r\n';});

define('plugins/dialog',["durandal/system","durandal/app","durandal/composition","durandal/activator","durandal/viewEngine","jquery","knockout"],function(e,t,n,i,r,o,a){function s(t){return e.defer(function(n){e.isString(t)?e.acquire(t).then(function(t){n.resolve(e.resolveObject(t))}).fail(function(n){e.error("Failed to load dialog module ("+t+"). Details: "+n.message)}):n.resolve(t)}).promise()}var c,u={},l=0,d=function(e,t,n){this.message=e,this.title=t||d.defaultTitle,this.options=n||d.defaultOptions};return d.prototype.selectOption=function(e){c.close(this,e)},d.prototype.getView=function(){return r.processMarkup(d.defaultViewMarkup)},d.setViewUrl=function(e){delete d.prototype.getView,d.prototype.viewUrl=e},d.defaultTitle=t.title||"Application",d.defaultOptions=["Ok"],d.defaultViewMarkup=['<div data-view="plugins/messageBox" class="messageBox">','<div class="modal-header">','<h3 data-bind="text: title"></h3>',"</div>",'<div class="modal-body">','<p class="message" data-bind="text: message"></p>',"</div>",'<div class="modal-footer" data-bind="foreach: options">','<button class="btn" data-bind="click: function () { $parent.selectOption($data); }, text: $data, css: { \'btn-primary\': $index() == 0, autofocus: $index() == 0 }"></button>',"</div>","</div>"].join("\n"),c={MessageBox:d,currentZIndex:1050,getNextZIndex:function(){return++this.currentZIndex},isOpen:function(){return l>0},getContext:function(e){return u[e||"default"]},addContext:function(e,t){t.name=e,u[e]=t;var n="show"+e.substr(0,1).toUpperCase()+e.substr(1);this[n]=function(t,n){return this.show(t,n,e)}},createCompositionSettings:function(e,t){var n={model:e,activate:!1};return t.attached&&(n.attached=t.attached),t.compositionComplete&&(n.compositionComplete=t.compositionComplete),n},getDialog:function(e){return e?e.__dialog__:void 0},close:function(e){var t=this.getDialog(e);if(t){var n=Array.prototype.slice.call(arguments,1);t.close.apply(t,n)}},show:function(t,r,o){var a=this,c=u[o||"default"];return e.defer(function(e){s(t).then(function(t){var o=i.create();o.activateItem(t,r).then(function(i){if(i){var r=t.__dialog__={owner:t,context:c,activator:o,close:function(){var n=arguments;o.deactivateItem(t,!0).then(function(i){i&&(l--,c.removeHost(r),delete t.__dialog__,0==n.length?e.resolve():1==n.length?e.resolve(n[0]):e.resolve.apply(e,n))})}};r.settings=a.createCompositionSettings(t,c),c.addHost(r),l++,n.compose(r.host,r.settings)}else e.resolve(!1)})})}).promise()},showMessage:function(t,n,i){return e.isString(this.MessageBox)?c.show(this.MessageBox,[t,n||d.defaultTitle,i||d.defaultOptions]):c.show(new this.MessageBox(t,n,i))},install:function(e){t.showDialog=function(e,t,n){return c.show(e,t,n)},t.showMessage=function(e,t,n){return c.showMessage(e,t,n)},e.messageBox&&(c.MessageBox=e.messageBox),e.messageBoxView&&(c.MessageBox.prototype.getView=function(){return e.messageBoxView})}},c.addContext("default",{blockoutOpacity:.2,removeDelay:200,addHost:function(e){var t=o("body"),n=o('<div class="modalBlockout"></div>').css({"z-index":c.getNextZIndex(),opacity:this.blockoutOpacity}).appendTo(t),i=o('<div class="modalHost"></div>').css({"z-index":c.getNextZIndex()}).appendTo(t);if(e.host=i.get(0),e.blockout=n.get(0),!c.isOpen()){e.oldBodyMarginRight=t.css("margin-right"),e.oldInlineMarginRight=t.get(0).style.marginRight;var r=o("html"),a=t.outerWidth(!0),s=r.scrollTop();o("html").css("overflow-y","hidden");var u=o("body").outerWidth(!0);t.css("margin-right",u-a+parseInt(e.oldBodyMarginRight)+"px"),r.scrollTop(s)}},removeHost:function(e){if(o(e.host).css("opacity",0),o(e.blockout).css("opacity",0),setTimeout(function(){a.removeNode(e.host),a.removeNode(e.blockout)},this.removeDelay),!c.isOpen()){var t=o("html"),n=t.scrollTop();t.css("overflow-y","").scrollTop(n),e.oldInlineMarginRight?o("body").css("margin-right",e.oldBodyMarginRight):o("body").css("margin-right","")}},compositionComplete:function(e,t,n){var i=o(e),r=i.width(),a=i.height(),s=c.getDialog(n.model);i.css({"margin-top":(-a/2).toString()+"px","margin-left":(-r/2).toString()+"px"}),o(s.host).css("opacity",1),o(e).hasClass("autoclose")&&o(s.blockout).click(function(){s.close()}),o(".autofocus",e).each(function(){o(this).focus()})}}),c});
define('plugins/http',["jquery","knockout"],function(e,t){return{callbackParam:"callback",get:function(t,n){return e.ajax(t,{data:n})},jsonp:function(t,n,i){return-1==t.indexOf("=?")&&(i=i||this.callbackParam,t+=-1==t.indexOf("?")?"?":"&",t+=i+"=?"),e.ajax({url:t,dataType:"jsonp",data:n})},post:function(n,i){return e.ajax({url:n,data:t.toJSON(i),type:"POST",contentType:"application/json",dataType:"json"})}}});
define('plugins/observable',["durandal/system","durandal/binder","knockout"],function(e,t,n){function i(e){var t=e[0];return"_"===t||"$"===t}function r(t){if(!t||e.isElement(t)||t.ko===n||t.jquery)return!1;var i=d.call(t);return-1==f.indexOf(i)&&!(t===!0||t===!1)}function o(e,t){var n=e.__observable__,i=!0;if(!n||!n.__full__){n=n||(e.__observable__={}),n.__full__=!0,v.forEach(function(n){e[n]=function(){i=!1;var e=m[n].apply(t,arguments);return i=!0,e}}),g.forEach(function(n){e[n]=function(){i&&t.valueWillMutate();var r=h[n].apply(e,arguments);return i&&t.valueHasMutated(),r}}),p.forEach(function(n){e[n]=function(){for(var r=0,o=arguments.length;o>r;r++)a(arguments[r]);i&&t.valueWillMutate();var s=h[n].apply(e,arguments);return i&&t.valueHasMutated(),s}}),e.splice=function(){for(var n=2,r=arguments.length;r>n;n++)a(arguments[n]);i&&t.valueWillMutate();var o=h.splice.apply(e,arguments);return i&&t.valueHasMutated(),o};for(var r=0,o=e.length;o>r;r++)a(e[r])}}function a(t){var a,s;if(r(t)&&(a=t.__observable__,!a||!a.__full__)){if(a=a||(t.__observable__={}),a.__full__=!0,e.isArray(t)){var u=n.observableArray(t);o(t,u)}else for(var l in t)i(l)||a[l]||(s=t[l],e.isFunction(s)||c(t,l,s));b&&e.log("Converted",t)}}function s(e,t,n){var i;e(t),i=e.peek(),n?i.destroyAll||(i||(i=[],e(i)),o(i,e)):a(i)}function c(t,i,r){var c,u,l=t.__observable__||(t.__observable__={});if(void 0===r&&(r=t[i]),e.isArray(r))c=n.observableArray(r),o(r,c),u=!0;else if("function"==typeof r){if(!n.isObservable(r))return null;c=r}else e.isPromise(r)?(c=n.observable(),r.then(function(t){if(e.isArray(t)){var i=n.observableArray(t);o(t,i),t=i}c(t)})):(c=n.observable(r),a(r));return Object.defineProperty(t,i,{configurable:!0,enumerable:!0,get:c,set:n.isWriteableObservable(c)?function(t){t&&e.isPromise(t)?t.then(function(t){s(c,t,e.isArray(t))}):s(c,t,u)}:void 0}),l[i]=c,c}function u(t,n,i){var r,o=this,a={owner:t,deferEvaluation:!0};return"function"==typeof i?a.read=i:("value"in i&&e.error('For ko.defineProperty, you must not specify a "value" for the property. You must provide a "get" function.'),"function"!=typeof i.get&&e.error('For ko.defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".'),a.read=i.get,a.write=i.set),r=o.computed(a),t[n]=r,c(t,n,r)}var l,d=Object.prototype.toString,f=["[object Function]","[object String]","[object Boolean]","[object Number]","[object Date]","[object RegExp]"],v=["remove","removeAll","destroy","destroyAll","replace"],g=["pop","reverse","sort","shift","splice"],p=["push","unshift"],h=Array.prototype,m=n.observableArray.fn,b=!1;return l=function(e,t){var i,r,o;return e?(i=e.__observable__,i&&(r=i[t])?r:(o=e[t],n.isObservable(o)?o:c(e,t,o))):null},l.defineProperty=u,l.convertProperty=c,l.convertObject=a,l.install=function(e){var n=t.binding;t.binding=function(e,t,i){i.applyBindings&&!i.skipConversion&&a(e),n(e,t)},b=e.logConversion},l});
define('plugins/serializer',["durandal/system"],function(e){return{typeAttribute:"type",space:void 0,replacer:function(e,t){if(e){var n=e[0];if("_"===n||"$"===n)return void 0}return t},serialize:function(t,n){return n=void 0===n?{}:n,(e.isString(n)||e.isNumber(n))&&(n={space:n}),JSON.stringify(t,n.replacer||this.replacer,n.space||this.space)},getTypeId:function(e){return e?e[this.typeAttribute]:void 0},typeMap:{},registerType:function(){var t=arguments[0];if(1==arguments.length){var n=t[this.typeAttribute]||e.getModuleId(t);this.typeMap[n]=t}else this.typeMap[t]=arguments[1]},reviver:function(e,t,n,r){var i=n(t);if(i){var o=r(i);if(o)return o.fromJSON?o.fromJSON(t):new o(t)}return t},deserialize:function(e,t){var n=this;t=t||{};var r=t.getTypeId||function(e){return n.getTypeId(e)},i=t.getConstructor||function(e){return n.typeMap[e]},o=t.reviver||function(e,t){return n.reviver(e,t,r,i)};return JSON.parse(e,o)}}});
define('plugins/widget',["durandal/system","durandal/composition","jquery","knockout"],function(e,t,n,r){function i(e,n){var i=r.utils.domData.get(e,c);i||(i={parts:t.cloneNodes(r.virtualElements.childNodes(e))},r.virtualElements.emptyNode(e),r.utils.domData.set(e,c,i)),n.parts=i.parts}var o={},a={},s=["model","view","kind"],c="durandal-widget-data",u={getSettings:function(t){var n=r.utils.unwrapObservable(t())||{};if(e.isString(n))return{kind:n};for(var i in n)n[i]=-1!=r.utils.arrayIndexOf(s,i)?r.utils.unwrapObservable(n[i]):n[i];return n},registerKind:function(e){r.bindingHandlers[e]={init:function(){return{controlsDescendantBindings:!0}},update:function(t,n,r,o,a){var s=u.getSettings(n);s.kind=e,i(t,s),u.create(t,s,a,!0)}},r.virtualElements.allowedBindings[e]=!0},mapKind:function(e,t,n){t&&(a[e]=t),n&&(o[e]=n)},mapKindToModuleId:function(e){return o[e]||u.convertKindToModulePath(e)},convertKindToModulePath:function(e){return"widgets/"+e+"/viewmodel"},mapKindToViewId:function(e){return a[e]||u.convertKindToViewPath(e)},convertKindToViewPath:function(e){return"widgets/"+e+"/view"},createCompositionSettings:function(e,t){return t.model||(t.model=this.mapKindToModuleId(t.kind)),t.view||(t.view=this.mapKindToViewId(t.kind)),t.preserveContext=!0,t.activate=!0,t.activationData=t,t.mode="templated",t},create:function(e,n,r,i){i||(n=u.getSettings(function(){return n},e));var o=u.createCompositionSettings(e,n);t.compose(e,o,r)},install:function(e){if(e.bindingName=e.bindingName||"widget",e.kinds)for(var t=e.kinds,n=0;n<t.length;n++)u.registerKind(t[n]);r.bindingHandlers[e.bindingName]={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,r,o){var a=u.getSettings(t);i(e,a),u.create(e,a,o,!0)}},r.virtualElements.allowedBindings[e.bindingName]=!0}};return u});
define('transitions/entrance',["durandal/system","durandal/composition","jquery"],function(e,t,n){var r=100,i={marginRight:0,marginLeft:0,opacity:1},o={marginLeft:"",marginRight:"",opacity:"",display:""},a=function(t){return e.defer(function(e){function a(){e.resolve()}function s(){t.keepScrollPosition||n(document).scrollTop(0)}function c(){s(),t.triggerAttach();var e={marginLeft:l?"0":"20px",marginRight:l?"0":"-20px",opacity:0,display:"block"},r=n(t.child);r.css(e),r.animate(i,u,"swing",function(){r.css(o),a()})}if(t.child){var u=t.duration||500,l=!!t.fadeOnly;t.activeView?n(t.activeView).fadeOut(r,c):c()}else n(t.activeView).fadeOut(r,a)}).promise()};return a});
require(["main"]);
}());