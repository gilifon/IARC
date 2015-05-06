define(['viewmodels/shell', 'plugins/router', 'durandal/app', 'services/utilities', 'services/cachingService'], function (shell, router, app, utilities, cachingService) {

    this.login = function () {
        cachingService.setLogin(false);
        $.ajax({
            type: "POST",
            url: "/ws/authenticate.php",
            headers: {
                "Authorization": utilities.getBase64Auth(shell.username(), shell.password())
            }
        }).done(function (data) {
            if (data.isAuthorized) {
                cachingService.setLogin(true);
                shell.isLoggedIn(true);
                shell.isAdmin(false);
                cachingService.add('Auth', utilities.getBase64Auth(shell.username(), shell.password()));
                shell.password('');
                router.navigate('#details');
            }
            else {
                shell.password('');
            }
        }).error(function (error) {
            shell.password('');
        });

        ///****** DEBUG ******/
        //if (shell.username() === "gil" && shell.password() === "123") {
        //    shell.isLoggedIn(true);
        //    router.navigate('#home');
        //}
        //else {
        //    shell.isLoggedIn(false);
        //    alert('wrong username/password combination');
        //}
        ///*******************/
    };

    var vm = {
        username: shell.username,
        password: shell.password,
        activate: function () {
        },
        compositionComplete: function ()
        {
            
        }
    };

    //Note: This module exports a function. That means that you, the developer, can create multiple instances.
    //This pattern is also recognized by Durandal so that it can create instances on demand.
    //If you wish to create a singleton, you should export an object instead of a function.
    //See the "flickr" module for an example of object export.

    return vm;
});