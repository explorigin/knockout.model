
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
