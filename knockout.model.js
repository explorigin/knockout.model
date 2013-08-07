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
        InstanceCache,
        setCache;

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
    InstanceCache = function InstanceCache() {
        this.cache = {};
    };

    InstanceCache.prototype = {
        get: function(key) {
            var value = this.cache[key];
            return value ? value : null;
        },
        set: function(key, instance) {
            this.cache[key] = instance;
            return instance;
        }
    };

    ko.instanceCache = new InstanceCache();

    setCache = function setCache() {
        if (this._internals.options.useCache && !this.isNew()) {
            ko.instanceCache.set(this.url(), this);
        }
    };

    ko.extenders._onaccess = function (target, accessMethod) {
        var proxy = function() {
                accessMethod.apply(this, arguments);
                return target.apply(this, arguments);
            };

        ko.utils.extend(proxy, target);

        return proxy;
    };

    // Model Class
    ko.Model = function(attributes, options) {
        var attrs = attributes || {},
            prop,
            action;

        options = options || {};

        this._internals = {
            fetching: false,
            options: options,
            backupValues: {},
            attrSubscriberCache: {},
            attrSubscriptions: [],
            subscriptions: {
                change: [],
                beforeFetch: [],
                beforeSave: [],
                beforeDestroy: []
            }
        };

        this._destroy = false;
        this._lastFetched = null;

        // If specific model options are passed, apply them.
        for (prop in ['url', 'urlRoot']) {
            if (options.hasOwnProperty(prop)) {
                this[prop] = options[prop];
            }
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

        if (typeof options.autoFetch === 'string' && options.autoFetch.toLowerCase() === 'onread') {
            for (prop in this) {
                if (!this.hasOwnProperty(prop) || !ko.isObservable(this[prop])) {
                    continue
                }

                this[prop] = this[prop].extend({_onaccess: function() {
                    if (this._lastFetched === null) {
                        this.fetch(arguments);
                    }
                }});
            }
        }
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
            return ko.unwrap(this[attr]);
        },

        // Set a hash of properties
        set: function(attrs, options) {
            var i, item, slot, new_value;
            options = options || {};

            if (options.parse) {
                attrs = this.parse(attrs, options) || {};
            }

            for (i in attrs) {
                item = attrs[i];
                slot = this[i];
                if (ko.isWriteableObservable(slot)) {
                    new_value = typeof item === "string" && item.match(ESCAPED_HTML_RE) !== false ? unescapeHtml(item) : item;
                    if (new_value !== this[i]()) {
                        this[i](new_value);
                    }
                } else if (slot !== undefined && ko.isObservable(slot) === false && typeof slot !== 'function') {
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

        subscribe: function(callback, target, event) {
            var boundCallback = target ? callback.bind(target) : callback,
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
                self = this,
                notify = function () {
                    self.notifySubscribers(changeCache, 'change');
                    changeCache = {};
                },
                subscriptions;

            event = event || 'change';
            subscriptions = this._internals.subscriptions[event];

            if (attrSubscriptions.length === 0) {
                ko.utils.arrayForEach(this.subscribableAttributes, function (attr) {
                    var item = self[attr];
                    if (!ko.isSubscribable(item)) { return; }

                    self._internals.attrSubscriptions.push(item.subscribe(function(val) {
                        changeCache[attr] = val;

                        if (interval !== null) {
                            clearTimeout(interval);
                        }

                        if (this.subscriptionDebounce > 0) {
                            interval = setTimeout(notify, this.subscriptionDebounce);
                        } else {
                            notify();
                        }
                    }, self, event));
                });
            }

            subscriptions.push(subscription);
            return subscription;
        },

        notifySubscribers: function(value, event) {
            ko.utils.arrayForEach(this._internals.subscriptions[event], function (subscription) {
                if (subscription && (subscription.isDisposed !== true)) {
                    subscription.callback.call(subscription.target, value, subscription);
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
            var i, temp, transientAttributes, attr, len, _ref, j, jLen, value,
                _resolveSingleValue = function(value){
                    if (value instanceof ko.Model) {
                        return value.url();
                    }

                    if (value && value.toJS) {
                        return value.toJS.apply(value);
                    }

                    return JSON.parse(JSON.stringify(value));
                };
            args = args || {};

            transientAttributes = {
                '_internals': false,
                '_lastFetched': false
            };

            _ref = this.transientAttributes;
            for (i = 0, len = _ref.length; i < len; ++i) {
                transientAttributes[_ref[i]] = false;
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

                    } else if (attr instanceof Array) {
                        value = [];
                        for(j=0, jLen=attr.length; j < jLen; j++){
                            value.push(_resolveSingleValue(attr[j]));
                        }
                        temp[i] = value;
                    } else if (typeof attr === 'object') {
                        temp[i] = _resolveSingleValue(attr);
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

            if (options.data === null && ['create', 'update'].indexOf(method_name) !== -1) {
                params.contentType = 'application/json';
                params.data = this.toJSON();
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

            if (model._internals.fetching !== false) {
                return model._internals.fetching;
            }

            options = options ? extend({}, options) : {};

            options.parse = options.parse === undefined ? true : options.parse;
            success = options.success;

            options.success = function(resp) {
                var i;

                if (!model.set(model.parse(resp, options), options)) {
                    return false;
                }

                setCache.call(model);

                model._lastFetched = new Date();
                if (success) {
                    success.call(model, resp, options);
                }

                model._internals.fetching = false;
            };

            this.notifySubscribers(this, 'beforeFetch');

            return model._internals.fetching = this._sync('read', options);
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
                model._lastFetched = new Date();
                if (success) {
                    success(resp, options);
                }
            };

            this.notifySubscribers(this, 'beforeSave');

            return this._sync(this.isNew() ? 'create' : 'update', options);
        },

        destroy: function() {
            this.notifySubscribers(this, 'beforeDestroy');

            ko.utils.arrayForEach(this._internals.attrSubscriptions, function (subscription) {
                subscription.dispose();
            });
            this._internals.attrSubscriptions = [];

            ko.utils.objectForEach(this._internals.subscriptions, function (event_name, events) {
                ko.utils.arrayForEach(events, function (subscription) {
                    if(subscription){
                        subscription.dispose();
                    }
                });
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
        var value = ko.observable(null),
            related;

        options = options || {};
        options.useCache = options.useCache === undefined ? true : options.useCache;

        related = ko.computed({
            read: value,
            write: function(val) {
                var instance = value(),
                    url = null,
                    cachedInstance = null;

                if (val instanceof related.model) {
                    url = val.url();
                } else {
                    val = related.model.prototype.parse.call(related.model.prototype, val || {});
                    url = related.model.prototype.url.call(related.model.prototype, val[related.model.prototype.idAttribute])
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

                if (val instanceof related.model) {
                    instance = val;
                } else if (cachedInstance) {
                    instance = cachedInstance;
                } else {
                    instance = new related.model(val, options);
                    if (options.autoFetch === true && instance._lastFetched === null && !instance.isNew()) {
                        instance.fetch();
                    }
                }

                setCache.call(instance);

                value(instance);
            },
            //deferEvaluation: true,  // this is actually causing lots of errors
            owner: this
        });

        related.model = model;

        return related;
    };

    // RelatedArray Class
    ko.RelatedArray = function RelatedArray(model, options) {
        var value = ko.observableArray([]),
            _oldMethods = {
                indexOf: value.indexOf,
                push: value.push,
                unshift: value.unshift,
                remove: value.remove,
                removeAll: value.removeAll,
                destroy: value.destroy,
                destroyAll: value.destroyAll
            },
            changeSubscription;

        value.buildInstance = function buildInstance(obj) {
            var val, url, instance;

            if (obj instanceof value.model) {
                return obj;
            }

            val = value.model.prototype.parse.call(value.model.prototype, obj || {});
            url = value.model.prototype.url.call(value.model.prototype, val[value.model.prototype.idAttribute]);

            if (options.useCache) {
                instance = ko.instanceCache.get(url) || new value.model(val, options);
            } else {
                instance = new value.model(val, options);
                if (options.autoFetch === true && instance._lastFetched === null && instance.get(value.model.prototype.idAttribute)) {
                    instance.fetch();
                }
            }

            setCache.call(instance);

            return instance;
        };

        options = options || {};
        options.useCache = options.useCache === undefined ? true : options.useCache;

        value.indexOf = function indexOf(obj) {
            var indexes,
                id;

            if (obj instanceof value.model) {
                return _oldMethods.indexOf.call(value, obj);
            } else if (typeof obj === 'object') {
                id = obj[value.model.__super__.idAttribute];
            } else {
                id = obj;
            }

            indexes = ko.utils.arrayMap(value(), function (instance) { return instance.get(instance.idAttribute); });
            return indexes.indexOf(id);
        };

        value.push = function push(obj) {
            obj = value.buildInstance(obj);

            return _oldMethods.push.call(value, obj);
        };

        value.unshift = function unshift(obj) {
            obj = value.buildInstance(obj);

            return _oldMethods.unshift.call(value, obj);
        };

        value.remove = function remove(obj) {
            var id;

            if (obj instanceof value.model || typeof obj === 'function') {
                return _oldMethods.remove.call(value, obj);
            } else if (typeof obj === 'object') {
                id = obj[value.model.__super__.idAttribute];
            } else {
                id = obj;
            }

            return _oldMethods.remove.call(
                value,
                function (instance) { return instance.get(instance.idAttribute) === id; }
            );
        };

        value.removeAll = function removeAll(obj) {
            return ko.utils.arrayMap(value(), value.remove);
        };

        value.destroy = function destroy(obj) {
            var id;

            if (obj instanceof value.model || typeof obj === 'function') {
                return _oldMethods.destroy.call(value, obj);
            } else if (typeof obj === 'object') {
                id = obj[value.model.__super__.idAttribute];
            } else {
                id = obj;
            }

            return _oldMethods.destroy.call(
                value,
                function (instance) { return instance.get(instance.idAttribute) === id; }
            );
        };

        value.destroyAll = function destroyAll(obj) {
            return ko.utils.arrayMap(value(), value.destroy);
        };

        changeSubscription = value.subscribe(function(val) {
            var i = val.length, item;
            while (i--) {
                if (!(val[i] instanceof value.model)) {
                    item = value.buildInstance(val[i]);
                    if (options.autoFetch === true && item._lastFetched === null && item.get(value.model.prototype.idAttribute)) {
                        item.fetch()
                    }
                    val[i] = item;
                }
            }
        });

        value.dispose = function() {
            changeSubscription.dispose();
        };

        value.model = model;

        return value;
    }
})
})(window, document, navigator, window["jQuery"]);
