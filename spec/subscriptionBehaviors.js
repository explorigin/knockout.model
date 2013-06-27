
describe('Subscription', function() {
    it('Should fire when a subscribable property changes', function () {
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
                subscribableAttributes: ['first_name']
            }),
            shelly = new Intern(),
            output = null;

        shelly.subscribe(function(value) {
            output = value;
        });

        runs(function() {
            shelly.set({first_name: 'Shelly'});
        });

        waitsFor(function() {
            return output !== null;
        });

        runs(function() {
            expect(output).toEqual({
                first_name: "Shelly"
            });
        });
    });

    it('Should clean up all subscriptions when disposed', function () {
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
                subscribableAttributes: ['first_name']
            }),
            shelly = new Intern(),
            output = null;

        expect(shelly._internals.subscriptions.length).toEqual(0);
        expect(shelly._internals.attrSubscriptions.length).toEqual(0);

        shelly.subscribe(function(value) {
            output = value;
        });

        expect(shelly._internals.subscriptions.length).toEqual(1);
        expect(shelly._internals.attrSubscriptions.length).toEqual(1);

        shelly.destroy();

        expect(shelly._internals.subscriptions.length).toEqual(0);
        expect(shelly._internals.attrSubscriptions.length).toEqual(0);
    });
});
