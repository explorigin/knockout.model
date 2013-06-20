# Knockout.model plugin
Copyright 2011, Alisson Cavalcante Agiani

Licensed under the MIT license.

## Files:
* knockout.model.js

## Dependencies:
* jQuery 1.8.0+
* Knockout 2.1+

## Howto
* Override the urlRoot attribute to set your resource location
* Override the transientParameters attribute to set values that will not save(convert to json or to js)

## Model Methods
* obj.get(attr) - Gets the attribute value(whether observable or not)
* obj.set(object_with_values) - Sets attribute(s) value(s)(whether observable or not)
* obj.fetch(callback) - Loads model data from show url and sets itself with it
* obj.clear() - Clears all attributes(whether observable or not) and sets default values after
* obj.toJSON(obj) - Converts whole model to JSON format, optional parameter containing an object with attributes to be serialized(Example: {id: true,name:false})
* obj.toJS(obj) - Converts whole model to JS object representation, optional parameter containing an object with attributes to be serialized(Example: {id: true,name:false})
* obj.isNew() - True if model.id is empty, false if isn't
* obj.validate() - Implement your own function returning true or false
* obj.save(params,callback) - Creates or updates a model instance, calling validate() before
* obj.destroy(params,callback) - Deletes an existing model instance on the server, using the "destroy" key from the url object
* obj.start_transaction() - Disconnects the model of subscribers temporarily
* obj.commit() - Reconnects the model with its subscribers and notifies them

## Example(see docs for more details):
    var Employee = ko.Model.extend(
        initialize: function(super) { // inheriting KoModel to boost your own models!
            this.id = ko.observable("");
            this.name = ko.observable("John Doe");
            this.surname = ko.observable("");
            this.fullname = ko.computed(function() {
                return this.name() + " " + this.surname();
            }, this);
            this.birth_date = ko.observable("");
            this.address = ko.observable("");
            this.phone = ko.observable("");
            this.status = ko.observable("E");
            this.status_text = ko.computed(function() {
                 if(this.status() === "E") {
                    return "enabled";
                 } else {
                    return "disabled";
                 }
            }, this);
        },

        // We won't send status_text attribute to the server
        transientParameters: ["status_text"],

        urlRoot: "/employees",

        this.validate = function() {
            return(this.name() !== "" && this.surname() !== "" && this.birth_date() !== "");
        }
    });
