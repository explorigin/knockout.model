
describe('Transaction', function() {
    it('Should pause ko.subscribable notifications', function () {
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
                first_name: 'Shelly',
                last_name: 'Frowny',
                age: 22
            });

        expect(shelly.toJS()).toEqual({
            first_name: "Shelly",
            last_name: "Frowny",
            age: 22,
            name: "Shelly Frowny",
            id: null
        });

        shelly.startTransaction();

        expect(shelly.toJS()).toEqual({
            first_name: "Shelly",
            last_name: "Frowny",
            age: 22,
            name: "Shelly Frowny",
            id: null
        });

        shelly.first_name('Bob');

        expect(shelly.toJS()).toEqual({
            first_name: "Bob",
            last_name: "Frowny",
            age: 22,
            name: "Shelly Frowny",
            id: null
        });

        shelly.commit();

        expect(shelly.toJS()).toEqual({
            first_name: "Bob",
            last_name: "Frowny",
            age: 22,
            name: "Bob Frowny",
            id: null
        });
    });

    it('Should rollback data.', function () {
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
                first_name: 'Shelly',
                last_name: 'Frowny',
                age: 22
            });

        expect(shelly.toJS()).toEqual({
            first_name: "Shelly",
            last_name: "Frowny",
            age: 22,
            name: "Shelly Frowny",
            id: null
        });

        shelly.startTransaction();

        expect(shelly.toJS()).toEqual({
            first_name: "Shelly",
            last_name: "Frowny",
            age: 22,
            name: "Shelly Frowny",
            id: null
        });

        shelly.first_name('Bob');

        expect(shelly.toJS()).toEqual({
            first_name: "Bob",
            last_name: "Frowny",
            age: 22,
            name: "Shelly Frowny",
            id: null
        });

        shelly.rollback();

        expect(shelly.toJS()).toEqual({
            first_name: "Shelly",
            last_name: "Frowny",
            age: 22,
            name: "Shelly Frowny",
            id: null
        });
    });
});
