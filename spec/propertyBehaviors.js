
describe('Properties', function() {
    it('Should be set on instantiation if they are created', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.age = null;
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                }
            }),
            shelly = new Intern({
                'first_name':'Shelly',
                'last_name': 'Jones',
                'age': 22
             });

        expect(shelly.first_name()).toEqual('Shelly');
        expect(shelly.name()).toEqual('Shelly Jones');
        expect(shelly.age).toEqual(22);
    });

    it('Should be writable via Model.set() and property call', function () {
        var Employee = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                }
            }),
            bob = new Employee();
            bob.first_name('Bob')
            bob.set({
                last_name: 'Smith'
            });

        expect(bob.first_name()).toEqual('Bob');
        expect(bob.first_name()).toEqual(bob.get('first_name'));
        expect(bob.last_name()).toEqual('Smith');
        expect(bob.last_name()).toEqual(bob.get('last_name'));
    });

    it('Should be readable via Model.get() and property call', function () {
        var Employee = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                }
            }),
            bob = new Employee();
            bob.first_name('Bob')

        expect(bob.first_name()).toEqual('Bob');
        expect(bob.first_name()).toEqual(bob.get('first_name'));
    });

    it('Should be reset to defaults on clear()', function () {
        var Employee = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                },

                defaults: {
                    first_name: 'Bob',
                    last_name: 'Smith'
                }
            }),
            bob = new Employee({
                'first_name':'Shelly',
                'last_name': 'Jones'
             });
            bob.first_name('Shelly')

        expect(bob.first_name()).toEqual('Shelly');
        expect(bob.last_name()).toEqual('Jones');

        bob.clear();
        expect(bob.first_name()).toEqual('Bob');
        expect(bob.last_name()).toEqual('Smith');
    });

    it('Should return null for Model.get() on a non-existant property', function () {
        var Employee = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                }
            }),
            bob = new Employee();

        expect(bob.get('hobby')).toEqual(null);
    });

    it('Should parse if specified on instantiation', function () {
        var Employee = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                },
                parse: function (val) {
                    val.last_name = 'Smith';
                    return val;
                }
            }),
            bob = new Employee({first_name: 'Bob'}, {parse: true});

        expect(bob.get('first_name')).toEqual('Bob');
        expect(bob.get('last_name')).toEqual('Smith');
    });

    it('Should parse if specified on set', function () {
        var Employee = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                },
                parse: function (val) {
                    val.last_name = 'Smith';
                    return val;
                }
            }),
            bob = new Employee();

        expect(bob.get('last_name')).toEqual(null);

        bob.set({first_name: 'Bob'}, {parse: true});

        expect(bob.get('first_name')).toEqual('Bob');
        expect(bob.get('last_name')).toEqual('Smith');
    });
});
