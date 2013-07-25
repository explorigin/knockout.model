
describe('Network', function() {
    it('Should load', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.age = null;
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                },

                urlRoot: '/interns'
            }),
            shelly = new Intern({id: 1}),
            finished = false;


        spyOn($, 'ajax').andCallFake(function(options) {
            setTimeout(function () {
                expect(options.type).toEqual('GET');
                expect(options.url).toEqual('/interns/1');

                options.success({
                    id: 1,
                    first_name: "Shelly",
                    last_name: "Smith",
                    age: 22
                });
            });
        });

        runs(function() {
            shelly.fetch({success: function() {
                finished = true;
            }});
        });

        waitsFor(function() {
            return finished;
        });

        runs(function() {
            expect(shelly.toJS()).toEqual({
                    first_name: "Shelly",
                    last_name: "Smith",
                    age: 22,
                    name: "Shelly Smith",
                    id: 1
                });
            expect(shelly._lastFetched).toNotEqual(null);
        });
    });

    it('Should save', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.age = null;
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                },

                urlRoot: '/interns'
            }),
            shelly = new Intern({
                id: 1,
                first_name: "Shelly",
                last_name: "Smith",
                age: 22
            }),
            finished = false;


        spyOn($, 'ajax').andCallFake(function(options) {
            setTimeout(function () {
                expect(options.type).toEqual('PUT');
                expect(options.url).toEqual('/interns/1');
                options.success({
                    id: 1,
                    first_name: "Shelly",
                    last_name: "Smith",
                    age: 22
                });
            });
        });

        runs(function() {
            shelly.save({success: function(data) {
                finished = data;
            }});
        });

        waitsFor(function() {
            return finished !== false;
        });

        runs(function() {
            expect(finished).toEqual({
                id: 1,
                first_name: "Shelly",
                last_name: "Smith",
                age: 22
            });
            expect(shelly._lastFetched).toNotEqual(null);
        });
    });

    it('Should create', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.age = null;
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                },

                urlRoot: '/interns'
            }),
            shelly = new Intern({
                first_name: "Shelly",
                last_name: "Smith",
                age: 22
            }),
            finished = false;


        spyOn($, 'ajax').andCallFake(function(options) {
            setTimeout(function () {
                expect(options.type).toEqual('POST');
                expect(options.url).toEqual('/interns');
                options.success({
                    id: 1,
                    first_name: "Shelly",
                    last_name: "Smith",
                    age: 22
                });
            });
        });

        runs(function() {
            shelly.save({success: function(data) {
                finished = data;
            }});
        });

        waitsFor(function() {
            return finished !== false;
        });

        runs(function() {
            expect(finished).toEqual({
                id: 1,
                first_name: "Shelly",
                last_name: "Smith",
                age: 22
            });
        });
    });
});
