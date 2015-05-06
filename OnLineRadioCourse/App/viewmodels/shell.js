/// <reference path="/Scripts/jquery-1.9.1.js" />
/// <reference path="/Scripts/knockout-2.2.1.debug.js" />
/// <reference path="/Scripts/amplify-vsdoc.js" />
/// <reference path="/durandal/plugins/router.js" />

define(function (require) {

   

    // require
    this.router = require('durandal/plugins/router');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');
    this.displayService = require('services/displayService');
    this.themeManager = require('services/themeManager');

    //properties
    var isLoggedIn = ko.observable(false);
    var isAdmin = ko.observable(false);
    var firstName = ko.observable('');
    var lastName = ko.observable('');
    var role = ko.observable('user');
    var fullName = ko.computed(function () { return firstName() + " " + lastName(); }, this);
    var Image = 'Content/images/iarc_logo.gif';

    //methods
    this.logout = function () {
        isLoggedIn(false);
        cachingService.add('username', null);
        cachingService.add('password', null);
        cachingService.add('isLoggedIn', null);
        cachingService.add('isAdmin', null);
        cachingService.add('role', null);
        router.replaceLocation('#/login');
    }

    return {
        logout:logout,
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        isLoggedIn: isLoggedIn,
        isAdmin: isAdmin,
        role:role,
        Image: Image,
        router: router,
        setTheme: themeManager.switch_style,
        viewAttached: function () {
            themeManager.set_style_from_cookie();
        },
        activate: function () {
            //map routes
            router.map([
                { url: 'addusers', name: 'ניהול משתמשים', visible: false, admin: true, restricted: false },
                { url: 'filesmanager', name: 'ניהול קבצים', visible: false, admin: true, restricted: false },
                { url: 'addlinks', name: 'ניהול קישורים', visible: false, admin: true, restricted: false },
                { url: 'examsmanager', name: 'ניהול מבחנים', visible: false, admin: true, restricted: false },
                { url: 'addpresentations', name: 'ניהול מצגות', visible: false, admin: true, restricted: false },
                //{ url: 'addvideos', name: 'ניהול הרצאות', visible: false, admin: true , restricted: false },
                { url: 'lessonsmanager', name: 'ניהול שיעורים', visible: false, admin: true, restricted: false },
                { url: 'forum', name: 'פורום', visible: true, admin: false, restricted: true },
                { url: 'files', name: 'קבצים', visible: true, admin: false, restricted: false },
                { url: 'links', name: 'קישורים', visible: true, admin: false, restricted: false },
                { url: 'exams', name: 'מבחנים', visible: true, admin: false, restricted: true },
                { url: 'presentations', name: 'מצגות', visible: true, admin: false, restricted: false },
                //{ url: 'videos', name: 'הרצאות', visible: true, admin: false , restricted: false },
                { url: 'lessons', name: 'שיעורים', visible: true, admin: false, restricted: false },
                { url: 'userdetails', name: 'שינוי סיסמה', visible: false, admin: false, restricted: false },
                { url: 'login', name: 'התחבר', visible: false, admin: false, restricted: false },
                { url: 'home', name: 'ברוכים הבאים', visible: false, admin: false, restricted: false },
                { url: 'audit', name: 'לוג', visible: false, admin: false, restricted: false }
            ]);

            //guard routes
            router.guardRoute = function (routeInfo, params, instance) {
                var _isLoggedIn = cachingService.get('isLoggedIn');
                var _isAdmin = cachingService.get('isAdmin');
                isLoggedIn(_isLoggedIn === "1");
                isAdmin(_isAdmin === "1");
                role(cachingService.get('role'));

                //if the user requests for login page 
                if (routeInfo.url === "login")
                {
                    //if he is already logged in -> redirect back home
                    if (isLoggedIn())
                    {
                        return "#/home";
                    }
                    else
                    {
                        //else, logout and stay in login page
                        cachingService.add('username', null);
                        cachingService.add('password', null);
                        cachingService.add('firstname', null);
                        cachingService.add('lastname', null);
                        cachingService.add('isLoggedIn', null);
                        cachingService.add('isAdmin', null);
                        return true;
                    }
                }
                //if the user requests for one of the admin pages
                else if (routeInfo.admin)
                {
                    if (instance !== 'undefined' && isLoggedIn() && isAdmin())
                    {
                        firstName(cachingService.get('firstname'));
                        lastName(cachingService.get('lastname'));
                        return true;
                    }
                    else
                    {
                        if (!isLoggedIn())
                        {
                            return false;
                        }
                        if (!isAdmin())
                        {
                            displayService.display('דף זה נגיש למשתמשים מורשים בלבד!', 'error');
                        }
                        return false;
                    }
                }
                    //do not let restricted users to navigate to restricted pages
                else if (routeInfo.restricted)
                {
                    if (role() == 'restricted')
                        return false;
                    else if (instance !== 'undefined' && isLoggedIn()) {
                        firstName(cachingService.get('firstname'));
                        lastName(cachingService.get('lastname'));
                        return true;
                    }
                }
                    //else, for any other page -> check if he is logged in
                else
                {
                    if (instance !== 'undefined' && isLoggedIn()) {
                        firstName(cachingService.get('firstname'));
                        lastName(cachingService.get('lastname'));
                        return true;
                    }
                    else {
                        return false;
                    };
                }
            };

            return router.activate('login');
        }
    };
});
