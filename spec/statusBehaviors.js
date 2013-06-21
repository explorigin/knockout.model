
describe('Status', function() {
    it('Should be new if the "idAttribute" is non-zero and falsey', function () {
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
            shelly = new Intern();

        expect(shelly.isNew()).toEqual(true);

        shelly.set({id:1});
        expect(shelly.isNew()).toEqual(false);
    });

    it('Should be valid by default', function () {
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
            shelly = new Intern();

        expect(shelly.validate()).toEqual(true);
    });


    it('Should allow custom validation', function () {
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
                validate: function() {
                    return this.first_name() === 'Bob';
                }
            }),
            shelly = new Intern({first_name:'Shelly'});

        expect(shelly.validate()).toEqual(false);
        shelly.first_name('Bob');
        expect(shelly.validate()).toEqual(true);
    });

});
