requirejs.config({
    paths: {
        'text': 'durandal/amd/text'
    }
});

define(function (require) {
    
    var app = require('durandal/app'),
    viewLocator = require('durandal/viewLocator'),
    system = require('durandal/system'),
    router = require('durandal/plugins/router');

    system.debug(true);
    
    app.title = 'אגודת חובבי הרדיו בישראל - קורס מתוקשב';
    app.start().then(function () {

        viewLocator.useConvention();
        router.useConvention();

        app.adaptToDevice();
        app.setRoot('viewmodels/shell');
    });
});