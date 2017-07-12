define(['plugins/router', 'durandal/app'], function (router, app) {

    
    var selectedSubMenu = ko.observable('');
    var selectedMainMenu = ko.observable('main');
    var version = app.version;
    
    return {
        selectedSubMenu: selectedSubMenu,
        selectedMainMenu: selectedMainMenu,
        version: version,
        router: router,
        search: function () {
            //It's really easy to show a message box.
            //You can add custom options too. Also, it returns a promise for the user's response.
            app.showMessage('Search not yet implemented...');
        },
        activate: function () {
            router.map([
                { route: '', title: 'Dashboard', moduleId: 'viewmodels/dashboard', nav: true },
                { route: 'Aguda', title: 'Aguda', moduleId: 'viewmodels/aguda', nav: true },
                { route: 'HamInIsrael', title: 'Ham In Israel', moduleId: 'viewmodels/haminisrael', nav: true },
                { route: 'HagalMain', title: 'Hagal', moduleId: 'viewmodels/hagalmain', nav: true },
                { route: 'About', title: 'About', moduleId: 'viewmodels/about', nav: true },
                { route: 'Membership', title: 'Membership', moduleId: 'viewmodels/membership', nav: true },
                { route: 'Repeaters', title: 'Repeaters', moduleId: 'viewmodels/repeaters', nav: true },
                { route: 'Hagal', title: 'Hagal', moduleId: 'viewmodels/hagal', nav: true },
                { route: 'HagalArchive', title: 'Hagal Archive', moduleId: 'viewmodels/hagalarchive', nav: true },
                { route: 'Protocols', title: 'Protocols', moduleId: 'viewmodels/protocols', nav: true },
                { route: 'QSL', title: 'QSL', moduleId: 'viewmodels/qsl', nav: true },
                { route: 'Directors', title: 'Directors', moduleId: 'viewmodels/directors', nav: true },
                { route: 'Contact', title: 'Contact', moduleId: 'viewmodels/contact', nav: true },
                { route: 'Ham', title: 'Ham', moduleId: 'viewmodels/ham', nav: true },
                { route: 'Regulations', title: 'Regulations', moduleId: 'viewmodels/regulations', nav: true },
                { route: 'EchoLink', title: 'EchoLink', moduleId: 'viewmodels/echolink', nav: true },
                { route: 'WWFF', title: 'WWFF', moduleId: 'viewmodels/wwff', nav: true },
                { route: 'Freq', title: 'Freq', moduleId: 'viewmodels/freq', nav: true },
                { route: 'Bandplan', title: 'Bandplan', moduleId: 'viewmodels/english/freq', nav: true },
                { route: 'Onairhagal', title: 'Onairhagal', moduleId: 'viewmodels/onairhagal', nav: true },
                { route: 'Holyland', title: 'Holyland', moduleId: 'viewmodels/holyland', nav: true },
                { route: 'News', title: 'News', moduleId: 'viewmodels/news', nav: true },
                { route: 'Emergency', title: 'Emergency', moduleId: 'viewmodels/emergency', nav: true },
                { route: 'CEPT', title: 'CEPT', moduleId: 'viewmodels/english/cept', nav: true },
                { route: '4X4Z', title: '4X4Z', moduleId: 'viewmodels/english/4x4z', nav: true },
                { route: '4Z8', title: '4Z8', moduleId: 'viewmodels/english/4z8', nav: true },
                { route: 'HolylandContest', title: 'Holyland Contest', moduleId: 'viewmodels/holyland/holylandcontest', nav: true },
                { route: 'HolylandAward', title: 'Holyland Award', moduleId: 'viewmodels/holyland/holylandaward', nav: true },
                { route: 'HolylandResults', title: 'Holyland Contest Results', moduleId: 'viewmodels/holyland/holylandresults', nav: true },
                { route: 'HolylandResultsISR', title: 'Holyland Contest Results - Israeli Stations', moduleId: 'viewmodels/holyland/holylandresults_isr', nav: true },
                { route: 'LogUpload', title: 'Log Upload', moduleId: 'viewmodels/holyland/logupload', nav: true },
                { route: 'SilentKeyForest', title: 'Silent Key Forest', moduleId: 'viewmodels/english/skf', nav: true },
                { route: 'Meetings', title: 'Meetings', moduleId: 'viewmodels/english/meetings', nav: true },
                { route: 'EN_Membership', title: 'Membership', moduleId: 'viewmodels/english/membership', nav: true },
                { route: 'Beacons', title: 'Beacons', moduleId: 'viewmodels/english/beacons', nav: true },
                { route: 'EN_Repeaters', title: 'Repeaters', moduleId: 'viewmodels/english/repeaters', nav: true },
                { route: 'PA', title: 'Private Area', moduleId: 'viewmodels/pa', nav: true },
                { route: 'Media', title: 'Media', moduleId: 'viewmodels/media', nav: true },
                { route: 'DXpeditions', title: 'DXpeditions', moduleId: 'viewmodels/dxpeditions', nav: true },
                { route: 'NewsManager', title: 'News Manager', moduleId: 'viewmodels/back_office/newsmanager', nav: false },
                { route: 'Market', title: 'Market', moduleId: 'viewmodels/market', nav: true },
                { route: 'Register', title: 'Register', moduleId: 'viewmodels/register', nav: true },
                { route: 'OnlineCourse', title: 'Online Course', moduleId: 'viewmodels/onlinecourse', nav: true },
                { route: 'Shop', title: 'Shop', moduleId: 'viewmodels/shop', nav: true },
                { route: 'Import', title: 'Import', moduleId: 'viewmodels/import', nav: true },
                { route: 'Exams', title: 'Exams', moduleId: 'viewmodels/exams', nav: true },
                { route: 'Squares', title: 'Squares', moduleId: 'viewmodels/squares', nav: true },
                { route: 'HolylandSquares', title: 'Holyland Squares', moduleId: 'viewmodels/holyland/holylandsquares', nav: true },
				{ route: 'HolylandLogs', title: 'Holyland Logs', moduleId: 'viewmodels/holyland/holylandlogs', nav: true },
                { route: 'Certificategenerator', title: 'Certificate Generator', moduleId: 'viewmodels/holyland/certificategenerator', nav: true },
                { route: 'HolylandRules', title: 'Holyland Rules', moduleId: 'viewmodels/holyland/holylandrules', nav: true },
                { route: 'Gallery', title: 'Gallery', moduleId: 'viewmodels/gallery', nav: true },
                
            ]).buildNavigationModel();

            return router.activate();
        },
        compositionComplete: function () {
            !function (d, s, id) { var js, fjs = d.getElementsByTagName(s)[0], p = /^http:/.test(d.location) ? 'http' : 'https'; if (!d.getElementById(id)) { js = d.createElement(s); js.id = id; js.src = p + "://platform.twitter.com/widgets.js"; fjs.parentNode.insertBefore(js, fjs); } }(document, "script", "twitter-wjs");
        }
    };
});