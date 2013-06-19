(function(window, document, navigator, jQuery, undefined) {
    ! function(factory) {
        // Support two module loading scenarios
        if (typeof define === 'function' && define['amd']) {
            // [2] AMD anonymous module
            define(['jquery', 'knockout'], factory);
        } else {
            // [3] No module loader (plain <script> tag) - put directly in global namespace
            factory(window.jQuery, window.ko);
        }
    }(function module($, ko) {

        ko.utils.IdentityMap = function() {
            this.find = function(id, params) {
                return $.grep(this, function(d) {
                    return d.id === id && ko.utils.stringifyJson(d.params) === ko.utils.stringifyJson(params);
                })[0];
            };
            return this;
        };

        ko.utils.IdentityMap.prototype = new Array();

        ko.utils.unescapeHtml = function(str) {
            var result, temp;
            if (str.length > 0) {
                temp = document.createElement("div");
                temp.innerHTML = str;
                result = temp.childNodes[0].nodeValue;
                temp.removeChild(temp.firstChild);
                return result;
            } else {
                return str;
            }
        };

        var __equalityComparer = function(a, b) {
            var primitiveTypes = ['undefined', 'boolean', 'number', 'string'],
                _ref = typeof a;

            if ((a === null) || primitiveTypes.indexOf(_ref) >= 0) {
                return a === b;
            } else {
                return false;
            }
        };


        Model = function() {
            var __transientParameters = [],
                __cacheContainer = new ko.utils.IdentityMap();

            this.__backup = {};
            this.__urls = this.__urls || {};

            this.initialize.apply(this, arguments);

            var i, item;

            for (i in this) {
                if (!this.hasOwnProperty(i)) continue;

                item = this[i];
                if (i !== "__urls") {
                    if (ko.isObservable(this[i])) {
                        this[i].equalityComparer = __equalityComparer;
                    }
                }
            }
        };

        $.extend(Model.prototype, {
            initialize: function() {},

            __urls: {},

            __afterHooks: {},

            __defaults: {},

            addRoute: function(id, href, isStatic) {
                if (isStatic == null) {
                    isStatic = true;
                }
                this.__urls[id] = href;
                if (isStatic === true) {
                    return __urls[id] = href;
                }
            },

            get: function(attr) {
                return ko.utils.unwrapObservable(this[attr]);
            },

            set: function(args) {
                var i, item, new_value, obj;
                obj = this;
                for (i in args) {
                    item = args[i];
                    if (ko.isWriteableObservable(obj[i])) {
                        new_value = typeof item === "string" && item.match(/&[^\s]*;/) !== false ? ko.utils.unescapeHtml(item) : item;
                        if (new_value !== obj[i]()) {
                            obj[i](new_value);
                        }
                    } else if (obj[i] !== void 0 && ko.isObservable(obj[i]) === false) {
                        new_value = item.match(/&[^\s]*;/) !== false ? ko.utils.unescapeHtml(item) : item;
                        obj[i] = new_value;
                    }
                }
                return obj;
            },

            createCollection: function(data, callback) {
                var collection, item, obj, _i, _len;
                collection = [];
                for (_i = 0, _len = data.length; _i < _len; _i++) {
                    item = data[_i];
                    obj = new this;
                    if (typeof callback === "function") {
                        obj.set(callback(item));
                    } else {
                        obj.set(item);
                    }
                    collection.push(obj);
                }
                return collection;
            },

            clear: function() {
                return this.set(this.__defaults);
            },

            refresh: function(callback) {
                return this.show(function(data) {
                    if (data.status === "SUCCESS") {
                        this.set(data);
                    }
                    if (typeof callback === "function") {
                        return callback(data);
                    }
                });
            },

            toJSON: function(options) {
                return ko.toJSON(this.clone(options));
            },

            toJS: function(options) {
                return ko.toJS(this.clone(options));
            },

            clone: function(args) {
                var i, param, temp, transientAttributes, _i, _len, _ref;
                if (args == null) {
                    args = {};
                }
                transientAttributes = {
                    '__urls': false
                };
                _ref = __transientParameters;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    param = _ref[_i];
                    transientAttributes[param] = false;
                }
                args = $.extend(transientAttributes, args);
                temp = {};
                for (i in this) {
                    if (!this.hasOwnProperty(i)) continue;
                    if (args[i] === true || args[i] === void 0) {
                        temp[i] = this.get(i);
                    }
                }
                return temp;
            },

            backup: function() {
                return this.__backup = this.toJS();
            },

            restore: function() {
                this.set(this.__backup);
                __backup = {};
                return this;
            },

            start_transaction: function() {
                var i, item, _results;
                _results = [];
                for (i in this) {
                    if (!this.hasOwnProperty(i)) continue;
                    item = this[i];
                    if (typeof this[i].equalityComparer === "function") {
                        _results.push(this[i].equalityComparer = function() {
                            return true;
                        });
                    } else {
                        _results.push(void 0);
                    }
                }
                return _results;
            },

            commit: function() {
                var i, item, _results;
                _results = [];
                for (i in this) {
                    if (!this.hasOwnProperty(i)) continue;
                    item = this[i];
                    if (typeof this[i].equalityComparer === "function") {
                        this[i].equalityComparer = __equalityComparer;
                        if (typeof this[i].valueHasMutated === "function") {
                            _results.push(this[i].valueHasMutated());
                        } else {
                            _results.push(void 0);
                        }
                    } else {
                        _results.push(void 0);
                    }
                }
                return _results;
            },

            isNew: function() {
                var value;
                value = this.get("id");
                return value === null || value === void 0 || value === "";
            },

            validate: function() {
                return true;
            },

            save: function() {
                var callback, params, _ref;
                if (this.validate() === true) {
                    if (this.isNew() === true) {
                        return this.create.apply(this, arguments);
                    } else {
                        return this.update.apply(this, arguments);
                    }
                } else {
                    _ref = __generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
                    if (typeof callback === "function") {
                        return callback({
                            status: "ERROR",
                            message: "Invalid object"
                        });
                    }
                }
            },

            create: function() {
                var callback, params, _ref;
                _ref = __generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
                params = $.extend(params, this.toJS());
                return this.doPost("create", params, callback);
            },

            update: function() {
                var callback, params, _ref;
                _ref = __generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
                params = $.extend(params, this.toJS());
                return this.doPost("update", params, callback);
            },

            destroy: function() {
                var callback, params, _ref;
                _ref = __generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
                params = $.extend(params, this.toJS());
                return this.doPost("destroy", params, callback);
            },

            show: function() {
                var callback, params, _ref;
                _ref = __generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
                params = $.extend(params, {
                    id: this.get("id")
                });
                return this.doGet("show", params, callback);
            },

            index: function() {
                var callback, params, _ref;
                _ref = __generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
                return this.doGet("index", params, callback);
            },

            doPost: function(routeName, params, callback, type) {
                var url;
                if (params == null) {
                    params = {};
                }
                if (callback == null) {
                    callback = null;
                }
                if (type == null) {
                    type = "json";
                }
                if (routeName.match(/^https?:\/\//) === null) {
                    url = this.__urls[routeName];
                } else {
                    url = routeName;
                }
                return doPost(url, params, callback, type);
            },

            doGet: function(routeName, params, callback, type) {
                var url;
                if (params == null) {
                    params = {};
                }
                if (callback == null) {
                    callback = null;
                }
                if (type == null) {
                    type = "json";
                }
                if (routeName.match(/^https?:\/\//) === null) {
                    url = this.__urls[routeName];
                } else {
                    url = routeName;
                }
                return doGet(url, params, callback, type);
            }
        });

        var doPost = function(routeName, params, callback, type) {
            var ah, className, url;
            if (params == null) {
                params = {};
            }
            if (callback == null) {
                callback = null;
            }
            if (type == null) {
                type = "json";
            }
            if (routeName.match(/^https?:\/\//) === null) {
                url = this.__parse_url(this.__urls[routeName], params);
            } else {
                url = this.__parse_url(routeName, params);
            }
            ah = this.__afterHooks;
            return $.post(url, params, function(data) {
                try {
                    if (typeof ah[routeName] === "function") {
                        ah[routeName](data);
                    }
                    if (typeof callback === "function") {
                        return callback(data);
                    }
                } catch (error) {

                }
            }, type);
        };

        var doGet = function(routeName, params, callback, type) {
            var ah, cached, cc, className, isCache, tempParams, url;
            if (params == null) {
                params = {};
            }
            if (callback == null) {
                callback = null;
            }
            if (type == null) {
                type = "json";
            }
            if (routeName.match(/^https?:\/\//) === null) {
                url = this.__parse_url(this.__urls[routeName], params);
            } else {
                url = this.__parse_url(routeName, params);
            }
            isCache = params["__cache"] === true;
            if (isCache === true) {
                delete params["__cache"];
            }
            cc = this.__cacheContainer;
            ah = this.__afterHooks;
            if (isCache === true) {
                cached = cc.find("#" + routeName, params);
            }
            if (cached != null) {
                if (typeof callback === "function") {
                    return callback(cached.data);
                }
            } else {
                tempParams = $.extend({}, params);
                tempParams["__no_cache"] = new Date().getTime();
                return $.get(url, tempParams, function(data) {
                    if (isCache === true) {
                        cc.push({
                            id: "#" + routeName,
                            params: params,
                            data: data
                        });
                    }
                    try {
                        if (typeof ah[routeName] === "function") {
                            ah[routeName](data);
                        }
                        if (typeof callback === "function") {
                            return callback(data);
                        }
                    } catch (error) {

                    }
                });
            }
        };

        var __generate_request_parameters = function() {
            var callback, params;
            params = {};
            callback = null;
            if (typeof arguments[0] === "function") {
                callback = arguments[0];
            } else if (typeof arguments[0] === "object") {
                params = arguments[0];
                if (typeof arguments[1] === "function") {
                    callback = arguments[1];
                }
            }
            return [params, callback];
        };

        var __parse_url = function(url, params) {
            var a, link;
            a = document.createElement("a");
            a.href = url;
            a.pathname = a.pathname.replace(/:([a-zA-Z0-9_]+)/g, function(match) {
                var attr, value;
                attr = match.substring(1);
                value = params[attr];
                delete params[attr];
                return value;
            });
            link = a.href;
            a = null;
            return link;
        };

        var create = function() {
            var callback, params, _ref;
            _ref = this.__generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
            return this.doPost("create", params, callback);
        };

        var update = function() {
            var callback, params, _ref;
            _ref = this.__generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
            return this.doPost("update", params, callback);
        };

        var destroy = function() {
            var callback, params, _ref;
            _ref = this.__generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
            return this.doPost("destroy", params, callback);
        };

        var show = function() {
            var callback, params, _ref;
            _ref = this.__generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
            return this.doGet("show", params, callback);
        };

        var index = function() {
            var callback, params, _ref;
            _ref = this.__generate_request_parameters.apply(this, arguments), params = _ref[0], callback = _ref[1];
            return this.doGet("index", params, callback);
        };

        // Helpers - shamelessly ripped from Backbone.js
        // ---------------------------------------------

        // Shared empty constructor function to aid in prototype-chain creation.
        var ctor = function() {};

        // Helper function to correctly set up the prototype chain, for subclasses.
        // Similar to `goog.inherits`, but uses a hash of prototype properties and
        // class properties to be extended.
        var inherits = function(parent, protoProps, staticProps) {
            var child;

            // The constructor function for the new subclass is either defined by you
            // (the "constructor" property in your `extend` definition), or defaulted
            // by us to simply call the parent's constructor.
            if (protoProps && protoProps.hasOwnProperty('constructor')) {
                child = protoProps.constructor;
            } else {
                child = function() {
                    parent.apply(this, arguments);
                };
            }

            // Inherit class (static) properties from parent.
            $.extend(child, parent);

            // Set the prototype chain to inherit from `parent`, without calling
            // `parent`'s constructor function.
            ctor.prototype = parent.prototype;
            child.prototype = new ctor();

            // Add prototype properties (instance properties) to the subclass,
            // if supplied.
            if (protoProps) $.extend(child.prototype, protoProps);

            // Add static properties to the constructor function, if supplied.
            if (staticProps) $.extend(child, staticProps);

            // Correctly set child's `prototype.constructor`.
            child.prototype.constructor = child;

            // Set a convenience property in case the parent's prototype is needed later.
            child.__super__ = parent.prototype;

            return child;
        };

        // The self-propagating extend function that Backbone classes use.
        var extend = function(protoProps, classProps) {
            var child = inherits(this, protoProps, classProps);
            child.extend = this.extend;
            return child;
        };

        Model.extend = extend;


        ko.Model = Model;
    })
})(window, document, navigator, window["jQuery"]);