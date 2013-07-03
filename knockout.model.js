(function(window, document, navigator, jQuery, undefined) {
// Module-loading wizardry ripped from KnockoutJS
! function(factory) {
    // Support two module loading scenarios
    if (typeof define === 'function' && define.amd) {
        // [1] AMD anonymous module
        define(['jquery', 'knockout'], factory);
    } else {
        // [2] No module loader (plain <script> tag) - put directly in global namespace
        factory(jQuery, window.ko);
    }
}(function module($, ko) {
    var extend = ko.utils.extend,
        ESCAPED_HTML_RE = new RegExp("&[^\\s]*;"),
        METHOD_MAP = {
            'create': 'POST',
            'update': 'PUT',
            'delete': 'DELETE',
            'read':   'GET'
        },
        InstanceCache;

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


    // Instance Cache
    InstanceCache = function InstanceCache(lifespan) {
        this.cache = {};
        this.lifespan = lifespan || 5;

        // TODO - this could get ugly if there are a lot of instances.  Run through this piece-wise.
        this.interval = setInterval(function() {
            for (key in this.cache) {
                this.get(key);
            }
        }, this.lifespan);
    };

    InstanceCache.prototype = {
        get: function(key) {
            var value = this.cache[key];
            if (value && (value.expires < new Date())) {
                delete this.cache[key];
                value = {val: null};
            }
            return value ? value.val : null;
        },
        set: function(key, instance, lifespan) {
            lifespan = lifespan || this.lifespan;
            this.cache[key] = {
                expires: new Date((new Date()).valueOf() + (lifespan * 1000)),
                val: instance
            };
            return instance;
        }
    };

    ko.instanceCache = new InstanceCache();


    // Model Class
    ko.Model = function(attributes, options) {
        var defaults,
            attrs = attributes || {},
            options = options || {},
            prop;

        this._internals = {
            backupValues: {},
            attrSubscriberCache: {},
            subscriptions: [],
            attrSubscriptions: []
        };

        this._destroy = false;

        // If specific model options are passed, apply them.
        for (prop in ['url', 'urlRoot']) {
            if (options.hasOwnProperty(prop)) {
                this[prop] = options[prop];
            }
        }

        if (options.parse) {
            attrs = this.parse(attrs, options) || {};
        }

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
    };

    extend(ko.Model.prototype, {
        initialize: function(attrs, options) {},

        idAttribute: 'id',
        urlRoot: '',
        defaults: {},
        transientAttributes: [],
        subscribableAttributes: [],
        subscriptionDebounce: 50,

        // Property methods
        ///////////////////

        // Get a named property
        get: function(attr) {
            return ko.utils.unwrapObservable(this[attr]);
        },

        // Set a hash of properties
        set: function(attrs, options) {
            var i, item, new_value, options = options || {};

            if (options.parse) {
                attrs = this.parse(attrs, options) || {};
            }

            for (i in attrs) {
                item = attrs[i];
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
                subscriptions = this._internals.subscriptions,
                attrSubscriptions = this._internals.attrSubscriptions,
                subscription = new Subscription(this, boundCallback, function () {
                        ko.utils.arrayRemoveItem(subscriptions, subscription);
                        if (subscriptions.length === 0) {
                            ko.utils.arrayForEach(attrSubscriptions, function (subscription) {
                                subscription.dispose();
                            });
                            attrSubscriptions = [];
                        }
                    }.bind(this)),
                changeCache = {},
                interval = null,
                self = this;

            if (attrSubscriptions.length === 0) {
                ko.utils.arrayForEach(this.subscribableAttributes, function (attr) {
                    var item = self[attr];
                    if (!ko.isSubscribable(item)) { return; }

                    self._internals.attrSubscriptions.push(item.subscribe(function(val) {
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

            subscriptions.push(subscription);
            return subscription;
        },

        notifySubscribers: function(value) {
            ko.utils.arrayForEach(this._internals.subscriptions, function (subscription) {
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

        // Return an object of the properties and values minus those specified in transientAttributes
        _clone: function(args) {
            var i, param, temp, transientAttributes, attr, len, _ref;
            args = args || {};

            transientAttributes = {
                '_internals': false
            };

            _ref = this.transientAttributes;
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
                    attr = temp[i] = this.get(i);

                    if (i === '_destroy' && attr === false) {
                        // Only include _destroy if it is set.
                        delete temp[i];

                    } else if (typeof attr === 'object') {
                        if (attr instanceof ko.Model) {
                            temp[i] = attr.url();
                        } else if (attr && attr.toJS) {
                            temp[i] = attr.toJS.apply(attr);
                        } else {
                            temp[i] = JSON.parse(JSON.stringify(attr));
                        }
                    }
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
        url: function(id) {
            var base = this.urlRoot;
            if (!base) {
                throw new Error("You must specify a urlRoot.");
            }

            if (this.isNew() && id === undefined) {
                return base;
            }

            id = id || encodeURIComponent(this.get(this.idAttribute));

            if (base.charAt(base.length - 1) !== '/') {
                base += '/';
            }

            return base + id;
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
            var obj;
            if (typeof resp !== 'object') {
                obj = {};
                obj[this.idAttribute] = resp;
                return obj;
            }
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
            ko.utils.arrayForEach(this._internals.attrSubscriptions, function (subscription) {
                subscription.dispose();
            });
            this._internals.attrSubscriptions = [];

            ko.utils.arrayForEach(this._internals.subscriptions, function (subscription) {
                subscription.dispose();
            });

            this._destroy = true;
        },

        // Transactional methods
        ////////////////////////

        _backup: function() {
            var backupValues = this._internals.backupValues,
                item, i;
            backupValues = this.toJS();
            for (i in backupValues) {
                item = this[i];
                if ((ko.isObservable(item) || ko.isComputed(item)) && !ko.isWriteableObservable(item)) {
                    backupValues[i] = undefined;
                    delete backupValues[i];
                }
            }
            this._internals.backupValues = backupValues;
        },

        startTransaction: function() {
            var notifySubscribers = function() {},
                attrSubscriberCache = this._internals.attrSubscriberCache,
                i, item;

            for (i in this) {
                if (this.hasOwnProperty(i)) {
                    item = this[i];

                    if (item && typeof item.notifySubscribers === "function" && item.notifySubscribers !== notifySubscribers) {
                        attrSubscriberCache[i] = item.notifySubscribers;
                        item.notifySubscribers = notifySubscribers;
                    }
                }
            }

            this._backup();
            return;
        },

        commit: function() {
            var attrSubscriberCache = this._internals.attrSubscriberCache,
                _results = [],
                i, item;

            for (i in this) {
                if (this.hasOwnProperty(i)) {
                    item = this[i];
                    if (item && typeof item.notifySubscribers === "function" ) {
                        item.notifySubscribers = attrSubscriberCache[i];

                        if (typeof item.valueHasMutated === "function") {
                            _results.push(item.valueHasMutated());
                        } else {
                            _results.push(undefined);
                        }
                    }
                }
            }
            this._internals.backupValues = {};
            return _results;
        },

        rollback: function() {
            this.set(this._internals.backupValues);
            this.commit();
        }
    });

    ko.Model.extend = _extend;

    // RelatedModel Class
    ko.RelatedModel = function RelatedModel(model, options) {
        var value = ko.observable(null);

        options = options || {};
        options.useCache = options.useCache === undefined ? true : options.useCache;

        return ko.computed({
            read: value,
            write: function(val) {
                var instance = value(),
                    url = null,
                    cachedInstance = null;

                if (val instanceof model) {
                    url = val.url()
                } else {
                    val = model.__super__.parse.call(model.prototype, val || {});
                    url = model.__super__.url.call(model.prototype, val[model.__super__.idAttribute])
                }

                if (options.useCache) {
                    cachedInstance = ko.instanceCache.get(url);
                }


                if (options.overwriteDestroys &&
                    instance !== null &&
                    (cachedInstance === null ||
                     cachedInstance.url() !== instance.url())) {
                        instance.destroy();
                }

                if (val instanceof model) {
                    instance = val;
                } else if (cachedInstance) {
                    instance = cachedInstance;
                } else {
                    instance = new model(val);
                }

                if (options.useCache) {
                    ko.instanceCache.set(instance.url(), instance, options.lifespan);
                }

                value(instance);
            }
        });
    };
})
})(window, document, navigator, window["jQuery"]);