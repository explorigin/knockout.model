
describe('Related Models', function() {
    it('Should be null until written to', function () {
        var Intern = ko.Model.extend({
                initialize: function () {
                    this.first_name = ko.observable();
                    this.last_name = ko.observable();
                    this.boss = ko.RelatedModel(Intern);
                }
            }),
            shelly = new Intern();

        expect(shelly.boss()).toEqual(null);

        shelly.boss(1);

        expect(shelly.boss() instanceof Intern).toEqual(true);

        expect(shelly.boss()[shelly.idAttribute]).toEqual(1);
    });
});
