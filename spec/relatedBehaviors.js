
describe('Related Models', function() {
    it('Should be null until written to', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern);
                },
                urlRoot: '/internsa'
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
                urlRoot: '/internsb'
            }),
            shelly = new Intern();

        shelly.boss(new Intern({id:2}));

        expect(shelly.boss() instanceof Intern).toEqual(true);

        expect(shelly.boss()[Intern.prototype.idAttribute]).toEqual(2);
    });

    it('Should always the same if a cache is used', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern, {useCache:true});
                },
                urlRoot: '/internsc'
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
                urlRoot: '/internsd'
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
                urlRoot: '/internse'
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
                urlRoot: '/internsf'
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
});

describe('RelatedArrays', function() {
    it('Should only push instances', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                },
                urlRoot: '/internsg'
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
                urlRoot: '/internsh'
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
                urlRoot: '/internsi'
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
                urlRoot: '/internsj'
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
                urlRoot: '/internsk'
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
});