(function(window, document, navigator, jQuery, undefined) {
// Module-loading wizardry ripped from KnockoutJS
! function(factory) {
    // Support two module loading scenarios
    if (typeof define === 'function' && define['amd']) {
        // [1] AMD anonymous module
        define(['jquery', 'knockout'], factory);
    } else {
        // [2] No module loader (plain <script> tag) - put directly in global namespace
        factory(jQuery, window.ko);
    }
}(function module($, ko) {
    var extend = ko.utils.extend;

    // Utility Methods
    //////////////////

    var unescapeHtml = function(str) {
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

    // Subscription things ripped from KnockoutJS.  I chose not to use its own
    // code because it was not an exposed API and munged via minification.
    var Subscription = function (target, callback, disposeCallback) {
        this.target = target;
        this.callback = callback;
        this.disposeCallback = disposeCallback;
    };
    Subscription.prototype.dispose = function () {
        this.isDisposed = true;
        this.disposeCallback();
    };

    // ctor, inherits, _extend - shamelessly ripped from Backbone.js
    ///////////////////////////////////////////////////////////////

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
        extend(child, parent);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) extend(child.prototype, protoProps);

        // Add static properties to the constructor function, if supplied.
        if (staticProps) extend(child, staticProps);

        // Correctly set child's `prototype.constructor`.
        child.prototype.constructor = child;

        // Set a convenience property in case the parent's prototype is needed later.
        child.__super__ = parent.prototype;

        return child;
    };

    // The self-propagating extend function that Backbone classes use.
    var _extend = function(protoProps, classProps) {
        var child = inherits(this, protoProps, classProps);
        child.extend = this.extend;
        return child;
    };

    ESCAPED_HTML_RE = new RegExp("&[^\\s]*;");
    METHOD_MAP = {
        'create': 'POST',
        'update': 'PUT',
//        'patch':  'PATCH', // Not implemented
        'delete': 'DELETE',
        'read':   'GET'
    };


    // The star of the show.
    ko.Model = function(attributes, options) {
        var defaults,
            attrs = attributes || {},
            options = options || {},
            prop;

        this._backup_values = {};
        this._ec_backup = {};

        // If specific model options are passed, apply them.
        for (prop in ['url', 'urlRoot', 'collection']) {
            if (options.hasOwnProperty(prop)) {
                this[prop] = options[prop]
            }
        }

        // TODO - Include this?
        // if (options.parse) attrs = this.parse(attrs, options) || {};

        // Fill in defaults for any non-supplied properties
        for (prop in this.defaults) {
            if (this.defaults.hasOwnProperty(prop) && [null, undefined].indexOf(attrs[prop]) !== -1) {
                attrs[prop] = this.defaults[prop];
            }
        }

        this.initialize.apply(this, arguments);

        // Declare the idAttribute if needed
        if (!this.hasOwnProperty(this.idAttribute)) {
            this[this.idAttribute] = null;
        }

        this.set(attrs, options);

        // Set up subscriptions
        this._subscriptions = [];
        this._attrSubscriptions = [];
    };

    extend(ko.Model.prototype, {
        initialize: function(attrs, options) {},

        idAttribute: 'id',
        urlRoot: '',
        defaults: {},
        transientParameters: [],
        subscriptionParameters: [],
        subscriptionDebounce: 50,

        // Property methods
        ///////////////////

        // Get a named property
        get: function(attr) {
            return ko.utils.unwrapObservable(this[attr]);
        },

        // Set a hash of properties
        set: function(args) {
            var i, item, new_value;
            for (i in args) {
                item = args[i];
                if (ko.isWriteableObservable(this[i])) {
                    new_value = typeof item === "string" && item.match(ESCAPED_HTML_RE) !== false ? unescapeHtml(item) : item;
                    if (new_value !== this[i]()) {
                        this[i](new_value);
                    }
                } else if (this[i] !== undefined && ko.isObservable(this[i]) === false) {
                    new_value = typeof item === "string" && item.match(ESCAPED_HTML_RE) !== false ? unescapeHtml(item) : item;
                    this[i] = new_value;
                } else {
                    try {
                        console.warning('"' + i + '" is a read-only or unknown value.');
                    } catch (e) {}
                }
            }
            return this;
        },

        // Apply defaults to properties
        clear: function() {
            return this.set(this.defaults);
        },

        subscribe: function(callback, target) {
            var boundCallback = target ? callback.bind(target) : callback,
                subscription = new Subscription(this, boundCallback, function () {
                        ko.utils.arrayRemoveItem(this._subscriptions, subscription);
                        if (this._subscriptions.length === 0) {
                            ko.utils.arrayForEach(this._attrSubscriptions, function (subscription) {
                                subscription.dispose();
                            });
                            this._attrSubscriptions = [];
                        }
                    }.bind(this)),
                changeCache = {},
                interval = null,
                self = this;

            if (this._attrSubscriptions.length === 0) {
                ko.utils.arrayForEach(this.subscriptionParameters, function (attr) {
                    var item = self[attr];
                    if (!ko.isSubscribable(item)) { return; }

                    self._attrSubscriptions.push(item.subscribe(function(val) {
                        changeCache[attr] = val;

                        if (interval !== null) {
                            clearTimeout(interval);
                        }

                        interval = setTimeout(function() {
                            self.notifySubscribers(changeCache);
                            changeCache = {};
                        }, self.subscriptionDebounce);
                    }));
                });
            }

            this._subscriptions.push(subscription);
            return subscription;
        },

        notifySubscribers: function(value) {
            ko.utils.arrayForEach(this._subscriptions, function (subscription) {
                if (subscription && (subscription.isDisposed !== true)) {
                    subscription.callback(value);
                }
            });
        },

        // Status methods
        /////////////////

        // Determine if there is a server-side version
        isNew: function() {
            var value;
            value = this.get(this.idAttribute);
            return [undefined, null, '', NaN].indexOf(value) !== -1;
        },

        // Override this to perform validation.
        validate: function() {
            return true;
        },


        // Serialization methods
        ////////////////////////

        // Return an object of the properties and values minus those specified in transientParameters
        _clone: function(args) {
            var i, param, temp, transientAttributes, len, _ref;
            args = args || {};

            transientAttributes = {
                '_backup_values': false,
                '_ec_backup': false,
                '_subscriptions': false,
                '_attrSubscriptions': false
            };

            _ref = this.transientParameters;
            for (i = 0, len = _ref.length; i < len; ++i) {
                param = _ref[i];
                transientAttributes[param] = false;
            }

            args = extend(transientAttributes, args);
            temp = {};

            for (i in this) {
                if (!this.hasOwnProperty(i)) {
                    continue;
                }

                if (args[i] !== false) {
                    temp[i] = this.get(i);
                }
            }
            return temp;
        },

        toJSON: function(options) {
            return ko.toJSON(this._clone(options));
        },

        toJS: function(options) {
            return ko.toJS(this._clone(options));
        },

        // Network methods
        //////////////////

        // Build the url used to access the REST resource.
        url: function() {
            var base = this.urlRoot || urlError();
            if (this.isNew()) {
                return base;
            }

            if (base.charAt(base.length - 1) !== '/') {
                base += '/';
            }

            return base + encodeURIComponent(this.get(this.idAttribute));
        },

        _sync: function(method_name, options) {
            var type = METHOD_MAP[method_name],
                params = {
                    type: type,
                    dataType: 'json'
                },
                xhr;

            if (!options.url) {
                params.url = this.url();
            }

            if (options.data === null && ['create', 'update'].indexOf(method) !== -1) {
                params.contentType = 'application/json';
                params.data = JSON.stringify(this.toJSON());
            }

            if (params.type !== 'GET') {
                params.processData = false;
            }

            xhr = options.xhr = $.ajax(extend(params, options));
            return xhr;
        },

        fetch: function(options) {
            var model = this,
                success;

            options = options ? extend({}, options) : {};

            options.parse = options.parse === undefined ? true : options.parse;
            success = options.success;

            options.success = function(resp) {
                if (!model.set(model.parse(resp, options), options)) {
                    return false;
                }
                if (success) {
                    success(resp, options);
                }
            };

            // wrapError(this, options);
            return this._sync('read', options);
        },

        parse: function(resp, options) {
            return resp;
        },

        save: function(options) {
            var model = this,
                success;

            options = options ? extend({}, options) : {};

            if (this.validate() !== true) {
                if (typeof options.invalid === "function") {
                    return options.invalid({
                        status: "ERROR",
                        message: "Invalid object"
                    });
                }
            }

            options.parse = options.parse === undefined ? true : options.parse;
            success = options.success;

            options.success = function(resp) {
                if (!model.set(model.parse(resp, options), options)) {
                    return false;
                }
                if (success) {
                    success(resp, options);
                }
            };

            // wrapError(this, options);
            return this._sync(this.isNew() ? 'create' : 'update', options);
        },

        destroy: function() {
            ko.utils.arrayForEach(this._attrSubscriptions, function (subscription) {
                subscription.dispose();
            });
            this._attrSubscriptions = [];

            ko.utils.arrayForEach(this._subscriptions, function (subscription) {
                subscription.dispose();
            });
        },

        // Transactional methods
        ////////////////////////

        _backup: function() {
            var item, i;
            this._backup_values = this.toJS();
            for (i in this._backup_values) {
                item = this[i];
                if ((ko.isObservable(item) || ko.isComputed(item)) && !ko.isWriteableObservable(item)) {
                    this._backup_values[i] = undefined;
                    delete this._backup_values[i];
                }
            }
        },

        startTransaction: function() {
            var notifySubscribers = function() {},
                i, item;

            for (i in this) {
                if (this.hasOwnProperty(i)) {
                    item = this[i];

                    if (item && typeof item.notifySubscribers === "function" && item.notifySubscribers !== notifySubscribers) {
                        this._ec_backup[i] = item.notifySubscribers;
                        item.notifySubscribers = notifySubscribers;
                    }
                }
            }

            this._backup();
            return;
        },

        commit: function() {
            var i, item, _results = [];

            for (i in this) {
                if (this.hasOwnProperty(i)) {
                    item = this[i];
                    if (item && typeof item.notifySubscribers === "function" ) {
                        item.notifySubscribers = this._ec_backup[i];

                        if (typeof item.valueHasMutated === "function") {
                            _results.push(item.valueHasMutated());
                        } else {
                            _results.push(undefined);
                        }
                    }
                }
            }
            this._backup_values = {};
            return _results;
        },

        rollback: function() {
            this.set(this._backup_values);
            this.commit();
        }
    });

    ko.Model.extend = _extend;
})
})(window, document, navigator, window["jQuery"]);