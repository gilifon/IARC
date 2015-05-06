define(['plugins/router', 'durandal/app', 'services/utilities', 'services/cachingService', 'services/displayService'], function (router, app, utilities, cachingService, displayService) {
    

    var username = ko.observable('');
    var password = ko.observable('');

    var isLoggedIn = ko.observable(false);
    var isAdmin = ko.observable(false);

    var selectedSubMenu = ko.observable('');
    var selectedMainMenu = ko.observable('main');
    var version = app.version;

    return {
        selectedSubMenu: selectedSubMenu,
        selectedMainMenu: selectedMainMenu,
        username: username,
        password: password,
        version: version,
        router: router,
        cachingService:cachingService,
        isLoggedIn: isLoggedIn,
        isAdmin: isAdmin,
        logout: function() {
            app.showMessage('תודה שגלשת באיזור האישי. להתראות.');
            cachingService.setLogin(false);
            isLoggedIn(false);
            cachingService.add('Auth', '');
            router.navigate('');
        },
        activate: function () {
            router.map([
                { route: '', title: 'Login', moduleId: 'viewmodels/login', nav: true, admin: false },
                { route: 'home', title: 'Dashboard', moduleId: 'viewmodels/dashboard', nav: true, admin: false },
                { route: 'details', title: 'פרטים אישיים', moduleId: 'viewmodels/details', nav: true, admin: false },
                { route: 'contact', title: 'צור קשר', moduleId: 'viewmodels/contact', nav: true, admin: false },
                { route: 'callbook', title: 'Callbook', moduleId: 'viewmodels/callbook', nav: true, admin: false },
                { route: 'payments', title: 'תשלומים', moduleId: 'viewmodels/payments', nav: true, admin: false }
            ]).buildNavigationModel();
            
            router.guardRoute = function (routeInfo, params) {
                isLoggedIn(cachingService.getLogin());
                //if the user requests for login page 
                if (params.fragment === "") {
                    //if he is already logged in -> redirect back to 'details'
                    if (isLoggedIn()) {
                        return "#details";
                    }
                    else {
                        //else, logout and stay in login page
                        //cachingService.add('username', null);
                        //cachingService.add('password', null);
                        //cachingService.add('firstname', null);
                        //cachingService.add('lastname', null);
                        //cachingService.add('isLoggedIn', null);
                        //cachingService.add('isAdmin', null);
                        return true;
                    }
                }
                    //if the user requests for one of the admin pages
                else if (routeInfo.admin) {
                    if (isLoggedIn() && isAdmin()) {
                        //firstName(cachingService.get('firstname'));
                        //lastName(cachingService.get('lastname'));
                        return true;
                    }
                    else {
                        if (!isLoggedIn()) {
                            return false;
                        }
                        if (!isAdmin()) {
                            displayService.display('דף זה נגיש למשתמשים מורשים בלבד!', 'error');
                        }
                        return false;
                    }
                }
                    //else, for any other page -> check if he is logged in
                else {
                    if (isLoggedIn()) {
                        //firstName(cachingService.get('firstname'));
                        //lastName(cachingService.get('lastname'));
                        return true;
                    }
                    else {
                        displayService.display('OOPS! You have to login first..', 'error');
                        return "#";
                    };
                }
            };

            return router.activate('');
        }
    };
});