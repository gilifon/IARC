define(["plugins/router","durandal/app"],function(e,t){var n=ko.observable(""),a=ko.observable("main"),r=t.version;return{selectedSubMenu:n,selectedMainMenu:a,version:r,router:e,search:function(){t.showMessage("Search not yet implemented...")},activate:function(){return e.map([{route:"",title:"Dashboard",moduleId:"viewmodels/dashboard",nav:!0},{route:"Aguda",title:"Aguda",moduleId:"viewmodels/aguda",nav:!0},{route:"Procedures",title:"Procedures",moduleId:"viewmodels/procedures",nav:!0},{route:"HamInIsrael",title:"Ham In Israel",moduleId:"viewmodels/haminisrael",nav:!0},{route:"HagalMain",title:"Hagal",moduleId:"viewmodels/hagalmain",nav:!0},{route:"About",title:"About",moduleId:"viewmodels/about",nav:!0},{route:"EventRegistration",title:"Event Registration",moduleId:"viewmodels/event_registration",nav:!0},{route:"EventRegistrationAdmin",title:"Event Registration Admin",moduleId:"viewmodels/event_registration_admin",nav:!1},{route:"Membership",title:"Membership",moduleId:"viewmodels/membership",nav:!0},{route:"Repeaters",title:"Repeaters",moduleId:"viewmodels/repeaters",nav:!0},{route:"RepeatersMap",title:"Repeaters Map",moduleId:"viewmodels/repeatersmap",nav:!0},{route:"Hagal",title:"Hagal",moduleId:"viewmodels/hagal",nav:!0},{route:"HagalArchive",title:"Hagal Archive",moduleId:"viewmodels/hagalarchive",nav:!0},{route:"Protocols",title:"Protocols",moduleId:"viewmodels/protocols",nav:!0},{route:"QSL",title:"QSL",moduleId:"viewmodels/qsl",nav:!0},{route:"Directors",title:"Directors",moduleId:"viewmodels/directors",nav:!0},{route:"Contact",title:"Contact",moduleId:"viewmodels/contact",nav:!0},{route:"Ham",title:"Ham",moduleId:"viewmodels/ham",nav:!0},{route:"Regulations",title:"Regulations",moduleId:"viewmodels/regulations",nav:!0},{route:"EchoLink",title:"EchoLink",moduleId:"viewmodels/echolink",nav:!0},{route:"WWFF",title:"WWFF",moduleId:"viewmodels/wwff",nav:!0},{route:"Freq",title:"Freq",moduleId:"viewmodels/freq",nav:!0},{route:"Bandplan",title:"Bandplan",moduleId:"viewmodels/english/freq",nav:!0},{route:"Onairhagal",title:"Onairhagal",moduleId:"viewmodels/onairhagal",nav:!0},{route:"Holyland",title:"Holyland",moduleId:"viewmodels/holyland",nav:!0},{route:"News",title:"News",moduleId:"viewmodels/news",nav:!0},{route:"Emergency",title:"Emergency",moduleId:"viewmodels/emergency",nav:!0},{route:"CEPT",title:"CEPT",moduleId:"viewmodels/english/cept",nav:!0},{route:"4X4Z",title:"4X4Z",moduleId:"viewmodels/english/4x4z",nav:!0},{route:"4Z8",title:"4Z8",moduleId:"viewmodels/english/4z8",nav:!0},{route:"HolylandContest",title:"Holyland Contest",moduleId:"viewmodels/holyland/holylandcontest",nav:!0},{route:"HolylandAward",title:"Holyland Award",moduleId:"viewmodels/holyland/holylandaward",nav:!0},{route:"HolylandResults",title:"Holyland Contest Results",moduleId:"viewmodels/holyland/holylandresults",nav:!0},{route:"HolylandResultsISR",title:"Holyland Contest Results - Israeli Stations",moduleId:"viewmodels/holyland/holylandresults_isr",nav:!0},{route:"LogUpload",title:"Log Upload",moduleId:"viewmodels/holyland/logupload",nav:!0},{route:"SilentKeyForest",title:"Silent Key Forest",moduleId:"viewmodels/english/skf",nav:!0},{route:"Meetings",title:"Meetings",moduleId:"viewmodels/english/meetings",nav:!0},{route:"EN_Membership",title:"Membership",moduleId:"viewmodels/english/membership",nav:!0},{route:"Beacons",title:"Beacons",moduleId:"viewmodels/english/beacons",nav:!0},{route:"EN_Repeaters",title:"Repeaters",moduleId:"viewmodels/english/repeaters",nav:!0},{route:"PA",title:"Private Area",moduleId:"viewmodels/pa",nav:!0},{route:"Media",title:"Media",moduleId:"viewmodels/media",nav:!0},{route:"DXpeditions",title:"DXpeditions",moduleId:"viewmodels/dxpeditions",nav:!0},{route:"NewsManager",title:"News Manager",moduleId:"viewmodels/back_office/newsmanager",nav:!1},{route:"Market",title:"Market",moduleId:"viewmodels/market",nav:!0},{route:"Register",title:"Register",moduleId:"viewmodels/register",nav:!0},{route:"OnlineCourse",title:"Online Course",moduleId:"viewmodels/onlinecourse",nav:!0},{route:"Shop",title:"Shop",moduleId:"viewmodels/shop",nav:!0},{route:"Import",title:"Import",moduleId:"viewmodels/import",nav:!0},{route:"Exams",title:"Exams",moduleId:"viewmodels/exams",nav:!0},{route:"ExamForms",title:"ExamForms",moduleId:"viewmodels/examforms",nav:!0},{route:"Squares",title:"Squares",moduleId:"viewmodels/squares",nav:!0},{route:"HolylandSquares",title:"Holyland Squares",moduleId:"viewmodels/holyland/holylandsquares",nav:!0},{route:"HolylandLogs",title:"Holyland Logs",moduleId:"viewmodels/holyland/holylandlogs",nav:!0},{route:"Certificategenerator",title:"Certificate Generator",moduleId:"viewmodels/holyland/certificategenerator",nav:!0},{route:"HolylandRules",title:"Holyland Rules",moduleId:"viewmodels/holyland/holylandrules",nav:!0},{route:"Gallery",title:"Gallery",moduleId:"viewmodels/gallery",nav:!0}]).buildNavigationModel(),e.activate()},compositionComplete:function(){!function(e,t,n){var a,r=e.getElementsByTagName(t)[0],o=/^http:/.test(e.location)?"http":"https";e.getElementById(n)||(a=e.createElement(t),a.id=n,a.src=o+"://platform.twitter.com/widgets.js",r.parentNode.insertBefore(a,r))}(document,"script","twitter-wjs")}}});