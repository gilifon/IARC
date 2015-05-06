define(['plugins/router', 'durandal/app', 'services/cachingService', 'services/utilities', 'services/displayService', 'services/themeManager'],
    function (router, app, cachingService, utilities, displayService, themeManager) {


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
        router.navigate('');
    }


    return {
        router: router,
        logout: logout,
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        isLoggedIn: isLoggedIn,
        isAdmin: isAdmin,
        role: role,
        Image: Image,
        router: router,
        setTheme: themeManager.switch_style,
        compositionComplete: function () {
            themeManager.set_style_from_cookie();
        },
        activate: function () {
            router.map([

                { route: 'lessonsmanager', title: 'ניהול שיעורים', moduleId: 'viewmodels/lessonsmanager', nav: false, visible: false, admin: true, restricted: false },
                { route: 'usersmanager', title: 'ניהול משתמשים', moduleId: 'viewmodels/usersmanager', nav: false, visible: false, admin: true, restricted: false },
                { route: 'presentationsmanager', title: 'ניהול מצגות', moduleId: 'viewmodels/presentationsmanager', nav: false, visible: false, admin: true, restricted: false },
                { route: 'examsmanager', title: 'ניהול מבחנים', moduleId: 'viewmodels/examsmanager', nav: false, visible: false, admin: true, restricted: false },
                { route: 'linksmanager', title: 'ניהול קישורים', moduleId: 'viewmodels/linksmanager', nav: false, visible: false, admin: true, restricted: false },
                { route: 'filesmanager', title: 'ניהול קבצים', moduleId: 'viewmodels/filesmanager', nav: false, visible: false, admin: true, restricted: false },
                

                { route: 'forum', title: 'פורום', moduleId: 'viewmodels/forum', nav: true, visible: false, admin: false, restricted: true },
                { route: 'files', title: 'קבצים', moduleId: 'viewmodels/files', nav: true, visible: false, admin: false, restricted: false },
                { route: 'links', title: 'קישורים', moduleId: 'viewmodels/links', nav: true, visible: false, admin: false, restricted: false },
                { route: 'exams', title: 'מבחנים', moduleId: 'viewmodels/exams', nav: true, visible: false, admin: false, restricted: true },
                { route: 'presentations', title: 'מצגות', moduleId: 'viewmodels/presentations', nav: true, visible: false, admin: false, restricted: false },
                { route: 'lessons', title: 'שיעורים', moduleId: 'viewmodels/lessons', nav: true, visible: false, admin: false, restricted: false },
                { route: 'userdetails', title: 'שינוי סיסמה', moduleId: 'viewmodels/userdetails', nav: false, visible: false, admin: false, restricted: false },
              
                { route: '', title: 'התחבר', moduleId: 'viewmodels/login', nav: false, visible: false, admin: false, restricted: false },
                { route: 'home', title: 'דף הבית', moduleId: 'viewmodels/home', nav: false, visible: false, admin: false, restricted: false },





    //        { url: 'addusers', name: 'ניהול משתמשים', visible: false, admin: true, restricted: false },
    //{ url: 'filesmanager', name: 'ניהול קבצים', visible: false, admin: true, restricted: false },
    //            { url: 'addlinks', name: 'ניהול קישורים', visible: false, admin: true, restricted: false },
    //            { url: 'examsmanager', name: 'ניהול מבחנים', visible: false, admin: true, restricted: false },
    //            { url: 'addpresentations', name: 'ניהול מצגות', visible: false, admin: true, restricted: false },
    //            //{ url: 'addvideos', name: 'ניהול הרצאות', visible: false, admin: true , restricted: false },
    //            { url: 'lessonsmanager', name: 'ניהול שיעורים', visible: false, admin: true, restricted: false },
    //            { url: 'forum', name: 'פורום', visible: true, admin: false, restricted: true },
    //            { url: 'files', name: 'קבצים', visible: true, admin: false, restricted: false },
    //            { url: 'links', name: 'קישורים', visible: true, admin: false, restricted: false },
    //            { url: 'exams', name: 'מבחנים', visible: true, admin: false, restricted: true },
    //            { url: 'presentations', name: 'מצגות', visible: true, admin: false, restricted: false },
    //            //{ url: 'videos', name: 'הרצאות', visible: true, admin: false , restricted: false },
    //            { url: 'lessons', name: 'שיעורים', visible: true, admin: false, restricted: false },
    //            { url: 'userdetails', name: 'שינוי סיסמה', visible: false, admin: false, restricted: false },
    //            { url: 'login', name: 'התחבר', visible: false, admin: false, restricted: false },
    //            { url: 'home', name: 'ברוכים הבאים', visible: false, admin: false, restricted: false },
    //            { url: 'audit', name: 'לוג', visible: false, admin: false, restricted: false }
            ]).buildNavigationModel();
         
            router.guardRoute = function (routeInfo, params) {
                var _isLoggedIn = cachingService.get('isLoggedIn');
                var _isAdmin = cachingService.get('isAdmin');
                isLoggedIn(_isLoggedIn === "1");
                isAdmin(_isAdmin === "1");
                role(cachingService.get('role'));

                //if the user requests for login page 
                if (params.fragment === "") {
                    //if he is already logged in -> redirect back home
                    if (isLoggedIn()) {
                        return "#home";
                    }
                    else {
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
                else if (routeInfo.admin) {
                    if (isLoggedIn() && isAdmin()) {
                        firstName(cachingService.get('firstname'));
                        lastName(cachingService.get('lastname'));
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
                    //do not let restricted users to navigate to restricted pages
                else if (routeInfo.restricted) {
                    if (role() == 'restricted')
                        return false;
                    else if (isLoggedIn()) {
                        firstName(cachingService.get('firstname'));
                        lastName(cachingService.get('lastname'));
                        return true;
                    }
                }
                    //else, for any other page -> check if he is logged in
                else {
                    if (isLoggedIn()) {
                        firstName(cachingService.get('firstname'));
                        lastName(cachingService.get('lastname'));
                        return true;
                    }
                    else {
                        return false;
                    };
                }
            };

            return router.activate('');
        }
    };
});