
describe('Properties', function() {
    it('Should be set on instantiation if they are created', function () {
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
            Intern = ko.Model.extend({
                initialize: function () {
                    var self = this;

                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.age = null;
                    this.name = ko.computed(function () {
                        return self.first_name() + " " + self.last_name();
                    });
                }
            });

        var bob = new Employee({
            'first_name':'Bob',
            'last_name': 'Smiley',
            'age': 33
         });

        expect(bob.first_name()).toEqual('Bob');
        expect(bob.name()).toEqual('Bob Smiley');
        expect(bob.age).toEqual(undefined);

        var shelly = new Intern({
            'first_name':'Shelly',
            'last_name': 'Frowny',
            'age': 22
         });

        expect(shelly.first_name()).toEqual('Shelly');
        expect(shelly.name()).toEqual('Shelly Frowny');
        expect(shelly.age).toEqual(22);
    });
});
