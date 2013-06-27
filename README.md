## Knockout.Model plugin
Copyright 2013, Timothy Farrell

Inspired by Knockout.model plugin by Alisson Cavalcante Agiani

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
# Attributes
* obj.get(attr) - Gets the attribute value (whether observable or not)
* obj.set(object_with_values) - Sets attribute(s) value(s) (whether observable or not)
* obj.clear() - Clears all attributes and sets default values

# Status
* obj.isNew() - true if the idAttribute is empty
* obj.validate() - override to validate the object. Failed validation prevents a server save command.

# Serialization
* obj.toJSON() - Converts th model to a JSON string
* obj.toJS() - Converts whole model to JS object representation

# Network
* obj.fetch(options) - Loads model data from show url and sets itself with it
* obj.save(params,callback) - Creates or updates a model instance, calling validate() before
* obj.destroy(params,callback) - Deletes an existing model instance on the server, using the "destroy" key from the url object

# Transaction
* obj.startTransaction() - Disconnects the model of subscribers (observers will receive updates but computeds will not update)
* obj.commit() - Reconnects the model with its subscribers and notifies them
* obj.rollback() - Restores values from when start_transaction() was called and reconnects the model with its subscribers

For usage examples, please review the *behavior.js files under the spec/ directory.
