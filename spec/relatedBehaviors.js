
// Promises for Knockout observables thanks to:
// https://github.com/knockout/knockout/wiki/Use-an-observable-as-a-jQuery-promise
ko.when = function(observable) {
    var deferred = $.Deferred(),
        value = observable.peek(),
        subs;

    if (value !== null && value !== undefined) {
        deferred.resolve(value);
    } else {
        subs = observable.subscribe(function(newValue) {
            if (newValue !== null && newValue !== undefined) {
                subs.dispose();
                deferred.resolve(newValue);
            }
        });
    }
    return deferred;
};

function timeString() {
    return (new Date()).toISOString();
}

describe('Related Models', function() {
    it('Should be null until written to', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern);
                },
                urlRoot: timeString()
            }),
            shelly = new Intern();

        expect(shelly.boss()).toEqual(null);

        shelly.boss(1);

        expect(shelly.boss()[shelly.idAttribute]).toEqual(1);
    });

    it('Should always be an instance', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern);
                },
                urlRoot: timeString()
            }),
            shelly = new Intern();

        shelly.boss(new Intern({id:2}));

        expect(shelly.boss() instanceof Intern).toEqual(true);

        expect(shelly.boss()[Intern.prototype.idAttribute]).toEqual(2);
    });

    it('Should always be the same if a cache is used', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern, {useCache:true});
                },
                urlRoot: timeString()
            }),
            shelly = new Intern(),
            boss = null;

        shelly.boss(2);

        expect(shelly.boss() instanceof Intern).toEqual(true);

        expect(shelly.boss()[Intern.prototype.idAttribute]).toEqual(2);

        boss = shelly.boss();

        shelly.boss(2);

        boss.first_name('bob');

        expect(shelly.boss().first_name()).toEqual(boss.first_name());
    });


    it('Should never be the same if a cache is not used', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern, {useCache:false});
                },
                urlRoot: timeString()
            }),
            shelly = new Intern(),
            boss = null;

        shelly.boss(2);

        expect(shelly.boss() instanceof Intern).toEqual(true);

        expect(shelly.boss()[Intern.prototype.idAttribute]).toEqual(2);

        boss = shelly.boss();

        shelly.boss(new Intern({id:2}));

        boss.first_name('bob');

        expect(shelly.boss().first_name()).toNotEqual(boss.first_name());
    });

    it('Should not destroy if cache is used to lookup the same instance', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern, {useCache: true, overwriteDestroys: true});
                },
                urlRoot: timeString()
            }),
            shelly = new Intern(),
            boss = null;

        shelly.boss(2);

        expect(shelly.boss() instanceof Intern).toEqual(true);

        expect(shelly.boss()[Intern.prototype.idAttribute]).toEqual(2);

        boss = shelly.boss();

        shelly.boss(2);

        expect(boss._destroy).toEqual(false);

        boss.first_name('bob');

        expect(shelly.boss().first_name()).toEqual(boss.first_name());
    });


    it('Should destroy on a cache miss', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern, {useCache: true, overwriteDestroys: true});
                },
                urlRoot: timeString()
            }),
            shelly = new Intern(),
            boss = null;

        shelly.boss(2);

        expect(shelly.boss() instanceof Intern).toEqual(true);

        expect(shelly.boss()[Intern.prototype.idAttribute]).toEqual(2);

        boss = shelly.boss();

        shelly.boss(3);

        expect(boss._destroy).toEqual(true);

        boss.first_name('bob');

        expect(shelly.boss().first_name()).toNotEqual(boss.first_name());
    });

    it('Should load when accessed (autoFetch === "onRead")', function () {
        var urlRoot = timeString(),
            Intern = ko.Model.extend({
                transientAttributes: ['boss'],
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern, {autoFetch: 'onRead'});
                },

                urlRoot: urlRoot
            }),
            shelly = new Intern({id: 1});


        spyOn($, 'ajax').andCallFake(function(options) {
            setTimeout(function () {
                expect(options.type).toEqual('GET');
                if (options.url === urlRoot + '/1') {
                    options.success({
                        id: 1,
                        first_name: "Shelly",
                        last_name: "Smith",
                        boss: 2
                    });
                } else if  (options.url === urlRoot + '/2') {
                    options.success({
                        id: 2,
                        first_name: "Bob",
                        last_name: "Jones",
                        boss: null
                    });
                }
            });
        });

        runs(function() {
            shelly.fetch();
        });

        waitsFor(function() {
            return shelly._lastFetched !== null;
        });

        runs(function() {
            expect(shelly.toJS()).toEqual({
                    first_name: "Shelly",
                    last_name: "Smith",
                    id: 1
                });
            expect(shelly._lastFetched).toNotEqual(null);

            expect(shelly.boss()._lastFetched).toEqual(null);

            // Kick off the autoFetch
            shelly.boss().first_name();
        });

        waitsFor(function() {
            return shelly.boss()._lastFetched !== null;
        });

        runs(function() {
            expect(shelly.boss().toJS()).toEqual({
                first_name: "Bob",
                last_name: "Jones",
                id: 2
            });
        });
    });

    it('Should load the model if a factory is passed', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                },
                urlRoot: timeString()
            }),
            flag = false,
            modelFactory = function(val, cb) { flag = true; return cb(Intern); },
            relatedIntern = ko.RelatedModel(modelFactory, {autoFetch: false});

        runs(function() {
            expect(relatedIntern()).toEqual(null);
            expect(relatedIntern() instanceof Intern).toEqual(false);

            // create an instance
            relatedIntern({id: 1});
        });

        waitsFor(function() {
            return flag;
        });

        runs(function() {
            expect(relatedIntern() instanceof Intern).toEqual(true);
            expect(relatedIntern().toJS()).toEqual({id: 1});
        });
    });

    it('Should trigger deferred on load of model if a factory is passed', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                },
                urlRoot: timeString()
            }),
            flag = false,
            modelFactory = function(val, cb) { cb(Intern); },
            relatedIntern = ko.RelatedModel(modelFactory, {autoFetch: false});

        runs(function() {
            expect(relatedIntern()).toEqual(null);
            expect(relatedIntern() instanceof Intern).toEqual(false);

            // create an instance
            ko.when(relatedIntern).then(
                function modelLoaded(instance) {
                    expect(instance.toJS()).toEqual({
                        first_name: "William",
                        last_name: "Wallace",
                        id: 1
                    });
                    flag = true;
                },
                function errorLoadingModel(err) {
                    expect(false).toEqual(true);
                }
            );

            relatedIntern({id: 1, first_name:"William", last_name:"Wallace"})
        });

        waitsFor(function() {
            return flag;
        });

        runs(function() {
            expect(relatedIntern().toJS()).toEqual({
                first_name: "William",
                last_name: "Wallace",
                id: 1
            });
        });
    });
});

