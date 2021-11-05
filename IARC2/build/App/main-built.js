(function () {/**
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

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The system module encapsulates the most basic features used by other modules.
 * @module system
 * @requires require
 * @requires jquery
 */
define('durandal/system',['require', 'jquery'], function(require, $) {
    var isDebugging = false,
        nativeKeys = Object.keys,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        toString = Object.prototype.toString,
        system,
        treatAsIE8 = false,
        nativeIsArray = Array.isArray,
        slice = Array.prototype.slice;

    //see http://patik.com/blog/complete-cross-browser-console-log/
    // Tell IE9 to use its built-in console
    if (Function.prototype.bind && (typeof console === 'object' || typeof console === 'function') && typeof console.log == 'object') {
        try {
            ['log', 'info', 'warn', 'error', 'assert', 'dir', 'clear', 'profile', 'profileEnd']
                .forEach(function(method) {
                    console[method] = this.call(console[method], console);
                }, Function.prototype.bind);
        } catch (ex) {
            treatAsIE8 = true;
        }
    }

    // callback for dojo's loader 
    // note: if you wish to use Durandal with dojo's AMD loader,
    // currently you must fork the dojo source with the following
    // dojo/dojo.js, line 1187, the last line of the finishExec() function: 
    //  (add) signal("moduleLoaded", [module.result, module.mid]);
    // an enhancement request has been submitted to dojo to make this
    // a permanent change. To view the status of this request, visit:
    // http://bugs.dojotoolkit.org/ticket/16727

    if (require.on) {
        require.on("moduleLoaded", function(module, mid) {
            system.setModuleId(module, mid);
        });
    }

    // callback for require.js loader
    if (typeof requirejs !== 'undefined') {
        requirejs.onResourceLoad = function(context, map, depArray) {
            system.setModuleId(context.defined[map.id], map.id);
        };
    }

    var noop = function() { };

    var log = function() {
        try {
            // Modern browsers
            if (typeof console != 'undefined' && typeof console.log == 'function') {
                // Opera 11
                if (window.opera) {
                    var i = 0;
                    while (i < arguments.length) {
                        console.log('Item ' + (i + 1) + ': ' + arguments[i]);
                        i++;
                    }
                }
                // All other modern browsers
                else if ((slice.call(arguments)).length == 1 && typeof slice.call(arguments)[0] == 'string') {
                    console.log((slice.call(arguments)).toString());
                } else {
                    console.log.apply(console, slice.call(arguments));
                }
            }
            // IE8
            else if ((!Function.prototype.bind || treatAsIE8) && typeof console != 'undefined' && typeof console.log == 'object') {
                Function.prototype.call.call(console.log, console, slice.call(arguments));
            }

            // IE7 and lower, and other old browsers
        } catch (ignore) { }
    };

    var logError = function(error) {
        if(error instanceof Error){
            throw error;
        }

        throw new Error(error);
    };

    /**
     * @class SystemModule
     * @static
     */
    system = {
        /**
         * Durandal's version.
         * @property {string} version
         */
        version: "2.0.0",
        /**
         * A noop function.
         * @method noop
         */
        noop: noop,
        /**
         * Gets the module id for the specified object.
         * @method getModuleId
         * @param {object} obj The object whose module id you wish to determine.
         * @return {string} The module id.
         */
        getModuleId: function(obj) {
            if (!obj) {
                return null;
            }

            if (typeof obj == 'function') {
                return obj.prototype.__moduleId__;
            }

            if (typeof obj == 'string') {
                return null;
            }

            return obj.__moduleId__;
        },
        /**
         * Sets the module id for the specified object.
         * @method setModuleId
         * @param {object} obj The object whose module id you wish to set.
         * @param {string} id The id to set for the specified object.
         */
        setModuleId: function(obj, id) {
            if (!obj) {
                return;
            }

            if (typeof obj == 'function') {
                obj.prototype.__moduleId__ = id;
                return;
            }

            if (typeof obj == 'string') {
                return;
            }

            obj.__moduleId__ = id;
        },
        /**
         * Resolves the default object instance for a module. If the module is an object, the module is returned. If the module is a function, that function is called with `new` and it's result is returned.
         * @method resolveObject
         * @param {object} module The module to use to get/create the default object for.
         * @return {object} The default object for the module.
         */
        resolveObject: function(module) {
            if (system.isFunction(module)) {
                return new module();
            } else {
                return module;
            }
        },
        /**
         * Gets/Sets whether or not Durandal is in debug mode.
         * @method debug
         * @param {boolean} [enable] Turns on/off debugging.
         * @return {boolean} Whether or not Durandal is current debugging.
         */
        debug: function(enable) {
            if (arguments.length == 1) {
                isDebugging = enable;
                if (isDebugging) {
                    this.log = log;
                    this.error = logError;
                    this.log('Debug:Enabled');
                } else {
                    this.log('Debug:Disabled');
                    this.log = noop;
                    this.error = noop;
                }
            }

            return isDebugging;
        },
        /**
         * Logs data to the console. Pass any number of parameters to be logged. Log output is not processed if the framework is not running in debug mode.
         * @method log
         * @param {object} info* The objects to log.
         */
        log: noop,
        /**
         * Logs an error.
         * @method error
         * @param {string|Error} obj The error to report.
         */
        error: noop,
        /**
         * Asserts a condition by throwing an error if the condition fails.
         * @method assert
         * @param {boolean} condition The condition to check.
         * @param {string} message The message to report in the error if the condition check fails.
         */
        assert: function (condition, message) {
            if (!condition) {
                system.error(new Error(message || 'Assert:Failed'));
            }
        },
        /**
         * Creates a deferred object which can be used to create a promise. Optionally pass a function action to perform which will be passed an object used in resolving the promise.
         * @method defer
         * @param {function} [action] The action to defer. You will be passed the deferred object as a paramter.
         * @return {Deferred} The deferred object.
         */
        defer: function(action) {
            return $.Deferred(action);
        },
        /**
         * Creates a simple V4 UUID. This should not be used as a PK in your database. It can be used to generate internal, unique ids. For a more robust solution see [node-uuid](https://github.com/broofa/node-uuid).
         * @method guid
         * @return {string} The guid.
         */
        guid: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        /**
         * Uses require.js to obtain a module. This function returns a promise which resolves with the module instance. You can pass more than one module id to this function or an array of ids. If more than one or an array is passed, then the promise will resolve with an array of module instances.
         * @method acquire
         * @param {string|string[]} moduleId The id(s) of the modules to load.
         * @return {Promise} A promise for the loaded module(s).
         */
        acquire: function() {
            var modules,
                first = arguments[0],
                arrayRequest = false;

            if(system.isArray(first)){
                modules = first;
                arrayRequest = true;
            }else{
                modules = slice.call(arguments, 0);
            }

            return this.defer(function(dfd) {
                require(modules, function() {
                    var args = arguments;
                    setTimeout(function() {
                        if(args.length > 1 || arrayRequest){
                            dfd.resolve(slice.call(args, 0));
                        }else{
                            dfd.resolve(args[0]);
                        }
                    }, 1);
                }, function(err){
                    dfd.reject(err);
                });
            }).promise();
        },
        /**
         * Extends the first object with the properties of the following objects.
         * @method extend
         * @param {object} obj The target object to extend.
         * @param {object} extension* Uses to extend the target object.
         */
        extend: function(obj) {
            var rest = slice.call(arguments, 1);

            for (var i = 0; i < rest.length; i++) {
                var source = rest[i];

                if (source) {
                    for (var prop in source) {
                        obj[prop] = source[prop];
                    }
                }
            }

            return obj;
        },
        /**
         * Uses a setTimeout to wait the specified milliseconds.
         * @method wait
         * @param {number} milliseconds The number of milliseconds to wait.
         * @return {Promise}
         */
        wait: function(milliseconds) {
            return system.defer(function(dfd) {
                setTimeout(dfd.resolve, milliseconds);
            }).promise();
        }
    };

    /**
     * Gets all the owned keys of the specified object.
     * @method keys
     * @param {object} object The object whose owned keys should be returned.
     * @return {string[]} The keys.
     */
    system.keys = nativeKeys || function(obj) {
        if (obj !== Object(obj)) {
            throw new TypeError('Invalid object');
        }

        var keys = [];

        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                keys[keys.length] = key;
            }
        }

        return keys;
    };

    /**
     * Determines if the specified object is an html element.
     * @method isElement
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isElement = function(obj) {
        return !!(obj && obj.nodeType === 1);
    };

    /**
     * Determines if the specified object is an array.
     * @method isArray
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isArray = nativeIsArray || function(obj) {
        return toString.call(obj) == '[object Array]';
    };

    /**
     * Determines if the specified object is...an object. ie. Not an array, string, etc.
     * @method isObject
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isObject = function(obj) {
        return obj === Object(obj);
    };

    /**
     * Determines if the specified object is a boolean.
     * @method isBoolean
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isBoolean = function(obj) {
        return typeof(obj) === "boolean";
    };

    /**
     * Determines if the specified object is a promise.
     * @method isPromise
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isPromise = function(obj) {
        return obj && system.isFunction(obj.then);
    };

    /**
     * Determines if the specified object is a function arguments object.
     * @method isArguments
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a function.
     * @method isFunction
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a string.
     * @method isString
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a number.
     * @method isNumber
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a date.
     * @method isDate
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a boolean.
     * @method isBoolean
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    //isArguments, isFunction, isString, isNumber, isDate, isRegExp.
    var isChecks = ['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'];

    function makeIsFunction(name) {
        var value = '[object ' + name + ']';
        system['is' + name] = function(obj) {
            return toString.call(obj) == value;
        };
    }

    for (var i = 0; i < isChecks.length; i++) {
        makeIsFunction(isChecks[i]);
    }

    return system;
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The viewEngine module provides information to the viewLocator module which is used to locate the view's source file. The viewEngine also transforms a view id into a view instance.
 * @module viewEngine
 * @requires system
 * @requires jquery
 */
define('durandal/viewEngine',['durandal/system', 'jquery'], function (system, $) {
    var parseMarkup;

    if ($.parseHTML) {
        parseMarkup = function (html) {
            return $.parseHTML(html);
        };
    } else {
        parseMarkup = function (html) {
            return $(html).get();
        };
    }

    /**
     * @class ViewEngineModule
     * @static
     */
    return {
        /**
         * The file extension that view source files are expected to have.
         * @property {string} viewExtension
         * @default .html
         */
        viewExtension: '.html',
        /**
         * The name of the RequireJS loader plugin used by the viewLocator to obtain the view source. (Use requirejs to map the plugin's full path).
         * @property {string} viewPlugin
         * @default text
         */
        viewPlugin: 'text',
        /**
         * Determines if the url is a url for a view, according to the view engine.
         * @method isViewUrl
         * @param {string} url The potential view url.
         * @return {boolean} True if the url is a view url, false otherwise.
         */
        isViewUrl: function (url) {
            return url.indexOf(this.viewExtension, url.length - this.viewExtension.length) !== -1;
        },
        /**
         * Converts a view url into a view id.
         * @method convertViewUrlToViewId
         * @param {string} url The url to convert.
         * @return {string} The view id.
         */
        convertViewUrlToViewId: function (url) {
            return url.substring(0, url.length - this.viewExtension.length);
        },
        /**
         * Converts a view id into a full RequireJS path.
         * @method convertViewIdToRequirePath
         * @param {string} viewId The view id to convert.
         * @return {string} The require path.
         */
        convertViewIdToRequirePath: function (viewId) {
            return this.viewPlugin + '!' + viewId + this.viewExtension;
        },
        /**
         * Parses the view engine recognized markup and returns DOM elements.
         * @method parseMarkup
         * @param {string} markup The markup to parse.
         * @return {DOMElement[]} The elements.
         */
        parseMarkup: parseMarkup,
        /**
         * Calls `parseMarkup` and then pipes the results through `ensureSingleElement`.
         * @method processMarkup
         * @param {string} markup The markup to process.
         * @return {DOMElement} The view.
         */
        processMarkup: function (markup) {
            var allElements = this.parseMarkup(markup);
            return this.ensureSingleElement(allElements);
        },
        /**
         * Converts an array of elements into a single element. White space and comments are removed. If a single element does not remain, then the elements are wrapped.
         * @method ensureSingleElement
         * @param {DOMElement[]} allElements The elements.
         * @return {DOMElement} A single element.
         */
        ensureSingleElement:function(allElements){
            if (allElements.length == 1) {
                return allElements[0];
            }

            var withoutCommentsOrEmptyText = [];

            for (var i = 0; i < allElements.length; i++) {
                var current = allElements[i];
                if (current.nodeType != 8) {
                    if (current.nodeType == 3) {
                        var result = /\S/.test(current.nodeValue);
                        if (!result) {
                            continue;
                        }
                    }

                    withoutCommentsOrEmptyText.push(current);
                }
            }

            if (withoutCommentsOrEmptyText.length > 1) {
                return $(withoutCommentsOrEmptyText).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0);
            }

            return withoutCommentsOrEmptyText[0];
        },
        /**
         * Creates the view associated with the view id.
         * @method createView
         * @param {string} viewId The view id whose view should be created.
         * @return {Promise} A promise of the view.
         */
        createView: function(viewId) {
            var that = this;
            var requirePath = this.convertViewIdToRequirePath(viewId);

            return system.defer(function(dfd) {
                system.acquire(requirePath).then(function(markup) {
                    var element = that.processMarkup(markup);
                    element.setAttribute('data-view', viewId);
                    dfd.resolve(element);
                }).fail(function(err){
                        that.createFallbackView(viewId, requirePath, err).then(function(element){
                            element.setAttribute('data-view', viewId);
                            dfd.resolve(element);
                        });
                    });
            }).promise();
        },
        /**
         * Called when a view cannot be found to provide the opportunity to locate or generate a fallback view. Mainly used to ease development.
         * @method createFallbackView
         * @param {string} viewId The view id whose view should be created.
         * @param {string} requirePath The require path that was attempted.
         * @param {Error} requirePath The error that was returned from the attempt to locate the default view.
         * @return {Promise} A promise for the fallback view.
         */
        createFallbackView: function (viewId, requirePath, err) {
            var that = this,
                message = 'View Not Found. Searched for "' + viewId + '" via path "' + requirePath + '".';

            return system.defer(function(dfd) {
                dfd.resolve(that.processMarkup('<div class="durandal-view-404">' + message + '</div>'));
            }).promise();
        }
    };
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The viewLocator module collaborates with the viewEngine module to provide views (literally dom sub-trees) to other parts of the framework as needed. The primary consumer of the viewLocator is the composition module.
 * @module viewLocator
 * @requires system
 * @requires viewEngine
 */
define('durandal/viewLocator',['durandal/system', 'durandal/viewEngine'], function (system, viewEngine) {
    function findInElements(nodes, url) {
        for (var i = 0; i < nodes.length; i++) {
            var current = nodes[i];
            var existingUrl = current.getAttribute('data-view');
            if (existingUrl == url) {
                return current;
            }
        }
    }
    
    function escape(str) {
        return (str + '').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1");
    }

    /**
     * @class ViewLocatorModule
     * @static
     */
    return {
        /**
         * Allows you to set up a convention for mapping module folders to view folders. It is a convenience method that customizes `convertModuleIdToViewId` and `translateViewIdToArea` under the covers.
         * @method useConvention
         * @param {string} [modulesPath] A string to match in the path and replace with the viewsPath. If not specified, the match is 'viewmodels'.
         * @param {string} [viewsPath] The replacement for the modulesPath. If not specified, the replacement is 'views'.
         * @param {string} [areasPath] Partial views are mapped to the "views" folder if not specified. Use this parameter to change their location.
         */
        useConvention: function(modulesPath, viewsPath, areasPath) {
            modulesPath = modulesPath || 'viewmodels';
            viewsPath = viewsPath || 'views';
            areasPath = areasPath || viewsPath;

            var reg = new RegExp(escape(modulesPath), 'gi');

            this.convertModuleIdToViewId = function (moduleId) {
                return moduleId.replace(reg, viewsPath);
            };

            this.translateViewIdToArea = function (viewId, area) {
                if (!area || area == 'partial') {
                    return areasPath + '/' + viewId;
                }
                
                return areasPath + '/' + area + '/' + viewId;
            };
        },
        /**
         * Maps an object instance to a view instance.
         * @method locateViewForObject
         * @param {object} obj The object to locate the view for.
         * @param {string} [area] The area to translate the view to.
         * @param {DOMElement[]} [elementsToSearch] An existing set of elements to search first.
         * @return {Promise} A promise of the view.
         */
        locateViewForObject: function(obj, area, elementsToSearch) {
            var view;

            if (obj.getView) {
                view = obj.getView();
                if (view) {
                    return this.locateView(view, area, elementsToSearch);
                }
            }

            if (obj.viewUrl) {
                return this.locateView(obj.viewUrl, area, elementsToSearch);
            }

            var id = system.getModuleId(obj);
            if (id) {
                return this.locateView(this.convertModuleIdToViewId(id), area, elementsToSearch);
            }

            return this.locateView(this.determineFallbackViewId(obj), area, elementsToSearch);
        },
        /**
         * Converts a module id into a view id. By default the ids are the same.
         * @method convertModuleIdToViewId
         * @param {string} moduleId The module id.
         * @return {string} The view id.
         */
        convertModuleIdToViewId: function(moduleId) {
            return moduleId;
        },
        /**
         * If no view id can be determined, this function is called to genreate one. By default it attempts to determine the object's type and use that.
         * @method determineFallbackViewId
         * @param {object} obj The object to determine the fallback id for.
         * @return {string} The view id.
         */
        determineFallbackViewId: function (obj) {
            var funcNameRegex = /function (.{1,})\(/;
            var results = (funcNameRegex).exec((obj).constructor.toString());
            var typeName = (results && results.length > 1) ? results[1] : "";

            return 'views/' + typeName;
        },
        /**
         * Takes a view id and translates it into a particular area. By default, no translation occurs.
         * @method translateViewIdToArea
         * @param {string} viewId The view id.
         * @param {string} area The area to translate the view to.
         * @return {string} The translated view id.
         */
        translateViewIdToArea: function (viewId, area) {
            return viewId;
        },
        /**
         * Locates the specified view.
         * @method locateView
         * @param {string|DOMElement} viewOrUrlOrId A view, view url or view id to locate.
         * @param {string} [area] The area to translate the view to.
         * @param {DOMElement[]} [elementsToSearch] An existing set of elements to search first.
         * @return {Promise} A promise of the view.
         */
        locateView: function(viewOrUrlOrId, area, elementsToSearch) {
            if (typeof viewOrUrlOrId === 'string') {
                var viewId;

                if (viewEngine.isViewUrl(viewOrUrlOrId)) {
                    viewId = viewEngine.convertViewUrlToViewId(viewOrUrlOrId);
                } else {
                    viewId = viewOrUrlOrId;
                }

                if (area) {
                    viewId = this.translateViewIdToArea(viewId, area);
                }

                if (elementsToSearch) {
                    var existing = findInElements(elementsToSearch, viewId);
                    if (existing) {
                        return system.defer(function(dfd) {
                            dfd.resolve(existing);
                        }).promise();
                    }
                }

                return viewEngine.createView(viewId);
            }

            return system.defer(function(dfd) {
                dfd.resolve(viewOrUrlOrId);
            }).promise();
        }
    };
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The binder joins an object instance and a DOM element tree by applying databinding and/or invoking binding lifecycle callbacks (binding and bindingComplete).
 * @module binder
 * @requires system
 * @requires knockout
 */
define('durandal/binder',['durandal/system', 'knockout'], function (system, ko) {
    var binder,
        insufficientInfoMessage = 'Insufficient Information to Bind',
        unexpectedViewMessage = 'Unexpected View Type',
        bindingInstructionKey = 'durandal-binding-instruction',
        koBindingContextKey = '__ko_bindingContext__';

    function normalizeBindingInstruction(result){
        if(result === undefined){
            return { applyBindings: true };
        }

        if(system.isBoolean(result)){
            return { applyBindings:result };
        }

        if(result.applyBindings === undefined){
            result.applyBindings = true;
        }

        return result;
    }

    function doBind(obj, view, bindingTarget, data){
        if (!view || !bindingTarget) {
            if (binder.throwOnErrors) {
                system.error(insufficientInfoMessage);
            } else {
                system.log(insufficientInfoMessage, view, data);
            }
            return;
        }

        if (!view.getAttribute) {
            if (binder.throwOnErrors) {
                system.error(unexpectedViewMessage);
            } else {
                system.log(unexpectedViewMessage, view, data);
            }
            return;
        }

        var viewName = view.getAttribute('data-view');

        try {
            var instruction;

            if (obj && obj.binding) {
                instruction = obj.binding(view);
            }

            instruction = normalizeBindingInstruction(instruction);
            binder.binding(data, view, instruction);

            if(instruction.applyBindings){
                system.log('Binding', viewName, data);
                ko.applyBindings(bindingTarget, view);
            }else if(obj){
                ko.utils.domData.set(view, koBindingContextKey, { $data:obj });
            }

            binder.bindingComplete(data, view, instruction);

            if (obj && obj.bindingComplete) {
                obj.bindingComplete(view);
            }

            ko.utils.domData.set(view, bindingInstructionKey, instruction);
            return instruction;
        } catch (e) {
            e.message = e.message + ';\nView: ' + viewName + ";\nModuleId: " + system.getModuleId(data);
            if (binder.throwOnErrors) {
                system.error(e);
            } else {
                system.log(e.message);
            }
        }
    }

    /**
     * @class BinderModule
     * @static
     */
    return binder = {
        /**
         * Called before every binding operation. Does nothing by default.
         * @method binding
         * @param {object} data The data that is about to be bound.
         * @param {DOMElement} view The view that is about to be bound.
         * @param {object} instruction The object that carries the binding instructions.
         */
        binding: system.noop,
        /**
         * Called after every binding operation. Does nothing by default.
         * @method bindingComplete
         * @param {object} data The data that has just been bound.
         * @param {DOMElement} view The view that has just been bound.
         * @param {object} instruction The object that carries the binding instructions.
         */
        bindingComplete: system.noop,
        /**
         * Indicates whether or not the binding system should throw errors or not.
         * @property {boolean} throwOnErrors
         * @default false The binding system will not throw errors by default. Instead it will log them.
         */
        throwOnErrors: false,
        /**
         * Gets the binding instruction that was associated with a view when it was bound.
         * @method getBindingInstruction
         * @param {DOMElement} view The view that was previously bound.
         * @return {object} The object that carries the binding instructions.
         */
        getBindingInstruction:function(view){
            return ko.utils.domData.get(view, bindingInstructionKey);
        },
        /**
         * Binds the view, preserving the existing binding context. Optionally, a new context can be created, parented to the previous context.
         * @method bindContext
         * @param {KnockoutBindingContext} bindingContext The current binding context.
         * @param {DOMElement} view The view to bind.
         * @param {object} [obj] The data to bind to, causing the creation of a child binding context if present.
         */
        bindContext: function(bindingContext, view, obj) {
            if (obj && bindingContext) {
                bindingContext = bindingContext.createChildContext(obj);
            }

            return doBind(obj, view, bindingContext, obj || (bindingContext ? bindingContext.$data : null));
        },
        /**
         * Binds the view, preserving the existing binding context. Optionally, a new context can be created, parented to the previous context.
         * @method bind
         * @param {object} obj The data to bind to.
         * @param {DOMElement} view The view to bind.
         */
        bind: function(obj, view) {
            return doBind(obj, view, obj, obj);
        }
    };
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The activator module encapsulates all logic related to screen/component activation.
 * An activator is essentially an asynchronous state machine that understands a particular state transition protocol.
 * The protocol ensures that the following series of events always occur: `canDeactivate` (previous state), `canActivate` (new state), `deactivate` (previous state), `activate` (new state).
 * Each of the _can_ callbacks may return a boolean, affirmative value or promise for one of those. If either of the _can_ functions yields a false result, then activation halts.
 * @module activator
 * @requires system
 * @requires knockout
 */
define('durandal/activator',['durandal/system', 'knockout'], function (system, ko) {
    var activator;

    function ensureSettings(settings) {
        if (settings == undefined) {
            settings = {};
        }

        if (!settings.closeOnDeactivate) {
            settings.closeOnDeactivate = activator.defaults.closeOnDeactivate;
        }

        if (!settings.beforeActivate) {
            settings.beforeActivate = activator.defaults.beforeActivate;
        }

        if (!settings.afterDeactivate) {
            settings.afterDeactivate = activator.defaults.afterDeactivate;
        }

        if(!settings.affirmations){
            settings.affirmations = activator.defaults.affirmations;
        }

        if (!settings.interpretResponse) {
            settings.interpretResponse = activator.defaults.interpretResponse;
        }

        if (!settings.areSameItem) {
            settings.areSameItem = activator.defaults.areSameItem;
        }

        return settings;
    }

    function invoke(target, method, data) {
        if (system.isArray(data)) {
            return target[method].apply(target, data);
        }

        return target[method](data);
    }

    function deactivate(item, close, settings, dfd, setter) {
        if (item && item.deactivate) {
            system.log('Deactivating', item);

            var result;
            try {
                result = item.deactivate(close);
            } catch(error) {
                system.error(error);
                dfd.resolve(false);
                return;
            }

            if (result && result.then) {
                result.then(function() {
                    settings.afterDeactivate(item, close, setter);
                    dfd.resolve(true);
                }, function(reason) {
                    system.log(reason);
                    dfd.resolve(false);
                });
            } else {
                settings.afterDeactivate(item, close, setter);
                dfd.resolve(true);
            }
        } else {
            if (item) {
                settings.afterDeactivate(item, close, setter);
            }

            dfd.resolve(true);
        }
    }

    function activate(newItem, activeItem, callback, activationData) {
        if (newItem) {
            if (newItem.activate) {
                system.log('Activating', newItem);

                var result;
                try {
                    result = invoke(newItem, 'activate', activationData);
                } catch (error) {
                    system.error(error);
                    callback(false);
                    return;
                }

                if (result && result.then) {
                    result.then(function() {
                        activeItem(newItem);
                        callback(true);
                    }, function(reason) {
                        system.log(reason);
                        callback(false);
                    });
                } else {
                    activeItem(newItem);
                    callback(true);
                }
            } else {
                activeItem(newItem);
                callback(true);
            }
        } else {
            callback(true);
        }
    }

    function canDeactivateItem(item, close, settings) {
        settings.lifecycleData = null;

        return system.defer(function (dfd) {
            if (item && item.canDeactivate) {
                var resultOrPromise;
                try {
                    resultOrPromise = item.canDeactivate(close);
                } catch(error) {
                    system.error(error);
                    dfd.resolve(false);
                    return;
                }

                if (resultOrPromise.then) {
                    resultOrPromise.then(function(result) {
                        settings.lifecycleData = result;
                        dfd.resolve(settings.interpretResponse(result));
                    }, function(reason) {
                        system.error(reason);
                        dfd.resolve(false);
                    });
                } else {
                    settings.lifecycleData = resultOrPromise;
                    dfd.resolve(settings.interpretResponse(resultOrPromise));
                }
            } else {
                dfd.resolve(true);
            }
        }).promise();
    };

    function canActivateItem(newItem, activeItem, settings, activationData) {
        settings.lifecycleData = null;

        return system.defer(function (dfd) {
            if (newItem == activeItem()) {
                dfd.resolve(true);
                return;
            }

            if (newItem && newItem.canActivate) {
                var resultOrPromise;
                try {
                    resultOrPromise = invoke(newItem, 'canActivate', activationData);
                } catch (error) {
                    system.error(error);
                    dfd.resolve(false);
                    return;
                }

                if (resultOrPromise.then) {
                    resultOrPromise.then(function(result) {
                        settings.lifecycleData = result;
                        dfd.resolve(settings.interpretResponse(result));
                    }, function(reason) {
                        system.error(reason);
                        dfd.resolve(false);
                    });
                } else {
                    settings.lifecycleData = resultOrPromise;
                    dfd.resolve(settings.interpretResponse(resultOrPromise));
                }
            } else {
                dfd.resolve(true);
            }
        }).promise();
    };

    /**
     * An activator is a read/write computed observable that enforces the activation lifecycle whenever changing values.
     * @class Activator
     */
    function createActivator(initialActiveItem, settings) {
        var activeItem = ko.observable(null);
        var activeData;

        settings = ensureSettings(settings);

        var computed = ko.computed({
            read: function () {
                return activeItem();
            },
            write: function (newValue) {
                computed.viaSetter = true;
                computed.activateItem(newValue);
            }
        });

        computed.__activator__ = true;

        /**
         * The settings for this activator.
         * @property {ActivatorSettings} settings
         */
        computed.settings = settings;
        settings.activator = computed;

        /**
         * An observable which indicates whether or not the activator is currently in the process of activating an instance.
         * @method isActivating
         * @return {boolean}
         */
        computed.isActivating = ko.observable(false);

        /**
         * Determines whether or not the specified item can be deactivated.
         * @method canDeactivateItem
         * @param {object} item The item to check.
         * @param {boolean} close Whether or not to check if close is possible.
         * @return {promise}
         */
        computed.canDeactivateItem = function (item, close) {
            return canDeactivateItem(item, close, settings);
        };

        /**
         * Deactivates the specified item.
         * @method deactivateItem
         * @param {object} item The item to deactivate.
         * @param {boolean} close Whether or not to close the item.
         * @return {promise}
         */
        computed.deactivateItem = function (item, close) {
            return system.defer(function(dfd) {
                computed.canDeactivateItem(item, close).then(function(canDeactivate) {
                    if (canDeactivate) {
                        deactivate(item, close, settings, dfd, activeItem);
                    } else {
                        computed.notifySubscribers();
                        dfd.resolve(false);
                    }
                });
            }).promise();
        };

        /**
         * Determines whether or not the specified item can be activated.
         * @method canActivateItem
         * @param {object} item The item to check.
         * @param {object} activationData Data associated with the activation.
         * @return {promise}
         */
        computed.canActivateItem = function (newItem, activationData) {
            return canActivateItem(newItem, activeItem, settings, activationData);
        };

        /**
         * Activates the specified item.
         * @method activateItem
         * @param {object} newItem The item to activate.
         * @param {object} newActivationData Data associated with the activation.
         * @return {promise}
         */
        computed.activateItem = function (newItem, newActivationData) {
            var viaSetter = computed.viaSetter;
            computed.viaSetter = false;

            return system.defer(function (dfd) {
                if (computed.isActivating()) {
                    dfd.resolve(false);
                    return;
                }

                computed.isActivating(true);

                var currentItem = activeItem();
                if (settings.areSameItem(currentItem, newItem, activeData, newActivationData)) {
                    computed.isActivating(false);
                    dfd.resolve(true);
                    return;
                }

                computed.canDeactivateItem(currentItem, settings.closeOnDeactivate).then(function (canDeactivate) {
                    if (canDeactivate) {
                        computed.canActivateItem(newItem, newActivationData).then(function (canActivate) {
                            if (canActivate) {
                                system.defer(function (dfd2) {
                                    deactivate(currentItem, settings.closeOnDeactivate, settings, dfd2);
                                }).promise().then(function () {
                                    newItem = settings.beforeActivate(newItem, newActivationData);
                                    activate(newItem, activeItem, function (result) {
                                        activeData = newActivationData;
                                        computed.isActivating(false);
                                        dfd.resolve(result);
                                    }, newActivationData);
                                });
                            } else {
                                if (viaSetter) {
                                    computed.notifySubscribers();
                                }

                                computed.isActivating(false);
                                dfd.resolve(false);
                            }
                        });
                    } else {
                        if (viaSetter) {
                            computed.notifySubscribers();
                        }

                        computed.isActivating(false);
                        dfd.resolve(false);
                    }
                });
            }).promise();
        };

        /**
         * Determines whether or not the activator, in its current state, can be activated.
         * @method canActivate
         * @return {promise}
         */
        computed.canActivate = function () {
            var toCheck;

            if (initialActiveItem) {
                toCheck = initialActiveItem;
                initialActiveItem = false;
            } else {
                toCheck = computed();
            }

            return computed.canActivateItem(toCheck);
        };

        /**
         * Activates the activator, in its current state.
         * @method activate
         * @return {promise}
         */
        computed.activate = function () {
            var toActivate;

            if (initialActiveItem) {
                toActivate = initialActiveItem;
                initialActiveItem = false;
            } else {
                toActivate = computed();
            }

            return computed.activateItem(toActivate);
        };

        /**
         * Determines whether or not the activator, in its current state, can be deactivated.
         * @method canDeactivate
         * @return {promise}
         */
        computed.canDeactivate = function (close) {
            return computed.canDeactivateItem(computed(), close);
        };

        /**
         * Deactivates the activator, in its current state.
         * @method deactivate
         * @return {promise}
         */
        computed.deactivate = function (close) {
            return computed.deactivateItem(computed(), close);
        };

        computed.includeIn = function (includeIn) {
            includeIn.canActivate = function () {
                return computed.canActivate();
            };

            includeIn.activate = function () {
                return computed.activate();
            };

            includeIn.canDeactivate = function (close) {
                return computed.canDeactivate(close);
            };

            includeIn.deactivate = function (close) {
                return computed.deactivate(close);
            };
        };

        if (settings.includeIn) {
            computed.includeIn(settings.includeIn);
        } else if (initialActiveItem) {
            computed.activate();
        }

        computed.forItems = function (items) {
            settings.closeOnDeactivate = false;

            settings.determineNextItemToActivate = function (list, lastIndex) {
                var toRemoveAt = lastIndex - 1;

                if (toRemoveAt == -1 && list.length > 1) {
                    return list[1];
                }

                if (toRemoveAt > -1 && toRemoveAt < list.length - 1) {
                    return list[toRemoveAt];
                }

                return null;
            };

            settings.beforeActivate = function (newItem) {
                var currentItem = computed();

                if (!newItem) {
                    newItem = settings.determineNextItemToActivate(items, currentItem ? items.indexOf(currentItem) : 0);
                } else {
                    var index = items.indexOf(newItem);

                    if (index == -1) {
                        items.push(newItem);
                    } else {
                        newItem = items()[index];
                    }
                }

                return newItem;
            };

            settings.afterDeactivate = function (oldItem, close) {
                if (close) {
                    items.remove(oldItem);
                }
            };

            var originalCanDeactivate = computed.canDeactivate;
            computed.canDeactivate = function (close) {
                if (close) {
                    return system.defer(function (dfd) {
                        var list = items();
                        var results = [];

                        function finish() {
                            for (var j = 0; j < results.length; j++) {
                                if (!results[j]) {
                                    dfd.resolve(false);
                                    return;
                                }
                            }

                            dfd.resolve(true);
                        }

                        for (var i = 0; i < list.length; i++) {
                            computed.canDeactivateItem(list[i], close).then(function (result) {
                                results.push(result);
                                if (results.length == list.length) {
                                    finish();
                                }
                            });
                        }
                    }).promise();
                } else {
                    return originalCanDeactivate();
                }
            };

            var originalDeactivate = computed.deactivate;
            computed.deactivate = function (close) {
                if (close) {
                    return system.defer(function (dfd) {
                        var list = items();
                        var results = 0;
                        var listLength = list.length;

                        function doDeactivate(item) {
                            computed.deactivateItem(item, close).then(function () {
                                results++;
                                items.remove(item);
                                if (results == listLength) {
                                    dfd.resolve();
                                }
                            });
                        }

                        for (var i = 0; i < listLength; i++) {
                            doDeactivate(list[i]);
                        }
                    }).promise();
                } else {
                    return originalDeactivate();
                }
            };

            return computed;
        };

        return computed;
    }

    /**
     * @class ActivatorSettings
     * @static
     */
    var activatorSettings = {
        /**
         * The default value passed to an object's deactivate function as its close parameter.
         * @property {boolean} closeOnDeactivate
         * @default true
         */
        closeOnDeactivate: true,
        /**
         * Lower-cased words which represent a truthy value.
         * @property {string[]} affirmations
         * @default ['yes', 'ok', 'true']
         */
        affirmations: ['yes', 'ok', 'true'],
        /**
         * Interprets the response of a `canActivate` or `canDeactivate` call using the known affirmative values in the `affirmations` array.
         * @method interpretResponse
         * @param {object} value
         * @return {boolean}
         */
        interpretResponse: function(value) {
            if(system.isObject(value)) {
                value = value.can || false;
            }

            if(system.isString(value)) {
                return ko.utils.arrayIndexOf(this.affirmations, value.toLowerCase()) !== -1;
            }

            return value;
        },
        /**
         * Determines whether or not the current item and the new item are the same.
         * @method areSameItem
         * @param {object} currentItem
         * @param {object} newItem
         * @param {object} currentActivationData
         * @param {object} newActivationData
         * @return {boolean}
         */
        areSameItem: function(currentItem, newItem, currentActivationData, newActivationData) {
            return currentItem == newItem;
        },
        /**
         * Called immediately before the new item is activated.
         * @method beforeActivate
         * @param {object} newItem
         */
        beforeActivate: function(newItem) {
            return newItem;
        },
        /**
         * Called immediately after the old item is deactivated.
         * @method afterDeactivate
         * @param {object} oldItem The previous item.
         * @param {boolean} close Whether or not the previous item was closed.
         * @param {function} setter The activate item setter function.
         */
        afterDeactivate: function(oldItem, close, setter) {
            if(close && setter) {
                setter(null);
            }
        }
    };

    /**
     * @class ActivatorModule
     * @static
     */
    activator = {
        /**
         * The default settings used by activators.
         * @property {ActivatorSettings} defaults
         */
        defaults: activatorSettings,
        /**
          * Creates a new activator.
          * @method create
          * @param {object} [initialActiveItem] The item which should be immediately activated upon creation of the ativator.
          * @param {ActivatorSettings} [settings] Per activator overrides of the default activator settings.
          * @return {Activator} The created activator.
          */
        create: createActivator,
        /**
         * Determines whether or not the provided object is an activator or not.
         * @method isActivator
         * @param {object} object Any object you wish to verify as an activator or not.
         * @return {boolean} True if the object is an activator; false otherwise.
         */
        isActivator:function(object){
            return object && object.__activator__;
        }
    };

    return activator;
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The composition module encapsulates all functionality related to visual composition.
 * @module composition
 * @requires system
 * @requires viewLocator
 * @requires binder
 * @requires viewEngine
 * @requires activator
 * @requires jquery
 * @requires knockout
 */
define('durandal/composition',['durandal/system', 'durandal/viewLocator', 'durandal/binder', 'durandal/viewEngine', 'durandal/activator', 'jquery', 'knockout'], function (system, viewLocator, binder, viewEngine, activator, $, ko) {
    var dummyModel = {},
        activeViewAttributeName = 'data-active-view',
        composition,
        compositionCompleteCallbacks = [],
        compositionCount = 0,
        compositionDataKey = 'durandal-composition-data',
        partAttributeName = 'data-part',
        partAttributeSelector = '[' + partAttributeName + ']',
        bindableSettings = ['model', 'view', 'transition', 'area', 'strategy', 'activationData'];

    function getHostState(parent) {
        var elements = [];
        var state = {
            childElements: elements,
            activeView: null
        };

        var child = ko.virtualElements.firstChild(parent);

        while (child) {
            if (child.nodeType == 1) {
                elements.push(child);
                if (child.getAttribute(activeViewAttributeName)) {
                    state.activeView = child;
                }
            }

            child = ko.virtualElements.nextSibling(child);
        }

        if(!state.activeView){
            state.activeView = elements[0];
        }

        return state;
    }

    function endComposition() {
        compositionCount--;

        if (compositionCount === 0) {
            setTimeout(function(){
                var i = compositionCompleteCallbacks.length;

                while(i--) {
                    compositionCompleteCallbacks[i]();
                }

                compositionCompleteCallbacks = [];
            }, 1);
        }
    }

    function tryActivate(context, successCallback, skipActivation) {
        if(skipActivation){
            successCallback();
        } else if (context.activate && context.model && context.model.activate) {
            var result;

            if(system.isArray(context.activationData)) {
                result = context.model.activate.apply(context.model, context.activationData);
            } else {
                result = context.model.activate(context.activationData);
            }

            if(result && result.then) {
                result.then(successCallback);
            } else if(result || result === undefined) {
                successCallback();
            } else {
                endComposition();
            }
        } else {
            successCallback();
        }
    }

    function triggerAttach() {
        var context = this;

        if (context.activeView) {
            context.activeView.removeAttribute(activeViewAttributeName);
        }

        if (context.child) {
            if (context.model && context.model.attached) {
                if (context.composingNewView || context.alwaysTriggerAttach) {
                    context.model.attached(context.child, context.parent, context);
                }
            }

            if (context.attached) {
                context.attached(context.child, context.parent, context);
            }

            context.child.setAttribute(activeViewAttributeName, true);

            if (context.composingNewView && context.model) {
                if (context.model.compositionComplete) {
                    composition.current.complete(function () {
                        context.model.compositionComplete(context.child, context.parent, context);
                    });
                }

                if (context.model.detached) {
                    ko.utils.domNodeDisposal.addDisposeCallback(context.child, function () {
                        context.model.detached(context.child, context.parent, context);
                    });
                }
            }

            if (context.compositionComplete) {
                composition.current.complete(function () {
                    context.compositionComplete(context.child, context.parent, context);
                });
            }
        }

        endComposition();
        context.triggerAttach = system.noop;
    }

    function shouldTransition(context) {
        if (system.isString(context.transition)) {
            if (context.activeView) {
                if (context.activeView == context.child) {
                    return false;
                }

                if (!context.child) {
                    return true;
                }

                if (context.skipTransitionOnSameViewId) {
                    var currentViewId = context.activeView.getAttribute('data-view');
                    var newViewId = context.child.getAttribute('data-view');
                    return currentViewId != newViewId;
                }
            }

            return true;
        }

        return false;
    }

    function cloneNodes(nodesArray) {
        for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
            var clonedNode = nodesArray[i].cloneNode(true);
            newNodesArray.push(clonedNode);
        }
        return newNodesArray;
    }

    function replaceParts(context){
        var parts = cloneNodes(context.parts);
        var replacementParts = composition.getParts(parts);
        var standardParts = composition.getParts(context.child);

        for (var partId in replacementParts) {
            $(standardParts[partId]).replaceWith(replacementParts[partId]);
        }
    }

    function removePreviousView(parent){
        var children = ko.virtualElements.childNodes(parent), i, len;

        if(!system.isArray(children)){
            var arrayChildren = [];

            for(i = 0, len = children.length; i < len; i++){
                arrayChildren[i] = children[i];
            }

            children = arrayChildren;
        }

        for(i = 1,len = children.length; i < len; i++){
            ko.removeNode(children[i]);
        }
    }

    /**
     * @class CompositionTransaction
     * @static
     */
    var compositionTransaction = {
        /**
         * Registers a callback which will be invoked when the current composition transaction has completed. The transaction includes all parent and children compositions.
         * @method complete
         * @param {function} callback The callback to be invoked when composition is complete.
         */
        complete: function (callback) {
            compositionCompleteCallbacks.push(callback);
        }
    };

    /**
     * @class CompositionModule
     * @static
     */
    composition = {
        /**
         * Converts a transition name to its moduleId.
         * @method convertTransitionToModuleId
         * @param {string} name The name of the transtion.
         * @return {string} The moduleId.
         */
        convertTransitionToModuleId: function (name) {
            return 'transitions/' + name;
        },
        /**
         * The name of the transition to use in all compositions.
         * @property {string} defaultTransitionName
         * @default null
         */
        defaultTransitionName: null,
        /**
         * Represents the currently executing composition transaction.
         * @property {CompositionTransaction} current
         */
        current: compositionTransaction,
        /**
         * Registers a binding handler that will be invoked when the current composition transaction is complete.
         * @method addBindingHandler
         * @param {string} name The name of the binding handler.
         * @param {object} [config] The binding handler instance. If none is provided, the name will be used to look up an existing handler which will then be converted to a composition handler.
         * @param {function} [initOptionsFactory] If the registered binding needs to return options from its init call back to knockout, this function will server as a factory for those options. It will receive the same parameters that the init function does.
         */
        addBindingHandler:function(name, config, initOptionsFactory){
            var key,
                dataKey = 'composition-handler-' + name,
                handler;

            config = config || ko.bindingHandlers[name];
            initOptionsFactory = initOptionsFactory || function(){ return undefined;  };

            handler = ko.bindingHandlers[name] = {
                init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var data = {
                        trigger:ko.observable(null)
                    };

                    composition.current.complete(function(){
                        if(config.init){
                            config.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
                        }

                        if(config.update){
                            ko.utils.domData.set(element, dataKey, config);
                            data.trigger('trigger');
                        }
                    });

                    ko.utils.domData.set(element, dataKey, data);

                    return initOptionsFactory(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
                },
                update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var data = ko.utils.domData.get(element, dataKey);

                    if(data.update){
                        return data.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
                    }

                    data.trigger();
                }
            };

            for (key in config) {
                if (key !== "init" && key !== "update") {
                    handler[key] = config[key];
                }
            }
        },
        /**
         * Gets an object keyed with all the elements that are replacable parts, found within the supplied elements. The key will be the part name and the value will be the element itself.
         * @method getParts
         * @param {DOMElement\DOMElement[]} elements The element(s) to search for parts.
         * @return {object} An object keyed by part.
         */
        getParts: function(elements) {
            var parts = {};

            if (!system.isArray(elements)) {
                elements = [elements];
            }

            for (var i = 0; i < elements.length; i++) {
                var element = elements[i];

                if (element.getAttribute) {
                    var id = element.getAttribute(partAttributeName);
                    if (id) {
                        parts[id] = element;
                    }

                    var childParts = $(partAttributeSelector, element)
                        .not($('[data-bind] ' + partAttributeSelector, element));

                    for (var j = 0; j < childParts.length; j++) {
                        var part = childParts.get(j);
                        parts[part.getAttribute(partAttributeName)] = part;
                    }
                }
            }

            return parts;
        },
        cloneNodes:cloneNodes,
        finalize: function (context) {
            context.transition = context.transition || this.defaultTransitionName;

            if(!context.child && !context.activeView){
                if (!context.cacheViews) {
                    ko.virtualElements.emptyNode(context.parent);
                }

                context.triggerAttach();
            }else if (shouldTransition(context)) {
                var transitionModuleId = this.convertTransitionToModuleId(context.transition);

                system.acquire(transitionModuleId).then(function (transition) {
                    context.transition = transition;

                    transition(context).then(function () {
                        if (!context.cacheViews) {
                            if(!context.child){
                                ko.virtualElements.emptyNode(context.parent);
                            }else{
                                removePreviousView(context.parent);
                            }
                        }else if(context.activeView){
                            var instruction = binder.getBindingInstruction(context.activeView);
                            if(instruction.cacheViews != undefined && !instruction.cacheViews){
                                ko.removeNode(context.activeView);
                            }
                        }

                        context.triggerAttach();
                    });
                }).fail(function(err){
                    system.error('Failed to load transition (' + transitionModuleId + '). Details: ' + err.message);
                });
            } else {
                if (context.child != context.activeView) {
                    if (context.cacheViews && context.activeView) {
                        var instruction = binder.getBindingInstruction(context.activeView);
                        if(instruction.cacheViews != undefined && !instruction.cacheViews){
                            ko.removeNode(context.activeView);
                        }else{
                            $(context.activeView).hide();
                        }
                    }

                    if (!context.child) {
                        if (!context.cacheViews) {
                            ko.virtualElements.emptyNode(context.parent);
                        }
                    } else {
                        if (!context.cacheViews) {
                            removePreviousView(context.parent);
                        }

                        $(context.child).show();
                    }
                }

                context.triggerAttach();
            }
        },
        bindAndShow: function (child, context, skipActivation) {
            context.child = child;

            if (context.cacheViews) {
                context.composingNewView = (ko.utils.arrayIndexOf(context.viewElements, child) == -1);
            } else {
                context.composingNewView = true;
            }

            tryActivate(context, function () {
                if (context.binding) {
                    context.binding(context.child, context.parent, context);
                }

                if (context.preserveContext && context.bindingContext) {
                    if (context.composingNewView) {
                        if(context.parts){
                            replaceParts(context);
                        }

                        $(child).hide();
                        ko.virtualElements.prepend(context.parent, child);

                        binder.bindContext(context.bindingContext, child, context.model);
                    }
                } else if (child) {
                    var modelToBind = context.model || dummyModel;
                    var currentModel = ko.dataFor(child);

                    if (currentModel != modelToBind) {
                        if (!context.composingNewView) {
                            $(child).remove();
                            viewEngine.createView(child.getAttribute('data-view')).then(function(recreatedView) {
                                composition.bindAndShow(recreatedView, context, true);
                            });
                            return;
                        }

                        if(context.parts){
                            replaceParts(context);
                        }

                        $(child).hide();
                        ko.virtualElements.prepend(context.parent, child);

                        binder.bind(modelToBind, child);
                    }
                }

                composition.finalize(context);
            }, skipActivation);
        },
        /**
         * Eecutes the default view location strategy.
         * @method defaultStrategy
         * @param {object} context The composition context containing the model and possibly existing viewElements.
         * @return {promise} A promise for the view.
         */
        defaultStrategy: function (context) {
            return viewLocator.locateViewForObject(context.model, context.area, context.viewElements);
        },
        getSettings: function (valueAccessor, element) {
            var value = valueAccessor(),
                settings = ko.utils.unwrapObservable(value) || {},
                activatorPresent = activator.isActivator(value),
                moduleId;

            if (system.isString(settings)) {
                if (viewEngine.isViewUrl(settings)) {
                    settings = {
                        view: settings
                    };
                } else {
                    settings = {
                        model: settings,
                        activate: true
                    };
                }

                return settings;
            }

            moduleId = system.getModuleId(settings);
            if (moduleId) {
                settings = {
                    model: settings,
                    activate: true
                };

                return settings;
            }

            if(!activatorPresent && settings.model) {
                activatorPresent = activator.isActivator(settings.model);
            }

            for (var attrName in settings) {
                if (ko.utils.arrayIndexOf(bindableSettings, attrName) != -1) {
                    settings[attrName] = ko.utils.unwrapObservable(settings[attrName]);
                } else {
                    settings[attrName] = settings[attrName];
                }
            }

            if (activatorPresent) {
                settings.activate = false;
            } else if (settings.activate === undefined) {
                settings.activate = true;
            }

            return settings;
        },
        executeStrategy: function (context) {
            context.strategy(context).then(function (child) {
                composition.bindAndShow(child, context);
            });
        },
        inject: function (context) {
            if (!context.model) {
                this.bindAndShow(null, context);
                return;
            }

            if (context.view) {
                viewLocator.locateView(context.view, context.area, context.viewElements).then(function (child) {
                    composition.bindAndShow(child, context);
                });
                return;
            }

            if (!context.strategy) {
                context.strategy = this.defaultStrategy;
            }

            if (system.isString(context.strategy)) {
                system.acquire(context.strategy).then(function (strategy) {
                    context.strategy = strategy;
                    composition.executeStrategy(context);
                }).fail(function(err){
                    system.error('Failed to load view strategy (' + context.strategy + '). Details: ' + err.message);
                });
            } else {
                this.executeStrategy(context);
            }
        },
        /**
         * Initiates a composition.
         * @method compose
         * @param {DOMElement} element The DOMElement or knockout virtual element that serves as the parent for the composition.
         * @param {object} settings The composition settings.
         * @param {object} [bindingContext] The current binding context.
         */
        compose: function (element, settings, bindingContext, fromBinding) {
            compositionCount++;

            if(!fromBinding){
                settings = composition.getSettings(function() { return settings; }, element);
            }

            var hostState = getHostState(element);

            settings.activeView = hostState.activeView;
            settings.parent = element;
            settings.triggerAttach = triggerAttach;
            settings.bindingContext = bindingContext;

            if (settings.cacheViews && !settings.viewElements) {
                settings.viewElements = hostState.childElements;
            }

            if (!settings.model) {
                if (!settings.view) {
                    this.bindAndShow(null, settings);
                } else {
                    settings.area = settings.area || 'partial';
                    settings.preserveContext = true;

                    viewLocator.locateView(settings.view, settings.area, settings.viewElements).then(function (child) {
                        composition.bindAndShow(child, settings);
                    });
                }
            } else if (system.isString(settings.model)) {
                system.acquire(settings.model).then(function (module) {
                    settings.model = system.resolveObject(module);
                    composition.inject(settings);
                }).fail(function(err){
                    system.error('Failed to load composed module (' + settings.model + '). Details: ' + err.message);
                });
            } else {
                composition.inject(settings);
            }
        }
    };

    ko.bindingHandlers.compose = {
        init: function() {
            return { controlsDescendantBindings: true };
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var settings = composition.getSettings(valueAccessor, element);
            if(settings.mode){
                var data = ko.utils.domData.get(element, compositionDataKey);
                if(!data){
                    var childNodes = ko.virtualElements.childNodes(element);
                    data = {};

                    if(settings.mode === 'inline'){
                        data.view = viewEngine.ensureSingleElement(childNodes);
                    }else if(settings.mode === 'templated'){
                        data.parts = cloneNodes(childNodes);
                    }

                    ko.virtualElements.emptyNode(element);
                    ko.utils.domData.set(element, compositionDataKey, data);
                }

                if(settings.mode === 'inline'){
                    settings.view = data.view.cloneNode(true);
                }else if(settings.mode === 'templated'){
                    settings.parts = data.parts;
                }

                settings.preserveContext = true;
            }

            composition.compose(element, settings, bindingContext, true);
        }
    };

    ko.virtualElements.allowedBindings.compose = true;

    return composition;
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Durandal events originate from backbone.js but also combine some ideas from signals.js as well as some additional improvements.
 * Events can be installed into any object and are installed into the `app` module by default for convenient app-wide eventing.
 * @module events
 * @requires system
 */
define('durandal/events',['durandal/system'], function (system) {
    var eventSplitter = /\s+/;
    var Events = function() { };

    /**
     * Represents an event subscription.
     * @class Subscription
     */
    var Subscription = function(owner, events) {
        this.owner = owner;
        this.events = events;
    };

    /**
     * Attaches a callback to the event subscription.
     * @method then
     * @param {function} callback The callback function to invoke when the event is triggered.
     * @param {object} [context] An object to use as `this` when invoking the `callback`.
     * @chainable
     */
    Subscription.prototype.then = function (callback, context) {
        this.callback = callback || this.callback;
        this.context = context || this.context;
        
        if (!this.callback) {
            return this;
        }

        this.owner.on(this.events, this.callback, this.context);
        return this;
    };

    /**
     * Attaches a callback to the event subscription.
     * @method on
     * @param {function} [callback] The callback function to invoke when the event is triggered. If `callback` is not provided, the previous callback will be re-activated.
     * @param {object} [context] An object to use as `this` when invoking the `callback`.
     * @chainable
     */
    Subscription.prototype.on = Subscription.prototype.then;

    /**
     * Cancels the subscription.
     * @method off
     * @chainable
     */
    Subscription.prototype.off = function () {
        this.owner.off(this.events, this.callback, this.context);
        return this;
    };

    /**
     * Creates an object with eventing capabilities.
     * @class Events
     */

    /**
     * Creates a subscription or registers a callback for the specified event.
     * @method on
     * @param {string} events One or more events, separated by white space.
     * @param {function} [callback] The callback function to invoke when the event is triggered. If `callback` is not provided, a subscription instance is returned.
     * @param {object} [context] An object to use as `this` when invoking the `callback`.
     * @return {Subscription|Events} A subscription is returned if no callback is supplied, otherwise the events object is returned for chaining.
     */
    Events.prototype.on = function(events, callback, context) {
        var calls, event, list;

        if (!callback) {
            return new Subscription(this, events);
        } else {
            calls = this.callbacks || (this.callbacks = {});
            events = events.split(eventSplitter);

            while (event = events.shift()) {
                list = calls[event] || (calls[event] = []);
                list.push(callback, context);
            }

            return this;
        }
    };

    /**
     * Removes the callbacks for the specified events.
     * @method off
     * @param {string} [events] One or more events, separated by white space to turn off. If no events are specified, then the callbacks will be removed.
     * @param {function} [callback] The callback function to remove. If `callback` is not provided, all callbacks for the specified events will be removed.
     * @param {object} [context] The object that was used as `this`. Callbacks with this context will be removed.
     * @chainable
     */
    Events.prototype.off = function(events, callback, context) {
        var event, calls, list, i;

        // No events
        if (!(calls = this.callbacks)) {
            return this;
        }

        //removing all
        if (!(events || callback || context)) {
            delete this.callbacks;
            return this;
        }

        events = events ? events.split(eventSplitter) : system.keys(calls);

        // Loop through the callback list, splicing where appropriate.
        while (event = events.shift()) {
            if (!(list = calls[event]) || !(callback || context)) {
                delete calls[event];
                continue;
            }

            for (i = list.length - 2; i >= 0; i -= 2) {
                if (!(callback && list[i] !== callback || context && list[i + 1] !== context)) {
                    list.splice(i, 2);
                }
            }
        }

        return this;
    };

    /**
     * Triggers the specified events.
     * @method trigger
     * @param {string} [events] One or more events, separated by white space to trigger.
     * @chainable
     */
    Events.prototype.trigger = function(events) {
        var event, calls, list, i, length, args, all, rest;
        if (!(calls = this.callbacks)) {
            return this;
        }

        rest = [];
        events = events.split(eventSplitter);
        for (i = 1, length = arguments.length; i < length; i++) {
            rest[i - 1] = arguments[i];
        }

        // For each event, walk through the list of callbacks twice, first to
        // trigger the event, then to trigger any `"all"` callbacks.
        while (event = events.shift()) {
            // Copy callback lists to prevent modification.
            if (all = calls.all) {
                all = all.slice();
            }

            if (list = calls[event]) {
                list = list.slice();
            }

            // Execute event callbacks.
            if (list) {
                for (i = 0, length = list.length; i < length; i += 2) {
                    list[i].apply(list[i + 1] || this, rest);
                }
            }

            // Execute "all" callbacks.
            if (all) {
                args = [event].concat(rest);
                for (i = 0, length = all.length; i < length; i += 2) {
                    all[i].apply(all[i + 1] || this, args);
                }
            }
        }

        return this;
    };

    /**
     * Creates a function that will trigger the specified events when called. Simplifies proxying jQuery (or other) events through to the events object.
     * @method proxy
     * @param {string} events One or more events, separated by white space to trigger by invoking the returned function.
     * @return {function} Calling the function will invoke the previously specified events on the events object.
     */
    Events.prototype.proxy = function(events) {
        var that = this;
        return (function(arg) {
            that.trigger(events, arg);
        });
    };

    /**
     * Creates an object with eventing capabilities.
     * @class EventsModule
     * @static
     */

    /**
     * Adds eventing capabilities to the specified object.
     * @method includeIn
     * @param {object} targetObject The object to add eventing capabilities to.
     */
    Events.includeIn = function(targetObject) {
        targetObject.on = Events.prototype.on;
        targetObject.off = Events.prototype.off;
        targetObject.trigger = Events.prototype.trigger;
        targetObject.proxy = Events.prototype.proxy;
    };

    return Events;
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The app module controls app startup, plugin loading/configuration and root visual display.
 * @module app
 * @requires system
 * @requires viewEngine
 * @requires composition
 * @requires events
 * @requires jquery
 */
define('durandal/app',['durandal/system', 'durandal/viewEngine', 'durandal/composition', 'durandal/events', 'jquery'], function(system, viewEngine, composition, Events, $) {
    var app,
        allPluginIds = [],
        allPluginConfigs = [];

    function loadPlugins(){
        return system.defer(function(dfd){
            if(allPluginIds.length == 0){
                dfd.resolve();
                return;
            }

            system.acquire(allPluginIds).then(function(loaded){
                for(var i = 0; i < loaded.length; i++){
                    var currentModule = loaded[i];

                    if(currentModule.install){
                        var config = allPluginConfigs[i];
                        if(!system.isObject(config)){
                            config = {};
                        }

                        currentModule.install(config);
                        system.log('Plugin:Installed ' + allPluginIds[i]);
                    }else{
                        system.log('Plugin:Loaded ' + allPluginIds[i]);
                    }
                }

                dfd.resolve();
            }).fail(function(err){
                system.error('Failed to load plugin(s). Details: ' + err.message);
            });
        }).promise();
    }

    /**
     * @class AppModule
     * @static
     * @uses Events
     */
    app = {
        /**
         * The title of your application.
         * @property {string} title
         */
        title: 'Application',
        /**
         * Configures one or more plugins to be loaded and installed into the application.
         * @method configurePlugins
         * @param {object} config Keys are plugin names. Values can be truthy, to simply install the plugin, or a configuration object to pass to the plugin.
         * @param {string} [baseUrl] The base url to load the plugins from.
         */
        configurePlugins:function(config, baseUrl){
            var pluginIds = system.keys(config);
            baseUrl = baseUrl || 'plugins/';

            if(baseUrl.indexOf('/', baseUrl.length - 1) === -1){
                baseUrl += '/';
            }

            for(var i = 0; i < pluginIds.length; i++){
                var key = pluginIds[i];
                allPluginIds.push(baseUrl + key);
                allPluginConfigs.push(config[key]);
            }
        },
        /**
         * Starts the application.
         * @method start
         * @return {promise}
         */
        start: function() {
            system.log('Application:Starting');

            if (this.title) {
                document.title = this.title;
            }

            return system.defer(function (dfd) {
                $(function() {
                    loadPlugins().then(function(){
                        dfd.resolve();
                        system.log('Application:Started');
                    });
                });
            }).promise();
        },
        /**
         * Sets the root module/view for the application.
         * @method setRoot
         * @param {string} root The root view or module.
         * @param {string} [transition] The transition to use from the previous root (or splash screen) into the new root.
         * @param {string} [applicationHost] The application host element or id. By default the id 'applicationHost' will be used.
         */
        setRoot: function(root, transition, applicationHost) {
            var hostElement, settings = { activate:true, transition: transition };

            if (!applicationHost || system.isString(applicationHost)) {
                hostElement = document.getElementById(applicationHost || 'applicationHost');
            } else {
                hostElement = applicationHost;
            }

            if (system.isString(root)) {
                if (viewEngine.isViewUrl(root)) {
                    settings.view = root;
                } else {
                    settings.model = root;
                }
            } else {
                settings.model = root;
            }

            composition.compose(hostElement, settings);
        }
    };

    Events.includeIn(app);

    return app;
});

requirejs.config({
    urlArgs: "version=2019.02",
    paths: {
        'text': '../Scripts/text',
        'durandal': '../Scripts/durandal',
        'plugins': '../Scripts/durandal/plugins',
        'transitions': '../Scripts/durandal/transitions'
    }
});

define('jquery', [],function() { return jQuery; });
define('knockout', ko);

define('main',['durandal/system', 'durandal/app', 'durandal/viewLocator'],  function (system, app, viewLocator) {
    
    app.title = 'IARC - New';
    app.version = "2019.02";

    app.configurePlugins({
        router: true,
        dialog: true,
        widget: true
    });

    

    app.start().then(function () {
        //Replace 'viewmodels' in the moduleId with 'views' to locate the view.
        //Look for partial views in a 'views' folder in the root.
        viewLocator.useConvention();

        //Show the app by setting the root view model for our application with a transition.
        app.setRoot('viewmodels/shell', 'entrance');
    });
});
define('services/cachingService',['require'],function (require) {

    var addToCach = function (key, value) {
        amplify.store(key, value);
    };

    var getFromCach = function (key) {
        return amplify.store(key);
    };

    var cachingService = {
        add: addToCach,
        get: getFromCach
    };

    return cachingService;

});
define('services/displayService',['require'],function (require) {
    
    var display = function (message, type) {
        toastr.options = {
            "positionClass": "toast-top-full-width",
            "fadeIn": 300,
            "fadeOut": 1000,
            "timeOut": 0,
            "extendedTimeOut": 0
        };

        switch (type) {
            case 'error':
                toastr.error(message, 'Error!');
                break;
            case 'info':
                toastr.info(message, 'Info!');
                break;
            case 'warning':
                toastr.warning(message, 'Warning!');
                break;
            case 'Success':
                toastr.warning(message, 'O.K.!');
                break;
            default:
                toastr.success(message, 'O.K.!');
        }
    };

    return {
        display: display
    };

});
define('services/enums',[],function () {

    var StatusEnum = {
        'Status':
            {
                OK: '0',
                INFO: '1',
                ERROR: '2'
            }
    };
   

    return StatusEnum;

});
define('services/holylandUtility',[],function () {

    var Area = function (name, poly) {
        this.name = name;
        this.poly = poly;
    }


    //google.maps.event.addListener(drawingManager, 'polygoncomplete', function (polygon) {
    //    //debugger;
    //    var coordinates = (polygon.getPath().getArray());
    //    console.log(coordinates);
    //    //ko.utils.arrayForEach(coordinates, function (item) {
    //    //    console.log('lat:' + item.lat() + ' lon: ' + item.lng());
    //    //});
    //    for (var i=0; i<coordinates.length; i++)
    //    {
    //        console.log('lat:' + coordinates[i].lat() + ' lng: ' + coordinates[i].lng());
    //    }
    //});

    ////**************************** Define coord and Areas *************************************//
    var ZF_Coords = [
        new google.maps.LatLng(32.88391197291899, 35.37494659423828),
        new google.maps.LatLng(32.88448859695396, 35.385589599609375),
        new google.maps.LatLng(32.887948262371275, 35.390052795410156),
        new google.maps.LatLng(32.88881315761995, 35.39623260498047),
        new google.maps.LatLng(32.88737166084861, 35.39966583251953),
        new google.maps.LatLng(32.88564183376796, 35.4034423828125),
        new google.maps.LatLng(32.88708335868024, 35.408935546875),
        new google.maps.LatLng(32.89140779271051, 35.41374206542969),
        new google.maps.LatLng(32.89342578969234, 35.42163848876953),
        new google.maps.LatLng(32.894578910186176, 35.42987823486328),
        new google.maps.LatLng(32.89947950482381, 35.43434143066406),
        new google.maps.LatLng(32.901209061725034, 35.443267822265625),
        new google.maps.LatLng(32.90265033334125, 35.44841766357422),
        new google.maps.LatLng(32.90092080458707, 35.45459747314453),
        new google.maps.LatLng(32.89803818160524, 35.46455383300781),
        new google.maps.LatLng(32.90005602754379, 35.472450256347656),
        new google.maps.LatLng(32.90178557318625, 35.47760009765625),
        new google.maps.LatLng(32.901497317924765, 35.48412322998047),
        new google.maps.LatLng(32.89890297835096, 35.49201965332031),
        new google.maps.LatLng(32.896308562782686, 35.49510955810547),
        new google.maps.LatLng(32.89429063146993, 35.499229431152344),
        new google.maps.LatLng(32.894002351815516, 35.50334930419922),
        new google.maps.LatLng(32.893714071222995, 35.507469177246094),
        new google.maps.LatLng(32.89227265418851, 35.51158905029297),
        new google.maps.LatLng(32.89083121370136, 35.518798828125),
        new google.maps.LatLng(32.89025463093989, 35.522918701171875),
        new google.maps.LatLng(32.887659962078956, 35.52806854248047),
        new google.maps.LatLng(32.887659962078956, 35.53974151611328),
        new google.maps.LatLng(32.891119503674965, 35.54248809814453),
        new google.maps.LatLng(32.891119503674965, 35.54729461669922),
        new google.maps.LatLng(32.892560939471615, 35.550384521484375),
        new google.maps.LatLng(32.895732015669786, 35.54695129394531),
        new google.maps.LatLng(32.89919124205649, 35.543174743652344),
        new google.maps.LatLng(32.901497317924765, 35.540428161621094),
        new google.maps.LatLng(32.904091581501, 35.540428161621094),
        new google.maps.LatLng(32.904091581501, 35.54523468017578),
        new google.maps.LatLng(32.90582104832939, 35.54798126220703),
        new google.maps.LatLng(32.91158569379286, 35.56171417236328),
        new google.maps.LatLng(32.91677355378147, 35.56549072265625),
        new google.maps.LatLng(32.918502772875975, 35.57750701904297),
        new google.maps.LatLng(32.91821457203976, 35.587806701660156),
        new google.maps.LatLng(32.91965556683586, 35.596046447753906),
        new google.maps.LatLng(32.92282567279776, 35.60222625732422),
        new google.maps.LatLng(32.927148361544575, 35.60565948486328),
        new google.maps.LatLng(32.92801287395171, 35.610809326171875),
        new google.maps.LatLng(32.92945370919086, 35.61561584472656),
        new google.maps.LatLng(32.931758996763335, 35.62419891357422),
        new google.maps.LatLng(32.95106342152381, 35.62591552734375),
        new google.maps.LatLng(32.960570021811456, 35.62488555908203),
        new google.maps.LatLng(32.978428141403825, 35.626258850097656),
        new google.maps.LatLng(32.99513085525829, 35.62694549560547),
        new google.maps.LatLng(33.01384565773913, 35.629005432128906),
        new google.maps.LatLng(33.05212664605825, 35.64067840576172),
        new google.maps.LatLng(33.07226785340662, 35.64308166503906),
        new google.maps.LatLng(33.090390998837975, 35.646514892578125),
        new google.maps.LatLng(33.120875481115334, 35.652008056640625),
        new google.maps.LatLng(33.16284622181141, 35.64960479736328),
        new google.maps.LatLng(33.173192085918075, 35.64891815185547),
        new google.maps.LatLng(33.19905140349983, 35.655269622802734),
        new google.maps.LatLng(33.21226543987183, 35.65595626831055),
        new google.maps.LatLng(33.22533388294235, 35.65286636352539),
        new google.maps.LatLng(33.23567236670223, 35.652523040771484),
        new google.maps.LatLng(33.24213329838942, 35.624027252197266),
        new google.maps.LatLng(33.25002934422699, 35.61115264892578),
        new google.maps.LatLng(33.25447952844022, 35.59896469116211),
        new google.maps.LatLng(33.26208738291049, 35.59398651123047),
        new google.maps.LatLng(33.267254604316584, 35.58488845825195),
        new google.maps.LatLng(33.27213447716171, 35.58694839477539),
        new google.maps.LatLng(33.28275443418201, 35.58523178100586),
        new google.maps.LatLng(33.284189464417864, 35.582313537597656),
        new google.maps.LatLng(33.287059454104856, 35.57870864868164),
        new google.maps.LatLng(33.288063928197495, 35.571842193603516),
        new google.maps.LatLng(33.29165124128551, 35.568580627441406),
        new google.maps.LatLng(33.288063928197495, 35.564117431640625),
        new google.maps.LatLng(33.283184945730184, 35.562400817871094),
        new google.maps.LatLng(33.274861346151496, 35.56428909301758),
        new google.maps.LatLng(33.2694075230104, 35.55948257446289),
        new google.maps.LatLng(33.266680483701144, 35.55845260620117),
        new google.maps.LatLng(33.265101632548216, 35.55622100830078),
        new google.maps.LatLng(33.258642398812924, 35.55570602416992),
        new google.maps.LatLng(33.25476662931657, 35.54557800292969),
        new google.maps.LatLng(33.23811321923412, 35.54574966430664),
        new google.maps.LatLng(33.2335186167059, 35.537166595458984),
        new google.maps.LatLng(33.20853124049305, 35.536651611328125),
        new google.maps.LatLng(33.19847683493303, 35.54180145263672),
        new google.maps.LatLng(33.13927608513229, 35.52583694458008),
        new google.maps.LatLng(33.13510753620141, 35.52824020385742),
        new google.maps.LatLng(33.133813808346105, 35.53150177001953),
        new google.maps.LatLng(33.11641850474211, 35.51931381225586),
        new google.maps.LatLng(33.11613095011279, 35.503692626953125),
        new google.maps.LatLng(33.11383047918907, 35.50180435180664),
        new google.maps.LatLng(33.0905348183885, 35.50334930419922),
        new google.maps.LatLng(33.09297971475382, 35.49013137817383),
        new google.maps.LatLng(33.09369878898088, 35.46335220336914),
        new google.maps.LatLng(33.0909662756286, 35.44532775878906),
        new google.maps.LatLng(33.06651369304211, 35.43073654174805),
        new google.maps.LatLng(33.0614784940697, 35.396575927734375),
        new google.maps.LatLng(33.06277328703267, 35.382328033447266),
        new google.maps.LatLng(33.06234169149467, 35.380096435546875),
        new google.maps.LatLng(33.05759400090168, 35.37443161010742),
        new google.maps.LatLng(33.04320549616557, 35.37614822387695),
        new google.maps.LatLng(33.03572254463766, 35.36481857299805),
        new google.maps.LatLng(33.02867072021502, 35.3730583190918),
        new google.maps.LatLng(33.00117761021751, 35.36619186401367),
        new google.maps.LatLng(33.01312593106509, 35.41837692260742),
        new google.maps.LatLng(33.00405687168937, 35.430049896240234),
        new google.maps.LatLng(32.98044415387331, 35.43296813964844),
        new google.maps.LatLng(32.95826548534384, 35.442237854003906),
        new google.maps.LatLng(32.947894327523066, 35.438804626464844),
        new google.maps.LatLng(32.93896263320926, 35.412025451660156),
        new google.maps.LatLng(32.934784595531966, 35.40464401245117),
        new google.maps.LatLng(32.941699861217685, 35.3924560546875),
        new google.maps.LatLng(32.936513462647135, 35.38644790649414),
        new google.maps.LatLng(32.917205861722465, 35.40447235107422),
        new google.maps.LatLng(32.91691765666308, 35.36773681640625),
    ];
    var ZF_Area = new google.maps.Polygon({
        paths: ZF_Coords
    });

    //---------------------------------------------------------------------------------------------------------//

    var SM_Coords = [
        new google.maps.LatLng(32.229356720329406, 35.423526763916016),
new google.maps.LatLng(32.20641036078661, 35.42472839355469),
new google.maps.LatLng(32.19275598198777, 35.42095184326172),
new google.maps.LatLng(32.17706544297099, 35.4144287109375),
new google.maps.LatLng(32.1605002739009, 35.403785705566406),
new google.maps.LatLng(32.14480417752976, 35.40069580078125),
new google.maps.LatLng(32.12590714393767, 35.40412902832031),
new google.maps.LatLng(32.11311308402619, 35.407562255859375),
new google.maps.LatLng(32.099735558532124, 35.408935546875),
new google.maps.LatLng(32.081701880269065, 35.407562255859375),
new google.maps.LatLng(32.07035629148888, 35.40515899658203),
new google.maps.LatLng(32.06133699866369, 35.404815673828125),
new google.maps.LatLng(32.057263478112894, 35.410308837890625),
new google.maps.LatLng(32.050570872022476, 35.408592224121094),
new google.maps.LatLng(32.04213167101658, 35.39417266845703),
new google.maps.LatLng(32.03863936024243, 35.38078308105469),
new google.maps.LatLng(32.03994899239455, 35.34421920776367),
new google.maps.LatLng(32.04416879077791, 35.32310485839844),
new google.maps.LatLng(32.04576935307221, 35.305423736572266),
new google.maps.LatLng(32.046060361391454, 35.28791427612305),
new google.maps.LatLng(32.04402328372697, 35.27109146118164),
new google.maps.LatLng(32.04635136878548, 35.25632858276367),
new google.maps.LatLng(32.05086186507475, 35.217018127441406),
new google.maps.LatLng(32.0520258280307, 35.19847869873047),
new google.maps.LatLng(32.053626252920814, 35.18577575683594),
new google.maps.LatLng(32.05915477806914, 35.20362854003906),
new google.maps.LatLng(32.06526486454641, 35.21615982055664),
new google.maps.LatLng(32.075447434961156, 35.229549407958984),
new google.maps.LatLng(32.092609772316635, 35.23263931274414),
new google.maps.LatLng(32.10497047581683, 35.23143768310547),
new google.maps.LatLng(32.131140560580995, 35.2166748046875),
new google.maps.LatLng(32.16515045002057, 35.18817901611328),
new google.maps.LatLng(32.23197049507261, 35.165863037109375),
new google.maps.LatLng(32.25026481308558, 35.16242980957031),
new google.maps.LatLng(32.25491040237429, 35.16345977783203),
new google.maps.LatLng(32.28190818349018, 35.17547607421875),
new google.maps.LatLng(32.29061543148475, 35.17993927001953),
new google.maps.LatLng(32.299031643087915, 35.17890930175781),
new google.maps.LatLng(32.30222379480205, 35.17444610595703),
new google.maps.LatLng(32.31063892854106, 35.179595947265625),
new google.maps.LatLng(32.30541583408083, 35.31898498535156),
    ];
    var SM_Area = new google.maps.Polygon({
        paths: SM_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var YN_Coords = [
        new google.maps.LatLng(32.04213167101658, 35.39348602294922),
new google.maps.LatLng(32.03456482930134, 35.39039611816406),
new google.maps.LatLng(32.01651829873178, 35.375633239746094),
new google.maps.LatLng(32.004291209867134, 35.36327362060547),
new google.maps.LatLng(31.983326691811396, 35.352630615234375),
new google.maps.LatLng(31.971386422339652, 35.34645080566406),
new google.maps.LatLng(31.94691858024963, 35.34507751464844),
new google.maps.LatLng(31.928854801809585, 35.336151123046875),
new google.maps.LatLng(31.92098720813286, 35.34198760986328),
new google.maps.LatLng(31.916907450132463, 35.34954071044922),
new google.maps.LatLng(31.913993226490213, 35.35606384277344),
new google.maps.LatLng(31.91195321501266, 35.372886657714844),
new google.maps.LatLng(31.91574177175371, 35.38249969482422),
new google.maps.LatLng(31.919821581454634, 35.392799377441406),
new google.maps.LatLng(31.922152820038836, 35.401039123535156),
new google.maps.LatLng(31.92098720813286, 35.40790557861328),
new google.maps.LatLng(31.917490283782648, 35.409278869628906),
new google.maps.LatLng(31.91195321501266, 35.407562255859375),
new google.maps.LatLng(31.876391466606282, 35.400352478027344),
new google.maps.LatLng(31.86443730407827, 35.39451599121094),
new google.maps.LatLng(31.84664897336452, 35.385589599609375),
new google.maps.LatLng(31.8311907528247, 35.380096435546875),
new google.maps.LatLng(31.822439668935843, 35.37666320800781),
new google.maps.LatLng(31.812520771059095, 35.37769317626953),
new google.maps.LatLng(31.798807599289702, 35.391082763671875),
new google.maps.LatLng(31.785384226419538, 35.41271209716797),
new google.maps.LatLng(31.775753214756303, 35.43983459472656),
new google.maps.LatLng(31.766413094137064, 35.447044372558594),
new google.maps.LatLng(31.739554995617915, 35.447731018066406),
new google.maps.LatLng(31.715901742760696, 35.44670104980469),
new google.maps.LatLng(31.692534580591307, 35.443267822265625),
new google.maps.LatLng(31.68084879226893, 35.43571472167969),
new google.maps.LatLng(31.662148471209694, 35.42335510253906),
new google.maps.LatLng(31.646367146916386, 35.41099548339844),
new google.maps.LatLng(31.625905886872008, 35.40550231933594),
new google.maps.LatLng(31.60310089533651, 35.40000915527344),
new google.maps.LatLng(31.58964917898045, 35.39726257324219),
new google.maps.LatLng(31.574440551990754, 35.388336181640625),
new google.maps.LatLng(31.5668353078939, 35.39176940917969),
new google.maps.LatLng(31.553378356555264, 35.38421630859375),
new google.maps.LatLng(31.535822894163246, 35.382843017578125),
new google.maps.LatLng(31.503043865128223, 35.37322998046875),
new google.maps.LatLng(31.478452047933082, 35.37803649902344),
new google.maps.LatLng(31.49191979634118, 35.39863586425781),
new google.maps.LatLng(31.49777473435026, 35.429534912109375),
new google.maps.LatLng(31.49660377607412, 35.45768737792969),
new google.maps.LatLng(31.492505306637387, 35.47966003417969),
new google.maps.LatLng(31.568590419282312, 35.484466552734375),
new google.maps.LatLng(31.638767775839142, 35.50163269042969),
new google.maps.LatLng(31.71940630930742, 35.533905029296875),
new google.maps.LatLng(31.758531633937167, 35.56068420410156),
new google.maps.LatLng(31.82273138509748, 35.5572509765625),
new google.maps.LatLng(31.878723805312543, 35.553131103515625),
new google.maps.LatLng(31.89854630009035, 35.5352783203125),
new google.maps.LatLng(31.918947351751875, 35.53459167480469),
new google.maps.LatLng(31.93235129404254, 35.544891357421875),
new google.maps.LatLng(31.94575328232356, 35.550384521484375),
new google.maps.LatLng(31.96090100253141, 35.55107116699219),
new google.maps.LatLng(31.976046224524243, 35.55244445800781),
new google.maps.LatLng(31.984782715952374, 35.54695129394531),
new google.maps.LatLng(32.0074937003197, 35.539398193359375),
new google.maps.LatLng(32.02088472086091, 35.5352783203125),
new google.maps.LatLng(32.043004727893994, 35.533905029296875),
new google.maps.LatLng(32.06744693937369, 35.54557800292969),
new google.maps.LatLng(32.086646952664736, 35.55381774902344),
new google.maps.LatLng(32.10351636222566, 35.5462646484375),
new google.maps.LatLng(32.12445336381827, 35.55656433105469),
new google.maps.LatLng(32.1407343780354, 35.56068420410156),
new google.maps.LatLng(32.15468722002481, 35.5682373046875),
new google.maps.LatLng(32.16863792635911, 35.5682373046875),
new google.maps.LatLng(32.18084304210396, 35.57029724121094),
new google.maps.LatLng(32.198276083995, 35.5792236328125),
new google.maps.LatLng(32.224419385153006, 35.57853698730469),
new google.maps.LatLng(32.24707083257868, 35.57853698730469),
new google.maps.LatLng(32.2720389584545, 35.57098388671875),
new google.maps.LatLng(32.29061543148475, 35.572357177734375),
new google.maps.LatLng(32.2999022410693, 35.56549072265625),
new google.maps.LatLng(32.314991277245554, 35.57029724121094),
new google.maps.LatLng(32.3271767410611, 35.562744140625),
new google.maps.LatLng(32.3434214752644, 35.564117431640625),
new google.maps.LatLng(32.358503260304744, 35.562744140625),
new google.maps.LatLng(32.365463235972015, 35.57029724121094),
new google.maps.LatLng(32.38576010445448, 35.56343078613281),
new google.maps.LatLng(32.39213817866891, 35.55107116699219),
new google.maps.LatLng(32.390978562311886, 35.54283142089844),
new google.maps.LatLng(32.3973562680131, 35.531158447265625),
new google.maps.LatLng(32.40547269651596, 35.49201965332031),
new google.maps.LatLng(32.4153273786237, 35.48240661621094),
new google.maps.LatLng(32.41706632846282, 35.46112060546875),
new google.maps.LatLng(32.41358839527031, 35.446014404296875),
new google.maps.LatLng(32.407211836256685, 35.4364013671875),
new google.maps.LatLng(32.346322013829464, 35.410308837890625),
new google.maps.LatLng(32.33413912701808, 35.40962219238281),
new google.maps.LatLng(32.31789272687268, 35.41511535644531),
new google.maps.LatLng(32.28887404877279, 35.429534912109375),
new google.maps.LatLng(32.27378066442218, 35.43365478515625),
new google.maps.LatLng(32.25055516937943, 35.43296813964844),
new google.maps.LatLng(32.23197049507261, 35.42266845703125),
new google.maps.LatLng(32.20757234095538, 35.42198181152344),
new google.maps.LatLng(32.18432991758738, 35.41648864746094),
new google.maps.LatLng(32.15584986046307, 35.40069580078125),
new google.maps.LatLng(32.13666439690465, 35.399322509765625),
new google.maps.LatLng(32.12038265626624, 35.404815673828125),
new google.maps.LatLng(32.10235305468224, 35.40687561035156),
new google.maps.LatLng(32.083156341101464, 35.40687561035156),
new google.maps.LatLng(32.06570128367684, 35.4034423828125),
new google.maps.LatLng(32.0598821907181, 35.40412902832031),
    ];
    var YN_Area = new google.maps.Polygon({
        paths: YN_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var HF_Coords = [
        new google.maps.LatLng(32.76880048488168, 35.168609619140625),
new google.maps.LatLng(32.76360396952606, 35.16105651855469),
new google.maps.LatLng(32.7537875018279, 35.157623291015625),
new google.maps.LatLng(32.74570253945518, 35.15419006347656),
new google.maps.LatLng(32.73819441736631, 35.15556335449219),
new google.maps.LatLng(32.73126328163474, 35.15144348144531),
new google.maps.LatLng(32.72490926707168, 35.14457702636719),
new google.maps.LatLng(32.71913249723242, 35.135650634765625),
new google.maps.LatLng(32.713355353177555, 35.13427734375),
new google.maps.LatLng(32.701222132744036, 35.130157470703125),
new google.maps.LatLng(32.70468893551646, 35.119171142578125),
new google.maps.LatLng(32.70815560360234, 35.11024475097656),
new google.maps.LatLng(32.704111144407406, 35.108184814453125),
new google.maps.LatLng(32.69891085607356, 35.1068115234375),
new google.maps.LatLng(32.69255453660822, 35.110931396484375),
new google.maps.LatLng(32.68677567160618, 35.11299133300781),
new google.maps.LatLng(32.679840539897484, 35.123291015625),
new google.maps.LatLng(32.657875736955305, 35.10955810546875),
new google.maps.LatLng(32.650938361757355, 35.099945068359375),
new google.maps.LatLng(32.64515680456839, 35.08552551269531),
new google.maps.LatLng(32.637061996573436, 35.07591247558594),
new google.maps.LatLng(32.63417081619418, 35.0518798828125),
new google.maps.LatLng(32.67752870965116, 35.036773681640625),
new google.maps.LatLng(32.699488680852674, 35.04432678222656),
new google.maps.LatLng(32.71046664083005, 35.023040771484375),
new google.maps.LatLng(32.7295304134847, 35.01411437988281),
new google.maps.LatLng(32.73588409867885, 35.036773681640625),
new google.maps.LatLng(32.751477587458865, 35.01686096191406),
new google.maps.LatLng(32.76244914714216, 35.0079345703125),
new google.maps.LatLng(32.760139457437795, 34.995574951171875),
new google.maps.LatLng(32.74859011025593, 34.99351501464844),
new google.maps.LatLng(32.743969952049575, 34.98870849609375),
new google.maps.LatLng(32.749745112369105, 34.98252868652344),
new google.maps.LatLng(32.74108223150125, 34.9749755859375),
new google.maps.LatLng(32.753643133934936, 34.962615966796875),
new google.maps.LatLng(32.75970638394809, 34.95025634765625),
new google.maps.LatLng(32.79405700144505, 34.954891204833984),
new google.maps.LatLng(32.803003304205006, 34.95643615722656),
new google.maps.LatLng(32.80603329943089, 34.953861236572266),
new google.maps.LatLng(32.807331837195626, 34.9555778503418),
new google.maps.LatLng(32.81454559041408, 34.95351791381836),
new google.maps.LatLng(32.82536512222338, 34.95454788208008),
new google.maps.LatLng(32.826951876079946, 34.95626449584961),
new google.maps.LatLng(32.82637487795752, 34.95832443237305),
new google.maps.LatLng(32.83156772610805, 34.963645935058594),
new google.maps.LatLng(32.83228893100241, 34.969482421875),
new google.maps.LatLng(32.83719296893632, 34.98046875),
new google.maps.LatLng(32.836471803875156, 34.98647689819336),
new google.maps.LatLng(32.83286589070039, 34.9888801574707),
new google.maps.LatLng(32.82752887045379, 35.00141143798828),
new google.maps.LatLng(32.8219030154127, 35.01617431640625),
new google.maps.LatLng(32.818296510663295, 35.03265380859375),
new google.maps.LatLng(32.821325984491764, 35.03746032714844),
new google.maps.LatLng(32.84079870636961, 35.05582809448242),
new google.maps.LatLng(32.86300681878146, 35.06715774536133),
new google.maps.LatLng(32.89227265418851, 35.078487396240234),
new google.maps.LatLng(32.88881315761995, 35.090675354003906),
new google.maps.LatLng(32.88492106251796, 35.0984001159668),
new google.maps.LatLng(32.8787221877715, 35.10732650756836),
new google.maps.LatLng(32.86156490232035, 35.11127471923828),
new google.maps.LatLng(32.8468560155417, 35.10758399963379),
new google.maps.LatLng(32.83445251053944, 35.14698028564453),
new google.maps.LatLng(32.82774524237756, 35.15719413757324),
new google.maps.LatLng(32.789727822117364, 35.136680603027344),
new google.maps.LatLng(32.78193476829083, 35.15453338623047),
new google.maps.LatLng(32.7702439075344, 35.169124603271484),
    ];
    var HF_Area = new google.maps.Polygon({
        paths: HF_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var AK_Coords = [
        new google.maps.LatLng(33.09326734515043, 35.10337829589844),
new google.maps.LatLng(33.096718836507335, 35.110931396484375),
new google.maps.LatLng(33.09326734515043, 35.15556335449219),
new google.maps.LatLng(33.086363955913264, 35.15556335449219),
new google.maps.LatLng(33.09614359735857, 35.17616271972656),
new google.maps.LatLng(33.0909662756286, 35.18852233886719),
new google.maps.LatLng(33.086939259051256, 35.193328857421875),
new google.maps.LatLng(33.090390998837975, 35.20637512207031),
new google.maps.LatLng(33.097294071891696, 35.20500183105469),
new google.maps.LatLng(33.10419660287101, 35.21324157714844),
new google.maps.LatLng(33.097294071891696, 35.23384094238281),
new google.maps.LatLng(33.09326734515043, 35.23933410644531),
new google.maps.LatLng(33.110523446688916, 35.292205810546875),
new google.maps.LatLng(33.10304621868762, 35.3045654296875),
new google.maps.LatLng(33.10764766506478, 35.31898498535156),
new google.maps.LatLng(33.0955683544455, 35.327911376953125),
new google.maps.LatLng(33.08808985403573, 35.32447814941406),
new google.maps.LatLng(33.063924198120645, 35.349884033203125),
new google.maps.LatLng(33.06162236089505, 35.35675048828125),
new google.maps.LatLng(33.05759400090168, 35.374603271484375),
new google.maps.LatLng(33.04320549616557, 35.3759765625),
new google.maps.LatLng(33.03572254463766, 35.36430358886719),
new google.maps.LatLng(33.02881464063999, 35.37322998046875),
new google.maps.LatLng(33.0178760185549, 35.37117004394531),
new google.maps.LatLng(33.00117761021751, 35.366363525390625),
new google.maps.LatLng(33.01326987686982, 35.418548583984375),
new google.maps.LatLng(33.00405687168937, 35.43022155761719),
new google.maps.LatLng(32.98044415387331, 35.43296813964844),
new google.maps.LatLng(32.95797741405952, 35.44258117675781),
new google.maps.LatLng(32.948182431672386, 35.43914794921875),
new google.maps.LatLng(32.93896263320926, 35.41236877441406),
new google.maps.LatLng(32.93492866908233, 35.404815673828125),
new google.maps.LatLng(32.941843923502645, 35.39176940917969),
new google.maps.LatLng(32.936657533381286, 35.38627624511719),
new google.maps.LatLng(32.91706175931007, 35.404815673828125),
new google.maps.LatLng(32.91706175931007, 35.36773681640625),
new google.maps.LatLng(32.88420028540548, 35.374603271484375),
new google.maps.LatLng(32.877280526855394, 35.38352966308594),
new google.maps.LatLng(32.872090353419075, 35.38764953613281),
new google.maps.LatLng(32.866323137679224, 35.382843017578125),
new google.maps.LatLng(32.86170909502134, 35.377349853515625),
new google.maps.LatLng(32.85767161078748, 35.37803649902344),
new google.maps.LatLng(32.85132662142229, 35.38421630859375),
new google.maps.LatLng(32.847865526878856, 35.3924560546875),
new google.maps.LatLng(32.84094293282064, 35.393829345703125),
new google.maps.LatLng(32.83286589070039, 35.396575927734375),
new google.maps.LatLng(32.821325984491764, 35.3924560546875),
new google.maps.LatLng(32.80689899338195, 35.408935546875),
new google.maps.LatLng(32.80401331408953, 35.40138244628906),
new google.maps.LatLng(32.80805323886752, 35.386962890625),
new google.maps.LatLng(32.809784578989934, 35.369110107421875),
new google.maps.LatLng(32.811515885384395, 35.34233093261719),
new google.maps.LatLng(32.80401331408953, 35.32997131347656),
new google.maps.LatLng(32.79708730158076, 35.319671630859375),
new google.maps.LatLng(32.79477851084408, 35.29975891113281),
new google.maps.LatLng(32.79304687845155, 35.267486572265625),
new google.maps.LatLng(32.79477851084408, 35.24070739746094),
new google.maps.LatLng(32.80574473290688, 35.22216796875),
new google.maps.LatLng(32.79477851084408, 35.2166748046875),
new google.maps.LatLng(32.783233658006516, 35.21873474121094),
new google.maps.LatLng(32.76418137510082, 35.21461486816406),
new google.maps.LatLng(32.758984590117905, 35.2056884765625),
new google.maps.LatLng(32.759562025650126, 35.19401550292969),
new google.maps.LatLng(32.76418137510082, 35.176849365234375),
new google.maps.LatLng(32.77399669688296, 35.163116455078125),
new google.maps.LatLng(32.7815018008381, 35.15419006347656),
new google.maps.LatLng(32.78958351251041, 35.13633728027344),
new google.maps.LatLng(32.82767311846154, 35.15693664550781),
new google.maps.LatLng(32.834019798849624, 35.14732360839844),
new google.maps.LatLng(32.84036602561058, 35.127410888671875),
new google.maps.LatLng(32.84671179869895, 35.10749816894531),
new google.maps.LatLng(32.8622858634811, 35.110931396484375),
new google.maps.LatLng(32.8788663525735, 35.10698318481445),
new google.maps.LatLng(32.88261455512238, 35.10200500488281),
new google.maps.LatLng(32.887659962078956, 35.09359359741211),
new google.maps.LatLng(32.88996633815205, 35.08604049682617),
new google.maps.LatLng(32.89184022450486, 35.07831573486328),
new google.maps.LatLng(32.90452395137483, 35.08089065551758),
new google.maps.LatLng(32.91187391621322, 35.081748962402344),
new google.maps.LatLng(32.91879097277371, 35.07917404174805),
new google.maps.LatLng(32.92037605543544, 35.07453918457031),
new google.maps.LatLng(32.92167292013293, 35.071964263916016),
new google.maps.LatLng(32.91907917173292, 35.069732666015625),
new google.maps.LatLng(32.91835867257519, 35.065956115722656),
new google.maps.LatLng(32.92052015245145, 35.0657844543457),
new google.maps.LatLng(32.93219123149512, 35.070247650146484),
new google.maps.LatLng(32.93536088832532, 35.07179260253906),
new google.maps.LatLng(32.95509664956795, 35.073509216308594),
new google.maps.LatLng(32.97986815500754, 35.07865905761719),
new google.maps.LatLng(33.005208549965474, 35.08552551269531),
new google.maps.LatLng(33.04435666306044, 35.098228454589844),
new google.maps.LatLng(33.0509755807245, 35.10028839111328),
new google.maps.LatLng(33.06219782584503, 35.102691650390625),
new google.maps.LatLng(33.08262439377602, 35.105438232421875),
new google.maps.LatLng(33.0909662756286, 35.104408264160156),
    ];
    var AK_Area = new google.maps.Polygon({
        paths: AK_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var HD_Coords = [
        new google.maps.LatLng(32.633881693017706, 35.051536560058594),
new google.maps.LatLng(32.62491841117469, 35.060462951660156),
new google.maps.LatLng(32.61855682784329, 35.05359649658203),
new google.maps.LatLng(32.617255539195966, 35.05720138549805),
new google.maps.LatLng(32.60106014282726, 35.05084991455078),
new google.maps.LatLng(32.59122579488824, 35.05205154418945),
new google.maps.LatLng(32.5851510996314, 35.05754470825195),
new google.maps.LatLng(32.579654592037826, 35.0599479675293),
new google.maps.LatLng(32.574013089115475, 35.05891799926758),
new google.maps.LatLng(32.569673229973986, 35.05411148071289),
new google.maps.LatLng(32.56735855256776, 35.04415512084961),
new google.maps.LatLng(32.56547783319517, 35.034542083740234),
new google.maps.LatLng(32.56084820214486, 35.02870559692383),
new google.maps.LatLng(32.55737582208488, 35.030250549316406),
new google.maps.LatLng(32.55390330765706, 35.03643035888672),
new google.maps.LatLng(32.553179850239374, 35.041751861572266),
new google.maps.LatLng(32.548260185149985, 35.05033493041992),
new google.maps.LatLng(32.54883898327313, 35.0544548034668),
new google.maps.LatLng(32.547247279454616, 35.05943298339844),
new google.maps.LatLng(32.544642612331046, 35.06183624267578),
new google.maps.LatLng(32.54088018196837, 35.07213592529297),
new google.maps.LatLng(32.538854192626104, 35.08157730102539),
new google.maps.LatLng(32.53682815757515, 35.086727142333984),
new google.maps.LatLng(32.532920675187846, 35.09084701538086),
new google.maps.LatLng(32.532341774450515, 35.10183334350586),
new google.maps.LatLng(32.53089450628447, 35.109214782714844),
new google.maps.LatLng(32.53089450628447, 35.11556625366211),
new google.maps.LatLng(32.52481572536378, 35.11796951293945),
new google.maps.LatLng(32.52163143788113, 35.12105941772461),
new google.maps.LatLng(32.52307885527122, 35.124664306640625),
new google.maps.LatLng(32.52467098747173, 35.12775421142578),
new google.maps.LatLng(32.527855167237206, 35.13101577758789),
new google.maps.LatLng(32.538709477352576, 35.1397705078125),
new google.maps.LatLng(32.545366138556574, 35.147666931152344),
new google.maps.LatLng(32.552022306241454, 35.14749526977539),
new google.maps.LatLng(32.55853329703501, 35.14629364013672),
new google.maps.LatLng(32.5611375610844, 35.15625),
new google.maps.LatLng(32.56880523294623, 35.16294479370117),
new google.maps.LatLng(32.5722771706588, 35.17152786254883),
new google.maps.LatLng(32.573868430527426, 35.18028259277344),
new google.maps.LatLng(32.57213250927074, 35.18199920654297),
new google.maps.LatLng(32.56952856438602, 35.180625915527344),
new google.maps.LatLng(32.56634586242051, 35.184574127197266),
new google.maps.LatLng(32.562150310024094, 35.18989562988281),
new google.maps.LatLng(32.556507706074605, 35.19144058227539),
new google.maps.LatLng(32.5529628118769, 35.19444465637207),
new google.maps.LatLng(32.54956247567908, 35.199294090270996),
new google.maps.LatLng(32.547319630240445, 35.20066738128662),
new google.maps.LatLng(32.544389376774575, 35.19478797912598),
new google.maps.LatLng(32.538130613926434, 35.198307037353516),
new google.maps.LatLng(32.52872356031481, 35.19195556640625),
new google.maps.LatLng(32.523657815699146, 35.18697738647461),
new google.maps.LatLng(32.52467098747173, 35.1807975769043),
new google.maps.LatLng(32.52148669485984, 35.17822265625),
new google.maps.LatLng(32.51888128060975, 35.17753601074219),
new google.maps.LatLng(32.50918268597245, 35.16448974609375),
new google.maps.LatLng(32.504115839852815, 35.16105651855469),
new google.maps.LatLng(32.502233795716045, 35.15470504760742),
new google.maps.LatLng(32.4967322100924, 35.14148712158203),
new google.maps.LatLng(32.49267819482123, 35.138397216796875),
new google.maps.LatLng(32.482831968568554, 35.12432098388672),
new google.maps.LatLng(32.477908451417896, 35.11402130126953),
new google.maps.LatLng(32.47732919639942, 35.10509490966797),
new google.maps.LatLng(32.47703956749234, 35.09479522705078),
new google.maps.LatLng(32.47182608781553, 35.08689880371094),
new google.maps.LatLng(32.46603297853121, 35.07865905761719),
new google.maps.LatLng(32.45966012786285, 35.07110595703125),
new google.maps.LatLng(32.45531474387748, 35.07213592529297),
new google.maps.LatLng(32.45299712004732, 35.07041931152344),
new google.maps.LatLng(32.45067943659943, 35.06561279296875),
new google.maps.LatLng(32.443726028572186, 35.065956115722656),
new google.maps.LatLng(32.43966962613718, 35.063209533691406),
new google.maps.LatLng(32.42807889910622, 35.058746337890625),
new google.maps.LatLng(32.42373199235633, 35.05565643310547),
new google.maps.LatLng(32.420254316120676, 35.057373046875),
new google.maps.LatLng(32.41706632846282, 35.05359649658203),
new google.maps.LatLng(32.409240790268115, 35.054969787597656),
new google.maps.LatLng(32.39880568376252, 35.051536560058594),
new google.maps.LatLng(32.385470181289065, 35.04364013671875),
new google.maps.LatLng(32.38025140520136, 35.04020690917969),
new google.maps.LatLng(32.377931852397595, 35.041236877441406),
new google.maps.LatLng(32.374307431937574, 35.02235412597656),
new google.maps.LatLng(32.37648210165771, 35.01188278198242),
new google.maps.LatLng(32.38054134511501, 35.00415802001953),
new google.maps.LatLng(32.3818460632124, 34.99866485595703),
new google.maps.LatLng(32.38576010445448, 34.992828369140625),
new google.maps.LatLng(32.38749962390624, 34.9859619140625),
new google.maps.LatLng(32.390108840272994, 34.974117279052734),
new google.maps.LatLng(32.3956169384015, 34.95248794555664),
new google.maps.LatLng(32.39996519960948, 34.94373321533203),
new google.maps.LatLng(32.40344365780038, 34.93377685546875),
new google.maps.LatLng(32.40996540564691, 34.930686950683594),
new google.maps.LatLng(32.410979857403035, 34.923133850097656),
new google.maps.LatLng(32.40909586649421, 34.9171257019043),
new google.maps.LatLng(32.40619734214692, 34.913692474365234),
new google.maps.LatLng(32.403588590649726, 34.907684326171875),
new google.maps.LatLng(32.40474804506751, 34.90201950073242),
new google.maps.LatLng(32.40634227057499, 34.89309310913086),
new google.maps.LatLng(32.40706690922483, 34.88759994506836),
new google.maps.LatLng(32.408371244133996, 34.881591796875),
new google.maps.LatLng(32.410400172081545, 34.87833023071289),
new google.maps.LatLng(32.41155953900097, 34.873695373535156),
new google.maps.LatLng(32.41170445881864, 34.86957550048828),
new google.maps.LatLng(32.41938487611333, 34.87180709838867),
new google.maps.LatLng(32.433005140150016, 34.87489700317383),
new google.maps.LatLng(32.43604768399796, 34.876956939697266),
new google.maps.LatLng(32.439959375222, 34.877986907958984),
new google.maps.LatLng(32.44227733437236, 34.87678527832031),
new google.maps.LatLng(32.44459523391549, 34.878501892089844),
new google.maps.LatLng(32.44647848340221, 34.87730026245117),
new google.maps.LatLng(32.447782248455646, 34.87833023071289),
new google.maps.LatLng(32.46313628412808, 34.88330841064453),
new google.maps.LatLng(32.47240537824467, 34.879188537597656),
new google.maps.LatLng(32.477618824374616, 34.885711669921875),
new google.maps.LatLng(32.48674162855308, 34.88811492919922),
new google.maps.LatLng(32.4932573510458, 34.88759994506836),
new google.maps.LatLng(32.49470522529474, 34.88880157470703),
new google.maps.LatLng(32.50194424696818, 34.88880157470703),
new google.maps.LatLng(32.507735044788404, 34.89326477050781),
new google.maps.LatLng(32.51135410404299, 34.8951530456543),
new google.maps.LatLng(32.51555203025782, 34.89686965942383),
new google.maps.LatLng(32.52467098747173, 34.898414611816406),
new google.maps.LatLng(32.53349957219424, 34.9009895324707),
new google.maps.LatLng(32.53928833704742, 34.900474548339844),
new google.maps.LatLng(32.54015661959339, 34.90184783935547),
new google.maps.LatLng(32.55028596225381, 34.904422760009766),
new google.maps.LatLng(32.55578426965102, 34.90425109863281),
new google.maps.LatLng(32.55911202891133, 34.907169342041016),
new google.maps.LatLng(32.60424161253153, 34.916439056396484),
new google.maps.LatLng(32.60988121294625, 34.912147521972656),
new google.maps.LatLng(32.63648376797194, 34.920387268066406),
new google.maps.LatLng(32.65007115200838, 34.921417236328125),
new google.maps.LatLng(32.657875736955305, 34.926910400390625),
new google.maps.LatLng(32.66018807572586, 34.92347717285156),
new google.maps.LatLng(32.66307841506968, 34.925880432128906),
new google.maps.LatLng(32.67550580910239, 34.92897033691406),
new google.maps.LatLng(32.68273024355948, 34.925537109375),
new google.maps.LatLng(32.69891085607356, 34.92622375488281),
new google.maps.LatLng(32.69891085607356, 34.93171691894531),
new google.maps.LatLng(32.702666650266885, 34.93446350097656),
new google.maps.LatLng(32.704977829668, 34.9310302734375),
new google.maps.LatLng(32.70815560360234, 34.93206024169922),
new google.maps.LatLng(32.70700006253934, 34.93721008300781),
new google.maps.LatLng(32.711333264356284, 34.940643310546875),
new google.maps.LatLng(32.73357372010094, 34.94682312011719),
new google.maps.LatLng(32.75985074201205, 34.9500846862793),
new google.maps.LatLng(32.7537875018279, 34.96295928955078),
new google.maps.LatLng(32.74108223150125, 34.97480392456055),
new google.maps.LatLng(32.750033860557416, 34.982872009277344),
new google.maps.LatLng(32.74425871895697, 34.9885368347168),
new google.maps.LatLng(32.74873448633905, 34.99351501464844),
new google.maps.LatLng(32.760139457437795, 34.99540328979492),
new google.maps.LatLng(32.76259350075932, 35.008277893066406),
new google.maps.LatLng(32.75191070096623, 35.016517639160156),
new google.maps.LatLng(32.73588409867885, 35.036773681640625),
new google.maps.LatLng(32.72938600628502, 35.01445770263672),
new google.maps.LatLng(32.71003332590989, 35.02338409423828),
new google.maps.LatLng(32.69977759183938, 35.04518508911133),
new google.maps.LatLng(32.67767320079454, 35.03711700439453),
    ];
    var HD_Area = new google.maps.Polygon({
        paths: HD_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var KN_Coords = [
        new google.maps.LatLng(32.803147592033966, 35.401039123535156),
new google.maps.LatLng(32.798530265348575, 35.404815673828125),
new google.maps.LatLng(32.78294501748632, 35.40721893310547),
new google.maps.LatLng(32.77313068261673, 35.40687561035156),
new google.maps.LatLng(32.765047476441374, 35.39176940917969),
new google.maps.LatLng(32.76244914714216, 35.383872985839844),
new google.maps.LatLng(32.75349876580794, 35.37425994873047),
new google.maps.LatLng(32.74281487506093, 35.370140075683594),
new google.maps.LatLng(32.73155208971808, 35.370140075683594),
new google.maps.LatLng(32.72433160692846, 35.375633239746094),
new google.maps.LatLng(32.71913249723242, 35.37803649902344),
new google.maps.LatLng(32.71306648615227, 35.3759765625),
new google.maps.LatLng(32.709022249578155, 35.37254333496094),
new google.maps.LatLng(32.70179994255902, 35.37117004394531),
new google.maps.LatLng(32.696599519547924, 35.37494659423828),
new google.maps.LatLng(32.6960216760644, 35.38318634033203),
new google.maps.LatLng(32.6960216760644, 35.39314270019531),
new google.maps.LatLng(32.69197666693998, 35.402069091796875),
new google.maps.LatLng(32.69631059827375, 35.41339874267578),
new google.maps.LatLng(32.69428812316933, 35.417518615722656),
new google.maps.LatLng(32.68966515086213, 35.417518615722656),
new google.maps.LatLng(32.68590880959562, 35.41786193847656),
new google.maps.LatLng(32.68157437331439, 35.416831970214844),
new google.maps.LatLng(32.677817691704206, 35.41065216064453),
new google.maps.LatLng(32.67521681957013, 35.40687561035156),
new google.maps.LatLng(32.67059285991286, 35.41374206542969),
new google.maps.LatLng(32.66828079034104, 35.424041748046875),
new google.maps.LatLng(32.66885881334276, 35.429534912109375),
new google.maps.LatLng(32.66510159699591, 35.43296813964844),
new google.maps.LatLng(32.65874287100405, 35.43743133544922),
new google.maps.LatLng(32.6541180588781, 35.443267822265625),
new google.maps.LatLng(32.655274284339875, 35.44670104980469),
new google.maps.LatLng(32.65758669040313, 35.452537536621094),
new google.maps.LatLng(32.65758669040313, 35.458717346191406),
new google.maps.LatLng(32.656430494848316, 35.462493896484375),
new google.maps.LatLng(32.65036022285923, 35.46455383300781),
new google.maps.LatLng(32.640820391386406, 35.466957092285156),
new google.maps.LatLng(32.63330344386202, 35.470733642578125),
new google.maps.LatLng(32.62723160211139, 35.470733642578125),
new google.maps.LatLng(32.62405094916023, 35.474510192871094),
new google.maps.LatLng(32.621159348395096, 35.477943420410156),
new google.maps.LatLng(32.62087018318113, 35.48412322998047),
new google.maps.LatLng(32.62260516045382, 35.48961639404297),
new google.maps.LatLng(32.621448512675016, 35.494422912597656),
new google.maps.LatLng(32.61826765422287, 35.50128936767578),
new google.maps.LatLng(32.61653259288591, 35.50849914550781),
new google.maps.LatLng(32.615665049608346, 35.51227569580078),
new google.maps.LatLng(32.613640749271326, 35.51605224609375),
new google.maps.LatLng(32.61306236934077, 35.51982879638672),
new google.maps.LatLng(32.61277317797456, 35.52497863769531),
new google.maps.LatLng(32.61161640317033, 35.530128479003906),
new google.maps.LatLng(32.60901360522645, 35.533905029296875),
new google.maps.LatLng(32.60583230501211, 35.537681579589844),
new google.maps.LatLng(32.60149398625833, 35.54454803466797),
new google.maps.LatLng(32.601783214045184, 35.55381774902344),
new google.maps.LatLng(32.60091552788334, 35.56205749511719),
new google.maps.LatLng(32.59802317998301, 35.5682373046875),
new google.maps.LatLng(32.60409700272347, 35.567893981933594),
new google.maps.LatLng(32.605253874651204, 35.57201385498047),
new google.maps.LatLng(32.60988121294625, 35.57373046875),
new google.maps.LatLng(32.61653259288591, 35.572357177734375),
new google.maps.LatLng(32.623472636479974, 35.567893981933594),
new google.maps.LatLng(32.62578586478203, 35.56377410888672),
new google.maps.LatLng(32.63243606312154, 35.56995391845703),
new google.maps.LatLng(32.6361946522697, 35.565147399902344),
new google.maps.LatLng(32.64110949213927, 35.568580627441406),
new google.maps.LatLng(32.64255498188792, 35.572357177734375),
new google.maps.LatLng(32.640820391386406, 35.57853698730469),
new google.maps.LatLng(32.64342226452444, 35.58025360107422),
new google.maps.LatLng(32.63937487360669, 35.58643341064453),
new google.maps.LatLng(32.6442895387513, 35.59398651123047),
new google.maps.LatLng(32.648625783736726, 35.592613220214844),
new google.maps.LatLng(32.65036022285923, 35.596046447753906),
new google.maps.LatLng(32.650649292775554, 35.606689453125),
new google.maps.LatLng(32.657875736955305, 35.60943603515625),
new google.maps.LatLng(32.66307841506968, 35.606689453125),
new google.maps.LatLng(32.66741374882766, 35.599822998046875),
new google.maps.LatLng(32.669436832605314, 35.601539611816406),
new google.maps.LatLng(32.669436832605314, 35.604286193847656),
new google.maps.LatLng(32.67319386666782, 35.608062744140625),
new google.maps.LatLng(32.67897361056713, 35.61664581298828),
new google.maps.LatLng(32.67752870965116, 35.6231689453125),
new google.maps.LatLng(32.67839565300552, 35.63037872314453),
new google.maps.LatLng(32.685041939169665, 35.6341552734375),
new google.maps.LatLng(32.68215231030691, 35.641021728515625),
new google.maps.LatLng(32.67752870965116, 35.64308166503906),
new google.maps.LatLng(32.67752870965116, 35.64857482910156),
new google.maps.LatLng(32.68301920878329, 35.65235137939453),
new google.maps.LatLng(32.68822042292262, 35.65509796142578),
new google.maps.LatLng(32.695443828840105, 35.65509796142578),
new google.maps.LatLng(32.70151103811915, 35.65132141113281),
new google.maps.LatLng(32.71624397197978, 35.65784454345703),
new google.maps.LatLng(32.72433160692846, 35.65818786621094),
new google.maps.LatLng(32.737616843309304, 35.66333770751953),
new google.maps.LatLng(32.752343812367535, 35.666770935058594),
new google.maps.LatLng(32.76158302052429, 35.664710998535156),
new google.maps.LatLng(32.77890395187418, 35.668487548828125),
new google.maps.LatLng(32.787851778963635, 35.659217834472656),
new google.maps.LatLng(32.79333548619193, 35.650291442871094),
new google.maps.LatLng(32.80257043931297, 35.64857482910156),
new google.maps.LatLng(32.815844003804756, 35.65338134765625),
new google.maps.LatLng(32.847865526878856, 35.653038024902344),
new google.maps.LatLng(32.86199747972006, 35.64857482910156),
new google.maps.LatLng(32.876703855923736, 35.636558532714844),
new google.maps.LatLng(32.88420028540548, 35.62385559082031),
new google.maps.LatLng(32.88650675152939, 35.61767578125),
new google.maps.LatLng(32.89169608080795, 35.620079040527344),
new google.maps.LatLng(32.894578910186176, 35.61286926269531),
new google.maps.LatLng(32.901497317924765, 35.61389923095703),
new google.maps.LatLng(32.90812695155533, 35.62660217285156),
new google.maps.LatLng(32.91446787576817, 35.624542236328125),
new google.maps.LatLng(32.93233530926969, 35.62488555908203),
new google.maps.LatLng(32.927724704087936, 35.60462951660156),
new google.maps.LatLng(32.921961109706956, 35.601539611816406),
new google.maps.LatLng(32.91907917173292, 35.59123992919922),
new google.maps.LatLng(32.917926370265064, 35.565147399902344),
new google.maps.LatLng(32.91273857784389, 35.56205749511719),
new google.maps.LatLng(32.90553280620375, 35.54729461669922),
new google.maps.LatLng(32.90553280620375, 35.540428161621094),
new google.maps.LatLng(32.901497317924765, 35.53871154785156),
new google.maps.LatLng(32.89227265418851, 35.55072784423828),
new google.maps.LatLng(32.89169608080795, 35.541114807128906),
new google.maps.LatLng(32.887948262371275, 35.54008483886719),
new google.maps.LatLng(32.888236561725535, 35.52875518798828),
new google.maps.LatLng(32.89140779271051, 35.52223205566406),
new google.maps.LatLng(32.894578910186176, 35.50712585449219),
new google.maps.LatLng(32.89486718796429, 35.49888610839844),
new google.maps.LatLng(32.89890297835096, 35.49339294433594),
new google.maps.LatLng(32.90207382750951, 35.48377990722656),
new google.maps.LatLng(32.901497317924765, 35.47588348388672),
new google.maps.LatLng(32.89832644812533, 35.465240478515625),
new google.maps.LatLng(32.90265033334125, 35.448760986328125),
new google.maps.LatLng(32.89976776665289, 35.43365478515625),
new google.maps.LatLng(32.894578910186176, 35.430908203125),
new google.maps.LatLng(32.89169608080795, 35.4144287109375),
new google.maps.LatLng(32.88708335868024, 35.408935546875),
new google.maps.LatLng(32.88621844654692, 35.403785705566406),
new google.maps.LatLng(32.88910145416005, 35.39726257324219),
new google.maps.LatLng(32.88881315761995, 35.39039611816406),
new google.maps.LatLng(32.88420028540548, 35.38593292236328),
new google.maps.LatLng(32.88420028540548, 35.37528991699219),
new google.maps.LatLng(32.87468547812003, 35.385589599609375),
new google.maps.LatLng(32.872090353419075, 35.387306213378906),
new google.maps.LatLng(32.86199747972006, 35.37769317626953),
new google.maps.LatLng(32.857094812323695, 35.378379821777344),
new google.maps.LatLng(32.85103820203316, 35.38421630859375),
new google.maps.LatLng(32.848442385344136, 35.3924560546875),
new google.maps.LatLng(32.83286589070039, 35.39588928222656),
new google.maps.LatLng(32.82103746762573, 35.392799377441406),
new google.maps.LatLng(32.80689899338195, 35.408592224121094),
new google.maps.LatLng(32.805167597048346, 35.401039123535156),
    ];
    var KN_Area = new google.maps.Polygon({
        paths: KN_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var HG_Coords = [
        new google.maps.LatLng(32.931470839102126, 35.6231689453125),
new google.maps.LatLng(32.91389144688043, 35.621795654296875),
new google.maps.LatLng(32.908415185236095, 35.624542236328125),
new google.maps.LatLng(32.901497317924765, 35.612525939941406),
new google.maps.LatLng(32.891119503674965, 35.611839294433594),
new google.maps.LatLng(32.88650675152939, 35.61389923095703),
new google.maps.LatLng(32.88362365949454, 35.623512268066406),
new google.maps.LatLng(32.87382044499353, 35.63758850097656),
new google.maps.LatLng(32.86084393529929, 35.64685821533203),
new google.maps.LatLng(32.847865526878856, 35.652008056640625),
new google.maps.LatLng(32.835462162948076, 35.65132141113281),
new google.maps.LatLng(32.815555469135404, 35.65166473388672),
new google.maps.LatLng(32.799107444298684, 35.64720153808594),
new google.maps.LatLng(32.79333548619193, 35.648231506347656),
new google.maps.LatLng(32.787851778963635, 35.658531188964844),
new google.maps.LatLng(32.77976990995682, 35.66814422607422),
new google.maps.LatLng(32.77139862880317, 35.666770935058594),
new google.maps.LatLng(32.76273785414244, 35.664024353027344),
new google.maps.LatLng(32.7537875018279, 35.66539764404297),
new google.maps.LatLng(32.74310364571194, 35.662994384765625),
new google.maps.LatLng(32.732418508353746, 35.65990447998047),
new google.maps.LatLng(32.7231762754146, 35.65681457519531),
new google.maps.LatLng(32.71508853568461, 35.657501220703125),
new google.maps.LatLng(32.703533349557105, 35.652008056640625),
new google.maps.LatLng(32.700066501890824, 35.65166473388672),
new google.maps.LatLng(32.69255453660822, 35.655784606933594),
new google.maps.LatLng(32.683886098844695, 35.65338134765625),
new google.maps.LatLng(32.68446402087723, 35.65990447998047),
new google.maps.LatLng(32.67723972666319, 35.65990447998047),
new google.maps.LatLng(32.685041939169665, 35.6781005859375),
new google.maps.LatLng(32.69110985542416, 35.677757263183594),
new google.maps.LatLng(32.693999194413706, 35.675697326660156),
new google.maps.LatLng(32.704977829668, 35.68016052246094),
new google.maps.LatLng(32.711333264356284, 35.71208953857422),
new google.maps.LatLng(32.73328491856776, 35.754661560058594),
new google.maps.LatLng(32.74714633655501, 35.765647888183594),
new google.maps.LatLng(32.78756315342785, 35.80272674560547),
new google.maps.LatLng(32.84757709624005, 35.85010528564453),
new google.maps.LatLng(32.88881315761995, 35.85662841796875),
new google.maps.LatLng(32.93867449901647, 35.89439392089844),
new google.maps.LatLng(32.947894327523066, 35.898170471191406),
new google.maps.LatLng(32.96085808464397, 35.89061737060547),
new google.maps.LatLng(32.98073215189709, 35.872764587402344),
new google.maps.LatLng(33.00261725269998, 35.86864471435547),
new google.maps.LatLng(33.05040004241502, 35.864524841308594),
new google.maps.LatLng(33.100745405144245, 35.85182189941406),
new google.maps.LatLng(33.10851040943536, 35.84083557128906),
new google.maps.LatLng(33.116849834921005, 35.811309814453125),
new google.maps.LatLng(33.131226295431865, 35.807533264160156),
new google.maps.LatLng(33.1366887332403, 35.826759338378906),
new google.maps.LatLng(33.15623572499535, 35.83946228027344),
new google.maps.LatLng(33.16773192090341, 35.843238830566406),
new google.maps.LatLng(33.1869846718891, 35.837745666503906),
new google.maps.LatLng(33.19589122972613, 35.836029052734375),
new google.maps.LatLng(33.20278600728194, 35.8209228515625),
new google.maps.LatLng(33.20853124049305, 35.81474304199219),
new google.maps.LatLng(33.22375428474926, 35.81439971923828),
new google.maps.LatLng(33.251608467792614, 35.81165313720703),
new google.maps.LatLng(33.26251799637015, 35.79414367675781),
new google.maps.LatLng(33.268833416548325, 35.78075408935547),
new google.maps.LatLng(33.278018667005334, 35.77903747558594),
new google.maps.LatLng(33.31216783738619, 35.81371307373047),
new google.maps.LatLng(33.3184796651575, 35.81268310546875),
new google.maps.LatLng(33.33339671392772, 35.780067443847656),
new google.maps.LatLng(33.33511774753217, 35.76873779296875),
new google.maps.LatLng(33.329380836623415, 35.74676513671875),
new google.maps.LatLng(33.32651223950189, 35.74230194091797),
new google.maps.LatLng(33.32852026740331, 35.73371887207031),
new google.maps.LatLng(33.332823028503604, 35.723419189453125),
new google.maps.LatLng(33.32708596648145, 35.712432861328125),
new google.maps.LatLng(33.32278292205773, 35.70934295654297),
new google.maps.LatLng(33.31130709819114, 35.711402893066406),
new google.maps.LatLng(33.30729020292566, 35.71037292480469),
new google.maps.LatLng(33.30298618122413, 35.70350646972656),
new google.maps.LatLng(33.30126451306708, 35.69664001464844),
new google.maps.LatLng(33.29868194710951, 35.692176818847656),
new google.maps.LatLng(33.29954281092482, 35.68737030029297),
new google.maps.LatLng(33.29294263789357, 35.683250427246094),
new google.maps.LatLng(33.29581233969934, 35.67741394042969),
new google.maps.LatLng(33.293229612321824, 35.67157745361328),
new google.maps.LatLng(33.28863790820217, 35.66814422607422),
new google.maps.LatLng(33.28261092986074, 35.666770935058594),
new google.maps.LatLng(33.27945377510022, 35.66059112548828),
new google.maps.LatLng(33.2757224449812, 35.65956115722656),
new google.maps.LatLng(33.2817498989783, 35.644798278808594),
new google.maps.LatLng(33.28117587367123, 35.64136505126953),
new google.maps.LatLng(33.274000238828876, 35.622825622558594),
new google.maps.LatLng(33.27170391111521, 35.61836242675781),
new google.maps.LatLng(33.26481456563577, 35.62145233154297),
new google.maps.LatLng(33.25907302925473, 35.62042236328125),
new google.maps.LatLng(33.256202119547524, 35.618019104003906),
new google.maps.LatLng(33.25246979589199, 35.61973571777344),
new google.maps.LatLng(33.24959866921125, 35.62248229980469),
new google.maps.LatLng(33.246153192679756, 35.624542236328125),
new google.maps.LatLng(33.24299471987176, 35.62248229980469),
new google.maps.LatLng(33.23552878501954, 35.653038024902344),
new google.maps.LatLng(33.22461588729967, 35.65269470214844),
new google.maps.LatLng(33.21169095802982, 35.655784606933594),
new google.maps.LatLng(33.19847683493303, 35.65544128417969),
new google.maps.LatLng(33.173479453602404, 35.64857482910156),
new google.maps.LatLng(33.12145055836598, 35.65269470214844),
new google.maps.LatLng(33.061334627009195, 35.64136505126953),
new google.maps.LatLng(33.0509755807245, 35.639991760253906),
new google.maps.LatLng(33.01326987686982, 35.628318786621094),
new google.maps.LatLng(32.99225130249218, 35.62591552734375),
new google.maps.LatLng(32.95884162509528, 35.62385559082031),
new google.maps.LatLng(32.94991103685064, 35.625572204589844),
    ];
    var HG_Area = new google.maps.Polygon({
        paths: HG_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var JN_Coords = [
        new google.maps.LatLng(32.22892108389671, 35.424041748046875),
new google.maps.LatLng(32.253168334244684, 35.4334831237793),
new google.maps.LatLng(32.27668343339889, 35.435028076171875),
new google.maps.LatLng(32.29641979896909, 35.42747497558594),
new google.maps.LatLng(32.320213819653574, 35.41511535644531),
new google.maps.LatLng(32.34168110749222, 35.41099548339844),
new google.maps.LatLng(32.358503260304744, 35.41717529296875),
new google.maps.LatLng(32.385180257193184, 35.43022155761719),
new google.maps.LatLng(32.40605241348611, 35.43983459472656),
new google.maps.LatLng(32.41648668224032, 35.419921875),
new google.maps.LatLng(32.43561304116276, 35.41236877441406),
new google.maps.LatLng(32.45879106783458, 35.419921875),
new google.maps.LatLng(32.465743313283596, 35.42060852050781),
new google.maps.LatLng(32.47964619410741, 35.410308837890625),
new google.maps.LatLng(32.502233795716045, 35.40618896484375),
new google.maps.LatLng(32.50686644888966, 35.386962890625),
new google.maps.LatLng(32.5178680435577, 35.369110107421875),
new google.maps.LatLng(32.52018399717684, 35.3485107421875),
new google.maps.LatLng(32.51671004436773, 35.33409118652344),
new google.maps.LatLng(32.510919824624686, 35.30731201171875),
new google.maps.LatLng(32.51265692971026, 35.283966064453125),
new google.maps.LatLng(32.52192092322431, 35.255126953125),
new google.maps.LatLng(32.537551746769, 35.237274169921875),
new google.maps.LatLng(32.554337379308535, 35.22491455078125),
new google.maps.LatLng(32.54623436233052, 35.21186828613281),
new google.maps.LatLng(32.537551746769, 35.19813537597656),
new google.maps.LatLng(32.52423677239668, 35.18714904785156),
new google.maps.LatLng(32.5265525618821, 35.179595947265625),
new google.maps.LatLng(32.5178680435577, 35.17478942871094),
new google.maps.LatLng(32.50281289041497, 35.160369873046875),
new google.maps.LatLng(32.49586350791503, 35.13908386230469),
new google.maps.LatLng(32.47848770270873, 35.116424560546875),
new google.maps.LatLng(32.479066950271914, 35.097198486328125),
new google.maps.LatLng(32.45994981267565, 35.071449279785156),
new google.maps.LatLng(32.45270741287661, 35.07007598876953),
new google.maps.LatLng(32.44314655368639, 35.07659912109375),
new google.maps.LatLng(32.43387444886875, 35.09136199951172),
new google.maps.LatLng(32.42807889910622, 35.092735290527344),
new google.maps.LatLng(32.39706638207117, 35.1123046875),
new google.maps.LatLng(32.374452411547, 35.13530731201172),
new google.maps.LatLng(32.350382611597084, 35.148353576660156),
new google.maps.LatLng(32.33936056505929, 35.16242980957031),
new google.maps.LatLng(32.30831759039775, 35.180625915527344),
new google.maps.LatLng(32.3051256533381, 35.31726837158203),
    ];
    var JN_Area = new google.maps.Polygon({
        paths: JN_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var PT_Coords = [
        new google.maps.LatLng(32.017537149173535, 34.99917984008789),
new google.maps.LatLng(32.005746901214636, 34.967079162597656),
new google.maps.LatLng(31.989150649732125, 34.96330261230469),
new google.maps.LatLng(31.986093117922948, 34.93875503540039),
new google.maps.LatLng(32.020593632526015, 34.86494064331055),
new google.maps.LatLng(32.0464968721355, 34.8651123046875),
new google.maps.LatLng(32.0530442834722, 34.85258102416992),
new google.maps.LatLng(32.050425375149366, 34.84245300292969),
new google.maps.LatLng(32.05435370952644, 34.83369827270508),
new google.maps.LatLng(32.10918727429358, 34.842796325683594),
new google.maps.LatLng(32.112240696452, 34.864253997802734),
new google.maps.LatLng(32.18738082408719, 34.883995056152344),
new google.maps.LatLng(32.18970525564707, 34.872493743896484),
new google.maps.LatLng(32.19885712788491, 34.861507415771484),
new google.maps.LatLng(32.1994381680643, 34.86665725708008),
new google.maps.LatLng(32.20655560911948, 34.871978759765625),
new google.maps.LatLng(32.20742709424606, 34.88382339477539),
new google.maps.LatLng(32.22659765432214, 34.88262176513672),
new google.maps.LatLng(32.23501980392184, 34.88485336303711),
new google.maps.LatLng(32.22877587128842, 34.89927291870117),
new google.maps.LatLng(32.2292115084172, 34.90184783935547),
new google.maps.LatLng(32.23458419463704, 34.9116325378418),
new google.maps.LatLng(32.23516500655268, 34.92982864379883),
new google.maps.LatLng(32.23356776485105, 34.93635177612305),
new google.maps.LatLng(32.22892108389671, 34.939613342285156),
new google.maps.LatLng(32.22616200466447, 34.94527816772461),
new google.maps.LatLng(32.22093404590531, 34.949398040771484),
new google.maps.LatLng(32.21904609801856, 34.95832443237305),
new google.maps.LatLng(32.22078882053671, 34.9669075012207),
new google.maps.LatLng(32.22645243800159, 34.9720573425293),
new google.maps.LatLng(32.230808826690094, 34.97051239013672),
new google.maps.LatLng(32.236907420023044, 34.97102737426758),
new google.maps.LatLng(32.24837747454558, 34.97669219970703),
new google.maps.LatLng(32.2466352810787, 35.00175476074219),
new google.maps.LatLng(32.24721601594782, 35.013084411621094),
new google.maps.LatLng(32.249103378626025, 35.02063751220703),
new google.maps.LatLng(32.256362100282246, 35.024757385253906),
new google.maps.LatLng(32.25810410713092, 35.0273323059082),
new google.maps.LatLng(32.25360385441068, 35.02939224243164),
new google.maps.LatLng(32.24271522358435, 35.01943588256836),
new google.maps.LatLng(32.23443899107804, 35.01995086669922),
new google.maps.LatLng(32.23342255966773, 35.017032623291016),
new google.maps.LatLng(32.235600613052945, 35.01394271850586),
new google.maps.LatLng(32.23211570257628, 35.00999450683594),
new google.maps.LatLng(32.22892108389671, 35.00947952270508),
new google.maps.LatLng(32.21323678170093, 34.99128341674805),
new google.maps.LatLng(32.20858906142631, 34.98991012573242),
new google.maps.LatLng(32.19754977391484, 34.96124267578125),
new google.maps.LatLng(32.187816659526, 34.956607818603516),
new google.maps.LatLng(32.175612478499325, 34.95952606201172),
new google.maps.LatLng(32.173142385696316, 34.96450424194336),
new google.maps.LatLng(32.16805668957401, 34.9639892578125),
new google.maps.LatLng(32.158611072062605, 34.9778938293457),
new google.maps.LatLng(32.15207122481357, 34.97428894042969),
new google.maps.LatLng(32.14887379537526, 34.98098373413086),
new google.maps.LatLng(32.14843777358073, 34.986820220947266),
new google.maps.LatLng(32.14160649321828, 34.990596771240234),
new google.maps.LatLng(32.128087770687586, 34.98544692993164),
new google.maps.LatLng(32.11631176714, 34.98767852783203),
new google.maps.LatLng(32.110205093026245, 34.99523162841797),
new google.maps.LatLng(32.10235305468224, 34.99042510986328),
new google.maps.LatLng(32.08984656280848, 34.982872009277344),
new google.maps.LatLng(32.088101334800335, 34.98664855957031),
new google.maps.LatLng(32.03194539223801, 35.00450134277344),
new google.maps.LatLng(32.01942926993813, 35.00587463378906),
    ];
    var PT_Area = new google.maps.Polygon({
        paths: PT_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var YZ_Coords = [
        new google.maps.LatLng(32.59816779959566, 35.5682373046875),
new google.maps.LatLng(32.60098783538449, 35.56205749511719),
new google.maps.LatLng(32.60192782758844, 35.5543327331543),
new google.maps.LatLng(32.60163860026847, 35.54420471191406),
new google.maps.LatLng(32.612050195473046, 35.52978515625),
new google.maps.LatLng(32.61291777377439, 35.525665283203125),
new google.maps.LatLng(32.613785343670244, 35.5158805847168),
new google.maps.LatLng(32.615665049608346, 35.51279067993164),
new google.maps.LatLng(32.61855682784329, 35.50111770629883),
new google.maps.LatLng(32.621593094464686, 35.49476623535156),
new google.maps.LatLng(32.622749740375305, 35.489959716796875),
new google.maps.LatLng(32.62087018318113, 35.483951568603516),
new google.maps.LatLng(32.62130393065182, 35.47760009765625),
new google.maps.LatLng(32.62737617455987, 35.470733642578125),
new google.maps.LatLng(32.63330344386202, 35.47107696533203),
new google.maps.LatLng(32.640820391386406, 35.467472076416016),
new google.maps.LatLng(32.656719545138934, 35.46283721923828),
new google.maps.LatLng(32.65758669040313, 35.458717346191406),
new google.maps.LatLng(32.65758669040313, 35.453224182128906),
new google.maps.LatLng(32.65426258787858, 35.44395446777344),
new google.maps.LatLng(32.65932095569672, 35.43691635131836),
new google.maps.LatLng(32.66914782344145, 35.429534912109375),
new google.maps.LatLng(32.66828079034104, 35.42387008666992),
new google.maps.LatLng(32.67059285991286, 35.41425704956055),
new google.maps.LatLng(32.67521681957013, 35.407047271728516),
new google.maps.LatLng(32.68157437331439, 35.41717529296875),
new google.maps.LatLng(32.68547537543456, 35.418033599853516),
new google.maps.LatLng(32.694721514549315, 35.417518615722656),
new google.maps.LatLng(32.69631059827375, 35.41374206542969),
new google.maps.LatLng(32.692121134707726, 35.40224075317383),
new google.maps.LatLng(32.69587721460903, 35.39365768432617),
new google.maps.LatLng(32.696599519547924, 35.37580490112305),
new google.maps.LatLng(32.70165549045599, 35.37117004394531),
new google.maps.LatLng(32.709166689755655, 35.37254333496094),
new google.maps.LatLng(32.71321091978183, 35.37649154663086),
new google.maps.LatLng(32.71869922440848, 35.37820816040039),
new google.maps.LatLng(32.72433160692846, 35.37580490112305),
new google.maps.LatLng(32.73155208971808, 35.37031173706055),
new google.maps.LatLng(32.74281487506093, 35.3704833984375),
new google.maps.LatLng(32.753210028851896, 35.37477493286133),
new google.maps.LatLng(32.76259350075932, 35.38421630859375),
new google.maps.LatLng(32.76461442682433, 35.39228439331055),
new google.maps.LatLng(32.77284200932199, 35.407047271728516),
new google.maps.LatLng(32.78337797791542, 35.40773391723633),
new google.maps.LatLng(32.798385970025585, 35.40515899658203),
new google.maps.LatLng(32.80444617195561, 35.4008674621582),
new google.maps.LatLng(32.80834179789677, 35.387821197509766),
new google.maps.LatLng(32.81166015939479, 35.34198760986328),
new google.maps.LatLng(32.79752019316996, 35.319156646728516),
new google.maps.LatLng(32.79550001438897, 35.30473709106445),
new google.maps.LatLng(32.79362409299568, 35.268001556396484),
new google.maps.LatLng(32.79477851084408, 35.24139404296875),
new google.maps.LatLng(32.80603329943089, 35.221824645996094),
new google.maps.LatLng(32.79420130379319, 35.216331481933594),
new google.maps.LatLng(32.78337797791542, 35.21839141845703),
new google.maps.LatLng(32.764325725909366, 35.2140998840332),
new google.maps.LatLng(32.759056769764186, 35.2056884765625),
new google.maps.LatLng(32.75970638394809, 35.194101333618164),
new google.maps.LatLng(32.764325725909366, 35.1767635345459),
new google.maps.LatLng(32.76995522487643, 35.169081687927246),
new google.maps.LatLng(32.76858396946491, 35.16848087310791),
new google.maps.LatLng(32.76371223335658, 35.16105651855469),
new google.maps.LatLng(32.75104447184547, 35.15633583068848),
new google.maps.LatLng(32.74591911051183, 35.1536750793457),
new google.maps.LatLng(32.73819441736631, 35.155391693115234),
new google.maps.LatLng(32.7316242915927, 35.151615142822266),
new google.maps.LatLng(32.72469264495655, 35.14431953430176),
new google.maps.LatLng(32.71913249723242, 35.13547897338867),
new google.maps.LatLng(32.701438811863056, 35.130157470703125),
new google.maps.LatLng(32.70483338270915, 35.118913650512695),
new google.maps.LatLng(32.70808338272434, 35.110158920288086),
new google.maps.LatLng(32.704183368500644, 35.10809898376465),
new google.maps.LatLng(32.69912754080412, 35.1068115234375),
new google.maps.LatLng(32.6914710279119, 35.11136054992676),
new google.maps.LatLng(32.68670343342672, 35.112905502319336),
new google.maps.LatLng(32.679768296108016, 35.12320518493652),
new google.maps.LatLng(32.657153118822464, 35.108699798583984),
new google.maps.LatLng(32.65050475793421, 35.09925842285156),
new google.maps.LatLng(32.64530134805362, 35.08535385131836),
new google.maps.LatLng(32.637061996573436, 35.07556915283203),
new google.maps.LatLng(32.63431537743207, 35.05213737487793),
new google.maps.LatLng(32.63380941207763, 35.05179405212402),
new google.maps.LatLng(32.62513527536472, 35.06037712097168),
new google.maps.LatLng(32.618665267710156, 35.053510665893555),
new google.maps.LatLng(32.61721939201909, 35.05711555480957),
new google.maps.LatLng(32.60120475753773, 35.050764083862305),
new google.maps.LatLng(32.5907195860086, 35.05205154418945),
new google.maps.LatLng(32.58450021500699, 35.05780220031738),
new google.maps.LatLng(32.57950994255046, 35.059776306152344),
new google.maps.LatLng(32.57394075985061, 35.0588321685791),
new google.maps.LatLng(32.569745562680495, 35.05393981933594),
new google.maps.LatLng(32.56555016928474, 35.03445625305176),
new google.maps.LatLng(32.560992881731266, 35.02861976623535),
new google.maps.LatLng(32.557014108101185, 35.030250549316406),
new google.maps.LatLng(32.55368627104408, 35.03634452819824),
new google.maps.LatLng(32.55310750417685, 35.04183769226074),
new google.maps.LatLng(32.5481154850361, 35.05033493041992),
new google.maps.LatLng(32.54883898327313, 35.05411148071289),
new google.maps.LatLng(32.547174928610474, 35.05934715270996),
new google.maps.LatLng(32.54457025938778, 35.061750411987305),
new google.maps.LatLng(32.540228976093275, 35.073509216308594),
new google.maps.LatLng(32.538854192626104, 35.08114814758301),
new google.maps.LatLng(32.53675579833513, 35.08664131164551),
new google.maps.LatLng(32.53270358784857, 35.090932846069336),
new google.maps.LatLng(32.532197048683244, 35.10174751281738),
new google.maps.LatLng(32.530749778185395, 35.10912895202637),
new google.maps.LatLng(32.530749778185395, 35.11556625366211),
new google.maps.LatLng(32.524960463022666, 35.11771202087402),
new google.maps.LatLng(32.52141432326176, 35.120887756347656),
new google.maps.LatLng(32.524888094222355, 35.12826919555664),
new google.maps.LatLng(32.538202972058755, 35.13951301574707),
new google.maps.LatLng(32.545366138556574, 35.1478385925293),
new google.maps.LatLng(32.55303515805604, 35.147666931152344),
new google.maps.LatLng(32.55846095528802, 35.146379470825195),
new google.maps.LatLng(32.561065221437005, 35.15650749206543),
new google.maps.LatLng(32.56858823237687, 35.162858963012695),
new google.maps.LatLng(32.57216867463962, 35.17144203186035),
new google.maps.LatLng(32.573796101145916, 35.18019676208496),
new google.maps.LatLng(32.57216867463962, 35.181870460510254),
new google.maps.LatLng(32.56934773207293, 35.18054008483887),
new google.maps.LatLng(32.562150310024094, 35.189852714538574),
new google.maps.LatLng(32.55603747306264, 35.19144058227539),
new google.maps.LatLng(32.55285429249884, 35.19440174102783),
new google.maps.LatLng(32.549417777664395, 35.19925117492676),
new google.maps.LatLng(32.54735580561151, 35.20062446594238),
new google.maps.LatLng(32.544389376774575, 35.19478797912598),
new google.maps.LatLng(32.538130613926434, 35.19813537597656),
new google.maps.LatLng(32.538130613926434, 35.200066566467285),
new google.maps.LatLng(32.541241960969494, 35.20444393157959),
new google.maps.LatLng(32.542616707880256, 35.209808349609375),
new google.maps.LatLng(32.544063787152474, 35.21161079406738),
new google.maps.LatLng(32.54435320020821, 35.21435737609863),
new google.maps.LatLng(32.545727899482785, 35.215816497802734),
new google.maps.LatLng(32.54768138329493, 35.216073989868164),
new google.maps.LatLng(32.55194995924591, 35.22414207458496),
new google.maps.LatLng(32.535019159084484, 35.2371883392334),
new google.maps.LatLng(32.52322359572793, 35.25195121765137),
new google.maps.LatLng(32.514538755672866, 35.27503967285156),
new google.maps.LatLng(32.51012364024236, 35.29126167297363),
new google.maps.LatLng(32.51005125949434, 35.306968688964844),
new google.maps.LatLng(32.511064584663885, 35.31100273132324),
new google.maps.LatLng(32.51309120073676, 35.32301902770996),
new google.maps.LatLng(32.51605866326671, 35.33400535583496),
new google.maps.LatLng(32.51924314821702, 35.34250259399414),
new google.maps.LatLng(32.51931552156364, 35.34482002258301),
new google.maps.LatLng(32.518012792407376, 35.35031318664551),
new google.maps.LatLng(32.51909840134896, 35.353660583496094),
new google.maps.LatLng(32.51859178547481, 35.35769462585449),
new google.maps.LatLng(32.51576915903987, 35.369367599487305),
new google.maps.LatLng(32.51222265658579, 35.37520408630371),
new google.maps.LatLng(32.50860363229594, 35.38172721862793),
new google.maps.LatLng(32.50527400128179, 35.38447380065918),
new google.maps.LatLng(32.50538257815097, 35.38863658905029),
new google.maps.LatLng(32.5031748227081, 35.39567470550537),
new google.maps.LatLng(32.50241476321004, 35.397348403930664),
new google.maps.LatLng(32.501871859635514, 35.40236949920654),
new google.maps.LatLng(32.501437534416105, 35.4028844833374),
new google.maps.LatLng(32.49904870821525, 35.404300689697266),
new google.maps.LatLng(32.49716655803491, 35.40451526641846),
new google.maps.LatLng(32.49485001143792, 35.404043197631836),
new google.maps.LatLng(32.49466902872255, 35.40447235107422),
new google.maps.LatLng(32.49369171576737, 35.404086112976074),
new google.maps.LatLng(32.476894752689354, 35.408935546875),
new google.maps.LatLng(32.469798541961715, 35.41494369506836),
new google.maps.LatLng(32.46342595776104, 35.41717529296875),
new google.maps.LatLng(32.462267257639176, 35.41923522949219),
new google.maps.LatLng(32.45937044211836, 35.420265197753906),
new google.maps.LatLng(32.45676322849572, 35.41717529296875),
new google.maps.LatLng(32.435757922340635, 35.411338806152344),
new google.maps.LatLng(32.41677650581706, 35.419578552246094),
new google.maps.LatLng(32.40634227057499, 35.43571472167969),
new google.maps.LatLng(32.40518283663468, 35.44258117675781),
new google.maps.LatLng(32.410400172081545, 35.44395446777344),
new google.maps.LatLng(32.413008726705044, 35.45459747314453),
new google.maps.LatLng(32.410979857403035, 35.47863006591797),
new google.maps.LatLng(32.4048929758226, 35.488243103027344),
new google.maps.LatLng(32.40257405581776, 35.490989685058594),
new google.maps.LatLng(32.39445736671402, 35.525665283203125),
new google.maps.LatLng(32.39242808043168, 35.534934997558594),
new google.maps.LatLng(32.387209706323894, 35.53974151611328),
new google.maps.LatLng(32.388659284930256, 35.554161071777344),
new google.maps.LatLng(32.3964866073953, 35.547637939453125),
new google.maps.LatLng(32.400834826722196, 35.54695129394531),
new google.maps.LatLng(32.40286392407606, 35.551414489746094),
new google.maps.LatLng(32.400544951948675, 35.55622100830078),
new google.maps.LatLng(32.400544951948675, 35.55999755859375),
new google.maps.LatLng(32.414168060111855, 35.563087463378906),
new google.maps.LatLng(32.42199317099747, 35.55519104003906),
new google.maps.LatLng(32.424311592027344, 35.56480407714844),
new google.maps.LatLng(32.43010738389209, 35.55828094482422),
new google.maps.LatLng(32.43648232473781, 35.56926727294922),
new google.maps.LatLng(32.45183828577544, 35.5682373046875),
new google.maps.LatLng(32.458501379295285, 35.57544708251953),
new google.maps.LatLng(32.464005302231875, 35.5682373046875),
new google.maps.LatLng(32.46342595776104, 35.56480407714844),
new google.maps.LatLng(32.46950888882687, 35.568580627441406),
new google.maps.LatLng(32.48138390324739, 35.57167053222656),
new google.maps.LatLng(32.48659682936049, 35.584373474121094),
new google.maps.LatLng(32.4999173796297, 35.57716369628906),
new google.maps.LatLng(32.50310243636601, 35.565147399902344),
new google.maps.LatLng(32.51063030384697, 35.56720733642578),
new google.maps.LatLng(32.517289045827724, 35.562744140625),
new google.maps.LatLng(32.51236741452707, 35.55999755859375),
new google.maps.LatLng(32.51873653315885, 35.55828094482422),
new google.maps.LatLng(32.52076297625624, 35.568580627441406),
new google.maps.LatLng(32.52799989999971, 35.56995391845703),
new google.maps.LatLng(32.532341774450515, 35.56377410888672),
new google.maps.LatLng(32.538130613926434, 35.565834045410156),
new google.maps.LatLng(32.53784118081413, 35.57270050048828),
new google.maps.LatLng(32.54768138329493, 35.57476043701172),
new google.maps.LatLng(32.552601080106484, 35.58128356933594),
new google.maps.LatLng(32.56359707439351, 35.57373046875),
new google.maps.LatLng(32.56533316084101, 35.5792236328125),
new google.maps.LatLng(32.59686621467839, 35.580596923828125),
new google.maps.LatLng(32.59918013034806, 35.57647705078125),
    ];
    var YZ_Area = new google.maps.Polygon({
        paths: YZ_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var HS_Coords = [
        new google.maps.LatLng(32.378076826192306, 35.04158020019531),
new google.maps.LatLng(32.376192148718644, 35.048789978027344),
new google.maps.LatLng(32.36792809887494, 35.05136489868164),
new google.maps.LatLng(32.36473826350448, 35.05119323730469),
new google.maps.LatLng(32.36024330444844, 35.04844665527344),
new google.maps.LatLng(32.356038140451744, 35.041236877441406),
new google.maps.LatLng(32.34719215726623, 35.041751861572266),
new google.maps.LatLng(32.34545186202365, 35.037803649902344),
new google.maps.LatLng(32.3470471339413, 35.028018951416016),
new google.maps.LatLng(32.33907049307107, 35.0269889831543),
new google.maps.LatLng(32.341391042942455, 35.02046585083008),
new google.maps.LatLng(32.33907049307107, 35.0160026550293),
new google.maps.LatLng(32.31208973467698, 35.015316009521484),
new google.maps.LatLng(32.3055609241037, 35.011539459228516),
new google.maps.LatLng(32.293372552377825, 35.01274108886719),
new google.maps.LatLng(32.280892283431456, 35.00896453857422),
new google.maps.LatLng(32.27929584606353, 35.014286041259766),
new google.maps.LatLng(32.280602024181825, 35.0160026550293),
new google.maps.LatLng(32.27798964913578, 35.0214958190918),
new google.maps.LatLng(32.27102294786611, 35.02767562866211),
new google.maps.LatLng(32.263184769505486, 35.03059387207031),
new google.maps.LatLng(32.25912026235577, 35.028018951416016),
new google.maps.LatLng(32.25505557320963, 35.02389907836914),
new google.maps.LatLng(32.24895819827413, 35.02098083496094),
new google.maps.LatLng(32.246780465144106, 35.01239776611328),
new google.maps.LatLng(32.246490096781194, 35.00072479248047),
new google.maps.LatLng(32.247941929312105, 34.976863861083984),
new google.maps.LatLng(32.24329598351848, 34.974117279052734),
new google.maps.LatLng(32.23632661924573, 34.971370697021484),
new google.maps.LatLng(32.23095403605002, 34.970855712890625),
new google.maps.LatLng(32.22674287041067, 34.97222900390625),
new google.maps.LatLng(32.22354806286899, 34.97051239013672),
new google.maps.LatLng(32.22035314303901, 34.967079162597656),
new google.maps.LatLng(32.218465183089, 34.95866775512695),
new google.maps.LatLng(32.22093404590531, 34.94922637939453),
new google.maps.LatLng(32.22572635291873, 34.94476318359375),
new google.maps.LatLng(32.22863065844813, 34.939613342285156),
new google.maps.LatLng(32.23095403605002, 34.937896728515625),
new google.maps.LatLng(32.23342255966773, 34.935665130615234),
new google.maps.LatLng(32.23472939796403, 34.93034362792969),
new google.maps.LatLng(32.23487460105895, 34.918155670166016),
new google.maps.LatLng(32.23443899107804, 34.9116325378418),
new google.maps.LatLng(32.233132148605, 34.910430908203125),
new google.maps.LatLng(32.23051840727417, 34.905967712402344),
new google.maps.LatLng(32.22892108389671, 34.90236282348633),
new google.maps.LatLng(32.22863065844813, 34.899444580078125),
new google.maps.LatLng(32.23443899107804, 34.885196685791016),
new google.maps.LatLng(32.22630722144903, 34.88279342651367),
new google.maps.LatLng(32.21991746345339, 34.883480072021484),
new google.maps.LatLng(32.21163915464707, 34.88365173339844),
new google.maps.LatLng(32.20735447080443, 34.8841667175293),
new google.maps.LatLng(32.20582936513577, 34.871463775634766),
new google.maps.LatLng(32.19951079782584, 34.8665714263916),
new google.maps.LatLng(32.19878449760158, 34.86167907714844),
new google.maps.LatLng(32.206918728936934, 34.853525161743164),
new google.maps.LatLng(32.208298571022866, 34.84511375427246),
new google.maps.LatLng(32.20641036078661, 34.834556579589844),
new google.maps.LatLng(32.2091700394498, 34.81112480163574),
new google.maps.LatLng(32.288293580436644, 34.83489990234375),
new google.maps.LatLng(32.39213817866891, 34.86408233642578),
new google.maps.LatLng(32.402284186628684, 34.86408233642578),
new google.maps.LatLng(32.41126969866743, 34.86614227294922),
new google.maps.LatLng(32.413008726705044, 34.870262145996094),
new google.maps.LatLng(32.410110328024494, 34.88090515136719),
new google.maps.LatLng(32.407211836256685, 34.88433837890625),
new google.maps.LatLng(32.4048929758226, 34.90837097167969),
new google.maps.LatLng(32.410690015207734, 34.918670654296875),
new google.maps.LatLng(32.412429054416144, 34.925880432128906),
new google.maps.LatLng(32.410400172081545, 34.93206024169922),
new google.maps.LatLng(32.404023387801594, 34.934120178222656),
new google.maps.LatLng(32.394167471465536, 34.958152770996094),
new google.maps.LatLng(32.38691978781105, 34.99042510986328),
new google.maps.LatLng(32.38199103072684, 34.999351501464844),
new google.maps.LatLng(32.38112122215103, 35.004844665527344),
new google.maps.LatLng(32.377351954892745, 35.01239776611328),
new google.maps.LatLng(32.37561224004946, 35.02269744873047),
    ];
    var HS_Area = new google.maps.Polygon({
        paths: HS_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var TA_Coords = [
        new google.maps.LatLng(32.19856660640375, 34.861507415771484),
new google.maps.LatLng(32.18999580541844, 34.87266540527344),
new google.maps.LatLng(32.187671381278264, 34.88433837890625),
new google.maps.LatLng(32.112240696452, 34.86442565917969),
new google.maps.LatLng(32.108751062791974, 34.8431396484375),
new google.maps.LatLng(32.05420821866798, 34.834041595458984),
new google.maps.LatLng(32.050570872022476, 34.84193801879883),
new google.maps.LatLng(32.05318977618135, 34.85240936279297),
new google.maps.LatLng(32.04693338079779, 34.8651123046875),
new google.maps.LatLng(32.032673021160385, 34.865970611572266),
new google.maps.LatLng(32.020593632526015, 34.86528396606445),
new google.maps.LatLng(32.01710050037138, 34.84880447387695),
new google.maps.LatLng(32.021757980316536, 34.846229553222656),
new google.maps.LatLng(32.02146689475617, 34.838504791259766),
new google.maps.LatLng(32.028452692935645, 34.82837677001953),
new google.maps.LatLng(31.977211138105698, 34.792327880859375),
new google.maps.LatLng(31.997594731962774, 34.72984313964844),
new google.maps.LatLng(32.02001145308173, 34.738426208496094),
new google.maps.LatLng(32.02248569017118, 34.73705291748047),
new google.maps.LatLng(32.0383483283312, 34.74357604980469),
new google.maps.LatLng(32.04664237525425, 34.74409103393555),
new google.maps.LatLng(32.05784542072537, 34.74958419799805),
new google.maps.LatLng(32.05813639064348, 34.75627899169922),
new google.maps.LatLng(32.083592674837845, 34.766578674316406),
new google.maps.LatLng(32.08693783094361, 34.76554870605469),
new google.maps.LatLng(32.10220764019743, 34.7743034362793),
new google.maps.LatLng(32.109041870691286, 34.772586822509766),
new google.maps.LatLng(32.109914288831845, 34.7772216796875),
new google.maps.LatLng(32.11921956361475, 34.780311584472656),
new google.maps.LatLng(32.122418032739795, 34.77928161621094),
new google.maps.LatLng(32.12474412169509, 34.78202819824219),
new google.maps.LatLng(32.15584986046307, 34.79301452636719),
new google.maps.LatLng(32.15991898519912, 34.78889465332031),
new google.maps.LatLng(32.1674754490803, 34.792327880859375),
new google.maps.LatLng(32.17096283641326, 34.79747772216797),
new google.maps.LatLng(32.2098962567604, 34.811553955078125),
new google.maps.LatLng(32.20641036078661, 34.83386993408203),
new google.maps.LatLng(32.20844381634056, 34.845542907714844),
new google.maps.LatLng(32.20757234095538, 34.85343933105469),
    ];
    var TA_Area = new google.maps.Polygon({
        paths: TA_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var TK_Coords = [
        new google.maps.LatLng(32.30991351676043, 35.17976760864258),
new google.maps.LatLng(32.30657654775904, 35.17770767211914),
new google.maps.LatLng(32.30222379480205, 35.17599105834961),
new google.maps.LatLng(32.2999022410693, 35.17890930175781),
new google.maps.LatLng(32.29409809657151, 35.180110931396484),
new google.maps.LatLng(32.28698751309372, 35.17873764038086),
new google.maps.LatLng(32.281472799144076, 35.1756477355957),
new google.maps.LatLng(32.27639316068085, 35.17341613769531),
new google.maps.LatLng(32.25563625422983, 35.16397476196289),
new google.maps.LatLng(32.24823229303319, 35.16294479370117),
new google.maps.LatLng(32.24024695243935, 35.1643180847168),
new google.maps.LatLng(32.23197049507261, 35.16620635986328),
new google.maps.LatLng(32.22398372505503, 35.169124603271484),
new google.maps.LatLng(32.21236535224182, 35.17375946044922),
new google.maps.LatLng(32.204376859773525, 35.1753044128418),
new google.maps.LatLng(32.16631295696736, 35.187835693359375),
new google.maps.LatLng(32.15526854209781, 35.19641876220703),
new google.maps.LatLng(32.14335069856222, 35.2056884765625),
new google.maps.LatLng(32.13084982308751, 35.21736145019531),
new google.maps.LatLng(32.118638011730695, 35.224571228027344),
new google.maps.LatLng(32.10409801044057, 35.231781005859375),
new google.maps.LatLng(32.091882620021785, 35.232810974121094),
new google.maps.LatLng(32.07530197765318, 35.22972106933594),
new google.maps.LatLng(32.06511939104014, 35.2166748046875),
new google.maps.LatLng(32.058718327703446, 35.203285217285156),
new google.maps.LatLng(32.053771744704605, 35.18543243408203),
new google.maps.LatLng(32.049988883142014, 34.9969482421875),
new google.maps.LatLng(32.08722870829662, 34.98664855957031),
new google.maps.LatLng(32.08984656280848, 34.98218536376953),
new google.maps.LatLng(32.11049589629439, 34.993858337402344),
new google.maps.LatLng(32.116602550956046, 34.98699188232422),
new google.maps.LatLng(32.13084982308751, 34.98424530029297),
new google.maps.LatLng(32.14160649321828, 34.99042510986328),
new google.maps.LatLng(32.14800174970085, 34.98664855957031),
new google.maps.LatLng(32.14887379537526, 34.97943878173828),
new google.maps.LatLng(32.15294323155951, 34.97394561767578),
new google.maps.LatLng(32.15933769278929, 34.976348876953125),
new google.maps.LatLng(32.1674754490803, 34.963645935058594),
new google.maps.LatLng(32.1718346623851, 34.96330261230469),
new google.maps.LatLng(32.17357828929423, 34.96278762817383),
new google.maps.LatLng(32.175467180777176, 34.95918273925781),
new google.maps.LatLng(32.187671381278264, 34.956607818603516),
new google.maps.LatLng(32.197695036394656, 34.9610710144043),
new google.maps.LatLng(32.20858906142631, 34.990081787109375),
new google.maps.LatLng(32.213382019132254, 34.99094009399414),
new google.maps.LatLng(32.22863065844813, 35.00913619995117),
new google.maps.LatLng(32.232406116887525, 35.009307861328125),
new google.maps.LatLng(32.23574581475559, 35.01411437988281),
new google.maps.LatLng(32.23385817452153, 35.017032623291016),
new google.maps.LatLng(32.23487460105895, 35.01943588256836),
new google.maps.LatLng(32.24329598351848, 35.01909255981445),
new google.maps.LatLng(32.25360385441068, 35.029048919677734),
new google.maps.LatLng(32.25853960362009, 35.0269889831543),
new google.maps.LatLng(32.263620241619456, 35.03042221069336),
new google.maps.LatLng(32.271458382368515, 35.027503967285156),
new google.maps.LatLng(32.278715316417774, 35.02063751220703),
new google.maps.LatLng(32.2801666335657, 35.01565933227539),
new google.maps.LatLng(32.27857018342579, 35.01325607299805),
new google.maps.LatLng(32.281182541752244, 35.00810623168945),
new google.maps.LatLng(32.293662770752114, 35.01239776611328),
new google.maps.LatLng(32.30628637073342, 35.011024475097656),
new google.maps.LatLng(32.3122348140127, 35.014801025390625),
new google.maps.LatLng(32.339795671298255, 35.01565933227539),
new google.maps.LatLng(32.34168110749222, 35.02098083496094),
new google.maps.LatLng(32.33965063611772, 35.0269889831543),
new google.maps.LatLng(32.34748220321868, 35.02767562866211),
new google.maps.LatLng(32.34588693897268, 35.037288665771484),
new google.maps.LatLng(32.34748220321868, 35.04140853881836),
new google.maps.LatLng(32.35647316648509, 35.040550231933594),
new google.maps.LatLng(32.35995329941639, 35.047760009765625),
new google.maps.LatLng(32.365608229767886, 35.05136489868164),
new google.maps.LatLng(32.375902194849225, 35.04861831665039),
new google.maps.LatLng(32.377931852397595, 35.04140853881836),
new google.maps.LatLng(32.379961464357315, 35.03986358642578),
new google.maps.LatLng(32.3992405039502, 35.051536560058594),
new google.maps.LatLng(32.40880601824827, 35.0547981262207),
new google.maps.LatLng(32.41721123943659, 35.05342483520508),
new google.maps.LatLng(32.420109410034684, 35.057029724121094),
new google.maps.LatLng(32.42416669245876, 35.05531311035156),
new google.maps.LatLng(32.42793400558988, 35.05840301513672),
new google.maps.LatLng(32.44024912337551, 35.06303787231445),
new google.maps.LatLng(32.44401576461801, 35.0654411315918),
new google.maps.LatLng(32.451114006786995, 35.06561279296875),
new google.maps.LatLng(32.45314197328334, 35.070247650146484),
new google.maps.LatLng(32.44314655368639, 35.07728576660156),
new google.maps.LatLng(32.43401933284037, 35.09204864501953),
new google.maps.LatLng(32.42764421785883, 35.09359359741211),
new google.maps.LatLng(32.39721132515847, 35.113162994384766),
new google.maps.LatLng(32.37503232765891, 35.13530731201172),
new google.maps.LatLng(32.35081766483307, 35.14904022216797),
new google.maps.LatLng(32.34066587750003, 35.16191482543945),
    ];
    var TK_Area = new google.maps.Polygon({
        paths: TK_Coords
    });
    //---------------------------------------------------------------------------------------------------------//

    var RH_Coords = [
    new google.maps.LatLng(32.00924046613807, 34.81550216674805),
    new google.maps.LatLng(31.957551241076636, 34.853224754333496),
    new google.maps.LatLng(31.950851351639255, 34.848246574401855),
    new google.maps.LatLng(31.915158927025217, 34.800310134887695),
    new google.maps.LatLng(31.901315279500793, 34.8445987701416),
    new google.maps.LatLng(31.873184404478362, 34.82245445251465),
    new google.maps.LatLng(31.850440216816747, 34.8610782623291),
    new google.maps.LatLng(31.84941951275602, 34.84871864318848),
    new google.maps.LatLng(31.834836792922044, 34.8526668548584),
    new google.maps.LatLng(31.823023100337416, 34.84820365905762),
    new google.maps.LatLng(31.820543491418945, 34.86777305603027),
    new google.maps.LatLng(31.809165608610932, 34.87103462219238),
    new google.maps.LatLng(31.810186757909364, 34.85867500305176),
    new google.maps.LatLng(31.80756092262095, 34.848031997680664),
    new google.maps.LatLng(31.803330253219116, 34.84013557434082),
    new google.maps.LatLng(31.793555207271424, 34.82966423034668),
    new google.maps.LatLng(31.789323896632943, 34.82125282287598),
    new google.maps.LatLng(31.78334136836679, 34.81593132019043),
    new google.maps.LatLng(31.775461350260947, 34.809579849243164),
    new google.maps.LatLng(31.764004941401378, 34.794859886169434),
    new google.maps.LatLng(31.761669703141145, 34.7916841506958),
    new google.maps.LatLng(31.75488258247236, 34.800095558166504),
    new google.maps.LatLng(31.748021976303317, 34.79340076446533),
    new google.maps.LatLng(31.758020775392023, 34.78241443634033),
    new google.maps.LatLng(31.77524245128506, 34.77769374847412),
    new google.maps.LatLng(31.78735408251097, 34.77554798126221),
    new google.maps.LatLng(31.793919966361674, 34.769368171691895),
    new google.maps.LatLng(31.80033949073343, 34.76241588592529),
    new google.maps.LatLng(31.80785268578335, 34.75632190704346),
    new google.maps.LatLng(31.812739581768103, 34.741387367248535),
    new google.maps.LatLng(31.809676184671194, 34.726881980895996),
    new google.maps.LatLng(31.787937735515168, 34.7312593460083),
    new google.maps.LatLng(31.776701768005832, 34.75194454193115),
    new google.maps.LatLng(31.762983281913396, 34.74576473236084),
    new google.maps.LatLng(31.76976980853248, 34.735379219055176),
    new google.maps.LatLng(31.768967127038472, 34.72250461578369),
    new google.maps.LatLng(31.768967127038472, 34.709715843200684),
    new google.maps.LatLng(31.772688591623375, 34.698214530944824),
    new google.maps.LatLng(31.776920663528124, 34.69057559967041),
    new google.maps.LatLng(31.780787732333163, 34.688429832458496),
    new google.maps.LatLng(31.78144438833414, 34.68551158905029),
    new google.maps.LatLng(31.780641808144185, 34.68079090118408),
    new google.maps.LatLng(31.781006618184914, 34.67426776885986),
    new google.maps.LatLng(31.783779127463312, 34.67255115509033),
    new google.maps.LatLng(31.794430626669744, 34.68302249908447),
    new google.maps.LatLng(31.80289258670676, 34.68838691711426),
    new google.maps.LatLng(31.807998567019013, 34.68890190124512),
    new google.maps.LatLng(31.81295839195873, 34.68066215515137),
    new google.maps.LatLng(31.82156451492074, 34.67362403869629),
    new google.maps.LatLng(31.829732296454807, 34.67362403869629),
    new google.maps.LatLng(31.835857658336558, 34.682722091674805),
    new google.maps.LatLng(31.83614933209499, 34.693193435668945),
    new google.maps.LatLng(31.834690954083786, 34.70778465270996),
    new google.maps.LatLng(31.830169835785558, 34.71379280090332),
    new google.maps.LatLng(31.83089906339438, 34.71945762634277),
    new google.maps.LatLng(31.834982631529826, 34.72306251525879),
    new google.maps.LatLng(31.84037849798919, 34.722890853881836),
    new google.maps.LatLng(31.85598098460412, 34.72254753112793),
    new google.maps.LatLng(31.85991764361354, 34.71928596496582),
    new google.maps.LatLng(31.866332579615154, 34.718942642211914),
    new google.maps.LatLng(31.872455511154488, 34.72134590148926),
    new google.maps.LatLng(31.877849185217027, 34.72460746765137),
    new google.maps.LatLng(31.88120185049087, 34.72958564758301),
    new google.maps.LatLng(31.884845913480035, 34.729413986206055),
    new google.maps.LatLng(31.88382559037508, 34.71980094909668),
    new google.maps.LatLng(31.884408633533365, 34.71053123474121),
    new google.maps.LatLng(31.88659501250599, 34.69988822937012),
    new google.maps.LatLng(31.88921859876096, 34.68924522399902),
    new google.maps.LatLng(31.891987858720142, 34.67860221862793),
    new google.maps.LatLng(31.915450349851064, 34.687442779541016),
    new google.maps.LatLng(31.93322539632358, 34.698429107666016),
    new google.maps.LatLng(31.936721722335196, 34.70254898071289),
    new google.maps.LatLng(31.95536654821663, 34.71250534057617),
    new google.maps.LatLng(31.99788589334565, 34.72932815551758),
    new google.maps.LatLng(31.99846821333791, 34.73276138305664),
    new google.maps.LatLng(31.977211138105698, 34.79318618774414),
    new google.maps.LatLng(31.978594453778623, 34.793057441711426),
    new google.maps.LatLng(31.987476299697423, 34.79923725128174),
    new google.maps.LatLng(32.01258834091205, 34.816575050354004),
    ];
    var RH_Area = new google.maps.Polygon({
        paths: RH_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var RA_Coords = [

        new google.maps.LatLng(31.802746697408622, 35.25332450866699),
new google.maps.LatLng(31.806539744296064, 35.328168869018555),
new google.maps.LatLng(31.810186757909364, 35.33949851989746),
new google.maps.LatLng(31.814708854822385, 35.347394943237305),
new google.maps.LatLng(31.817480353171682, 35.35820960998535),
new google.maps.LatLng(31.8150005954075, 35.36593437194824),
new google.maps.LatLng(31.81820968101838, 35.377092361450195),
new google.maps.LatLng(31.822002092965203, 35.376577377319336),
new google.maps.LatLng(31.874059068856333, 35.400352478027344),
new google.maps.LatLng(31.916033192733178, 35.408592224121094),
new google.maps.LatLng(31.921278612494262, 35.40945053100586),
new google.maps.LatLng(31.922735620452148, 35.4005241394043),
new google.maps.LatLng(31.919821581454634, 35.391597747802734),
new google.maps.LatLng(31.91195321501266, 35.372371673583984),
new google.maps.LatLng(31.914284653008707, 35.355892181396484),
new google.maps.LatLng(31.92040439664025, 35.34318923950195),
new google.maps.LatLng(31.92856342145468, 35.33597946166992),
new google.maps.LatLng(31.946627257153615, 35.344905853271484),
new google.maps.LatLng(31.97051268309372, 35.34696578979492),
new google.maps.LatLng(32.00370892685605, 35.36378860473633),
new google.maps.LatLng(32.0232133942454, 35.38267135620117),
new google.maps.LatLng(32.03543795833829, 35.39194107055664),
new google.maps.LatLng(32.04358676118635, 35.39400100708008),
new google.maps.LatLng(32.03893039122854, 35.38198471069336),
new google.maps.LatLng(32.04038553228215, 35.34524917602539),
new google.maps.LatLng(32.04504182822618, 35.32087326049805),
new google.maps.LatLng(32.04620586520412, 35.30027389526367),
new google.maps.LatLng(32.0464968721355, 35.28413772583008),
new google.maps.LatLng(32.04416879077791, 35.27212142944336),
new google.maps.LatLng(32.048242894293644, 35.24362564086914),
new google.maps.LatLng(32.05260780395669, 35.20586013793945),
new google.maps.LatLng(32.053771744704605, 35.18766403198242),
new google.maps.LatLng(32.05435370952644, 35.173587799072266),
new google.maps.LatLng(32.0528987905317, 35.127925872802734),
new google.maps.LatLng(32.05260780395669, 35.077457427978516),
new google.maps.LatLng(32.050570872022476, 34.99849319458008),
new google.maps.LatLng(32.043004727893994, 35.000553131103516),
new google.maps.LatLng(32.02030254326629, 35.0053596496582),
new google.maps.LatLng(32.017973795894896, 34.998836517333984),
new google.maps.LatLng(32.005455764794334, 34.99814987182617),
new google.maps.LatLng(31.992644847013356, 34.99917984008789),
new google.maps.LatLng(31.976337454305813, 34.9943733215332),
new google.maps.LatLng(31.972260153269048, 34.99197006225586),
new google.maps.LatLng(31.971095176848408, 34.98613357543945),
new google.maps.LatLng(31.96701764294695, 34.98613357543945),
new google.maps.LatLng(31.955075251909054, 34.993343353271484),
new google.maps.LatLng(31.949540446547825, 35.00123977661133),
new google.maps.LatLng(31.946627257153615, 35.00638961791992),
new google.maps.LatLng(31.943422642136195, 35.006046295166016),
new google.maps.LatLng(31.93963522575865, 35.000553131103516),
new google.maps.LatLng(31.93322539632358, 35.00089645385742),
new google.maps.LatLng(31.930020313995197, 35.0053596496582),
new google.maps.LatLng(31.925066785173286, 35.01943588256836),
new google.maps.LatLng(31.925358176608505, 35.02836227416992),
new google.maps.LatLng(31.920112989509068, 35.03557205200195),
new google.maps.LatLng(31.909038834436902, 35.03934860229492),
new google.maps.LatLng(31.895048522832873, 35.04037857055664),
new google.maps.LatLng(31.88630349830843, 35.04037857055664),
new google.maps.LatLng(31.85598098460412, 35.0324821472168),
new google.maps.LatLng(31.85598098460412, 35.00810623168945),
new google.maps.LatLng(31.85423130442635, 34.99814987182617),
new google.maps.LatLng(31.85131509702077, 34.9940299987793),
new google.maps.LatLng(31.84489911613476, 34.98922348022461),
new google.maps.LatLng(31.837607687058213, 34.979610443115234),
new google.maps.LatLng(31.8311907528247, 34.968624114990234),
new google.maps.LatLng(31.825940202041995, 34.95798110961914),
new google.maps.LatLng(31.827398718328755, 34.94596481323242),
new google.maps.LatLng(31.827398718328755, 34.93669509887695),
new google.maps.LatLng(31.822147951852507, 34.92502212524414),
new google.maps.LatLng(31.81864727496152, 34.916439056396484),
new google.maps.LatLng(31.81310426513118, 34.912662506103516),
new google.maps.LatLng(31.808436209343757, 34.91334915161133),
new google.maps.LatLng(31.806977393531774, 34.91849899291992),
new google.maps.LatLng(31.806977393531774, 34.92570877075195),
new google.maps.LatLng(31.809895002118832, 34.93703842163086),
new google.maps.LatLng(31.813396010784928, 34.949398040771484),
new google.maps.LatLng(31.81485472523014, 34.96072769165039),
new google.maps.LatLng(31.81514646535446, 34.97617721557617),
new google.maps.LatLng(31.8163134166359, 34.990596771240234),
new google.maps.LatLng(31.8183555458965, 35.008792877197266),
new google.maps.LatLng(31.817480353171682, 35.01943588256836),
new google.maps.LatLng(31.817480353171682, 35.02973556518555),
new google.maps.LatLng(31.820981074302225, 35.040035247802734),
new google.maps.LatLng(31.827982118391024, 35.047245025634766),
new google.maps.LatLng(31.834690954083786, 35.05170822143555),
new google.maps.LatLng(31.844315823015002, 35.05582809448242),
new google.maps.LatLng(31.84839879739921, 35.05960464477539),
new google.maps.LatLng(31.84781552640937, 35.06406784057617),
new google.maps.LatLng(31.838482688972906, 35.08054733276367),
new google.maps.LatLng(31.83264918614865, 35.08981704711914),
new google.maps.LatLng(31.828565514766165, 35.09359359741211),
new google.maps.LatLng(31.824481662711353, 35.10526657104492),
new google.maps.LatLng(31.823314814655653, 35.1152229309082),
new google.maps.LatLng(31.82389824052695, 35.12277603149414),
new google.maps.LatLng(31.820397629997018, 35.12758255004883),
new google.maps.LatLng(31.8163134166359, 35.132389068603516),
new google.maps.LatLng(31.81397949932771, 35.138912200927734),
new google.maps.LatLng(31.81281251855591, 35.144405364990234),
new google.maps.LatLng(31.81193727330082, 35.15024185180664),
new google.maps.LatLng(31.809603245406805, 35.15642166137695),
new google.maps.LatLng(31.808727969741742, 35.166378021240234),
new google.maps.LatLng(31.80931148777328, 35.17324447631836),
new google.maps.LatLng(31.814271242216744, 35.177364349365234),
new google.maps.LatLng(31.819814182005135, 35.180110931396484),
new google.maps.LatLng(31.824773372420967, 35.18217086791992),
new google.maps.LatLng(31.826231907142883, 35.18766403198242),
new google.maps.LatLng(31.826231907142883, 35.193843841552734),
new google.maps.LatLng(31.823606528052164, 35.19693374633789),
new google.maps.LatLng(31.823314814655653, 35.20071029663086),
new google.maps.LatLng(31.826231907142883, 35.20345687866211),
new google.maps.LatLng(31.830315681768234, 35.20448684692383),
new google.maps.LatLng(31.83994100705821, 35.20551681518555),
new google.maps.LatLng(31.84635733279808, 35.20551681518555),
new google.maps.LatLng(31.851606721911097, 35.206546783447266),
new google.maps.LatLng(31.85598098460412, 35.20963668823242),
new google.maps.LatLng(31.856855812242912, 35.2137565612793),
new google.maps.LatLng(31.852773212250856, 35.223026275634766),
new google.maps.LatLng(31.847523889531306, 35.22714614868164),
new google.maps.LatLng(31.841690958335214, 35.229549407958984),
new google.maps.LatLng(31.83731601790945, 35.229549407958984),
new google.maps.LatLng(31.83644100493149, 35.23469924926758),
new google.maps.LatLng(31.838191022589953, 35.23916244506836),
new google.maps.LatLng(31.837899355285046, 35.244998931884766),
new google.maps.LatLng(31.835565983656227, 35.248775482177734),
new google.maps.LatLng(31.830023989572435, 35.25083541870117),
new google.maps.LatLng(31.82273138509748, 35.2522087097168),

    ];
    var RA_Area = new google.maps.Polygon({
        paths: RA_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var RM_Coords = [

        new google.maps.LatLng(32.017537149173535, 34.99926567077637),
new google.maps.LatLng(32.01360723504821, 34.998579025268555),
new google.maps.LatLng(32.00705700366404, 34.999094009399414),
new google.maps.LatLng(31.995410992124047, 34.99926567077637),
new google.maps.LatLng(31.988422675211265, 34.99789237976074),
new google.maps.LatLng(31.975463762188678, 34.994802474975586),
new google.maps.LatLng(31.972260153269048, 34.993085861206055),
new google.maps.LatLng(31.970658306878924, 34.9874210357666),
new google.maps.LatLng(31.96949331012912, 34.98673439025879),
new google.maps.LatLng(31.96090100253141, 34.9899959564209),
new google.maps.LatLng(31.953910057440805, 34.99566078186035),
new google.maps.LatLng(31.948520840766903, 35.00338554382324),
new google.maps.LatLng(31.946335933133938, 35.00699043273926),
new google.maps.LatLng(31.943859641674045, 35.0064754486084),
new google.maps.LatLng(31.94138328348212, 35.003042221069336),
new google.maps.LatLng(31.9386155100657, 35.00046730041504),
new google.maps.LatLng(31.934245171813757, 35.00046730041504),
new google.maps.LatLng(31.931331497543805, 35.00287055969238),
new google.maps.LatLng(31.928854801809585, 35.00836372375488),
new google.maps.LatLng(31.926815119934417, 35.015058517456055),
new google.maps.LatLng(31.925649567120374, 35.01969337463379),
new google.maps.LatLng(31.925358176608505, 35.026044845581055),
new google.maps.LatLng(31.925649567120374, 35.02896308898926),
new google.maps.LatLng(31.922735620452148, 35.03342628479004),
new google.maps.LatLng(31.917635991618184, 35.03720283508301),
new google.maps.LatLng(31.908164502264, 35.03960609436035),
new google.maps.LatLng(31.900295138882477, 35.04080772399902),
new google.maps.LatLng(31.8924251026796, 35.04063606262207),
new google.maps.LatLng(31.88601198318818, 35.04097938537598),
new google.maps.LatLng(31.879744184929415, 35.03840446472168),
new google.maps.LatLng(31.87041457917487, 35.03617286682129),
new google.maps.LatLng(31.863125167416378, 35.03445625305176),
new google.maps.LatLng(31.855251955231434, 35.03308296203613),
new google.maps.LatLng(31.855397761567097, 35.00844955444336),
new google.maps.LatLng(31.853648070322752, 34.99711990356445),
new google.maps.LatLng(31.848982064700547, 34.99197006225586),
new google.maps.LatLng(31.84344087642, 34.987850189208984),
new google.maps.LatLng(31.837024347838707, 34.98098373413086),
new google.maps.LatLng(31.832065815584627, 34.97102737426758),
new google.maps.LatLng(31.82769041882079, 34.96347427368164),
new google.maps.LatLng(31.825356789074995, 34.95420455932617),
new google.maps.LatLng(31.826815314579356, 34.938411712646484),
new google.maps.LatLng(31.824481662711353, 34.930171966552734),
new google.maps.LatLng(31.817480353171682, 34.91678237915039),
new google.maps.LatLng(31.812520771059095, 34.91231918334961),
new google.maps.LatLng(31.811062019751912, 34.89927291870117),
new google.maps.LatLng(31.81135377185641, 34.88107681274414),
new google.maps.LatLng(31.809165608610932, 34.87103462219238),
new google.maps.LatLng(31.820251768344665, 34.86811637878418),
new google.maps.LatLng(31.823168957611745, 34.848031997680664),
new google.maps.LatLng(31.834836792922044, 34.85232353210449),
new google.maps.LatLng(31.84956532831343, 34.84854698181152),
new google.maps.LatLng(31.850294402642543, 34.860734939575195),
new google.maps.LatLng(31.87347596019353, 34.82159614562988),
new google.maps.LatLng(31.901315279500793, 34.84391212463379),
new google.maps.LatLng(31.915013215266125, 34.80048179626465),
new google.maps.LatLng(31.920841505605924, 34.80751991271973),
new google.maps.LatLng(31.950560041013226, 34.84768867492676),
new google.maps.LatLng(31.957405596502664, 34.853010177612305),
new google.maps.LatLng(32.009094903591254, 34.815073013305664),
new google.maps.LatLng(32.02859822473254, 34.827775955200195),
new google.maps.LatLng(32.021757980316536, 34.838247299194336),
new google.maps.LatLng(32.021903522749895, 34.846487045288086),
new google.maps.LatLng(32.017537149173535, 34.84889030456543),
new google.maps.LatLng(32.02073917680909, 34.86519813537598),
new google.maps.LatLng(31.985656319345722, 34.9390983581543),
new google.maps.LatLng(31.989733025189313, 34.96347427368164),
new google.maps.LatLng(32.005164627449425, 34.9665641784668),

    ];
    var RM_Area = new google.maps.Polygon({
        paths: RM_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var HB_Coords = [
        new google.maps.LatLng(31.599884357287426, 34.95772361755371),
new google.maps.LatLng(31.594182039540698, 34.9515438079834),
new google.maps.LatLng(31.577511724716405, 34.94622230529785),
new google.maps.LatLng(31.565226426769065, 34.945363998413086),
new google.maps.LatLng(31.551915527480222, 34.94175910949707),
new google.maps.LatLng(31.54460103811182, 34.94175910949707),
new google.maps.LatLng(31.53991946406062, 34.94158744812012),
new google.maps.LatLng(31.527482892904917, 34.94193077087402),
new google.maps.LatLng(31.523532106031112, 34.939870834350586),
new google.maps.LatLng(31.50933715991989, 34.94467735290527),
new google.maps.LatLng(31.50480017606385, 34.943647384643555),
new google.maps.LatLng(31.493090813268065, 34.93969917297363),
new google.maps.LatLng(31.491334282379498, 34.94021415710449),
new google.maps.LatLng(31.482111954012925, 34.93523597717285),
new google.maps.LatLng(31.46673938656549, 34.927167892456055),
new google.maps.LatLng(31.457221770075776, 34.9185848236084),
new google.maps.LatLng(31.449899868379653, 34.91086006164551),
new google.maps.LatLng(31.44579935344329, 34.90828514099121),
new google.maps.LatLng(31.440234081843446, 34.90279197692871),
new google.maps.LatLng(31.437597785201056, 34.89884376525879),
new google.maps.LatLng(31.424708156450638, 34.89386558532715),
new google.maps.LatLng(31.418409170638487, 34.8911190032959),
new google.maps.LatLng(31.406689001646452, 34.883737564086914),
new google.maps.LatLng(31.396579180020808, 34.88116264343262),
new google.maps.LatLng(31.391743663020442, 34.879961013793945),
new google.maps.LatLng(31.387494063706352, 34.88184928894043),
new google.maps.LatLng(31.383830461672204, 34.88579750061035),
new google.maps.LatLng(31.37723561789299, 34.88802909851074),
new google.maps.LatLng(31.37049374352203, 34.890947341918945),
new google.maps.LatLng(31.365656883495785, 34.89523887634277),
new google.maps.LatLng(31.35935393482094, 34.90588188171387),
new google.maps.LatLng(31.354076722558787, 34.91086006164551),
new google.maps.LatLng(31.350118618997662, 34.91137504577637),
new google.maps.LatLng(31.346160348851598, 34.91583824157715),
new google.maps.LatLng(31.34220191213246, 34.923906326293945),
new google.maps.LatLng(31.34322818949811, 34.93094444274902),
new google.maps.LatLng(31.34689337440921, 34.9434757232666),
new google.maps.LatLng(31.34821280601745, 34.949655532836914),
new google.maps.LatLng(31.3498254195143, 34.96201515197754),
new google.maps.LatLng(31.3508516137071, 34.97677803039551),
new google.maps.LatLng(31.35349034735801, 34.98501777648926),
new google.maps.LatLng(31.354956278504087, 34.9954891204834),
new google.maps.LatLng(31.358327833411312, 35.01042366027832),
new google.maps.LatLng(31.359060764132366, 35.023298263549805),
new google.maps.LatLng(31.357741484720663, 35.03840446472168),
new google.maps.LatLng(31.358181246581474, 35.05660057067871),
new google.maps.LatLng(31.35671536571315, 35.0862979888916),
new google.maps.LatLng(31.35568923550721, 35.096940994262695),
new google.maps.LatLng(31.356275596996106, 35.11479377746582),
new google.maps.LatLng(31.354809686417862, 35.13333320617676),
new google.maps.LatLng(31.35598241670874, 35.137624740600586),
new google.maps.LatLng(31.3608197745508, 35.149126052856445),
new google.maps.LatLng(31.36360480706991, 35.16045570373535),
new google.maps.LatLng(31.36419111919158, 35.16371726989746),
new google.maps.LatLng(31.36419111919158, 35.17504692077637),
new google.maps.LatLng(31.371812843961937, 35.203800201416016),
new google.maps.LatLng(31.37239910488052, 35.21100997924805),
new google.maps.LatLng(31.372692233968184, 35.22439956665039),
new google.maps.LatLng(31.375037233750135, 35.2305793762207),
new google.maps.LatLng(31.387494063706352, 35.24491310119629),
new google.maps.LatLng(31.394820839017864, 35.25637149810791),
new google.maps.LatLng(31.401341188186898, 35.26529788970947),
new google.maps.LatLng(31.40939942086384, 35.27493238449097),
new google.maps.LatLng(31.414270653187202, 35.28351545333862),
new google.maps.LatLng(31.41621175047934, 35.28737783432007),
new google.maps.LatLng(31.422071423173335, 35.293192863464355),
new google.maps.LatLng(31.43935532453555, 35.319457054138184),
new google.maps.LatLng(31.467325054442888, 35.36215782165527),
new google.maps.LatLng(31.47581682691747, 35.34893989562988),
new google.maps.LatLng(31.505385605709815, 35.316152572631836),
new google.maps.LatLng(31.516654411752928, 35.29829978942871),
new google.maps.LatLng(31.52982402108432, 35.27083396911621),
new google.maps.LatLng(31.540943578447695, 35.25143623352051),
new google.maps.LatLng(31.548404644131857, 35.24422645568848),
new google.maps.LatLng(31.562301117249707, 35.23135185241699),
new google.maps.LatLng(31.57063800748382, 35.2291202545166),
new google.maps.LatLng(31.592134968533564, 35.22294044494629),
new google.maps.LatLng(31.60441671979008, 35.21847724914551),
new google.maps.LatLng(31.609972218045684, 35.2181339263916),
new google.maps.LatLng(31.61187270713691, 35.21641731262207),
new google.maps.LatLng(31.614357903559373, 35.21195411682129),
new google.maps.LatLng(31.614650275246916, 35.20766258239746),
new google.maps.LatLng(31.614357903559373, 35.2016544342041),
new google.maps.LatLng(31.614065530953464, 35.19787788391113),
new google.maps.LatLng(31.612165086630373, 35.19564628601074),
new google.maps.LatLng(31.609972218045684, 35.19169807434082),
new google.maps.LatLng(31.607925494096836, 35.18380165100098),
new google.maps.LatLng(31.606902115249365, 35.173845291137695),
new google.maps.LatLng(31.6080716901568, 35.16440391540527),
new google.maps.LatLng(31.609533638130237, 35.15582084655762),
new google.maps.LatLng(31.61289603134632, 35.147409439086914),
new google.maps.LatLng(31.627952215442463, 35.12801170349121),
new google.maps.LatLng(31.640229241591097, 35.111188888549805),
new google.maps.LatLng(31.65864174185037, 35.08715629577637),
new google.maps.LatLng(31.66419400221431, 35.08011817932129),
new google.maps.LatLng(31.667408317080916, 35.079946517944336),
new google.maps.LatLng(31.669745930760243, 35.08166313171387),
new google.maps.LatLng(31.674128797835984, 35.08076190948486),
new google.maps.LatLng(31.677269725334405, 35.078444480895996),
new google.maps.LatLng(31.68121399542306, 35.073723793029785),
new google.maps.LatLng(31.684135568936938, 35.069947242736816),
new google.maps.LatLng(31.663171242341786, 35.03497123718262),
new google.maps.LatLng(31.65864174185037, 35.02621650695801),
new google.maps.LatLng(31.655719366285815, 35.01626014709473),
new google.maps.LatLng(31.65308914970076, 35.00716209411621),
new google.maps.LatLng(31.64885142196549, 35.00218391418457),
new google.maps.LatLng(31.640229241591097, 34.99218463897705),
new google.maps.LatLng(31.63131394323651, 34.98497486114502),
new google.maps.LatLng(31.622105442974345, 34.97742176055908),
new google.maps.LatLng(31.612969125502246, 34.96978282928467),
new google.maps.LatLng(31.60785239598076, 34.965577125549316),
    ];
    var HB_Area = new google.maps.Polygon({
        paths: HB_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var BL_Coords = [
        new google.maps.LatLng(31.683989492444987, 35.069947242736816),
new google.maps.LatLng(31.679899257344882, 35.07518291473389),
new google.maps.LatLng(31.677050594305346, 35.07835865020752),
new google.maps.LatLng(31.672887006497955, 35.08084774017334),
new google.maps.LatLng(31.66872323201452, 35.0813627243042),
new google.maps.LatLng(31.666458644719125, 35.07964611053467),
new google.maps.LatLng(31.664559270868608, 35.07913112640381),
new google.maps.LatLng(31.61391934430613, 35.14607906341553),
new google.maps.LatLng(31.60946054127679, 35.15346050262451),
new google.maps.LatLng(31.608364081588007, 35.16067028045654),
new google.maps.LatLng(31.606390421607475, 35.17294406890869),
new google.maps.LatLng(31.60946054127679, 35.19165515899658),
new google.maps.LatLng(31.61187270713691, 35.19697666168213),
new google.maps.LatLng(31.613846250896362, 35.19852161407471),
new google.maps.LatLng(31.6139924376585, 35.21139621734619),
new google.maps.LatLng(31.610630084044825, 35.217833518981934),
new google.maps.LatLng(31.605513225964707, 35.21817684173584),
new google.maps.LatLng(31.561130967751275, 35.2316951751709),
new google.maps.LatLng(31.541089879585808, 35.250749588012695),
new google.maps.LatLng(31.527921858908762, 35.27358055114746),
new google.maps.LatLng(31.515703201415246, 35.299458503723145),
new google.maps.LatLng(31.50516607002222, 35.3161096572876),
new google.maps.LatLng(31.484015048599076, 35.33846855163574),
new google.maps.LatLng(31.475377616200426, 35.34893989562988),
new google.maps.LatLng(31.467032220962164, 35.36267280578613),
new google.maps.LatLng(31.47874484568745, 35.37825107574463),
new google.maps.LatLng(31.502458420817202, 35.37344455718994),
new google.maps.LatLng(31.51423978198768, 35.37670612335205),
new google.maps.LatLng(31.53611551225996, 35.38297176361084),
new google.maps.LatLng(31.55374406024056, 35.38425922393799),
new google.maps.LatLng(31.56698156843796, 35.3918981552124),
new google.maps.LatLng(31.574294303146736, 35.38846492767334),
new google.maps.LatLng(31.589795403731287, 35.39747714996338),
new google.maps.LatLng(31.646367146916386, 35.411338806152344),
new google.maps.LatLng(31.690781806136822, 35.44361114501953),
new google.maps.LatLng(31.71122878128754, 35.44567108154297),
new google.maps.LatLng(31.731671248829198, 35.44910430908203),
new google.maps.LatLng(31.757363953119533, 35.44841766357422),
new google.maps.LatLng(31.767872550142034, 35.447731018066406),
new google.maps.LatLng(31.777212523418644, 35.439491271972656),
new google.maps.LatLng(31.783049527817784, 35.420780181884766),
new google.maps.LatLng(31.789761627404793, 35.4060173034668),
new google.maps.LatLng(31.799682968938473, 35.391597747802734),
new google.maps.LatLng(31.811062019751912, 35.38026809692383),
new google.maps.LatLng(31.81806381590986, 35.37752151489258),
new google.maps.LatLng(31.817480353171682, 35.37271499633789),
new google.maps.LatLng(31.814271242216744, 35.365848541259766),
new google.maps.LatLng(31.817772085001568, 35.358638763427734),
new google.maps.LatLng(31.81485472523014, 35.34730911254883),
new google.maps.LatLng(31.811062019751912, 35.34078598022461),
new google.maps.LatLng(31.806977393531774, 35.3294563293457),
new google.maps.LatLng(31.805810324295997, 35.29306411743164),
new google.maps.LatLng(31.80376791765831, 35.26834487915039),
new google.maps.LatLng(31.80289258670676, 35.2522087097168),
new google.maps.LatLng(31.79063708273051, 35.25358200073242),
new google.maps.LatLng(31.7815903112567, 35.2522087097168),
new google.maps.LatLng(31.77020763186669, 35.2522087097168),
new google.maps.LatLng(31.75561240427337, 35.24843215942383),
new google.maps.LatLng(31.738095093126777, 35.24534225463867),
new google.maps.LatLng(31.727875131475486, 35.24019241333008),
new google.maps.LatLng(31.723786831179385, 35.23710250854492),
new google.maps.LatLng(31.720574468715053, 35.22783279418945),
new google.maps.LatLng(31.72028243024323, 35.21547317504883),
new google.maps.LatLng(31.723786831179385, 35.20002365112305),
new google.maps.LatLng(31.729919213990538, 35.17770767211914),
new google.maps.LatLng(31.7369271545675, 35.152645111083984),
new google.maps.LatLng(31.735175219118705, 35.137882232666016),
new google.maps.LatLng(31.730795235550936, 35.127925872802734),
new google.maps.LatLng(31.727583116006834, 35.12346267700195),
new google.maps.LatLng(31.71940630930742, 35.121402740478516),
new google.maps.LatLng(31.71619379503302, 35.11453628540039),
new google.maps.LatLng(31.712981169438624, 35.1042366027832),
new google.maps.LatLng(31.7059714181356, 35.09702682495117),
new google.maps.LatLng(31.699253242631475, 35.09016036987305),
new google.maps.LatLng(31.693118831385902, 35.08501052856445),
    ];
    var BL_Area = new google.maps.Polygon({
        paths: BL_Coords
    });
    //---------------------------------------------------------------------------------------------------------//
    var JS_Coords = [
        new google.maps.LatLng(31.812593708019694,34.91261959075928),
new google.maps.LatLng(31.808436209343757,34.91485118865967),
new google.maps.LatLng(31.807633863497934,34.92223262786865),
new google.maps.LatLng(31.809457366705228,34.93502140045166),
new google.maps.LatLng(31.81186433582184,34.94094371795654),
new google.maps.LatLng(31.815438204557204,34.956865310668945),
new google.maps.LatLng(31.815292335071042,34.97506141662598),
new google.maps.LatLng(31.816167548532086,34.98295783996582),
new google.maps.LatLng(31.818501410544197,35.00201225280762),
new google.maps.LatLng(31.819668319431138,35.010080337524414),
new google.maps.LatLng(31.8183555458965,35.015058517456055),
new google.maps.LatLng(31.817772085001568,35.025272369384766),
new google.maps.LatLng(31.820689352610472,35.03660202026367),
new google.maps.LatLng(31.827398718328755,35.04690170288086),
new google.maps.LatLng(31.83644100493149,35.05205154418945),
new google.maps.LatLng(31.845482405566294,35.055484771728516),
new google.maps.LatLng(31.849856958736677,35.05857467651367),
new google.maps.LatLng(31.84781552640937,35.0654411315918),
new google.maps.LatLng(31.841107644930872,35.07608413696289),
new google.maps.LatLng(31.833815916214295,35.0877571105957),
new google.maps.LatLng(31.830315681768234,35.091190338134766),
new google.maps.LatLng(31.826523611321996,35.09908676147461),
new google.maps.LatLng(31.824481662711353,35.10526657104492),
new google.maps.LatLng(31.824189952080015,35.11178970336914),
new google.maps.LatLng(31.825065081208855,35.118656158447266),
new google.maps.LatLng(31.823314814655653,35.12552261352539),
new google.maps.LatLng(31.81820968101838,35.130929946899414),
new google.maps.LatLng(31.814271242216744,35.138139724731445),
new google.maps.LatLng(31.81281251855591,35.14792442321777),
new google.maps.LatLng(31.81033263545907,35.154619216918945),
new google.maps.LatLng(31.808727969741742,35.16268730163574),
new google.maps.LatLng(31.808727969741742,35.17075538635254),
new google.maps.LatLng(31.811062019751912,35.17556190490723),
new google.maps.LatLng(31.81412537088744,35.17727851867676),
new google.maps.LatLng(31.817626219201827,35.1796817779541),
new google.maps.LatLng(31.820105906461915,35.17951011657715),
new google.maps.LatLng(31.824481662711353,35.18105506896973),
new google.maps.LatLng(31.82696116586236,35.18551826477051),
new google.maps.LatLng(31.8266694630659,35.192556381225586),
new google.maps.LatLng(31.824773372420967,35.19598960876465),
new google.maps.LatLng(31.82389824052695,35.19719123840332),
new google.maps.LatLng(31.823460671469107,35.20010948181152),
new google.maps.LatLng(31.8255026426624,35.20285606384277),
new google.maps.LatLng(31.8291489074541,35.204057693481445),
new google.maps.LatLng(31.836878512457638,35.20491600036621),
new google.maps.LatLng(31.848982064700547,35.20525932312012),
new google.maps.LatLng(31.853064832530322,35.20646095275879),
new google.maps.LatLng(31.856855812242912,35.209550857543945),
new google.maps.LatLng(31.85627259473929,35.2152156829834),
new google.maps.LatLng(31.85379387919446,35.221052169799805),
new google.maps.LatLng(31.849127880949563,35.22637367248535),
new google.maps.LatLng(31.845190761311553,35.228776931762695),
new google.maps.LatLng(31.841107644930872,35.22963523864746),
new google.maps.LatLng(31.83746185259907,35.23032188415527),
new google.maps.LatLng(31.838045189052764,35.23358345031738),
new google.maps.LatLng(31.838336855896692,35.23821830749512),
new google.maps.LatLng(31.838336855896692,35.24697303771973),
new google.maps.LatLng(31.834399275715842,35.24937629699707),
new google.maps.LatLng(31.830169835785558,35.25160789489746),
new google.maps.LatLng(31.825648496019358,35.251779556274414),
new google.maps.LatLng(31.819814182005135,35.25195121765137),
new google.maps.LatLng(31.81135377185641,35.25263786315918),
new google.maps.LatLng(31.803476141595862,35.25315284729004),
new google.maps.LatLng(31.79720273339778,35.25383949279785),
new google.maps.LatLng(31.791804343601445,35.254011154174805),
new google.maps.LatLng(31.784070965709624,35.25280952453613),
new google.maps.LatLng(31.773418273007145,35.25263786315918),
new google.maps.LatLng(31.76889415564824,35.251779556274414),
new google.maps.LatLng(31.763786015317773,35.25092124938965),
new google.maps.LatLng(31.733277251661814,35.24405479431152),
new google.maps.LatLng(31.724662910711018,35.23821830749512),
new google.maps.LatLng(31.720428449594177,35.23066520690918),
new google.maps.LatLng(31.719114267155366,35.21967887878418),
new google.maps.LatLng(31.720574468715053,35.210580825805664),
new google.maps.LatLng(31.725100947371363,35.19289970397949),
new google.maps.LatLng(31.7369271545675,35.150413513183594),
new google.maps.LatLng(31.733715247602944,35.13444900512695),
new google.maps.LatLng(31.7296272049633,35.1262092590332),
new google.maps.LatLng(31.72261871225556,35.122432708740234),
new google.maps.LatLng(31.71940630930742,35.12105941772461),
new google.maps.LatLng(31.71210497950279,35.103206634521484),
new google.maps.LatLng(31.701005857062714,35.091190338134766),
new google.maps.LatLng(31.69282670644841,35.08501052856445),
new google.maps.LatLng(31.68698401458388,35.074710845947266),
new google.maps.LatLng(31.67675841879551,35.058231353759766),
new google.maps.LatLng(31.67237567582654,35.051021575927734),
new google.maps.LatLng(31.66419400221431,35.03694534301758),
new google.maps.LatLng(31.65864174185037,35.02595901489258),
new google.maps.LatLng(31.655719366285815,35.01668930053711),
new google.maps.LatLng(31.652796898818547,35.007076263427734),
new google.maps.LatLng(31.6428598220613,34.995059967041016),
new google.maps.LatLng(31.625905886872008,34.98064041137695),
new google.maps.LatLng(31.6071945103536,34.96519088745117),
new google.maps.LatLng(31.600176774428046,34.95798110961914),
new google.maps.LatLng(31.608364081588007,34.948368072509766),
new google.maps.LatLng(31.60982602497012,34.94047164916992),
new google.maps.LatLng(31.612457465205498,34.930171966552734),
new google.maps.LatLng(31.6133345954209,34.920902252197266),
new google.maps.LatLng(31.644321223497375,34.869747161865234),
new google.maps.LatLng(31.68128703588148,34.85678672790527),
new google.maps.LatLng(31.686107579079483,34.86279487609863),
new google.maps.LatLng(31.694579442278776,34.86416816711426),
new google.maps.LatLng(31.702758438382748,34.86142158508301),
new google.maps.LatLng(31.7059714181356,34.85541343688965),
new google.maps.LatLng(31.70918428658835,34.85043525695801),
new google.maps.LatLng(31.723786831179385,34.84665870666504),
new google.maps.LatLng(31.72831315295311,34.852495193481445),
new google.maps.LatLng(31.736343179765843,34.85592842102051),
new google.maps.LatLng(31.75210920715378,34.84871864318848),
new google.maps.LatLng(31.755320476243437,34.84305381774902),
new google.maps.LatLng(31.759553342568687,34.83258247375488),
new google.maps.LatLng(31.767872550142034,34.82949256896973),
new google.maps.LatLng(31.77487761850741,34.82691764831543),
new google.maps.LatLng(31.77648287196549,34.82159614562988),
new google.maps.LatLng(31.782611765267234,34.814558029174805),
new google.maps.LatLng(31.78961571737781,34.82125282287598),
new google.maps.LatLng(31.79384701465877,34.82949256896973),
new google.maps.LatLng(31.8044973537833,34.84133720397949),
new google.maps.LatLng(31.80785268578335,34.84768867492676),
new google.maps.LatLng(31.810624389867336,34.85918998718262),
new google.maps.LatLng(31.80931148777328,34.87137794494629),
new google.maps.LatLng(31.81208314808596,34.88133430480957),
new google.maps.LatLng(31.81135377185641,34.89901542663574),
    ];
    var JS_Area = new google.maps.Polygon({
        paths: JS_Coords
    });
    //---------------------------------------------------------------------------------------------------------//


    var Areas = ko.observableArray([]);
    Areas.push(new Area('ZF', ZF_Area));
    Areas.push(new Area('SM', SM_Area));
    Areas.push(new Area('YZ', YN_Area));
    Areas.push(new Area('HF', HF_Area));
    Areas.push(new Area('AK', AK_Area));
    Areas.push(new Area('HD', HD_Area));
    Areas.push(new Area('KN', KN_Area));
    Areas.push(new Area('HG', HG_Area));
    Areas.push(new Area('JN', JN_Area));
    Areas.push(new Area('PT', PT_Area));
    Areas.push(new Area('YZ', YZ_Area));
    Areas.push(new Area('HS', HS_Area));
    Areas.push(new Area('TA', TA_Area));
    Areas.push(new Area('TK', TK_Area));
    Areas.push(new Area('RH', RH_Area));
    Areas.push(new Area('RA', RA_Area));
    Areas.push(new Area('RM', RM_Area));
    Areas.push(new Area('HB', HB_Area));
    Areas.push(new Area('BL', BL_Area));
    Areas.push(new Area('JS', JS_Area));

    var Coords = ko.observableArray([]);
    Coords.push(new Area('ZF', ZF_Coords));
    Coords.push(new Area('SM', SM_Coords));
    Coords.push(new Area('YZ', YN_Coords));
    Coords.push(new Area('HF', HF_Coords));
    Coords.push(new Area('AK', AK_Coords));
    Coords.push(new Area('HD', HD_Coords));
    Coords.push(new Area('KN', KN_Coords));
    Coords.push(new Area('HG', HG_Coords));
    Coords.push(new Area('JN', JN_Coords));
    Coords.push(new Area('PT', PT_Coords));
    Coords.push(new Area('YZ', YZ_Coords));
    Coords.push(new Area('HS', HS_Coords));
    Coords.push(new Area('TA', TA_Coords));
    Coords.push(new Area('TK', TK_Coords));
    Coords.push(new Area('RH', RH_Coords));
    Coords.push(new Area('RA', RA_Coords));
    Coords.push(new Area('RM', RM_Coords));
    Coords.push(new Area('HB', HB_Coords));
    Coords.push(new Area('BL', BL_Coords));
    Coords.push(new Area('JS', JS_Coords));
    //*****************************************************************************************//

    var getAreaByPosition = function (position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        return getAreaByLatLng(lat, lng);
    }

    var getAreaByLatLng = function (lat, lng) {
        
        var latProjection = (lat - 33.365161) * (44 / (29.507063 - 33.365161));
        latProjection = parseInt(latProjection);
        if (latProjection < 10) {
            latProjection = '0' + latProjection;
        }
        var lngProjection = (lng - 34.262562) * (9 / (35.204215 - 34.262562));
        lngProjection = parseInt(lngProjection);
        if (lngProjection > 7) lngProjection++;
        lngProjection = String.fromCharCode(65 + lngProjection);
        var square = lngProjection + '-' + latProjection;

        var areaCode = 'XX';
        ko.utils.arrayForEach(Areas(), function (item) {
            if (google.maps.geometry.poly.containsLocation(new google.maps.LatLng(lat, lng), item.poly))
                areaCode = item.name;
        });
        return square + '-' + areaCode;
    }
        
    var coordinates = {
        getAreaByPosition: getAreaByPosition,
        getAreaByLatLng: getAreaByLatLng,
        Areas: Areas,
        Coords: Coords
    };

    return coordinates;

});

define('services/httpService',[],function () {
    var httpGet = function (url, query, headers) {
        return $.ajax({
            type: 'GET',
            url: url,
            data: query,
            contentType: 'application/json',
            headers: headers
        });
    };

    var httpPost = function (url, data, headers) {
        return $.ajax({
            url: url,
            //data: ko.toJSON(data),
            data: data,
            type: 'POST',
            //contentType: 'application/json',
            //dataType: 'json',
            headers: headers
        });
    };

    var httpService = {
        get: httpGet,
        post: httpPost
    };

    return httpService;
});
define('services/themeManager',[],function () {

    // *** TO BE CUSTOMISED ***

    var style_cookie_name = "style";
    var style_cookie_duration = 30;

    // *** END OF CUSTOMISABLE SECTION ***

    var switch_style = function (css_title) {
        // You may use this script on your site free of charge provided
        // you do not remove this notice or the URL below. Script from
        // http://www.thesitewizard.com/javascripts/change-style-sheets.shtml
        var i, link_tag;
        for (i = 0, link_tag = document.getElementsByTagName("link") ;
          i < link_tag.length ; i++) {
            if ((link_tag[i].rel.indexOf("stylesheet") != -1) &&
              link_tag[i].title) {
                link_tag[i].disabled = true;
                if (link_tag[i].title == css_title) {
                    link_tag[i].disabled = false;
                }
            }
            set_cookie(style_cookie_name, css_title, style_cookie_duration);
        }
    }
    var set_style_from_cookie = function () {
        var css_title = get_cookie(style_cookie_name);
        if (css_title.length) {
            switch_style(css_title);
        }
    }
    var set_cookie = function (cookie_name, cookie_value, lifespan_in_days, valid_domain) {
        // http://www.thesitewizard.com/javascripts/cookies.shtml
        var domain_string = valid_domain ? ("; domain=" + valid_domain) : '';
        document.cookie = cookie_name + "=" + encodeURIComponent(cookie_value) + "; max-age=" + 60 * 60 * 24 * lifespan_in_days + "; path=/" + domain_string;
    }
    var get_cookie = function (cookie_name) {
        // http://www.thesitewizard.com/javascripts/cookies.shtml
        var cookie_string = document.cookie;
        if (cookie_string.length != 0) {
            var cookie_value1 = cookie_string.match('(^|;)[\s]*' + cookie_name + '=([^;]*)');
            var cookie_value = cookie_string.match( cookie_name + '=([^;]*)');
            return decodeURIComponent(cookie_value[1]);
        }
        return '';
    }

    var themeManager = {
        switch_style: switch_style,
        set_style_from_cookie: set_style_from_cookie
    }

    return themeManager;
});
define('services/utilities',[],function () {

    base64Keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";
    base64Encode = function (input) {
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4, i, output;
        output = "";
        i = 0;
        input = utf8Encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = "" + output + (base64Keys.charAt(enc1)) + (base64Keys.charAt(enc2)) + (enc3 < 64 ? base64Keys.charAt(enc3) : '') + (enc4 < 64 ? base64Keys.charAt(enc4) : '');
        }
        return output;
    };

    utf8Encode = function (string) {
        var c, s, utftext, _i, _len, _ref;
        string = string.replace(/\r\n/g, "\n");
        utftext = "";
        _ref = string.split('');
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            s = _ref[_i];
            c = s.charCodeAt(0);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if (c > 127 && c < 2048) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    };
    var applyRowSearch = function (searchItem, val) {
        var lval = val.toLowerCase();
        $(searchItem).each(function () {
            if ($(this).text().toLowerCase().indexOf(lval) < 0)
                $(this).hide();
            else $(this).show();
        });
        //if ($(searchItem).children().length == 0)
        //{
        //    $(searchItem).parent().parent().hide();
        //}
    }

    var handleError = function (xhr, ajaxOptions, thrownError) {
        try
        {
            var err = jQuery.parseJSON(xhr.responseText).error;
            alert("There was an error: " + err);
        }
        catch (ex)
        {
            alert(thrownError);
        }
        
    }

    var getBase64Auth = function (username, password) {
        var tok = username + ':' + password;
        var hash = base64Encode(tok);
        return hash;
    };

    var utilities = {
        base64Encode: base64Encode,
        getBase64Auth: getBase64Auth,
        applyRowSearch: applyRowSearch,
        handleError: handleError
    };
    return utilities;
});
/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * This module is based on Backbone's core history support. It abstracts away the low level details of working with browser history and url changes in order to provide a solid foundation for a router.
 * @module history
 * @requires system
 * @requires jquery
 */
define('plugins/history',['durandal/system', 'jquery'], function (system, $) {
    // Cached regex for stripping a leading hash/slash and trailing space.
    var routeStripper = /^[#\/]|\s+$/g;

    // Cached regex for stripping leading and trailing slashes.
    var rootStripper = /^\/+|\/+$/g;

    // Cached regex for detecting MSIE.
    var isExplorer = /msie [\w.]+/;

    // Cached regex for removing a trailing slash.
    var trailingSlash = /\/$/;

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    function updateHash(location, fragment, replace) {
        if (replace) {
            var href = location.href.replace(/(javascript:|#).*$/, '');
            location.replace(href + '#' + fragment);
        } else {
            // Some browsers require that `hash` contains a leading #.
            location.hash = '#' + fragment;
        }
    };

    /**
     * @class HistoryModule
     * @static
     */
    var history = {
        /**
         * The setTimeout interval used when the browser does not support hash change events.
         * @property {string} interval
         * @default 50
         */
        interval: 50,
        /**
         * Indicates whether or not the history module is actively tracking history.
         * @property {string} active
         */
        active: false
    };
    
    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
        history.location = window.location;
        history.history = window.history;
    }

    /**
     * Gets the true hash value. Cannot use location.hash directly due to a bug in Firefox where location.hash will always be decoded.
     * @method getHash
     * @param {string} [window] The optional window instance
     * @return {string} The hash.
     */
    history.getHash = function(window) {
        var match = (window || history).location.href.match(/#(.*)$/);
        return match ? match[1] : '';
    };
    
    /**
     * Get the cross-browser normalized URL fragment, either from the URL, the hash, or the override.
     * @method getFragment
     * @param {string} fragment The fragment.
     * @param {boolean} forcePushState Should we force push state?
     * @return {string} he fragment.
     */
    history.getFragment = function(fragment, forcePushState) {
        if (fragment == null) {
            if (history._hasPushState || !history._wantsHashChange || forcePushState) {
                fragment = history.location.pathname;
                var root = history.root.replace(trailingSlash, '');
                if (!fragment.indexOf(root)) {
                    fragment = fragment.substr(root.length);
                }
            } else {
                fragment = history.getHash();
            }
        }
        
        return fragment.replace(routeStripper, '');
    };

    /**
     * Activate the hash change handling, returning `true` if the current URL matches an existing route, and `false` otherwise.
     * @method activate
     * @param {HistoryOptions} options.
     * @return {boolean|undefined} Returns true/false from loading the url unless the silent option was selected.
     */
    history.activate = function(options) {
        if (history.active) {
            system.error("History has already been activated.");
        }

        history.active = true;

        // Figure out the initial configuration. Do we need an iframe?
        // Is pushState desired ... is it available?
        history.options = system.extend({}, { root: '/' }, history.options, options);
        history.root = history.options.root;
        history._wantsHashChange = history.options.hashChange !== false;
        history._wantsPushState = !!history.options.pushState;
        history._hasPushState = !!(history.options.pushState && history.history && history.history.pushState);

        var fragment = history.getFragment();
        var docMode = document.documentMode;
        var oldIE = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

        // Normalize root to always include a leading and trailing slash.
        history.root = ('/' + history.root + '/').replace(rootStripper, '/');

        if (oldIE && history._wantsHashChange) {
            history.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
            history.navigate(fragment, false);
        }

        // Depending on whether we're using pushState or hashes, and whether
        // 'onhashchange' is supported, determine how we check the URL state.
        if (history._hasPushState) {
            $(window).on('popstate', history.checkUrl);
        } else if (history._wantsHashChange && ('onhashchange' in window) && !oldIE) {
            $(window).on('hashchange', history.checkUrl);
        } else if (history._wantsHashChange) {
            history._checkUrlInterval = setInterval(history.checkUrl, history.interval);
        }

        // Determine if we need to change the base url, for a pushState link
        // opened by a non-pushState browser.
        history.fragment = fragment;
        var loc = history.location;
        var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === history.root;

        // Transition from hashChange to pushState or vice versa if both are requested.
        if (history._wantsHashChange && history._wantsPushState) {
            // If we've started off with a route from a `pushState`-enabled
            // browser, but we're currently in a browser that doesn't support it...
            if (!history._hasPushState && !atRoot) {
                history.fragment = history.getFragment(null, true);
                history.location.replace(history.root + history.location.search + '#' + history.fragment);
                // Return immediately as browser will do redirect to new url
                return true;

            // Or if we've started out with a hash-based route, but we're currently
            // in a browser where it could be `pushState`-based instead...
            } else if (history._hasPushState && atRoot && loc.hash) {
                this.fragment = history.getHash().replace(routeStripper, '');
                this.history.replaceState({}, document.title, history.root + history.fragment + loc.search);
            }
        }

        if (!history.options.silent) {
            return history.loadUrl();
        }
    };

    /**
     * Disable history, perhaps temporarily. Not useful in a real app, but possibly useful for unit testing Routers.
     * @method deactivate
     */
    history.deactivate = function() {
        $(window).off('popstate', history.checkUrl).off('hashchange', history.checkUrl);
        clearInterval(history._checkUrlInterval);
        history.active = false;
    };

    /**
     * Checks the current URL to see if it has changed, and if it has, calls `loadUrl`, normalizing across the hidden iframe.
     * @method checkUrl
     * @return {boolean} Returns true/false from loading the url.
     */
    history.checkUrl = function() {
        var current = history.getFragment();
        if (current === history.fragment && history.iframe) {
            current = history.getFragment(history.getHash(history.iframe));
        }

        if (current === history.fragment) {
            return false;
        }

        if (history.iframe) {
            history.navigate(current, false);
        }
        
        history.loadUrl();
    };
    
    /**
     * Attempts to load the current URL fragment. A pass-through to options.routeHandler.
     * @method loadUrl
     * @return {boolean} Returns true/false from the route handler.
     */
    history.loadUrl = function(fragmentOverride) {
        var fragment = history.fragment = history.getFragment(fragmentOverride);

        return history.options.routeHandler ?
            history.options.routeHandler(fragment) :
            false;
    };

    /**
     * Save a fragment into the hash history, or replace the URL state if the
     * 'replace' option is passed. You are responsible for properly URL-encoding
     * the fragment in advance.
     * The options object can contain `trigger: false` if you wish to not have the
     * route callback be fired, or `replace: true`, if
     * you wish to modify the current URL without adding an entry to the history.
     * @method navigate
     * @param {string} fragment The url fragment to navigate to.
     * @param {object|boolean} options An options object with optional trigger and replace flags. You can also pass a boolean directly to set the trigger option. Trigger is `true` by default.
     * @return {boolean} Returns true/false from loading the url.
     */
    history.navigate = function(fragment, options) {
        if (!history.active) {
            return false;
        }

        if(options === undefined) {
            options = {
                trigger: true
            };
        }else if(system.isBoolean(options)) {
            options = {
                trigger: options
            };
        }

        fragment = history.getFragment(fragment || '');

        if (history.fragment === fragment) {
            return;
        }

        history.fragment = fragment;
        var url = history.root + fragment;

        // If pushState is available, we use it to set the fragment as a real URL.
        if (history._hasPushState) {
            history.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
        } else if (history._wantsHashChange) {
            updateHash(history.location, fragment, options.replace);
            
            if (history.iframe && (fragment !== history.getFragment(history.getHash(history.iframe)))) {
                // Opening and closing the iframe tricks IE7 and earlier to push a
                // history entry on hash-tag change.  When replace is true, we don't
                // want history.
                if (!options.replace) {
                    history.iframe.document.open().close();
                }
                
                updateHash(history.iframe.location, fragment, options.replace);
            }

            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
        } else {
            return history.location.assign(url);
        }

        if (options.trigger) {
            return history.loadUrl(fragment);
        }
    };

    /**
     * Navigates back in the browser history.
     * @method navigateBack
     */
    history.navigateBack = function() {
        history.history.back();
    };

    /**
     * @class HistoryOptions
     * @static
     */

    /**
     * The function that will be called back when the fragment changes.
     * @property {function} routeHandler
     */

    /**
     * The url root used to extract the fragment when using push state.
     * @property {string} root
     */

    /**
     * Use hash change when present.
     * @property {boolean} hashChange
     * @default true
     */

    /**
     * Use push state when present.
     * @property {boolean} pushState
     * @default false
     */

    /**
     * Prevents loading of the current url when activating history.
     * @property {boolean} silent
     * @default false
     */

    return history;
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Connects the history module's url and history tracking support to Durandal's activation and composition engine allowing you to easily build navigation-style applications.
 * @module router
 * @requires system
 * @requires app
 * @requires activator
 * @requires events
 * @requires composition
 * @requires history
 * @requires knockout
 * @requires jquery
 */
define('plugins/router',['durandal/system', 'durandal/app', 'durandal/activator', 'durandal/events', 'durandal/composition', 'plugins/history', 'knockout', 'jquery'], function(system, app, activator, events, composition, history, ko, $) {
    var optionalParam = /\((.*?)\)/g;
    var namedParam = /(\(\?)?:\w+/g;
    var splatParam = /\*\w+/g;
    var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
    var startDeferred, rootRouter;
    var trailingSlash = /\/$/;

    function routeStringToRegExp(routeString) {
        routeString = routeString.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function(match, optional) {
                return optional ? match : '([^\/]+)';
            })
            .replace(splatParam, '(.*?)');

        return new RegExp('^' + routeString + '$');
    }

    function stripParametersFromRoute(route) {
        var colonIndex = route.indexOf(':');
        var length = colonIndex > 0 ? colonIndex - 1 : route.length;
        return route.substring(0, length);
    }

    function hasChildRouter(instance) {
        return instance.router && instance.router.loadUrl;
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    function compareArrays(first, second) {
        if (!first || !second){
            return false;
        }

        if (first.length != second.length) {
            return false;
        }

        for (var i = 0, len = first.length; i < len; i++) {
            if (first[i] != second[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * @class Router
     * @uses Events
     */

    /**
     * Triggered when the navigation logic has completed.
     * @event router:navigation:complete
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered when the navigation has been cancelled.
     * @event router:navigation:cancelled
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered right before a route is activated.
     * @event router:route:activating
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered right before a route is configured.
     * @event router:route:before-config
     * @param {object} config The route config.
     * @param {Router} router The router.
     */

    /**
     * Triggered just after a route is configured.
     * @event router:route:after-config
     * @param {object} config The route config.
     * @param {Router} router The router.
     */

    /**
     * Triggered when the view for the activated instance is attached.
     * @event router:navigation:attached
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered when the composition that the activated instance participates in is complete.
     * @event router:navigation:composition-complete
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered when the router does not find a matching route.
     * @event router:route:not-found
     * @param {string} fragment The url fragment.
     * @param {Router} router The router.
     */

    var createRouter = function() {
        var queue = [],
            isProcessing = ko.observable(false),
            currentActivation,
            currentInstruction,
            activeItem = activator.create();

        var router = {
            /**
             * The route handlers that are registered. Each handler consists of a `routePattern` and a `callback`.
             * @property {object[]} handlers
             */
            handlers: [],
            /**
             * The route configs that are registered.
             * @property {object[]} routes
             */
            routes: [],
            /**
             * The route configurations that have been designated as displayable in a nav ui (nav:true).
             * @property {KnockoutObservableArray} navigationModel
             */
            navigationModel: ko.observableArray([]),
            /**
             * The active item/screen based on the current navigation state.
             * @property {Activator} activeItem
             */
            activeItem: activeItem,
            /**
             * Indicates that the router (or a child router) is currently in the process of navigating.
             * @property {KnockoutComputed} isNavigating
             */
            isNavigating: ko.computed(function() {
                var current = activeItem();
                var processing = isProcessing();
                var currentRouterIsProcesing = current
                    && current.router
                    && current.router != router
                    && current.router.isNavigating() ? true : false;
                return  processing || currentRouterIsProcesing;
            }),
            /**
             * An observable surfacing the active routing instruction that is currently being processed or has recently finished processing.
             * The instruction object has `config`, `fragment`, `queryString`, `params` and `queryParams` properties.
             * @property {KnockoutObservable} activeInstruction
             */
            activeInstruction:ko.observable(null),
            __router__:true
        };

        events.includeIn(router);

        activeItem.settings.areSameItem = function (currentItem, newItem, currentActivationData, newActivationData) {
            if (currentItem == newItem) {
                return compareArrays(currentActivationData, newActivationData);
            }

            return false;
        };

        function completeNavigation(instance, instruction) {
            system.log('Navigation Complete', instance, instruction);

            var fromModuleId = system.getModuleId(currentActivation);
            if (fromModuleId) {
                router.trigger('router:navigation:from:' + fromModuleId);
            }

            currentActivation = instance;
            currentInstruction = instruction;

            var toModuleId = system.getModuleId(currentActivation);
            if (toModuleId) {
                router.trigger('router:navigation:to:' + toModuleId);
            }

            if (!hasChildRouter(instance)) {
                router.updateDocumentTitle(instance, instruction);
            }

            rootRouter.explicitNavigation = false;
            rootRouter.navigatingBack = false;
            router.trigger('router:navigation:complete', instance, instruction, router);
        }

        function cancelNavigation(instance, instruction) {
            system.log('Navigation Cancelled');

            router.activeInstruction(currentInstruction);

            if (currentInstruction) {
                router.navigate(currentInstruction.fragment, false);
            }

            isProcessing(false);
            rootRouter.explicitNavigation = false;
            rootRouter.navigatingBack = false;
            router.trigger('router:navigation:cancelled', instance, instruction, router);
        }

        function redirect(url) {
            system.log('Navigation Redirecting');

            isProcessing(false);
            rootRouter.explicitNavigation = false;
            rootRouter.navigatingBack = false;
            router.navigate(url, { trigger: true, replace: true });
        }

        function activateRoute(activator, instance, instruction) {
            rootRouter.navigatingBack = !rootRouter.explicitNavigation && currentActivation != instruction.fragment;
            router.trigger('router:route:activating', instance, instruction, router);

            activator.activateItem(instance, instruction.params).then(function(succeeded) {
                if (succeeded) {
                    var previousActivation = currentActivation;
                    completeNavigation(instance, instruction);

                    if (hasChildRouter(instance)) {
                        queueInstruction({
                            router: instance.router,
                            fragment: instruction.fragment,
                            queryString: instruction.queryString
                        });
                    }

                    if (previousActivation == instance) {
                        router.attached();
                    }
                } else if(activator.settings.lifecycleData && activator.settings.lifecycleData.redirect){
                    redirect(activator.settings.lifecycleData.redirect);
                }else{
                    cancelNavigation(instance, instruction);
                }

                if (startDeferred) {
                    startDeferred.resolve();
                    startDeferred = null;
                }
            });
        }

        /**
         * Inspects routes and modules before activation. Can be used to protect access by cancelling navigation or redirecting.
         * @method guardRoute
         * @param {object} instance The module instance that is about to be activated by the router.
         * @param {object} instruction The route instruction. The instruction object has config, fragment, queryString, params and queryParams properties.
         * @return {Promise|Boolean|String} If a boolean, determines whether or not the route should activate or be cancelled. If a string, causes a redirect to the specified route. Can also be a promise for either of these value types.
         */
        function handleGuardedRoute(activator, instance, instruction) {
            var resultOrPromise = router.guardRoute(instance, instruction);
            if (resultOrPromise) {
                if (resultOrPromise.then) {
                    resultOrPromise.then(function(result) {
                        if (result) {
                            if (system.isString(result)) {
                                redirect(result);
                            } else {
                                activateRoute(activator, instance, instruction);
                            }
                        } else {
                            cancelNavigation(instance, instruction);
                        }
                    });
                } else {
                    if (system.isString(resultOrPromise)) {
                        redirect(resultOrPromise);
                    } else {
                        activateRoute(activator, instance, instruction);
                    }
                }
            } else {
                cancelNavigation(instance, instruction);
            }
        }

        function ensureActivation(activator, instance, instruction) {
            if (router.guardRoute) {
                handleGuardedRoute(activator, instance, instruction);
            } else {
                activateRoute(activator, instance, instruction);
            }
        }

        function canReuseCurrentActivation(instruction) {
            return currentInstruction
                && currentInstruction.config.moduleId == instruction.config.moduleId
                && currentActivation
                && ((currentActivation.canReuseForRoute && currentActivation.canReuseForRoute.apply(currentActivation, instruction.params))
                || (currentActivation.router && currentActivation.router.loadUrl));
        }

        function dequeueInstruction() {
            if (isProcessing()) {
                return;
            }

            var instruction = queue.shift();
            queue = [];

            if (!instruction) {
                return;
            }

            if (instruction.router) {
                var fullFragment = instruction.fragment;
                if (instruction.queryString) {
                    fullFragment += "?" + instruction.queryString;
                }

                instruction.router.loadUrl(fullFragment);
                return;
            }

            isProcessing(true);
            router.activeInstruction(instruction);

            if (canReuseCurrentActivation(instruction)) {
                ensureActivation(activator.create(), currentActivation, instruction);
            } else {
                system.acquire(instruction.config.moduleId).then(function(module) {
                    var instance = system.resolveObject(module);
                    ensureActivation(activeItem, instance, instruction);
                }).fail(function(err){
                        system.error('Failed to load routed module (' + instruction.config.moduleId + '). Details: ' + err.message);
                    });
            }
        }

        function queueInstruction(instruction) {
            queue.unshift(instruction);
            dequeueInstruction();
        }

        // Given a route, and a URL fragment that it matches, return the array of
        // extracted decoded parameters. Empty or unmatched parameters will be
        // treated as `null` to normalize cross-browser behavior.
        function createParams(routePattern, fragment, queryString) {
            var params = routePattern.exec(fragment).slice(1);

            for (var i = 0; i < params.length; i++) {
                var current = params[i];
                params[i] = current ? decodeURIComponent(current) : null;
            }

            var queryParams = router.parseQueryString(queryString);
            if (queryParams) {
                params.push(queryParams);
            }

            return {
                params:params,
                queryParams:queryParams
            };
        }

        function configureRoute(config){
            router.trigger('router:route:before-config', config, router);

            if (!system.isRegExp(config)) {
                config.title = config.title || router.convertRouteToTitle(config.route);
                config.moduleId = config.moduleId || router.convertRouteToModuleId(config.route);
                config.hash = config.hash || router.convertRouteToHash(config.route);
                config.routePattern = routeStringToRegExp(config.route);
            }else{
                config.routePattern = config.route;
            }

            router.trigger('router:route:after-config', config, router);

            router.routes.push(config);

            router.route(config.routePattern, function(fragment, queryString) {
                var paramInfo = createParams(config.routePattern, fragment, queryString);
                queueInstruction({
                    fragment: fragment,
                    queryString:queryString,
                    config: config,
                    params: paramInfo.params,
                    queryParams:paramInfo.queryParams
                });
            });
        };

        function mapRoute(config) {
            if(system.isArray(config.route)){
                for(var i = 0, length = config.route.length; i < length; i++){
                    var current = system.extend({}, config);
                    current.route = config.route[i];
                    if(i > 0){
                        delete current.nav;
                    }
                    configureRoute(current);
                }
            }else{
                configureRoute(config);
            }

            return router;
        }

        function addActiveFlag(config) {
            if(config.isActive){
                return;
            }

            config.isActive = ko.computed(function() {
                var theItem = activeItem();
                return theItem && theItem.__moduleId__ == config.moduleId;
            });
        }

        /**
         * Parses a query string into an object.
         * @method parseQueryString
         * @param {string} queryString The query string to parse.
         * @return {object} An object keyed according to the query string parameters.
         */
        router.parseQueryString = function (queryString) {
            var queryObject, pairs;

            if (!queryString) {
                return null;
            }

            pairs = queryString.split('&');

            if (pairs.length == 0) {
                return null;
            }

            queryObject = {};

            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i];
                if (pair === '') {
                    continue;
                }

                var parts = pair.split('=');
                queryObject[parts[0]] = parts[1] && decodeURIComponent(parts[1].replace(/\+/g, ' '));
            }

            return queryObject;
        };

        /**
         * Add a route to be tested when the url fragment changes.
         * @method route
         * @param {RegEx} routePattern The route pattern to test against.
         * @param {function} callback The callback to execute when the route pattern is matched.
         */
        router.route = function(routePattern, callback) {
            router.handlers.push({ routePattern: routePattern, callback: callback });
        };

        /**
         * Attempt to load the specified URL fragment. If a route succeeds with a match, returns `true`. If no defined routes matches the fragment, returns `false`.
         * @method loadUrl
         * @param {string} fragment The URL fragment to find a match for.
         * @return {boolean} True if a match was found, false otherwise.
         */
        router.loadUrl = function(fragment) {
            var handlers = router.handlers,
                queryString = null,
                coreFragment = fragment,
                queryIndex = fragment.indexOf('?');

            if (queryIndex != -1) {
                coreFragment = fragment.substring(0, queryIndex);
                queryString = fragment.substr(queryIndex + 1);
            }

            if(router.relativeToParentRouter){
                var instruction = this.parent.activeInstruction();
                coreFragment = instruction.params.join('/');

                if(coreFragment && coreFragment[0] == '/'){
                    coreFragment = coreFragment.substr(1);
                }

                if(!coreFragment){
                    coreFragment = '';
                }

                coreFragment = coreFragment.replace('//', '/').replace('//', '/');
            }

            coreFragment = coreFragment.replace(trailingSlash, '');

            for (var i = 0; i < handlers.length; i++) {
                var current = handlers[i];
                if (current.routePattern.test(coreFragment)) {
                    current.callback(coreFragment, queryString);
                    return true;
                }
            }

            system.log('Route Not Found');
            router.trigger('router:route:not-found', fragment, router);

            if (currentInstruction) {
                history.navigate(currentInstruction.fragment, { trigger:false, replace:true });
            }

            rootRouter.explicitNavigation = false;
            rootRouter.navigatingBack = false;

            return false;
        };

        /**
         * Updates the document title based on the activated module instance, the routing instruction and the app.title.
         * @method updateDocumentTitle
         * @param {object} instance The activated module.
         * @param {object} instruction The routing instruction associated with the action. It has a `config` property that references the original route mapping config.
         */
        router.updateDocumentTitle = function(instance, instruction) {
            if (instruction.config.title) {
                if (app.title) {
                    document.title = instruction.config.title + " | " + app.title;
                } else {
                    document.title = instruction.config.title;
                }
            } else if (app.title) {
                document.title = app.title;
            }
        };

        /**
         * Save a fragment into the hash history, or replace the URL state if the
         * 'replace' option is passed. You are responsible for properly URL-encoding
         * the fragment in advance.
         * The options object can contain `trigger: false` if you wish to not have the
         * route callback be fired, or `replace: true`, if
         * you wish to modify the current URL without adding an entry to the history.
         * @method navigate
         * @param {string} fragment The url fragment to navigate to.
         * @param {object|boolean} options An options object with optional trigger and replace flags. You can also pass a boolean directly to set the trigger option. Trigger is `true` by default.
         * @return {boolean} Returns true/false from loading the url.
         */
        router.navigate = function(fragment, options) {
            if(fragment && fragment.indexOf('://') != -1){
                window.location.href = fragment;
                return true;
            }

            rootRouter.explicitNavigation = true;
            return history.navigate(fragment, options);
        };

        /**
         * Navigates back in the browser history.
         * @method navigateBack
         */
        router.navigateBack = function() {
            history.navigateBack();
        };

        router.attached = function() {
            setTimeout(function() {
                isProcessing(false);
                router.trigger('router:navigation:attached', currentActivation, currentInstruction, router);
                dequeueInstruction();
            }, 10);
        };

        router.compositionComplete = function(){
            router.trigger('router:navigation:composition-complete', currentActivation, currentInstruction, router);
        };

        /**
         * Converts a route to a hash suitable for binding to a link's href.
         * @method convertRouteToHash
         * @param {string} route
         * @return {string} The hash.
         */
        router.convertRouteToHash = function(route) {
            if(router.relativeToParentRouter){
                var instruction = router.parent.activeInstruction(),
                    hash = instruction.config.hash + '/' + route;

                if(history._hasPushState){
                    hash = '/' + hash;
                }

                hash = hash.replace('//', '/').replace('//', '/');
                return hash;
            }

            if(history._hasPushState){
                return route;
            }

            return "#" + route;
        };

        /**
         * Converts a route to a module id. This is only called if no module id is supplied as part of the route mapping.
         * @method convertRouteToModuleId
         * @param {string} route
         * @return {string} The module id.
         */
        router.convertRouteToModuleId = function(route) {
            return stripParametersFromRoute(route);
        };

        /**
         * Converts a route to a displayable title. This is only called if no title is specified as part of the route mapping.
         * @method convertRouteToTitle
         * @param {string} route
         * @return {string} The title.
         */
        router.convertRouteToTitle = function(route) {
            var value = stripParametersFromRoute(route);
            return value.substring(0, 1).toUpperCase() + value.substring(1);
        };

        /**
         * Maps route patterns to modules.
         * @method map
         * @param {string|object|object[]} route A route, config or array of configs.
         * @param {object} [config] The config for the specified route.
         * @chainable
         * @example
 router.map([
    { route: '', title:'Home', moduleId: 'homeScreen', nav: true },
    { route: 'customer/:id', moduleId: 'customerDetails'}
 ]);
         */
        router.map = function(route, config) {
            if (system.isArray(route)) {
                for (var i = 0; i < route.length; i++) {
                    router.map(route[i]);
                }

                return router;
            }

            if (system.isString(route) || system.isRegExp(route)) {
                if (!config) {
                    config = {};
                } else if (system.isString(config)) {
                    config = { moduleId: config };
                }

                config.route = route;
            } else {
                config = route;
            }

            return mapRoute(config);
        };

        /**
         * Builds an observable array designed to bind a navigation UI to. The model will exist in the `navigationModel` property.
         * @method buildNavigationModel
         * @param {number} defaultOrder The default order to use for navigation visible routes that don't specify an order. The defualt is 100.
         * @chainable
         */
        router.buildNavigationModel = function(defaultOrder) {
            var nav = [], routes = router.routes;
            defaultOrder = defaultOrder || 100;

            for (var i = 0; i < routes.length; i++) {
                var current = routes[i];

                if (current.nav) {
                    if (!system.isNumber(current.nav)) {
                        current.nav = defaultOrder;
                    }

                    addActiveFlag(current);
                    nav.push(current);
                }
            }

            nav.sort(function(a, b) { return a.nav - b.nav; });
            router.navigationModel(nav);

            return router;
        };

        /**
         * Configures how the router will handle unknown routes.
         * @method mapUnknownRoutes
         * @param {string|function} [config] If not supplied, then the router will map routes to modules with the same name.
         * If a string is supplied, it represents the module id to route all unknown routes to.
         * Finally, if config is a function, it will be called back with the route instruction containing the route info. The function can then modify the instruction by adding a moduleId and the router will take over from there.
         * @param {string} [replaceRoute] If config is a module id, then you can optionally provide a route to replace the url with.
         * @chainable
         */
        router.mapUnknownRoutes = function(config, replaceRoute) {
            var catchAllRoute = "*catchall";
            var catchAllPattern = routeStringToRegExp(catchAllRoute);

            router.route(catchAllPattern, function (fragment, queryString) {
                var paramInfo = createParams(catchAllPattern, fragment, queryString);
                var instruction = {
                    fragment: fragment,
                    queryString: queryString,
                    config: {
                        route: catchAllRoute,
                        routePattern: catchAllPattern
                    },
                    params: paramInfo.params,
                    queryParams: paramInfo.queryParams
                };

                if (!config) {
                    instruction.config.moduleId = fragment;
                } else if (system.isString(config)) {
                    instruction.config.moduleId = config;
                    if(replaceRoute){
                        history.navigate(replaceRoute, { trigger:false, replace:true });
                    }
                } else if (system.isFunction(config)) {
                    var result = config(instruction);
                    if (result && result.then) {
                        result.then(function() {
                            router.trigger('router:route:before-config', instruction.config, router);
                            router.trigger('router:route:after-config', instruction.config, router);
                            queueInstruction(instruction);
                        });
                        return;
                    }
                } else {
                    instruction.config = config;
                    instruction.config.route = catchAllRoute;
                    instruction.config.routePattern = catchAllPattern;
                }

                router.trigger('router:route:before-config', instruction.config, router);
                router.trigger('router:route:after-config', instruction.config, router);
                queueInstruction(instruction);
            });

            return router;
        };

        /**
         * Resets the router by removing handlers, routes, event handlers and previously configured options.
         * @method reset
         * @chainable
         */
        router.reset = function() {
            currentInstruction = currentActivation = undefined;
            router.handlers = [];
            router.routes = [];
            router.off();
            delete router.options;
            return router;
        };

        /**
         * Makes all configured routes and/or module ids relative to a certain base url.
         * @method makeRelative
         * @param {string|object} settings If string, the value is used as the base for routes and module ids. If an object, you can specify `route` and `moduleId` separately. In place of specifying route, you can set `fromParent:true` to make routes automatically relative to the parent router's active route.
         * @chainable
         */
        router.makeRelative = function(settings){
            if(system.isString(settings)){
                settings = {
                    moduleId:settings,
                    route:settings
                };
            }

            if(settings.moduleId && !endsWith(settings.moduleId, '/')){
                settings.moduleId += '/';
            }

            if(settings.route && !endsWith(settings.route, '/')){
                settings.route += '/';
            }

            if(settings.fromParent){
                router.relativeToParentRouter = true;
            }

            router.on('router:route:before-config').then(function(config){
                if(settings.moduleId){
                    config.moduleId = settings.moduleId + config.moduleId;
                }

                if(settings.route){
                    if(config.route === ''){
                        config.route = settings.route.substring(0, settings.route.length - 1);
                    }else{
                        config.route = settings.route + config.route;
                    }
                }
            });

            return router;
        };

        /**
         * Creates a child router.
         * @method createChildRouter
         * @return {Router} The child router.
         */
        router.createChildRouter = function() {
            var childRouter = createRouter();
            childRouter.parent = router;
            return childRouter;
        };

        return router;
    };

    /**
     * @class RouterModule
     * @extends Router
     * @static
     */
    rootRouter = createRouter();
    rootRouter.explicitNavigation = false;
    rootRouter.navigatingBack = false;

    /**
     * Activates the router and the underlying history tracking mechanism.
     * @method activate
     * @return {Promise} A promise that resolves when the router is ready.
     */
    rootRouter.activate = function(options) {
        return system.defer(function(dfd) {
            startDeferred = dfd;
            rootRouter.options = system.extend({ routeHandler: rootRouter.loadUrl }, rootRouter.options, options);

            history.activate(rootRouter.options);

            if(history._hasPushState){
                var routes = rootRouter.routes,
                    i = routes.length;

                while(i--){
                    var current = routes[i];
                    current.hash = current.hash.replace('#', '');
                }
            }

            $(document).delegate("a", 'click', function(evt){
                rootRouter.explicitNavigation = true;

                if(history._hasPushState){
                    if(!evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey){
                        // Get the anchor href and protcol
                        var href = $(this).attr("href");
                        var protocol = this.protocol + "//";

                        // Ensure the protocol is not part of URL, meaning its relative.
                        // Stop the event bubbling to ensure the link will not cause a page refresh.
                        if (!href || (href.charAt(0) !== "#" && href.slice(protocol.length) !== protocol)) {
                            evt.preventDefault();
                            history.navigate(href);
                        }
                    }
                }
            });
        }).promise();
    };

    /**
     * Disable history, perhaps temporarily. Not useful in a real app, but possibly useful for unit testing Routers.
     * @method deactivate
     */
    rootRouter.deactivate = function() {
        history.deactivate();
    };

    /**
     * Installs the router's custom ko binding handler.
     * @method install
     */
    rootRouter.install = function(){
        ko.bindingHandlers.router = {
            init: function() {
                return { controlsDescendantBindings: true };
            },
            update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var settings = ko.utils.unwrapObservable(valueAccessor()) || {};

                if (settings.__router__) {
                    settings = {
                        model:settings.activeItem(),
                        attached:settings.attached,
                        compositionComplete:settings.compositionComplete,
                        activate: false
                    };
                } else {
                    var theRouter = ko.utils.unwrapObservable(settings.router || viewModel.router) || rootRouter;
                    settings.model = theRouter.activeItem();
                    settings.attached = theRouter.attached;
                    settings.compositionComplete = theRouter.compositionComplete;
                    settings.activate = false;
                }

                composition.compose(element, settings, bindingContext);
            }
        };

        ko.virtualElements.allowedBindings.router = true;
    };

    return rootRouter;
});

define('viewmodels/shell',['plugins/router', 'durandal/app'], function (router, app) {

    
    var selectedSubMenu = ko.observable('');
    var selectedMainMenu = ko.observable('main');
    var version = app.version;
    
    return {
        selectedSubMenu: selectedSubMenu,
        selectedMainMenu: selectedMainMenu,
        version: version,
        router: router,
        search: function () {
            //It's really easy to show a message box.
            //You can add custom options too. Also, it returns a promise for the user's response.
            app.showMessage('Search not yet implemented...');
        },
        activate: function () {
            router.map([
                { route: '', title: 'Dashboard', moduleId: 'viewmodels/dashboard', nav: true },
                { route: 'Aguda', title: 'Aguda', moduleId: 'viewmodels/aguda', nav: true },
                { route: 'Procedures', title: 'Procedures', moduleId: 'viewmodels/procedures', nav: true },
                { route: 'HamInIsrael', title: 'Ham In Israel', moduleId: 'viewmodels/haminisrael', nav: true },
                { route: 'HagalMain', title: 'Hagal', moduleId: 'viewmodels/hagalmain', nav: true },
                { route: 'About', title: 'About', moduleId: 'viewmodels/about', nav: true },
                { route: 'EventRegistration', title: 'Event Registration', moduleId: 'viewmodels/event_registration', nav: true },
                { route: 'EventRegistrationAdmin', title: 'Event Registration Admin', moduleId: 'viewmodels/event_registration_admin', nav: false },
                { route: 'Membership', title: 'Membership', moduleId: 'viewmodels/membership', nav: true },
                { route: 'Repeaters', title: 'Repeaters', moduleId: 'viewmodels/repeaters', nav: true },
                { route: 'RepeatersMap', title: 'Repeaters Map', moduleId: 'viewmodels/repeatersmap', nav: true },
                { route: 'Hagal', title: 'Hagal', moduleId: 'viewmodels/hagal', nav: true },
                { route: 'HagalArchive', title: 'Hagal Archive', moduleId: 'viewmodels/hagalarchive', nav: true },
                { route: 'Protocols', title: 'Protocols', moduleId: 'viewmodels/protocols', nav: true },
                { route: 'QSL', title: 'QSL', moduleId: 'viewmodels/qsl', nav: true },
                { route: 'Directors', title: 'Directors', moduleId: 'viewmodels/directors', nav: true },
                { route: 'Contact', title: 'Contact', moduleId: 'viewmodels/contact', nav: true },
                { route: 'Ham', title: 'Ham', moduleId: 'viewmodels/ham', nav: true },
                { route: 'Regulations', title: 'Regulations', moduleId: 'viewmodels/regulations', nav: true },
                { route: 'EchoLink', title: 'EchoLink', moduleId: 'viewmodels/echolink', nav: true },
                { route: 'WWFF', title: 'WWFF', moduleId: 'viewmodels/wwff', nav: true },
                { route: 'Freq', title: 'Freq', moduleId: 'viewmodels/freq', nav: true },
                { route: 'Bandplan', title: 'Bandplan', moduleId: 'viewmodels/english/freq', nav: true },
                { route: 'Onairhagal', title: 'Onairhagal', moduleId: 'viewmodels/onairhagal', nav: true },
                { route: 'Holyland', title: 'Holyland', moduleId: 'viewmodels/holyland', nav: true },
                { route: 'SukotResults', title: 'SukotResults', moduleId: 'viewmodels/sukotresults', nav: true },
                { route: 'News', title: 'News', moduleId: 'viewmodels/news', nav: true },
                { route: 'Emergency', title: 'Emergency', moduleId: 'viewmodels/emergency', nav: true },
                { route: 'CEPT', title: 'CEPT', moduleId: 'viewmodels/english/cept', nav: true },
                { route: '4X4Z', title: '4X4Z', moduleId: 'viewmodels/english/4x4z', nav: true },
                { route: '4Z8', title: '4Z8', moduleId: 'viewmodels/english/4z8', nav: true },
                { route: 'HolylandContest', title: 'Holyland Contest', moduleId: 'viewmodels/holyland/holylandcontest', nav: true },
                { route: 'HolylandAward', title: 'Holyland Award', moduleId: 'viewmodels/holyland/holylandaward', nav: true },
                { route: 'HolylandResults', title: 'Holyland Contest Results', moduleId: 'viewmodels/holyland/holylandresults', nav: true },
                { route: 'HolylandResultsISR', title: 'Holyland Contest Results - Israeli Stations', moduleId: 'viewmodels/holyland/holylandresults_isr', nav: true },
                { route: 'LogUpload', title: 'Log Upload', moduleId: 'viewmodels/holyland/logupload', nav: true },
                { route: 'LogUpload2', title: 'Log Upload', moduleId: 'viewmodels/holyland/logupload2', nav: true },
                { route: 'SilentKeyForest', title: 'Silent Key Forest', moduleId: 'viewmodels/english/skf', nav: true },
                { route: 'Meetings', title: 'Meetings', moduleId: 'viewmodels/english/meetings', nav: true },
                { route: 'EN_Membership', title: 'Membership', moduleId: 'viewmodels/english/membership', nav: true },
                { route: 'Beacons', title: 'Beacons', moduleId: 'viewmodels/english/beacons', nav: true },
                { route: 'EN_Repeaters', title: 'Repeaters', moduleId: 'viewmodels/english/repeaters', nav: true },
                { route: 'PA', title: 'Private Area', moduleId: 'viewmodels/pa', nav: true },
                { route: 'Media', title: 'Media', moduleId: 'viewmodels/media', nav: true },
                { route: 'DXpeditions', title: 'DXpeditions', moduleId: 'viewmodels/dxpeditions', nav: true },
                { route: 'NewsManager', title: 'News Manager', moduleId: 'viewmodels/back_office/newsmanager', nav: false },
                { route: 'Market', title: 'Market', moduleId: 'viewmodels/market', nav: true },
                { route: 'Register', title: 'Register', moduleId: 'viewmodels/register', nav: true },
                { route: 'OnlineCourse', title: 'Online Course', moduleId: 'viewmodels/onlinecourse', nav: true },
                { route: 'Shop', title: 'Shop', moduleId: 'viewmodels/shop', nav: true },
                { route: 'Import', title: 'Import', moduleId: 'viewmodels/import', nav: true },
                { route: 'Exams', title: 'Exams', moduleId: 'viewmodels/exams', nav: true },
                { route: 'ExamForms', title: 'ExamForms', moduleId: 'viewmodels/examforms', nav: true },
                { route: 'Squares', title: 'Squares', moduleId: 'viewmodels/squares', nav: true },
                { route: 'HolylandSquares', title: 'Holyland Squares', moduleId: 'viewmodels/holyland/holylandsquares', nav: true },
				{ route: 'HolylandLogs', title: 'Holyland Logs', moduleId: 'viewmodels/holyland/holylandlogs', nav: true },
                { route: 'Certificategenerator', title: 'Certificate Generator', moduleId: 'viewmodels/holyland/certificategenerator', nav: true },
                { route: 'HolylandRules', title: 'Holyland Rules', moduleId: 'viewmodels/holyland/holylandrules', nav: true },
                { route: 'Gallery', title: 'Gallery', moduleId: 'viewmodels/gallery', nav: true },
                
            ]).buildNavigationModel();

            return router.activate();
        },
        compositionComplete: function () {
            !function (d, s, id) { var js, fjs = d.getElementsByTagName(s)[0], p = /^http:/.test(d.location) ? 'http' : 'https'; if (!d.getElementById(id)) { js = d.createElement(s); js.id = id; js.src = p + "://platform.twitter.com/widgets.js"; fjs.parentNode.insertBefore(js, fjs); } }(document, "script", "twitter-wjs");
        }
    };
});
define('viewmodels/about',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('about');
            shell.selectedMainMenu('aguda');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/aguda',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('');
            shell.selectedMainMenu('aguda');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/components/events',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("Server/events.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }

    var vm = {
        getItems: getItems,
        compositionComplete: function () {
            getItems();
        },
        items: items
    };

    return vm;
});
define('viewmodels/components/features',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("Server/features.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }

    var vm = {
        getItems: getItems,
        compositionComplete: function () {
            getItems();
        },
        items: items
    };

    return vm;
});
define('viewmodels/components/news',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("Server/news.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }

    var vm = {
        getItems: getItems,
        compositionComplete: function () {
            getItems();
        },
        items: items
    };

    return vm;
});
define('viewmodels/components/news_abstract',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("Server/news_abstract.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }

    var vm = {
        getItems: getItems,
        compositionComplete: function () {
            getItems();
        },
        items: items
    };

    return vm;
});
define('viewmodels/components/posts',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("Server/posts.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }

    var vm = {
        getItems: getItems,
        compositionComplete: function () {
            getItems();
        },
        items: items
    };

    return vm;
});
define('viewmodels/contact',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var initMap = function () {

        //OLD VERSION
        //map = new GMaps({
        //    div: '#map',
        //    lat: 32.034412,
        //    lng: 34.893830
        //});
        //var marker = map.addMarker({
        //    lat: 32.034412,
        //    lng: 34.893830,
        //    title: 'Loop, Inc.'
        //});

        var latlng1 = new google.maps.LatLng(32.034412, 34.893830);
        var latlng2 = new google.maps.LatLng(32.054412, 34.873830);
        var mapOptions = {
            center: latlng1,
            zoom: 15
        };
        var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        //map.data.loadGeoJson('https://storage.googleapis.com/maps-devrel/google.json');

        var marker = new google.maps.Marker({ position: latlng1, map: map, animation: google.maps.Animation.DROP, title: "בנין חיל הקשר" });

        //var R1 = {
        //    strokeColor: '#000066',
        //    strokeOpacity: 0.8,
        //    strokeWeight: 1,
        //    fillColor: '#000066',
        //    fillOpacity: 0.35,
        //    map: map,
        //    center: latlng1,
        //    radius: 500
        //};
        //var R2 = {
        //    strokeColor: '#660000',
        //    strokeOpacity: 0.8,
        //    strokeWeight: 1,
        //    fillColor: '#660000',
        //    fillOpacity: 0.35,
        //    map: map,
        //    center: latlng2,
        //    radius: 700
        //};
        //// Add the circle for this city to the map.
        //C1 = new google.maps.Circle(R1);
        //C2 = new google.maps.Circle(R2);

        //google.maps.event.addListener(C1, 'mouseover', function () {
        //    C2.set('strokeOpacity', 0.1);
        //    C2.set('fillOpacity', 0.1);
        //});
        //google.maps.event.addListener(C1, 'mouseout', function () {
        //    C2.set('strokeOpacity', 0.8);
        //    C2.set('fillOpacity', 0.35);
        //});
        //google.maps.event.addListener(C2, 'mouseover', function () {
        //    C1.set('strokeOpacity', 0.1);
        //    C1.set('fillOpacity', 0.1);
        //});
        //google.maps.event.addListener(C2, 'mouseout', function () {
        //    C1.set('strokeOpacity', 0.8);
        //    C1.set('fillOpacity', 0.35);
        //});

    }

    var vm = {
        compositionComplete: function () {
            initMap();
        },
        activate: function () {
            shell.selectedSubMenu('');
            shell.selectedMainMenu('contact');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/dashboard',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var activeImage = ko.observable('1');
    var getActiveImage = function ()
    {
        return Math.floor(Math.random() * 7 + 1);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('');
            shell.selectedMainMenu('main');
            activeImage(getActiveImage());
        },
        compositionComplete: function ()
        {
            //$('.carousel').carousel({
            //    interval: 5000,
            //    pause: 'none'
            //});
            //$('.tooltips').tooltip();
            //$('.popovers').popover();
        },
        getActiveImage: getActiveImage,
        activeImage: activeImage
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/directors',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('directors');
            shell.selectedMainMenu('aguda');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/dxpeditions',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('dxpeditions');
            shell.selectedMainMenu('ham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/echolink',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('echolink');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/emergency',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('emergency');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/english/4x4z',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('4x4z');
            shell.selectedMainMenu('english');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/english/4z8',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('4z8');
            shell.selectedMainMenu('english');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/english/beacons',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('beacons');
            shell.selectedMainMenu('english');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/english/cept',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('cept');
            shell.selectedMainMenu('english');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/english/freq',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('bandplan');
            shell.selectedMainMenu('english');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/english/meetings',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('meetings');
            shell.selectedMainMenu('english');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/english/membership',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('membership');
            shell.selectedMainMenu('english');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/english/repeaters',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('repeaters');
            shell.selectedMainMenu('english');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/english/skf',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var skf = ko.observableArray();
    var skfcount = ko.observable();
    var searchInput = ko.observable();

    this.getSKF = function () {
        httpService.get("Server/skf.php?d=" + Date.now()).done(function (data) { skf(data); }).error(utilities.handleError);
    }
    this.getSKFCount = function () {
        httpService.get("Server/skf_count.php?d=" + Date.now()).done(function (data) { skfcount(data); }).error(utilities.handleError);
    }
    

    var vm = {
        activate: function () {
            shell.selectedSubMenu('skf');
            shell.selectedMainMenu('english');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
        },
        compositionComplete: function () {
            getSKF();
            getSKFCount();
            searchInput('');
        },
        skf: skf,
        skfcount: skfcount,
        searchInput: searchInput
    };

    return vm;
});
define('viewmodels/event_registration',['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {    

    var shell = require('viewmodels/shell');

    var name = ko.observable();
    var callsign = ko.observable();
    var email = ko.observable();
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("Server/get_events.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }
    
    this.Send = ko.asyncCommand({
        execute: function (complete) {
            if (callsign() == null) {
                displayService.display("אל תשכח להכניס אות קריאה..", "error");
            }
            else if (name() == null) {
                displayService.display("אל תשכח להכניס שם..", "error");
            }
            else if (email() == null) {
                displayService.display("אל תשכח להכניס אימייל..", "error");
            }
            else {
                var info = {
                    'info':
                    {
                        'name': name(),
                        'callsign': callsign(),
                        'email': email(),
                        'event_id': this.id
                    }
                };
                httpService.post("Server/event_registration.php", info).done(function (data) {
                    displayService.display(data);
                    complete(true);
                    //callsign('');
                    //name('');
                    //email('');
                }).error(function () { displayService.display("Something went wrong..", "error"); utilities.handleError(); complete(true); });
            }
        },
        canExecute: function (isExecuting) {
            //return !isExecuting;
            return true;
        }
    });

    var vm = {
        activate: function () {
            shell.selectedSubMenu('eventregistration');
            shell.selectedMainMenu('aguda');
            getItems();
        },
        compositionComplete: function () {
            
        },
        name: name,
        callsign: callsign,
        email: email,
        getItems: getItems,
        items: items
    };


    return vm;
});

define('viewmodels/event_registration_admin',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var list = ko.observableArray();
    var events = ko.observableArray();

    var getList = function () {
        httpService.get("Server/get_event_registrants.php?d=" + Date.now()).done(function (result) { list(result); }).error(utilities.handleError);
    }
    var getEvents= function () {
        httpService.get("Server/get_events.php?d=" + Date.now()).done(function (data) { events(data); }).error(utilities.handleError);
    }

    var getEventRegistrants = function (eventid) {
        return ko.utils.arrayFilter(list(), function (registrant) {
            return (registrant.event_id === eventid);
        });
    }
    
    
    var vm = {
        activate: function () {
            getList();
            getEvents();
        },
        compositionComplete: function () {
            
        },
        list: list,
        events: events,
        getEventRegistrants: getEventRegistrants
    };

    return vm;
});
define('viewmodels/examforms',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('examforms');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/exams',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('exams');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/freq',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('freq');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/gallery',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    //properties
    this.list = ko.observableArray();

    //methods
    this.getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/get_videos.php?d=" + Date.now(),
        }).done(function (data) {
            list(data);
        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    var vm = {
        compositionComplete: function (view) {
            getData();
        },
        activate: function () {
            shell.selectedSubMenu('videogallery');
            shell.selectedMainMenu('gallery');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/hagal',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('hagal');
            shell.selectedMainMenu('hagal');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/hagalarchive',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var hagal = ko.observableArray();

    this.getHagal = function () {
        httpService.get("Server/hagal.php?d=" + Date.now()).done(function (data) { hagal(data); }).error(utilities.handleError);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('hagalarchive');
            shell.selectedMainMenu('hagal');
        },
        compositionComplete: function () {
            getHagal();
        },
        hagal: hagal
    };

    return vm;
});
define('viewmodels/hagalmain',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('');
            shell.selectedMainMenu('hagal');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/ham',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('ham');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/haminisrael',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/holyland',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylamd');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/holyland/certificategenerator',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('certificategenerator');
            shell.selectedMainMenu('holyland');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/holyland/holylandaward',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandaward');
            shell.selectedMainMenu('holyland');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/holyland/holylandcontest',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandcontest');
            shell.selectedMainMenu('holyland');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/holyland/holylandlogs',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var logs = ko.observableArray();
    var counter = ko.observableArray();
    var DXCCcounter = ko.observableArray();
    var searchInput = ko.observable();

    this.getlogs = function () {
        httpService.get("Server/hl_2015.php?d=" + Date.now()).done(function (data) {
            logs(data);
            counter(Enumerable.From(logs()).Count());
            DXCCcounter(Enumerable.From(logs()).Select("$.country").Distinct().Count());
        }).error(utilities.handleError);
    }  
this.getCount = function () {
    httpService.get("Server/hl2015_count.php?d=" + Date.now()).done(function (data) {
        counter(data);
    }).error(utilities.handleError);
    }	

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandlogs');
            shell.selectedMainMenu('holyland');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
			getlogs();
			//getCount();
            searchInput('');
        },
        compositionComplete: function () {
            
        },
        logs: logs,
        counter: counter,
        DXCCcounter:DXCCcounter,
		searchInput: searchInput,
        year: moment()._d.getUTCFullYear()
    };

    return vm;
});
define('viewmodels/holyland/holylandresults',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var searchInput = ko.observable();
    this.results = ko.observableArray();

    this.years = ko.computed(function () {
        var temp = Enumerable.From(this.results()).Select("i=>i.year").Distinct().OrderBy(function (x) { return x.year }).Reverse().ToArray();
        return temp;
    }, this);

    this.categories = ko.computed(function () {
            var temp = Enumerable.From(this.results()).Select("i=>i.category").Distinct().ToArray();
            return temp;
        }, this);

    this.getResults = function () {
        httpService.get("Server/hl.php?d=" + Date.now()).done(function (data) { results(data); }).error(utilities.handleError);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandresults');
            shell.selectedMainMenu('holyland');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
            getResults();
        },
        compositionComplete: function () {
            
        },
        searchInput: searchInput
    };

    return vm;
});
define('viewmodels/holyland/holylandresults_isr',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var searchInput = ko.observable();
    this.results = ko.observableArray();

    this.years = ko.computed(function () {
        var temp = Enumerable.From(this.results()).Select("i=>i.year").Distinct().OrderBy(function (x) { return x.year }).Reverse().ToArray();
        return temp;
    }, this);

    this.categories = ko.computed(function () {
            var temp = Enumerable.From(this.results()).Select("i=>i.category").Distinct().ToArray();
            return temp;
        }, this);

    this.getResults = function () {
        httpService.get("Server/hl_4x.php?d=" + Date.now()).done(function (data) { results(data); }).error(utilities.handleError);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandresults_isr');
            shell.selectedMainMenu('holyland');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
            getResults();
        },
        compositionComplete: function () {
            
        },
        searchInput: searchInput
    };

    return vm;
});
define('viewmodels/holyland/holylandrules',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandrules');
            shell.selectedMainMenu('holyland');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/holyland/holylandsquares',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var searchInput = ko.observable();

    var vm = {
        activate: function () {
            shell.selectedSubMenu('holylandsquares');
            shell.selectedMainMenu('holyland');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
        },
        compositionComplete: function () {
            searchInput('');
        },
        searchInput: searchInput
    };

    return vm;
});
define('viewmodels/holyland/logupload',['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {

    var shell = require('viewmodels/shell');


    //var email = ko.observable();
    //var category = ko.observable();
    //var categories = ko.observableArray(['SWL', 'SSB', 'MULTIOP', 'MIX', 'CHECKLOG', 'QRP', 'DIGI', 'CW']);
    var file = ko.observable();
    var uploader;

    var Clear = function () {
        //$('#registration-form').parsley().reset();
        //email("");
        //category("");
        file("");
        uploader.removeCurrent();
    }

    var Send = ko.asyncCommand({
        execute: function (complete) {
            //$('#registration-form').parsley().validate();
            //if ($('#registration-form').parsley().isValid()) {
                if (uploader.getQueueSize() > 0) {
                    uploader.submit();
                }
                else {
                    displayService.display('Do not forget to select your log file', 'error');
                }
            //}
            complete(true);
        },
        canExecute: function (isExecuting) {
            return !isExecuting;
        }
    });

    this.safe_tags = function (str) {
        return String(str)
                 .replace(/&/g, '&amp;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#39;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');
    }

    var SetTooltips = function () {
        //$('#mobile').tooltip();
        //$('#phone').tooltip();
        //$('#id').tooltip();
        //$('#licensenum').tooltip();
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('logupload');
            shell.selectedMainMenu('holyland');
        },
        compositionComplete: function () {
            SetTooltips();
            $('.selectpicker').selectpicker();
            var btn = document.getElementById('upload-btn'),
       wrap = document.getElementById('pic-progress-wrap'),
       picBox = document.getElementById('picbox'),
       errBox = document.getElementById('errormsg');


            uploader = new ss.SimpleUpload({
                button: btn,
                url: 'Server/uploadHandler.php?dir=log',
                //progressUrl: 'Server/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                maxSize: 300,
                allowedExtensions: ['adi', 'txt', 'cabrillo.txt', 'log', 'cbr'],
                //accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (filename, extension, btn) {
                    file(filename);
                },
                onExtError: function (filename, extension) {
                    //alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only ADI, ADIF, and CAB files are allowed.');
                    displayService.display(filename + ' is not a permitted file type.' + "\n\n" + 'Only ADI, TXT, LOG and CBR files are allowed.', 'error');
                },
                onSizeError: function (filename, fileSize) {
                    //alert(filename + ' is too big. (300K max file size)');
                    displayService.display(filename + ' is too big. (300K max file size)', 'error');
                },
                onSubmit: function (filename, ext) {
                    var prog = document.createElement('div'),
                        outer = document.createElement('div'),
                        bar = document.createElement('div'),
                        size = document.createElement('div');

                    prog.className = 'prog';
                    size.className = 'size';
                    outer.className = 'progress progress-striped active';
                    bar.className = 'progress-bar progress-bar-success';

                    outer.appendChild(bar);
                    prog.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(filename) + ' - </span>';
                    prog.appendChild(size);
                    prog.appendChild(outer);
                    wrap.appendChild(prog); // 'wrap' is an element on the page

                    this.setProgressBar(bar);
                    this.setProgressContainer(prog);
                    this.setFileSizeBox(size);

                    errBox.innerHTML = '';
                    //btn.value = 'Choose another file';

                },
                startXHR: function () {
                    // Dynamically add a "Cancel" button to be displayed when upload begins
                    // By doing it here ensures that it will only be added in browses which 
                    // support cancelling uploads
                    var abort = document.createElement('button');

                    wrap.appendChild(abort);
                    abort.className = 'btn btn-sm btn-info';
                    abort.innerHTML = 'Cancel';

                    // Adds click event listener that will cancel the upload
                    // The second argument is whether the button should be removed after the upload
                    // true = yes, remove abort button after upload
                    // false/default = do not remove
                    this.setAbortBtn(abort, true);
                },
                onComplete: function (filename, response) {
                    if (!response) {
                        errBox.innerHTML = 'Unable to upload file';
                        return;
                    }
                    if (response.success === true) {
                        var info = {
                            'info':
                            {
                                //'email': email(), 'category': $('.selectpicker').val(), 'timestamp': response.timestamp, 'filename': response.file
                                'timestamp': response.timestamp, 'filename': response.file
                            }
                        };
                        httpService.post("Server/upload_log.php", info).done(function (data) {
                            if (data.success === true) {
                                displayService.display(data.msg);
                            }
                            else {
                                displayService.display(data.msg, 'error');
                            }
                            Clear();
                        }).error(function () { utilities.handleError(); });

                    } else {
                        if (response.msg) {
                            errBox.innerHTML = response.msg;
                        } else {
                            errBox.innerHTML = 'Unable to upload file';
                        }
                    }
                }
            });

        },

        //email: email,
        //category: category,
        //categories: categories,
        file: file,
        Clear: Clear,
        Send: Send,
        uploader: uploader
    };


    return vm;
});




define('viewmodels/holyland/logupload2',['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {

    var shell = require('viewmodels/shell');


    //var email = ko.observable();
    //var category = ko.observable();
    //var categories = ko.observableArray(['SWL', 'SSB', 'MULTIOP', 'MIX', 'CHECKLOG', 'QRP', 'DIGI', 'CW']);
    var file = ko.observable();
    var uploader;

    var Clear = function () {
        //$('#registration-form').parsley().reset();
        //email("");
        //category("");
        file("");
        uploader.removeCurrent();
    }

    var Send = ko.asyncCommand({
        execute: function (complete) {
            //$('#registration-form').parsley().validate();
            //if ($('#registration-form').parsley().isValid()) {
                if (uploader.getQueueSize() > 0) {
                    uploader.submit();
                }
                else {
                    displayService.display('Do not forget to select your log file', 'error');
                }
            //}
            complete(true);
        },
        canExecute: function (isExecuting) {
            return !isExecuting;
        }
    });

    this.safe_tags = function (str) {
        return String(str)
                 .replace(/&/g, '&amp;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#39;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');
    }

    var SetTooltips = function () {
        //$('#mobile').tooltip();
        //$('#phone').tooltip();
        //$('#id').tooltip();
        //$('#licensenum').tooltip();
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('logupload');
            shell.selectedMainMenu('holyland');
        },
        compositionComplete: function () {
            SetTooltips();
            $('.selectpicker').selectpicker();
            var btn = document.getElementById('upload-btn'),
       wrap = document.getElementById('pic-progress-wrap'),
       picBox = document.getElementById('picbox'),
       errBox = document.getElementById('errormsg');


            uploader = new ss.SimpleUpload({
                button: btn,
                url: 'Server/uploadHandler.php?dir=log',
                //progressUrl: 'Server/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                maxSize: 300,
                allowedExtensions: ['adi', 'txt', 'cabrillo.txt', 'log', 'cbr'],
                //accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (filename, extension, btn) {
                    file(filename);
                },
                onExtError: function (filename, extension) {
                    //alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only ADI, ADIF, and CAB files are allowed.');
                    displayService.display(filename + ' is not a permitted file type.' + "\n\n" + 'Only ADI, TXT, LOG and CBR files are allowed.', 'error');
                },
                onSizeError: function (filename, fileSize) {
                    //alert(filename + ' is too big. (300K max file size)');
                    displayService.display(filename + ' is too big. (300K max file size)', 'error');
                },
                onSubmit: function (filename, ext) {
                    var prog = document.createElement('div'),
                        outer = document.createElement('div'),
                        bar = document.createElement('div'),
                        size = document.createElement('div');

                    prog.className = 'prog';
                    size.className = 'size';
                    outer.className = 'progress progress-striped active';
                    bar.className = 'progress-bar progress-bar-success';

                    outer.appendChild(bar);
                    prog.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(filename) + ' - </span>';
                    prog.appendChild(size);
                    prog.appendChild(outer);
                    wrap.appendChild(prog); // 'wrap' is an element on the page

                    this.setProgressBar(bar);
                    this.setProgressContainer(prog);
                    this.setFileSizeBox(size);

                    errBox.innerHTML = '';
                    //btn.value = 'Choose another file';

                },
                startXHR: function () {
                    // Dynamically add a "Cancel" button to be displayed when upload begins
                    // By doing it here ensures that it will only be added in browses which 
                    // support cancelling uploads
                    var abort = document.createElement('button');

                    wrap.appendChild(abort);
                    abort.className = 'btn btn-sm btn-info';
                    abort.innerHTML = 'Cancel';

                    // Adds click event listener that will cancel the upload
                    // The second argument is whether the button should be removed after the upload
                    // true = yes, remove abort button after upload
                    // false/default = do not remove
                    this.setAbortBtn(abort, true);
                },
                onComplete: function (filename, response) {
                    if (!response) {
                        errBox.innerHTML = 'Unable to upload file';
                        return;
                    }
                    if (response.success === true) {
                        var info = {
                            'info':
                            {
                                //'email': email(), 'category': $('.selectpicker').val(), 'timestamp': response.timestamp, 'filename': response.file
                                'timestamp': response.timestamp, 'filename': response.file
                            }
                        };
                        httpService.post("Server/upload_log.php", info).done(function (data) {
                            if (data.success === true) {
                                displayService.display(data.msg);
                            }
                            else {
                                displayService.display(data.msg, 'error');
                            }
                            Clear();
                        }).error(function () { utilities.handleError(); });

                    } else {
                        if (response.msg) {
                            errBox.innerHTML = response.msg;
                        } else {
                            errBox.innerHTML = 'Unable to upload file';
                        }
                    }
                }
            });

        },

        //email: email,
        //category: category,
        //categories: categories,
        file: file,
        Clear: Clear,
        Send: Send,
        uploader: uploader
    };


    return vm;
});




define('viewmodels/import',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('import');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/market',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("Server/markolit.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }
    var vm = {
        activate: function () {
            shell.selectedSubMenu('market');
            shell.selectedMainMenu('aguda');
        },
        getItems: getItems,
        compositionComplete: function () {
            getItems();
        },
        items: items
    };

    return vm;
});
define('viewmodels/media',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('media');
            shell.selectedMainMenu('aguda');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/membership',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('membership');
            shell.selectedMainMenu('aguda');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/news',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('');
            shell.selectedMainMenu('news');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/onairhagal',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var files = ko.observableArray();

    this.getHagalFiles = function () {
        httpService.get("Server/broadcasted_hagal.php?d=" + Date.now()).done(function (data) { files(data); }).error(utilities.handleError);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('onairhagal');
            shell.selectedMainMenu('hagal');
            getHagalFiles();
        },
        files: files
    };

    return vm;
});
define('viewmodels/onlinecourse',['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {    

    var shell = require('viewmodels/shell');

    var firstname = ko.observable();
    var lastname = ko.observable();
    var efirstname = ko.observable();
    var elastname = ko.observable();
    var email = ko.observable();
    var birthdate = ko.observable();
    var id = ko.observable();
    var country = ko.observable();
    var gender = ko.observable('m');
    var city = ko.observable();
    var address = ko.observable();
    var house = ko.observable();
    var zip = ko.observable();
    var phone = ko.observable();
    var mobile = ko.observable();
    var reason = ko.observable();
    var cv = ko.observable();
    var file = ko.observable();
    var paymentfile = ko.observable();
    var uploader;
    var uploader2;

    var Clear = function () {
        $('#registration-form').parsley().reset();
        firstname("");
        lastname("");
        efirstname("");
        elastname("");
        email("");
        birthdate("");
        id("");
        country("");
        gender('m');
        city("");
        address("");
        house("");
        zip("");
        phone("");
        mobile("");
        reason("");
        cv("");
        file("");
        uploader.removeCurrent();
    }

    var Send = ko.asyncCommand({
        execute: function (complete) {
            $('#registration-form').parsley().validate();
            if ($('#registration-form').parsley().isValid()) {
                if (uploader.getQueueSize() > 0) {
                    uploader.submit();
                }
                else {
                    if (uploader2.getQueueSize() > 0) {
                        uploader2.submit();
                    }
                    else {
                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': Date.now(), 'filename': ''
                            }
                        };
                        httpService.post("Server/register_online_course.php", info).done(function (data) { alert("OK! " + data); Clear(); complete(true); }).error(function () { alert("Oops, an error has occured"); utilities.handleError(); complete(true); });
                    }
                }
            }
            else {
                complete(true);
            }
        },
        canExecute: function (isExecuting) {
            //return !isExecuting;
            return true;
        }
    });

    this.safe_tags = function (str) {
        return String(str)
                 .replace(/&/g, '&amp;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#39;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');
    }

    var SetTooltips = function ()
    {
        $('#mobile').tooltip();
        $('#phone').tooltip();
        $('#id').tooltip();
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('onlinecourse');
            shell.selectedMainMenu('aguda');
            ko.bindingHandlers.datetimepicker = {
                init: function (element, valueAccessor, allBindingsAccessor) {
                    $(element).datetimepicker({
                        format: 'dd/MM/yyyy HH:mm:ss PP',
                        language: 'en',
                        pick12HourFormat: true
                    }).on("changeDate", function (ev) {
                        var observable = valueAccessor();
                        observable(ev.date);
                    });
                },
                update: function (element, valueAccessor) {
                    var value = ko.utils.unwrapObservable(valueAccessor());
                    $(element).datetimepicker("setValue", value);
                }
            };
        },
        compositionComplete: function () {
            SetTooltips();
            $('#birthdate').datetimepicker({
                pickTime: false
            });
            $("#birthdate").on("dp.change", function (e) {
                birthdate(moment(e.date).format('DD-MM-YYYY'));
            });
            $('#firstname').focus();

            var btn = document.getElementById('upload-btn'),
            btn2 = document.getElementById('payment-btn'),
                
       wrap = document.getElementById('pic-progress-wrap'),
       picBox = document.getElementById('picbox'),
       errBox = document.getElementById('errormsg');


            uploader = new ss.SimpleUpload({
                button: btn,
                url: 'Server/uploadHandler.php?dir=img',
                //progressUrl: 'Server/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                maxSize: 600,
                //allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
                accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (filename, extension, btn) {
                    file(filename);
                },
                onExtError: function (filename, extension) {
                    alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only PNG, JPG, and GIF files are allowed.');
                },
                onSizeError: function (filename, fileSize) {
                    alert(filename + ' is too big. (600K max file size)');
                },
                onSubmit: function (filename, ext) {
                    var prog = document.createElement('div'),
                        outer = document.createElement('div'),
                        bar = document.createElement('div'),
                        size = document.createElement('div');

                    prog.className = 'prog';
                    size.className = 'size';
                    outer.className = 'progress progress-striped active';
                    bar.className = 'progress-bar progress-bar-success';

                    outer.appendChild(bar);
                    prog.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(filename) + ' - </span>';
                    prog.appendChild(size);
                    prog.appendChild(outer);
                    wrap.appendChild(prog); // 'wrap' is an element on the page

                    this.setProgressBar(bar);
                    this.setProgressContainer(prog);
                    this.setFileSizeBox(size);

                    errBox.innerHTML = '';
                    //btn.value = 'Choose another file';

                },
                startXHR: function () {
                    // Dynamically add a "Cancel" button to be displayed when upload begins
                    // By doing it here ensures that it will only be added in browses which 
                    // support cancelling uploads
                    var abort = document.createElement('button');

                    wrap.appendChild(abort);
                    abort.className = 'btn btn-sm btn-info';
                    abort.innerHTML = 'Cancel';

                    // Adds click event listener that will cancel the upload
                    // The second argument is whether the button should be removed after the upload
                    // true = yes, remove abort button after upload
                    // false/default = do not remove
                    this.setAbortBtn(abort, true);
                },
                onComplete: function (filename, response) {
                    file(response.file);
                    if (uploader2.getQueueSize() > 0) {
                        uploader2.submit();
                    }
                    else 
                    {
                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': response.timestamp, 'filename': file, 'paymentfilename': paymentfile
                            }
                        };
                        httpService.post("Server/register_online_course.php", info).done(function (data) { alert("Very well! " + data); Clear(); }).error(function () { utilities.handleError(); });
                    }
                }
            });

            


            uploader2 = new ss.SimpleUpload({
                button: btn2,
                url: 'Server/uploadHandler.php?dir=payment',
                //progressUrl: 'Server/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                maxSize: 600,
                //allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
                accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (filename, extension, btn) {
                    paymentfile(filename);
                },
                onExtError: function (filename, extension) {
                    alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only PNG, JPG, and GIF files are allowed.');
                },
                onSizeError: function (filename, fileSize) {
                    alert(filename + ' is too big. (600K max file size)');
                },
                onSubmit: function (filename, ext) {
                    var prog = document.createElement('div'),
                        outer = document.createElement('div'),
                        bar = document.createElement('div'),
                        size = document.createElement('div');

                    prog.className = 'prog';
                    size.className = 'size';
                    outer.className = 'progress progress-striped active';
                    bar.className = 'progress-bar progress-bar-success';

                    outer.appendChild(bar);
                    prog.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(filename) + ' - </span>';
                    prog.appendChild(size);
                    prog.appendChild(outer);
                    wrap.appendChild(prog); // 'wrap' is an element on the page

                    this.setProgressBar(bar);
                    this.setProgressContainer(prog);
                    this.setFileSizeBox(size);

                    errBox.innerHTML = '';
                    //btn.value = 'Choose another file';

                },
                startXHR: function () {
                    // Dynamically add a "Cancel" button to be displayed when upload begins
                    // By doing it here ensures that it will only be added in browses which 
                    // support cancelling uploads
                    var abort = document.createElement('button');

                    wrap.appendChild(abort);
                    abort.className = 'btn btn-sm btn-info';
                    abort.innerHTML = 'Cancel';

                    // Adds click event listener that will cancel the upload
                    // The second argument is whether the button should be removed after the upload
                    // true = yes, remove abort button after upload
                    // false/default = do not remove
                    this.setAbortBtn(abort, true);
                },
                onComplete: function (filename, response) {
                    if (!response) {
                        errBox.innerHTML = 'Unable to upload file';
                        return;
                    }
                    if (response.success === true) {
                        paymentfile(response.file);
                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': response.timestamp, 'filename': file, 'paymentfilename': paymentfile
                            }
                        };
                        httpService.post("Server/register_online_course.php", info).done(function (data) { alert("Very well! " + data); Clear(); }).error(function () { utilities.handleError(); });

                    } else {
                        if (response.msg) {
                            errBox.innerHTML = response.msg;
                        } else {
                            errBox.innerHTML = 'Unable to upload file';
                        }

                    }
                }
            });
            


        },
        firstname: firstname,
        lastname: lastname,
        efirstname: efirstname,
        elastname: elastname,
        email: email,
        birthdate: birthdate,
        id: id,
        country: country,
        gender: gender,
        city: city,
        address: address,
        house: house,
        zip: zip,
        phone: phone,
        mobile: mobile,
        reason: reason,
        cv: cv,
        file: file,
        paymentfile: paymentfile,
        Clear: Clear,
        Send: Send,
        uploader: uploader,
        uploader2: uploader2
    };


    return vm;
});

define('viewmodels/pa',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('');
            shell.selectedMainMenu('pa');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/procedures',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('about');
            shell.selectedMainMenu('procedures');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/protocols',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var annual = ko.observableArray();
    var protocol = ko.observableArray();
    var finance = ko.observableArray();

    this.getAnnual = function () {
        httpService.get("Server/annual.php?d=" + Date.now()).done(function (data) { annual(data); }).error(utilities.handleError);
    }
    this.getProtocol = function () {
        httpService.get("Server/protocol.php?d=" + Date.now()).done(function (data) { protocol(data); }).error(utilities.handleError);
    }
    this.getFinance = function () {
        httpService.get("Server/finance.php?d=" + Date.now()).done(function (data) { finance(data); }).error(utilities.handleError);
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('protocols');
            shell.selectedMainMenu('aguda');
        },
        compositionComplete: function () {
            getAnnual();
            getProtocol();
            getFinance();
        },
        annual: annual,
        protocol: protocol,
        finance: finance
    };

    return vm;
});
define('viewmodels/qsl',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('qsl');
            shell.selectedMainMenu('aguda');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/register',['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {    

    var shell = require('viewmodels/shell');

    var firstname = ko.observable();
    var lastname = ko.observable();
    var efirstname = ko.observable();
    var elastname = ko.observable();
    var email = ko.observable();
    var licensenum = ko.observable();
    var callsign = ko.observable();
    var birthdate = ko.observable();
    var id = ko.observable();
    var country = ko.observable();
    var gender = ko.observable('m');
    var city = ko.observable();
    var address = ko.observable();
    var house = ko.observable();
    var zip = ko.observable();
    var phone = ko.observable();
    var mobile = ko.observable();
    var reason = ko.observable();
    var cv = ko.observable();
    var file = ko.observable();
    var paymentfile = ko.observable();
    var uploader;
    var uploader2;

    var Clear = function () {
        $('#registration-form').parsley().reset();
        firstname("");
        lastname("");
        efirstname("");
        elastname("");
        email("");
        licensenum("");
        callsign("");
        birthdate("");
        id("");
        country("");
        gender('m');
        city("");
        address("");
        house("");
        zip("");
        phone("");
        mobile("");
        reason("");
        cv("");
        file("");
        uploader.removeCurrent();
    }

    var Send = ko.asyncCommand({
        execute: function (complete) {
            $('#registration-form').parsley().validate();
            if ($('#registration-form').parsley().isValid()) {
                if (uploader.getQueueSize() > 0) {
                    uploader.submit();
                }
                else {
                    if (uploader2.getQueueSize() > 0) {
                        uploader2.submit();
                    }
                    else {
                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'licensenum': licensenum(), 'callsign': callsign(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': Date.now(), 'filename': ''
                            }
                        };
                        httpService.post("Server/register.php", info).done(function (data) { alert("OK! " + data); Clear(); complete(true); }).error(function () { alert("Oops, an error has occured"); utilities.handleError(); complete(true); });
                    }
                }
            }
            else {
                complete(true);
            }
        },
        canExecute: function (isExecuting) {
            //return !isExecuting;
            return true;
        }
    });

    this.safe_tags = function (str) {
        return String(str)
                 .replace(/&/g, '&amp;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#39;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');
    }

    var SetTooltips = function ()
    {
        $('#mobile').tooltip();
        $('#phone').tooltip();
        $('#id').tooltip();
        $('#licensenum').tooltip();
    }

    var vm = {
        activate: function () {
            shell.selectedSubMenu('register');
            shell.selectedMainMenu('aguda');
            ko.bindingHandlers.datetimepicker = {
                init: function (element, valueAccessor, allBindingsAccessor) {
                    $(element).datetimepicker({
                        format: 'dd/MM/yyyy HH:mm:ss PP',
                        language: 'en',
                        pick12HourFormat: true
                    }).on("changeDate", function (ev) {
                        var observable = valueAccessor();
                        observable(ev.date);
                    });
                },
                update: function (element, valueAccessor) {
                    var value = ko.utils.unwrapObservable(valueAccessor());
                    $(element).datetimepicker("setValue", value);
                }
            };
        },
        compositionComplete: function () {
            SetTooltips();
            $('#birthdate').datetimepicker({
                pickTime: false
            });
            $("#birthdate").on("dp.change", function (e) {
                birthdate(moment(e.date).format('DD-MM-YYYY'));
            });
            $('#firstname').focus();

            var btn = document.getElementById('upload-btn'),
            btn2 = document.getElementById('payment-btn'),
                
       wrap = document.getElementById('pic-progress-wrap'),
       picBox = document.getElementById('picbox'),
       errBox = document.getElementById('errormsg');


            uploader = new ss.SimpleUpload({
                button: btn,
                url: 'Server/uploadHandler.php?dir=img',
                //progressUrl: 'Server/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                maxSize: 600,
                //allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
                accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (filename, extension, btn) {
                    file(filename);
                },
                onExtError: function (filename, extension) {
                    alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only PNG, JPG, and GIF files are allowed.');
                },
                onSizeError: function (filename, fileSize) {
                    alert(filename + ' is too big. (600K max file size)');
                },
                onSubmit: function (filename, ext) {
                    var prog = document.createElement('div'),
                        outer = document.createElement('div'),
                        bar = document.createElement('div'),
                        size = document.createElement('div');

                    prog.className = 'prog';
                    size.className = 'size';
                    outer.className = 'progress progress-striped active';
                    bar.className = 'progress-bar progress-bar-success';

                    outer.appendChild(bar);
                    prog.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(filename) + ' - </span>';
                    prog.appendChild(size);
                    prog.appendChild(outer);
                    wrap.appendChild(prog); // 'wrap' is an element on the page

                    this.setProgressBar(bar);
                    this.setProgressContainer(prog);
                    this.setFileSizeBox(size);

                    errBox.innerHTML = '';
                    //btn.value = 'Choose another file';

                },
                startXHR: function () {
                    // Dynamically add a "Cancel" button to be displayed when upload begins
                    // By doing it here ensures that it will only be added in browses which 
                    // support cancelling uploads
                    var abort = document.createElement('button');

                    wrap.appendChild(abort);
                    abort.className = 'btn btn-sm btn-info';
                    abort.innerHTML = 'Cancel';

                    // Adds click event listener that will cancel the upload
                    // The second argument is whether the button should be removed after the upload
                    // true = yes, remove abort button after upload
                    // false/default = do not remove
                    this.setAbortBtn(abort, true);
                },
                onComplete: function (filename, response) {
                    file(response.file);
                    if (uploader2.getQueueSize() > 0) {
                        uploader2.submit();
                    }
                    else 
                    {
                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'licensenum': licensenum(), 'callsign': callsign(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': response.timestamp, 'filename': file, 'paymentfilename': paymentfile
                            }
                        };
                        httpService.post("Server/register.php", info).done(function (data) { alert("Very well! " + data); Clear(); }).error(function () { utilities.handleError(); });
                    }
                }
            });

            


            uploader2 = new ss.SimpleUpload({
                button: btn2,
                url: 'Server/uploadHandler.php?dir=payment',
                //progressUrl: 'Server/uploadProgress.php',
                name: 'uploadfile',
                multiple: false,
                queue: false,
                maxUploads: 1,
                maxSize: 600,
                //allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
                accept: 'image/*',
                hoverClass: 'btn-hover',
                focusClass: 'active',
                disabledClass: 'disabled',
                responseType: 'json',
                autoSubmit: false,
                onChange: function (filename, extension, btn) {
                    paymentfile(filename);
                },
                onExtError: function (filename, extension) {
                    alert(filename + ' is not a permitted file type.' + "\n\n" + 'Only PNG, JPG, and GIF files are allowed.');
                },
                onSizeError: function (filename, fileSize) {
                    alert(filename + ' is too big. (600K max file size)');
                },
                onSubmit: function (filename, ext) {
                    var prog = document.createElement('div'),
                        outer = document.createElement('div'),
                        bar = document.createElement('div'),
                        size = document.createElement('div');

                    prog.className = 'prog';
                    size.className = 'size';
                    outer.className = 'progress progress-striped active';
                    bar.className = 'progress-bar progress-bar-success';

                    outer.appendChild(bar);
                    prog.innerHTML = '<span style="vertical-align:middle;">' + safe_tags(filename) + ' - </span>';
                    prog.appendChild(size);
                    prog.appendChild(outer);
                    wrap.appendChild(prog); // 'wrap' is an element on the page

                    this.setProgressBar(bar);
                    this.setProgressContainer(prog);
                    this.setFileSizeBox(size);

                    errBox.innerHTML = '';
                    //btn.value = 'Choose another file';

                },
                startXHR: function () {
                    // Dynamically add a "Cancel" button to be displayed when upload begins
                    // By doing it here ensures that it will only be added in browses which 
                    // support cancelling uploads
                    var abort = document.createElement('button');

                    wrap.appendChild(abort);
                    abort.className = 'btn btn-sm btn-info';
                    abort.innerHTML = 'Cancel';

                    // Adds click event listener that will cancel the upload
                    // The second argument is whether the button should be removed after the upload
                    // true = yes, remove abort button after upload
                    // false/default = do not remove
                    this.setAbortBtn(abort, true);
                },
                onComplete: function (filename, response) {
                    if (!response) {
                        errBox.innerHTML = 'Unable to upload file';
                        return;
                    }
                    if (response.success === true) {
                        paymentfile(response.file);
                        var info = {
                            'info':
                            {
                                'firstname': firstname(), 'lastname': lastname(), 'efirstname': efirstname(), 'elastname': elastname(),
                                'email': email(), 'licensenum': licensenum(), 'callsign': callsign(), 'birthdate': birthdate(),
                                'id': id(), 'country': country(), 'gender': gender(), 'city': city(),
                                'address': address(), 'house': house(), 'zip': zip(), 'phone': phone(),
                                'mobile': mobile(), 'reason': reason(), 'cv': cv(), 'timestamp': response.timestamp, 'filename': file, 'paymentfilename': paymentfile
                            }
                        };
                        httpService.post("Server/register.php", info).done(function (data) { alert("Very well! " + data); Clear(); }).error(function () { utilities.handleError(); });

                    } else {
                        if (response.msg) {
                            errBox.innerHTML = response.msg;
                        } else {
                            errBox.innerHTML = 'Unable to upload file';
                        }

                    }
                }
            });
            


        },
        firstname: firstname,
        lastname: lastname,
        efirstname: efirstname,
        elastname: elastname,
        email: email,
        licensenum: licensenum,
        callsign: callsign,
        birthdate: birthdate,
        id: id,
        country: country,
        gender: gender,
        city: city,
        address: address,
        house: house,
        zip: zip,
        phone: phone,
        mobile: mobile,
        reason: reason,
        cv: cv,
        file: file,
        paymentfile: paymentfile,
        Clear: Clear,
        Send: Send,
        uploader: uploader,
        uploader2: uploader2
    };


    return vm;
});

define('viewmodels/regulations',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('regulations');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/repeaters',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');
    var initMap = function () {

        //points
        var repeaters = [
        {
            lat: 30.614596,
            lng: 34.804811,
            description: "ממסר מצפה רמון",
            name: "R0"
        }
        ];

        
        var P0 = new google.maps.LatLng(30.614596, 34.804811);
        var P1 = new google.maps.LatLng(31.768689, 35.216128);
        var P3 = new google.maps.LatLng(32.583741, 35.181742);
        var P7 = new google.maps.LatLng(32.074502, 34.791491);
        var P12 = new google.maps.LatLng(32.762539, 35.018685);
        var P12B = new google.maps.LatLng(29.572127, 34.964874);
        var P12C = new google.maps.LatLng(31.256257, 34.785504);
        var P13 = new google.maps.LatLng(31.344768, 35.049863);
        var P14 = new google.maps.LatLng(32.980831, 35.506225);
        var P15 = new google.maps.LatLng(32.072165, 34.816521);
        var P16 = new google.maps.LatLng(32.315934, 34.862816);
        var P18 = new google.maps.LatLng(32.0553536, 34.8621609);
        var P73 = new google.maps.LatLng(32.764199, 35.016099);
        var P45 = new google.maps.LatLng(33.128886, 35.785405);
        
        
        
        //map
        var mapOptions = { center: new google.maps.LatLng(31.44741, 35.079346), zoom: 8 };
        var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        
        //markers
        var M0 = new google.maps.Marker({ position: P0, map: map, animation: google.maps.Animation.DROP, title: "ממסר מצפה רמון - R0 - 145.000" });
        var M1 = new google.maps.Marker({ position: P1, map: map, animation: google.maps.Animation.DROP, title: "ממסר ירושלים - R1 - 145.625" });
        var M3 = new google.maps.Marker({ position: P3, map: map, animation: google.maps.Animation.DROP, title: "ממסר מגידו - R3 - 145.675" });
        var M7 = new google.maps.Marker({ position: P7, map: map, animation: google.maps.Animation.DROP, title: "ממסר תל-אביב - R7 - 145.775" });
        var M12 = new google.maps.Marker({ position: P12, map: map, animation: google.maps.Animation.DROP, title: "ממסר חיפה - R12 - 144.700" });
        var M12B = new google.maps.Marker({ position: P12B, map: map, animation: google.maps.Animation.DROP, title: "ממסר אילת - R12B - 145.300" });
        var M12C = new google.maps.Marker({ position: P12C, map: map, animation: google.maps.Animation.DROP, title: "ממסר באר-שבע - R12C - 145.300" });
        var M13 = new google.maps.Marker({ position: P13, map: map, animation: google.maps.Animation.DROP, title: "ממסר יתיר - R13 - 145.325" });
        var M14 = new google.maps.Marker({ position: P14, map: map, animation: google.maps.Animation.DROP, title: "ממסר צפת - R14 - 145.350" });
        var M15 = new google.maps.Marker({ position: P15, map: map, animation: google.maps.Animation.DROP, title: "ממסר גבעתיים - R15 - 144.775" });
        var M16 = new google.maps.Marker({ position: P16, map: map, animation: google.maps.Animation.DROP, title: "ממסר נתניה - R16 - 145.400" });
        var M18 = new google.maps.Marker({ position: P18, map: map, animation: google.maps.Animation.DROP, title: "ממסר קרית אונו - R18 - 145.450" });
        var M73 = new google.maps.Marker({ position: P73, map: map, animation: google.maps.Animation.DROP, title: "ממסר חיפה - UHF - R73 - 438.725" });
        var M45 = new google.maps.Marker({ position: P45, map: map, animation: google.maps.Animation.DROP, title: "ממסר בנטל - R4.5 - 145.7125" });

        M73.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');

        var Circ;
        var CircleProp = {
            strokeColor: '#555555',
            strokeOpacity: 0.7,
            strokeWeight: 1,
            fillColor: '#555555',
            fillOpacity: 0.3,
            map: map,
            radius: 70000
        };
        
        var over_func = function (e) {
            if (map.getZoom() < 11) {
                CircleProp.center = e.latLng;
                CircleProp.radius = e.radius;
                Circ = new google.maps.Circle(CircleProp);
                Circ.setMap(map);
            }
        }
        var out_func = function (e) {
            Circ.setMap(null);
        }
        google.maps.event.addListener(M0, 'mouseover', function (e) { e.radius = 80000; over_func(e); });
        google.maps.event.addListener(M0, 'mouseout', out_func);
        google.maps.event.addListener(M1, 'mouseover', function (e) { e.radius = 70000; over_func(e); });
        google.maps.event.addListener(M1, 'mouseout', out_func);
        google.maps.event.addListener(M3, 'mouseover', function (e) { e.radius = 60000; over_func(e); });
        google.maps.event.addListener(M3, 'mouseout', out_func);
        google.maps.event.addListener(M7, 'mouseover', function (e) { e.radius = 70000; over_func(e); });
        google.maps.event.addListener(M7, 'mouseout', out_func);
        google.maps.event.addListener(M12, 'mouseover', function (e) { e.radius = 80000; over_func(e); });
        google.maps.event.addListener(M12, 'mouseout', out_func);
        google.maps.event.addListener(M12B, 'mouseover', function (e) { e.radius = 60000; over_func(e); });
        google.maps.event.addListener(M12B, 'mouseout', out_func);
        google.maps.event.addListener(M12C, 'mouseover', function (e) { e.radius = 80000; over_func(e); });
        google.maps.event.addListener(M12C, 'mouseout', out_func);
        google.maps.event.addListener(M13, 'mouseover', function (e) { e.radius = 70000; over_func(e); });
        google.maps.event.addListener(M13, 'mouseout', out_func);
        google.maps.event.addListener(M14, 'mouseover', function (e) { e.radius = 130000; over_func(e); });
        google.maps.event.addListener(M14, 'mouseout', out_func);
        google.maps.event.addListener(M15, 'mouseover', function (e) { e.radius = 70000; over_func(e); });
        google.maps.event.addListener(M15, 'mouseout', out_func);
        google.maps.event.addListener(M16, 'mouseover', function (e) { e.radius = 50000; over_func(e); });
        google.maps.event.addListener(M16, 'mouseout', out_func);
        google.maps.event.addListener(M18, 'mouseover', function (e) { e.radius = 40000; over_func(e); });
        google.maps.event.addListener(M18, 'mouseout', out_func);
        google.maps.event.addListener(M73, 'mouseover', function (e) { e.radius = 80000; over_func(e); });
        google.maps.event.addListener(M73, 'mouseout', out_func);
        google.maps.event.addListener(M45, 'mouseover', function (e) { e.radius = 50000; over_func(e); });
        google.maps.event.addListener(M45, 'mouseout', out_func);

    }
    var vm = {
        activate: function () {
            shell.selectedSubMenu('repeaters');
            shell.selectedMainMenu('israelham');
        },
        compositionComplete: function () {
            initMap();
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/repeatersmap',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');
    
    var vm = {
        activate: function () {
            shell.selectedSubMenu('repeatersmap');
            shell.selectedMainMenu('israelham');
        },
        compositionComplete: function () {
            
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/shop',['services/utilities', 'services/httpService'], function (utilities, httpService) {

    var shell = require('viewmodels/shell');
    var items = ko.observableArray();

    var getItems = function () {
        httpService.get("Server/markolit.php?d=" + Date.now()).done(function (data) { items(data); }).error(utilities.handleError);
    }
    var vm = {
        activate: function () {
            shell.selectedSubMenu('market');
            shell.selectedMainMenu('aguda');
            simpleCart({
                currency: "ILS",
                checkout: {
                    type: "PayPal",
                    email: "gilifon@gmail.com"
                }
            });
        },
        getItems: getItems,
        compositionComplete: function () {
            getItems();

        },
        items: items
    };

    return vm;
});
define('viewmodels/squares',['services/holylandUtility'], function (holylandUtility) {

    var shell = require('viewmodels/shell');
    var initMap = function (position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var myLatlng = new google.maps.LatLng(lat, lng);
        var mapOptions = { center: new google.maps.LatLng(32.01258834091205, 34.816575050354004), zoom: 12 };
        var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        var marker = new google.maps.Marker({
            position: myLatlng,
            map: map,
            title: 'Good Luck in Holyland Contest!'
        });

        var drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYGON,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [
                  google.maps.drawing.OverlayType.POLYGON,
                ]
            }
        });
        drawingManager.setMap(map);

        google.maps.event.addListener(drawingManager, 'polygoncomplete', function (polygon) {
            var coordinates = (polygon.getPath().getArray());
            console.log(coordinates);
            for (var i=0; i<coordinates.length; i++)
            {
                console.log('lat:' + coordinates[i].lat() + ' lng: ' + coordinates[i].lng());
            }
        });

        ko.utils.arrayForEach(holylandUtility.Areas(), function (area) {
            area.poly.setMap(map);
        });

    }

    var setAreas = function (position)
    {
        initMap(position);
        var square = holylandUtility.getAreaByPosition(position);
        $('#square').html(square);
    }

    var vm = {
        compositionComplete: function () {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(setAreas);

            } else {
                x.innerHTML = "Geolocation is not supported by this browser.";
            }

        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('viewmodels/sukotresults',['services/utilities', 'services/httpService'], function (utilities) {
    var shell = require('viewmodels/shell');
    var searchInput = ko.observable();

    var vm = {
        activate: function () {
            shell.selectedSubMenu('sukotresults');
            shell.selectedMainMenu('israelham');
            searchInput.subscribe(function (newValue) {
                if (newValue === undefined)
                    return;
                utilities.applyRowSearch("#dataTable tbody tr", newValue);
            });
            searchInput('');
        },
		searchInput: searchInput
    };

    return vm;
});
define('viewmodels/wwff',['viewmodels/shell'],function () {

    var shell = require('viewmodels/shell');

    var vm = {
        activate: function () {
            shell.selectedSubMenu('wwff');
            shell.selectedMainMenu('israelham');
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});
define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});

define('text!views/about.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy">\r\n\r\n        <h4>אודות האגודה</h4>\r\n        <p>\r\n            אגודת חובבי הרדיו בישראל (ע"ר) הינה עמותה רשומה המאגדת את חובבי הרדיו הישראלים וחובבים זרים אשר בקשו להמנות עם חבריה. האגודה הינה מלכ"ר (מוסד ללא כוונת רווח), והפעילות בתוכה מתבצעת בהתנדבות. האגודה פועלת ע"מ לקדם את תחביב חובבות הרדיו, מייצגת את ישראל בארגון חובבי הרדיו הבינלאומי ומספקת מגוון שירותים לחבריה. האגודה נוסדה ב 18 פברואר 1948 וחברים בה כל נציגי האוכלוסייה בישראל. מבוגרים לצד נוער, עולים ליד ותיקים, תלמידים לצד ראשי אקדמיה, כולל בכירים במשק ובכלכלה\r\n        </p>\r\n        <hr />\r\n        <h4>מטרות האגודה</h4>\r\n        <label>מטרות נבחרות מתוך תקנון האגודה:</label>\r\n        <ol>\r\n            <li>לאגד את חובבי הרדיו בישראל ולפתח יחסי רעות ביניהם.</li>\r\n            <li>לסייע לחברים בכל ענייני חובבות רדיו.</li>\r\n            <li>להפיץ את חובבות הרדיו בציבור ובמיוחד בקרב הנוער ולתרום בכך ליצירתה של עתודה טכנולוגית למדינת ישראל.</li>\r\n            <li>לסייע לקהילה במתן שרותי תקשורת בהתאם לתנאי רישיון משרד התקשורת בעת אירועים מיוחדים ובעת מצוקה.</li>\r\n            <li>לקיים קשרים עם ארגונים ואגודות שמטרותיהם דומות למטרות האגודה.</li>\r\n            <li>לייצג את חברי האגודה בפני מוסדות הממשל במדינת ישראל ובפני כל גורם בארץ ובחו"ל, בנושאים שיש בהם עניין לקיום מטרותיה.</li>\r\n        </ol>\r\n        <hr />\r\n        <h4>משרד האגודה</h4>\r\n        <p>\r\n            משרד  האגודה (לא לשם מסירת דואר)  מתארח בשנים האחרונות בבניין אתר ההנצחה לחללי חיל הקשר והתקשוב ברחוב אלפרט 3 יהוד. המשרד אינו מאויש דרך קבע ויש לקבוע מראש פגישה עם המזכיר. במקום גם ממוקמת תחנת המועדון של האגודה 4X4ARC \r\nאין אפשרות  להשאיר במקום תכתובת פורמלית כל שהיא וכל פניה יש לשלוח אל "אגודת חובבי הרדיו  בישראל " תיבת דואר 17600 תל אביב 6117501\r\n\r\n        </p>\r\n        <hr />\r\n\r\n        <h4>שירותי האגודה</h4>\r\n        <p>במסגרת מימוש מטרות האגודה היא מספק שירות לחבריה הכולל בין היתר:</p>\r\n        <ul>\r\n            <li>ייצוג אינטרסים של חובבי רדיו מול משרד התקשורת</li>\r\n            <li>ייצוג ישראל בארגון חובבי הרדיו הבינלאומי</li>\r\n            <li>תיאום פעולות משותפות לחובבי הרדיו ולגופי ההצלה בארץ</li>\r\n            <li>ידיעון ה"גל"</li>\r\n            <li>ניהול תחרויות כדוגמאת תחרות ארץ הקודש</li>\r\n            <li>הענקת פרסים ותעודות כגון תעודת ארץ הקודש</li>\r\n            <li>דיוור מרוכז של כרטיסי QSL</li>\r\n            <li>תחנת מועדון</li>\r\n            <li>ארגון קורסים לקראת מבחני משרד התקשורת לשם קבלת רשיון חובב רדיו</li>\r\n            <li>ממסרים</li>\r\n            <li>ארגון ימי שדה ומפגשים חברתיים</li>\r\n            <li>הכנה והוצאת כרטיס חבר בגודל כרטיס אשראי</li>\r\n            <li>ייצוג ישראל בתערוכות בינ"ל כגון פרידריכסהפן</li>\r\n            <li>הקצאת כתובת דואר אלקטרוני עם אות הקריאה</li>\r\n        </ul>\r\n        <p>חברות באגודה מותנת בתשלום דמי חבר.</p>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/aguda.html',[],function () { return '<div class="container">\r\n    <div class="sorting-block">\r\n        <ul class="sorting-nav sorting-nav-v1 text-center">\r\n        </ul>\r\n        <ul class="row sorting-grid">\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Register">\r\n                    <img class="img-responsive" src="assets/img/main/applicationform.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>טופס הרשמה</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Membership">\r\n                    <img class="img-responsive" src="assets/img/main/membership.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>חברות באגודה</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#About">\r\n                    <img class="img-responsive" src="assets/img/main/about.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>אודות האגודה</span>\r\n                        <!--<p>Anim pariatur cliche reprehenderit</p>-->\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            \r\n\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Directors">\r\n                    <img class="img-responsive" src="assets/img/main/directors.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>בעלי תפקידים</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#QSL">\r\n                    <img class="img-responsive" src="assets/img/main/qsl.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>לשכת QSL</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Repeaters">\r\n                    <img class="img-responsive" src="assets/img/main/repeaters.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>ממסרים</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            \r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Market">\r\n                    <img class="img-responsive" src="assets/img/main/10.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>מרכולית</span>\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Media">\r\n                    <img class="img-responsive" src="assets/img/main/media.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>כתבו עלינו</span>\r\n                    </span>\r\n                </a>\r\n            </li>\r\n\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Protocols">\r\n                    <img class="img-responsive" src="assets/img/main/protocols.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>פרוטוקולים</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            \r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="http://articles.iarc.org/" target="_blank">\r\n                    <img class="img-responsive" src="assets/img/main/articles.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>דף המאמרים</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n\r\n\r\n\r\n\r\n        </ul>\r\n    </div>\r\n</div>\r\n';});


define('text!views/components/events.html',[],function () { return '<div data-bind="foreach: items">\r\n    <div class="search-blocks search-blocks-top-sea">\r\n        <div class="row">\r\n            <div class="col-md-4 search-img">\r\n                <img alt="" data-bind="attr: { \'src\': image }" class="img-responsive">\r\n                <!--<ul class="list-unstyled" style="direction: ltr">\r\n                    <li><i class="icon-briefcase"></i><span data-bind="html: address"></span></li>\r\n                    <li>\r\n                        <i class="icon-map-marker"></i>\r\n                        <a data-bind="attr: { \'href\': location_url }" target="_blank"><span data-bind="    html: location"></span>\r\n                        </a>\r\n                    </li>\r\n                    <li><i class="icon-calendar"></i><span data-bind="html: date"></span></li>\r\n                </ul>-->\r\n            </div>\r\n            <div class="col-md-8">\r\n                <h2><span data-bind="html: title"></span></h2>\r\n                <p data-bind="html: body">\r\n                </p>\r\n            </div>\r\n        </div>\r\n        <div class="row">\r\n            <div class="col-md-12 search-img">\r\n                <ul class="list-unstyled">\r\n                    <li><i class="icon-briefcase"></i><span data-bind="html: address"></span></li>\r\n                    <li>\r\n                        <i class="icon-map-marker"></i>\r\n                        <a data-bind="attr: { \'href\': location_url }" target="_blank"><span data-bind="    html: location"></span>\r\n                        </a>\r\n                    </li>\r\n                    <li><i class="icon-calendar"></i><span data-bind="html: date"></span></li>\r\n                </ul>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});


define('text!views/components/features.html',[],function () { return '<div data-bind="foreach: items">\r\n    <div class="col-md-6" data-bind="style: { textAlign: is_ltr == 0 ? \'right\' : \'left\' ,direction: is_ltr == 0 ? \'rtl\' : \'ltr\' }">\r\n        <div class="magazine-news-imgx">\r\n            <a data-bind="attr: { \'href\': url }" target="_blank">\r\n                <img alt="" data-bind="attr: { \'src\': image }" class="img-responsive">\r\n            </a>\r\n        </div>\r\n        <h3><a data-bind="attr: { \'href\': url }" target="_blank"><span data-bind="    html: title"></span></a></h3>\r\n        <div class="by-author">\r\n            <span data-bind="if: date!=\'0000-00-00\'"><span data-bind="html: date"></span>&nbsp;\\&nbsp; </span>\r\n            <strong><span data-bind="html: author"></span></strong>\r\n        </div>\r\n        <p><span data-bind="html: content"></span></p>\r\n    </div>\r\n</div>\r\n\r\n\r\n';});


define('text!views/components/news.html',[],function () { return '<div data-bind="foreach: items">\r\n    <div class="blog margin-bottom-40">\r\n        <div class="blog-img" data-bind="visible: image != \'\'">\r\n            <img alt="" data-bind="attr: { \'src\': image }" class="img-responsive">\r\n        </div>\r\n        <h2><span data-bind="html: title"></span></h2>\r\n        <div class="blog-post-tags">\r\n            <ul class="list-unstyled list-inline blog-info">\r\n                <li><i class="icon-calendar"></i><span data-bind="html: date"></span></li>\r\n                <li><i class="icon-pencil"></i><span data-bind="html: author"></span></li>\r\n                <li><i class="icon-tags"></i><span data-bind="html: tags"></span></li>\r\n            </ul>\r\n        </div>\r\n        <div data-bind="html: content">\r\n        </div>\r\n    </div>\r\n    <hr>\r\n</div>\r\n\r\n\r\n\r\n';});


define('text!views/components/news_abstract.html',[],function () { return '<div data-bind="foreach: items">\r\n    <div class="magazine-mini-news">\r\n        <h3><span data-bind="html: title"></span></h3>\r\n        <div class="post-author">\r\n            <span data-bind="html: date"></span>&nbsp;\\&nbsp;\r\n            <strong><span data-bind="html: author"></span></strong>\r\n        </div>\r\n        <span data-bind="html: abstract"></span>\r\n        <div class="news-read-more">\r\n            <i class="icon-plus"></i>\r\n            <a href="#News">קרא עוד...</a>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});


define('text!views/components/posts.html',[],function () { return '<div data-bind="foreach: items">\r\n    <div class="col-md-12">\r\n        <div class="magazine-news-img">\r\n            <a data-bind="attr: { \'href\': url }" target="_blank">\r\n                <img alt="" data-bind="attr: { \'src\': image }" class="img-responsive" />\r\n                <h3><span style="position:absolute; bottom:5px; right:5px; background-color:black; color:white; padding:5px" data-bind="html: title"></span></h3>\r\n            </a>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n\r\n';});


define('text!views/contact.html',[],function () { return '<style type="text/css">\r\n    .map\r\n    {\r\n        width: 100%;\r\n        height: 350px;\r\n        border-top: solid 1px #eee;\r\n        border-bottom: solid 1px #eee;\r\n    }\r\n\r\n        /* important! bootstrap sets max-width on img to 100% which conflicts with google map canvas*/\r\n        .map img\r\n        {\r\n            max-width: none;\r\n        }\r\n\r\n    .map-box\r\n    {\r\n        height: 250px;\r\n    }\r\n\r\n    .map-box-space\r\n    {\r\n        margin-top: 15px;\r\n    }\r\n\r\n    .map-box-space1\r\n    {\r\n        margin-top: 7px;\r\n    }\r\n</style>\r\n<div class="container">\r\n\r\n\r\n    <!-- Google Map -->\r\n    <div id="map-canvas" class="map margin-bottom-40">\r\n    </div>\r\n    <!---/map-->\r\n    <!-- End Google Map -->\r\n\r\n    <!--=== Content Part ===-->\r\n    <div class="container">\r\n        <div class="row-fluid who margin-bottom-30">\r\n            <div class="col-md-7 pull-right">\r\n                <!-- Contacts -->\r\n                <div class="headline">\r\n                    <h4>לצורך יצירת קשר ניתן להשתמש באחת הדרכים הבאות:</h4>\r\n                </div>\r\n                <div class="listed-icons margin-bottom-10">\r\n                    <div><i class="icon-home"></i> אלפרט 3 יהוד .בבניין אתר ההנצחה לחללי חיל הקשר והתקשוב (בתאום מראש עם המזכיר).</div>\r\n                    <div><i class="icon-envelope"></i> אגודת חובבי הרדיו בישראל (ע"ר) ת.ד. 17600 תל אביב מיקוד 6117501</div>\r\n                    <div><i class="icon-envelope-alt"></i> דואר אלקטרוני: <a href="mailto:info@iarc.org">info@iarc.org</a></div>\r\n                    <div><i class="icon-phone-sign"></i> מזכיר האגודה - אברי דותן 054-2517721</div>\r\n                    <div><i class="icon-facebook"></i> <a href="https://www.facebook.com/groups/353267071379649/" target="_blank">אגודת חובבי הרדיו בישראל - IARC</a></div>\r\n                    <div><i class="icon-signal"></i> על אחד ממסרי האגודה (בעיקר מומלץ ממסר ת"א או כל ממסר המחובר אליו)</div>\r\n                </div>\r\n            </div>\r\n            <div class="col-md-5 pull-right">\r\n                <!-- Contacts -->\r\n                <div class="headline">\r\n                    <h4>כתובות דוא"ל:</h4>\r\n                </div>\r\n                <div class="listed-icons margin-bottom-10">\r\n                    <div><i class="icon-envelope-alt"></i> דובר האגודה - אברי דותן: <a href="mailto:spokesman@iarc.org">spokesman@iarc.org</a></div>\r\n                    <div><i class="icon-envelope-alt"></i> גזבר - רון יציב: <a href="mailto:treasurer@iarc.org">treasurer@iarc.org</a></div>\r\n                    <div><i class="icon-envelope-alt"></i> שאלות ופרטים: <a href="mailto:treasurer@iarc.org">info@iarc.org</a></div>\r\n                    <!--<div><i class="icon-envelope-alt"></i> ועד האגודה: <a href="mailto:committee@iarc.org">committee@iarc.org</a></div>\r\n                    <div><i class="icon-envelope-alt"></i> ועדת חברים: <a href="mailto:membership@iarc.org">membership@iarc.org</a></div>\r\n                    <div><i class="icon-envelope-alt"></i> ועדת ממסרים: <a href="mailto:repeater@iarc.org">repeater@iarc.org</a></div>\r\n                    <div><i class="icon-envelope-alt"></i> ועדת ביקורת: <a href="mailto:review@iarc.org">review@iarc.org</a></div>\r\n                    <div><i class="icon-envelope-alt"></i> אחראי האתר: <a href="mailto:webmaster@iarc.org">webmaster@iarc.org</a></div>-->\r\n                </div>\r\n            </div>\r\n            <!--/col-md-12-->\r\n        </div>\r\n        <!--/row-->\r\n\r\n          <div class="row-fluid who margin-bottom-30">\r\n              <div class="col-md-7 pull-right">\r\n                  <!-- Contacts -->\r\n                  <div class="headline">\r\n                      <h4>דרכי התקשרות:</h4>\r\n                  </div>\r\n                  <div class="listed-icons margin-bottom-10">\r\n                      <div><i class="icon-phone-sign"></i> איציק פסטרנק (יו"ר)  052-5571500</div>\r\n                      <div><i class="icon-phone-sign"></i> רון יציב (גזבר) treasurer@iarc.org</div>\r\n                      <div><i class="icon-phone-sign"></i> אברי דותן (דובר, מזכיר) 054-2517721</div>\r\n                      <div>משרד התקשורת: <i class="icon-phone-sign"></i> 035198296 <i class="icon-print"></i> 035198103</div>\r\n                      <div>משרד להגנת הסביבה: <i class="icon-phone-sign"></i> 026495874 <i class="icon-print"></i> 026495870</div>\r\n                  </div>\r\n              </div>\r\n          </div>\r\n\r\n    </div>\r\n</div>\r\n';});


define('text!views/dashboard.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row">\r\n        <div class="col-md-6 text-left">\r\n            <h2 style="color: #3ebeff"><span style="color: #333333; font-weight: bold">I</span>srael <span style="color: #333333; font-weight: bold">A</span>mateur <span style="color: #333333; font-weight: bold">R</span>adio <span style="color: #333333; font-weight: bold">C</span>lub</h2>\r\n        </div>\r\n        <div class="col-md-6 text-right">\r\n            <h2 style="color: #3ebeff"><span style="color: #333333; font-weight: bold">א</span>גודת <span style="color: #333333; font-weight: bold">ח</span>ובבי ה<span style="color: #333333; font-weight: bold">ר</span>דיו ב<span style="color: #333333; font-weight: bold">י</span>שראל</h2>\r\n        </div>\r\n    </div>\r\n\r\n    <!--<div class="search-blocks search-blocks-right-green margin-bottom-40">\r\n        <a href="#Ham">\r\n            <div class="row">\r\n                <div class="col-md-6 text-center" style="vertical-align:central;">\r\n                    <h1><span style="font-weight:bold">מתעניינים בחובבות רדיו?</span></h1>\r\n                    <h1>בואו לשמוע פרטים!</h1>\r\n                </div>\r\n                <div class="col-md-6 search-img">\r\n                    <iframe width="100%" src="https://www.youtube.com/embed/mJtsJI0qGpc" frameborder="0" allowfullscreen></iframe>\r\n                </div>\r\n            </div>\r\n        </a>\r\n    </div>-->\r\n    <!--<div class="search-blocks search-blocks-right-green margin-bottom-40">\r\n        <img class="img-responsive" src="assets/img/main/elections.jpg" alt="">\r\n    </div>-->\r\n    <!--<div class="search-blocks search-blocks-right-green margin-bottom-40">\r\n        <h3>אסיפה שנתית 2021</h3>\r\n        <h4>האסיפה השנתית תתקיים השנה ביום חמישי, 6 במאי 2021, בבית יד לבנים ברמת השרון</h4>\r\n        <a href="https://goo.gl/maps/JbmMdQfWdREpwY9C6" target="_blank">רח\' המחתרת 3, רמת השרון</a>\r\n        \r\n    </div>\r\n\r\n    <div class="search-blocks search-blocks-right-green margin-bottom-40">\r\n        <h3>דוחות לקראת האסיפה השנתית 2021</h3>\r\n        <p>\r\n            <a href="https://www.iarc.org/iarc/Content/docs/miluli2021.pdf" target="_blank">דוח מילולי 2021</a><br />\r\n            <a href="https://www.iarc.org/iarc/Content/docs/finance2021.pdf" target="_blank">דוח כספי 2021</a><br />\r\n            <a href="https://www.iarc.org/iarc/Content/docs/members2021.pdf" target="_blank">דוח ועדת חברים 2021</a><br />\r\n            <a href="https://www.iarc.org/iarc/Content/docs/audit2021.pdf" target="_blank">דוח ועדת ביקורת 2021</a><br />\r\n            <a href="https://www.iarc.org/iarc/Content/docs/repeaters2021.pdf" target="_blank">דוח ועדת ממסרים 2021</a><br />\r\n        </p>\r\n    </div>-->\r\n\r\n        <!--Features News-->\r\n        <div class="row">\r\n            <div data-bind="compose: \'viewmodels/components/features\'"></div>\r\n        </div>\r\n        <div class="row">\r\n            <div class="col-md-4">\r\n                <div data-bind="compose: \'viewmodels/components/news_abstract\'"></div>\r\n            </div>\r\n            <div class="col-md-8">\r\n                <div data-bind="compose: \'viewmodels/components/events\'"></div>\r\n                <br /><br />\r\n\r\n                <div data-bind="compose: \'viewmodels/components/posts\'"></div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n';});


define('text!views/directors.html',[],function () { return '<div class="container">\r\n    <h3>לרשימת בעלי תפקידים באגודה <a href="https://www.iarc.org/iarc/Content/docs/directors.pdf" target="_blank">לחץ כאן</a></h3>\r\n\r\n    <div class="row">\r\n        <div class="col-md-6 pull-right">\r\n            <div class="row-fluid">\r\n\r\n                <div class="panel panel-red margin-bottom-40">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">נשיאי כבוד של האגודה</h4>\r\n                    </div>\r\n                    <table class="table table-striped">\r\n                        <thead>\r\n                            <tr>\r\n                                <th style="text-align: right">שנה</th>\r\n                                <th style="text-align: right">אות קריאה</th>\r\n                                <th style="text-align: right">שם</th>\r\n                            </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                            <tr>\r\n                                <td>1948</td>\r\n                                <td>4X4CZ</td>\r\n                                <td>יחזקאל דויס ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1949-1982</td>\r\n                                <td>4X4BX</td>\r\n                                <td>שלמה מנזרי ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1985-1996</td>\r\n                                <td>4X1AH</td>\r\n                                <td>יענקלה יצחקי ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1997</td>\r\n                                <td>4X6KJ</td>\r\n                                <td>יוסף אובסטפלד</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>2009-2016</td>\r\n                                <td>4X1DF</td>\r\n                                <td>אמנון בר-גיורא ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>2016</td>\r\n                                <td>4X4WH</td>\r\n                                <td>דוד בן בסט</td>\r\n                            </tr>\r\n\r\n                        </tbody>\r\n                    </table>\r\n                </div>\r\n            </div>\r\n            <div class="row-fluid">\r\n                <div class="panel panel-blue margin-bottom-40">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">חברי כבוד באגודה</h4>\r\n                    </div>\r\n                    <table class="table table-striped">\r\n                        <thead>\r\n                            <tr>\r\n                                <th style="text-align: right">אות קריאה</th>\r\n                                <th style="text-align: right">שם</th>\r\n                            </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                            <tr>\r\n                                <td>-----</td>\r\n                                <td>זלמו שלו - קשר"ר</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X1AB</td>\r\n                                <td>אלון בר-סלע</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X1AH</td>\r\n                                <td>\r\n                                    יענקלה יצחקי ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X1AS</td>\r\n                                <td>\r\n                                    מנוחין שלמה\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X1AT</td>\r\n                                <td>\r\n                                    אהרון קירשנר ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X1FU</td>\r\n                                <td>\r\n                                    יצחק חלפון ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X1IK</td>\r\n                                <td>\r\n                                    ישראל קז\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X1OM</td>\r\n                                <td>\r\n                                    ישראל ברקו\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X1WA</td>\r\n                                <td>\r\n                                    דוד שמואלי\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X4FV</td>\r\n                                <td>\r\n                                    ג\'ו ליברזון ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X4GF</td>\r\n                                <td>\r\n                                    שמשון לוטן ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X4GT</td>\r\n                                <td>\r\n                                    טוביה גרינגרויז\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X4ND</td>\r\n                                <td>\r\n                                    אריה שרוני\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X4OR</td>\r\n                                <td>\r\n                                    ישראל ביבר\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X6KJ</td>\r\n                                <td>\r\n                                    יוסף אובסטפלד\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X6OL</td>\r\n                                <td>\r\n                                    שושנה קירשנר\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X6ZH</td>\r\n                                <td>\r\n                                    יצחק מרקדו\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4X8RR</td>\r\n                                <td>\r\n                                    רון רודן ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4Z4BS</td>\r\n                                <td>\r\n                                    שלום ברק\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>4Z5NG</td>\r\n                                <td>\r\n                                    נתן גדרון\r\n                                </td>\r\n                            </tr>\r\n                        </tbody>\r\n                    </table>\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <div class="col-md-6 pull-right">\r\n            <div class="row-fluid">\r\n                <div class="panel panel-sea margin-bottom-40">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">יושבי ראש ועד האגודה</h4>\r\n                    </div>\r\n                    <table class="table table-striped">\r\n                        <thead>\r\n                            <tr>\r\n                                <th style="text-align: right">שנה</th>\r\n                                <th style="text-align: right">אות קריאה</th>\r\n                                <th style="text-align: right">שם</th>\r\n                            </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                            <tr>\r\n                                <td>1949-1962</td>\r\n                                <td>4X4BX</td>\r\n                                <td>שלמה מנזרי ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1963</td>\r\n                                <td>4X4DH</td>\r\n                                <td>ברונו ביננפלד</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1964</td>\r\n                                <td>4X1FU</td>\r\n                                <td>יצחק חלפון ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1965-1966</td>\r\n                                <td>4X4DC</td>\r\n                                <td>יהודה קריסטל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1967-1969</td>\r\n                                <td>4X4BX</td>\r\n                                <td>שלמה מנזרי ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1970-1971</td>\r\n                                <td>4X1FU</td>\r\n                                <td>יצחק חלפון ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1972-1974</td>\r\n                                <td>4X4CZ</td>\r\n                                <td>יחזקאל דויס ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1975-1977</td>\r\n                                <td>4X1IK</td>\r\n                                <td>ישראל קז</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1978-1979</td>\r\n                                <td>4Z4JT</td>\r\n                                <td>שרוליק הרמתי ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1980-1981</td>\r\n                                <td>4X1AT</td>\r\n                                <td>אהרון קירשנר ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1982</td>\r\n                                <td>4Z4RM</td>\r\n                                <td>נפתלי בלבן</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1983-1986</td>\r\n                                <td>4X1AT</td>\r\n                                <td>אהרון קירשנר ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1987</td>\r\n                                <td>4Z4AB</td>\r\n                                <td>אבי פרידלנדר</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1988</td>\r\n                                <td>4X1AT</td>\r\n                                <td>אהרון קירשנר ז"ל</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1989-1996</td>\r\n                                <td>4X6KJ</td>\r\n                                <td>יוסף אובסטפלד</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1997-1999</td>\r\n                                <td>4Z5IS</td>\r\n                                <td>אליהו שטרן</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>2000-2007</td>\r\n                                <td>4X6KJ</td>\r\n                                <td>יוסף אובסטפלד</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>2008-2011</td>\r\n                                <td>4Z1PF</td>\r\n                                <td>משה אינגר</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>2012-2013</td>\r\n                                <td>4Z1AB</td>\r\n                                <td>עמוס ברק</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>2014-2017</td>\r\n                                <td>4Z1RZ</td>\r\n                                <td>צורי ריינשטיין</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>2018</td>\r\n                                <td>4X5IP</td>\r\n                                <td>איציק פסטרנק</td>\r\n                            </tr>\r\n                        </tbody>\r\n                    </table>\r\n                </div>\r\n\r\n\r\n            </div>\r\n            <div class="row-fluid">\r\n                <div class="panel panel-orange margin-bottom-40">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">עורכי בטאון "הגל"</h4>\r\n                    </div>\r\n                    <table class="table table-striped">\r\n                        <thead>\r\n                            <tr>\r\n                                <th style="text-align: right">שנה</th>\r\n                                <th style="text-align: right">אות קריאה</th>\r\n                                <th style="text-align: right">שם</th>\r\n                            </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                            <tr>\r\n                                <td>1950</td>\r\n                                <td>4X4CJ</td>\r\n                                <td>\r\n                                    ראובן אביגור ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1951-1952</td>\r\n                                <td>4X4BO</td>\r\n                                <td>\r\n                                    יאיר בורלא ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1961</td>\r\n                                <td>4X4JY</td>\r\n                                <td>\r\n                                    מרדכי שורר ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1962</td>\r\n                                <td>4X4LQ</td>\r\n                                <td>\r\n                                    עמוס קורצ\'ין\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1963</td>\r\n                                <td>4X4BO</td>\r\n                                <td>\r\n                                    יאיר בורלא ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1964</td>\r\n                                <td>4X4DH</td>\r\n                                <td>\r\n                                    ברונו ביננפלד\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1966</td>\r\n                                <td>4Z4BR</td>\r\n                                <td>\r\n                                    דורון ארד\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1970-1971</td>\r\n                                <td>4Z4AB</td>\r\n                                <td>\r\n                                    אבי פרידלנדר\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1972-1974</td>\r\n                                <td>4X4IL</td>\r\n                                <td>\r\n                                    בן ציון שעל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1975</td>\r\n                                <td>4Z4AB</td>\r\n                                <td>\r\n                                    אבי פרידלנדר\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1977</td>\r\n                                <td>4Z4VH</td>\r\n                                <td>\r\n                                    נועם אבירם\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1978</td>\r\n                                <td>4Z4JT</td>\r\n                                <td>\r\n                                    שרוליק הרמתי ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1979-1980</td>\r\n                                <td>4Z4UR</td>\r\n                                <td>\r\n                                    אהוד זגר\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1981</td>\r\n                                <td>4Z4SO</td>\r\n                                <td>\r\n                                    עודד שרמר\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1982</td>\r\n                                <td>4X6IL</td>\r\n                                <td>\r\n                                    בן ציון שעל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1983-1985</td>\r\n                                <td>4X4KT</td>\r\n                                <td>\r\n                                    צבי פומר ז"ל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1986</td>\r\n                                <td>4Z7BHH</td>\r\n                                <td>\r\n                                    עזרא נוריאל\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1987-1991</td>\r\n                                <td>4X4-439</td>\r\n                                <td>\r\n                                    ראובן ישראלי\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>1991-2001</td>\r\n                                <td>4X6LM</td>\r\n                                <td>\r\n                                    שלמה מוסלי\r\n                                </td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>2002-2018</td>\r\n                                <td>4X1KF</td>\r\n                                <td>מיכאל ברק ז"ל</td>\r\n                            </tr>\r\n                        </tbody>\r\n                    </table>\r\n                </div>\r\n\r\n\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n</div>\r\n\r\n';});


define('text!views/dxpeditions.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-center">\r\n        <img class="img-responsive text-center" src="assets/img/under_contruction.jpg" alt="">\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/echolink.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy">\r\n        <h4>רשת אקולינק</h4>\r\n        <p>\r\n            רשת האקולינק הארצית נפרשה ע"י מספר חובבים ומתוחזקת על-ידם באופן עצמאי.<br />\r\n            חלק מהלינקים מחוברים דרך לינק מרכזי 4X1ZQ-L שממוקם בפ"ת ומתוחזק ע"י אבישי.<br />\r\n        </p>\r\n        <p></p>\r\n        <hr />\r\n    </div>\r\n\r\n    <div class="row-fluid">\r\n        <div class="col-md-12">\r\n            <div class="panel panel-grey margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <span class="panel-title text-right">אקו-לינק</span>\r\n                    <span class="panel-title pull-left">Echolink</span>\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: right">שם הצומת</th>\r\n                            <th style="text-align: right">מספר הצומת</th>\r\n                            <th style="text-align: right">מנהל</th>\r\n                            <th style="text-align: right">מיקום</th>\r\n                            <th style="text-align: right">תדר (Mhz)</th>\r\n                            <th style="text-align: right">PL</th>\r\n                            <th style="text-align: right">הערות</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td>4X6HF-L</td>\r\n                            <td>334236</td>\r\n                            <td>4X6HF</td>\r\n                            <td>קרית אונו</td>\r\n                            <td></td>\r\n                            <td></td>\r\n                            <td>לינק להאזנה לממסר ת"א R7</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4X4CP-R</td>\r\n                            <td>124071</td>\r\n                            <td>4X4CP</td>\r\n                            <td>קרית מוצקין</td>\r\n                            <td>438.725 (R73)</td>\r\n                            <td>91.5</td>\r\n                            <td>לינק לממסר חיפה R73</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4Z4BA-R</td>\r\n                            <td>267880</td>\r\n                            <td>4Z4BA</td>\r\n                            <td>מגדל העמק</td>\r\n                            <td>145.675 (R3)</td>\r\n                            <td>91.5</td>\r\n                            <td>לינק לממסר מגידו R3</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4X6HF-R</td>\r\n                            <td>530229</td>\r\n                            <td>4X6HF</td>\r\n                            <td>קרית אונו</td>\r\n                            <td>145.450 (S18)</td>\r\n                            <td>91.5</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4Z7DFA-R</td>\r\n                            <td>242124</td>\r\n                            <td>4Z5VK</td>\r\n                            <td>אילת</td>\r\n                            <td>145.550 (S22)</td>\r\n                            <td>91.5</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4Z7GAI-R</td>\r\n                            <td>624651</td>\r\n                            <td>4Z7GAI</td>\r\n                            <td>ירושלים</td>\r\n                            <td></td>\r\n                            <td></td>\r\n                            <td>לינק להאזנה לממסר ירושלים R1</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4Z4IZ-R</td>\r\n                            <td>169676</td>\r\n                            <td>4Z4IZ</td>\r\n                            <td>גבעת-אלה</td>\r\n                            <td>145.300 (R12)</td>\r\n                            <td>91.5</td>\r\n                            <td>לינק לממסר חיפה R12</td>\r\n                        </tr>\r\n                        <!--<tr>\r\n                            <td>4Z1TL-R</td>\r\n                            <td>790714</td>\r\n                            <td>4Z1TL,4X1ZQ</td>\r\n                            <td>הרצליה</td>\r\n                            <td></td>\r\n                            <td></td>\r\n                            <td>תוכנת קונפרנס שמארחת לינקים ומשתמשי אקולינק</td>\r\n                        </tr>-->\r\n                        <tr>\r\n                            <td>4X1ZQ-L</td>\r\n                            <td>583322</td>\r\n                            <td>4X1ZQ</td>\r\n                            <td>פתח-תקווה</td>\r\n                            <td>145.275 (S11)</td>\r\n                            <td>91.5</td>\r\n                            <td>משמש כצומת מרכזי</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4Z5SL-R</td>\r\n                            <td>754065</td>\r\n                            <td>4Z5SL</td>\r\n                            <td>שמיר</td>\r\n                            <td>145.200 (S8)</td>\r\n                            <td>91.5</td>\r\n                            <td>מחובר ללינק: 4X1ZQ-L</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4Z5SL-L</td>\r\n                            <td>671795</td>\r\n                            <td>4Z5SL</td>\r\n                            <td>גבעת-אלה</td>\r\n                            <td>145.225 (S9)</td>\r\n                            <td>91.5</td>\r\n                            <td>מחובר ללינק: 4X1ZQ-L</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4Z7DGH-L</td>\r\n                            <td>52211</td>\r\n                            <td>4Z7DGH</td>\r\n                            <td>הוד-השרון</td>\r\n                            <td>144.525</td>\r\n                            <td>91.5</td>\r\n                            <td>מחובר ללינק: 4X1ZQ-L</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>4Z7EIG-L</td>\r\n                            <td>819274</td>\r\n                            <td>4Z7DGH</td>\r\n                            <td>קציר</td>\r\n                            <td>144.575</td>\r\n                            <td>91.5</td>\r\n                            <td>מחובר ללינק: 4X1ZQ-L</td>\r\n                        </tr>\r\n                       <!-- <tr>\r\n                            <td>4Z5AB-L</td>\r\n                            <td>395209</td>\r\n                            <td>4Z5AB</td>\r\n                            <td>רחובות</td>\r\n                            <td>145.475 (S19)</td>\r\n                            <td>91.5</td>\r\n                            <td>מחובר ללינק: 4X1ZQ-L</td>\r\n                        </tr>-->\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <p>חובבים המעוניינים להפעיל לינקים נוספים הכוללים מקמ"ש, נא לפנות לדני <a href="mailto:4z5sl@iarc.org" target="_blank">4Z5SL@iarc.org</a> לתאום ההפעלה ותדר השידור, בכדי למנוע הפרעות והתנגשויות עם תחנות קיימות.</p>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/emergency.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy">\r\n\r\n        <h4>חובבי רדיו בחירום</h4>\r\n        <p>\r\n            חובבי הרדיו בישראל תורמים את חלקם ברשתות קשר בשעת חרום ומצוקה. חובבי הרדיו היו שותפים לפעילויות בהן רק הם יכלו להקים רשת פעילה בזמן קצר ובכך הוכיחו את ידיעותיהם המקצועיות ואת יכולותיהם הטכניות והיוו נכס חשוב לקהילה.\r\n        </p>\r\n        <hr />\r\n        <p>בין הפעילויות של עזרה לקהילה בשעת חירום ניתן למנות:</p>\r\n        <ul>\r\n            <li>שמירה על קשר קבוע עם שגרירות ישראל במקסיקו בעת רעידת האדמה.</li>\r\n            <li>שילוב חובבי רדיו למשלחת ההצלה לארמניה ולתורכיה</li>\r\n            <li>חובבי הרדיו ביחידות החילוץ הארציות</li>\r\n            <li>העברת קשר בין חיילנו במלחמת שלום הגליל למשפחותיהם בעורף</li>\r\n        </ul>\r\n        <p>בעת רעידת האדמה בהאיטי שימושו חובבי הרדיו בעולם ובארץ ערוץ להעברת מידע חיוני, עד שממשלות ומדינות הצליחו להקים מערך קשר קבוע. מידע רב הועבר למשרד החוץ בארץ ולמד"א, כבר מהדקות הראשונות לאסון. מידע חיוני עליו התבססו בהרכבת משלחת ההצלה שיצאה למקום האסון מספר ימים מאוחר יותר.</p>\r\n        <hr />\r\n        <p>\r\n            לצורך תקשורת פנים ארצית, במקרה של מלחמה, רעידת אדמה, או אסון רב נפגעים, לא עלינו, נקבעו לחירום תדרי המפגש הבאים, במגה-הרץ:\r\n        </p>\r\n        <p>VHF אנלוגי - סימפלקס</p>\r\n        <ul>\r\n            <li>S10 - 145.250</li>\r\n            <li>S11 - 145.275</li>\r\n        </ul>\r\n        <p>HF</p>\r\n          <ul>\r\n              <li>14.300 - USB   משותף ל IARU1\r\n              <li>10.130 - USB   רק ישראל (ורק בחירום)\r\n              <li>7.130 - LSB רק ישראל</li>\r\n              <li>7.110 - LSB משותף ל IARU1</li>\r\n              <li>5.365 - USB   רק ישראל</li>\r\n              <li>3.777 - LSB   רק ישראל</li>\r\n              <li>3.760 - LSB   משותף ל IARU1</li>\r\n          </ul>\r\n        <p>\r\n            ממסרים (אם התשתית תקינה - הערה 1)\r\n        </p>\r\n        <ul>\r\n            <li>ממסרי VHF UHF אנלוגיים</li>\r\n            <li>קבוצה TG 425 על ממסרי ה DMR</li>\r\n            <li>קבוצה TG9112 על ממסרי ה (EMCOM EU)   DMR</li>\r\n            <li>(DMR - כל עוד התשתית הקישורית תשרוד, תספק הרשת קישוריות ארצית ועולמית)</li>\r\n        </ul>\r\n        <p>אנא הקפידו על הכללים הבאים:</p>\r\n        <ol>\r\n            <li>אלו תדרי מפגש. עם ריבוי תעבורה על התדר, רצוי לעבור לתדרים אחרים, אך לוודא תחילה שיש חובבים נוספים מאזורכם הנשארים על התדר בהאזנה. במידה ונשאר ממסר פעיל עדיף להשתמש בו להגדלת טווח.</li>\r\n            <li>יש להשאיר מרווח בין שידור לשידור כדי לאפשר לתחנות חלשות להצטרף. ב  VHF, מפעם לפעם יש לפתוח SQUELCH ולתת קריאה, כדי לשפר את  הסיכוי של תחנה חלשה להיכנס.</li>\r\n            <li>בחרום אין להשתמש ב PL לקליטה. אם שני התדרים האלו שמורים אצלכם בזיכרון עם PL קליטה, שימרו אותם בזיכרונות נוספים ללא PL קליטה.</li>\r\n            <li>מכשירי הנדי המאוחסנים זמן ממושך עלולים להיות ללא סוללות שמישות, והזיכרונות עשויים להימחק. הוציאו את המכשירים לריענון הסוללות הנטענות, ואם אין עוד בידכם סוללות שמישות, הכינו כבל להפעלה ישירה של המכשיר ממצבר הרכב או מצבר חיצוני. עדיף מכשיר מסורבל ממכשיר חסר תועלת.</li>\r\n            <li>רצוי להעדיף מכשירים שאינם תלויים ברשת החשמל. מכשיר חסר שימוש, עדיף שיהיה זרוק בתא המטען של הרכב, מאשר בבוידם בבית. אנטנה רבע אורך גל, מתוצרת עצמית, מחוט באורך 51 ס"מ, עדיפה על RubberDucky.</li>\r\n        </ol>\r\n        <p>\r\n            73<br />\r\n            נרשם ע"י זיו<br />\r\n            4X1UK\r\n        </p>\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/english/4x4z.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n\r\n        <h4>4X/4Z Callsigns</h4>\r\n        <hr />\r\n        <p>\r\n            <a href="#4Z8">4Z8</a> callsign series for foreign amateur radio operators<br />\r\n            <br />\r\n            4Z0, 4Z2 and 4Z3 Vanity callsigns    \r\n        </p>\r\n        <hr />\r\n        <p>\r\n            Class A (Advanced): 4X1 and 4Z1 callsign series<br />\r\n            <br />\r\n            Class B (General): 4X4, 4X5, 4X6, 4Z4 and 4Z5 callsigns (and a 2 letters suffix).<br />\r\n            <br />\r\n            Class C (Novice): 4Z9 callsigns (3 letters suffix) - no longer issued.<br />\r\n            <br />\r\n            Class D (Technician): 4Z7 callsigns (3 letters suffix).<br />\r\n            <br />\r\n        </p>\r\n\r\n\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/english/4z8.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy text-left" style="direction:ltr">\r\n\r\n        <h4>4Z8</h4>\r\n        <p>\r\n          This information is for your convenience by IARC and not by the Ministry of Communications. The Ministry of Communications is not obligated by this page.<br />\r\n            source: <a href="././Content/docs/4x_cept.pdf" target="_blank">4x_cept.pdf</a><br />\r\n        </p>\r\n        <hr />\r\n        <h4>Release of the call series 4Z8 for Foreign Amateur Radio Operators</h4>\r\n        <p>\r\n            The Ministry of Communications, being the sole responsible issuing Authority, for amateur radio call signs, recognizes CEPT Recommendation T/R 61-02, and will (under this recommendation) issue a National Israeli call sign in the series 4Z8, to amateur radio operators, which are coming from countries that have implemented and are participating in the CEPT Recommendation T/R 61-02.<br /><br />\r\n            A personal application for a Radio Amateur License in the series 4Z8 has to be made and requested from the Ministry of Communications. Each application will be decided on its own merit.\r\n        </p>\r\n\r\n        <label>The application for this category must comply with the following conditions:</label>\r\n        <ul>\r\n            <li>The applicant should be or have, continues employment in Israel for a period of more than 1 year, (365 days) by a recognized Employer, who’s place of business is registered locally.</li>\r\n            <li>The applicant must show proof that he has a valid (official) work permit, for employment in Israel and for which period of time, issued by The Department Labor & Welfare.</li>\r\n            <li>The applicant must show proof that he has a visa, or passport, stating to have gained entry into the country as a "Temporary Resident" issued by the Ministry of the Interior.</li>\r\n            <li>The applicant must show proof that he is in the possession of a current valid, Amateur Radio license compatible with the CEPT Recommendation T/R 61-02, without any blemish.</li>\r\n            <li>The applicant should not have had, in the past or at present an Israeli callsign.</li>\r\n            <li>The applicant, does not have had, in the past or at present, the status of a Israeli Citizen, or permanent Resident.</li>\r\n        </ul>\r\n\r\n        <hr />\r\n\r\n        <label>The following documents must be submitted:</label>\r\n        <ol>\r\n            <li>Letter from employer, stating kind of work, duration, residency, etc.</li>\r\n            <li>Show proof of temporary residency, (copy of contract for living quarters) for at least the period described as above.</li>\r\n            <li>Copy of the work permit.</li>\r\n            <li>Copy of the visa or passport document.</li>\r\n            <li>Copy of the license</li>\r\n        </ol>\r\n\r\n        <hr />\r\n\r\n        <label>If a local 4Z8 license is issued, its validity is in force only:</label>\r\n        <ol>\r\n            <li>if the licensing fee has been duly paid</li>\r\n            <li>for as long as its validity is indicated on the license.</li>\r\n        </ol>\r\n        \r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/english/beacons.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n\r\n        <h4>Beacons</h4>\r\n        <p>\r\n            There are several amateur radio beacons that operate in Israel.\r\n        </p>\r\n        <hr />\r\n\r\n        <h4>4X6TU</h4>\r\n        <p>The 4X6TU was used to run in Tel-Aviv University (hence the callsign TU). This is an HF beacon, and is active on several frequencies. These days It is active from the top of "Mishan" building in Giva\'taim.</p>\r\n        \r\n        <hr />\r\n        \r\n        <h4>4X4SIX</h4>\r\n        <p>\r\n            The 4X4SIX beacon was active on the educational TV station in Ramat-Aviv and was maintained by Yehuda 4X6ON that also built its antenna. The beacon itself was built by Jacob 4Z5AY.<br />\r\n            Today, the beacon is in Jerusalem and maintained by Carlos 4X1ZC.\r\n        </p>\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/english/cept.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-left" style="direction:ltr">\r\n\r\n        <h4>Licensing information for Israel - 4X</h4>\r\n        <p>\r\n            Israel implements CEPT T/R 61-01 and 02; reciprocal licenses are given to visitors by IARC.<br />\r\n            see CEPT instructions of Israel at <a href="././Content/docs/4x_cept.pdf" target="_blank">4x_cept.pdf</a><br />\r\n            All visitors\' licenses handled by IARC if not according to CEPT T/R 61-01 and 02.\r\n        </p>\r\n        <div class="tag-box tag-box-v2">\r\n            <p>\r\n                IARC Address:<br />\r\n                Israel Amateur Radio Club<br />\r\n                P.O.Box 17600<br />\r\n                Tel Aviv 6117501 Israel<br />\r\n            </p>\r\n        </div>\r\n        <hr />\r\n        <h4>CEPT countries, up to 3 months stay</h4>\r\n        <p>\r\n            Amateurs coming from countries that have CEPT implemented the CEPT T/R 61-01 agreement, do not have to apply for any reciprocal license. They can bring their equipment, and operate in Israel for a period of up to 3 months, providing that they have a valid "home country" license with them. Their call sign is as follows, 4X/ and home call. (see CEPT and special CEPT instructions of Israel)<br />\r\n            <br />\r\n            NON-EUROPEAN countries that have CEPT implemented the CEPT T/R 61-01 agreement, do not have to apply for any reciprocal license. Participating countries are: Australia, Canada, Israel, New Zealand, Netherlands Antilles, Peru, South Africa, USA.<br />\r\n            <br />\r\n            Amateurs coming from countries that have CEPT implemented the CEPT T/R 61-02 agreement, have to apply for a reciprocal license if staying for a period of more than 3 months.<br />\r\n            <br />\r\n            Being that the above mentioned countries are now participating in the "CEPT Recommendation T/R 61-01" as one of the non-European Countries, implementing this licensing agreement, just like Israel has done some years ago. It is not necessary anymore to apply and file any paperwork concerning, a temporary amateur radio reciprocal license. Under the "CEPT Recommendation T/R 61-01" you are allowed to operate your amateur radio equipment for a period of up to 3 months, according to your own (home country) licensing conditions and the prevailing rules of the country being visited. (Bring your present valid license with you)<br />\r\n            <br />\r\n            Israel is in IARU Region 1, which has a slightly different band plan and power limits.\r\n        </p>\r\n        <!--<hr />\r\n         <h4>More than 3 months, or non-CEPT countries</h4>\r\n        <p>\r\n            Any other country, that does not participate in the CEPT agreements, will have to notify the Israel Amateur Radio Club (see form 006). The Israel Amateur Radio Club can help in obtaining a reciprocal license. Application form 006 is <a href="http://www.qsl.net/oh2mcn/4xa.htm" target="_blank">here</a> as well as information as to what other documents are required.\r\n        </p>-->\r\n\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/english/freq.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid text-left" style="direction:ltr">\r\n        <!--Striped Rows-->\r\n        <div class="panel panel-red margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">Ham Radio Frequency</h4>\r\n            </div>\r\n            <table class="table table-bordered">\r\n                <thead>\r\n                    <tr class="table-header">\r\n                        <th rowspan="2" style="text-align: center; vertical-align: top">Band</th>\r\n                        <th rowspan="2" style="text-align: center; vertical-align: top">Range (KHz)</th>\r\n                        <th rowspan="2" style="text-align: center; vertical-align: top">Status</th>\r\n                        <th colspan="3" style="text-align: center; vertical-align: central">License</th>\r\n                    </tr>\r\n                    <tr class="table-header">\r\n                        <th style="text-align: center; vertical-align: central">Tech</th>\r\n                        <th style="text-align: center; vertical-align: central">Gen.</th>\r\n                        <th style="text-align: center; vertical-align: central">Adv.</th>\r\n                    </tr>\r\n\r\n                </thead>\r\n                <tbody>\r\n                    <tr>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">160 m</td>\r\n                        <td style="text-align: center; vertical-align: central">1810-1850</td>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">Primary</td>\r\n                        <td rowspan="3" style="text-align: center; vertical-align: central">-</td>\r\n                        <td style="text-align: center; vertical-align: central">250</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">1850-2000</td>\r\n                        <td style="text-align: center; vertical-align: central">40</td>\r\n                        <td style="text-align: center; vertical-align: central">40</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">80 m</td>\r\n                        <td style="text-align: center; vertical-align: central">3500-3800</td>\r\n                        <td style="text-align: center; vertical-align: central">Joined</td>\r\n                        <td style="text-align: center; vertical-align: central">250</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">60 m</td>\r\n                        <td style="text-align: center; vertical-align: central">*</td>\r\n                        <td colspan="1" style="text-align: center; vertical-align: central">Experimental upon personal request, Secondary</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">40 m</td>\r\n                        <td style="text-align: center; vertical-align: central">7000-7200</td>\r\n                        <td style="text-align: center; vertical-align: central">Primary</td>\r\n                        <td rowspan="7" style="text-align: center; vertical-align: central">-</td>\r\n                        <td rowspan="7" style="text-align: center; vertical-align: central">250</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">30 m</td>\r\n                        <td style="text-align: center; vertical-align: central">10100-10150</td>\r\n                        <td style="text-align: center; vertical-align: central">Secondary</td>\r\n                        <td style="text-align: center; vertical-align: central">1000</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">20 m</td>\r\n                        <td style="text-align: center; vertical-align: central">14000-14350</td>\r\n                        <td style="text-align: center; vertical-align: central">Primary</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">17 m</td>\r\n                        <td style="text-align: center; vertical-align: central">18068-18168</td>\r\n                        <td style="text-align: center; vertical-align: central">Secondary</td>\r\n                        <td style="text-align: center; vertical-align: central">1000</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">15 m</td>\r\n                        <td style="text-align: center; vertical-align: central">21000-21450</td>\r\n                        <td style="text-align: center; vertical-align: central">Primary</td>\r\n\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">12 m</td>\r\n                        <td style="text-align: center; vertical-align: central">24890-24990</td>\r\n                        <td style="text-align: center; vertical-align: central">Secondary</td>\r\n                        <td style="text-align: center; vertical-align: central">1000</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">10 m</td>\r\n                        <td style="text-align: center; vertical-align: central">28000-29700</td>\r\n                        <td style="text-align: center; vertical-align: central">Primary</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">6 m</td>\r\n                        <td style="text-align: center; vertical-align: central">50000-50200</td>\r\n                        <td style="text-align: center; vertical-align: central">Secondary</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">2 m</td>\r\n                        <td style="text-align: center; vertical-align: central">144-146 MHz</td>\r\n                        <td style="text-align: center; vertical-align: central">Primary</td>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">100</td>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">100</td>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">250</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">70 cm</td>\r\n                        <td style="text-align: center; vertical-align: central">430-440 MHz</td>\r\n                        <td style="text-align: center; vertical-align: central">Primary</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">23 cm</td>\r\n                        <td style="text-align: center; vertical-align: central">1240-1300 MHz</td>\r\n                        <td style="text-align: center; vertical-align: central">Secondary</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                        <td style="text-align: center; vertical-align: central">100</td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n        <div class="alert alert-info margin-bottom-40">\r\n            * The Ministry of Communication has allowed 1 year of temporary license to transmit in a narrow and predefined channels for General and Advanced licenses upon personal request.\r\n            The full decision is available <a href="http://www.moc.gov.il/sip_storage/FILES/0/3190.pdf" target="_blank">here</a>\r\n        </div>\r\n        <div class="alert alert-danger margin-bottom-40">\r\n            Novice (Class C) are elligable for 100 W on 7000-7050, 14000-14120, 21000-21150, 28000-28500, and 25 W on 144-146, 430-440.\r\n        </div>\r\n        <div class="alert alert-warning margin-bottom-40">\r\n            2m and 70cm can be used with 1000W (Class A) and 150W (Class B, D) for non-F3E (i.e. CW, SSB, RTTY, FACSIMILE, SSTV, FSTV)\r\n        </div>\r\n        <div class="panel panel-grey margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">VHF</h4>\r\n            </div>\r\n            <table class="table table-bordered">\r\n                <thead>\r\n                    <tr class="table-header">\r\n                        <th colspan="2" style="text-align: center; vertical-align: top">Channel</th>\r\n                        <th style="text-align: center; vertical-align: top">Frequency (MHz)</th>\r\n                        <th style="text-align: center; vertical-align: top">Usage</th\r\n                    </tr>\r\n                </thead>\r\n                <tbody>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R0</td>\r\n                        <td style="text-align: center; vertical-align: central">V00</td>\r\n                        <td style="text-align: center; vertical-align: central">145.000</td>\r\n                        <td rowspan="8" style="text-align: center; vertical-align: central">Repeater Input exclusive</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R1</td>\r\n                        <td style="text-align: center; vertical-align: central">V02</td>\r\n                        <td style="text-align: center; vertical-align: central">145.025</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R2</td>\r\n                        <td style="text-align: center; vertical-align: central">V04</td>\r\n                        <td style="text-align: center; vertical-align: central">145.050</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R3</td>\r\n                        <td style="text-align: center; vertical-align: central">V06</td>\r\n                        <td style="text-align: center; vertical-align: central">145.075</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R4</td>\r\n                        <td style="text-align: center; vertical-align: central">V08</td>\r\n                        <td style="text-align: center; vertical-align: central">145.100</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R5</td>\r\n                        <td style="text-align: center; vertical-align: central">V10</td>\r\n                        <td style="text-align: center; vertical-align: central">145.125</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R6</td>\r\n                        <td style="text-align: center; vertical-align: central">V12</td>\r\n                        <td style="text-align: center; vertical-align: central">145.150</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R7</td>\r\n                        <td style="text-align: center; vertical-align: central">V14</td>\r\n                        <td style="text-align: center; vertical-align: central">145.175</td>\r\n                    </tr>\r\n                    <tr class="alert-danger">\r\n                        <td style="text-align: center; vertical-align: central">R8</td>\r\n                        <td style="text-align: center; vertical-align: central">V16</td>\r\n                        <td style="text-align: center; vertical-align: central">145.200</td>\r\n                        <td style="text-align: center; vertical-align: central">Space communication</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R9</td>\r\n                        <td style="text-align: center; vertical-align: central">V18</td>\r\n                        <td style="text-align: center; vertical-align: central">145.225</td>\r\n                        <td rowspan="15" style="text-align: center; vertical-align: central">Simplex channels</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R10</td>\r\n                        <td style="text-align: center; vertical-align: central">V20</td>\r\n                        <td style="text-align: center; vertical-align: central">145.250</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R11</td>\r\n                        <td style="text-align: center; vertical-align: central">V22</td>\r\n                        <td style="text-align: center; vertical-align: central">145.275</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R12</td>\r\n                        <td style="text-align: center; vertical-align: central">V24</td>\r\n                        <td style="text-align: center; vertical-align: central">145.300</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R13</td>\r\n                        <td style="text-align: center; vertical-align: central">V26</td>\r\n                        <td style="text-align: center; vertical-align: central">145.325</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R14</td>\r\n                        <td style="text-align: center; vertical-align: central">V28</td>\r\n                        <td style="text-align: center; vertical-align: central">145.350</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R15</td>\r\n                        <td style="text-align: center; vertical-align: central">V30</td>\r\n                        <td style="text-align: center; vertical-align: central">145.375</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R16</td>\r\n                        <td style="text-align: center; vertical-align: central">V32</td>\r\n                        <td style="text-align: center; vertical-align: central">145.400</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R17</td>\r\n                        <td style="text-align: center; vertical-align: central">V34</td>\r\n                        <td style="text-align: center; vertical-align: central">145.425</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R18</td>\r\n                        <td style="text-align: center; vertical-align: central">V36</td>\r\n                        <td style="text-align: center; vertical-align: central">145.450</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R19</td>\r\n                        <td style="text-align: center; vertical-align: central">V38</td>\r\n                        <td style="text-align: center; vertical-align: central">145.475</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R20</td>\r\n                        <td style="text-align: center; vertical-align: central">V40</td>\r\n                        <td style="text-align: center; vertical-align: central">145.500</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R21</td>\r\n                        <td style="text-align: center; vertical-align: central">V42</td>\r\n                        <td style="text-align: center; vertical-align: central">145.525</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R22</td>\r\n                        <td style="text-align: center; vertical-align: central">V44</td>\r\n                        <td style="text-align: center; vertical-align: central">145.550</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R23</td>\r\n                        <td style="text-align: center; vertical-align: central">V46</td>\r\n                        <td style="text-align: center; vertical-align: central">145.575</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R0</td>\r\n                        <td style="text-align: center; vertical-align: central">V48</td>\r\n                        <td style="text-align: center; vertical-align: central">R145.600</td>\r\n                        <td rowspan="8" style="text-align: center; vertical-align: central">Repeater Output exclusive</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R1</td>\r\n                        <td style="text-align: center; vertical-align: central">RV50</td>\r\n                        <td style="text-align: center; vertical-align: central">145.625</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R2</td>\r\n                        <td style="text-align: center; vertical-align: central">RV52</td>\r\n                        <td style="text-align: center; vertical-align: central">145.650</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R3</td>\r\n                        <td style="text-align: center; vertical-align: central">RV54</td>\r\n                        <td style="text-align: center; vertical-align: central">145.675</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R4</td>\r\n                        <td style="text-align: center; vertical-align: central">RV56</td>\r\n                        <td style="text-align: center; vertical-align: central">145.700</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R5</td>\r\n                        <td style="text-align: center; vertical-align: central">RV58</td>\r\n                        <td style="text-align: center; vertical-align: central">145.725</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R6</td>\r\n                        <td style="text-align: center; vertical-align: central">RV60</td>\r\n                        <td style="text-align: center; vertical-align: central">145.750</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R7</td>\r\n                        <td style="text-align: center; vertical-align: central">RV62</td>\r\n                        <td style="text-align: center; vertical-align: central">145.775</td>\r\n                    </tr>\r\n                    <tr class="alert-danger">\r\n                        <td style="text-align: center; vertical-align: central"></td>\r\n                        <td style="text-align: center; vertical-align: central">V64</td>\r\n                        <td style="text-align: center; vertical-align: central">145.800</td>\r\n                        <td rowspan="8" style="text-align: center; vertical-align: central">Space communication</td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n\r\n\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/english/meetings.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n        <div class="margin-bottom-40">\r\n            <h4>Rishon LeZion Moshe Beker 10, Restaurant "Nafis", every Friday at 18:00</h4>\r\n            <iframe width="100%" height="350" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://maps.google.co.il/maps?q=Rishon+LeZion+Moshe+Beker+10&amp;sll=31.974150,34.808649&amp;hl=iw&amp;ie=UTF8&amp;hq=&amp;hnear=%D7%9E%D7%A9%D7%94+%D7%91%D7%A7%D7%A8+10,+%D7%A8%D7%90%D7%A9%D7%95%D7%9F+%D7%9C%D7%A6%D7%99%D7%95%D7%9F&amp;ll=31.97415,34.808649&amp;spn=0.033165,0.055747&amp;t=m&amp;z=14&amp;output=embed"></iframe>\r\n        </div>\r\n        <hr />\r\n        <div class="margin-bottom-40">\r\n            <h4>Beer Sheva Dereh Hevron 21, BIG Center, Cafe "Pizputz", every Friday at 12:00</h4>\r\n            <iframe width="100%" height="350" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://maps.google.co.il/maps?q=Beer+Sheva+Derech+Hevron+21&amp;ie=UTF8&amp;hq=&amp;hnear=%D7%93%D7%A8%D7%9A+%D7%97%D7%91%D7%A8%D7%95%D7%9F+21,+%D7%91%D7%90%D7%A8+%D7%A9%D7%91%D7%A2&amp;gl=il&amp;t=m&amp;z=14&amp;ll=31.243857,34.809777&amp;output=embed"></iframe>\r\n        </div>\r\n        <hr />\r\n        <div class="margin-bottom-40">\r\n            <h4>Tel Aviv Tsahal 71, Cafe "Beta Cafe" every Friday at 21:00</h4>\r\n            <iframe width="100%" height="350" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://maps.google.co.il/maps?f=q&amp;source=s_q&amp;hl=iw&amp;geocode=&amp;q=Tel+Aviv+Tsahal+71&amp;sll=32.121637,34.835522&amp;sspn=0.002069,0.003484&amp;g=Tel+Aviv+Tsahal+71&amp;ie=UTF8&amp;hq=&amp;hnear=%D7%A6%D7%94%22%D7%9C+71,+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91+%D7%99%D7%A4%D7%95&amp;ll=32.121532,34.834714&amp;spn=0.016483,0.027874&amp;t=m&amp;z=14&amp;output=embed"></iframe>\r\n        </div>\r\n\r\n\r\n\r\n    </div>\r\n\r\n</div>\r\n\r\n';});


define('text!views/english/membership.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n\r\n        <h4>Membership</h4>\r\n        <p>\r\n            The membership fee will be used to finance the association&#39;s services that are provided to its members.<br />\r\n            The membership fee is collected on a calendar basis [ending every 31.12] and their payment at the beginning of each activity year is of crucial importance for the purpose of planning the annual activity budget.<br />\r\n        </p>\r\n        <hr />\r\n        <h4>Membership fee for foreign residents</h4>\r\n        <ul>\r\n            <li>100USD for three years</li>\r\n        </ul>\r\n        <h4>Membership fees for Israeli residents</h4>\r\n        <ul>\r\n            <li>\r\n                250NIS per person for renewal of membership until 28.2 of the calendar year (ending on 31.12)\r\n            </li>\r\n            <li>300NIS starting from 1.3 for the year of activity ending on 31.12.</li>\r\n        </ul>\r\n\r\n        <h4>Club and family stations</h4>\r\n        <ul>\r\n            <li>\r\n                300NIS per person for renewal of membership until 28.2 of the calendar year (ending on 31.12)\r\n            </li>\r\n            <li>350NIS starting from 1.3 for the year of activity ending on 31.12.</li>\r\n        </ul>\r\n\r\n        <h4>Youth and soldiers</h4>\r\n        <ul>\r\n            <li>\r\n                150NIS per person for renewal of membership until 28.2 of the calendar year (ending on 31.12)\r\n            </li>\r\n            <li>200NIS starting from 1.3 for the year of activity ending on 31.12.</li>\r\n        </ul>\r\n\r\n        <p>\r\n            New amateurs who join the association as of 1.10 for the calendar year of activity (ending on 31.12) will also receive full membership for the calendar year of activity that follows as part of the payment made.\r\n        </p>\r\n\r\n        <h4>The membership fee can be paid in a number of ways:</h4>\r\n        <ul>\r\n            <li>\r\n                <a href="https://courses.iarc.org/product/%D7%AA%D7%A9%D7%9C%D7%95%D7%9D-%D7%93%D7%9E%D7%99-%D7%97%D7%91%D7%A8/">Credit Card</a>\r\n            </li>\r\n            <li>\r\n                To pay for the PAYBOX app: Use the following link:\r\n                <a href="https://payboxapp.page.link/NfSJCpuQZf6VELdM8">https://payboxapp.page.link/NfSJCpuQZf6VELdM8</a><br />\r\n                You can pay as a guest - no need to install an app. Fill in the required details including the call sign.\r\n            </li>\r\n            \r\n            <li>Face to face with the treasurer at a meeting at the association&#39;s offices: 3 Alpert Street, Yehud, or at a meeting that the association holds from time to time.</li>\r\n            \r\n            <li>Check by mail (not by registered mail) to the association&#39;s offices Address: Israel Amateur Radio Association (PO Box) PO Box 17600 Tel Aviv Zip code 6117501 Be sure to write the call sign on the back of the check!</li>\r\n            \r\n            <li>\r\n                Bank transfer to the association&#39;s account:<br />\r\n                If you have chosen a bank transfer, be sure to write down the amateur&#39;s call sign in the details in order to facilitate the management of the registration and the link between the amount transferred and the paying amateur.\r\n            </li>\r\n        </ul>\r\n\r\n        <p>\r\n            Account details:<br />\r\n            Israel Amateur Radio Association,<br />\r\n            National Bank (10),<br />\r\n            Account number 02986919,<br />\r\n            Tel Ganim Branch 988,<br />\r\n            Givatayim, Israel.<br />\r\n            <br />\r\n            (IBAN) ID number:<br />\r\n            IL50 0109 8800 0000 2986 919<br />\r\n        </p>\r\n\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/english/repeaters.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n        <h4>IARC Repeaters Network</h4>\r\n        <p>\r\n            Below is the repeaters network as maintained by IARC in routine and emergency.\r\n        </p>\r\n        <hr />\r\n    </div>\r\n\r\n    <div class="row-fluid text-left" style="direction: ltr">\r\n        <div class="col-md-12">\r\n            <span>Multi site repeater is a connection of several repeaters to cover a large geographical area</span>\r\n            <div class="panel panel-red margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">Analog VHF Repeaters</h4>\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: left">Repeater</th>\r\n                            <th style="text-align: left">Frequency</th>\r\n                            <th style="text-align: left">Shift</th>\r\n                            <th style="text-align: right">PL(tx)</th>\r\n                            <th style="text-align: right">PL(rx)</th>\r\n                            <th style="text-align: left">Location</th>\r\n                            <th style="text-align: left">Comments</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td>R-0</td>\r\n                            <td>145.600</td>\r\n                            <td>- 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Mitzpe Ramon</td>\r\n                            <td>Digital repeater on demand</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-1</td>\r\n                            <td>145.625</td>\r\n                            <td>- 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Jerusalem</td>\r\n                            <td>Connected to multi-site repeater</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-3</td>\r\n                            <td>145.675</td>\r\n                            <td>- 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Megido</td>\r\n                            <td>Connected to multi-site repeater</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-7</td>\r\n                            <td>145.775</td>\r\n                            <td>- 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Tel Aviv</td>\r\n                            <td>Connected to multi-site repeater</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-12A</td>\r\n                            <td>144.700</td>\r\n                            <td>+ 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Haifa</td>\r\n                            <td>Connected to multi-site repeater</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-11.5</td>\r\n                            <td>145.2875</td>\r\n                            <td>- 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Be\'er Sheva</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-13</td>\r\n                            <td>145.325</td>\r\n                            <td>- 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Yatir</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-14</td>\r\n                            <td>145.350</td>\r\n                            <td>- 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Hermon</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-15</td>\r\n                            <td>144.775</td>\r\n                            <td>+ 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td>114.8</td>\r\n                            <td>Giva\'taim</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-16</td>\r\n                            <td>145.400</td>\r\n                            <td>- 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td></td>\r\n                            <td>Netania</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-18</td>\r\n                            <td>145.450</td>\r\n                            <td>- 600Khz</td>\r\n                            <td>91.5</td>\r\n                            <td></td>\r\n                            <td>Kiryat Uno</td>\r\n                            <td></td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n            <div class="panel panel-blue margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">Analog UHF Repeaters</h4>\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: left">Repeater</th>\r\n                            <th style="text-align: left">Frequency</th>\r\n                            <th style="text-align: left">Shift</th>\r\n                            <th style="text-align: right">PL(tx)</th>\r\n                            <th style="text-align: right">PL(rx)</th>\r\n                            <th style="text-align: left">Location</th>\r\n                            <th style="text-align: left">Comments</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td>R-70</td>\r\n                            <td>438.650</td>\r\n                            <td>7.6Mhz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Tel Aviv</td>\r\n                            <td>Digital repeater by default</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-71</td>\r\n                            <td>438.675</td>\r\n                            <td>7.6Mhz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Rosh HaAyin</td>\r\n                            <td>Digital repeater by default</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-73</td>\r\n                            <td>438.725</td>\r\n                            <td>7.6Mhz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>Haifa</td>\r\n                            <td>Digital repeater by default</td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n            <div class="panel panel-black margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">Digital VHF Repeaters</h4>\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: left">Repeater</th>\r\n                            <th style="text-align: left">Rx</th>\r\n                            <th style="text-align: left">Tx</th>\r\n                            <th style="text-align: left">Color Code</th>\r\n                            <th style="text-align: left">QTH</th>\r\n                            <th style="text-align: left">Default TG on TS1</th>\r\n                            <th style="text-align: left">Connectivity</th>\r\n                            <th style="text-align: left">Remarks</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td>R-0</td>\r\n                            <td>145.600</td>\r\n                            <td>145.000</td>\r\n                            <td>1</td>\r\n                            <td>Mitzpe Ramon</td>\r\n                            <td>Dynamic</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>Analog repeater by default</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-12B</td>\r\n                            <td>145.300</td>\r\n                            <td>144.700</td>\r\n                            <td>1</td>\r\n                            <td>Eilat (future repeater)</td>\r\n                            <td>425</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>TS2 is available for any talk group</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-14</td>\r\n                            <td>145.350</td>\r\n                            <td>144.750</td>\r\n                            <td>1</td>\r\n                            <td>Hermon</td>\r\n                            <td>Dynamic</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>Analog repeater by default</td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n            <div class="panel panel-green margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">Digital UHF Repeaters</h4>\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: left">Repeater</th>\r\n                            <th style="text-align: left">Rx</th>\r\n                            <th style="text-align: left">Tx</th>\r\n                            <th style="text-align: left">Color Code</th>\r\n                            <th style="text-align: left">QTH</th>\r\n                            <th style="text-align: left">Default TG on TS1</th>\r\n                            <th style="text-align: left">Connectivity</th>\r\n                            <th style="text-align: left">Remarks</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td>R-68 (425101) </td>\r\n                            <td>438.600</td>\r\n                            <td>431.000</td>\r\n                            <td>1</td>\r\n                            <td>Jerusalem</td>\r\n                            <td>425</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>TS2 is available for any talk group</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-68 (425902) </td>\r\n                            <td>438.600</td>\r\n                            <td>431.000</td>\r\n                            <td>1</td>\r\n                            <td>Eilat</td>\r\n                            <td>425</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>TS2 is available for any talk group</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-70 (425201) </td>\r\n                            <td>438.650</td>\r\n                            <td>431.050</td>\r\n                            <td>1</td>\r\n                            <td>Tel Aviv</td>\r\n                            <td>425</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>TS2 is available for any talk group</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-71 (425202) </td>\r\n                            <td>438.675</td>\r\n                            <td>431.075</td>\r\n                            <td>1</td>\r\n                            <td>Rosh Ha\'ayin</td>\r\n                            <td>425</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>TS2 is available for any talk group</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-73 (425301) </td>\r\n                            <td>438.725</td>\r\n                            <td>431.125</td>\r\n                            <td>1</td>\r\n                            <td>Haifa</td>\r\n                            <td>425</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>TS2 is available for any talk group</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-75 (425401) </td>\r\n                            <td>438.775</td>\r\n                            <td>431.175</td>\r\n                            <td>1</td>\r\n                            <td>Be\'er Sheva</td>\r\n                            <td>425</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>TS2 is available for any talk group</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-78 (425701)</td>\r\n                            <td>438.850</td>\r\n                            <td>431.250</td>\r\n                            <td>1</td>\r\n                            <td>Ma\'ale Gilboa</td>\r\n                            <td>425</td>\r\n                            <td>BrandMeister</td>\r\n                            <td>TS2 is available for any talk group</td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n        <u>DMR Network</u><br />\r\n        Local BrandMeister server: 4251. DNS Address: brandmeister-il.ddns.net password: passw0rd<br />\r\n        Local Israel talk group: TG425. Color code:1 Time slot:1 This TG is available statically on all DMR repeaters except Mitzpe Ramon and Hermon. On those repeaters it is available on demand (Dynamic TG)<br />\r\n        All other talk groups: please respect local convention and use Time slot 2.<br />\r\n        Parrot is available as a Private call to ID 425997 when connected to local BM server only.<br />\r\n        Bridge to analog FM repeaters network: Use Talk group TG42577. Please use Time slot 2.<br />\r\n        Network access to analog repeaters via AllStar: please connect to node 46737<br />\r\n    </div>\r\n</div>\r\n';});


define('text!views/english/skf.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid text-left" style="direction: ltr">\r\n        <h2>The Silent Key\'s Forest...how it all began</h2>\r\n\r\n        <div class="row">\r\n            <div class="col-md-9">\r\n                <p>It all began in the mind of the late Ozzie (Tzvi) Osrin 4X4CW who wanted to establish a memorial forest of trees for all the radio amateurs of the world. He had been a radio man, a captain in the South African airforce and later served with the Israel Defence Forces. He was also the first officially licensed radio amateur in Israel.</p>\r\n                <p>As the years when by, the late Shimshon "Sammy" Lotan 4X4GF joined him in developing and implementing this idea, accompanied by Tuvia Greengross 4X4GT, Shlomo Menuhin 4X1AS, Ahron Kirschner 4X1AT and Arieh Sourkiss 4X6UO. In 1983-4, 4X4CW, 4X4GF, 4X1AS, 4X4GT, 4X1AT and 4Z4ZB met in Shoresh with the IARC executive, each one of the aforementioned pledging 100 trees, and the project began to take shape.</p>\r\n                <p>4X4GF, a real steam-roller, who was known for his monthly motor tours of the country for hams, got things into the implementation stage. Along with 4X1AT he arranged a meeting in Jerusalem with the head of the J.N.F. forestation department, and after a few more meetings, a site was found on the hills between Modi\'in and the Hadid ridge in the Ben Shemen forests.</p>\r\n            </div>\r\n            <div class="col-md-3">\r\n                <img class="img-responsive" src="assets/img/skf/stone2.jpg" alt="">\r\n            </div>\r\n        </div>\r\n        <div class="row">\r\n            <div class="col-md-9">\r\n                <p>A ham will always look for a great QTH from which signals will "get out" in the best possible manner, and here it was. On October 22 1985, with the presence of dignitaries from the government and the J.N.F., the first cairn was erected for the first thousand trees. The second two cairns were erected later in memory of 4X4CW and 4X4GF respectively.</p>\r\n                <p>The purpose of the forest is to be a place to plant trees in memory of radio amateurs who have passed away and in honour of living amateurs. It is a place for festive events, for get-togethers of hams and field-days. It may be used for camping.</p>\r\n                <p>We are hopeful that each ham in Israel and the world will have at least one tree there. Please help us plant additional trees there. It is relatively easy to get to the site which is blessed with a beautiful view. For every thousand trees we plant, a cairn is erected with a plaque on it or alternately, a picnic table with a barbecue.</p>\r\n                <p>More field-days and operations are planned from the Silent Keys\' Forest with operations using the special call 4X4SKF. Please don\'t forget that in addition to the special 4X4SKF QSL card, a certificate is awarded for every donation of trees in the name of the person honoured.</p>\r\n                <p>We shall remember our fellow amateurs who are no longer with us; their memory will be alive with us.</p>\r\n            </div>\r\n            <div class="col-md-3">\r\n                <img class="img-responsive" src="assets/img/skf/skf_flag.jpg" alt="">\r\n            </div>\r\n        </div>\r\n        <hr />\r\n\r\n        <div class="row">\r\n            <div class="col-md-8">\r\n                <h2><span data-bind="html: skfcount"></span> Trees in the "Silent Key Forest"</h2>\r\n            </div>\r\n            <div class="col-md-4 pull-right" style="max-width: 350px; margin-top:8px;">\r\n                <div id="custom-search-input">\r\n                    <div class="input-group col-md-12">\r\n                        <input type="text" class="  search-query form-control" placeholder="Search" data-bind="value: searchInput, valueUpdate: \'afterkeydown\'" />\r\n                        <span class="input-group-btn">\r\n                            <button class="btn btn-success" type="button">\r\n                                <span class="icon icon-search"></span>\r\n                            </button>\r\n                        </span>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n        <!--Striped Rows-->\r\n        <div class="panel panel-green margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">Silent Key Forest</h4>\r\n            </div>\r\n            <table class="table table-striped table-hover" id="dataTable">\r\n                <thead>\r\n                    <tr>\r\n                        <th># of Trees</th>\r\n                        <th>Donated by</th>\r\n                        <th>In Memory of</th>\r\n                        <th>Callsign</th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody data-bind="foreach: skf">\r\n                    <tr>\r\n                        <td data-bind="text: amount"></td>\r\n                        <td data-bind="text: don"></td>\r\n                        <td data-bind="text: mem"></td>\r\n                        <td data-bind="text: call"></td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/event_registration.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy">\r\n        <input type="text" class="form-control" placeholder="שם" data-bind="value: name" tabindex="1" width="120"><br />\r\n        <input type="text" class="form-control" placeholder="אות קריאה" data-bind="value: callsign" tabindex="1" style="text-transform:uppercase" width="120"><br />\r\n        <input type="text" class="form-control" placeholder="אימייל" data-bind="value: email" tabindex="1" width="120"><br />\r\n\r\n        <div class="panel-group acc-v1 margin-bottom-40" id="accordion">\r\n            <div data-bind="foreach: items">\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <p class="panel-title">\r\n                            <div class="row">\r\n                                <div class="col-md-2 text-left" style="padding:10px 0 0 30px;">\r\n                                    <button id="SendBtn" type="button" class="btn btn-success" data-bind="command: Send">הרשם</button>\r\n                                </div>\r\n                                <div class="col-md-10">\r\n                                    <a class="accordion-toggle" data-bind="text: title, attr: {href: \'#x\'+id}" data-toggle="collapse" data-parent="#accordion"></a>\r\n                                </div>\r\n                                \r\n                            </div>\r\n                        </p>\r\n                    </div>\r\n                    <div data-bind="attr: {\'id\': \'x\'+id}" class="panel-collapse collapse">\r\n                        <div class="panel-body" data-bind="html: description"></div>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <!--<h2>טיול להרודיון</h2>\r\n        <p>\r\n            בתאריך 7 לדצמבר (יום שישי) ייערך טיול אגודה להרודיון, שנמצא כ-12 ק"מ דרומית לירושלים.<br />\r\n            הטיול מלווה במדריך, מיועד לציבור חובבי הרדיו ולמשפחותיהם, וייערך ברכבים פרטיים.<br />\r\n            מנהלה:<br />\r\n            חובבי  המרכז נפגשים בתחנת דלק לטרון בשעה 09:00.<br />\r\n            חובבי אזור ירושלים נפגשים בגילו בשעה 10:00, ומשם נסיעה להרודיון.<br />\r\n            ערוץ S10 ישמש לצרכי תקשורת והדרכה.<br />\r\n            כניסה לאתר הרודיון ומדריך תמומן ע"י האגודה לחובבי הרדיו משלמי המיסים ולמשפחותיהם.<br />\r\n            תהיה גם אפשרות להפעלת HF במקום.<br />\r\n            פרטים מנהלה נוספים יפורסמו בהמשך.<br />\r\n            <br />\r\n            בשאלות בנושא יש לפנות ב-EMAIL ל:<br />\r\n            דב גביש 4Z1DX  ב: dov4z4dx@gmail.com<br />\r\n            אלי שחף 4Z1NB ב:  elikon@012.net.il<br />\r\n            בברכה. ועד האגודה.\r\n        </p>\r\n        <hr />\r\n        <p>\r\n            <input type="text" class="form-control" id="personalname" placeholder="שם" data-bind="value: name" tabindex="1" width="120"><br />\r\n            <input type="text" class="form-control" id="callsign" placeholder="אות קריאה" data-bind="value: callsign" tabindex="1" style="text-transform:uppercase" width="120"><br />\r\n            <input type="text" class="form-control" id="email" placeholder="אימייל" data-bind="value: email" tabindex="1" width="120"><br />\r\n            <button id="SendBtn" type="button" class="btn btn-success" data-bind="click: Send">הרשם</button>\r\n        </p>-->\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/event_registration_admin.html',[],function () { return '<div class="container">\r\n    <div class="col-md-2">\r\n\r\n    </div>\r\n    <div class="col-md-10">\r\n        <div data-bind="foreach: events">\r\n            <div class="panel panel-red margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title"><span data-bind="html: title"></span></h4>\r\n                </div>\r\n                <table class="table table-striped table-hover">\r\n                    <thead>\r\n                        <tr>\r\n                            <th class="text-right" style="width: 30px">#</th>\r\n                            <!--<th class="text-right">תאריך</th>-->\r\n                            <th class="text-right">שם</th>\r\n                            <th class="text-right">אות קריאה</th>\r\n                            <th class="text-right">דוא"ל</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody data-bind="foreach: $root.getEventRegistrants($data.id)">\r\n                        <tr>\r\n                            <td data-bind="text: $index()+1"></td>\r\n                            <!--<td data-bind="text: timestamp"></td>-->\r\n                            <td data-bind="text: name"></td>\r\n                            <td data-bind="text: callsign"></td>\r\n                            <td data-bind="text: email"></td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});


define('text!views/examforms.html',[],function () { return '<div class="container">\r\n    <h3>טופסי הרשמה לבחינות</h3>\r\n    <div class="sorting-block">\r\n        <ul class="row sorting-grid">\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="https://www.iarc.org/iarc/Content/docs/ExamRequest.pdf" target="_blank">\r\n                    <img class="img-responsive" src="assets/img/main/formicon.png" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>בקשה לבחינה</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="https://www.iarc.org/iarc/Content/docs/ConfState.pdf" target="_blank">\r\n                    <img class="img-responsive" src="assets/img/main/formicon.png" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>הצהרת סודיות</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="https://www.iarc.org/iarc/Content/docs/PersonalInfo.pdf" target="_blank">\r\n                    <img class="img-responsive" src="assets/img/main/formicon.png" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>פרטים אישיים</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n        </ul>\r\n    </div>\r\n</div>\r\n';});


define('text!views/exams.html',[],function () { return '<div class="container">\r\n    <h2>מבחנים לקבלת רישיון חובבי רדיו</h2>\r\n    <p>\r\n        משרד התקשורת מקיים 4 פעמים בשנה מבחנים להוצאת רישיון חובבי רדיו. בדרך כלל (אבל לא בהכרח).\r\n    </p>\r\n    <p>\r\n        ביום המבחן ניתן להיבחן לכל דרגה בהתאם לנהלי המשרד. (דרגה א\' למי שהינו חובב דרגה ב\' למעלה משנה)<br />\r\n        ישנן שתי דרכים להירשם למבחן:\r\n    </p>\r\n    <ol>\r\n        <li>\r\n            הרישום למבחן מתבצע על ידי החובב בדף מיוחד באתר האינטרנט של משרד התקשורת.<br />\r\n            לקראת קיום מבחן, משרד התקשורת מעדכן את אגודת חובבי הרדיו על קיום המבחן והאגודה מפיצה את הידיעה בקרב החובבים הרשומים באגודה.\r\n        </li>\r\n        <li>\r\n            מי שאינו חבר באגודת חובבי הרדיו יתאם את ההרשמה למבחן בקשר ישיר עם משרד התקשורת.<br />\r\n            יש לפנות אל מארק שטרן בטלפון 035198173 או בדואר אלקטרוני <a href="mailto:sternm@moc.gov.il">sternm@moc.gov.il</a>\r\n        </li>\r\n    </ol>\r\n    <p>\r\n        משרד התקשורת שולח לכל חובב שנרשם לבחינה, שובר לתשלום אותו משלם החובב דרך קישור שיקבל במייל מהמשרד.<br />\r\n    </p>\r\n    <p>\r\n        סילבוס\r\n    </p>\r\n    <ul>\r\n        <li><a href="https://www.gov.il/BlobFolder/service/radio-amateurs-certificates/he/RadioAmateur_silabus%20amateur%20radio%20test%20level_a.pdf" target="_blank">סילבוס דרגה א</a></li>\r\n        <li><a href="https://www.gov.il/BlobFolder/service/radio-amateurs-certificates/he/RadioAmateur_silabus%20amateur%20radio%20test%20level_b.pdf" target="_blank">סילבוס דרגה ב</a></li>\r\n        <li><a href="https://www.gov.il/BlobFolder/service/radio-amateurs-certificates/he/RadioAmateur_silabus%20amateur%20radio%20test%20level_c.pdf" target="_blank">סילבוס דרגה ג</a></li>\r\n    </ul>\r\n    <p>\r\n        אגודת חובבי הרדיו מקיימת קורס מתוקשב ללימוד החומר הנדרש.<br />\r\n        פרטים על הקורס ניתן לקבל אצל דני קצמן 0505207273 או במייל <a href="mailto:dankatzman1954@gmail.com">dankatzman1954@gmail.com</a>\r\n    </p>\r\n</div>\r\n\r\n';});


define('text!views/freq.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid">\r\n        <!--Striped Rows-->\r\n        <div class="panel panel-red margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">תדרי חובבים</h4>\r\n            </div>\r\n            <br />\r\n            <p>פירוט של תחומי התדר המותרים לשימוש חובבי הרדיו בישראל ניתן למצוא באתר <a href="https://www.gov.il/BlobFolder/service/radio-amateurs-certificates/he/RadioAmateur_terms-committee-allocation-frequency-bands-use-radio-amateur-country.pdf" target="_blank" style="text-decoration: underline"> משרד התקשורת</a></p>\r\n\r\n        </div>\r\n        <p>באדיבות שמאי 4Z1WS מצורפות טבלאות תדרים שמטרתן:</p>\r\n        <ul>\r\n            <li>ליצור דף אחד מודפס באותיות גדולות, קריא ונגיש, שאפשר לתלות על קיר התחנה או להגדיר כרקע במחשב, ולקרוא את התדרים בנוחות ובמהירות ממקום הישיבה בתחנה</li>\r\n            <li>להציג את תדרי העבודה המומלצים העיקריים בכל הבנדים לפי שיטות האפנון וגם לפי סוג ההפעלה  (QRP, QRS, WFF, SOTA וכו\')</li>\r\n            <li>ליידע את החובב לא רק איפה לשדר, אלא גם היכן לא לשדר כדי למנוע הפרעה לחובבים אחרים  (למשל שידור בהספק גבוה בתדר המיועד ל QRP או SSB בתדר המיועד ל SSTV וכו\')</li>\r\n        </ul>\r\n        <a href="https://www.iarc.org/iarc/Content/docs/bandplan_bw1.pdf" target="_blank">תבלת תדרים - שחור לבן דף 1</a><br />\r\n        <a href="https://www.iarc.org/iarc/Content/docs/bandplan_bw2.pdf" target="_blank">תבלת תדרים - שחור לבן דף 2</a><br />\r\n        <a href="https://www.iarc.org/iarc/Content/docs/bandplan_c1.pdf" target="_blank">תבלת תדרים - צבעונית דף 1</a><br />\r\n        <a href="https://www.iarc.org/iarc/Content/docs/bandplan_c2.pdf" target="_blank">תבלת תדרים - צבעונית דף 2</a>\r\n\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/freq_old.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid">\r\n        <!--Striped Rows-->\r\n        <div class="panel panel-red margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">תדרי חובבים</h4>\r\n            </div>\r\n            <table class="table table-bordered">\r\n                <thead>\r\n                    <tr class="table-header">\r\n                        <th rowspan="2" style="text-align: center; vertical-align: top">תחום</th>\r\n                        <th rowspan="2" style="text-align: center; vertical-align: top">תדרים (קה"צ)</th>\r\n                        <th rowspan="2" style="text-align: center; vertical-align: top">סטטוס</th>\r\n                        <th colspan="3" style="text-align: center; vertical-align: central">רשיון</th>\r\n                    </tr>\r\n                    <tr class="table-header">\r\n                        <th style="text-align: center; vertical-align: central">ד</th>\r\n                        <th style="text-align: center; vertical-align: central">ב</th>\r\n                        <th style="text-align: center; vertical-align: central">א</th>\r\n                    </tr>\r\n\r\n                </thead>\r\n                <tbody>\r\n                    <tr>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">160 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">1810-1850</td>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">ראשוני</td>\r\n                        <td rowspan="3" style="text-align: center; vertical-align: central">-</td>\r\n                        <td style="text-align: center; vertical-align: central">250</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">1850-2000</td>\r\n                        <td style="text-align: center; vertical-align: central">40</td>\r\n                        <td style="text-align: center; vertical-align: central">40</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">80 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">3500-3800</td>\r\n                        <td style="text-align: center; vertical-align: central">משותף</td>\r\n                        <td style="text-align: center; vertical-align: central">250</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">60 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">*</td>\r\n                        <td colspan="1" style="text-align: center; vertical-align: central">נסיוני על בסיס בקשה פרטנית  במעמד משני</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">40 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">7000-7200</td>\r\n                        <td style="text-align: center; vertical-align: central">ראשוני</td>\r\n                        <td rowspan="7" style="text-align: center; vertical-align: central">-</td>\r\n                        <td rowspan="7" style="text-align: center; vertical-align: central">250</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">30 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">10100-10150</td>\r\n                        <td style="text-align: center; vertical-align: central">משני</td>\r\n                        <td style="text-align: center; vertical-align: central">1000</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">20 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">14000-14350</td>\r\n                        <td style="text-align: center; vertical-align: central">ראשוני</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">17 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">18068-18168</td>\r\n                        <td style="text-align: center; vertical-align: central">משני</td>\r\n                        <td style="text-align: center; vertical-align: central">1000</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">15 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">21000-21450</td>\r\n                        <td style="text-align: center; vertical-align: central">ראשוני</td>\r\n\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">12 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">24890-24990</td>\r\n                        <td style="text-align: center; vertical-align: central">משני</td>\r\n                        <td style="text-align: center; vertical-align: central">1000</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">10 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">28000-29700</td>\r\n                        <td style="text-align: center; vertical-align: central">ראשוני</td>\r\n                        <td style="text-align: center; vertical-align: central">1500</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">6 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">50000-50200</td>\r\n                        <td style="text-align: center; vertical-align: central">משני</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">2 מטר</td>\r\n                        <td style="text-align: center; vertical-align: central">144-146 מה"צ</td>\r\n                        <td style="text-align: center; vertical-align: central">ראשוני</td>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">100</td>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">100</td>\r\n                        <td rowspan="2" style="text-align: center; vertical-align: central">250</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">70 ס"מ</td>\r\n                        <td style="text-align: center; vertical-align: central">430-440 מה"צ</td>\r\n                        <td style="text-align: center; vertical-align: central">ראשוני</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td style="text-align: center; vertical-align: central">23 ס"מ</td>\r\n                        <td style="text-align: center; vertical-align: central">1240-1300 מה"צ</td>\r\n                        <td style="text-align: center; vertical-align: central">משני</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                        <td style="text-align: center; vertical-align: central">25</td>\r\n                        <td style="text-align: center; vertical-align: central">100</td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n        <div class="alert alert-info margin-bottom-40">\r\n            * במאי 2013 החליט משרד התקשורת לתת  אפשרות זמנית למשך שנה לבעלי דרגה א\' ו ב\' שיגישו בקשות פרטניות לשידור נסיוני במספר מצומצם של ערוצים.\r\n            להחלטת המשרד המלאה ראה <a href="http://www.moc.gov.il/sip_storage/FILES/0/3190.pdf" target="_blank">כאן</a>\r\n        </div>\r\n        <div class="alert alert-danger margin-bottom-40">\r\n            לחובבים בדרגה ג\' מותר לשדר עד 100W בתחומים 7000-7050, 14000-14120, 21000-21150, 28000-28500<br />\r\n            ועד 50W בתחומים 144-146, 430-440\r\n        </div>\r\n        <div class="alert alert-warning margin-bottom-40">\r\n            התחומים 2 מטר ו 70 סנטימטר מותרים לשימוש עד 1000W לבעלי דרגה א, ועד 150W לבעלי דרגות ג,ד בקרינה שאינה F3E\r\n        </div>\r\n        <!--<div class="panel panel-grey margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">VHF</h4>\r\n            </div>\r\n            <table class="table table-bordered">\r\n                <thead>\r\n                    <tr class="table-header">\r\n                        <th colspan="2" style="text-align: center; vertical-align: top">ערוץ</th>\r\n                        <th style="text-align: center; vertical-align: top">תדר (מה"צ)</th>\r\n                        <th style="text-align: center; vertical-align: top">שימוש</th\r\n                    </tr>\r\n                </thead>\r\n                <tbody>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R0</td>\r\n                        <td style="text-align: center; vertical-align: central">V00</td>\r\n                        <td style="text-align: center; vertical-align: central">145.000</td>\r\n                        <td rowspan="8" style="text-align: center; vertical-align: central">Repeater Input exclusive</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R1</td>\r\n                        <td style="text-align: center; vertical-align: central">V02</td>\r\n                        <td style="text-align: center; vertical-align: central">145.025</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R2</td>\r\n                        <td style="text-align: center; vertical-align: central">V04</td>\r\n                        <td style="text-align: center; vertical-align: central">145.050</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R3</td>\r\n                        <td style="text-align: center; vertical-align: central">V06</td>\r\n                        <td style="text-align: center; vertical-align: central">145.075</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R4</td>\r\n                        <td style="text-align: center; vertical-align: central">V08</td>\r\n                        <td style="text-align: center; vertical-align: central">145.100</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R5</td>\r\n                        <td style="text-align: center; vertical-align: central">V10</td>\r\n                        <td style="text-align: center; vertical-align: central">145.125</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R6</td>\r\n                        <td style="text-align: center; vertical-align: central">V12</td>\r\n                        <td style="text-align: center; vertical-align: central">145.150</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R7</td>\r\n                        <td style="text-align: center; vertical-align: central">V14</td>\r\n                        <td style="text-align: center; vertical-align: central">145.175</td>\r\n                    </tr>\r\n                    <tr class="alert-danger">\r\n                        <td style="text-align: center; vertical-align: central">R8</td>\r\n                        <td style="text-align: center; vertical-align: central">V16</td>\r\n                        <td style="text-align: center; vertical-align: central">145.200</td>\r\n                        <td style="text-align: center; vertical-align: central">Space communication</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R9</td>\r\n                        <td style="text-align: center; vertical-align: central">V18</td>\r\n                        <td style="text-align: center; vertical-align: central">145.225</td>\r\n                        <td rowspan="15" style="text-align: center; vertical-align: central">Simplex channels</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R10</td>\r\n                        <td style="text-align: center; vertical-align: central">V20</td>\r\n                        <td style="text-align: center; vertical-align: central">145.250</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R11</td>\r\n                        <td style="text-align: center; vertical-align: central">V22</td>\r\n                        <td style="text-align: center; vertical-align: central">145.275</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R12</td>\r\n                        <td style="text-align: center; vertical-align: central">V24</td>\r\n                        <td style="text-align: center; vertical-align: central">145.300</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R13</td>\r\n                        <td style="text-align: center; vertical-align: central">V26</td>\r\n                        <td style="text-align: center; vertical-align: central">145.325</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R14</td>\r\n                        <td style="text-align: center; vertical-align: central">V28</td>\r\n                        <td style="text-align: center; vertical-align: central">145.350</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R15</td>\r\n                        <td style="text-align: center; vertical-align: central">V30</td>\r\n                        <td style="text-align: center; vertical-align: central">145.375</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R16</td>\r\n                        <td style="text-align: center; vertical-align: central">V32</td>\r\n                        <td style="text-align: center; vertical-align: central">145.400</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R17</td>\r\n                        <td style="text-align: center; vertical-align: central">V34</td>\r\n                        <td style="text-align: center; vertical-align: central">145.425</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R18</td>\r\n                        <td style="text-align: center; vertical-align: central">V36</td>\r\n                        <td style="text-align: center; vertical-align: central">145.450</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R19</td>\r\n                        <td style="text-align: center; vertical-align: central">V38</td>\r\n                        <td style="text-align: center; vertical-align: central">145.475</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R20</td>\r\n                        <td style="text-align: center; vertical-align: central">V40</td>\r\n                        <td style="text-align: center; vertical-align: central">145.500</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R21</td>\r\n                        <td style="text-align: center; vertical-align: central">V42</td>\r\n                        <td style="text-align: center; vertical-align: central">145.525</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R22</td>\r\n                        <td style="text-align: center; vertical-align: central">V44</td>\r\n                        <td style="text-align: center; vertical-align: central">145.550</td>\r\n                    </tr>\r\n                    <tr class="alert-success">\r\n                        <td style="text-align: center; vertical-align: central">R23</td>\r\n                        <td style="text-align: center; vertical-align: central">V46</td>\r\n                        <td style="text-align: center; vertical-align: central">145.575</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R0</td>\r\n                        <td style="text-align: center; vertical-align: central">V48</td>\r\n                        <td style="text-align: center; vertical-align: central">R145.600</td>\r\n                        <td rowspan="8" style="text-align: center; vertical-align: central">Repeater Output exclusive</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R1</td>\r\n                        <td style="text-align: center; vertical-align: central">RV50</td>\r\n                        <td style="text-align: center; vertical-align: central">145.625</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R2</td>\r\n                        <td style="text-align: center; vertical-align: central">RV52</td>\r\n                        <td style="text-align: center; vertical-align: central">145.650</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R3</td>\r\n                        <td style="text-align: center; vertical-align: central">RV54</td>\r\n                        <td style="text-align: center; vertical-align: central">145.675</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R4</td>\r\n                        <td style="text-align: center; vertical-align: central">RV56</td>\r\n                        <td style="text-align: center; vertical-align: central">145.700</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R5</td>\r\n                        <td style="text-align: center; vertical-align: central">RV58</td>\r\n                        <td style="text-align: center; vertical-align: central">145.725</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R6</td>\r\n                        <td style="text-align: center; vertical-align: central">RV60</td>\r\n                        <td style="text-align: center; vertical-align: central">145.750</td>\r\n                    </tr>\r\n                    <tr class="alert-info">\r\n                        <td style="text-align: center; vertical-align: central">R7</td>\r\n                        <td style="text-align: center; vertical-align: central">RV62</td>\r\n                        <td style="text-align: center; vertical-align: central">145.775</td>\r\n                    </tr>\r\n                    <tr class="alert-danger">\r\n                        <td style="text-align: center; vertical-align: central"></td>\r\n                        <td style="text-align: center; vertical-align: central">V64</td>\r\n                        <td style="text-align: center; vertical-align: central">145.800</td>\r\n                        <td rowspan="8" style="text-align: center; vertical-align: central">Space communication</td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>-->\r\n\r\n\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/gallery.html',[],function () { return '<div class="container">\r\n    \r\n    <div class="row">\r\n        <div class="col-md-12">\r\n            <div class="panel panel-blue margin-bottom-40 text-right">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title text-right">גלרית וידאו</h4>\r\n                </div>\r\n                <table class="table table-striped table-condensed" style="direction: rtl">\r\n                   \r\n                    <tbody data-bind="foreach: list">\r\n                        <tr>\r\n                            <td>\r\n                                <label data-bind="text: ($index() + 1)" class="badge badge-primary"></label>\r\n                            </td>\r\n                            <td><a data-bind="attr: { \'href\': url }" target="_blank"><span data-bind="html: title"></span></a></td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});


define('text!views/hagal.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy">\r\n        <div class="col-md-12">\r\n            <div>\r\n                <img class="img-responsive" src="assets/img/pages/hagal/hagal.jpg" alt="">\r\n            </div>\r\n\r\n            <h4>הגל</h4>\r\n            <div>\r\n                "הגל" הינו ביטאון אגודת חובבי הרדיו בישראל (ע"ר) ויוצא לאור כ-5-6 פעמים בשנה, החל משנת 1949.<br />\r\n                כבטאון, תפקידו לבטא את מה שחובבי רדיו עושים, צריכים, או רוצים ללמוד ולדעת, מתוך נקודת המוצא שחובבי הרדיו הינם אנשים עם נקודת עניין משותפת.<br />\r\n                "הגל" עבר גלגולים רבים לאורך התקופה, מהיותו חוזר קצר, דרך מוסף בביטאונים אחרים ועד היותו ביטאון העומד בזכות עצמו.<br />\r\n                <br />\r\n                <div>\r\n                    <img class="img-responsive" src="assets/img/pages/hagal/hagal2.jpg" alt="">\r\n                </div>\r\n                <br />\r\n                כיום, "הגל" נערך ע"י מיכאל 4X1KF, ומכיל בין היתר:\r\n                    כתבות בנושאים טכניים, סיפורים המעניינים חובבים, עדכונים מהאגודה, פרוטוקולים, הודעות על תחרויות, משלחות, קשרים עם מדינות רחוקות ונדירות (די-אקסים), ד"שים, מדור דעות באנגלית, ועוד.<br />\r\n                כל חובב חבר אגודה מקבל בדואר את הגליון העדכני, בנוסף, ניתן לעלעל בגליונות הקודמים במשרדי האגודה. ארכיב של גליונות "הגל" ניתן למצוא בעמוד \r\n                <a href="#HagalArchive">ארכיון הגל</a>.\r\n                    <br />\r\n                <br />\r\n                תודה מיוחדת מגיעה לעורך "הגל"　4X1KF, עבור תרגום מאמרים, ושכנוע מתמשך של חברים לתרגם ולכתוב חומר מקורי עבור כל גליון מחדש.\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});


define('text!views/hagalarchive.html',[],function () { return '<div class="container">\r\n    <div class="col-md-12">\r\n        <div class="panel panel-grey margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">ארכיון הגל</h4>\r\n            </div>\r\n           <table class="table table-striped table-hover">\r\n                <thead>\r\n                    <tr>\r\n                        <th class="text-right" style="width: 30px">#</th>\r\n                        <th class="text-right">תאריך</th>\r\n                        <th class="text-right"></th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody data-bind="foreach: hagal">\r\n                    <tr>\r\n                        <td data-bind="text: $index() + 1"></td>\r\n                        <td data-bind="text: date"></td>\r\n                        <td><a data-bind="attr: { \'href\': url }" target="_blank"><i class="icon-download"></i> הורד קובץ</a></td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});


define('text!views/hagalmain.html',[],function () { return '<div class="container">\r\n    <div class="sorting-block">\r\n        <ul class="row sorting-grid">\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Onairhagal">\r\n                    <img class="img-responsive" src="assets/img/main/onlinehagal.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>הגל המשודר</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#HagalArchive">\r\n                    <img class="img-responsive" src="assets/img/main/archive.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>ארכיון הגל</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Hagal">\r\n                    <img class="img-responsive" src="assets/img/main/hagal.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>הגל</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n        </ul>\r\n    </div>\r\n</div>\r\n';});


define('text!views/ham.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy">\r\n\r\n        <h4>למה חובבות רדיו?</h4>\r\n        <p>\r\n           כולנו משתמשים ברדיו כל הזמן: האזנה למוסיקה, טלפון סלולרי, אינטרנט אלחוטי, טלפון ביתי אלחוטי, שלט למכונית, טלוויזיה בלווין, טיסנים וכו\'.\r\n            יש אנשים שאוהבים את האתגרים: ליצור קשר אלחוטי עם מדינה רחוקה, או נדירה. לראות עד לאן אפשר להגיע עם עוצמות שידור נמוכות (כאלה שאפשר להשתמש בסוללה במשך יום שלם). לתקשר עם לווינים. לבנות לווינים. לשדר תמונות, או קול, או התכתבות דיגיטלית, או מורס.\r\n            יש אנשים שפשוט מעניין אותם התחום. הם רוצים לדעת איך הדברים עובדים, הם רוצים לבנות משדרים ומקלטים. הם רוצים לשפר אנטנות. לפתור תקלות אצל חברים.\r\n            יש אנשים שאוהבים תחרויות, ובחובבות רדיו יש הרבה תחרויות, ויש גם פרסים. יש גם את אלו שאוספים פרסים.\r\n            יש אנשים שאוהבים לדבר עם אנשים אחרים מהארץ וממדינות אחרות (כמו דרך האינטרנט). הם יכולים לדבר שעות על גבי שעות וללא צורך לשלם חשבון טלפון.\r\n            יש אנשים שרוצים להיות מוכנים לשעת חירום. כאשר הם יהיו באיזור ללא קליטה סללורית (באמצע טיול ג\'יפים). כשכל שאר מערכות התקשורת לא יהיו זמינות, ציוד הרדיו של החובבים ממשיך לעבוד.\r\n            יש אנשים שהגיעו לתחום מסיבה כזאת או אחרת, אבל נשארים בגלל שהחברים שהם הכירו דרך חובבות הרדיו היא חברות לחיים.\r\n            זהו תחביב. עושים מה שמעניין. כמובן בהתאם לחוק, לתנאי הרשיון ולכללי הנימוס.\r\n        </p>\r\n        <hr />\r\n\r\n        <!-- General Questions -->\r\n            <h4>שאלות ותשובות למתעניין בחובבות הרדיו</h4>\r\n            <div class="panel-group acc-v1 margin-bottom-40" id="accordion">\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseOne">\r\n                                מהי חובבות רדיו?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapseOne" class="panel-collapse collapse in">\r\n                        <div class="panel-body">\r\n                            חובבות הרדיו היא תחביב מדעי וחברתי היא מטפחת את הקשר החברתי בעולם, מקדמת את יכולותיו הטכנולוגיות של החובב ומשתתפת בסיוע לשירות הציבור והמדינה; אך תועלתה העיקרית היא בקידום הטכנולוגיה, על ידי ניסוי והפעלה של שיטות ואמצעים חדשים. חובבי הרדיו מתקשרים ביניהם במספר דרכים, ומניינם בעולם עומד על מיליונים.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseTwo">\r\n                                מדוע חובבות ולא מקצוענות?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapseTwo" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            המילה "חובבות" אינה מתייחסת לכישוריהם או למיומנויות של האנשים העוסקים בה, אלא מצביעה על כך שנאסר על התקשורת שנעשית במסגרתה לשמש למטרה מסחרית, פוליטית או לשם השגת ממון.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseThree">\r\n                                האם יש צורך ברישיון להחזיק ולתפעל תחנת רדיו חובבים בבית ו/או ברכב?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapseThree" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            כן, הרישיון ניתן על ידי משרד התקשורת. כדי לקבל רישיון להפעלת תחנת חובבים בישראל, יש למלא מספר תנאים שנקבעו על ידי מוסדות השלטון הנוגעים בדבר. המבקש צריך להיות בעל תעודת אזרחות בישראל , ולעמוד בבחינות של משרד התקשורת.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseFour">\r\n                                האם הרישיון שמנפיק משרד התקשורת תקף רק בארץ?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapseFour" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            לא, רישיון שמנפיק משרד התקשורת תואם את החוקים הבינלאומיים של רישיונות חובבי הרדיו בעולם. מסיבה זו ניתן להפעיל עם הרישיון הישראלי ממספר רב של מדינות בעולם ללא בקשה מיוחדת.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseFive">\r\n                                ברצוני להשיג רישיון לתחנת שידור חובבים ולהיות חובב רדיו, מה עלי לעשות?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapseFive" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            אם הידע שלך עונה על דרישות הסילבוס של משרד התקשורת, אז באפשרותך לפנות למשרד בבקשה להיבחן לרמת הרישיון הרצויה לך. אגודת חובבי הרדיו עוזרת ומדריכה כל מי שמעוניין בכך. כדאי לפנות אל האגודה לקבלת הדרכה בנושא.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseSix">\r\n                                מהם סוגי הרישיונות שמנפיק משרד התקשורת?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapseSix" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            קיימים מספר דרגות לרישיון חובב רדיו, רישיון לדרגת מתחילים (דרגה ג\') רישיון לדרגת מתקדמים (דרגה ב\') ורישיון לדרגה הגבוהה ביותר, דרגה א\'.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseSeven">\r\n                                מה ההבדל בין הרישיונות השונים?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapseSeven" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            דרגת הרישיון קובעת את הספק השידור המרבי של התחנה ואת תחום התדרים שבה מורשה החובב להפעיל את תחנתו.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse8">\r\n                                מהם סוגי הפעילויות של חובבי הרדיו?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapse8" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            סוגי הפעילות של חובב רדיו נובעים מתוך שלוש מטרותיו העיקריות של התחביב: טיפוח הקשר החברתי, הקידום הטכני והעמידה לשירות הציבור והמדינה. בפעילותו, מקיים חובב הרדיו קשרים עם חובבים מכל העולם בזמנו החופשי ומשתתף בתחרויות עולמיות. הפעילות מתקיימת מתחנת הרדיו הפרטית שבביתו של החובב או מתחנה נייחת שהחובב מקים בפעילות שדה או בתחנה ניידת מהרכב.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse9">\r\n                                מהם הנושאים עליהם עלי להיבחן במבחני משרד התקשורת? \r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapse9" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            על המועמד להוכיח ידיעות בנושאים הבאים: יסודות תורת החשמל, יסודות האלקטרוניקה והכרת נוהלי הקמת קשר.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse10">\r\n                                האם מתקיימים קורסים בהם ניתן ללמוד את החומר הדרוש לבחינה?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapse10" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            אגודת חובבי הרדיו בישראל IARC עורכת קורסים לדרגות השונות. חלקם קורסים פרונטאליים אך קיימים גם קורסים מתוקשבים באתר אינטרנט מיוחד שהוקם לצורך כך.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse11">\r\n                                מהו קורס מתוקשב?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapse11" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            בקורס המתוקשב מקבל החניך מטלות שעליו למלא בזמנו החופשי. לחניך מנחה שהוא יכול להתייעץ אתו על נושאים שמתעוררים במהלך הלימודים. ברוב המקרים נערכים גם מספר מפגשים פרונטאליים לפני המבחנים של משרד התקשורת.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse12">\r\n                                מהי "אגודת חובבי הרדיו בישראל"?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapse12" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            האגודה הינה אגודה רשומה אצל רשם העמותות, היא מאגדת את חובבי הרדיו ומטרתה לקדם את חובבי הרדיו בישראל.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse13">\r\n                                מהם השירותים שניתן לקבל מהאגודה?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapse13" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            קשה למנות את כל השירותים נזכיר מספר מהם: ביטאון "הגל" שיוצא לאור כדו-ירחון, שימוש בממסרי רדיו, משלוח כרטיסי הקשר הפרטיים (QSL) לכל מדינות העולם, הרצאות, ימי שדה, קורסים ועוד.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse14">\r\n                                ברצוני לקרא עוד על חובבות הרדיו\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapse14" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            <ul>\r\n                                <!--<li>ספר 60 שנה לאגודת חובבי הרדיו בישראל,  <a href="http://www.4z1pf.net/60year-book/index.html" target="_blank">לקריאה OnLine</a> <a href="http://www.4z1pf.net/articles/book-60-years.pdf" target="_blank">ולהורדה</a></li>\r\n                                <li><a href="http://www.4z1pf.net/articles/hams-in-israel.pdf" target="_blank">חוברת הסבר על חובבות הרדיו</a></li>\r\n                                <li><a href="http://www.4z1pf.net/articles/license.pdf" target="_blank">תנאי רישיון חובב רדיו</a></li>\r\n                                <li><a href="http://www.4z1pf.net/articles/transistor-operation.pdf" target="_blank">חובבי רדיו בחירום</a></li>\r\n                                <li><a href="#HagalArchive">ביטאוני "הגל"</a></li>\r\n                                <li><a href="http://he.wikipedia.org/wiki/%D7%97%D7%95%D7%91%D7%91%D7%95%D7%AA_%D7%A8%D7%93%D7%99%D7%95" target="_blank">בוויקיפדיה</a></li>-->\r\n                                <li><a href="././Content/docs/faq/book-60-years.pdf" target="_blank">ספר 60 שנה לאגודת חובבי הרדיו בישראל</a></li>\r\n                                <li><a href="././Content/docs/faq/hams-in-israel.pdf" target="_blank">חוברת הסבר על חובבות הרדיו</a></li>\r\n                                <li><a href="././Content/docs/faq/license.pdf" target="_blank">תנאי רישיון חובב רדיו</a></li>\r\n                                <li><a href="././Content/docs/faq/transistor-operation.pdf" target="_blank">חובבי רדיו בחירום</a></li>\r\n                                <li><a href="#HagalArchive">ביטאוני "הגל"</a></li>\r\n                                <li><a href="http://he.wikipedia.org/wiki/%D7%97%D7%95%D7%91%D7%91%D7%95%D7%AA_%D7%A8%D7%93%D7%99%D7%95" target="_blank">בוויקיפדיה</a></li>\r\n                                \r\n                            </ul>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="panel panel-default">\r\n                    <div class="panel-heading">\r\n                        <h4 class="panel-title">\r\n                            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse15">\r\n                                יש לי שאלות נוספות, למי עלי לפנות?\r\n                            </a>\r\n                        </h4>\r\n                    </div>\r\n                    <div id="collapse15" class="panel-collapse collapse">\r\n                        <div class="panel-body">\r\n                            הפנה את שאלותיך לכתובת המייל <a href="mailto:info@iarc.org">info@iarc.org</a> או דרך אתר האגודה.\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n\r\n            </div><!--/acc-v1-->\r\n            <!-- End General Questions -->\r\n        <hr />\r\n        <h4>למה לא להשתמש באינטרנט?</h4>\r\n        <p>\r\n            אפשר להשתמש גם באינטרנט. כמו שהרדיו והטלוויזה מתקיימים זה לצד זה, הטלפונים הסלולרים והקווים פועלים יחד, וכמו שקיימות גם אוניברסיטות וגם מכללות. כך גם חובבות הרדיו והאינטרנט משלימות זו את זו. השלם גדול מסכום חלקיו.\r\n            חובבי רדיו רבים מעבירים היום הודעות באמצעות דוא"ל ובודקים מידע על תחרויות באתרים יעודיים. אתר זה הינו דוגמה נוספת לסינרגיה בין שתי שיטות תקשורת אלו.\r\n            בתחילת העמוד מתוארות הרבה סיבות עבור חובבות הרדיו. חלקן, אך לא את כולן ניתן להשיג גם באמצעות האינטרנט.\r\n        </p>\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/haminisrael.html',[],function () { return '<div class="container">\r\n    <div class="sorting-block">\r\n        <ul class="sorting-nav sorting-nav-v1 text-center">\r\n        </ul>\r\n        <ul class="row sorting-grid">\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Freq">\r\n                    <img class="img-responsive" src="assets/img/main/bandplan.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>תדרים</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Regulations">\r\n                    <img class="img-responsive" src="assets/img/main/regulations.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>חוקים ותקנות</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Ham">\r\n                    <img class="img-responsive" src="assets/img/main/ham.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>חובבות רדיו</span>\r\n                        <!--<p>Anim pariatur cliche reprehenderit</p>-->\r\n                    </span>\r\n                </a>\r\n            </li>\r\n        </ul>\r\n        <ul class="row sorting-grid">\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#DXpeditions">\r\n                    <img class="img-responsive" src="assets/img/main/expeditions.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>משלחות</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Holyland">\r\n                    <img class="img-responsive" src="assets/img/main/holyland.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>תחרות ארץ הקודש</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12">\r\n                <a href="#Emergency">\r\n                    <img class="img-responsive" src="assets/img/main/emergency.jpg" alt="">\r\n                    <span class="sorting-cover">\r\n                        <span>חובבי רדיו בחירום</span>\r\n\r\n                    </span>\r\n                </a>\r\n            </li>\r\n\r\n        </ul>\r\n        <ul class="row sorting-grid">\r\n            <li class="col-md-4 col-sm-6 col-xs-12"></li>\r\n            <li class="col-md-4 col-sm-6 col-xs-12"></li>\r\n            \r\n        </ul>\r\n    </div>\r\n</div>\r\n';});


define('text!views/holyland.html',[],function () { return '<div class="container">\r\n    <div class="row">\r\n        <div class="col-md-5">\r\n            <img class="img-responsive" src="assets/img/pages/holyland/holyland.jpg" alt="">\r\n        </div>\r\n        <div class="col-md-7">\r\n            <h3>תחרות ארץ הקודש</h3>\r\n            <p>\r\n                כמו בעולם כך גם בישראל, תחביב הרדיו הוא גם ספורט לכל דבר, וחובבי הרדיו מקיימים תחרויות תקשורת שונות בינם לבין עצמם. מטרותיהן בד"כ מתכנסות למכנה משותף של השגת מירב קשרים למקומות הנידחים והמרוחקים ביותר בזמן קצוב, ולזוכים מוענקים פרסי תעודות, גביעים ומדליות. העיקר הוא שלא משנה ספורט או תחביב - אם אתה לא שם אינך קיים, ומכאן גם לישראל יש תוצר רדיו-ספורטיבי כחול-לבן ששמו – איך לא: תחרות "ארץ הקודש".\r\n            </p>\r\n        </div>\r\n    </div>\r\n    <hr />\r\n    <div class="row">\r\n        <div class="col-md-12">\r\n            <h4>לערבב קודש בחול</h4>\r\n            <p>\r\n                לא סוד הוא שהעולם הנוצרי (ולא רק) נדרך ומתמלא קשב לשמע הצירוף "ארץ-הקודש". מסתבר שחובבי רדיו בעולם שאוספים גלויות או בולים מארצות עימן שוחחו, שמחים היו ל"אסוף" גם משהו שקשור לתחביב הרדיו ולארץ הקודש. אגודת חובבי הרדיו בישראל (ע"ר) נענתה לאתגר ויזמה פעילות שכזו, בדרך מקורית המשלבת שיגרה ותחרותיות. פעילות זו מעודדת את הקשר בין חובבי הרדיו בעולם לחובבי ישראל ומספקת אתגרים והנאה למשתתפים בה.\r\n            </p>\r\n        </div>\r\n    </div>\r\n    <div class="row">\r\n        <div class="col-md-5">\r\n            <img class="img-responsive" src="assets/img/pages/holyland/holyland-mobile.jpg" alt="">\r\n        </div>\r\n        <div class="col-md-7">\r\n            <p>\r\n                ביצוע שידורי תחנות רדיו-חובבים ניידות ממקומות שונים בארץ, במסגרת מה שמכונה "הפעלות ארץ הקודש" היא אחת מפעילויות ספורט הרדיו של חובבי הרדיו בישראל, ומתבצעת רצוף על פני כל השנה.<br />\r\n                שיאה הוא בחוה"מ פסח בעת קיום תחרות ה"הולילנד" השנתית. בתחרות משתתפים אלפי חובבים מהארץ ומהעולם, וההשתתפות בה עולה משנה לשנה.<br />\r\n                לחובבי הרדיו בישראל יש רישיון רשמי ממדינת ישראל לשדר מביתם, מרכבם ובעצם מכל מקום שיעלו על דעתם. החובבים מתקשרים בדרכים מגוונות החל בקוד המורס הוותיק, דרך אלחוט הדיבור המוכר או הטלפרינטר לסוגיו, וכלה בשיטות דיגיטאליות מתקדמות שלא היו מביישות חלק ניכר מענקי והתקשורת העולמיים.\r\n            </p>\r\n        </div>\r\n    </div>\r\n    <hr />\r\n    <div class="row">\r\n        <div class="col-md-4">\r\n            <img class="img-responsive" src="assets/img/pages/holyland/holyland-squares.jpg" alt="">\r\n        </div>\r\n        <div class="col-md-8">\r\n            <h4>מדי שנה בחוה"מ פסח אוספים פיסות מא"י...</h4>\r\n            <p>\r\n                ישראל חולקה ל 23 גזרות גיאוגרפיות בעלות סימן היכר מיוחד, ובתוכן תת-אזורים ("ריבועים"). כל חובב ישראלי יודע לשייך את מיקום תחנתו לריבוע כזה, ובכל קשר מוסרת התחנה הישראלית גם את קוד הריבוע לתחנה שמנגד. נבנתה הגדרה של כמה ואילו ריבועים וכמה נקודות "מזכים" באיזה הישג ובאיזו הכרה, ועוצבה תעודה מרשימה הנמסרת למי שמוכיח למנהל הפעילות מטעם אגודת חובבי הרדיו שעמד בקריטריון הנדרש (The Holy land Award).\r\n            </p>\r\n            <p>\r\n                כך ומזה למעלה מ 15 שנים, אוספים חובבי הרדיו בארץ ועולם "פיסות" של א"י, מקבלים תעודות מרשימות לתחנתם ושומרים על קשר חברי עם ישראל “לך תדע” - הם יאמרו לך – “מתי יצוץ הריבוע הנכסף הבא”?.\r\n            </p>\r\n            <p>\r\n                כדי לעודד הן את ההפעלה הישראלית והן את הביקוש ל"ריבועים נדירים" (כאילו שאין בהם יישוב קבע של חובבים או שהגישה קשה וכד\'), וכדי לאפשר למתעניינים חדשים להשיג הרבה ריבועים בזמן קצר, נולדה "תחרות ארץ הקודש" בת 24 השעות. במסגרתה יוצאים חלק מהחובבים לשטח, חמושים ברכב מזווד לקשר או מקימים מאהל עם תחנת רדיו, מרימים את האנטנות ומשדרים מריבועים שונים במשך התחרות. בד"כ מתלוות המשפחות לפיקניק משובח בצד ולטיול מעניין באזור, כך שיצאו כולם נשכרים.\r\n            </p>\r\n            <p>\r\n                במדינה 23 אזורים מנהלתיים בעלי כינוי המרמז על מיקומם (TA לאזור תל-אביב, HG לגולן וכד\'), ובתוכם ריבועי ארץ הקודש בגודל 10x10 ק"מ. הספרור מצפון לדרום במספרים וממזרח למערב באותיות. כך הריבוע F-13-TA מציין 100 קמ"ר מסוימים באזור תל-אביב, והריבוע F-13-PT מציין 100 קמ"ר באזור פ"ת.\r\n            </p>\r\n            <hr />\r\n            <h4>"אספנות רדיו"</h4>\r\n            <p>\r\n                מקובל בקרב חובבי רדיו בעולם, לאסוף למשל גלויות מהמדינות עימם התקשרו ("אישורי-קשר"), להציגן לראווה בקיר התחנה ואפילו לקבל בגינן הכרה בינ"ל – כ"א לפי כמות המדינות עימן יצר קשר. בהרבה ממדינות העולם יש מסגרות איסוף נוספות, למשל שידור ממוזיאונים, מגדלורים, איים, מטירות ומבצרים וכד\'. אוסף פריטים שכאילו (ממשיים או נקודות) כאילו מזכה את החובב בפרסים ותעודות וכד\'.\r\n            </p>\r\n            <p>\r\n                איסוף ריבועי "ארץ-קדושה" הן בשוטף והן בתחרות צובר תאוצה משנה לשנה וכמות המשתתפים הזרים בתחרות הינה מאות רבות. כל קשר בתחרות מזכה בנקודות לשני הצדדים, והזוכים בקטגוריות השונות מתפרסמים בארץ ובעולם הן בביטאון האגודה והן באינטרנט.\r\n            </p>\r\n        </div>\r\n    </div>\r\n    <p>*העמוד נכתב במקור ע"י צחי 4Z1TL</p>\r\n</div>\r\n';});


define('text!views/holyland/certificategenerator.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n        <br />\r\n        <h2>Holyland Certificate Request Form</h2>\r\n        <form method="post" action="Server/teuda.php" target="_blank">\r\n            <div class="row">\r\n                <div class="col-md-8 margin-bottom-20">\r\n                    <input type="text" class="form-control" id="callsign" name="callsign" placeholder="Callsign">\r\n                </div>\r\n            </div>\r\n            <div class="row">\r\n                <div class="col-md-8 margin-bottom-20">\r\n                    <input type="text" class="form-control" id="year" name="year" placeholder="Year">\r\n                </div>\r\n            </div>\r\n            <div class="row">\r\n                <div class="col-md-8 margin-bottom-20">\r\n                    <input type="text" class="form-control" id="name" name="name" placeholder="Name">\r\n                </div>\r\n            </div>\r\n\r\n            <div class="row">\r\n                <div class="col-md-4 col-md-offset-8">\r\n                    <input type="submit" name="submit" value="Generate">\r\n                </div>\r\n            </div>\r\n\r\n        </form>\r\n    </div>\r\n</div>';});


define('text!views/holyland/holylandaward.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n        <h2 class="text-center">THE HOLYLAND AWARD PROGRAM</h2>\r\n        <!--<h4 class="text-center">P.O.Box 8181, Petach Tikva 49651 Israel</h4>-->\r\n        <hr />\r\n        <p>\r\n            <img class="img-responsive" src="assets/img/pages/holyland/holyland.jpg" alt="" style="margin:auto">\r\n        </p>\r\n        <p>\r\n            The ‘Holyland Award’ is a special plaque issued by the Israel Amateur Radio Club (IARC) to both, licensed radio amateurs and SWL’s. The plaque is made of gold anodized aluminum sheet dim. 44 x 32 cm (17 x 12.4 inch.), Silk epoxy printed in two colors. The print, in antique atmosphere, is showing an old panorama of Jerusalem as seen from the Mount of Olives. The plaque is awarded for achieving the basic requirements from contacts done after the first of January 1992. Stickers, representing different sites, will be attached to the basic award after improving the achievements. 10 Stickers are available. QSL cards are not required, only log entries.<br />\r\n            Each award is personally printed for its winner. A specimen was sent with the IARC team to the Friedrichshafen hamfest (1992) for the first presentation to the amateur public.\r\n        </p>\r\n\r\n        <hr />\r\n\r\n        <h4 class="text-center">BASIS OF THE AWARD</h4>\r\n        <p>The idea of national classic basis for an award scheme, was introduced by the late John Morris G3ABG in 1969 and was adopted by the WAB group for the UK national awards program. The IARC finds this idea suits it’s requirements and decided to use it for the ‘Holyland Award’ program. The award scheme is based on the geographical and administrative division of the Holy Land.</p>\r\n        <p>The ‘Square’; The country is divided geographically, by the Survey of Israel department, into a grid system resulting in squares of 10 X 10 kilometers. A letter and two numbers which are the relevant horizontal and vertical coordinates define these squares. i.e. E-14, H-08, etc.</p>\r\n        <p>The ‘Region’; The country is divided for administrative purposes into 23 Regions. The boundaries of these regions are drawn arbitrarily.</p>\r\n        <p>The ‘Area’; An ‘Area’ is made up from the combination of the Square and the Region. For example; E-14-TA (Tel Aviv), G-18-JS (Jerusalem), etc. The ‘Area’ is the basis for the Holyland Award scheme.</p>\r\n\r\n        <hr />\r\n\r\n        <h4 class="text-center">CLAIM AND RECORD BOOK</h4>\r\n        <label>To help with the logging and for claiming purposes, a special Record book is produced. The book includes:</label>\r\n        <ol>\r\n            <li>Aims, Definitions and Requirements for the ‘Holyland Award’ scheme</li>\r\n            <li>Tables of all Regions, The Squares within the region and the settlements within the squares.</li>\r\n            <li>Summery of the participant’s achievements.</li>\r\n            <li>Claim sheet and Operator’s declaration.</li>\r\n            <li>Rules of the ‘Holyland international DX contest’.</li>\r\n        </ol>\r\n\r\n        <p>\r\n            In addition to the book, Country Roads Maps, scales 1:250,000 are available. Price of the book is 10 $, maps 8 $, mailing 2 $. An equivalent of major European currency is acceptable. The book is required for claiming purposes.<br />\r\n            The book and the maps are obtainable from:<br />\r\n            <div class="tag-box tag-box-v2">\r\n                <p>\r\n                    M. Webman 4X4JU<br />\r\n                    P.O.Box 8181,<br />\r\n                    Petach Tikva 49651, Israel.\r\n                </p>\r\n            </div>\r\n        </p>\r\n\r\n        <hr />\r\n\r\n        <h4 class="text-center">THE SCHEME REQUIREMENTS</h4>\r\n        <label>Awards and Stickers: The award is given for working or hearing stations in the Holy-Land ‘areas’. There are three categories:</label>\r\n        <ol>\r\n            <li>Amateurs operating within the Holy Land. (Category A)</li>\r\n            <li>Amateurs operating from IARU Region I. (Category B)</li>\r\n            <li>Amateurs operating from IARU Regions II & III. (Category C)</li>\r\n        </ol>\r\n        <label>Requirements: Radio operators / Swl needs to work / hear:</label>\r\n        <ol>\r\n            <li>In the (B) category; 100/150 ‘areas’ from 13 regions are required for the basic award. Additional 12 ‘areas’ plus 1 extra region are required per sticker.</li>\r\n            <li>In the (C) category; 50/100 ‘areas’ from 13 regions are required for the basic award. Additional 6 ‘areas’ plus 1 extra region, are required per sticker.</li>\r\n        </ol>\r\n\r\n        <p>\r\n            <label>Expedition & Mobile Awards:</label>\r\n            The Holyland Award for activating areas and it’s stickers, is issued for operating HF from areas in the Holy Land.</p>\r\n        <p>special engraved trophy will be awarded for activating 300 and 400 different ‘Areas’ – available to all radio amateurs working HF while operating mobile or portable in the Holy Land.</p>\r\n        <p>\r\n            <label>Operating frequencies:</label>\r\n            To concentrate the efforts, specific net frequencies are recommended for the ‘Holyland Award’ scheme. Mobile and portable stations will use the following frequencies ± QRM : 28.655, 21.320, 14.265, 7.060 Mhz. (Mostly on weekend afternoon – Holy Land time).</p>\r\n        <p>\r\n            <label>Holyland Contest:</label>\r\n            A contest is held annually in the third weekend of April. Details about the contest and the award, are available on request from the IARC contest manager, IARC, P.O.Box 17600, Tel Aviv 61176, Israel. (SASE required - Self-addressed stamped envelope).</p>\r\n\r\n        <hr />\r\n        <h4 class="text-center">INVITATION</h4>\r\n        <p>\r\n            The Israel Amateur Radio Club invites you, among all other radio amateurs in the world, to participate in the ‘Holyland Award’ program. We hope you will fined interest in expanding your geographical knowledge of the Holy Land and create friendship with radio amateurs operating here. The beautiful award will be the right completion for your participation and we hope, will give you much satisfaction.\r\n        </p>\r\n        <p>\r\n            We here, are making all efforts to increase the activity of radio amateurs in the Holy Land, and encourage mobile and portable operation. If you have a plan to visit the Holy Land in the near future and wish to operate your radio station here, mobile or fixed. You can take part in the ‘Holyland Expedition & Mobile’ plan and win the Award and Trophies. The IARC, with great pleasure, will assist all radio amateurs who wish to operate in the Holy Land.\r\n        </p>\r\n        <p>\r\n            We hope to see you among the other radio amateurs taking part in the “Holyland Award” Program.\r\n        </p>\r\n        <hr />\r\n        <p>The aim of the HOLYLAND AWARD is to contact Israeli Ham stations from different "areas".</p>\r\n        <ol>\r\n            <li>\r\n                <label>The square system:</label><br />\r\n                The country is divided geographically, by the Survey Department of Israel, into a grid system resulting in squares of 10 by 10 Kilometers.<br />\r\n                North to South coordinates are identified by numbers, while West to East coordinates are identified by letters. The square is defined through the combination of the relevant coordinates i.e. E14.</li>\r\n            <li>\r\n                <label>The Administrative System:</label><br />\r\n                The country is divided into 23 administrative regions. Here is a list of the Regions and their respective abbreviations:<br />\r\n                <div class="row">\r\n                <div class="panel-grey col-md-3">\r\n                    <table class="table table-striped">\r\n                        <thead>\r\n                            <tr>\r\n                                <th style="background-color: #cccccc">Region</th>\r\n                                <th style="background-color: #cccccc">Abb.</th>\r\n                            </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                            <tr>\r\n                                <td>Akko</td>\r\n                                <td>AK</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Ashqelon</td>\r\n                                <td>AS</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Azza</td>\r\n                                <td>AZ</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Beer Sheva</td>\r\n                                <td>BS</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Bethlehem</td>\r\n                                <td>BL</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Hadera</td>\r\n                                <td>HD</td>\r\n                            </tr>\r\n                        </tbody>\r\n                    </table>\r\n                </div>\r\n                <div class="panel-grey col-md-3">\r\n                    <table class="table table-striped">\r\n                        <thead>\r\n                            <tr>\r\n                                <th style="background-color: #cccccc">Region</th>\r\n                                <th style="background-color: #cccccc">Abb.</th>\r\n                            </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                            <tr>\r\n                                <td>Hagolan</td>\r\n                                <td>HG</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Haifa</td>\r\n                                <td>HF</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Hasharon</td>\r\n                                <td>HS</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Hebron</td>\r\n                                <td>HB</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Jenin</td>\r\n                                <td>JN</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Jerusalem</td>\r\n                                <td>JS</td>\r\n                            </tr>\r\n                        </tbody>\r\n                    </table>\r\n                </div>\r\n                <div class="panel-grey col-md-3">\r\n                    <table class="table table-striped">\r\n                        <thead>\r\n                            <tr>\r\n                                <th style="background-color: #cccccc">Region</th>\r\n                                <th style="background-color: #cccccc">Abb.</th>\r\n                            </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                            <tr>\r\n                                <td>Kinneret</td>\r\n                                <td>KT</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Petah Tiqwa</td>\r\n                                <td>PT</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Ramallah</td>\r\n                                <td>RA</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Ramla</td>\r\n                                <td>RM</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Rehovot</td>\r\n                                <td>RH</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Shekhem</td>\r\n                                <td>SM</td>\r\n                            </tr>\r\n                        </tbody>\r\n                    </table>\r\n                </div>\r\n                <div class="panel-grey col-md-3">\r\n                    <table class="table table-striped">\r\n                        <thead>\r\n                            <tr>\r\n                                <th style="background-color: #cccccc">Region</th>\r\n                                <th style="background-color: #cccccc">Abb.</th>\r\n                            </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                            <tr>\r\n                                <td>Telaviv</td>\r\n                                <td>TA</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Tulkarm</td>\r\n                                <td>TK</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Yarden</td>\r\n                                <td>YN</td>\r\n\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Yizreel</td>\r\n                                <td>YZ</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>Zefat</td>\r\n                                <td>ZF</td>\r\n                            </tr>\r\n                            <tr>\r\n                                <td>-</td>\r\n                                <td>-</td>\r\n                            </tr>\r\n                        </tbody>\r\n                    </table>\r\n                </div>\r\n                    </div>\r\n            </li>\r\n            <li>\r\n                <label>The \'Areas\':</label>\r\n                An \'Area\' is made up from the 10 by 10 km. grid reference square and the region. For example: E14TA, H08HF. The \'Area\' is the basis for the "Holyland Award" and the "Holyland DX Contest". For that purpose the \'Area\' must contain land and only that land or any waterway in that \'Area\' is considered to be the \'Area\'.</li>\r\n            <li>\r\n                <label>Region Boundaries:</label>\r\n                The region boundaries are drawn in an arbitrary manner so that often the 10 km grid reference square does cover more than one single region. For example, the square H08 lies partly in the region of Haifa, partly in the region of Hadera and partly in the region of Yizreel. As a result one may work, in the same square, three different Areas - H08HF, H08HD and H08YZ.</li>\r\n            <li>\r\n                <label>Maps: The Israel Survey Department has printed the following maps:</label>\r\n                <ol>\r\n                    <li>Country Road Map with a 1:250.000 scale, comprising 2 sheets (<a href="http://iarc.org/site/Content/docs/isr1.jpg" target="_blank">North</a>, <a href="http://iarc.org/site/Content/docs/isr2.jpg" target="_blank">South</a>)</li>\r\n                    <li>Country Road Map with a 1:100.000 scale, comprising 6 sheets.</li>\r\n                    <li>Region Map with a 1:250.000 scale, comprising 2 sheets.</li>\r\n                </ol>\r\n            </li>\r\n        </ol>\r\n        <hr />\r\n        <h4>Comments of members on the Holyland program and the Plaque</h4>\r\n        <blockquote>\r\n            <p>The award is beautiful and everyone who see it, thinks it is great and one if not the best in the world. I am very proud to have one</p>\r\n            <footer><cite title="Source Title">Ruthanna Pearson WB3CQN</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>The holyland plaque is just beautiful. I am so proud to show it off to all who visit. I had a devil of a time unwrapping the plaque, you certainly packaged it very well</p>\r\n            <footer><cite title="Source Title">Marry Ann WA3HUP</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>The holyland award is quite spectacular, no picture or pre-formed ideas give any impression of just how nice the award plaque actually looks. It is very very good and I just wanted to record that the design and method of production makes this award plaque special and it certainly has a major place in my shack</p>\r\n            <footer><cite title="Source Title">J.B. Smith VK9NS</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>The award is one of the most beautiful awards I have ever seen and received and it will get a special place to underline it’s beauty</p>\r\n            <footer><cite title="Source Title">Gerd Uhlig DL7VOG</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>I was very surprised! It’s a very nice award and my XYL said, it is not for my shack. This award I must put in my floor so all visitors can see it</p>\r\n            <footer><cite title="Source Title">Claus Ulbricht DL3AAF</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>I have seen a few awards but none could stand up to this one. I think you must have taken a long time to design it and I think it will be one of the most sought after awards. The only problem I have with the award is keeping it from my wife hi hi. It will certainly take pride of place in this hous</p>\r\n            <footer><cite title="Source Title">J.C. Lloyd G0PWE</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>It is really a wonderful award to receive and well worth the effort to obtain. . . I must congratulate you and the Israel Amateur Radio Club for having set up such an award and to everyone concerned who enables Radio Amateurs all over the world to take part. The Holyland award is really more beautiful than can be explained over the air.. ...it now takes pride of place in my shack</p>\r\n            <footer><cite title="Source Title">Margaret Armstrong G0BMQ</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>First class award in all respects, a lot of time, skill and effort has gone into the making of the award. The program as a whole, has been very thoughtfully carried out. That is why it is so successful. My congratulations to all concerned</p>\r\n            <footer><cite title="Source Title">R. Brown G1HXH</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>The award is very well made and makes a beautiful addition to my shack where it is proudly displayed. It is invariably commented upon by visitors to the shack and has made some of my expatriate friends here think about visiting Israel during their vacation. . . The excellent way the award was packaged so it arrived here without any damage</p>\r\n            <footer><cite title="Source Title">Keith P. Appleton YB5AQG (N6QLQ)</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>The program has been very enjoyable and with the aid of the maps, one can follow the route taken by the mobile. It is like traveling in the Holyland. I am an Award Hunter and hold many awards. . . Although the Holyland award is not a cheap one, it is about the best one I have come across and fully worth the cost, plus the added bonus of meeting with a great bunch of operators and the fun I have had in the program. At present it is hung in my living room, as it’s too beautiful an award to be hung in the shack</p>\r\n            <footer><cite title="Source Title">Denver A.C.E.Wijesuriya 4S7DA</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>Let me tell you that I like this award and I think that the Holyland award is a beauty of all awards which I have myself or know and I know a lot of awards. It will have a place in my living room in neighborhood with the USA county award to show it to all my friends. It is interesting to hear every weekend, how many stations like to have a contact with Israeli mobile operators and also to see that we have radio stations not only from all countries of Europe but also from Sri Lanka, Zaire, Australia, Japan and USA, that is great. Last but not least! I found a lot of new friends on the air with the Holyland award program in Israel and in other countries and I think that is it what we need in this time with so many troubles in the world</p>\r\n            <footer><cite title="Source Title">Wolfgang Prufert DL8USA ex Y24GE</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>The Award is hanging in the Dining Room on a wooden plaque and is the ONLY Award to be allowed in the house. All other Certificates etc. have to be displayed in the shack by order of my XYL. It certainly attracts interest from visitors</p>\r\n            <footer><cite title="Source Title">B.M. Taylor Z 21 CS</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>Words cannot describe the beauty of this award. I cherish it and brag about it to anyone that will listen. I must say, however, that the beauty of this award IS surpassed by the beauty of the friendship that I’ve seen among the active participants on the twenty meters net frequency. Stations from five continents representing so many nations, cultures, and religions working together and helping one another towards the achievement of this beautiful plaque</p>\r\n            <footer><cite title="Source Title">Walt Smith K1DWQ</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>Congratulations to the Israel Amateur Radio Club on sponsoring the ‘Holyland Award’. The time and the skill to design and produce such an exquisite award is apparent and will be displayed prominently in our home. It has even greater meaning since we have recently visited Israel and had the opportunity to view the city of Jerusalem from the Mount of Olives. We thus have great memories of this unforgettable panorama of history which is so beautifully depicted on the metal plaque</p>\r\n            <footer><cite title="Source Title">Don Chamberlain W9DC</cite></footer>\r\n        </blockquote>\r\n        <blockquote>\r\n            <p>I had heard many good comments about the award, and I was not disappointed when I finally saw it. Congratulations for a beautiful award and an enjoyable award program. I especially enjoyed having the maps to refer to during the program, it often brought back memories of having traveled in much of Israel with my father when I was young. Now, my own family is hoping we will pass through Israel at least once to travel som11e of the same roads</p>\r\n            <footer><cite title="Source Title">Daniel Petersen XT2DP</cite></footer>\r\n        </blockquote>\r\n                <blockquote>\r\n            <p>This is definitely the best-designed and manufactured award that I have seen. The fact it is not an easy award to obtain, makes it all that much more worthwhile. The Holyland award is being put in a frame and it will occupy the prime position in my shack, which is also my study</p>\r\n            <footer><cite title="Source Title">Ken Pickersgill ZS6NB</cite></footer>\r\n        </blockquote>\r\n        \r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/holyland/holylandcontest.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n        <h2 class="text-center">HOLYLAND CONTEST</h2><br />\r\n        <!--<h2 class="text-center" style="color: red">This year the Holyland Contest is dedicated to the 70 years anniversary of the state of Israel and Israel Amateur Radio Club</h2><br />-->\r\n        <h3 class="text-center">Friday, April 16, 21.00UTC - Saturday, April 17, 21.00UTC</h3>\r\n        <hr />\r\n        <span class="pull-right text-right"><a href="#HolylandResults">Results Page</a></span>\r\n\r\n        <h4>The Aim:</h4>\r\n        <ul>\r\n            <li>To promote contacts between Radio Amateurs around the globe and Israeli Hams.</li>\r\n            <li>To aid Amateurs to achieve the "Holyland Award" and other Israeli awards.</li>\r\n        </ul>\r\n        <ol>\r\n            <li>\r\n                <label>Eligibility:</label>\r\n                All licensed amateurs and SWL\'s worldwide.\r\n            </li>\r\n            <li>\r\n                <label>Object:</label>\r\n                To contact as many different Israeli amateur radio stations on as many bands, and from as many \'Areas\' as possible in different modes CW, SSB and DIGITAL.\r\n            </li>\r\n            <li>\r\n                <label>Period:</label>\r\n                <div style="color: red">Start: Friday, April 16, 21.00UTC.</div>\r\n                <div style="color: red">End: Saturday, April 17, 21.00UTC.</div>\r\n            </li>\r\n            <li>\r\n                <label>Categories:</label>\r\n                <ol>\r\n                    <li>\r\n                        <label>Single operator:</label>\r\n                        <ol>\r\n                            <li>Single operator - MIX (all bands).</li>\r\n                            <li>Single operator - SSB only (all bands).</li>\r\n                            <li>Single operator - CW only (all bands).</li>\r\n                            <li>Single operator - Digital mode (RTTY, PSK31) (all bands).</li>\r\n                            <li>Single operator - FT8 only (all bands). <strong><a href="http://www.iarc.org/iarc/Content/docs/FT8instructions.pdf" target="_blank">instructions</a></strong></li>\r\n                            <li>Single operator - QRP 10w (all bands).</li>\r\n                        </ol>\r\n                    </li>\r\n                    <li>\r\n                        <label>Multi operators</label>\r\n                        - single transmitter, all modes, all bands\r\n                    </li>\r\n                    <li>\r\n                        <label>Short Wave Listeners</label>\r\n                        - SWL.\r\n                    </li>\r\n                    <!--<li>\r\n                        <label>Checklog</label>\r\n                        - Entry submitted to assist with the log checking. The entry will not have a score in the results.\r\n                    </li>-->\r\n                </ol>\r\n            </li>\r\n            <li>\r\n                <label>Modes:</label>\r\n                CW; SSB; Digital; MIX. (Mixed = minimum 2 modes).\r\n            </li>\r\n            <li>\r\n                <label>Bands: 1.8, 3.5, 7, 14, 21, 28 MHz.</label><br />\r\n                According to the IARU Region-I recommendations: 3.50-3.56, 3.60-3.65, 3.70-3.80, 7.06-7.100, 7.130-7.200, 14.00-14.06, 14.125-14.300, 21.00-21.08, 21.20-21.40, 28.00-28.10, 28.50-28.80 MHz.\r\n            </li>\r\n            <li>\r\n                <label>Exchange:</label>\r\n                <ul>\r\n                    <li>Worldwide stations send RS(T) + QSO number starting with 001.</li>\r\n                    <li>Israeli stations give RS(T) and \'Area\'.</li>\r\n                </ul>\r\n            </li>\r\n            <li>\r\n                <label>Valid QSO:</label>\r\n                <ul>\r\n                    <li>The same station may be contacted in CW, SSB, FT8 and Digital mode on each band. It is thus possible to make up to 24 valid QSO\'s with the same station if worked in CW, SSB, FT8 and Digital on each band.</li>\r\n                    <li>Digital mode users may work either RTTY or PSK31, but only once on each band. RTTY and PSK31 are the same Digital mode. FT8 is a new separate category.</li>\r\n                    <li>Neither Cross-Mode nor Cross-Band contacts are permitted.</li>\r\n                </ul>\r\n            </li>\r\n            <li>\r\n                <label>QSO Points:</label>\r\n                <ol>\r\n                    <li>2 points for each QSO on 1.8 - 3.5 - 7 MHz,</li>\r\n                    <li>1 point for each QSO on 14 - 21 - 28 MHz.</li>\r\n                </ol>\r\n\r\n            </li>\r\n            <li>\r\n                <label>Multipliers:</label>\r\n                One multiplier for each \'Area\' worked once per band.<br />\r\n                <label>Note:</label>\r\n                A district \'Area\'. See explanation below.\r\n            </li>\r\n            <li>\r\n                <label>Final score:</label>\r\n                To calculate the final score, multiply the sum of QSO-points on all bands with the sum of multipliers worked on all bands.\r\n            </li>\r\n            <li>\r\n                <label>Logs:</label>\r\n                Electronic submission of logs is required for all entrants who use a computer to log the contest or prepare contest logs.<br />\r\n                <ol>\r\n                    <li>Each entry shall report: Time UTC, call sign, band, mode, RS(T)S, QSO number sent, RS(T)R (\'Area\' received) and points. A log without all required information may be reclassified to Checklog.</li>\r\n                    <li>SWL\'s shall report on Israeli stations only: UTC, band, mode, call sign, stations worked, RS(T), \'Area\' sent and points.</li>\r\n                    <li>The CABRILLO file format is the standard for logs. See the <a href="#LogUpload">LogUpload page</a> for detailed instructions on filling out the CABRILLO file header. Failure to fill out the header correctly may result in the entry being placed in the wrong category or reclassified as a Checklog.</li>\r\n                    <li>Web upload is the preferred method of log submission. Web upload of logs is available at <a href="#LogUpload">http://www.iarc.org/iarc/#LogUpload</a>. Email submission is also available. Logs in CABRILLO format should be sent to <a href="mailto:4z4kx@iarc.org">4z4kx@iarc.org</a>. Include only the entry call sign in the “Subject:” line of the e-mail.</li>\r\n                    <li>For NON-CABRILLO electronic logs. If you are not able to submit a CABRILLO format log, please contact the Contest Manager for assistance with submitting another format.</li>\r\n                    <li>All logs received will be confirmed via e-mail. A listing of logs received can be found at <a href="#HolylandLogs">http://www.iarc.org/iarc/#HolylandLogs</a></li>\r\n                </ol>\r\n            </li>\r\n            <li>\r\n                <label>Submit log deadline</label>\r\n                Log must be submited not later than May 31.\r\n            </li>\r\n            <!--<li>\r\n                <label>Summary sheet:</label>\r\n                <ol>\r\n                    <li>Please use the official "Holyland Contest" summary sheet, available on the IARC Contest Web site.</li>\r\n                    <li>All entries must be followed by a summary sheet showing station call sign, contest category, name of operator(s), address and e-mail.</li>\r\n                    <li>A summary sheet shall list the number of multipliers and points scored from each band worked, the final score. & a declaration of compliance with rules of contest and own Amateur Radio License.</li>\r\n                    <li>\r\n                        Entries must be postmarked not later than May 31, and sent to:\r\n                        <div class="tag-box tag-box-v2">\r\n                            <p>\r\n                                Contest Manager: 4Z4KX<br />\r\n                                Israel Amateur Radio Club<br />\r\n                                P.O.B 17600<br />\r\n                                Tel Aviv 6117501 Israel<br />\r\n                                <a href="mailto:4z4kx@iarc.org">4Z4KX@IARC.ORG</a>\r\n                            </p>\r\n                        </div>\r\n                    </li>\r\n                </ol>\r\n\r\n            </li>-->\r\n            <li>\r\n                <label>Prizes:</label>\r\n                <ol>\r\n                    <li>A trophy for the overall winners - Multi Ops.</li>\r\n                    <li>A trophy for the overall winner - MIX</li>\r\n                    <li>A plaque for the overall winner - CW</li>\r\n                    <li>A plaque for the overall winner - SSB</li>\r\n                    <li>A plaque for the overall winner - QRP</li>\r\n                    <li>A plaque for the overall winner - Digital mode</li>\r\n                    <li>A plaque for the overall winner - FT8</li>\r\n                    <li>A plaque for the overall winner - SWL</li>\r\n                    <li>A plaque for each Continental winner - only highest scores</li>\r\n                    <li><strong>Trophies and Plaques  will be awarded to the top scorers in their Winning Categories only when the minimum of 50 valid QSO\'s points has been reached</strong></li>\r\n                    <li>Only Digital Certificates will be awarded <a href="http://www.iarc.org/iarc/#Certificategenerator" target="_blank">http://www.iarc.org/iarc/#Certificategenerator</a></li>\r\n                </ol>\r\n            </li>\r\n            <li>\r\n                <label>Special Operation:</label>\r\n                <ol>\r\n                    <li>Israeli mobile stations may move and change their location during the contest, up to 10 different \'Areas\', restricted to an operating time of at least half an hour per \'Area\'. All mobile station are allowed to come back later to operate from the same squares again.</li>\r\n                    <li>The operation from each \'Area\' gives that station the status of a different station with another call, thus giving additional contest points and multipliers.</li>\r\n                    <li>To identify its different location  \'Area\', those stations will change their callsigns by adding a number after their suffix. For example 4Z1SL will use 4Z1SL/1, 4Z1SL/2, 4Z1SL/3.....4Z1SL/9, 4Z1SL/0. (operate from 10 different squares).</li>\r\n                </ol>\r\n            </li>\r\n            <li>\r\n                <label>Software:</label>\r\n                The recommended log software\r\n                <ol>\r\n                    <li><a href="https://4z1kd.github.io/HolyLogger/" target="_blank">HolyLogger</a></li>\r\n                    <li>N1MM</li>\r\n                    <li>AATest</li>\r\n                    <li>Rec3</li>\r\n                </ol>\r\n            </li>\r\n        </ol>\r\n\r\n        <h4>Explaining the Multipliers:</h4>\r\n        <ol>\r\n            <li>\r\n                <label>The square system:</label><br />\r\n                The country is divided geographically, by the Survey Department of Israel, into a grid system resulting in squares of 10 by 10 Kilometers. North to South coordinates are identified by numbers, while West to East coordinates are identified by letters. The square is defined through the combination of the relevant coordinates i.e. E14.\r\n            </li>\r\n            <li>\r\n                <label>The Administrative System:</label><br />\r\n                The country is divided into 23 administrative regions and regions are not multipliers!<br />\r\n                Here is a list of the Regions and their respective abbreviations:<br />\r\n                <div class="row">\r\n                    <div class="panel-grey col-md-3">\r\n                        <table class="table table-striped">\r\n                            <thead>\r\n                                <tr>\r\n                                    <th style="background-color: #cccccc">Region</th>\r\n                                    <th style="background-color: #cccccc">Abb.</th>\r\n                                </tr>\r\n                            </thead>\r\n                            <tbody>\r\n                                <tr>\r\n                                    <td>Akko</td>\r\n                                    <td>AK</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Ashqelon</td>\r\n                                    <td>AS</td>\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Azza</td>\r\n                                    <td>AZ</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Beer Sheva</td>\r\n                                    <td>BS</td>\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Bethlehem</td>\r\n                                    <td>BL</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Hadera</td>\r\n                                    <td>HD</td>\r\n                                </tr>\r\n                            </tbody>\r\n                        </table>\r\n                    </div>\r\n                    <div class="panel-grey col-md-3">\r\n                        <table class="table table-striped">\r\n                            <thead>\r\n                                <tr>\r\n                                    <th style="background-color: #cccccc">Region</th>\r\n                                    <th style="background-color: #cccccc">Abb.</th>\r\n                                </tr>\r\n                            </thead>\r\n                            <tbody>\r\n                                <tr>\r\n                                    <td>Hagolan</td>\r\n                                    <td>HG</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Haifa</td>\r\n                                    <td>HF</td>\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Hasharon</td>\r\n                                    <td>HS</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Hebron</td>\r\n                                    <td>HB</td>\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Jenin</td>\r\n                                    <td>JN</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Jerusalem</td>\r\n                                    <td>JS</td>\r\n                                </tr>\r\n                            </tbody>\r\n                        </table>\r\n                    </div>\r\n                    <div class="panel-grey col-md-3">\r\n                        <table class="table table-striped">\r\n                            <thead>\r\n                                <tr>\r\n                                    <th style="background-color: #cccccc">Region</th>\r\n                                    <th style="background-color: #cccccc">Abb.</th>\r\n                                </tr>\r\n                            </thead>\r\n                            <tbody>\r\n                                <tr>\r\n                                    <td>Kinneret</td>\r\n                                    <td>KT</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Petah Tiqwa</td>\r\n                                    <td>PT</td>\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Ramallah</td>\r\n                                    <td>RA</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Ramla</td>\r\n                                    <td>RM</td>\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Rehovot</td>\r\n                                    <td>RH</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Shekhem</td>\r\n                                    <td>SM</td>\r\n                                </tr>\r\n                            </tbody>\r\n                        </table>\r\n                    </div>\r\n                    <div class="panel-grey col-md-3">\r\n                        <table class="table table-striped">\r\n                            <thead>\r\n                                <tr>\r\n                                    <th style="background-color: #cccccc">Region</th>\r\n                                    <th style="background-color: #cccccc">Abb.</th>\r\n                                </tr>\r\n                            </thead>\r\n                            <tbody>\r\n                                <tr>\r\n                                    <td>Telaviv</td>\r\n                                    <td>TA</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Tulkarm</td>\r\n                                    <td>TK</td>\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Yarden</td>\r\n                                    <td>YN</td>\r\n\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Yizreel</td>\r\n                                    <td>YZ</td>\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>Zefat</td>\r\n                                    <td>ZF</td>\r\n                                </tr>\r\n                                <tr>\r\n                                    <td>-</td>\r\n                                    <td>-</td>\r\n                                </tr>\r\n                            </tbody>\r\n                        </table>\r\n                    </div>\r\n                </div>\r\n            </li>\r\n            <li>\r\n                <label>The \'Areas\' (multipliers):</label>\r\n                An \'Area\' (multiplier) is made up from the 10 by 10 km. grid reference square and the region. For example: F15TA, E14TA, H08HF. The \'Area\' is the basis for the "Holyland Award" and the "Holyland DX Contest". For that purpose the \'Area\' must contain land and only that land or any waterway in that \'Area\' is considered to be the \'Area\'.\r\n            </li>\r\n            <li>\r\n                <label>Region Boundaries:</label>\r\n                The region boundaries are drawn in an arbitrary manner so that often the 10 km grid reference square does cover more than one single region. For example, the square H08 lies partly in the region of Haifa, partly in the region of Hadera and partly in the region of Yizreel. As a result one may work, in the same square, three different Areas - H08HF, H08HD and H08YZ.\r\n            </li>\r\n            <li>\r\n                <label>Maps: The Israel Survey Department has printed the following maps:</label>\r\n                <ol>\r\n                    <li>Country Road Map with a 1:250.000 scale, comprising 2 sheets (<a href="http://iarc.org/site/Content/docs/isr1.jpg" target="_blank">North</a>, <a href="http://iarc.org/site/Content/docs/isr2.jpg" target="_blank">South</a>)</li>\r\n                    <li>Country Road Map with a 1:100.000 scale, comprising 6 sheets.</li>\r\n                    <li>Region Map with a 1:250.000 scale, comprising 2 sheets.</li>\r\n                </ol>\r\n            </li>\r\n        </ol>\r\n        <hr />\r\n        <!--<p>\r\n            <label>The Electronics files should be named after participant\'s call sign for example:</label> 4Z4KX.ALL and 4Z4KX.SUM\r\n        </p>-->\r\n        <p>\r\n            All logs received by e-mail will be confirmed by e-mail.<br />\r\n            ALL FINAL RESULTS can be found on the IARC Web Site <a href="#HolylandResults">Holyland Results Page</a>\r\n        </p>\r\n        <p>\r\n            Best 73\'s & Shalom,<br />\r\n            MARK STERN 4Z4KX<br />\r\n            IARC CONTEST MANAGER<br />\r\n            <a href="mailto:4z4kx@iarc.org">4Z4KX@IARC.ORG</a>\r\n        </p>\r\n\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>';});


define('text!views/holyland/holylandlogs.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid text-left" style="direction: ltr">\r\n\t\t<div class="margin-bottom-40"></div>\r\n        <div class="row margin-bottom-10">\r\n\t\t\t<div class="col-md-12">\r\n\t\t\t<strong>\r\n\t\t\tThis page contains a list of all logs that have been submitted for the Holyland Contest <span data-bind="text: year"></span>. The page is updated each time it is refreshed in your browser. Your log is not officially received until it appears on this page. Send any questions to 4z4kx@iarc.org\r\n\t\t\t</strong>\r\n\t\t\t</div>\r\n            <div class="col-md-8">\r\n\t\t\t<h3><span data-bind="html: counter"></span> Logs were received from <span data-bind="html: DXCCcounter"></span> DXCCs</h3>\r\n            </div>\r\n            <div class="col-md-4 pull-right" style="max-width: 350px; margin-top:8px;">\r\n                <div id="custom-search-input">\r\n                    <div class="input-group col-md-12">\r\n                        <input type="text" class="  search-query form-control" placeholder="Search" data-bind="value: searchInput, valueUpdate: \'afterkeydown\'" />\r\n                        <span class="input-group-btn">\r\n                            <button class="btn btn-success" type="button">\r\n                                <span class="icon icon-search"></span>\r\n                            </button>\r\n                        </span>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n        \r\n        \r\n       <div class="panel panel-green margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">Holyland <span data-bind="text: year"></span> Logs</h4>\r\n            </div>\r\n            <table class="table table-striped table-hover" id="dataTable">\r\n                <thead>\r\n                    <tr>\r\n                        <th>Callsign</th>\r\n                        <th>Name</th>\r\n                        <th>Category - Mode</th>\r\n                        <th>Category - Operator</th>\r\n                        <th>Category - Power</th>\r\n                        <th>Country</th>\r\n                        <!--<th>Points (estimation)</th>-->\r\n                        <th>Valid QSOs (estimation)</th>\r\n                        <th>Year</th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody data-bind="foreach: logs">\r\n                    <tr>\r\n                        <td data-bind="text: callsign"></td>\r\n                        <td data-bind="text: name"></td>\r\n                        <td data-bind="text: category_mode"></td>\r\n                        <td data-bind="text: category_op"></td>\r\n                        <td data-bind="text: category_power"></td>\r\n                        <td data-bind="text: country"></td>\r\n                        <!--<td data-bind="text: points"></td>-->\r\n                        <td data-bind="text: qsos"></td>\r\n                        <td data-bind="text: year"></td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/holyland/holylandresults.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n        <h2 class="text-center">THE HOLYLAND CONTEST RESULTS</h2>\r\n        <hr />\r\n        <div class="tab-v2">\r\n            <ul class="nav nav-tabs" data-bind="foreach: years">\r\n                <li data-bind="css: { \'active\': $index() == 0 }"><a data-toggle="tab" data-bind="    text: $data, attr: { href: \'#T\' + $data }"></a></li>\r\n            </ul>\r\n            <div class="tab-content" data-bind="foreach: years">\r\n                <div class="tab-pane" data-bind="attr: { Id: \'T\' + $data }, css: { \'active\': $index() == 0 }">\r\n\r\n                    <div class="row">\r\n                        <div class="col-md-8">\r\n                        </div>\r\n                        <div class="col-md-4 pull-right" style="max-width: 350px;">\r\n                            <div id="custom-search-input">\r\n                                <div class="input-group col-md-12">\r\n                                    <input type="text" class="  search-query form-control" placeholder="Search" data-bind="value: $parent.searchInput, valueUpdate: \'afterkeydown\'" />\r\n                                    <span class="input-group-btn">\r\n                                        <button class="btn btn-success" type="button">\r\n                                            <span class="icon icon-search"></span>\r\n                                        </button>\r\n                                    </span>\r\n                                </div>\r\n                            </div>\r\n                        </div>\r\n                    </div>\r\n                    <div class="tab-v2">\r\n                        <ul class="nav nav-tabs" data-bind="foreach: categories">\r\n                            <li data-bind="css: { \'active\': $index() == 0 }"><a data-toggle="tab" data-bind="    text: $data, attr: { href: \'#C\' + $parent + $data.replace(\' \', \'_\') }"></a></li>\r\n                        </ul>\r\n                        <div class="tab-content" data-bind="foreach: categories">\r\n                            <div class="tab-pane" data-bind="attr: { Id: \'C\' + $parent + $data.replace(\' \', \'_\') }, css: { \'active\': $index() == 0 }">\r\n                                <!--<h4>Contest Results for year: <span data-bind="text: $parent"></span> mode: <span data-bind="    text: $data"></span></h4>-->\r\n                                <table class="table table-striped table-hover" id="dataTable">\r\n                                    <thead>\r\n                                        <tr>\r\n                                            <th>#</th>\r\n                                            <th>Call</th>\r\n                                            <th>Continent</th>\r\n                                            <th>Category</th>\r\n                                            <th>QSO</th>\r\n                                            <th>Points</th>\r\n                                            <th>Mults</th>\r\n                                            <th>Score</th>\r\n                                        </tr>\r\n                                    </thead>\r\n                                    <tbody data-bind="foreach: Enumerable.From(this.results()).Where(function (x) { return x.year == $parent && x.category == $data }).OrderBy(function (x) { return parseInt(x.score) }).Reverse().ToArray()">\r\n                                        <tr data-bind="style: { \'font-weight\': $index() < 3 ? \'bold\' : \'normal\' }">\r\n                                            <td data-bind="text: $index()+1"></td>\r\n                                            <td data-bind="text: call"></td>\r\n                                            <td data-bind="text: continent"></td>\r\n                                            <td data-bind="text: category"></td>\r\n                                            <td data-bind="text: qso"></td>\r\n                                            <td data-bind="text: points"></td>\r\n                                            <td data-bind="text: mults"></td>\r\n                                            <td data-bind="text: score"></td>\r\n                                        </tr>\r\n                                    </tbody>\r\n                                </table>\r\n                            </div>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/holyland/holylandresults_isr.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n        <h2 class="text-center">THE HOLYLAND CONTEST RESULTS - Israeli Stations</h2>\r\n        <hr />\r\n        <div class="tab-v2">\r\n            <ul class="nav nav-tabs" data-bind="foreach: years">\r\n                <li data-bind="css: { \'active\': $index() == 0 }"><a data-toggle="tab" data-bind="    text: $data, attr: { href: \'#T\' + $data }"></a></li>\r\n            </ul>\r\n            <div class="tab-content" data-bind="foreach: years">\r\n                <div class="tab-pane" data-bind="attr: { Id: \'T\' + $data }, css: { \'active\': $index() == 0 }">\r\n\r\n                    <div class="row">\r\n                        <div class="col-md-8">\r\n                        </div>\r\n                        <div class="col-md-4 pull-right" style="max-width: 350px;">\r\n                            <div id="custom-search-input">\r\n                                <div class="input-group col-md-12">\r\n                                    <input type="text" class="  search-query form-control" placeholder="Search" data-bind="value: $parent.searchInput, valueUpdate: \'afterkeydown\'" />\r\n                                    <span class="input-group-btn">\r\n                                        <button class="btn btn-success" type="button">\r\n                                            <span class="icon icon-search"></span>\r\n                                        </button>\r\n                                    </span>\r\n                                </div>\r\n                            </div>\r\n                        </div>\r\n                    </div>\r\n                    <div class="tab-v2">\r\n                        <ul class="nav nav-tabs" data-bind="foreach: categories">\r\n                            <li data-bind="css: { \'active\': $index() == 0 }"><a data-toggle="tab" data-bind="    text: $data, attr: { href: \'#C\' + $parent + $data.replace(\' \', \'_\') }"></a></li>\r\n                        </ul>\r\n                        <div class="tab-content" data-bind="foreach: categories">\r\n                            <div class="tab-pane" data-bind="attr: { Id: \'C\' + $parent + $data.replace(\' \', \'_\') }, css: { \'active\': $index() == 0 }">\r\n                                <!--<h4>Contest Results for year: <span data-bind="text: $parent"></span> mode: <span data-bind="    text: $data"></span></h4>-->\r\n                                <table class="table table-striped table-hover" id="dataTable">\r\n                                    <thead>\r\n                                        <tr>\r\n                                            <th>#</th>\r\n                                            <th>Call</th>\r\n                                            <th>Continent</th>\r\n                                            <th>Category</th>\r\n                                            <th>QSO</th>\r\n                                            <th>Points</th>\r\n                                            <th>Mults</th>\r\n                                            <th>Score</th>\r\n                                        </tr>\r\n                                    </thead>\r\n                                    <tbody data-bind="foreach: Enumerable.From(this.results()).Where(function (x) { return x.year == $parent && x.category == $data }).OrderBy(function (x) { return parseInt(x.score) }).Reverse().ToArray()">\r\n                                        <tr data-bind="style: { \'font-weight\': $index() < 3 ? \'bold\' : \'normal\' }">\r\n                                            <td data-bind="text: $index()+1"></td>\r\n                                            <td data-bind="text: call"></td>\r\n                                            <td data-bind="text: continent"></td>\r\n                                            <td data-bind="text: category"></td>\r\n                                            <td data-bind="text: qso"></td>\r\n                                            <td data-bind="text: points"></td>\r\n                                            <td data-bind="text: mults"></td>\r\n                                            <td data-bind="text: score"></td>\r\n                                        </tr>\r\n                                    </tbody>\r\n                                </table>\r\n                            </div>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/holyland/holylandrules.html',[],function () { return '<div class="container" dir="rtl">\r\n\r\n    <div class="row-fluid privacy">\r\n\r\n        <h2>30 שנה לתחרות "ארץ הקודש"</h2>\r\n        <h3>\r\n            נוהל הפעלה לחובבים ישראלים\r\n        </h3>\r\n\r\n\r\n        <!-- General Questions -->\r\n        <div class="panel-group margin-bottom-40">\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        תאריך\r\n                    </h4>\r\n                </div>\r\n                <div id="collapseOne">\r\n                    <div class="panel-body">\r\n                        משבת ה 17 באפריל בשעה 00.00 זמן מקומי עד 17 באפריל בשעה 23.59 זמן מקומי.\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        מטרה\r\n                    </h4>\r\n                </div>\r\n                <div id="collapseTwo">\r\n                    <div class="panel-body">\r\n                        לעודד קשר בין חובבי הרדיו בעולם לבין עמיתיהם בישראל.<br />\r\n                        לסייע לכל חובבי הרדיו להשיג את התעודות הישראליות – בפרט תעודות ארץ הקודש.<br />\r\n                        לעודד פעילות מיוחדת גם במצבי תחרות.<br />\r\n\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        התחומים\r\n                    </h4>\r\n                </div>\r\n                <div id="collapseThree">\r\n                    <div class="panel-body">\r\n                        28, 21, 14, 7, 3.5 ו 1.8 מה"ץ – לפי המלצות של  IARU  . Region 1\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        הקטגוריות\r\n                    </h4>\r\n                </div>\r\n                <div id="collapseFour">\r\n                    <div class="panel-body">\r\n                        <ol>\r\n                            <li style="direction:rtl"><b>(MIX)</b> &nbsp;מפעיל יחיד כל הגלים, 2 או יותר מודים (SSB/CW/Digital/FT8)</li>\r\n                            <li style="direction:rtl"><b>(CW)</b> &nbsp;מפעיל יחיד רק CW</li>\r\n                            <li style="direction:rtl"><b>(SSB)</b> מפעיל יחיד רק SSB</li>\r\n                            <li style="direction:rtl"><b>(FT8)</b> &nbsp;מפעיל יחיד רק FT8 <strong><a href="http://www.iarc.org/iarc/Content/docs/FT8instructions.pdf" target="_blank">(הנחיות)</a></strong></li>\r\n                            <li style="direction:rtl"><b>(DIGI)</b> מפעיל יחיד רק Digital, אפנונים RTTY, PSK31</li>\r\n                            <li style="direction:rtl"><b>(QRP)</b> מפעיל יחיד עד 10 וואט</li>\r\n                            <li style="direction:rtl"><b>(SOB)</b> מפעיל יחיד, גל אחד, תחנה קבועה (מינימום 100 קשרים)</li>\r\n                            <li style="direction:rtl"><b>(M5)</b>&nbsp;&nbsp;&nbsp; מפעיל יחיד, כל הגלים, תחנה ניידת (עד 5 ריבועים שונים)</li>\r\n                            <li style="direction:rtl"><b>(M10)</b>&nbsp; מפעיל יחיד, כל הגלים, תחנה ניידת (עד 10 ריבועים שונים)</li>\r\n                            <li style="direction:rtl"><b>(POR)</b> מפעיל יחיד, כל הגלים, תחנה נישאת (ריבוע יחיד)</li>\r\n                            <li style="direction:rtl"><b>(MOP)</b> מפעילים רבים, (כולל תחנת מועדון), משדר יחיד, כל הגלים</li>\r\n                            <li style="direction:rtl"><b>(MM)</b>&nbsp;&nbsp; מפעילים רבים, (כולל תחנת מועדון), משדרים רבים, כל הגלים</li>\r\n                            <li style="direction:rtl"><b>(MMP)</b> מפעילים רבים, (כולל תחנת מועדון), משדר נייד יחיד או נישא</li>\r\n                            <li style="direction:rtl"><b>(4Z9)</b> &nbsp;&nbsp;חובב דרגה ג\'</li>\r\n                            <li style="direction:rtl"><b>(SHA)</b> חובבים שומרי שבת המצטרפים במוצאי שבת</li>\r\n                            <li style="direction:rtl"><b>(SWL)</b> מאזינים</li>\r\n                            <li style="direction:rtl"><b>(NEW)</b> חובב חדש (בעל רישיון חדש פחות משנתיים)</li>\r\n                        </ol>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        שיטות אפנון\r\n                    </h4>\r\n                </div>\r\n                <div id="collapseFive">\r\n                    <div class="panel-body">\r\n                        FT8, RTTY, PSK31, SSB, CW\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        דיווח\r\n                    </h4>\r\n                </div>\r\n                <div id="collapseSix">\r\n                    <div class="panel-body">\r\n                        תחנות ישראליות ידווחו RST + \'ריבוע\' (לדוגמה F15RH)<br />\r\n                        תחנות DX ידווחו RST + מספר רץ החל מ 001.<br />\r\n                        מאזינים SWL ידווחו רק על תחנות DX שמסרו רפורט ומספר רץ וגם ריבוע של תחנה ישראלית איתה נעשה קשר.\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        קבילות קשר\r\n                    </h4>\r\n                </div>\r\n                <div id="collapseSeven">\r\n                    <div class="panel-body">\r\n                        כל תחנה יכולה להתקשר עם כל תחנה אחרת 4 פעמים על כל תחום ב - CW, FT8, Digital וSSB.<br />\r\n                        סך הכול 24 קשרים עם אותה תחנה על כל התחומים.<br />\r\n                        קשר מעורב בין סוגי אפנון ו/או תחומים שונים – אסור.\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        ניקוד\r\n                    </h4>\r\n                </div>\r\n                <div id="collapse8">\r\n                    <div class="panel-body">\r\n                        2 נקודות עבור כל קשר (כולל ישראל)  בתחומים 1.8, 3.5 ו 7 מה"ץ.<br />\r\n                        1 נקודה עבור כל קשר (כולל ישראל)  בתחומים 14, 21 ו 28 מה"ץ.\r\n                        <br />\r\n                        <span style="font-weight:bold">\r\n                            לאור פניות חובבים מחו"ל על כך שבשבת בערב כבר לא ניתן לשמוע הרבה תחנות\r\n                            ישראליות,  ינתן ניקוד כפול  לתחנות ישראליות על הקשרים בין 20:00 ל 23:59\r\n                            <br />\r\n                            4 נקודות עבור כל קשר (כולל ישראל)  בתחומים 1.8, 3.5 ו 7 מה"ץ.<br />\r\n                            2 נקודה עבור כל קשר (כולל ישראל)  בתחומים 14, 21 ו 28 מה"ץ.\r\n                        </span>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        מכפילים\r\n                    </h4>\r\n                </div>\r\n                <div id="collapse9">\r\n                    <div class="panel-body">\r\n                        <ul>\r\n                            <li>כל מופע ראשון של מדינה מארצות ה DXCC בכל גל – 1 מכפיל.</li>\r\n                            <li>כל מופע ראשון של ריבוע של תחנה ישראלית בכל גל – 1 מכפיל.</li>\r\n                        </ul>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        סיכום נקודות\r\n                    </h4>\r\n                </div>\r\n                <div id="collapse10">\r\n                    <div class="panel-body">\r\n                        סכום כל נקודות הקשרים, מכל הגלים, מוכפל בסך כל המכפילים, מכל התחומים.\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        יומני התחנה\r\n                    </h4>\r\n                </div>\r\n                <div id="collapse11">\r\n                    <div class="panel-body">\r\n                        <ul>\r\n                            <li>כל רישום חייב להכיל זמן, אות קריאה, תדר, RST + ריבוע שנשלח, RST ומספר רץ שהתקבלו, מכפילים וניקוד עבור הקשרים.</li>\r\n                            <li>את היומנים חייבים להגיש לא יאוחר מ 31.5 (לפי חותמת הדואר).</li>\r\n                            <li>\r\n                                מען למשלוח יומנים: יומנים האלקטרוניים יש לעלות ישירות באתר האגודה.<br />\r\n                                על הקובץ להיות בפורמט Cabrillo כמפורט בדף הבא:\r\n                                <a href="#LogUpload">http://www.iarc.org/iarc/#LogUpload</a>\r\n                            </li>\r\n                            <li>\r\n                                יומני נייר יש לשלוח: מארק שטרן, 4Z4KX ת.ד 73, ראשל"צ,  7510001.<br />\r\n                                או במייל:    4Z4KXX@GMAIL.COM\r\n                            </li>\r\n                            <li>\r\n                                מומלץ לעבוד עם תוכנת הלוג HolyLogger שזמינה להורדה בלינק:<br />\r\n                                <a href="https://4z1kd.github.io/HolyLogger/" target="_blank">https://4z1kd.github.io/HolyLogger/</a>\r\n                            </li>\r\n                        </ul>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        פרסים\r\n                    </h4>\r\n                </div>\r\n                <div id="collapse12">\r\n                    <div class="panel-body">\r\n                        גביעים למנצחים בכל הקטגוריות, מגנים למקום שני ושלישי.<br />\r\n                        פרסים מיוחדים מטעם מארגני התחרות.<br />\r\n                        מדליות  לכל החובבים שהפעילו לפחות 6 שעות ועבדו לא פחות מ 250 תחנות.<br />\r\n\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        הפעלה מיוחדת מתחנות ניידות (ריבוי מיקומי הפעלה)\r\n                    </h4>\r\n                </div>\r\n                <div id="collapse13">\r\n                    <div class="panel-body">\r\n\r\n                        יש שתי קטגוריות בהפעלת לתחנות הניידות בזמן התחרות\r\n                        <ol>\r\n                            <li>תחנה ניידת עד 5 ריבועים שונים</li>\r\n                            <li>תחנה ניידת עד 10 רבועים שונים</li>\r\n                        </ol>\r\n                        אות הקריאה ישתנה כאשר עוברים מרבוע אחד לריבוע אחר. לדוגמא:<br />\r\n                        4Z1SL/1, 4Z1SL/2, 4Z1SL/3, 4Z1SL/4, 4Z1SL/5,4Z1SL/6…...4Z1SL/9 ,4Z1SL/0\r\n                        <ul>\r\n                            <li>ההפעלה חייבת להימשך לפחות חצי שעה לפני שינוי מקום לריבוע הבא.</li>\r\n                            <li>לאורך כל התחרות התחנה לא תהיה מחוברת לרשת החשמל הארצית.</li>\r\n                            <li>מותר להפעיל ציוד, כולל אנטנה שנמצאים מחוץ לרכב. כלומר אין הכרח להמצא בתוך הרכב בזמן ההפעלה.</li>\r\n                            <li>מותר לחזור לריבוע שממנו כבר הפעילו קודם ואז להזדהות עם המיספר של ההפעלה הקודמת שהיתה בריבוע זה</li>\r\n                            <li>כל הפעלה מריבוע חדש תחשב כתחנה נפרדת ותחייב רישום אות הקריאה בהתאם (תוספת #/)</li>\r\n                            <li>חובה לציין את נקודת ההפעלה מכל ריבוע וריבוע.</li>\r\n                            <li>במידה ובקובץ הלוג יהיו 5 או פחות דיווחי מיקומים, ההפעלה תחשב אוטומטית כהשתתפות בקטגוריה של 5 מיקומים. במידה ובקובץ הלוג יהיו 6 ויותר דיווחי מיקומים ההפעלה תחשב אוטומטית כהשתתפות בקטגוריה של 10 מיקומים.</li>\r\n                        </ul>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        הפעלה מתחנה נישאת (מיקום הפעלה יחיד)\r\n                    </h4>\r\n                </div>\r\n                <div id="collapse14">\r\n                    <div class="panel-body">\r\n                        תחנה נישאת תופעל אך ורק בתנאי שדה ומחוץ לריבוע הקבוע של מקום תחנתו הקבועה של המתחרה.<br />\r\n                        לאורך כל התחרות היא לא תהיה מחוברת לרשת החשמל הארצית ותופעל רק מאותו ריבוע כל זמן התחרות.<br />\r\n                        היא תזדהה עם סיומת /P לאות הקריאה שלה בכל זמן התחרות.<br />\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n        </div><!--/acc-v1-->\r\n        <!-- End General Questions -->\r\n\r\n        <h4>לסיכום</h4>\r\n        <p>\r\n            אנו מבקשים מהחובבים להשתתף בתחרות כדי לגרום להצלחתה ולהביא את שמה של ישראל וחובבי הרדיו שלה אל תודעת החובבים של העולם. אנו מקווים שתופעלנה הרבה תחנות ניידות ונישאות גם מריבועים נדירים.\r\n            ריבוי תחנות ניידות בזמן התחרות הוא ערובה להצלחת התחרות כולה!\r\n        </p>\r\n        <p>\r\n            אנו מבקשים לשמור על חוקי התחרות ומגבלות הרישיון שברשותכם, לתת הזדמנות שווה לתחנות רחוקות – DX- וחלשות – QRP, לבצע ולהשלים את הקשר, במיוחד על התדרים הנמוכים.\r\n            חובבים אשר לא יעמדו בחוקי התחרות – ייפסלו. כל קשריהם עם תחנות חוץ ו"ריבועים" מהם הפעילו, לא יוכרו לצורך התחרות או לתעודת "ארץ הקודש".\r\n            נא לא לשכוח לשלוח יומני התחרות לבדיקה עד התאריך (לפי חותמת הדואר) הקובע כי:\r\n            "יומן לא שלחת – כאילו בתחרות לא השתתפת!"\r\n        </p>\r\n        <p>\r\n            אנו מאחלים לכולם הנאה והצלחה בתחרות "ארץ הקודש".<br />\r\n            הוועדה המארגנת\r\n        </p>\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/holyland/holylandsquares.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid text-left" style="direction: ltr">\r\n\r\n        <div class="row margin-bottom-10">\r\n            <div class="col-md-8">\r\n                You may want to check the online tool: <strong><u><a href="https://www.iarc.org/holysquare/" target="_blank">https://www.iarc.org/holysquare/</a></u></strong>\r\n            </div>\r\n            <div class="col-md-4 pull-right" style="max-width: 350px; margin-top:8px;">\r\n                <div id="custom-search-input">\r\n                    <div class="input-group col-md-12">\r\n                        <input type="text" class="  search-query form-control" placeholder="Search" data-bind="value: searchInput, valueUpdate: \'afterkeydown\'" />\r\n                        <span class="input-group-btn">\r\n                            <button class="btn btn-success" type="button">\r\n                                <span class="icon icon-search"></span>\r\n                            </button>\r\n                        </span>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n        <!--Striped Rows-->\r\n        <div class="panel panel-green margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">Squares of the Holyland</h4>\r\n            </div>\r\n            <table class="table table-striped table-hover" id="dataTable">\r\n                <thead>\r\n                    <tr>\r\n                        <th>Region</th>\r\n                        <th>Square</th>\r\n                        <th>View Map</th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody>\r\n                    <tr><td>AK - Akko</td><td>H-03-AK</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>H-04-AK</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>H-05-AK</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>H-06-AK</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>J-03-AK</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>J-04-AK</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>J-05-AK</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>J-06-AK</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>J-07-AK</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>K-03-AK</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>K-04-AK</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>K-05-AK</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>K-06-AK</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>L-03-AK</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>L-04-AK</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>L-05-AK</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AK - Akko</td><td>M-04-AK</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>B-21-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>C-18-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>C-19-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>C-20-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>C-21-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>D-16-AS</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>D-17-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>D-18-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>D-19-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>D-20-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>D-21-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>E-16-AS</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>E-17-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>E-18-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>E-19-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>E-20-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>E-21-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>F-17-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>F-18-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>F-19-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>F-20-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>F-21-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>G-19-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>G-20-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AS - Ashkelon</td><td>G-21-AS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>A-21-AZ</td><td></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>A-22-AZ</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>A-23-AZ</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>B-20-AZ</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>B-21-AZ</td><td></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>B-22-AZ</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>B-23-AZ</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>C-19-AZ</td><td></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>C-20-AZ</td><td></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>C-21-AZ</td><td></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>Z-22-AZ</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>AZ - Azza</td><td>Z-23-AZ</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>H-18-BL</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>H-19-BL</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>J-18-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>J-19-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>K-17-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>K-18-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>K-19-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>K-20-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>K-21-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>L-17-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>L-18-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>L-19-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>L-20-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>L-21-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>M-17-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BL - Bethlehem</td><td>M-18-BL</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>A-22-BS</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>A-23-BS</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>A-24-BS</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>A-25-BS</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>A-26-BS</td><td><a href="/iarc/Content/holyland/ab26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>A-27-BS</td><td><a href="/iarc/Content/holyland/ab26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>B-21-BS</td><td></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>B-22-BS</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>B-23-BS</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>B-24-BS</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>B-25-BS</td><td><a href="/iarc/Content/holyland/ab22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>B-26-BS</td><td><a href="/iarc/Content/holyland/ab26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>B-27-BS</td><td><a href="/iarc/Content/holyland/ab26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>B-28-BS</td><td><a href="/iarc/Content/holyland/ab26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>B-29-BS</td><td><a href="/iarc/Content/holyland/ab26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-21-BS</td><td></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-22-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-23-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-24-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-25-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-26-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-27-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-28-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-29-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-30-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-31-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-32-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>C-33-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-20-BS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-21-BS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-22-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-23-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-24-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-25-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-26-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-27-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-28-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-29-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-30-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-31-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-32-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-33-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-34-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>D-35-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-21-BS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-22-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-23-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-24-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-25-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-26-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-27-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-28-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-29-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-30-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-31-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-32-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-33-BS</td><td><a href="/iarc/Content/holyland/ce30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-34-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-35-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-36-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-37-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>E-38-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-21-BS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-22-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-23-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-24-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-25-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-26-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-27-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-28-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-29-BS</td><td><a href="/iarc/Content/holyland/bf26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-30-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-31-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-32-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-33-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-34-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-35-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-36-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-37-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-38-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-39-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-40-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-41-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-42-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>F-43-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-22-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-23-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-24-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-25-BS</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-26-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-27-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-28-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-29-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-30-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-31-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-32-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-33-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-34-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-35-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-36-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-37-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-38-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-39-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-40-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-41-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-42-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>G-43-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-22-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-23-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-24-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-25-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-26-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-27-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-28-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-29-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-30-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-31-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-32-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-33-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-34-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-35-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-36-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-37-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-38-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-39-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-40-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>H-41-BS</td><td><a href="/iarc/Content/holyland/eh38_43.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-22-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-23-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-24-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-25-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-26-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-27-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-28-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-29-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-30-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-31-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-32-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-33-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-34-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-35-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-36-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>J-37-BS</td><td><a href="/iarc/Content/holyland/dj34_37.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-21-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-22-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-23-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-24-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-25-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-26-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-27-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-28-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-29-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>K-30-BS</td><td><a href="/iarc/Content/holyland/fk30_33.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>L-20-BS</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>L-21-BS</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>L-22-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>L-23-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>L-24-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>L-25-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>L-26-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>L-27-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>L-28-BS</td><td><a href="/iarc/Content/holyland/gl26_29.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>M-25-BS</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>BS - Be\'er Sheva</td><td>M-26-BS</td><td></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>F-21-HB</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>F-22-HB</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>G-19-HB</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>G-20-HB</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>G-21-HB</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>G-22-HB</td><td><a href="/iarc/Content/holyland/cg22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>H-18-HB</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>H-19-HB</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>H-20-HB</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>H-21-HB</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>H-22-HB</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>J-19-HB</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>J-20-HB</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>J-21-HB</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>J-22-HB</td><td><a href="/iarc/Content/holyland/hm22_25.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>K-19-HB</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>K-20-HB</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>K-21-HB</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>K-22-HB</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HB - Hebron</td><td>L-21-HB</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>F-09-HD</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>F-10-HD</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>G-06-HD</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>G-07-HD</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>G-08-HD</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>G-09-HD</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>G-10-HD</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>H-07-HD</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>H-08-HD</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>H-09-HD</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>H-10-HD</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>H-11-HD</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>J-09-HD</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HD - Hadera</td><td>J-10-HD</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HF - Haifa</td><td>G-06-HF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HF - Haifa</td><td>G-07-HF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HF - Haifa</td><td>H-05-HF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HF - Haifa</td><td>H-06-HF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HF - Haifa</td><td>H-07-HF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HF - Haifa</td><td>H-08-HF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HF - Haifa</td><td>J-05-HF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HF - Haifa</td><td>J-06-HF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HF - Haifa</td><td>J-07-HF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>N-01-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>N-03-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>N-04-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>N-05-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>O-00-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>O-01-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>O-02-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>O-03-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>O-04-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>O-05-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>O-06-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>O-07-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>P-00-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>P-01-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>P-02-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>P-03-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>P-04-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>P-05-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>P-06-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>P-07-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>Q-03-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>Q-04-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HG - HaGolan</td><td>Q-05-HG</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HS - HaSharon</td><td>F-10-HS</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HS - HaSharon</td><td>F-11-HS</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HS - HaSharon</td><td>F-12-HS</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HS - HaSharon</td><td>F-13-HS</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HS - HaSharon</td><td>G-10-HS</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HS - HaSharon</td><td>G-11-HS</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HS - HaSharon</td><td>G-12-HS</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HS - HaSharon</td><td>H-11-HS</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>HS - HaSharon</td><td>H-12-HS</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>H-10-JN</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>J-09-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>J-10-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>J-11-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>K-09-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>K-10-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>K-11-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>L-09-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>L-10-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>L-11-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>L-12-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>M-10-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>M-11-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JN - Jenin</td><td>M-12-JN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>F-17-JS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>F-18-JS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>F-19-JS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>G-16-JS</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>G-17-JS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>G-18-JS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>G-19-JS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>H-16-JS</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>H-17-JS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>H-18-JS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>H-19-JS</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>J-16-JS</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>J-17-JS</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>J-18-JS</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>K-16-JS</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>K-17-JS</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>JS - Jerusalem</td><td>K-18-JS</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>L-05-KT</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>L-06-KT</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>L-07-KT</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>M-05-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>M-06-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>M-07-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>M-08-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>N-04-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>N-05-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>N-06-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>N-07-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>N-08-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>O-05-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>O-06-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>KT - Kinneret</td><td>O-07-KT</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>F-12-PT</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>F-13-PT</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>F-14-PT</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>F-15-PT</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>G-12-PT</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>G-13-PT</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>G-14-PT</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>G-15-PT</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>H-12-PT</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>H-14-PT</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>PT - Petah Tikva</td><td>H-15-PT</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>G-15-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>G-16-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>G-17-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>H-14-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>H-15-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>H-16-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>H-17-RA</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>J-14-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>J-15-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>J-16-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>J-17-RA</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>K-14-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>K-15-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>K-16-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>K-17-RA</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>L-14-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>L-15-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>L-16-RA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RA - Ramallah</td><td>L-17-RA</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>D-16-RH</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>D-17-RH</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>E-15-RH</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>E-16-RH</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>E-17-RH</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>E-18-RH</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>F-15-RH</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>F-16-RH</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>F-17-RH</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RH - Rehovot</td><td>F-18-RH</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RM - Ramla</td><td>F-15-RM</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RM - Ramla</td><td>F-16-RM</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RM - Ramla</td><td>F-17-RM</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RM - Ramla</td><td>G-15-RM</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RM - Ramla</td><td>G-16-RM</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RM - Ramla</td><td>G-17-RM</td><td><a href="/iarc/Content/holyland/dh17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RM - Ramla</td><td>H-15-RM</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>RM - Ramla</td><td>H-16-RM</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>J-11-SM</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>J-12-SM</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>J-13-SM</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>K-11-SM</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>K-12-SM</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>K-13-SM</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>K-14-SM</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>L-12-SM</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>L-13-SM</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>SM - Shechem</td><td>L-14-SM</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TA -Tel Aviv</td><td>E-13-TA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TA -Tel Aviv</td><td>E-14-TA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TA -Tel Aviv</td><td>E-15-TA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TA -Tel Aviv</td><td>F-13-TA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TA -Tel Aviv</td><td>F-14-TA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TA -Tel Aviv</td><td>F-15-TA</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>G-12-TK</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>G-13-TK</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>G-14-TK</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>H-10-TK</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>H-11-TK</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>H-12-TK</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>H-13-TK</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>H-14-TK</td><td><a href="/iarc/Content/holyland/dh13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>J-10-TK</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>J-11-TK</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>J-12-TK</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>J-13-TK</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>J-14-TK</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>K-13-TK</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>TK - Tulkarm</td><td>K-14-TK</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-11-YN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-12-YN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-13-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-14-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-15-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-16-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-17-YN</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-19-YN</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-20-YN</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>L-21-YN</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-10-YN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-11-YN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-12-YN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-13-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-14-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-15-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-16-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-17-YN</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-18-YN</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>M-19-YN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>N-11-YN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>N-12-YN</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>N-13-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>N-14-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>N-15-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>N-16-YN</td><td><a href="/iarc/Content/holyland/jn13_16.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>N-17-YN</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YN - Yardan</td><td>N-18-YN</td><td><a href="/iarc/Content/holyland/jn17_21.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>H-07-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>H-08-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>H-09-YZ</td><td><a href="/iarc/Content/holyland/fh9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>J-06-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>J-07-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>J-08-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>J-09-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>K-06-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>K-07-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>K-08-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>K-09-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>L-06-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>L-07-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>L-08-YZ</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>L-09-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>L-10-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>M-08-YZ</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>M-09-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>M-10-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>M-11-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>N-08-YZ</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>N-09-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>N-10-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>YZ - Yizre\'el</td><td>N-11-YZ</td><td><a href="/iarc/Content/holyland/jn9_12.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>L-03-ZF</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>L-04-ZF</td><td><a href="/iarc/Content/holyland/hl1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>L-05-ZF</td><td><a href="/iarc/Content/holyland/gl5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>M-02-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>M-03-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>M-04-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>M-05-ZF</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>N-01-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>N-02-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>N-03-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>N-04-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>N-05-ZF</td><td><a href="/iarc/Content/holyland/mq5_8.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>O-01-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>O-02-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n                    <tr><td>ZF - Zefat</td><td>O-03-ZF</td><td><a href="/iarc/Content/holyland/mq1_4.jpg" target="_blank"><img src="/iarc/assets/img/map_grid.png" alt="map_grid" height="24px" /></a></td></tr>\r\n\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/holyland/logupload.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n\r\n        <h2>Holyland Contest - Log Upload</h2>\r\n        <!--<h5>Please enter your email, select the category, add the log file and send</h5>-->\r\n        <div class="alert alert-danger alert-dismissable">\r\n            <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button> Please send logs to 4z4kxx@gmail.com\r\n        </div>\r\n        <hr />\r\n        <div id="registration-form" class="form-horizontal" data-parsley-validate style="visibility:visible">\r\n\r\n            <!--<div class="form-group ">\r\n            <div class="col-md-2">\r\n                <label for="email" class="col-md-2 control-label ">Email</label>\r\n            </div>\r\n            <div class="col-md-4">\r\n                <input type="email" class="form-control" id="email" placeholder="Email" data-bind="value: email" tabindex="5" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n\r\n            <div class="col-md-2">\r\n                <label for="category" class="col-md-2 control-label ">Category</label>\r\n            </div>\r\n            <div class="col-md-4">\r\n                <select class="selectpicker" id="category" data-bind="options: categories, value: category, optionsCaption: \'Category\'" required></select>\r\n            </div>\r\n        </div>-->\r\n            <div>\r\n                <div class="col-md-1">\r\n                    <button id="ClearBtn" type="button" class="btn btn-default" data-bind="click: Clear">Clear</button>\r\n                </div>\r\n                <div class="col-md-2">\r\n                    <input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="Select File">\r\n                </div>\r\n                <div class="col-md-8"><span data-bind="text: file"></span></div>\r\n                <div class="col-md-1">\r\n                    <button id="SendBtn" type="button" class="btn btn-success" data-bind="command: Send">Send</button>\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n        <div class="content-box">\r\n            <div class="clear">\r\n                <!--<input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר תמונה">-->\r\n                <!--<span style="padding-left: 5px; vertical-align: middle;"><i>PNG, JPG, or GIF (500K max file size)</i></span>-->\r\n                <div id="errormsg" class="clearfix redtext">\r\n                </div>\r\n                <div id="pic-progress-wrap" class="progress-wrap" style="margin-top: 10px; margin-bottom: 10px;">\r\n                </div>\r\n\r\n                <div id="picbox" class="clear" style="padding-top: 0px; padding-bottom: 10px;">\r\n                </div>\r\n\r\n            </div>\r\n        </div>\r\n        <br />\r\n        <br />\r\n        <br />\r\n        <h2>Holyland Cabrillo Format</h2>\r\n        <br />\r\n        <h4>START-OF-LOG: version-number X.X</h4>\r\n        Must be the first line of the log submission.<br />\r\n        Must be version 3.0<br />\r\n        <br />\r\n        <h4>CALLSIGN: callsign</h4>\r\n        The callsign used during the contest.<br />\r\n        <br />\r\n        <h4>\r\n            CONTEST: contest-name\r\n        </h4>\r\n        The contest-name must be HOLYLAND<br />\r\n        <br />\r\n        <h4>\r\n            CATEGORY-OPERATOR: text\r\n        </h4>\r\n        The category-operator must be one of the following:<br />\r\n        SINGLE-OP<br />\r\n        MULTI-OP<br />\r\n        SWL<br />\r\n        CHECKLOG<br />\r\n        <br />\r\n        <h4>\r\n            CATEGORY-MODE: text\r\n        </h4>\r\n        The category-mode must be one of the following:<br />\r\n        MIX<br />\r\n        CW<br />\r\n        SSB<br />\r\n        FT8<br />\r\n        DIGI<br />\r\n        QRP<br />\r\n        SOB<br />\r\n        M5<br />\r\n        M10<br />\r\n        POR<br />\r\n        MOP<br />\r\n        MM<br />\r\n        MMP<br />\r\n        4Z9<br />\r\n        SHA<br />\r\n        SWL<br />\r\n        NEW<br />\r\n        <br />\r\n        <h4>\r\n            CATEGORY-POWER: text\r\n        </h4>\r\n        The category-power must be one of the following:<br />\r\n        HIGH<br />\r\n        LOW<br />\r\n        QRP<br />\r\n        <br />\r\n        <h4>\r\n            CREATED-BY: text \r\n        </h4>\r\n        Name and version of the logging program used to create the Cabrillo file. (This field is optional)<br />\r\n        <br />\r\n        <h4>\r\n            EMAIL: text\r\n        </h4>\r\n        A place to put an email address where we can contact you if there is a question about your log. (This field is optional)<br />\r\n        <br />\r\n        <h4>\r\n            NAME: text \r\n        </h4>\r\n        Your name.<br />\r\n        <br />\r\n        <h4>\r\n            OPERATORS: callsign1, [callsign2, callsign3...]\r\n        </h4>\r\n        A space-delimited list of operator callsigns for multi operator stations<br />\r\n        NOTE: If you select a multi-operator category and do not enter operator callsigns in this field, the robot will reject your log. Please use a comma between the operator calls.<br />\r\n        <br />\r\n        <h4>QSO: qso-data</h4>\r\n        The qso-data format is shown below.<br />\r\n        <table cellpadding="5" cellspacing="3">\r\n            <tr>\r\n                <td colspan="5">&nbsp;</td>\r\n                <td colspan="3">-----Data Sent-----</td>\r\n                <td colspan="3">-----Data Rcvd-----</td>\r\n            </tr>\r\n            <tr>\r\n                <td>QSO:</td>\r\n                <td>freq</td>\r\n                <td>mo</td>\r\n                <td>date</td>\r\n                <td>time</td>\r\n                <td>my call</td>\r\n                <td>rst</td>\r\n                <td>exch</td>\r\n                <td>dx call</td>\r\n                <td>rst</td>\r\n                <td>exch</td>\r\n            </tr>\r\n            <tr>\r\n                <td>QSO:</td>\r\n                <td>14240</td>\r\n                <td>PH</td>\r\n                <td>2000-11-26</td>\r\n                <td>0711</td>\r\n                <td>N6TW</td>\r\n                <td>59</td>\r\n                <td>03</td>\r\n                <td>4Z5SL</td>\r\n                <td>59</td>\r\n                <td>K01YZ</td>\r\n            </tr>\r\n        </table>\r\n        <br />\r\n        <h4>END-OF-LOG:</h4>\r\n        Must be the last line of the log submission.<br />\r\n        <br />\r\n\r\n        <p>\r\n            <h4>EXAMPLE:</h4>\r\n            START-OF-LOG: 3.0<br />\r\n            CALLSIGN: 4Z5SL<br />\r\n            CONTEST: HOLYLAND<br />\r\n            CATEGORY-OPERATOR: SINGLE-OP<br />\r\n            CATEGORY-MODE: SSB<br />\r\n            CATEGORY-POWER: HIGH<br />\r\n            CREATED-BY: Exported by LOGic version 9.0.72. LOGic Cabrillo Export version 1.2.<br />\r\n            E-MAIL: 4Z5SL@IARC.ORG<br />\r\n            NAME: Dan Katzman<br />\r\n            OPERATORS: 4Z5SL<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2203\t4Z5SL\t59\tK01YZ\tUW1GR\t     59     1<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2204\t4Z5SL\t59\tK01YZ\tRK4HYT\t     59     7<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2204\t4Z5SL\t59\tK01YZ\tIK6XEJ\t     59     11<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2205\t4Z5SL\t59\tK01YZ\tHG7T\t     59     6<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2206\t4Z5SL\t59\tK01YZ\tSM7DQV   59     14<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2208\t4Z5SL\t59\tK01YZ\tYL2BR\t     59     11<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2210\t4Z5SL\t59\tK01YZ\tOK2FI\t     59     15<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2211\t4Z5SL\t59\tK01YZ\tDM5AT\t     59     8<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2211\t4Z5SL\t59\tK01YZ\tOM7AB\t     59     19<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2212\t4Z5SL\t59\tK01YZ\tLY9Y\t     59     2<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2213\t4Z5SL\t59\tK01YZ\tSV2KLJ \t     59     1<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2215\t4Z5SL\t59\tK01YZ\t4Z1KD\t     59     N02ZF<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2218\t4Z5SL\t59\tK01YZ\tSP5IVC\t     59     18<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2218\t4Z5SL\t59\tK01YZ\tRZ3Z\t     59     12<br />\r\n            END-OF-LOG:<br />\r\n        </p>\r\n    </div>\r\n</div>\r\n';});


define('text!views/holyland/logupload2.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy text-left" style="direction: ltr">\r\n\r\n        <h2>Holyland Contest - Log Upload</h2>\r\n        <!--<h5>Please enter your email, select the category, add the log file and send</h5>-->\r\n        <div class="alert alert-danger alert-dismissable">\r\n            <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button> Please send logs to 4z4kxx@gmail.com\r\n        </div>\r\n        <hr />\r\n        <div id="registration-form" class="form-horizontal" data-parsley-validate style="visibility:visible">\r\n\r\n            <!--<div class="form-group ">\r\n                <div class="col-md-2">\r\n                    <label for="email" class="col-md-2 control-label ">Email</label>\r\n                </div>\r\n                <div class="col-md-4">\r\n                    <input type="email" class="form-control" id="email" placeholder="Email" data-bind="value: email" tabindex="5" data-parsley-errors-messages-disabled required>\r\n                </div>\r\n\r\n                <div class="col-md-2">\r\n                    <label for="category" class="col-md-2 control-label ">Category</label>\r\n                </div>\r\n                <div class="col-md-4">\r\n                    <select class="selectpicker" id="category" data-bind="options: categories, value: category, optionsCaption: \'Category\'" required></select>\r\n                </div>\r\n            </div>-->\r\n            <div>\r\n                <div class="col-md-1">\r\n                    <button id="ClearBtn" type="button" class="btn btn-default" data-bind="click: Clear">Clear</button>\r\n                </div>\r\n                <div class="col-md-2">\r\n                    <input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="Select File">\r\n                </div>\r\n                <div class="col-md-8"><span data-bind="text: file"></span></div>\r\n                <div class="col-md-1">\r\n                    <button id="SendBtn" type="button" class="btn btn-success" data-bind="command: Send">Send</button>\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n        <div class="content-box">\r\n            <div class="clear">\r\n                <!--<input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר תמונה">-->\r\n                <!--<span style="padding-left: 5px; vertical-align: middle;"><i>PNG, JPG, or GIF (500K max file size)</i></span>-->\r\n                <div id="errormsg" class="clearfix redtext">\r\n                </div>\r\n                <div id="pic-progress-wrap" class="progress-wrap" style="margin-top: 10px; margin-bottom: 10px;">\r\n                </div>\r\n\r\n                <div id="picbox" class="clear" style="padding-top: 0px; padding-bottom: 10px;">\r\n                </div>\r\n\r\n            </div>\r\n        </div>\r\n        <br />\r\n        <br />\r\n        <br />\r\n        <h2>Holyland Cabrillo Format</h2>\r\n        <br />\r\n        <h4>START-OF-LOG: version-number X.X</h4>\r\n        Must be the first line of the log submission.<br />\r\n        Must be version 3.0<br />\r\n        <br />\r\n        <h4>CALLSIGN: callsign</h4>\r\n        The callsign used during the contest.<br />\r\n        <br />\r\n        <h4>\r\n            CONTEST: contest-name\r\n        </h4>\r\n        The contest-name must be HOLYLAND<br />\r\n        <br />\r\n        <h4>\r\n            CATEGORY-OPERATOR: text\r\n        </h4>\r\n        The category-operator must be one of the following:<br />\r\n        SINGLE-OP<br />\r\n        MULTI-OP<br />\r\n        SWL<br />\r\n        CHECKLOG<br />\r\n        <br />\r\n        <h4>\r\n            CATEGORY-MODE: text\r\n        </h4>\r\n        The category-mode must be one of the following:<br />\r\n        SSB<br />\r\n        CW<br />\r\n        DIGI<br />\r\n        MIXED<br />\r\n        <br />\r\n        <h4>\r\n            CATEGORY-POWER: text\r\n        </h4>\r\n        The category-power must be one of the following:<br />\r\n        HIGH<br />\r\n        QRP<br />\r\n        <br />\r\n        <h4>\r\n            CREATED-BY: text \r\n        </h4>\r\n        Name and version of the logging program used to create the Cabrillo file. (This field is optional)<br />\r\n        <br />\r\n        <h4>\r\n            EMAIL: text\r\n        </h4>\r\n        A place to put an email address where we can contact you if there is a question about your log. (This field is optional)<br />\r\n        <br />\r\n        <h4>\r\n            NAME: text \r\n        </h4>\r\n        Your name.<br />\r\n        <br />\r\n        <h4>\r\n            OPERATORS: callsign1, [callsign2, callsign3...]\r\n        </h4>\r\n        A space-delimited list of operator callsigns for multi operator stations<br />\r\n        NOTE: If you select a multi-operator category and do not enter operator callsigns in this field, the robot will reject your log. Please use a comma between the operator calls.<br />\r\n        <br />\r\n        <h4>QSO: qso-data</h4>\r\n        The qso-data format is shown below.<br />\r\n        <table cellpadding="5" cellspacing="3">\r\n            <tr>\r\n                <td colspan="5">&nbsp;</td>\r\n                <td colspan="3">-----Data Sent-----</td>\r\n                <td colspan="3">-----Data Rcvd-----</td>\r\n            </tr>\r\n            <tr>\r\n                <td>QSO:</td>\r\n                <td>freq</td>\r\n                <td>mo</td>\r\n                <td>date</td>\r\n                <td>time</td>\r\n                <td>my call</td>\r\n                <td>rst</td>\r\n                <td>exch</td>\r\n                <td>dx call</td>\r\n                <td>rst</td>\r\n                <td>exch</td>\r\n            </tr>\r\n            <tr>\r\n                <td>QSO:</td>\r\n                <td>14240</td>\r\n                <td>PH</td>\r\n                <td>2000-11-26</td>\r\n                <td>0711</td>\r\n                <td>N6TW</td>\r\n                <td>59</td>\r\n                <td>03</td>\r\n                <td>4Z5SL</td>\r\n                <td>59</td>\r\n                <td>K01YZ</td>\r\n            </tr>\r\n        </table>\r\n        <br />\r\n        <h4>END-OF-LOG:</h4>\r\n        Must be the last line of the log submission.<br />\r\n        <br />\r\n        \r\n        <p>\r\n            <h4>EXAMPLE:</h4>\r\n            START-OF-LOG: 3.0<br />\r\n            CALLSIGN: 4Z5SL<br />\r\n            CONTEST: HOLYLAND<br />\r\n            CATEGORY-OPERATOR: SINGLE-OP<br />\r\n            CATEGORY-MODE: SSB<br />\r\n            CATEGORY-POWER: HIGH<br />\r\n            CREATED-BY: Exported by LOGic version 9.0.72. LOGic Cabrillo Export version 1.2.<br />\r\n            E-MAIL: 4Z5SL@IARC.ORG<br />\r\n            NAME: Dan Katzman<br />\r\n            OPERATORS: 4Z5SL<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2203\t4Z5SL\t59\tK01YZ\tUW1GR\t     59     1<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2204\t4Z5SL\t59\tK01YZ\tRK4HYT\t     59     7<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2204\t4Z5SL\t59\tK01YZ\tIK6XEJ\t     59     11<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2205\t4Z5SL\t59\tK01YZ\tHG7T\t     59     6<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2206\t4Z5SL\t59\tK01YZ\tSM7DQV   59     14<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2208\t4Z5SL\t59\tK01YZ\tYL2BR\t     59     11<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2210\t4Z5SL\t59\tK01YZ\tOK2FI\t     59     15<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2211\t4Z5SL\t59\tK01YZ\tDM5AT\t     59     8<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2211\t4Z5SL\t59\tK01YZ\tOM7AB\t     59     19<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2212\t4Z5SL\t59\tK01YZ\tLY9Y\t     59     2<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2213\t4Z5SL\t59\tK01YZ\tSV2KLJ \t     59     1<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2215\t4Z5SL\t59\tK01YZ\t4Z1KD\t     59     N02ZF<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2218\t4Z5SL\t59\tK01YZ\tSP5IVC\t     59     18<br />\r\n            QSO:  7162\tPH\t2015-04-17\t2218\t4Z5SL\t59\tK01YZ\tRZ3Z\t     59     12<br />\r\n            END-OF-LOG:<br />\r\n        </p>\r\n    </div>\r\n</div>\r\n';});


define('text!views/holyland/old_logupload.html',[],function () { return '<div class="container" style="background-color: #f5fbff">\r\n    <h2>תחרות הולילנד - טעינת לוג</h2>\r\n    <h5>יש להכניס את כתובת האימייל שלכם, לבחור את הקטגוריה, את הקובץ ולבסוף ללחוץ על שלח. בהצלחה!</h5>\r\n    <hr />\r\n    <div id="registration-form" class="form-horizontal" data-parsley-validate>\r\n\r\n        <div class="form-group text-right">\r\n            <div class="col-md-6"></div>\r\n            <div class="col-md-4">\r\n                <input type="email" class="form-control" id="email" placeholder="אימייל" data-bind="value: email" tabindex="5" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            \r\n                <label for="email" class="col-md-2 control-label text-right">אימייל</label>\r\n            \r\n        </div>\r\n\r\n        <div class="form-group text-right">\r\n            <div class="col-md-6"></div>\r\n            <div class="col-md-4">\r\n                <select class="selectpicker" id="category" data-bind="options: categories, value: category, optionsCaption: \'בחר קטגוריה\'" required>\r\n                </select>\r\n            </div>\r\n            \r\n                <label for="category" class="col-md-2 control-label text-right">קטגוריה</label>\r\n            \r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-6"></div>\r\n            <div class="col-md-4 text-right"><span data-bind="text: file"></span></div>\r\n            <div class="col-md-2">\r\n                <input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר קובץ">\r\n            </div>\r\n        </div>    \r\n        <div class="form-group">\r\n            <div class="col-md-1">\r\n                <button type="button" class="btn btn-success pull-left" data-bind="command: Send">שלח</button>\r\n            </div>\r\n            <div class="col-md-9"></div>\r\n            <div class="col-md-2">\r\n                <button id="SendBtn" type="button" class="btn btn-default" data-bind="click: Clear">נקה</button>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n\r\n\r\n    <div class="content-box">\r\n        <div class="clear">\r\n            <!--<input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר תמונה">-->\r\n            <!--<span style="padding-left: 5px; vertical-align: middle;"><i>PNG, JPG, or GIF (500K max file size)</i></span>-->\r\n            <div id="errormsg" class="clearfix redtext">\r\n            </div>\r\n            <div id="pic-progress-wrap" class="progress-wrap" style="margin-top: 10px; margin-bottom: 10px;">\r\n            </div>\r\n\r\n            <div id="picbox" class="clear" style="padding-top: 0px; padding-bottom: 10px;">\r\n            </div>\r\n\r\n        </div>\r\n    </div>\r\n\r\n</div>\r\n\r\n';});


define('text!views/import.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy">\r\n\r\n        <h4>תהליך יבוא ציוד תקשורת לחובבי רדיו</h4>\r\n        <p>\r\n            במסמך זה נסקור את הפעולות השונות שעליך לבצע על מנת לרכוש בחו"ל מכשיר הדורש אישור יבוא ולשחרר אותו מהמכס בארץ.\r\n        </p>\r\n        <hr />\r\n        <p>\r\n            כידוע ישנן בחו"ל חנויות רבות המוכרות ציוד לחובבי רדיו אשר ניתן לרכוש בהן את הציוד דרך האינטרנט.\r\n        </p>\r\n        <p>נביא כאן דוגמאות לכמה חנויות וזאת מבלי שבכוונתנו לבצע כאן פרסום או המלצה</p>\r\n        <ul>\r\n            <li><a href="http://www.aesham.com/" target="_blank">www.aesham.com</a></li>\r\n            <li><a href="http://www.gigaparts.com/" target="_blank">www.gigaparts.com</a></li>\r\n            <li><a href="http://www.hamradio.com/" target="_blank">www.hamradio.com</a></li>\r\n            <li><a href="http://www.randl.com/shop/catalog/" target="_blank">www.randl.com/shop/catalog</a></li>\r\n            <li><a href="http://www.universal-radio.com/" target="_blank">www.universal-radio.com</a></li>\r\n            <li><a href="https://www.wimo.com/main_e.html" target="_blank">www.wimo.com/main_e.html</a></li>\r\n        </ul>\r\n\r\n        <p>באופן עקרוני, המכס לא מאפשר לאזרח להביא ציוד תקשורת לשידור וקליטה במידה ואין לו אישור יבוא.\r\n         את אישור היבוא ניתן לקבל ממשרד התקשורת.<br />\r\n         משרד התקשורת ייתן לאזרח לייבא משדר/מקלט לתחומי חובבי הרדיו במידה ומתקיימים שני תנאים:</p>\r\n        <ol>\r\n            <li>האזרח הינו חובב רדיו ברישיון משרד התקשורת.</li>\r\n            <li>הציוד שהוא מביא מוגדר על פי המפרט הטכני שלו כציוד לחובבי רדיו.</li>\r\n        </ol>\r\n\r\n        <p>סדר הפעולות המומלץ לצורך ביצוע תהליך הקניה, קבלת האישור, היבוא והשחרור מהמכס הוא כלהלן:</p>\r\n        <ol>\r\n            <li>בחר את המכשיר שברצונך לקנות לאחר שבדקת והגעת למסקנה כי הוא מתאים לך.</li>\r\n            <li>הורד מהאינטרנט את המפרט הטכני של המכשיר. הדבר הכרחי בכדי שתוכל לשלוח אותו למשרד התקשורת.</li>\r\n            <li>קבל מהאתר של החנות הצעת מחיר ושמור אותה כקובץ במחשב שלך.</li>\r\n            <li>\r\n                את הבקשה לשחרור המכשיר שלך מהמכס אתה אמור להגיש דרך אתר משרד התקשורת. הקישור לעמוד שממנו יש להתחיל הוא הקישור הבא:\r\n                <a href="https://www.gov.il/he/service/approval_of_wireless_equipment_imported" target="_blank">https://www.gov.il/he/service/approval_of_wireless_equipment_imported</a><br />\r\n            </li>\r\n            <li>בחלקו התחתון של דף זה ישנו קישור לקובץ בשם:<br />\r\n                נספח ו\' –בקשה לשחרור חד פעמי מהמכס...<br />\r\n                שאת/ה צריכ/ה ממנו רק את דף מספר 2 שכותרתו:<br />\r\n                "הצהרה בדבר החובה לקבל אישור מקמ"ט תקשורת...."<br />\r\n                עליך למלא את הדף הזה  בלבד, לסרוק אותו ולשמור אותו במחשב להמשך התהליך.<br />\r\n            </li>\r\n            <li>\r\n                כעת עליך ללחוץ על לחצן הנראה כך<br />\r\n                <img class="img-responsive" src="assets/img/pages/import/btn1.png" alt="">\r\n                הדף שתגיע אליו יראה כך:<br />\r\n                <img class="img-responsive" src="assets/img/pages/import/import_page.png" alt="">\r\n                זהו הדף הראשון מבין שישה דפים בהם תעבור.<br />\r\n                בדף מס 1 יש לבחור כפי שניתן לראות בדוגמא למעלה:<br />\r\n                יבואן פרטי, אישור מיוחד, יבוא אישי<br />\r\n                בדף מס 2 יש למלא את כל הפרטים כולל כתובת הדואר האלקטרוני שלך (שאליו ישלח לך מידע על סטטוס הבקשה שלך)<br />\r\n                בדף מספר 3 יש למלא את פרטי הציוד. יש למלא שדה פרט מכס על פי ההסבר המופיע תחת סימן השאלה שלידו.<br />\r\n                יש להתעלם משדה "קוד הנחה"<br />\r\n                בשדה תחום תדרים יש לבחור אופציה "תדרי חובבי רדיו"<br />\r\n                את שאר השדות יש למלא על פי המידע שיש בידך על המכשיר שקנית.<br />\r\n                בדף מספר 4 יש לצרף את המסמכים הסרוקים והם: המפרט הטכני של המכשיר, הצהרה בדבר החובה לקבל אישוק מקמ"ט (הכנת אותה בסעיף 4 של מסמך זה), חשבונית, שטר מטען (ההודעה שתקבל מהמכס מספקת)<br />\r\n                בדף מספר 5 סמן בהתאם<br />\r\n                בדף מספר 6 יש למלא בהתאם ואז ללחוץ על לחץ שלח<br />\r\n                המערכת תעבד את המידע ששלחת ותשלח אליך מייל המאשר קבלת הפניה וכן מספר בן 5 ספרות. מספר זה הינו "מספר מסלול"<br />\r\n            </li>\r\n            <li>יש לשלוח מייל ובו מספר המסלול אל מיכאל לופט או אל מארק שטרן להמשך טיפול<br />\r\n            מיכאל לופט <a href="mailto:michaell@moc.gov.il">michaell@moc.gov.il</a> 03-5198296    \r\n            מארק שטרן <a href="mailto:sternm@moc.gov.il">sternm@moc.gov.il</a> 03-5198173\r\n            </li>\r\n            <li>לאחר שהמידע ששלחת ייבדק, תקבל במייל תוך כמה ימים אישר יבוא. אישור זה בנוסף למסמכים אותם תתבקש על ידי המכס לספק, הם המסמכים שיאפשרו לך לקבל לידך את המכשיר.</li>\r\n        </ol>\r\n        <p>\r\n            בילוי נעים<br />\r\n            רשם: דני קצמן 4Z5SL\r\n        </p>\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>';});


define('text!views/market.html',[],function () { return '<div class="container">\r\n    <div class="headline">\r\n        <h2>מרכולית</h2>\r\n    </div>\r\n    <p>זה המקום לפרסם ציוד למכירה ולמסירה או לחפש ציוד שאתם זקוקים לו.\r\n    <br />לכל חבר יש לשונית "מרכולית" ב<a href="http://www.iarc.org/pa/" target="_blank">איזור האישי</a> ושם ניתן לנהל את המודעות.</p>\r\n    <hr />\r\n    <div class="clients-page">\r\n        <div data-bind="foreach: items">\r\n            <div class="col-md-12">\r\n                <span class="icon" data-bind="css: { \'icon-usd\': type == \'1\', \'icon-shopping-cart\': type == \'2\', \'icon-gift\': type == \'3\' }"></span>\r\n                <div>\r\n                    <span data-bind="html: moment(date_added).format(\'DD-MM-YYYY\')"></span>&nbsp;<span class="label label-default" data-bind="    html: uniq"></span>,&nbsp;<span data-bind="    html: name_heb"></span>&nbsp;<span data-bind="    html: family_heb"></span>,&nbsp;<span data-bind="    html: email"></span>&nbsp;<i class="icon-envelope-alt"></i>&nbsp;<span data-bind="    html: cel"></span>&nbsp;<i class="icon-phone-sign"></i>&nbsp;<span data-bind="    html: call"></span>&nbsp;\r\n                    <div data-bind="html: text">\r\n                    </div>\r\n                    <div>\r\n                        <span data-bind="visible: type == \'1\'">מחיר:<span data-bind="    html: price"></span></span>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n            <div class="margin-bottom-20"></div>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});


define('text!views/media.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy text-center">\r\n        <img class="img-responsive text-center" src="assets/img/under_contruction.jpg" alt="">\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/membership.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy">\r\n        <h4>חברות באגודה</h4>\r\n        <p>\r\n            רשאי להיות חבר אגודה כל חובב רדיו מעל גיל 17 המגיש בקשה להתקבל לאגודה.\r\n            בנוסף, ועדת חברים יכולה לאשר קבלה לאגודה במעמד של ידיד אגודה. ידיד אגודה יכול להיות מי שלא מלאו לו 17 שנה, או שאינו אזרח מדינת ישראל, או מועדון חובבי רדיו, או תאגיד. לידידי האגודה רוב הזכויות של חברי האגודה, למעט הזכות לבחור ולהיבחר למוסדות האגודה.\r\n            ע"מ להרשם לאגודה, צור קשר <a href="#Contact">כאן</a>, או בדוא"ל <a href="mailto:membership@iarc.org">membership@iarc.org</a> או באמצעות <a href="#Register" target="_blank">טופס ההצטרפות</a>.<br />\r\n            החברות באגודה מתוארת ומוגדרת בתקנון האגודה.\r\n        </p>\r\n        <ul>\r\n            <li><a href="././Content/docs/IARC_Policy_2008.pdf" target="_blank">תקנון האגודה</a></li>\r\n        </ul>\r\n        <hr />\r\n        <h4>דמי חבר עבור תושבי ישראל</h4>\r\n        <label>דמי החבר ישמשו למימון שירותי האגודה אשר ניתנים לחבריה.</label>\r\n        <label>דמי החבר נגבים על בסיס קלנדארי [ המסתיימת בכל 31.12 ] ולתשלומם בתחילת כל שנת פעילות חשיבות מכרעת לצורך תכנון תקציב הפעילות השנתית.</label>\r\n\r\n        <ul>\r\n            <li>250 ש"ח לאדם לחידוש חברות עד 28.2 לשנה הקלנדארית (המסתיימת ב- 31.12 )</li>\r\n            <li>300 ₪ החל מ 1.3  לשנת הפעילות המסתיימת ב 31.12.</li>\r\n        </ul>\r\n        <p>תחנות מועדון ומשפחות:</p>\r\n        <ul>\r\n            <li>300  ש"ח למועדונים ולמשפחות באותה כתובת לחידוש חברות עד 28.2 לשנה הקלנדארית (המסתיימת ב 31.12 )</li>\r\n            <li>350 ₪ החל מ 1.3  לשנת הפעילות המסתיימת ב 31.12</li>\r\n        </ul>\r\n        <p>נוער וחיילים:</p>\r\n        <ul>\r\n            <li>150 ש"ח עבור נוער וחיילים לחידוש חברות עד 28.2 לשנה הקלנדארית (המסתיימת ב 31.12 ) </li>\r\n            <li>200 ₪ החל מ 1.3  לשנת הפעילות המסתיימת ב 31.12</li>\r\n        </ul>\r\n\r\n        <p>חובבים חדשים שיצטרפו לאגודה החל מיום 1.10 לשנת הפעילות הקלנדארית (המסתיימת ב 31.12 )  יזכו לחברות מלאה גם לשנת הפעילות הקלנדארית העוקבת במסגרת התשלום שנעשה.</p>\r\n\r\n        <label>ניתן לשלם את דמי החבר במספר אופנים:</label>\r\n        <ol>\r\n            <li>\r\n                בכרטיס אשראי יש להשתמש בקישור הבא:  <a href="https://courses.iarc.org/product/%D7%AA%D7%A9%D7%9C%D7%95%D7%9D-%D7%93%D7%9E%D7%99-%D7%97%D7%91%D7%A8/" target="_blank">דף תשלום דמי חבר</a>\r\n            </li>\r\n            <li>\r\n                לתשלום באפליקציה PAYBOX : יש להשתמש בקישור הבא:<br />\r\n                <a href="https://payboxapp.page.link/NfSJCpuQZf6VELdM8" target="_blank">https://payboxapp.page.link/NfSJCpuQZf6VELdM8</a><br />\r\n                יש לשלם כאורח - לא צריך להתקין אפליקציה!<br />\r\n                למלא את הפרטים הנדרשים כולל אות קריאה\r\n            </li>\r\n            <li>פנים אל פנים עם הגזבר בפגישה במשרדי האגודה: רחוב אלפרט 3 יהוד, או במפגש שהאגודה מקיימת מפעם לפעם.</li>\r\n            <li>המחאה בדואר (לא בדואר רשום) אל משרדי האגודה לכתובת:    אגודת חובבי הרדיו בישראל (ע"ר) ת.ד. 17600 תל אביב מיקוד 6117501<br />יש להקפיד לרשום על גב ההמחאה את אות הקריאה של החובב!</li>\r\n            <li>\r\n                העברה בנקאית אל חשבון האגודה:<br />\r\n                במידה ובחרתם בהעברה בנקאית יש להקפיד לרשום בפרטים גם את אות הקריאה של החובב על מנת להקל על ניהול הרישום והקישור בין הסכום שהועבר לבין החובב המשלם.<br />\r\n                <div class="tag-box tag-box-v2">\r\n                    פרטי החשבון:<br />\r\n                    אגודת חובבי הרדיו בישראל,<br />\r\n                    בנק לאומי (10),<br />\r\n                    מס\' חשבון 02986919,<br />\r\n                    סניף תל גנים 988,<br />\r\n                    גבעתיים, ישראל.<br />\r\n                    (IBAN) מספר זה"ב:<br />\r\n                    IL50 0109 8800 0000 2986 919\r\n                </div>\r\n            </li>\r\n        </ol>\r\n        <hr />\r\n        <h4>דמי חבר עבור תושבי חוץ</h4>\r\n        <p>\r\n            דמי חבר עבור תושבים זרים: 100 דולר ארה"ב לשלוש שנים\r\n        </p>\r\n    </div>\r\n    <!--/row-fluid-->\r\n</div>\r\n';});


define('text!views/news.html',[],function () { return '<div class="container">\r\n    <div class="container blog-page blog-item">\r\n        <div data-bind="compose: \'viewmodels/components/news\'"></div>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/onairhagal.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy margin-bottom-20">\r\n\r\n        <h4>הגל המשודר</h4>\r\n        <p>\r\n            כל חובב ומאזין מוזמנים בזאת להאזין (ולהשתתף במידת האפשר) בגל המשודר.<br />\r\n            הגל המשודר הינה "תוכנית" רדיו המשודרת מדי יום שלישי בשעה 19:30 על ממסר ת"א (R7), ע"י חובבי רדיו ובשביל חובבי הרדיו.\r\n        </p>\r\n        <hr />\r\n        <p>בגל המשודר מופיעות הפינות הבאות:</p>\r\n        <ul>\r\n            <li>עורך הגל המשודר, רמי, 4X6HU, מציג את עצמו, את הגל ומציין את התאריך</li>\r\n            <li>החובבים המאזינים מציגים עצמם ע"י הודאת אותות הקריאה</li>\r\n            <li>הודעות חדשות כלליות מאת עורך הגל המשודר, או מטעם נציג האגודה</li>\r\n            <li>הודעות, ברכות ואיחולים מטעם החובבים המאזינים</li>\r\n            <li>מרכולית - קונים, מוכרים</li>\r\n        </ul>\r\n        <p>\r\n            לאחר כניסת החובבים, ולאורך כל התוכנית, עורך הגל המשודר שוזר הודעות נוספות המעניינות חובבים בארץ.\r\n        </p>\r\n        <hr />\r\n        <h4>ארכיון הגל המשודר</h4>\r\n        ארכיון הגל המשודר מכיל הקלטות של התוכנית לאורך השנים והן מובאות כאן כקבצי MP3 להאזנה ישירה<br />\r\n        תודה לריץ\' 4X1DA ולאבינועם 4X6HF על ההקלטות\r\n    </div>\r\n    <!--/row-fluid-->\r\n    <div class="row">\r\n         <div class="col-md-12">\r\n        <div class="panel panel-grey margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">ארכיון הגל המשודר</h4>\r\n            </div>\r\n           <table class="table table-striped table-hover">\r\n                <thead>\r\n                    <tr>\r\n                        <th class="text-right" style="width: 30px">#</th>\r\n                        <th class="text-right">תאריך</th>\r\n                        <th class="text-right"></th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody data-bind="foreach: files">\r\n                    <tr>\r\n                        <td data-bind="text: $index() + 1"></td>\r\n                        <td data-bind="text: date"></td>\r\n                        <td><a data-bind="attr: { \'href\': url }" target="_blank"><i class="glyphicon glyphicon-headphones"></i> לחץ להאזנה</a></td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n    </div>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/onlinecourse.html',[],function () { return '\r\n    \r\nאגודת חובבי הרדיו בישראל מקיימת קורס מתוקשב ללימוד החומר הנדרש עבור המבחנים בכתב, להוצאת רישיון חובבי רדיו. הקורס מאפשר ללמוד את החומר בקצב אישי ללא הגבלת זמן. החומר הנלמד הינו בתחום נהלי קשר ובתחומים טכניים שונים, (חשמל, אלקטרוניקה, אנטנות וכו\') הכל על פי דרישות הסילבוס של משרד התקשורת.<br />\r\n<br />\r\nכמו כן האגודה מקיימת הרצאה פרונטלית לקראת המבחן.<br />\r\nספר שמומלץ לצורך לימוד החומר הוא הספר הבא:\r\n\r\n<div class="row">\r\n    <div class="col-md-9">\r\n        <p>\r\n            <h4>יסודות האלקטרוניקה והתקשורת לחובבים</h4>\r\n            ספר זה מיועד לחובבי רדיו המעוניינים להתכונן<br />\r\n            לבחינות משרד התקשורת לקראת רישיון חובבים<br />\r\n            דרגה ב\' ו- ד\'<br />\r\n            הספר מכיל את הפרקים של הספר הקודם אך<br />\r\n            בהרחבה והעמקה בהתאם לדרישות משרד התקשורת<br />\r\n            ( 328 עמודים בהוצאת האוניברסיטה הפתוחה)\r\n        </p>\r\n    </div>\r\n    <div class="col-md-3">\r\n        <img class="img-responsive" src="assets/img/pages/course/ham_basics_book.png" alt="ספר הקורס המתוקשב">\r\n    </div>\r\n</div>\r\n<p>\r\n    כדי להשיג את הספר יש ליצור קשר עם דני קצמן במייל <a href="mailto:dankatzman1954@gmail.com">dankatzman1954@gmail.com</a><br />\r\n    <br />\r\n    הקורס ניתן כמתנה כל מי שמצטרף לאגודת חובבי הרדיו ומשלם דמי חבר.<br />\r\n    עלות דמי החבר בהתאם למה שמופיע בקישור הבא : <a href="https://www.iarc.org/iarc/#Membership">https://www.iarc.org/iarc/#Membership</a> <br />\r\n    לאחר ביצוע התשלום יש למלא פרטים אישיים בהמשך דף זה, לצרף את אישור התשלום ותמונה ולשלוח (לחיצה על "שלח" בתחתית הדף).<br />\r\n\r\n    <br />\r\n    כעבור 24 שעות תקבל/י מייל עם פרטי הגישה האישיים שלך לאתר הקורס ותוכל/י להתחיל בלימוד<br />\r\n    במידה ויש לך שאלה כל שהיא אפשר לכתוב אל דני קצמן <a href="mailto:dankatzman1954@gmail.com">dankatzman1954@gmail.com</a><br />\r\n    לסיכום יש:<br />\r\n\r\n    <ol>\r\n        <li><h5>לבצע העברה כספית</h5></li>\r\n        <li><h5>לשמור במחשב אישור העברה</h5></li>\r\n        <li><h5>להכין במחשב קובץ תמונת פספורט</h5></li>\r\n        <li><h5>למלא פרטים בהמשך הדף</h5></li>\r\n        <li><h5>לצרף אישור העברה ותמונה וללחוץ <span style="font-weight:bold">שלח</span></h5></li>\r\n    </ol>\r\n    <h5>בהצלחה</h5>\r\n</p>\r\n\r\n<div class="container" style="background-color: #f5fbff; margin-top:20px">\r\n    <h2>טופס הצטרפות \\ הרשמה לקורס המתוקשב</h2>\r\n    <hr />\r\n    <div id="registration-form" class="form-horizontal" data-parsley-validate>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="lastname" placeholder="שם משפחה" data-bind="value: lastname" tabindex="2" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="lastname" class="col-md-2 control-label">שם משפחה</label>\r\n\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="firstname" placeholder="שם פרטי" data-bind="value: firstname" tabindex="1" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="firstname" class="col-md-2 control-label">שם פרטי</label>\r\n        </div>\r\n\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="elastname" placeholder="שם משפחה באנגלית" data-bind="value: elastname" tabindex="4" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="elastname" class="col-md-2 control-label">שם משפחה באנגלית</label>\r\n\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="efirstname" placeholder="שם פרטי באנגלית" data-bind="value: efirstname" tabindex="3" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="efirstname" class="col-md-2 control-label">שם פרטי באנגלית</label>\r\n        </div>\r\n\r\n        <div class="form-group">\r\n            <div class="col-md-6"></div>\r\n            <div class="col-md-4">\r\n                <input type="email" class="form-control" id="email" placeholder="אימייל" data-bind="value: email" tabindex="5" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="inputEmail1" class="col-md-2 control-label">אימייל</label>\r\n        </div>\r\n\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="id" placeholder="תעודת זהות" data-bind="value: id" tabindex="9" data-parsley-errors-messages-disabled data-parsley-type="digits" required data-toggle="tooltip" data-trigger="focus" title="הכנס את מספר תעודת הזהות שלך - ספרות בלבד">\r\n            </div>\r\n            <label for="id" class="col-md-2 control-label">תעודת זהות</label>\r\n\r\n            <!--<div class="col-md-2">\r\n                <div class="dropdown">\r\n                    <button class="btn btn-default dropdown-toggle" type="button" id="menu1" data-toggle="dropdown">\r\n                        Day\r\n                        <span class="caret"></span>\r\n                    </button>\r\n                    <ul class="dropdown-menu" role="menu" aria-labelledby="menu1">\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">1</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">2</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">3</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">4</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">5</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">6</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">7</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">8</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">9</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">10</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">11</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">12</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">13</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">14</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">15</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">16</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">17</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">18</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">19</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">20</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">21</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">22</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">23</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">24</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">25</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">26</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">27</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">28</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">29</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">30</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">31</a></li>\r\n                    </ul>\r\n                </div>\r\n            </div>\r\n            <div class="col-md-2">\r\n                <div class="dropdown">\r\n                    <button class="btn btn-default dropdown-toggle" type="button" id="menu1" data-toggle="dropdown">\r\n                        Month\r\n                        <span class="caret"></span>\r\n                    </button>\r\n                    <ul class="dropdown-menu" role="menu" aria-labelledby="menu1">\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">1</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">2</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">3</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">4</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">5</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">6</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">7</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">8</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">9</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">10</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">11</a></li>\r\n                        <li role="presentation"><a role="menuitem" tabindex="-1" href="">12</a></li>\r\n                    </ul>\r\n                </div>\r\n            </div>-->\r\n                \r\n            <div class="col-md-4">\r\n                <div class="input-group date" id="birthdate" data-date-format="DD-MM-YYYY" tabindex="8">\r\n                    <span class="input-group-addon">\r\n                        <span class="icon icon-time"></span>\r\n                    </span>\r\n                    <input type="text" class="form-control" data-bind="value: birthdate" data-parsley-errors-messages-disabled required />\r\n                </div>\r\n            </div>\r\n            <label for="birthdate" class="col-md-2 control-label">תאריך לידה</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <label class="radio radio-inline">\r\n                    <input type="radio" name="flavorGroup" value="m" data-bind="checked: gender" />\r\n                    זכר\r\n                </label>\r\n                <label class="radio radio-inline">\r\n                    <input type="radio" name="flavorGroup" value="f" data-bind="checked: gender" />\r\n                    נקבה\r\n                </label>\r\n            </div>\r\n            <label for="gender" class="col-md-2 control-label">מין</label>\r\n\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="country" placeholder="אזרחות" data-bind="value: country" tabindex="10" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="country" class="col-md-2 control-label">אזרחות</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="address" placeholder="כתובת" data-bind="value: address" tabindex="13" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="address" class="col-md-2 control-label">כתובת</label>\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="city" placeholder="עיר" data-bind="value: city" tabindex="12" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="city" class="col-md-2 control-label">עיר</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="zip" placeholder="מיקוד" data-bind="value: zip" tabindex="15" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="zip" class="col-md-2 control-label">מיקוד</label>\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="house" placeholder="דירה" data-bind="value: house" tabindex="14">\r\n            </div>\r\n            <label for="house" class="col-md-2 control-label">דירה</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="mobile" placeholder="נייד" data-bind="value: mobile" tabindex="17" data-parsley-errors-messages-disabled data-parsley-type="digits" data-toggle="tooltip" data-trigger="focus" title="הכנס את מספר הטלפון הנייד שלך - ספרות בלבד">\r\n            </div>\r\n            <label for="mobile" class="col-md-2 control-label">נייד</label>\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="phone" placeholder="טלפון" data-bind="value: phone" tabindex="16" data-parsley-errors-messages-disabled data-parsley-type="digits" data-toggle="tooltip" data-trigger="focus" title="הכנס את מספר הטלפון שלך - ספרות בלבד">\r\n            </div>\r\n            <label for="phone" class="col-md-2 control-label">טלפון</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-10">\r\n                <textarea class="form-control" id="reason" placeholder="נא לרשום כאן סיבות להגשת הבקשה" data-bind="value: reason" tabindex="18" style="resize: none"></textarea>\r\n            </div>\r\n            <label for="reason" class="col-md-2 control-label">סיבת הבקשה</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-10">\r\n                <textarea class="form-control" id="cv" placeholder="נא לרשום כאן קורות חיים" data-bind="value: cv" tabindex="19" style="resize: none"></textarea>\r\n            </div>\r\n            <label for="cv" class="col-md-2 control-label">קורות חיים בקצרה</label>\r\n        </div>\r\n        <!--<div class="form-group">\r\n            <div class="col-md-1">\r\n                <button type="button" class="btn btn-success pull-left" data-bind="command: Send">שלח</button>\r\n            </div>\r\n            <div class="col-md-2">\r\n                <input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר תמונה">\r\n            </div>\r\n            <div class="col-md-2 text-left"><span data-bind="text: file"></span></div>\r\n            <div class="col-md-2">\r\n                <input type="button" id="payment-btn" class="btn btn-primary btn-large clearfix" value="צרף אישור תשלום">\r\n            </div>\r\n            <div class="col-md-2 text-left"><span data-bind="text: paymentfile"></span></div>\r\n            <div class="col-md-2">\r\n                <button id="SendBtn" type="button" class="btn btn-default" data-bind="click: Clear">נקה</button>\r\n            </div>\r\n        </div>-->\r\n        <div class="row">\r\n            <div class="col-md-1">\r\n                <button type="button" class="btn btn-success pull-left" data-bind="command: Send">שלח</button>\r\n            </div>\r\n            <div class="col-md-2">\r\n                <input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר תמונה">\r\n            </div>\r\n            <div class="col-md-2 text-left"><span data-bind="text: file"></span></div>\r\n            <div class="col-md-4">\r\n                <input type="button" id="payment-btn" class="btn btn-primary btn-large clearfix" value="צרף אישור תשלום">או שלח צ\'ק לפי הנחיה טלפונית\r\n            </div>\r\n            <div class="col-md-2 text-left"><span data-bind="text: paymentfile"></span></div>\r\n            <div class="col-md-2">\r\n                <button id="SendBtn" type="button" class="btn btn-default" data-bind="click: Clear">נקה</button>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n\r\n\r\n    <div class="content-box">\r\n        <div class="clear">\r\n            <!--<input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר תמונה">-->\r\n            <!--<span style="padding-left: 5px; vertical-align: middle;"><i>PNG, JPG, or GIF (500K max file size)</i></span>-->\r\n            <div id="errormsg" class="clearfix redtext">\r\n            </div>\r\n            <div id="pic-progress-wrap" class="progress-wrap" style="margin-top: 10px; margin-bottom: 10px;">\r\n            </div>\r\n            <div id="payment-progress-wrap" class="progress-wrap" style="margin-top: 10px; margin-bottom: 10px;">\r\n            </div>\r\n\r\n            <div id="picbox" class="clear" style="padding-top: 0px; padding-bottom: 10px;">\r\n            </div>\r\n\r\n        </div>\r\n    </div>\r\n\r\n</div>\r\n\r\n';});


define('text!views/pa.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy">\r\n\r\n        <h4>האיזור האישי</h4>\r\n        <p>\r\n            לחברים שלום,<br />\r\n            לאגודה אתר וכן דף פייסבוק אבל אילו לא קשורים ישירות לניהול בסיס הנתונים האישי של החובב החבר. לצורך ניהול בסיס הנתונים האישי של החבר, המזכיר מקיים מאגר של האגודה שיושב על שרת האגודה.<br /><br />\r\n            לכל חבר באגודה הוקצה בשרת איזור אישי משלו כשהשדה המוביל הוא אות הקריאה. מטרת האזור האישי לאפשר לחובב שירות אינטראקטיבי ובכלל זה עדכון פרטים אישיים יזום על ידי החובב ואפשרות לקריאה ואף הורדה של הגל במהדורה האלקטרונית.<br />\r\n            בכניסה מקבלים מסך שמבקש זיהוי (זהו אות הקריאה כפי שרשום באגודה) וכן מתבקשים למלא סיסמא שאותה המזכיר מנפיק לאור פניה אליו והיא ראשונית והחובב יכול לשנותה. אם הסיסמא נשכחה המזכיר יכול לאפס לסיסמא זמנית חדשה אבל לא לשחזר.<br /><br />\r\n            לסיכום - כדי להכנס לאזור האישי:<br />\r\n            לחץ על הקישור: <a href="/pa2" target="_blank">איזור אישי</a><br />\r\n            שם המשתמש - הוא האות קריאה.<br />\r\n            הסיסמא - היא הסיסמא שבחר החבר להשתמש אחרי ששינה את הסיסמא הזמנית שקיבל.<br /><br />\r\n            בהצלחה,<br />\r\n            מזכיר האגודה.<br />\r\n        </p>\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/procedures.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy">\r\n\r\n        <h3>נהלי האגודה</h3>\r\n\r\n        <div class="panel-group acc-v1 margin-bottom-40" id="accordion">\r\n            <div class="panel panel-default">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">\r\n                        <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseOne">\r\n                            נציג האגודה לתערוכה בגרמניה\r\n                        </a>\r\n                    </h4>\r\n                </div>\r\n                <div id="collapseOne" class="panel-collapse collapse in">\r\n                    <div class="panel-body">\r\n                        <a href="https://www.iarc.org/iarc/Content/docs/procedures/representative_to_germany.pdf" target="_blank">קובץ נהלים עבור נציג האגודה לתערוכה בגרמניה</a>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/protocols.html',[],function () { return '<div class="container">\r\n    <div class="col-md-6">\r\n        <div class="panel panel-red margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">פרוטוקולי אסיפות שנתיות</h4>\r\n            </div>\r\n            <table class="table table-striped table-hover">\r\n                <thead>\r\n                    <tr>\r\n                        <th class="text-right" style="width: 30px">#</th>\r\n                        <th class="text-right">תאריך</th>\r\n                        <th class="text-right"></th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody data-bind="foreach: annual">\r\n                    <tr>\r\n                        <td data-bind="text: $index()+1"></td>\r\n                        <td data-bind="text: date"></td>\r\n                        <td><a data-bind="attr: { \'href\': url }" target="_blank"><i class="icon-download"></i> הורד קובץ</a></td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n        <div class="panel panel-yellow margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">דוחות כספיים (מילולי)</h4>\r\n            </div>\r\n            <table class="table table-striped table-hover">\r\n                <thead>\r\n                    <tr>\r\n                        <th class="text-right" style="width: 30px">#</th>\r\n                        <th class="text-right">תאריך</th>\r\n                        <th class="text-right"></th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody data-bind="foreach: finance">\r\n                    <tr>\r\n                        <td data-bind="text: $index() + 1"></td>\r\n                        <td data-bind="text: date"></td>\r\n                        <td><a data-bind="attr: { \'href\': url }" target="_blank"><i class="icon-download"></i> הורד קובץ</a></td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n    </div>\r\n    <div class="col-md-6">\r\n        <div class="panel panel-green margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">פרוטוקולי ישיבות ועד</h4>\r\n            </div>\r\n            <table class="table table-striped table-hover">\r\n                <thead>\r\n                    <tr>\r\n                        <th class="text-right" style="width: 30px">#</th>\r\n                        <th class="text-right">תאריך</th>\r\n                        <th class="text-right"></th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody data-bind="foreach: protocol">\r\n                    <tr>\r\n                        <td data-bind="text: $index()+1"></td>\r\n                        <td data-bind="text: date"></td>\r\n                        <td><a data-bind="attr: { \'href\': url }" target="_blank"><i class="icon-download"></i> הורד קובץ</a></td>\r\n                    </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});


define('text!views/qsl.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy">\r\n\r\n        <h4>לשכת QSL (כרטיסי קשר)</h4>\r\n        <p>\r\n            <label>אגודת חובבי הרדיו בישראל (ע"ר) מספקת את לשכות ה QSL הבאות:</label>\r\n        </p>\r\n\r\n        <h3>QSLים נכנסים</h3>\r\n        <div class="tag-box tag-box-v2">\r\n            <p>\r\n                קותי שטסל (4X6OM)<br />\r\n                שבט מנשה 46<br />\r\n                הרצליה 46684<br />\r\n            </p>\r\n        </div>\r\n\r\n        <h3>QSLים יוצאים</h3>\r\n        <div class="tag-box tag-box-v2">\r\n            <p>\r\n                יצחק רידר (4Z5TT)<br />\r\n                דוד אלעזר 19/19<br />\r\n                באר-שבע, 84509<br />\r\n            </p>\r\n        </div>\r\n\r\n        <ul>\r\n            <li>רצוי שהכרטיס לא יהיה גדול יותר מגלויה סטנדרטית.</li>\r\n            <li>יש לעשות מיון לפי אותות קריאה (לפי הפרסום ב-IARU QSL Bureaus).</li>\r\n            <li>נא לא לשלוח כרטיסים של מדינות שאין להן קשר עמנו או שהמשרד שלהן סגור, לפי הרשימה הבאה:</li>\r\n        </ul>\r\n\r\n        <div class="panel-grey col-md-4 pull-right">\r\n            <table class="table table-striped">\r\n                <thead>\r\n                    <tr>\r\n                        <th style="text-align: right; background-color: #cccccc">מדינה</th>\r\n                        <th style="text-align: right; background-color: #cccccc">קידומת</th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody>\r\n                    <tr>\r\n                        <td>Afghanistan</td>\r\n                        <td>YA</td>\r\n\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Agalega, Mauritius, Rodrigues\r\n                        </td>\r\n                        <td>3B\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Albania\r\n                        </td>\r\n                        <td>ZA\r\n                        </td>\r\n\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Angola\r\n                        </td>\r\n                        <td>D2\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Anguilla\r\n                        </td>\r\n                        <td>VP2E\r\n                        </td>\r\n\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Ascension\r\n                        </td>\r\n                        <td>ZD8\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Azerbaijan\r\n                        </td>\r\n                        <td>4J\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Bahamas\r\n                        </td>\r\n                        <td>C6\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Baker & Howland Islands\r\n                        </td>\r\n                        <td>KH1\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Belize\r\n                        </td>\r\n                        <td>V3\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Benin\r\n                        </td>\r\n                        <td>TY\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Bhutan\r\n                        </td>\r\n                        <td>A5\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Burundi\r\n                        </td>\r\n                        <td>9U\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Cambodia</td>\r\n                        <td>XU\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Cameroon\r\n                        </td>\r\n                        <td>TJ\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Cape Verde\r\n                        </td>\r\n                        <td>D4\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Central African Republic\r\n                        </td>\r\n                        <td>TL\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Chad\r\n                        </td>\r\n                        <td>TT\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Congo\r\n                        </td>\r\n                        <td>TN\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Cote d\'Ivoire\r\n                        </td>\r\n                        <td>TU\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Desecheo Island\r\n                        </td>\r\n                        <td>KP1\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Egypt\r\n                        </td>\r\n                        <td>Su\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Equatorial Guinea\r\n                        </td>\r\n                        <td>3C0\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Eritrea\r\n                        </td>\r\n                        <td>E3\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Gambia\r\n                        </td>\r\n                        <td>C5\r\n                        </td>\r\n                    </tr>\r\n                    \r\n                    \r\n                </tbody>\r\n            </table>\r\n        </div>\r\n        <div class="panel-grey col-md-4 pull-right">\r\n            <table class="table table-striped">\r\n                <thead>\r\n                    <tr>\r\n                        <th style="text-align: right; background-color: #cccccc">מדינה</th>\r\n                        <th style="text-align: right; background-color: #cccccc">קידומת</th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody>\r\n                    <tr>\r\n                        <td>Guantanamo Bay\r\n                        </td>\r\n                        <td>KG4\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Guinea\r\n                        </td>\r\n                        <td>3X\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Guinea-Bissau\r\n                        </td>\r\n                        <td>J5\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Haiti\r\n                        </td>\r\n                        <td>HH\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Kiribati\r\n                        </td>\r\n                        <td>T3\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Kure Island\r\n                        </td>\r\n                        <td>KH7K\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Laos\r\n                        </td>\r\n                        <td>XW\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Lesotho\r\n                        </td>\r\n                        <td>7P\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Lybia\r\n                        </td>\r\n                        <td>5A\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Madagascar\r\n                        </td>\r\n                        <td>5R\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Malawi\r\n                        </td>\r\n                        <td>7Q\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Maldives\r\n                        </td>\r\n                        <td>8Q\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Mariana Island\r\n                        </td>\r\n                        <td>KH0\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Marshall Islands\r\n                        </td>\r\n                        <td>V7\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Mauritania\r\n                        </td>\r\n                        <td>5T\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Micronesia\r\n                        </td>\r\n                        <td>V6\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Midway Island\r\n                        </td>\r\n                        <td>KH4\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Montserrat\r\n                        </td>\r\n                        <td>VP2M\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Morocco\r\n                        </td>\r\n                        <td>CN\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Myanmar\r\n                        </td>\r\n                        <td>XZ\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Nauru\r\n                        </td>\r\n                        <td>C2\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Nepal\r\n                        </td>\r\n                        <td>9N\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Niger\r\n                        </td>\r\n                        <td>5U\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>North & South Cook Islands\r\n                        </td>\r\n                        <td>E5\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>North Korea\r\n                        </td>\r\n                        <td>P5\r\n                        </td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Pagalu Island\r\n                        </td>\r\n                        <td>3C0\r\n                        </td>\r\n                    </tr>\r\n\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n        <div class="panel-grey col-md-4 pull-right">\r\n            <table class="table table-striped">\r\n                <thead>\r\n                    <tr>\r\n                        <th style="text-align: right; background-color: #cccccc">מדינה</th>\r\n                        <th style="text-align: right; background-color: #cccccc">קידומת</th>\r\n                    </tr>\r\n                </thead>\r\n                <tbody>\r\n                    <tr>\r\n                        <td>Palau</td>\r\n                        <td>T8</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Palmyra & Jarvis Islands</td>\r\n                        <td>KH5</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Papua New Guinea</td>\r\n                        <td>P2</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Rwanda</td>\r\n                        <td>9X</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Sao Tome & Principe</td>\r\n                        <td>S9</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Seychelles</td>\r\n                        <td>S7</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Sierra Leone</td>\r\n                        <td>9L</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Somalia</td>\r\n                        <td>T5</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>St Helena</td>\r\n                        <td>ZD7</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>St. Kitts & Nevis</td>\r\n                        <td>V4</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>St. Vincent</td>\r\n                        <td>J8</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Sudan</td>\r\n                        <td>ST</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Suriname</td>\r\n                        <td>PZ</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Swaziland</td>\r\n                        <td>3DA</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Timor-Leste</td>\r\n                        <td>4W</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Togo</td>\r\n                        <td>5V</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Tonga</td>\r\n                        <td>A3</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Tristan da Cunha</td>\r\n                        <td>ZD9</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Tuvalu</td>\r\n                        <td>T2</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>United Arab Emirates</td>\r\n                        <td>A6</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Vatican</td>\r\n                        <td>HV</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Vietnam</td>\r\n                        <td>3W</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Wake Island</td>\r\n                        <td>KH9</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Western Sahara</td>\r\n                        <td>S0</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Yemen</td>\r\n                        <td>7O</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>Zimbabwe</td>\r\n                        <td>Z2</td>\r\n                    </tr>\r\n\r\n\r\n\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n        <p>\r\n            מומלץ לכל שולחי הכרטיסים שיבדקו ב- \r\n                    <a href="http://www.qrz.com" target="_blank">QRZ.com</a>\r\n            אם אין אפשרות לשלוח לאלה שאין להם משרד דרך Manager אחר ולציין זאת על גבי הכרטיס.\r\n        </p>\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/register.html',[],function () { return '<div class="container" style="background-color: #f5fbff">\r\n    <h2>טופס בקשה להצטרף כחבר באגודת חובבי הרדיו בישראל (ע"ר)</h2>\r\n    <h5>\r\n        אנחנו שמחים על החלטתך להצטרף לאגודת חובבי הרדיו בישראל.<br />\r\n        לאחר תשלום דמי החבר, יש למלא את הפרטים בטופס ולצרף קובץ PDF או צילום בכל פורמט מקובל של שובר התשלום ותמונה עדכנית.<br />\r\n        לאחר אישור  על ידי וועדת החברים יושלם הליך הקבלה לחברות באגודה.\r\n    </h5>\r\n    <h5>דמי החבר עבור תושבי ישראל הינם: 250 ש"ח לאדם, 300 ש"ח עבור משפחות ותחנות מועדון, 150 ש"ח עבור נוער וחיילים</h5>\r\n    <h5>לנרשמים לקורס המקוון - עלות הקורס כוללת בתוכה דמי חברות והיא על פי מה שנמסר מרכז ההדרכה</h5>\r\n    <div class="tag-box tag-box-v2">\r\n        פרטי החשבון:<br />\r\n        אגודת חובבי הרדיו בישראל,<br />\r\n        בנק לאומי (10),<br />\r\n        מס\' חשבון 02986919,<br />\r\n        סניף תל גנים 988,<br />\r\n        גבעתיים, ישראל.\r\n    </div>\r\n    <hr />\r\n    <div id="registration-form" class="form-horizontal" data-parsley-validate>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="lastname" placeholder="שם משפחה" data-bind="value: lastname" tabindex="2" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="lastname" class="col-md-2 control-label">שם משפחה</label>\r\n\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="firstname" placeholder="שם פרטי" data-bind="value: firstname" tabindex="1" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="firstname" class="col-md-2 control-label">שם פרטי</label>\r\n        </div>\r\n        \r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="elastname" placeholder="שם משפחה באנגלית" data-bind="value: elastname" tabindex="4" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="elastname" class="col-md-2 control-label">שם משפחה באנגלית</label>\r\n\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="efirstname" placeholder="שם פרטי באנגלית" data-bind="value: efirstname" tabindex="3" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="efirstname" class="col-md-2 control-label">שם פרטי באנגלית</label>\r\n        </div>\r\n\r\n        <div class="form-group">\r\n            <div class="col-md-6"></div>\r\n            <div class="col-md-4">\r\n                <input type="email" class="form-control" id="email" placeholder="אימייל" data-bind="value: email" tabindex="5" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="inputEmail1" class="col-md-2 control-label">אימייל</label>\r\n        </div>\r\n\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="callsign" placeholder="אות קריאה (אם קיים)" style="text-transform: uppercase" data-bind="value: callsign" tabindex="7">\r\n            </div>\r\n            <label for="callsign" class="col-md-2 control-label">אות קריאה (אם קיים)</label>\r\n\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="licensenum" placeholder="מספר רשיון (אם קיים)" data-bind="value: licensenum" data-parsley-type="digits" tabindex="6" data-toggle="tooltip" data-trigger="focus" title="הכנס את מספר הרישיון שלך - ספרות בלבד">\r\n            </div>\r\n            <label for="licensenum" class="col-md-2 control-label">מספר רשיון (אם קיים)</label>\r\n        </div>\r\n\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="id" placeholder="תעודת זהות" data-bind="value: id" tabindex="9" data-parsley-errors-messages-disabled data-parsley-type="digits" required data-toggle="tooltip" data-trigger="focus" title="הכנס את מספר תעודת הזהות שלך - ספרות בלבד">\r\n            </div>\r\n            <label for="id" class="col-md-2 control-label">תעודת זהות</label>\r\n\r\n            <div class="col-md-4">\r\n                <div class="input-group date" id="birthdate" data-date-format="DD-MM-YYYY" tabindex="8">\r\n                    <span class="input-group-addon"><span class="icon icon-time"></span>\r\n                    </span>\r\n                    <input type="text" class="form-control" data-bind="value: birthdate" data-parsley-errors-messages-disabled required />\r\n                </div>\r\n            </div>\r\n            <label for="birthdate" class="col-md-2 control-label">תאריך לידה</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <label class="radio radio-inline">\r\n                    <input type="radio" name="flavorGroup" value="m" data-bind="checked: gender" />\r\n                    זכר\r\n                </label>\r\n                <label class="radio radio-inline">\r\n                    <input type="radio" name="flavorGroup" value="f" data-bind="checked: gender" />\r\n                    נקבה</label>\r\n            </div>\r\n            <label for="gender" class="col-md-2 control-label">מין</label>\r\n\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="country" placeholder="אזרחות" data-bind="value: country" tabindex="10" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="country" class="col-md-2 control-label">אזרחות</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="address" placeholder="כתובת" data-bind="value: address" tabindex="13" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="address" class="col-md-2 control-label">כתובת</label>\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="city" placeholder="עיר" data-bind="value: city" tabindex="12" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="city" class="col-md-2 control-label">עיר</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="zip" placeholder="מיקוד" data-bind="value: zip" tabindex="15" data-parsley-errors-messages-disabled required>\r\n            </div>\r\n            <label for="zip" class="col-md-2 control-label">מיקוד</label>\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="house" placeholder="דירה" data-bind="value: house" tabindex="14">\r\n            </div>\r\n            <label for="house" class="col-md-2 control-label">דירה</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="mobile" placeholder="נייד" data-bind="value: mobile" tabindex="17" data-parsley-errors-messages-disabled data-parsley-type="digits" data-toggle="tooltip" data-trigger="focus" title="הכנס את מספר הטלפון הנייד שלך - ספרות בלבד">\r\n            </div>\r\n            <label for="mobile" class="col-md-2 control-label">נייד</label>\r\n            <div class="col-md-4">\r\n                <input type="text" class="form-control" id="phone" placeholder="טלפון" data-bind="value: phone" tabindex="16" data-parsley-errors-messages-disabled data-parsley-type="digits" data-toggle="tooltip" data-trigger="focus" title="הכנס את מספר הטלפון שלך - ספרות בלבד">\r\n            </div>\r\n            <label for="phone" class="col-md-2 control-label">טלפון</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-10">\r\n                <textarea class="form-control" id="reason" placeholder="נא לרשום כאן סיבות להגשת הבקשה" data-bind="value: reason" tabindex="18" style="resize: none"></textarea>\r\n            </div>\r\n            <label for="reason" class="col-md-2 control-label">סיבת הבקשה</label>\r\n        </div>\r\n        <div class="form-group">\r\n            <div class="col-md-10">\r\n                <textarea class="form-control" id="cv" placeholder="נא לרשום כאן קורות חיים" data-bind="value: cv" tabindex="19" style="resize: none"></textarea>\r\n            </div>\r\n            <label for="cv" class="col-md-2 control-label">קורות חיים בקצרה</label>\r\n        </div>\r\n        <!--<div class="form-group">\r\n            <div class="col-md-1">\r\n                <button type="button" class="btn btn-success pull-left" data-bind="command: Send">שלח</button>\r\n            </div>\r\n            <div class="col-md-2">\r\n                <input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר תמונה">\r\n            </div>\r\n            <div class="col-md-2 text-left"><span data-bind="text: file"></span></div>\r\n            <div class="col-md-2">\r\n                <input type="button" id="payment-btn" class="btn btn-primary btn-large clearfix" value="צרף אישור תשלום">\r\n            </div>\r\n            <div class="col-md-2 text-left"><span data-bind="text: paymentfile"></span></div>\r\n            <div class="col-md-2">\r\n                <button id="SendBtn" type="button" class="btn btn-default" data-bind="click: Clear">נקה</button>\r\n            </div>\r\n        </div>-->\r\n        <div class="row">\r\n            <div class="col-md-1">\r\n                <button type="button" class="btn btn-success pull-left" data-bind="command: Send">שלח</button>\r\n            </div>\r\n            <div class="col-md-2">\r\n                <input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר תמונה">\r\n            </div>\r\n            <div class="col-md-2 text-left"><span data-bind="text: file"></span></div>\r\n            <div class="col-md-4">\r\n                <input type="button" id="payment-btn" class="btn btn-primary btn-large clearfix" value="צרף אישור תשלום">או שלח צ\'ק לפי הנחיה טלפונית\r\n            </div>\r\n            <div class="col-md-2 text-left"><span data-bind="text: paymentfile"></span></div>\r\n            <div class="col-md-2">\r\n                <button id="SendBtn" type="button" class="btn btn-default" data-bind="click: Clear">נקה</button>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n\r\n\r\n    <div class="content-box">\r\n        <div class="clear">\r\n            <!--<input type="button" id="upload-btn" class="btn btn-primary btn-large clearfix" value="בחר תמונה">-->\r\n            <!--<span style="padding-left: 5px; vertical-align: middle;"><i>PNG, JPG, or GIF (500K max file size)</i></span>-->\r\n            <div id="errormsg" class="clearfix redtext">\r\n            </div>\r\n            <div id="pic-progress-wrap" class="progress-wrap" style="margin-top: 10px; margin-bottom: 10px;">\r\n            </div>\r\n            <div id="payment-progress-wrap" class="progress-wrap" style="margin-top: 10px; margin-bottom: 10px;">\r\n            </div>\r\n\r\n            <div id="picbox" class="clear" style="padding-top: 0px; padding-bottom: 10px;">\r\n            </div>\r\n\r\n        </div>\r\n    </div>\r\n\r\n</div>\r\n\r\n';});


define('text!views/regulations.html',[],function () { return '<div class="container">\r\n\r\n    <div class="row-fluid privacy">\r\n\r\n        <h4>מורה נבוכים</h4>\r\n        <p>\r\n          לצורך הקמת אנטנה והפעלת תחנת חובב רדיו בישראל זקוקים לאישורים מ3 משרדי ממשלה: משרד התקשורת, המשרד להגנת הסביבה והרשות המקומית.\r\n        </p>\r\n        <hr />\r\n        <h4>משרד התקשורת</h4>\r\n        <p>\r\n            מטרת הרשיון היא בעיקר למנוע הפרעות לשאר המשתמשים בגלי האתר. משרד התקשורת מתנה רשיון חובב רדיו בלימוד (ובחינה) של תכונות גלי רדיו, ציוד רדיו ונהלי הפעלה. התקנות כוללות פרקים על מניעת הפרעות לציבור הרחב ונהלים כיצד להתנהג מול חובבים אחרים.\r\n        </p>\r\n        <ul>\r\n            <li><a href="https://www.gov.il/BlobFolder/service/radio-amateurs-certificates/he/RadioAmateur_silabus%20amateur%20radio%20test%20level_a.pdf" target="_blank">סילבוס דרגה א</a></li>\r\n            <li><a href="https://www.gov.il/BlobFolder/service/radio-amateurs-certificates/he/RadioAmateur_silabus%20amateur%20radio%20test%20level_b.pdf" target="_blank">סילבוס דרגה ב</a></li>\r\n            <li><a href="https://www.gov.il/BlobFolder/service/radio-amateurs-certificates/he/RadioAmateur_silabus%20amateur%20radio%20test%20level_c.pdf" target="_blank">סילבוס דרגה ג</a></li>\r\n            <li><a href="https://www.gov.il/he/service/radio-amateurs-certificates" target="_blank">דף חובבי רדיו באתר משהת"ק – מסמכים כלליים להורדה</a></li>           \r\n        </ul>\r\n        <hr />\r\n        <h4>המשרד להגנת הסביבה</h4>\r\n        <p>\r\n            בגלל חוק הקרינה בלתי מייננת, התשס"ו - 2006, המשרד להגנת הסביבה מחייב רישוי לכל משדר מעל הספק מסויים.\r\n            תקנות הקרינה הבלתי מייננת התשס"ט - 2009 מחייבות גם את חובבי הרדיו בישראל. כחובבים מעניקות לנו התקנות מספר הקלות, שהעיקרית בהן היא היעדר הצורך בביצוע בדיקות קרינה יקרות ע"י בודק מוסמך. חובב מבצע בעצמו חישובי הערכת סיכונים שמקורם בחשיפה שלו, משפחתו, שכניו והדיירים הסמוכים לתחנתו, כחלק מהגשת הבקשה.\r\n            להלן מספר הסברים ומדריכים בנושא זה באדיבותם של אהוד 4Z4UR, צחי 4Z1TL, חנן 4Z1DZ ודני 4X1SK.\r\n        </p>\r\n        <ul>\r\n            <li><a href="././Content/docs/non_ionizing_radiation_safety_guide.pdf" target="_blank">מדריך בטיחות שדות אלקטרומגנטיים לחובבי רדיו</a></li>\r\n            <li><a href="././Content/docs/rad_request_form.docx" target="_blank">בקשה לקבלת היתר להקמה והפעלה של מיתקן חובב רדיו</a></li>\r\n            <li><a href="././Content/docs/rad_howto.pdf" target="_blank">הבקשה להיתר הקמה והפעלה – כיצד?</a></li>\r\n            <li><a href="././Content/docs/rad_calc_chart.xls" target="_blank">גליון עזר לחישוב טווח בטיחות והערכת חשיפה לתחנת אלחוט של חובבי רדיו</a></li>\r\n            <!--<li><a href="././Content/docs/rad_manual_april_2011.pdf" target="_blank">מדריך בטיחות קרינה בלתי מייננת לחובבי רדיו</a></li>-->\r\n        </ul>\r\n        <hr />\r\n        <h4>רשות התכנון המקומית</h4>\r\n        <p>\r\n            תפקידה של רשות התכנון המקומית בנושא חובבי הרדיו הוא לעניין מתן היתר בניה לאנטנה. כמו כן, יש הבדל בין אנטנות מסוגים שונים ודין אנטנה עשויה מתיל מתכת אינה כדין כיוונית מסוג יאגי או דומה. באוגוסט 2014 נכנסו לתוקפן תקנות תכנון ובניה המעניקות פטור מהיתר בניה לאנטנה מסוג אנכי בגובה של עד 9 מטר וכן אנטנה מסוג תיל, אך מחייבות בהודעה מתאימה לאחר הקמת האנטנה.<br />\r\n            <a href="././Content/docs/7400.pdf" target="_blank">מאמר הסבר, ינואר 2018</a><br />\r\n        </p>\r\n        <hr />\r\n        \r\n        <h4>עבודה על 60 מטר</h4>\r\n        <p>\r\n            במאי 2013 (ושוב ב 2014) החליט משרד התקשורת לתת אפשרות זמנית למשך שנה לבעלי דרגה א\' ו ב\' שיגישו בקשות פרטניות לשידור נסיוני במספר מצומצם של ערוצים.\r\n        </p>\r\n        <ul>\r\n            <li><a href="././Content/docs/MOC_form_60m.pdf" target="_blank">טופס בקשה לשידור - 60 מטר</a></li>\r\n        </ul>\r\n\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});


define('text!views/repeaters.html',[],function () { return '<style type="text/css">\r\n    .map\r\n    {\r\n        width: 100%;\r\n        height: 800px;\r\n        border-top: solid 1px #eee;\r\n        border-bottom: solid 1px #eee;\r\n    }\r\n\r\n        /* important! bootstrap sets max-width on img to 100% which conflicts with google map canvas*/\r\n        .map img\r\n        {\r\n            max-width: none;\r\n        }\r\n\r\n    .map-box\r\n    {\r\n        height: 750px;\r\n    }\r\n\r\n    .map-box-space\r\n    {\r\n        margin-top: 15px;\r\n    }\r\n\r\n    .map-box-space1\r\n    {\r\n        margin-top: 7px;\r\n    }\r\n</style>\r\n<div class="container">\r\n    <div class="row-fluid privacy">\r\n        <h4>רשת ממסרים ארצית</h4>\r\n        <p>\r\n            בארץ מופעלים ומתוחזקים מספר ממסרים בפריסה ארצית הן ב VHF ו הן ב UHF לנוחיות החובבים בשגרה ולצרכי תקשורת בשעת חירום.\r\n            אחזקת הממסרים מבוצעת באמצעות צוותים של מתנדבים העמלים רבות על תפקודם התקין.\r\n            בין חלק מהממסרים יש קישוריות המשתנה לפי הצורך.\r\n        </p>\r\n        <hr />\r\n    </div>\r\n\r\n    <div class="row-fluid margin-bottom-40">\r\n        <!--<div class="col-md-3">\r\n            <img class="img-responsive" src="assets/img/pages/repeaters/repeaters.jpg" alt="">\r\n        </div>-->\r\n        <div class="col-md-12">\r\n            <span>רב ממסר – חיבור של מספר ממסרים לרשת אחת לצורך כיסוי גאוגרפי רחב</span>\r\n            <div class="panel panel-red margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">ממסרי VHF אנלוגיים</h4>\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: right">ממסר</th>\r\n                            <th style="text-align: right">תדר</th>\r\n                            <th style="text-align: right">שיפט</th>\r\n                            <th style="text-align: right">PL(tx)</th>\r\n                            <th style="text-align: right">PL(rx)</th>\r\n                            <th style="text-align: right">מיקום</th>\r\n                            <th style="text-align: right">הערות</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td>R-0</td>\r\n                            <td>145.600</td>\r\n                            <td>600Khz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>מצפה רמון</td>\r\n                            <td>ממסר דיגיטלי על פי דרישה</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-1</td>\r\n                            <td>145.625</td>\r\n                            <td>600Khz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>ירושלים</td>\r\n                            <td>מחובר לרב ממסר</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-3</td>\r\n                            <td>145.675</td>\r\n                            <td>600Khz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>מגידו</td>\r\n                            <td>מחובר לרב ממסר</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-7</td>\r\n                            <td>145.775</td>\r\n                            <td>600Khz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>תל אביב</td>\r\n                            <td>מחובר לרב ממסר</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-12A</td>\r\n                            <td>144.700</td>\r\n                            <td>600Khz +</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>חיפה</td>\r\n                            <td>מחובר לרב ממסר</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-11.5</td>\r\n                            <td>145.2875</td>\r\n                            <td>600Khz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>באר שבע</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-13</td>\r\n                            <td>145.325</td>\r\n                            <td>600Khz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>יתיר</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-14</td>\r\n                            <td>145.350</td>\r\n                            <td>600Khz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>חרמון</td>\r\n                            <td>ממסר דיגיטלי על פי דרישה</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-15</td>\r\n                            <td>144.775</td>\r\n                            <td>600Khz +</td>\r\n                            <td>91.5</td>\r\n                            <td>114.8</td>\r\n                            <td>גבעתים</td>\r\n                            <td></td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-16</td>\r\n                            <td>145.400</td>\r\n                            <td>600Khz -</td>\r\n                            <td>91.5</td>\r\n                            <td></td>\r\n                            <td>נתניה</td>\r\n                            <td>צפוי לשנות תדר ל 145.425 (R-17)</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-18</td>\r\n                            <td>145.450</td>\r\n                            <td>600Khz -</td>\r\n                            <td>91.5</td>\r\n                            <td></td>\r\n                            <td>קרית אונו</td>\r\n                            <td></td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n\r\n\r\n            <div class="panel panel-blue margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">ממסרי UHF אנלוגיים</h4>\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: right">ממסר</th>\r\n                            <th style="text-align: right">תדר</th>\r\n                            <th style="text-align: right">שיפט</th>\r\n                            <th style="text-align: right">PL(tx)</th>\r\n                            <th style="text-align: right">PL(rx)</th>\r\n                            <th style="text-align: right">מיקום</th>\r\n                            <th style="text-align: right">הערות</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td>R-70</td>\r\n                            <td>438.650</td>\r\n                            <td>7.6Mhz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>תל אביב</td>\r\n                            <td>ברירת מחדל ממסר דיגיטלי</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-71</td>\r\n                            <td>438.675</td>\r\n                            <td>7.6Mhz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>ראש העין</td>\r\n                            <td>ברירת מחדל ממסר דיגיטלי</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td>R-73</td>\r\n                            <td>438.725</td>\r\n                            <td>7.6Mhz -</td>\r\n                            <td>91.5</td>\r\n                            <td>91.5</td>\r\n                            <td>חיפה</td>\r\n                            <td>ברירת מחדל ממסר דיגיטלי</td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n\r\n            <div class="panel panel-black margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">ממסרי VHF דיגיטליים</h4>\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: right">ממסר</th>\r\n                            <th style="text-align: right">תדר קליטה</th>\r\n                            <th style="text-align: right">תדר שידור</th>\r\n                            <th style="text-align: right">Color Code</th>\r\n                            <th style="text-align: right">מיקום</th>\r\n                            <th style="text-align: right">קבוצה ב TS1</th>\r\n                            <th style="text-align: right">קישוריות</th>\r\n                            <th style="text-align: right">הערות</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-0</td>\r\n                            <td>145.600</td>\r\n                            <td>145.000</td>\r\n                            <td>1</td>\r\n                            <td>מצפה רמון</td>\r\n                            <td>דינאמי</td>\r\n                            <td>מחובר לרשת BrandMeister</td>\r\n                            <td>ברירת מחדל – ממסר אנאלוגי</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-12B</td>\r\n                            <td>145.300</td>\r\n                            <td>144.700</td>\r\n                            <td>1</td>\r\n                            <td>אילת (עתידי)</td>\r\n                            <td>425</td>\r\n                            <td>מחובר לרשת BrandMeister</td>\r\n                            <td>ממסר דיגיטלי בלבד TS2 פנוי לכל קבוצה</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-14</td>\r\n                            <td>145.350</td>\r\n                            <td>144.750</td>\r\n                            <td>1</td>\r\n                            <td>חרמון</td>\r\n                            <td>דינאמי</td>\r\n                            <td>מחובר לרשת BrandMeister</td>\r\n                            <td>ברירת מחדל – ממסר אנאלוגי</td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n\r\n            <div class="panel panel-green margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <h4 class="panel-title">ממסרי UHF דיגיטליים</h4>\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: right">ממסר</th>\r\n                            <th style="text-align: right">תדר קליטה</th>\r\n                            <th style="text-align: right">תדר שידור</th>\r\n                            <th style="text-align: right">Color Code</th>\r\n                            <th style="text-align: right">מיקום</th>\r\n                            <th style="text-align: right">קבוצה ב TS1</th>\r\n                            <th style="text-align: right">קישוריות</th>\r\n                            <th style="text-align: right">הערות</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-68 (425101) </td>\r\n                            <td>438.600</td>\r\n                            <td>431.000</td>\r\n                            <td>1</td>\r\n                            <td>ירושלים</td>\r\n                            <td>425</td>\r\n                            <td>מחובר לרשת BrandMeister</td>\r\n                            <td>TS2 פנוי לכל קבוצה</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-68 (425902) </td>\r\n                            <td>438.600</td>\r\n                            <td>431.000</td>\r\n                            <td>1</td>\r\n                            <td>אילת</td>\r\n                            <td>425</td>\r\n                            <td>MMDVM - מחובר לרשת BrandMeister</td>\r\n                            <td>TS2 פנוי לכל קבוצה</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-70 (425201)</td>\r\n                            <td>438.650</td>\r\n                            <td>431.050</td>\r\n                            <td>1</td>\r\n                            <td>תל אביב</td>\r\n                            <td>425</td>\r\n                            <td>מחובר לרשת BrandMeister</td>\r\n                            <td>TS2 פנוי לכל קבוצה</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-71 (425202)</td>\r\n                            <td>438.675</td>\r\n                            <td>431.075</td>\r\n                            <td>1</td>\r\n                            <td>ראש העין</td>\r\n                            <td>425</td>\r\n                            <td>מחובר לרשת BrandMeister</td>\r\n                            <td>TS2 פנוי לכל קבוצה</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-73 (425301)</td>\r\n                            <td>438.725</td>\r\n                            <td>431.125</td>\r\n                            <td>1</td>\r\n                            <td>חיפה</td>\r\n                            <td>425</td>\r\n                            <td>מחובר לרשת BrandMeister</td>\r\n                            <td>TS2 פנוי לכל קבוצה</td>\r\n                        </tr>\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-75 (425401)</td>\r\n                            <td>438.775</td>\r\n                            <td>431.175</td>\r\n                            <td>1</td>\r\n                            <td>באר שבע</td>\r\n                            <td>425</td>\r\n                            <td>MMDVM - מחובר לרשת BrandMeister</td>\r\n                            <td>TS2 פנוי לכל קבוצה</td>\r\n                        </tr>\r\n                        <!--<tr>\r\n                            <td style="direction:ltr; text-align:right">R-76 (425901)</td>\r\n                            <td>438.800</td>\r\n                            <td>431.200</td>\r\n                            <td>1</td>\r\n                            <td>מודיעין</td>\r\n                            <td>425</td>\r\n                            <td>MMDVM - מחובר לרשת BrandMeister</td>\r\n                            <td>TS2 פנוי לכל קבוצה</td>\r\n                        </tr>-->\r\n                        <tr>\r\n                            <td style="direction:ltr; text-align:right">R-78 (425701)</td>\r\n                            <td>438.850</td>\r\n                            <td>431.250</td>\r\n                            <td>1</td>\r\n                            <td>מעלה גלבוע</td>\r\n                            <td>425</td>\r\n                            <td>MMDVM - מחובר לרשת BrandMeister</td>\r\n                            <td>TS2 פנוי לכל קבוצה</td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <u>רשת DMR</u><br />\r\n    שרת BrandMeister בישראל – 4251. כתובתDNS  Brandmeister-il.ddns.net סיסמא: passw0rd<br />\r\n    קבוצה ארצית TG425 צבע:1 סלוט:1. זמינה באופן קבוע על כל הממסרים הדיגיטליים למעט מצפה רמון וחרמון. בממסרים אלו הקבוצה זמינה על פי דרישה. החיבור דינאמי.<br />\r\n    כל קבוצה אחרת: יש לבצע ב סלוט 2 בלבד<br />\r\n    תוכי: Private Call 425997 בחיבור לשרת הישראלי בלבד<br />\r\n    גשר לרשת האנאלוגית:  קבוצה TG42577. נא להתחבר דרך סלוט 2 בלבד<br />\r\n    גישה לרשת הממסרים האנאלוגים בחיבור AllStar :יש להתחבר אל צומת 46737\r\n</div>';});


define('text!views/repeatersmap.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy">\r\n        <h4>רשת ממסרים ארצית</h4>\r\n        <p>\r\n            תודה לבוריס 4Z7AGL\r\n        </p>\r\n        <iframe src="https://www.google.com/maps/d/embed?mid=18jBTU_i1LkwMVRWqwRVDsyoCX2FMHs67" height="800" width="100%"></iframe>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/shell.html',[],function () { return '<!--=== Top ===-->\r\n<div class="top-v1">\r\n    <div class="container">\r\n        <div class="row">\r\n            <div class="col-md-6">\r\n                <ul class="list-unstyled top-v1-contacts text-left">\r\n                    <li><span data-bind="html: \'V\' + version" style="color: #f1f1f1"></span>\r\n                    </li>\r\n                </ul>\r\n            </div>\r\n            <div class="col-md-6">\r\n                <ul class="list-unstyled top-v1-contacts">\r\n                    <li>אגודת חובבי הרדיו בישראל (ע"ר)\r\n                    </li>\r\n                    <li>\r\n                        <i class="icon-envelope"></i>דואל: <a href="mailto:info@iarc.org">info@iarc.org</a>\r\n                    </li>\r\n                    <!--<li>\r\n                        <i class="icon-phone"></i>תמיכה: 054-7828077\r\n                    </li>-->\r\n                </ul>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n<!--/top-v1-->\r\n<!--=== End Top ===-->\r\n\r\n<!--=== Header ===-->\r\n<div class="header margin-bottom-10">\r\n    <div class="navbar navbar-default" role="navigation">\r\n        <div class="container">\r\n            <!-- Brand and toggle get grouped for better mobile display -->\r\n            <!-- <div class="navbar-header">\r\n                <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-responsive-collapse">\r\n                    <span class="sr-only">Toggle navigation</span>\r\n                    <span class="icon-bar"></span>\r\n                    <span class="icon-bar"></span>\r\n                    <span class="icon-bar"></span>\r\n                </button>\r\n                <a class="navbar-brand" href="#">\r\n                    <img id="logo-header" src="assets/img/iarc_logo.gif" alt="Logo" height="50px">\r\n                </a>\r\n            </div> -->\r\n\r\n            <!-- Collect the nav links, forms, and other content for toggling -->\r\n            <div class="_collapse _navbar-collapse _navbar-responsive-collapse">\r\n                <ul class="nav navbar-nav navbar-right">\r\n                    <li data-bind="css: { active: selectedMainMenu() == \'pa\' }">\r\n                        <a href="https://www.iarc.org/silentkey/" target="_blank">אתר הזיכרון</a>\r\n                    </li>\r\n                    <li class="dropdown text-left" data-bind="css: { active: selectedMainMenu() == \'english\' }" style="direction: ltr">\r\n                        <a href="#" class="dropdown-toggle" data-toggle="dropdown" data-hover="dropdown" data-delay="0" data-close-others="false">\r\n                            <img src="././assets/img/english.png" style="margin-top: -5px" />\r\n                            IARC\r\n                            <i class="icon-angle-down"></i>\r\n                        </a>\r\n                        <ul class="dropdown-menu">\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'cept\' }"><a href="#CEPT">CEPT</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'4x4z\' }"><a href="#4X4Z">4X/4Z callsign series</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'4z8\' }"><a href="#4Z8">4Z8 prefix</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'membership\' }"><a href="#EN_Membership">Membership</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'bandplan\' }"><a href="#Bandplan">Israeli Band Plan</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'beacons\' }"><a href="#Beacons">Beacons</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'repeaters\' }"><a href="#EN_Repeaters">Repeaters</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'meetings\' }"><a href="#Meetings">Meeting points</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'skf\' }"><a href="#SilentKeyForest">Silent Key Forest</a></li>\r\n                        </ul>\r\n                    </li>\r\n\r\n                    <li class="dropdown text-left" data-bind="css: { active: selectedMainMenu() == \'holyland\' }" style="direction: ltr">\r\n                        <a href="#" class="dropdown-toggle" data-toggle="dropdown" data-hover="dropdown" data-delay="0" data-close-others="false">\r\n                            Holyland\r\n                            <i class="icon-angle-down"></i>\r\n                        </a>\r\n                        <ul class="dropdown-menu">\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'holylandcontest\' }"><a href="#HolylandContest">Holyland Contest Rules</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'holylandrules\' }"><a href="#HolylandRules">חוקי התחרות לישראלים</a></li>\r\n                            <li class="divider">Online Tools</li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'holysquare\' }"><a href="https://www.iarc.org/holysquare/" target="_blank">Holyland Squares - Online Tool</a></li>\r\n                            <!--<li data-bind="css: { active: selectedSubMenu() == \'HolyTracker\' }"><a href="https://play.google.com/store/apps/details?id=org.gts.holytracker" target="_blank">HolyTracker - Spotting App</a></li>\r\n            <li data-bind="css: { active: selectedSubMenu() == \'LiveMap\' }"><a href="https://iarc.org/squarereg/livemap.html" target="_blank">HolyTracker - Live Map</a></li>-->\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'holylandsquares\' }"><a href="#HolylandSquares">Holyland Squares - Paper Maps</a></li>\r\n                            <li class="divider">Results</li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'holylandresults\' }"><a href="#HolylandResults">Holyland Contest Results</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'holylandresults_isr\' }"><a href="#HolylandResultsISR">Holyland Contest Results - 4X</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'holylandaward\' }"><a href="#HolylandAward">Holyland Award</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'logupload\' }"><a href="#LogUpload">Upload Holyland Contest Log</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'holylandlogs\' }"><a href="#HolylandLogs">Holyland Received Logs</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'certificategenerator\' }"><a href="#Certificategenerator">Holyland Certificate Request</a></li>\r\n\r\n                        </ul>\r\n                    </li>\r\n\r\n                    <li data-bind="css: { active: selectedMainMenu() == \'pa\' }">\r\n                        <a href="#PA">איזור אישי</a>\r\n                    </li>\r\n                    <li data-bind="css: { active: selectedMainMenu() == \'contact\' }">\r\n                        <a href="#Contact">\r\n                            צור קשר\r\n                        </a>\r\n                    </li>\r\n                    <!--<li data-bind="css: { active: selectedMainMenu() == \'news\' }">\r\n        <a href="#News">חדשות\r\n        </a>\r\n    </li>-->\r\n                    <li class="dropdown" data-bind="css: { active: selectedMainMenu() == \'gallery\' }">\r\n                        <a href="#" class="dropdown-toggle">\r\n                            גלריה\r\n                            <i class="icon-angle-down"></i>\r\n                        </a>\r\n                        <ul class="dropdown-menu">\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'videogallery\' }"><a href="#Gallery">גלרית וידאו</a></li>\r\n                            <li><a href="https://plus.google.com/u/0/b/101436536481101172135/photos/101436536481101172135/albums" target="_blank">גלרית Google+</a></li>\r\n                        </ul>\r\n                    </li>\r\n\r\n                    <li class="dropdown" data-bind="css: { active: selectedMainMenu() == \'links\' }">\r\n                        <a href="#" class="dropdown-toggle" data-toggle="dropdown" data-hover="dropdown" data-delay="0" data-close-others="false">\r\n                            קישורים\r\n\r\n                            <i class="icon-angle-down"></i>\r\n                        </a>\r\n                        <ul class="dropdown-menu">\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'lessons\' }"><a href="https://courses.iarc.org/" target="_blank">אתר הקורס המתוקשב</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'become\' }"><a href="https://www.gov.il/he/service/radio-amateurs-certificates" target="_blank">חובבי רדיו - משרד התקשורת</a></li>\r\n                            <!--<li data-bind="css: { active: selectedSubMenu() == \'pages\' }"><a href="http://www.sviva.gov.il/subjectsEnv/Radiation/Communication_Facilities/Radio/Pages/Amature_Radio.aspx" target="_blank">אתר המשרד להגנת הסביבה</a></li>-->\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'iaru\' }"><a href="http://www.iaru.org/region-1.html" target="_blank">אתר IARU</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'itu\' }"><a href="http://www.itu.int" target="_blank">אתר ITU</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'arrl\' }"><a href="http://www.arrl.org/" target="_blank">אתר ARRL</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'rsgb\' }"><a href="http://rsgb.org/" target="_blank">אתר RSGB</a></li>\r\n\r\n</ul>\r\n                    </li>\r\n                    <li class="dropdown" data-bind="css: { active: selectedMainMenu() == \'hagal\' }">\r\n                        <a href="#HagalMain" class="dropdown-toggle">\r\n                            הגל\r\n\r\n                            <i class="icon-angle-down"></i>\r\n                        </a>\r\n                        <ul class="dropdown-menu">\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'hagal\' }"><a href="#Hagal">הגל</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'hagalarchive\' }"><a href="#HagalArchive">ארכיון הגל</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'onairhagal\' }"><a href="#Onairhagal">הגל המשודר</a></li>\r\n                        </ul>\r\n                    </li>\r\n                    <li class="dropdown" data-bind="css: { active: selectedMainMenu() == \'israelham\' }">\r\n                        <a href="#HamInIsrael" class="dropdown-toggle">\r\n                            חובבות רדיו בישראל\r\n\r\n                            <i class="icon-angle-down"></i>\r\n                        </a>\r\n                        <ul class="dropdown-menu">\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'ham\' }"><a href="#Ham">חובבות רדיו</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'regulations\' }"><a href="#Regulations">חוקים ותקנות</a></li>\r\n                            <!--<li data-bind="css: { active: selectedSubMenu() == \'import\' }"><a href="#Import">יבוא ציוד חובבים</a></li>-->\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'import\' }"><a href="https://www.iarc.org/iarc/Content/docs/import.pdf" target="_blank">יבוא ציוד חובבים</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'exams\' }"><a href="#Exams">הרשמה לבחינות</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'examforms\' }"><a href="#ExamForms">טופסי הרשמה לבחינות</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'freq\' }"><a href="#Freq">תדרים</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'repeaters\' }"><a href="#Repeaters">ממסרים</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'repeatersmap\' }"><a href="#RepeatersMap">מפת ממסרים</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'echolink\' }"><a href="#EchoLink">אקולינק</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'emergency\' }"><a href="#Emergency">חובבי רדיו בחירום</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'holyland\' }"><a href="#Holyland">תחרות ארץ הקודש</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'sukotresults\' }"><a href="#SukotResults">תחרות סוכות - תוצאות</a></li>\r\n                            <!--<li data-bind="css: { active: selectedSubMenu() == \'dxpeditions\' }"><a href="#DXpeditions">משלחות</a></li>-->\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'wwff\' }"><a href="http://4xff.iarc.org/" target="_blank">4XFF</a></li>\r\n                        </ul>\r\n                    </li>\r\n                    <li class="dropdown" data-bind="css: { active: selectedMainMenu() == \'aguda\' }">\r\n                        <a href="#Aguda" class="dropdown-toggle">\r\n                            האגודה\r\n\r\n                            <i class="icon-angle-down"></i>\r\n                        </a>\r\n                        <ul class="dropdown-menu">\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'about\' }"><a href="#About">אודות האגודה</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'membership\' }"><a href="#Membership">חברות באגודה</a></li>\r\n                            <!--<li data-bind="css: { active: selectedSubMenu() == \'register\' }"><a href="#Register">טופס הצטרפות</a></li>-->\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'onlinecourse\' }"><a href="#OnlineCourse">הצטרפות \\ הרשמה לקורס המתוקשב</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'eventregistration\' }"><a href="#EventRegistration">הרשמה לאירועים</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'procedures\' }"><a href="#Procedures">נהלים</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'qsl\' }"><a href="#QSL">לשכת QSL</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'directors\' }"><a href="#Directors">בעלי תפקידים</a></li>\r\n                            <!--<li data-bind="css: { active: selectedSubMenu() == \'directors\' }"><a href="https://www.iarc.org/iarc/Content/docs/directors.pdf" target="_blank">בעלי תפקידים</a></li>-->\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'protocols\' }"><a href="#Protocols">פרוטוקולים</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'media\' }"><a href="#Media">כתבו עלינו</a></li>\r\n                            <li data-bind="css: { active: selectedSubMenu() == \'market\' }"><a href="#Market">מרכולית</a></li>\r\n                            <li><a href="http://articles.iarc.org/" target="_blank">דף המאמרים</a></li>\r\n                        </ul>\r\n                    </li>\r\n                    <li data-bind="css: { active: selectedMainMenu() == \'main\' }">\r\n                        <a href="#">\r\n                            דף הבית\r\n                        </a>\r\n                    </li>\r\n                </ul>\r\n            </div>\r\n            <!-- /navbar-collapse -->\r\n        </div>\r\n    </div>\r\n</div>\r\n<!--/header-->\r\n<!--=== End Header ===-->\r\n\r\n<!--=== Content Part ===-->\r\n<div class="container">\r\n\r\n    <!-- Begin Sidebar -->\r\n    <div class="col-md-3 hidden-sm hidden-xs pull-right">\r\n        <!-- Magazine Posts -->\r\n        <div class="row">\r\n            <div class="col-md-12 col-sm-6">\r\n                <h3></h3>\r\n                <div class="text-center">\r\n                    <a href="#">\r\n                        <img src="assets/img/iarc_logo.gif" alt="">\r\n                    </a>\r\n                </div>\r\n            </div>\r\n            \r\n            <div class="magazine-posts col-md-12 col-sm-6">\r\n                <h3>תשלום דמי חבר</h3>\r\n                <div class="magazine-posts-img">\r\n                    <a href="#Membership">\r\n                        <img class="img-responsive" src="assets/img/main/4.jpg" alt="">\r\n                    </a>\r\n                </div>\r\n            </div>\r\n            <div class="magazine-posts col-md-12 col-sm-6">\r\n                <h3>הצטרף לקורס חובבי רדיו</h3>\r\n                <!--<span>7 בינואר עד 9 במרץ</span>-->\r\n                <div class="magazine-posts-img">\r\n                    <a href="https://courses.iarc.org/" target="_blank">\r\n                        <img class="img-responsive" src="assets/img/main/11.jpg" alt="">\r\n                    </a>\r\n                </div>\r\n            </div>\r\n            <div class="magazine-posts col-md-12 col-sm-6">\r\n                <h3 dir="ltr" style="text-align:left">HolyLogger</h3>\r\n                <div class="magazine-posts-img">\r\n                    <a href="https://4z1kd.github.io/HolyLogger/" target="_blank">\r\n                        <img class="img-responsive" src="assets/img/main/HolyLogger.png" alt="">\r\n                    </a>\r\n                </div>\r\n            </div>\r\n            <div class="magazine-posts col-md-12 col-sm-6">\r\n                <h3>מרכולית</h3>\r\n                <div class="magazine-posts-img">\r\n                    <a href="#Market">\r\n                        <img class="img-responsive" src="assets/img/main/10.jpg" alt="">\r\n                    </a>\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <!-- End Magazine Posts -->\r\n\r\n        <!-- Social Icons -->\r\n        <div class="magazine-sb-social margin-bottom-20">\r\n            <div class="headline headline-md">\r\n                <h2>רשתות חברתיות</h2>\r\n            </div>\r\n            <ul class="social-icons social-icons-color">\r\n                <!--<li><a href="#" data-original-title="Feed" class="social_rss"></a></li>-->\r\n                <li><a href="https://www.facebook.com/groups/353267071379649/" target="_blank" data-original-title="Facebook" class="social_facebook"></a></li>\r\n                <!--<li><a href="https://twitter.com/iarc_info" target="_blank" data-original-title="Twitter" class="social_twitter"></a></li>-->\r\n                <!--<li><a href="#" data-original-title="Vimeo" class="social_vimeo"></a></li>-->\r\n                <li><a href="https://plus.google.com/+IarcOrg/" target="_blank" data-original-title="Goole Plus" class="social_googleplus"></a></li>\r\n                <!--<li><a href="#" data-original-title="Pinterest" class="social_pintrest"></a></li>\r\n                    <li><a href="#" data-original-title="Linkedin" class="social_linkedin"></a></li>\r\n                    <li><a href="#" data-original-title="Dropbox" class="social_dropbox"></a></li>-->\r\n                <!--<li><a href="#" data-original-title="Picasa" class="social_picasa"></a></li>-->\r\n                <!--<li><a href="#" data-original-title="Spotify" class="social_spotify"></a></li>\r\n                    <li><a href="#" data-original-title="Jolicloud" class="social_jolicloud"></a></li>-->\r\n                <li><a href="http://iarcinfo.wordpress.com/" target="_blank" data-original-title="Wordpress" class="social_wordpress"></a></li>\r\n                <!--<li><a href="#" data-original-title="Github" class="social_github"></a></li>\r\n                    <li><a href="#" data-original-title="Xing" class="social_xing"></a></li>-->\r\n            </ul>\r\n            <div class="clearfix"></div>\r\n        </div>\r\n        <!-- End Social Icons -->\r\n\r\n        <!-- Quick Links -->\r\n        <div class="magazine-sb-categories">\r\n            <div class="headline headline-md">\r\n                <h2>ניווט מהיר</h2>\r\n            </div>\r\n            <div class="row">\r\n                <ul class="list-unstyled col-xs-6">\r\n                    <li><a href="#Freq">תדרים</a></li>\r\n                    <li><a href="#Repeaters">ממסרי VHF/UHF</a></li>\r\n                    <li><a href="#News">חדשות</a></li>\r\n                    <li><a href="https://plus.google.com/u/0/b/101436536481101172135/photos/101436536481101172135/albums" target="_blank">גלריה</a></li>\r\n                    <li><a href="#QSL">לשכת QSL</a></li>\r\n                    <li><a href="#SilentKeyForest">Silent Key Forest</a></li>\r\n                </ul>\r\n                <ul class="list-unstyled col-xs-6">\r\n                    <li><a href="#About">אודות האגודה</a></li>\r\n                    <li><a href="#Membership">חברות באגודה</a></li>\r\n                    <li><a href="#Directors">בעלי תפקידים</a></li>\r\n                    <li><a href="#Hagal">בטאון הגל</a></li>\r\n                    <li><a href="#Holyland">תחרות ארץ הקודש</a></li>\r\n                    <li><a href="#Contact">צור קשר</a></li>\r\n                </ul>\r\n            </div>\r\n        </div>\r\n        <!-- End Quick Links -->\r\n\r\n        <!-- Blog Twitter -->\r\n        <div style="direction: rtl">\r\n            <!--<div class="headline">\r\n                <h3>ציוצים אחרונים</h3>\r\n            </div>-->\r\n            <!--<div class="blog-twitter-inner" style="direction: rtl">\r\n                <a class="twitter-timeline" href="https://twitter.com/iarc_info" data-widget-id="413191627423744000" style="direction: rtl;">Tweets by @iarc_info</a>\r\n            </div>-->\r\n        </div>\r\n        <!-- End Blog Twitter -->\r\n    </div>\r\n\r\n    <!-- End Sidebar -->\r\n    <div class="col-md-9 pull-right container-fluid page-host" data-bind="router: { transition: \'entrance\', cacheViews: true }"></div>\r\n\r\n</div>\r\n<!--/container-->\r\n<!-- End Content Part -->\r\n\r\n<!--=== Footer ===-->\r\n<!--<div class="footer copyright">\r\n    <div class="container">\r\n        <div class="row">\r\n            <div class="col-md-6">\r\n                <p class="copyright-space">\r\n                    <span class="pull-left" style="color: #717171">עיצוב ופיתוח: 4Z1KD</span>\r\n                </p>\r\n            </div>\r\n            <div class="col-md-6">\r\n                <p class="copyright-space">\r\n                    2015 &copy; אגודת חובבי הרדיו, כל הזכויות שמורות\r\n                    \r\n                </p>\r\n            </div>\r\n        </div>\r\n        \r\n    </div>\r\n    \r\n</div>-->\r\n<!--=== End Footer ===-->\r\n';});


define('text!views/shop.html',[],function () { return '<div class="cartBar">\r\n    <span class="cartMeta">\r\n        <ul>\r\n            <li class="first"><strong>Items: </strong><span class="simpleCart_quantity">4</span></li>\r\n            <li><strong>Total: </strong><span class="simpleCart_total">$400</span></li>\r\n            <li><a href="javascript:void(0);" id="view_cart">View</a></li>\r\n            <li><a href="javascript:void(0);" class="simpleCart_empty">Empty</a></li>\r\n            <li><a href="order-black-frames.html">Shop</a></li>\r\n            <li class="last"><a href="javascript:void(0);" class="simpleCart_checkout">Checkout</a></li>\r\n        </ul>\r\n    </span>\r\n    <div id="cart">\r\n        <div class="simpleCart_items">\r\n        </div>\r\n    </div>\r\n</div>\r\n<div class="container">\r\n    <div class="headline">\r\n        <h2>חנות</h2>\r\n    </div>\r\n    <p>\r\n        כאן האגודה תפרסם ציוד למכירה\r\n    </p>\r\n    <div class="row service-v1 margin-bottom-40">\r\n        <div class="col-md-6 simpleCart_shelfItem">\r\n            <img class="img-responsive" src="assets/img/shop/coax.jpg" alt="">\r\n            <h2 class="item_name">קבל קואקס חדש</h2>\r\n            <p>\r\n                <span class="item_price">$35.99</span><br>\r\n                האגודה תהיה מוכנה לספק קבל קואקס חדש במחיר של 1.7 שקלים חדשים למטר לחברי האגודה. כל רוכש יהיה זכאי לחמישים מטר לכל היותר. בהתאם לצורך האגודה תחדש את המלאי ותציע כמות נוספת במחיר דומה.<br />\r\n                <a class="item_add" href="javascript:void(0);">Add to Cart </a>\r\n            </p>\r\n        </div>\r\n        <div class="col-md-6 simpleCart_shelfItem">\r\n            <img class="img-responsive" src="assets/img/shop/coax.jpg" alt="">\r\n            <h2 class="item_name">קבל קואקס חדש</h2>\r\n            <p>\r\n                <span class="item_price">$35.99</span><br>\r\n                האגודה תהיה מוכנה לספק קבל קואקס חדש במחיר של 1.7 שקלים חדשים למטר לחברי האגודה. כל רוכש יהיה זכאי לחמישים מטר לכל היותר. בהתאם לצורך האגודה תחדש את המלאי ותציע כמות נוספת במחיר דומה.<br />\r\n                <a class="item_add" href="javascript:void(0);">Add to Cart </a>\r\n            </p>\r\n        </div>\r\n    </div>\r\n\r\n\r\n    <div class="simpleCart_shelfItem">\r\n        <h2 class="item_name">Awesome T-shirt </h2>\r\n        <p>\r\n            <input type="text" value="1" class="item_Quantity"><br>\r\n            <span class="item_price">$35.99</span><br>\r\n            <a class="item_add" href="javascript:void(0);">Add to Cart </a>\r\n        </p>\r\n    </div>\r\n</div>\r\n\r\n';});


define('text!views/squares.html',[],function () { return '<style type="text/css">\r\n    .map\r\n    {\r\n        width: 100%;\r\n        height: 800px;\r\n        border-top: solid 1px #eee;\r\n        border-bottom: solid 1px #eee;\r\n    }\r\n\r\n        /* important! bootstrap sets max-width on img to 100% which conflicts with google map canvas*/\r\n        .map img\r\n        {\r\n            max-width: none;\r\n        }\r\n\r\n    .map-box\r\n    {\r\n        height: 750px;\r\n    }\r\n\r\n    .map-box-space\r\n    {\r\n        margin-top: 15px;\r\n    }\r\n\r\n    .map-box-space1\r\n    {\r\n        margin-top: 7px;\r\n    }\r\n</style>\r\n<div class="container">\r\n    <span id="square"></span>\r\n    <div id="map-canvas" class="map">\r\n    </div>\r\n\r\n</div>\r\n\r\n';});


define('text!views/sukotresults.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid text-right" style="direction: rtl">\r\n        <div class="margin-bottom-40"></div>\r\n        <div class="row margin-bottom-10">\r\n            <div class="col-md-12">\r\n                <strong>\r\n                    תוצאות תחרות סוכות\r\n                </strong>\r\n            </div>\r\n            <div class="col-md-8">\r\n\r\n            </div>\r\n            <div class="col-md-4 pull-right" style="max-width: 350px; margin-top:8px;">\r\n                <div id="custom-search-input">\r\n                    <div class="input-group col-md-12">\r\n                        <input type="text" class="  search-query form-control" placeholder="Search" data-bind="value: searchInput, valueUpdate: \'afterkeydown\'" />\r\n                        <span class="input-group-btn">\r\n                            <button class="btn btn-success" type="button">\r\n                                <span class="icon icon-search"></span>\r\n                            </button>\r\n                        </span>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n        <div class="panel panel-green margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">תחרות סוכות 2021 - VHF/UHF</h4>\r\n            </div>\r\n            <table class="table table-striped table-hover text-right" id="dataTable">\r\n                <tr class="text-right">\r\n                    <th class="text-right">מקום</th>\r\n                    <th class="text-right">אות קריאה</th>\r\n                    <th class="text-right">שם</th>\r\n                    <th class="text-right">מספר קשרים</th>\r\n                    <th class="text-right">נקודות</th>\r\n                    <th class="text-right">קטגוריה</th>\r\n                </tr>\r\n                <tr><td>1</td><td>4X1RE/P</td><td>Dr. Eyal Raskin</td><td>66</td>\t\t<td>2536</td><td>VHF/UHF</td></tr>\r\n                <tr><td>2</td><td>4Z1NB/P</td><td>ELI SHAHAF</td><td>54</td>\t\t\t<td>2471</td><td>VHF/UHF</td></tr>\r\n                <tr><td>3</td><td>4X1BQ</td><td>Joseph Sharon</td><td>66</td>\t\t\t<td>2453</td><td>VHF/UHF</td></tr>\r\n                <tr><td>4</td><td>4X5MG/P</td><td>Ido</td><td>46</td>\t\t\t\t\t<td>2074</td><td>VHF/UHF</td></tr>\r\n                <tr><td>5</td><td>4X1TI</td><td>Efi</td><td>32</td>\t\t\t\t\t\t<td>2054</td><td>VHF/UHF</td></tr>\r\n                <tr><td>6</td><td>4Z1DZ/P</td><td>Chanan</td><td>48</td>\t\t\t\t<td>1913</td><td>VHF/UHF</td></tr>\r\n                <tr><td>7</td><td>4X5HF/P</td><td>ILAN TSAMERET</td><td>19</td>\t\t\t<td>1834</td><td>VHF/UHF</td></tr>\r\n                <tr><td>8</td><td>4X1ST/P</td><td>Tim Scrimshaw 4X1ST</td><td>37</td>\t<td>1457</td><td>VHF/UHF</td></tr>\r\n                <tr><td>9</td><td>4X6YA</td><td>Hilik Amir</td><td>51</td>\t\t\t\t<td>1441</td><td>VHF/UHF</td></tr>\r\n                <tr><td>10</td><td>4X4LF</td><td>Shlomo Goldstein</td><td>20</td>\t\t<td>1430</td><td>VHF/UHF</td></tr>\r\n                <tr><td>11</td><td>4Z1AR</td><td>Amir</td><td>52</td>\t\t\t\t\t<td>1376</td><td>VHF/UHF</td></tr>\r\n                <tr><td>12</td><td>4Z1ZV</td><td>ZVI SEGAL</td><td>48</td>\t\t\t\t<td>1269</td><td>VHF/UHF</td></tr>\r\n                <tr><td>13</td><td>4Z1WS</td><td>Shamai</td><td>34</td>\t\t\t\t\t<td>1171</td><td>VHF/UHF</td></tr>\r\n                <tr><td>14</td><td>4X1BG</td><td>Nimrod Schwartz</td><td>20</td>\t\t<td>1165</td><td>VHF/UHF</td></tr>\r\n                <tr><td>15</td><td>4X6AG</td><td>Gadi Alon</td><td>32</td>\t\t\t\t<td>1143</td><td>VHF/UHF</td></tr>\r\n                <tr><td>16</td><td>4X1UF/P</td><td>Israel Lavee</td><td>17</td>\t\t\t<td>1053</td><td>VHF/UHF</td></tr>\r\n                <tr><td>17</td><td>4Z4DX</td><td>Dov</td><td>37</td>\t\t\t\t\t<td>855</td><td>VHF/UHF</td></tr>\r\n                <tr><td>18</td><td>4X5KE/P</td><td>Eran Kedar</td><td>16</td>\t\t\t<td>555</td><td>VHF/UHF</td></tr>\r\n                <tr><td>19</td><td>4X1KS</td><td>mark</td><td>21</td>\t\t\t\t\t<td>507</td><td>VHF/UHF</td></tr>\r\n                <tr><td>20</td><td>4X1DA</td><td>Rich Harel</td><td>15</td>\t\t\t\t<td>477</td><td>VHF/UHF</td></tr>\r\n            </table>\r\n        </div>\r\n\r\n        <div class="panel panel-red margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">תחרות סוכות 2021 - VHF</h4>\r\n            </div>\r\n            <table class="table table-striped table-hover text-right" id="dataTable">\r\n                <tr class="text-right">\r\n                    <th class="text-right">מקום</th>\r\n                    <th class="text-right">אות קריאה</th>\r\n                    <th class="text-right">שם</th>\r\n                    <th class="text-right">מספר קשרים</th>\r\n                    <th class="text-right">נקודות</th>\r\n                    <th class="text-right">קטגוריה</th>\r\n                </tr>\r\n                <tr><td>1</td><td>4X1IG/P</td><td>Ron Yatziv</td><td>49</td><td>2400</td><td>VHF</td></tr>\r\n                <tr><td>2</td><td>4X1ON/P</td><td>Ofer Ezra</td><td>27</td><td>1743</td><td>VHF</td></tr>\r\n                <tr><td>3</td><td>4Z4KX</td><td>Mark</td><td>41</td><td>1199</td><td>VHF</td></tr>\r\n                <tr><td>4</td><td>4X1MK</td><td>Ron Gang</td><td>15</td><td>822</td><td>VHF</td></tr>\r\n                <tr><td>5</td><td>4Z4XC/P</td><td>YAIR</td><td>25</td><td>603</td><td>VHF</td></tr>\r\n                <tr><td>6</td><td>4X1HJ</td><td>Halevy Itzhak</td><td>12</td><td>435</td><td>VHF</td></tr>\r\n                <tr><td>7</td><td>4Z5OI/P</td><td>Jurgen</td><td>16</td><td>400</td><td>VHF</td></tr>\r\n                <tr><td>8</td><td>4X5SB</td><td>DANIEL BAREL</td><td>5</td><td>235</td><td>VHF</td></tr>\r\n                <tr><td>9</td><td>4X1UK/P</td><td>Ziv Gilad</td><td>11</td><td>230</td><td>VHF</td></tr>\r\n                <tr><td>10</td><td>4X5GB</td><td>Ronen Ohana</td><td>9</td><td>224</td><td>VHF</td></tr>\r\n                <tr><td>11</td><td>4X4ZP</td><td>RON ENGAL</td><td>3</td><td>157</td><td>VHF</td></tr>\r\n                <tr><td>12</td><td>4X1WQ</td><td>Avi</td><td>4</td><td>119</td><td>VHF</td></tr>\r\n            </table>\r\n        </div>\r\n\r\n        <div class="panel panel-blue margin-bottom-40">\r\n            <div class="panel-heading">\r\n                <h4 class="panel-title">תחרות סוכות 2021 - מנצח מבין תחנות P/</h4>\r\n            </div>\r\n            <table class="table table-striped table-hover text-right" id="dataTable">\r\n                <tr class="text-right">\r\n                    <th class="text-right">אות קריאה</th>\r\n                    <th class="text-right">שם</th>\r\n                    <th class="text-right">מספר קשרים</th>\r\n                    <th class="text-right">נקודות</th>\r\n                    <th class="text-right">קטגוריה</th>\r\n                </tr>\r\n                <tr><td>4X1RE/P</td><td>Dr. Eyal Raskin</td><td>66</td>\t\t<td>2536</td><td>VHF/UHF</td></tr>\r\n            </table>\r\n        </div>\r\n    </div>\r\n\r\n    <div class="panel panel-orange margin-bottom-40">\r\n        <div class="panel-heading">\r\n            <h4 class="panel-title">תחרות סוכות 2021 - מנצח מבין החובבים החדשים</h4>\r\n        </div>\r\n        <table class="table table-striped table-hover text-right" id="dataTable">\r\n            <tr class="text-right">\r\n                <th class="text-right">אות קריאה</th>\r\n                <th class="text-right">שם</th>\r\n                <th class="text-right">מספר קשרים</th>\r\n                <th class="text-right">נקודות</th>\r\n                <th class="text-right">קטגוריה</th>\r\n            </tr>\r\n            <tr><td>4X5KE/P</td><td>Eran Kedar</td><td>16</td>\t\t\t<td>555</td><td>VHF/UHF</td></tr>\r\n        </table>\r\n    </div>\r\n</div>\r\n\r\n</div>\r\n\r\n';});


define('text!views/wwff.html',[],function () { return '<div class="container">\r\n    <div class="row-fluid privacy">\r\n        <h4>WWFF בישראל - 4XFF</h4>\r\n        <p>\r\n           מטרת התוכנית היא להסב את תשומת הלב לחשיבות השמירה על הטבע - החי, הצומח והדומם.\r\n            ברוח זו מקימים חובבי רדיו את התחנות שלהם ומפעילים מתוך פארקים, גנים לאומיים, שמורות טבע ואיזורים מוגנים.\r\n            התוכנית היא בין לאומית, איננה מסחרית, ומנוהלת ע"י רכזים של מספר רב של תוכניות חי וצומח לאומיות.\r\n            לטובת חובבי הרדיו והטבע הישראלים, מובאת בזו רשימה של אתרי הטבע בישראל כפי שמוכרים ע"י התוכנית.\r\n        </p>\r\n        <p></p>\r\n        <hr />\r\n    </div>\r\n\r\n    <div class="row-fluid">\r\n        <div class="col-md-12">\r\n            <div class="panel panel-grey margin-bottom-40">\r\n                <div class="panel-heading">\r\n                    <span class="panel-title text-right">רשימת אתרי 4XFF</span>\r\n                    <!--<span class="panel-title pull-left">Echolink</span>-->\r\n                </div>\r\n                <table class="table table-striped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th style="text-align: right">מזהה</th>\r\n                            <th style="text-align: right">שם</th>\r\n                            <th style="text-align: right">קישור</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                        <tr>\r\n                            <td>4XFF-001</td>\r\n                            <td>חוף אכזיב</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/achziv/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-002</td>\r\n                            <td>נחל אלכסנדר</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/alexanderStreamHofBetYanai/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-003</td>\r\n                            <td>אשקלון</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/ashkelon/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-004</td>\r\n                            <td>עבדת</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/avdat/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-005</td>\r\n                            <td>יער ברעם</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/baram/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-006</td>\r\n                            <td>עשוש</td>\r\n                            <td><a href="http://www.inature.info/wiki/%D7%A9%D7%9E%D7%95%D7%A8%D7%AA_%D7%A2%D7%A9%D7%95%D7%A9" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-007</td>\r\n                            <td>בית גוברין - מרשה</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/betGuvrinMaresha/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-008</td>\r\n                            <td>בית שאן</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/betShean/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-009</td>\r\n                            <td>עיר דוד</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/cityofDavidJerusalem%20Walls/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-010</td>\r\n                            <td>קיסריה</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/caesarea/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-011</td>\r\n                            <td>חוף דור\\הבונים</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/dorHabonim/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-012</td>\r\n                            <td>גילבוע</td>\r\n                            <td><a href="http://he.wikipedia.org/wiki/%D7%94%D7%A8_%D7%94%D7%92%D7%9C%D7%91%D7%95%D7%A2" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-013</td>\r\n                            <td>הנחלים הגדולים</td>\r\n                            <td><a href="http://www.inature.info/wiki/%D7%A9%D7%9E%D7%95%D7%A8%D7%AA_%D7%94%D7%A0%D7%97%D7%9C%D7%99%D7%9D_%D7%94%D7%92%D7%93%D7%95%D7%9C%D7%99%D7%9D_%D7%95%D7%A7%D7%98%D7%95%D7%A8%D7%94" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-014</td>\r\n                            <td>הר הנגב</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/negev/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-015</td>\r\n                            <td>החולה</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/hula/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-016</td>\r\n                            <td>עין גדי</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/enGedi/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-017</td>\r\n                            <td>מדבר יהודה</td>\r\n                            <td>&nbsp;</td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-018</td>\r\n                            <td>הבשור, אשכול</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/eshkol/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-019</td>\r\n                            <td>הרי יהודה</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/yhuda/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-020</td>\r\n                            <td>מכתשים, עין יהב</td>\r\n                            <td><a href="http://www.inature.info/wiki/%D7%A9%D7%9E%D7%95%D7%A8%D7%AA_%D7%9E%D7%9B%D7%AA%D7%A9%D7%99%D7%9D_%D7%A2%D7%99%D7%9F_%D7%99%D7%94%D7%91" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-021</td>\r\n                            <td>הרי אילת</td>\r\n                            <td><a href="http://www.inature.info/wiki/%D7%A9%D7%9E%D7%95%D7%A8%D7%AA_%D7%94%D7%A8%D7%99_%D7%90%D7%99%D7%9C%D7%AA" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-022</td>\r\n                            <td>הר מירון, נחל עמוד</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/meron/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-023</td>\r\n                            <td>הר חרמון, בניאס, שניר, נמרוד</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/nahalSnir/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-024</td>\r\n                            <td>כורסי</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/kursi/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-025</td>\r\n                            <td>הר תבור, נחל תבור</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/nahalTavor/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-026</td>\r\n                            <td>ממשית</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/mamshit/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-027</td>\r\n                            <td>מצדה</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/masada/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-028</td>\r\n                            <td>הר הכרמל</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/mountCarmel/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-029</td>\r\n                            <td>פארק הירדן, בטחה, בית צידה, זאכי, מג\'רסה</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/majrase/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-030</td>\r\n                            <td>קומראן</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/qumran/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-031</td>\r\n                            <td>פארק שרון</td>\r\n                            <td><a href="http://www.parksharon.co.il/" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-032</td>\r\n                            <td>שבטה</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/shivta/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-033</td>\r\n                            <td>תמנע</td>\r\n                            <td><a href="http://www.parktimna.co.il/" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-034</td>\r\n                            <td>יער יהודיה, גמלא, זוויתן, משושים</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/yehudiyaforest/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-035</td>\r\n                            <td>תל באר שבע</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/telBeerSheva/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-036</td>\r\n                            <td>תל חצור</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/telHazor/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-037</td>\r\n                            <td>מגידו</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/megiddo/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-038</td>\r\n                            <td>ירקון</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/yarkon/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-039</td>\r\n                            <td>מצוקי צין</td>\r\n                            <td><a href="http://www.inature.info/wiki/%D7%A9%D7%9E%D7%95%D7%A8%D7%AA_%D7%94%D7%A8_%D7%A6%D7%99%D7%9F" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                        <tr>\r\n                            <td>4XFF-040</td>\r\n                            <td>ציפורי</td>\r\n                            <td><a href="http://www.parks.org.il/ParksAndReserves/zippori/Pages/default.aspx" target="_blank"><i class="icon-info"></i></a></td>\r\n                            <tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <!--/row-fluid-->\r\n\r\n</div>\r\n\r\n';});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The dialog module enables the display of message boxes, custom modal dialogs and other overlays or slide-out UI abstractions. Dialogs are constructed by the composition system which interacts with a user defined dialog context. The dialog module enforced the activator lifecycle.
 * @module dialog
 * @requires system
 * @requires app
 * @requires composition
 * @requires activator
 * @requires viewEngine
 * @requires jquery
 * @requires knockout
 */
define('plugins/dialog',['durandal/system', 'durandal/app', 'durandal/composition', 'durandal/activator', 'durandal/viewEngine', 'jquery', 'knockout'], function (system, app, composition, activator, viewEngine, $, ko) {
    var contexts = {},
        dialogCount = 0,
        dialog;

    /**
     * Models a message box's message, title and options.
     * @class MessageBox
     */
    var MessageBox = function(message, title, options) {
        this.message = message;
        this.title = title || MessageBox.defaultTitle;
        this.options = options || MessageBox.defaultOptions;
    };

    /**
     * Selects an option and closes the message box, returning the selected option through the dialog system's promise.
     * @method selectOption
     * @param {string} dialogResult The result to select.
     */
    MessageBox.prototype.selectOption = function (dialogResult) {
        dialog.close(this, dialogResult);
    };

    /**
     * Provides the view to the composition system.
     * @method getView
     * @return {DOMElement} The view of the message box.
     */
    MessageBox.prototype.getView = function(){
        return viewEngine.processMarkup(MessageBox.defaultViewMarkup);
    };

    /**
     * Configures a custom view to use when displaying message boxes.
     * @method setViewUrl
     * @param {string} viewUrl The view url relative to the base url which the view locator will use to find the message box's view.
     * @static
     */
    MessageBox.setViewUrl = function(viewUrl){
        delete MessageBox.prototype.getView;
        MessageBox.prototype.viewUrl = viewUrl;
    };

    /**
     * The title to be used for the message box if one is not provided.
     * @property {string} defaultTitle
     * @default Application
     * @static
     */
    MessageBox.defaultTitle = app.title || 'Application';

    /**
     * The options to display in the message box of none are specified.
     * @property {string[]} defaultOptions
     * @default ['Ok']
     * @static
     */
    MessageBox.defaultOptions = ['Ok'];

    /**
     * The markup for the message box's view.
     * @property {string} defaultViewMarkup
     * @static
     */
    MessageBox.defaultViewMarkup = [
        '<div data-view="plugins/messageBox" class="messageBox">',
            '<div class="modal-header">',
                '<h3 data-bind="text: title"></h3>',
            '</div>',
            '<div class="modal-body">',
                '<p class="message" data-bind="text: message"></p>',
            '</div>',
            '<div class="modal-footer" data-bind="foreach: options">',
                '<button class="btn" data-bind="click: function () { $parent.selectOption($data); }, text: $data, css: { \'btn-primary\': $index() == 0, autofocus: $index() == 0 }"></button>',
            '</div>',
        '</div>'
    ].join('\n');

    function ensureDialogInstance(objOrModuleId) {
        return system.defer(function(dfd) {
            if (system.isString(objOrModuleId)) {
                system.acquire(objOrModuleId).then(function (module) {
                    dfd.resolve(system.resolveObject(module));
                }).fail(function(err){
                    system.error('Failed to load dialog module (' + objOrModuleId + '). Details: ' + err.message);
                });
            } else {
                dfd.resolve(objOrModuleId);
            }
        }).promise();
    }

    /**
     * @class DialogModule
     * @static
     */
    dialog = {
        /**
         * The constructor function used to create message boxes.
         * @property {MessageBox} MessageBox
         */
        MessageBox:MessageBox,
        /**
         * The css zIndex that the last dialog was displayed at.
         * @property {number} currentZIndex
         */
        currentZIndex: 1050,
        /**
         * Gets the next css zIndex at which a dialog should be displayed.
         * @method getNextZIndex
         * @return {number} The next usable zIndex.
         */
        getNextZIndex: function () {
            return ++this.currentZIndex;
        },
        /**
         * Determines whether or not there are any dialogs open.
         * @method isOpen
         * @return {boolean} True if a dialog is open. false otherwise.
         */
        isOpen: function() {
            return dialogCount > 0;
        },
        /**
         * Gets the dialog context by name or returns the default context if no name is specified.
         * @method getContext
         * @param {string} [name] The name of the context to retrieve.
         * @return {DialogContext} True context.
         */
        getContext: function(name) {
            return contexts[name || 'default'];
        },
        /**
         * Adds (or replaces) a dialog context.
         * @method addContext
         * @param {string} name The name of the context to add.
         * @param {DialogContext} dialogContext The context to add.
         */
        addContext: function(name, dialogContext) {
            dialogContext.name = name;
            contexts[name] = dialogContext;

            var helperName = 'show' + name.substr(0, 1).toUpperCase() + name.substr(1);
            this[helperName] = function (obj, activationData) {
                return this.show(obj, activationData, name);
            };
        },
        createCompositionSettings: function(obj, dialogContext) {
            var settings = {
                model:obj,
                activate:false
            };

            if (dialogContext.attached) {
                settings.attached = dialogContext.attached;
            }

            if (dialogContext.compositionComplete) {
                settings.compositionComplete = dialogContext.compositionComplete;
            }

            return settings;
        },
        /**
         * Gets the dialog model that is associated with the specified object.
         * @method getDialog
         * @param {object} obj The object for whom to retrieve the dialog.
         * @return {Dialog} The dialog model.
         */
        getDialog:function(obj){
            if(obj){
                return obj.__dialog__;
            }

            return undefined;
        },
        /**
         * Closes the dialog associated with the specified object.
         * @method close
         * @param {object} obj The object whose dialog should be closed.
         * @param {object} result* The results to return back to the dialog caller after closing.
         */
        close:function(obj){
            var theDialog = this.getDialog(obj);
            if(theDialog){
                var rest = Array.prototype.slice.call(arguments, 1);
                theDialog.close.apply(theDialog, rest);
            }
        },
        /**
         * Shows a dialog.
         * @method show
         * @param {object|string} obj The object (or moduleId) to display as a dialog.
         * @param {object} [activationData] The data that should be passed to the object upon activation.
         * @param {string} [context] The name of the dialog context to use. Uses the default context if none is specified.
         * @return {Promise} A promise that resolves when the dialog is closed and returns any data passed at the time of closing.
         */
        show: function(obj, activationData, context) {
            var that = this;
            var dialogContext = contexts[context || 'default'];

            return system.defer(function(dfd) {
                ensureDialogInstance(obj).then(function(instance) {
                    var dialogActivator = activator.create();

                    dialogActivator.activateItem(instance, activationData).then(function (success) {
                        if (success) {
                            var theDialog = instance.__dialog__ = {
                                owner: instance,
                                context: dialogContext,
                                activator: dialogActivator,
                                close: function () {
                                    var args = arguments;
                                    dialogActivator.deactivateItem(instance, true).then(function (closeSuccess) {
                                        if (closeSuccess) {
                                            dialogCount--;
                                            dialogContext.removeHost(theDialog);
                                            delete instance.__dialog__;

                                            if(args.length == 0){
                                                dfd.resolve();
                                            }else if(args.length == 1){
                                                dfd.resolve(args[0])
                                            }else{
                                                dfd.resolve.apply(dfd, args);
                                            }
                                        }
                                    });
                                }
                            };

                            theDialog.settings = that.createCompositionSettings(instance, dialogContext);
                            dialogContext.addHost(theDialog);

                            dialogCount++;
                            composition.compose(theDialog.host, theDialog.settings);
                        } else {
                            dfd.resolve(false);
                        }
                    });
                });
            }).promise();
        },
        /**
         * Shows a message box.
         * @method showMessage
         * @param {string} message The message to display in the dialog.
         * @param {string} [title] The title message.
         * @param {string[]} [options] The options to provide to the user.
         * @return {Promise} A promise that resolves when the message box is closed and returns the selected option.
         */
        showMessage:function(message, title, options){
            if(system.isString(this.MessageBox)){
                return dialog.show(this.MessageBox, [
                    message,
                    title || MessageBox.defaultTitle,
                    options || MessageBox.defaultOptions
                ]);
            }

            return dialog.show(new this.MessageBox(message, title, options));
        },
        /**
         * Installs this module into Durandal; called by the framework. Adds `app.showDialog` and `app.showMessage` convenience methods.
         * @method install
         * @param {object} [config] Add a `messageBox` property to supply a custom message box constructor. Add a `messageBoxView` property to supply custom view markup for the built-in message box.
         */
        install:function(config){
            app.showDialog = function(obj, activationData, context) {
                return dialog.show(obj, activationData, context);
            };

            app.showMessage = function(message, title, options) {
                return dialog.showMessage(message, title, options);
            };

            if(config.messageBox){
                dialog.MessageBox = config.messageBox;
            }

            if(config.messageBoxView){
                dialog.MessageBox.prototype.getView = function(){
                    return config.messageBoxView;
                };
            }
        }
    };

    /**
     * @class DialogContext
     */
    dialog.addContext('default', {
        blockoutOpacity: .2,
        removeDelay: 200,
        /**
         * In this function, you are expected to add a DOM element to the tree which will serve as the "host" for the modal's composed view. You must add a property called host to the modalWindow object which references the dom element. It is this host which is passed to the composition module.
         * @method addHost
         * @param {Dialog} theDialog The dialog model.
         */
        addHost: function(theDialog) {
            var body = $('body');
            var blockout = $('<div class="modalBlockout"></div>')
                .css({ 'z-index': dialog.getNextZIndex(), 'opacity': this.blockoutOpacity })
                .appendTo(body);

            var host = $('<div class="modalHost"></div>')
                .css({ 'z-index': dialog.getNextZIndex() })
                .appendTo(body);

            theDialog.host = host.get(0);
            theDialog.blockout = blockout.get(0);

            if (!dialog.isOpen()) {
                theDialog.oldBodyMarginRight = body.css("margin-right");
                theDialog.oldInlineMarginRight = body.get(0).style.marginRight;

                var html = $("html");
                var oldBodyOuterWidth = body.outerWidth(true);
                var oldScrollTop = html.scrollTop();
                $("html").css("overflow-y", "hidden");
                var newBodyOuterWidth = $("body").outerWidth(true);
                body.css("margin-right", (newBodyOuterWidth - oldBodyOuterWidth + parseInt(theDialog.oldBodyMarginRight)) + "px");
                html.scrollTop(oldScrollTop); // necessary for Firefox
            }
        },
        /**
         * This function is expected to remove any DOM machinery associated with the specified dialog and do any other necessary cleanup.
         * @method removeHost
         * @param {Dialog} theDialog The dialog model.
         */
        removeHost: function(theDialog) {
            $(theDialog.host).css('opacity', 0);
            $(theDialog.blockout).css('opacity', 0);

            setTimeout(function() {
                ko.removeNode(theDialog.host);
                ko.removeNode(theDialog.blockout);
            }, this.removeDelay);

            if (!dialog.isOpen()) {
                var html = $("html");
                var oldScrollTop = html.scrollTop(); // necessary for Firefox.
                html.css("overflow-y", "").scrollTop(oldScrollTop);

                if(theDialog.oldInlineMarginRight) {
                    $("body").css("margin-right", theDialog.oldBodyMarginRight);
                } else {
                    $("body").css("margin-right", '');
                }
            }
        },
        /**
         * This function is called after the modal is fully composed into the DOM, allowing your implementation to do any final modifications, such as positioning or animation. You can obtain the original dialog object by using `getDialog` on context.model.
         * @method compositionComplete
         * @param {DOMElement} child The dialog view.
         * @param {DOMElement} parent The parent view.
         * @param {object} context The composition context.
         */
        compositionComplete: function (child, parent, context) {
            var $child = $(child);
            var width = $child.width();
            var height = $child.height();
            var theDialog = dialog.getDialog(context.model);

            $child.css({
                'margin-top': (-height / 2).toString() + 'px',
                'margin-left': (-width / 2).toString() + 'px'
            });

            $(theDialog.host).css('opacity', 1);

            if ($(child).hasClass('autoclose')) {
                $(theDialog.blockout).click(function() {
                    theDialog.close();
                });
            }

            $('.autofocus', child).each(function() {
                $(this).focus();
            });
        }
    });

    return dialog;
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Enables common http request scenarios.
 * @module http
 * @requires jquery
 * @requires knockout
 */
define('plugins/http',['jquery', 'knockout'], function($, ko) {
    /**
     * @class HTTPModule
     * @static
     */
    return {
        /**
         * The name of the callback parameter to inject into jsonp requests by default.
         * @property {string} callbackParam
         * @default callback
         */
        callbackParam:'callback',
        /**
         * Makes an HTTP GET request.
         * @method get
         * @param {string} url The url to send the get request to.
         * @param {object} [query] An optional key/value object to transform into query string parameters.
         * @return {Promise} A promise of the get response data.
         */
        get:function(url, query) {
            return $.ajax(url, { data: query });
        },
        /**
         * Makes an JSONP request.
         * @method jsonp
         * @param {string} url The url to send the get request to.
         * @param {object} [query] An optional key/value object to transform into query string parameters.
         * @param {string} [callbackParam] The name of the callback parameter the api expects (overrides the default callbackParam).
         * @return {Promise} A promise of the response data.
         */
        jsonp: function (url, query, callbackParam) {
            if (url.indexOf('=?') == -1) {
                callbackParam = callbackParam || this.callbackParam;

                if (url.indexOf('?') == -1) {
                    url += '?';
                } else {
                    url += '&';
                }

                url += callbackParam + '=?';
            }

            return $.ajax({
                url: url,
                dataType:'jsonp',
                data:query
            });
        },
        /**
         * Makes an HTTP POST request.
         * @method post
         * @param {string} url The url to send the post request to.
         * @param {object} data The data to post. It will be converted to JSON. If the data contains Knockout observables, they will be converted into normal properties before serialization.
         * @return {Promise} A promise of the response data.
         */
        post:function(url, data) {
            return $.ajax({
                url: url,
                data: ko.toJSON(data),
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json'
            });
        }
    };
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Enables automatic observability of plain javascript object for ES5 compatible browsers. Also, converts promise properties into observables that are updated when the promise resolves.
 * @module observable
 * @requires system
 * @requires binder
 * @requires knockout
 */
define('plugins/observable',['durandal/system', 'durandal/binder', 'knockout'], function(system, binder, ko) {
    var observableModule,
        toString = Object.prototype.toString,
        nonObservableTypes = ['[object Function]', '[object String]', '[object Boolean]', '[object Number]', '[object Date]', '[object RegExp]'],
        observableArrayMethods = ['remove', 'removeAll', 'destroy', 'destroyAll', 'replace'],
        arrayMethods = ['pop', 'reverse', 'sort', 'shift', 'splice'],
        additiveArrayFunctions = ['push', 'unshift'],
        arrayProto = Array.prototype,
        observableArrayFunctions = ko.observableArray.fn,
        logConversion = false;

    /**
     * You can call observable(obj, propertyName) to get the observable function for the specified property on the object.
     * @class ObservableModule
     */

    function shouldIgnorePropertyName(propertyName){
        var first = propertyName[0];
        return first === '_' || first === '$';
    }

    function canConvertType(value) {
        if (!value || system.isElement(value) || value.ko === ko || value.jquery) {
            return false;
        }

        var type = toString.call(value);

        return nonObservableTypes.indexOf(type) == -1 && !(value === true || value === false);
    }

    function makeObservableArray(original, observable) {
        var lookup = original.__observable__, notify = true;

        if(lookup && lookup.__full__){
            return;
        }

        lookup = lookup || (original.__observable__ = {});
        lookup.__full__ = true;

        observableArrayMethods.forEach(function(methodName) {
            original[methodName] = function() {
                notify = false;
                var methodCallResult = observableArrayFunctions[methodName].apply(observable, arguments);
                notify = true;
                return methodCallResult;
            };
        });

        arrayMethods.forEach(function(methodName) {
            original[methodName] = function() {
                if(notify){
                    observable.valueWillMutate();
                }

                var methodCallResult = arrayProto[methodName].apply(original, arguments);

                if(notify){
                    observable.valueHasMutated();
                }

                return methodCallResult;
            };
        });

        additiveArrayFunctions.forEach(function(methodName){
            original[methodName] = function() {
                for (var i = 0, len = arguments.length; i < len; i++) {
                    convertObject(arguments[i]);
                }

                if(notify){
                    observable.valueWillMutate();
                }

                var methodCallResult = arrayProto[methodName].apply(original, arguments);

                if(notify){
                    observable.valueHasMutated();
                }

                return methodCallResult;
            };
        });

        original['splice'] = function() {
            for (var i = 2, len = arguments.length; i < len; i++) {
                convertObject(arguments[i]);
            }

            if(notify){
                observable.valueWillMutate();
            }

            var methodCallResult = arrayProto['splice'].apply(original, arguments);

            if(notify){
                observable.valueHasMutated();
            }

            return methodCallResult;
        };

        for (var i = 0, len = original.length; i < len; i++) {
            convertObject(original[i]);
        }
    }

    /**
     * Converts an entire object into an observable object by re-writing its attributes using ES5 getters and setters. Attributes beginning with '_' or '$' are ignored.
     * @method convertObject
     * @param {object} obj The target object to convert.
     */
    function convertObject(obj){
        var lookup, value;

        if(!canConvertType(obj)){
            return;
        }

        lookup = obj.__observable__;

        if(lookup && lookup.__full__){
            return;
        }

        lookup = lookup || (obj.__observable__ = {});
        lookup.__full__ = true;

        if (system.isArray(obj)) {
            var observable = ko.observableArray(obj);
            makeObservableArray(obj, observable);
        } else {
            for (var propertyName in obj) {
                if(shouldIgnorePropertyName(propertyName)){
                    continue;
                }

                if(!lookup[propertyName]){
                    value = obj[propertyName];

                    if(!system.isFunction(value)){
                        convertProperty(obj, propertyName, value);
                    }
                }
            }
        }

        if(logConversion) {
            system.log('Converted', obj);
        }
    }

    function innerSetter(observable, newValue, isArray) {
        var val;
        observable(newValue);
        val = observable.peek();

        //if this was originally an observableArray, then always check to see if we need to add/replace the array methods (if newValue was an entirely new array)
        if (isArray) {
            if (!val.destroyAll) {
                //don't allow null, force to an empty array
                if (!val) {
                    val = [];
                    observable(val);
                }

                makeObservableArray(val, observable);
            }
        } else {
            convertObject(val);
        }
    }

    /**
     * Converts a normal property into an observable property using ES5 getters and setters.
     * @method convertProperty
     * @param {object} obj The target object on which the property to convert lives.
     * @param {string} propertyName The name of the property to convert.
     * @param {object} [original] The original value of the property. If not specified, it will be retrieved from the object.
     * @return {KnockoutObservable} The underlying observable.
     */
    function convertProperty(obj, propertyName, original){
        var observable,
            isArray,
            lookup = obj.__observable__ || (obj.__observable__ = {});

        if(original === undefined){
            original = obj[propertyName];
        }

        if (system.isArray(original)) {
            observable = ko.observableArray(original);
            makeObservableArray(original, observable);
            isArray = true;
        } else if (typeof original == "function") {
            if(ko.isObservable(original)){
                observable = original;
            }else{
                return null;
            }
        } else if(system.isPromise(original)) {
            observable = ko.observable();

            original.then(function (result) {
                if(system.isArray(result)) {
                    var oa = ko.observableArray(result);
                    makeObservableArray(result, oa);
                    result = oa;
                }

                observable(result);
            });
        } else {
            observable = ko.observable(original);
            convertObject(original);
        }

        Object.defineProperty(obj, propertyName, {
            configurable: true,
            enumerable: true,
            get: observable,
            set: ko.isWriteableObservable(observable) ? (function (newValue) {
                if (newValue && system.isPromise(newValue)) {
                    newValue.then(function (result) {
                        innerSetter(observable, result, system.isArray(result));
                    });
                } else {
                    innerSetter(observable, newValue, isArray);
                }
            }) : undefined
        });

        lookup[propertyName] = observable;
        return observable;
    }

    /**
     * Defines a computed property using ES5 getters and setters.
     * @method defineProperty
     * @param {object} obj The target object on which to create the property.
     * @param {string} propertyName The name of the property to define.
     * @param {function|object} evaluatorOrOptions The Knockout computed function or computed options object.
     * @return {KnockoutComputed} The underlying computed observable.
     */
    function defineProperty(obj, propertyName, evaluatorOrOptions) {
        var ko = this,
            computedOptions = { owner: obj, deferEvaluation: true },
            computed;

        if (typeof evaluatorOrOptions === 'function') {
            computedOptions.read = evaluatorOrOptions;
        } else {
            if ('value' in evaluatorOrOptions) {
                system.error('For ko.defineProperty, you must not specify a "value" for the property. You must provide a "get" function.');
            }

            if (typeof evaluatorOrOptions.get !== 'function') {
                system.error('For ko.defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".');
            }

            computedOptions.read = evaluatorOrOptions.get;
            computedOptions.write = evaluatorOrOptions.set;
        }

        computed = ko.computed(computedOptions);
        obj[propertyName] = computed;

        return convertProperty(obj, propertyName, computed);
    }

    observableModule = function(obj, propertyName){
        var lookup, observable, value;

        if (!obj) {
            return null;
        }

        lookup = obj.__observable__;
        if(lookup){
            observable = lookup[propertyName];
            if(observable){
                return observable;
            }
        }

        value = obj[propertyName];

        if(ko.isObservable(value)){
            return value;
        }

        return convertProperty(obj, propertyName, value);
    };

    observableModule.defineProperty = defineProperty;
    observableModule.convertProperty = convertProperty;
    observableModule.convertObject = convertObject;

    /**
     * Installs the plugin into the view model binder's `beforeBind` hook so that objects are automatically converted before being bound.
     * @method install
     */
    observableModule.install = function(options) {
        var original = binder.binding;

        binder.binding = function(obj, view, instruction) {
            if(instruction.applyBindings && !instruction.skipConversion){
                convertObject(obj);
            }

            original(obj, view);
        };

        logConversion = options.logConversion;
    };

    return observableModule;
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Serializes and deserializes data to/from JSON.
 * @module serializer
 * @requires system
 */
define('plugins/serializer',['durandal/system'], function(system) {
    /**
     * @class SerializerModule
     * @static
     */
    return {
        /**
         * The name of the attribute that the serializer should use to identify an object's type.
         * @property {string} typeAttribute
         * @default type
         */
        typeAttribute: 'type',
        /**
         * The amount of space to use for indentation when writing out JSON.
         * @property {string|number} space
         * @default undefined
         */
        space:undefined,
        /**
         * The default replacer function used during serialization. By default properties starting with '_' or '$' are removed from the serialized object.
         * @method replacer
         * @param {string} key The object key to check.
         * @param {object} value The object value to check.
         * @return {object} The value to serialize.
         */
        replacer: function(key, value) {
            if(key){
                var first = key[0];
                if(first === '_' || first === '$'){
                    return undefined;
                }
            }

            return value;
        },
        /**
         * Serializes the object.
         * @method serialize
         * @param {object} object The object to serialize.
         * @param {object} [settings] Settings can specify a replacer or space to override the serializer defaults.
         * @return {string} The JSON string.
         */
        serialize: function(object, settings) {
            settings = (settings === undefined) ? {} : settings;

            if(system.isString(settings) || system.isNumber(settings)) {
                settings = { space: settings };
            }

            return JSON.stringify(object, settings.replacer || this.replacer, settings.space || this.space);
        },
        /**
         * Gets the type id for an object instance, using the configured `typeAttribute`.
         * @method getTypeId
         * @param {object} object The object to serialize.
         * @return {string} The type.
         */
        getTypeId: function(object) {
            if (object) {
                return object[this.typeAttribute];
            }

            return undefined;
        },
        /**
         * Maps type ids to object constructor functions. Keys are type ids and values are functions.
         * @property {object} typeMap.
         */
        typeMap: {},
        /**
         * Adds a type id/constructor function mampping to the `typeMap`.
         * @method registerType
         * @param {string} typeId The type id.
         * @param {function} constructor The constructor.
         */
        registerType: function() {
            var first = arguments[0];

            if (arguments.length == 1) {
                var id = first[this.typeAttribute] || system.getModuleId(first);
                this.typeMap[id] = first;
            } else {
                this.typeMap[first] = arguments[1];
            }
        },
        /**
         * The default reviver function used during deserialization. By default is detects type properties on objects and uses them to re-construct the correct object using the provided constructor mapping.
         * @method reviver
         * @param {string} key The attribute key.
         * @param {object} value The object value associated with the key.
         * @param {function} getTypeId A custom function used to get the type id from a value.
         * @param {object} getConstructor A custom function used to get the constructor function associated with a type id.
         * @return {object} The value.
         */
        reviver: function(key, value, getTypeId, getConstructor) {
            var typeId = getTypeId(value);
            if (typeId) {
                var ctor = getConstructor(typeId);
                if (ctor) {
                    if (ctor.fromJSON) {
                        return ctor.fromJSON(value);
                    }

                    return new ctor(value);
                }
            }

            return value;
        },
        /**
         * Deserialize the JSON.
         * @method deserialize
         * @param {string} text The JSON string.
         * @param {object} [settings] Settings can specify a reviver, getTypeId function or getConstructor function.
         * @return {object} The deserialized object.
         */
        deserialize: function(text, settings) {
            var that = this;
            settings = settings || {};

            var getTypeId = settings.getTypeId || function(object) { return that.getTypeId(object); };
            var getConstructor = settings.getConstructor || function(id) { return that.typeMap[id]; };
            var reviver = settings.reviver || function(key, value) { return that.reviver(key, value, getTypeId, getConstructor); };

            return JSON.parse(text, reviver);
        }
    };
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Layers the widget sugar on top of the composition system.
 * @module widget
 * @requires system
 * @requires composition
 * @requires jquery
 * @requires knockout
 */
define('plugins/widget',['durandal/system', 'durandal/composition', 'jquery', 'knockout'], function(system, composition, $, ko) {
    var kindModuleMaps = {},
        kindViewMaps = {},
        bindableSettings = ['model', 'view', 'kind'],
        widgetDataKey = 'durandal-widget-data';

    function extractParts(element, settings){
        var data = ko.utils.domData.get(element, widgetDataKey);

        if(!data){
            data = {
                parts:composition.cloneNodes(ko.virtualElements.childNodes(element))
            };

            ko.virtualElements.emptyNode(element);
            ko.utils.domData.set(element, widgetDataKey, data);
        }

        settings.parts = data.parts;
    }

    /**
     * @class WidgetModule
     * @static
     */
    var widget = {
        getSettings: function(valueAccessor) {
            var settings = ko.utils.unwrapObservable(valueAccessor()) || {};

            if (system.isString(settings)) {
                return { kind: settings };
            }

            for (var attrName in settings) {
                if (ko.utils.arrayIndexOf(bindableSettings, attrName) != -1) {
                    settings[attrName] = ko.utils.unwrapObservable(settings[attrName]);
                } else {
                    settings[attrName] = settings[attrName];
                }
            }

            return settings;
        },
        /**
         * Creates a ko binding handler for the specified kind.
         * @method registerKind
         * @param {string} kind The kind to create a custom binding handler for.
         */
        registerKind: function(kind) {
            ko.bindingHandlers[kind] = {
                init: function() {
                    return { controlsDescendantBindings: true };
                },
                update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var settings = widget.getSettings(valueAccessor);
                    settings.kind = kind;
                    extractParts(element, settings);
                    widget.create(element, settings, bindingContext, true);
                }
            };

            ko.virtualElements.allowedBindings[kind] = true;
        },
        /**
         * Maps views and module to the kind identifier if a non-standard pattern is desired.
         * @method mapKind
         * @param {string} kind The kind name.
         * @param {string} [viewId] The unconventional view id to map the kind to.
         * @param {string} [moduleId] The unconventional module id to map the kind to.
         */
        mapKind: function(kind, viewId, moduleId) {
            if (viewId) {
                kindViewMaps[kind] = viewId;
            }

            if (moduleId) {
                kindModuleMaps[kind] = moduleId;
            }
        },
        /**
         * Maps a kind name to it's module id. First it looks up a custom mapped kind, then falls back to `convertKindToModulePath`.
         * @method mapKindToModuleId
         * @param {string} kind The kind name.
         * @return {string} The module id.
         */
        mapKindToModuleId: function(kind) {
            return kindModuleMaps[kind] || widget.convertKindToModulePath(kind);
        },
        /**
         * Converts a kind name to it's module path. Used to conventionally map kinds who aren't explicitly mapped through `mapKind`.
         * @method convertKindToModulePath
         * @param {string} kind The kind name.
         * @return {string} The module path.
         */
        convertKindToModulePath: function(kind) {
            return 'widgets/' + kind + '/viewmodel';
        },
        /**
         * Maps a kind name to it's view id. First it looks up a custom mapped kind, then falls back to `convertKindToViewPath`.
         * @method mapKindToViewId
         * @param {string} kind The kind name.
         * @return {string} The view id.
         */
        mapKindToViewId: function(kind) {
            return kindViewMaps[kind] || widget.convertKindToViewPath(kind);
        },
        /**
         * Converts a kind name to it's view id. Used to conventionally map kinds who aren't explicitly mapped through `mapKind`.
         * @method convertKindToViewPath
         * @param {string} kind The kind name.
         * @return {string} The view id.
         */
        convertKindToViewPath: function(kind) {
            return 'widgets/' + kind + '/view';
        },
        createCompositionSettings: function(element, settings) {
            if (!settings.model) {
                settings.model = this.mapKindToModuleId(settings.kind);
            }

            if (!settings.view) {
                settings.view = this.mapKindToViewId(settings.kind);
            }

            settings.preserveContext = true;
            settings.activate = true;
            settings.activationData = settings;
            settings.mode = 'templated';

            return settings;
        },
        /**
         * Creates a widget.
         * @method create
         * @param {DOMElement} element The DOMElement or knockout virtual element that serves as the target element for the widget.
         * @param {object} settings The widget settings.
         * @param {object} [bindingContext] The current binding context.
         */
        create: function(element, settings, bindingContext, fromBinding) {
            if(!fromBinding){
                settings = widget.getSettings(function() { return settings; }, element);
            }

            var compositionSettings = widget.createCompositionSettings(element, settings);

            composition.compose(element, compositionSettings, bindingContext);
        },
        /**
         * Installs the widget module by adding the widget binding handler and optionally registering kinds.
         * @method install
         * @param {object} config The module config. Add a `kinds` array with the names of widgets to automatically register. You can also specify a `bindingName` if you wish to use another name for the widget binding, such as "control" for example.
         */
        install:function(config){
            config.bindingName = config.bindingName || 'widget';

            if(config.kinds){
                var toRegister = config.kinds;

                for(var i = 0; i < toRegister.length; i++){
                    widget.registerKind(toRegister[i]);
                }
            }

            ko.bindingHandlers[config.bindingName] = {
                init: function() {
                    return { controlsDescendantBindings: true };
                },
                update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var settings = widget.getSettings(valueAccessor);
                    extractParts(element, settings);
                    widget.create(element, settings, bindingContext, true);
                }
            };

            ko.virtualElements.allowedBindings[config.bindingName] = true;
        }
    };

    return widget;
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The entrance transition module.
 * @module entrance
 * @requires system
 * @requires composition
 * @requires jquery
 */
define('transitions/entrance',['durandal/system', 'durandal/composition', 'jquery'], function(system, composition, $) {
    var fadeOutDuration = 100;
    var endValues = {
        marginRight: 0,
        marginLeft: 0,
        opacity: 1
    };
    var clearValues = {
        marginLeft: '',
        marginRight: '',
        opacity: '',
        display: ''
    };

    /**
     * @class EntranceModule
     * @constructor
     */
    var entrance = function(context) {
        return system.defer(function(dfd) {
            function endTransition() {
                dfd.resolve();
            }

            function scrollIfNeeded() {
                if (!context.keepScrollPosition) {
                    $(document).scrollTop(0);
                }
            }

            if (!context.child) {
                $(context.activeView).fadeOut(fadeOutDuration, endTransition);
            } else {
                var duration = context.duration || 500;
                var fadeOnly = !!context.fadeOnly;

                function startTransition() {
                    scrollIfNeeded();
                    context.triggerAttach();

                    var startValues = {
                        marginLeft: fadeOnly ? '0' : '20px',
                        marginRight: fadeOnly ? '0' : '-20px',
                        opacity: 0,
                        display: 'block'
                    };

                    var $child = $(context.child);

                    $child.css(startValues);
                    $child.animate(endValues, duration, 'swing', function () {
                        $child.css(clearValues);
                        endTransition();
                    });
                }

                if (context.activeView) {
                    $(context.activeView).fadeOut(fadeOutDuration, startTransition);
                } else {
                    startTransition();
                }
            }
        }).promise();
    };

    return entrance;
});


require(["main"]);
}());