
define(function (require) {

    this.app = require('durandal/app');
    this.router = require('durandal/plugins/router');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    
    var username = ko.observable(cachingService.get('username'));
    var password = ko.observable("");

    var firstname = ko.observable(cachingService.get('firstname'));
    var lastname = ko.observable(cachingService.get('lastname'));
    var email = ko.observable(cachingService.get('email'));
    var isadmin = ko.observable(cachingService.get('isAdmin') === "1");
    var isloggedin = ko.observable(cachingService.get('isLoggedIn') === "1");
    var role = ko.observable(cachingService.get('role'));
    var course = ko.observable(cachingService.get('course'));

    var showLoginAlert = ko.observable(false);

    this.login = function () {
        showLoginAlert(false);
        $.ajax({
            type: "POST",
            url: "./Server/authenticate.php",
            headers: {
                "Authorization": utilities.getBase64Auth(username(), password())
            }
        }).done(function (data) {
            if (data.isAuthorized) {
                cachingService.add('username', username());
                cachingService.add('password', password());
                cachingService.add('firstname', data.firstname);
                cachingService.add('lastname', data.lastname);
                cachingService.add('email', data.email);
                cachingService.add('isAdmin', data.isadmin);
                cachingService.add('isLoggedIn', '1');
                cachingService.add('role', data.role);
                cachingService.add('course', data.course);

                firstname(cachingService.get('firstname'));
                lastname(cachingService.get('lastname'));
                email(cachingService.get('email'));
                isadmin(cachingService.get('isAdmin') === "1");
                isloggedin(cachingService.get('isLoggedIn') === "1");
                role(cachingService.get('role'));
                course(cachingService.get('course'));

                password('');

                router.navigateTo('#/home');
            }
            else {
                showLoginAlert(true);
                password('');
            }
        }).error(function (error) {
            showLoginAlert(true);
            password('');
        });

        ///****** DEBUG ******/
        //cachingService.add('username', username());
        //cachingService.add('password', password());
        //cachingService.add('isLoggedIn', '1');
        //router.navigateTo('#/home');
        ///*******************/
    };

    return {
        viewAttached: function() {
            $.placeholder.fix();
        },
        username: username,
        password: password,

        firstname: firstname,
        lastname: lastname,
        email: email,
        isadmin: isadmin,
        isloggedin: isloggedin,
        role: role,
        course: course,

        login: login,
        showLoginAlert: showLoginAlert
    };

});