describe('RelatedArrays', function() {
    it('Should only push instances', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                },
                urlRoot: timeString()
            }),
            interns = ko.RelatedArray(Intern);

        interns.push(3);
        interns.push({id:6, first_name:'Shelly'});
        interns.push(new Intern({id:9, first_name:'Shelly'}));

        expect(interns()[0] instanceof Intern).toEqual(true);
        expect(interns()[1] instanceof Intern).toEqual(true);
        expect(interns()[2] instanceof Intern).toEqual(true);

        expect(interns()[0].id).toEqual(3);
        expect(interns()[1].id).toEqual(6);
        expect(interns()[2].id).toEqual(9);
    });

    it('Should only unshift instances', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                },
                urlRoot: timeString()
            }),
            interns = ko.RelatedArray(Intern);

        interns.unshift(3);
        interns.unshift({id:6, first_name:'Shelly'});
        interns.unshift(new Intern({id:9, first_name:'Shelly'}));

        expect(interns()[0] instanceof Intern).toEqual(true);
        expect(interns()[1] instanceof Intern).toEqual(true);
        expect(interns()[2] instanceof Intern).toEqual(true);

        expect(interns()[0].id).toEqual(9);
        expect(interns()[1].id).toEqual(6);
        expect(interns()[2].id).toEqual(3);
    });

    it('Should be able to tell the index of a member instance by ID.', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                },
                urlRoot: timeString()
            }),
            interns = ko.RelatedArray(Intern);

        interns.push({id:3, first_name:'Bob'});
        interns.push({id:6, first_name:'Shelly'});

        expect(interns.indexOf(3)).toEqual(0);
        expect(interns.indexOf(6)).toEqual(1);
    });

    it('Should remove an instance based on ID', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                },
                urlRoot: timeString()
            }),
            interns = ko.RelatedArray(Intern);

        interns.push({id:3, first_name:'Bob'});
        interns.push({id:6, first_name:'Shelly'});
        interns.push({id:9, first_name:'Joe'});

        expect(interns.indexOf(3)).toEqual(0);
        expect(interns.indexOf(6)).toEqual(1);
        expect(interns.indexOf(9)).toEqual(2);

        interns.remove(6);

        expect(interns.indexOf(3)).toEqual(0);
        expect(interns.indexOf(9)).toEqual(1);
    });

    it('Should destroy an instance based on ID', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                },
                urlRoot: timeString()
            }),
            interns = ko.RelatedArray(Intern);

        interns.push({id:3, first_name:'Bob'});
        interns.push({id:6, first_name:'Shelly'});
        interns.push({id:9, first_name:'Joe'});

        expect(interns()[0]._destroy).toEqual(false);
        expect(interns()[1]._destroy).toEqual(false);
        expect(interns()[2]._destroy).toEqual(false);

        interns.destroy(6);

        expect(interns()[0]._destroy).toEqual(false);
        expect(interns()[1]._destroy).toEqual(true);
        expect(interns()[2]._destroy).toEqual(false);
    });

    it('Should load when accessed (autoFetch === "onRead")', function () {
        var urlRoot = timeString(),
            Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                },
                urlRoot: urlRoot
            }),
            interns = ko.RelatedArray(Intern, {autoFetch: 'onRead'});

        interns.push({id:1});
        interns.push({id:2});

        spyOn($, 'ajax').andCallFake(function(options) {
            setTimeout(function () {
                expect(options.type).toEqual('GET');
                if (options.url === urlRoot + '/1') {
                    options.success({
                        id: 1,
                        first_name: "Shelly",
                        last_name: "Smith"
                    });
                } else if  (options.url === urlRoot + '/2') {
                    options.success({
                        id: 2,
                        first_name: "Bob",
                        last_name: "Jones"
                    });
                }
            });
        });

        runs(function() {
            expect(interns().length).toEqual(2);
            expect(interns()[0]._lastFetched).toEqual(null);
            expect(interns()[1]._lastFetched).toEqual(null);

            // trigger fetching
            interns()[0].first_name();
            interns()[1].first_name();
        });

        waitsFor(function() {
            return interns()[0]._lastFetched !== null && interns()[1]._lastFetched !== null;
        });

        runs(function() {
            expect(interns()[0].toJS()).toEqual({
                first_name: "Shelly",
                last_name: "Smith",
                id: 1
            });

            expect(interns()[1].toJS()).toEqual({
                first_name: "Bob",
                last_name: "Jones",
                id: 2
            });
        });
    });
});
