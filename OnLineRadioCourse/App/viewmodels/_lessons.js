define(function (require) {
    
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');

    this.videoList = ko.observableArray([
        { d: 'טור פוריה והרמוניות, מושגים ויחידות פיזיקליות, מבנה החומר, מוליכים ומבדדים, מטען, זרם, מתח והתנגדות', yt: 'http://www.youtube.com/watch?v=0zQFHSIZllg', i: 1, ppt: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', exm: '/lessons/Content/files/exam1.html' },
        { d: 'חוק אום, חוקי קירכהוף, מעגל טורי ומקבילי, השפעת הטמפרטורה על ההתנגדות', yt: 'http://www.youtube.com/watch?v=6XiWrGs8IP8', i: 2, ppt: '', exm: '/lessons/Content/files/exam1.html' },
        { d: 'קבל וקיבול, מגנטיות ואלקטרומגנטיות', yt: 'http://www.youtube.com/watch?v=aU0c5-Zh5B0', i: 3, ppt: '', exm: '/lessons/Content/files/exam1.html' },
        { d: 'מגנטיות ואלקטרומגנטיות, מבוא לזרם חילופין והתנהגות נגד בזרם חילופין', yt: 'http://www.youtube.com/watch?v=1IHhWPiv0EM', i: 4, ppt: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', exm: '/lessons/Content/files/exam1.html' },
        { d: 'הכנה וחזרות לקראת מבחן נוהלי הקשר, וגם, ממסרי רדיו ולוויני תקשורת', yt: 'http://www.youtube.com/watch?v=bHhrjT-jSeM', i: 5, ppt: '', exm: '/lessons/Content/files/exam1.html' },
        { d: 'התנהגות נגד קבל וסליל במעגלי זרם חילופין', yt: 'http://www.youtube.com/watch?v=HB-NP_yp9As', i: 6, ppt: '', exm: '/lessons/Content/files/exam1.html' },
        { d: 'התנהגות נגד סליל וקבל במעגלי זרם חילופין. מעגלי תהודה ומבוא לחצאי מוליכים', yt: 'http://www.youtube.com/watch?v=1IHhWPiv0EM', i: 7, ppt: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', exm: '/lessons/Content/files/exam1.html' },
        { d: 'מבוא למוליכים למחצה, דיודות וספקי כח', yt: 'http://www.youtube.com/watch?v=kYmjpPYL7-A', i: 8, ppt: '', exm: '/lessons/Content/files/exam1.html' },
        { d: 'ספקי כח, אופני עבודה של מגברים, מגברי שרת ועוד', yt: 'http://www.youtube.com/watch?v=C7Ytl8i3Vq0', i: 9, ppt: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', exm: '/lessons/Content/files/exam1.html' },
        { d: 'מתנדים, מנחתים, יצירת גלים אלקטרומגנטיים', yt: 'http://www.youtube.com/watch?v=pEQeF64krus', i: 10, ppt: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', exm: '/lessons/Content/files/exam1.html' },
        { d: 'גלים אלקטרומגנטיים, חלוקת הספקטרום, אנטנת הדיפול, הגבר, רוחב פס, זווית קרינה, אנטנת משטח הארקה, אנטנת 5/8', yt: 'http://www.youtube.com/watch?v=F1TFmgzYd-c', i: 11, ppt: '', exm: '/lessons/Content/files/exam1.html' },
        { d: 'אנטנות, קווי העברת הספק, מדידות יג"ע ודוגמאות מעשיות בבניית אנטנות חובבים', yt: 'http://www.youtube.com/watch?v=WX568polvE4', i: 12, ppt: '', exm: '/lessons/Content/files/exam1.html' },
        { d: 'התנהגות קווי העברת הספק, תיאום הקו לאנטנה, מבוא לאיפנון, אפנון CW, איפנון תנופה AM, אפנון פס צד יחיד SSB', yt: 'http://www.youtube.com/watch?v=pTegIk5c0hA', i: 13, ppt: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', exm: '/lessons/Content/files/exam1.html' },
        { d: 'איפנון AM ו- SSB, מקלט ישיר ומקלט סופרהטרודיין', yt: 'http://www.youtube.com/watch?v=Grj6IdR_mD4', i: 14, ppt: '', exm: '/lessons/Content/files/exam1.html' },
        { d: 'מקלט סופרהטרודיין וסופרהטרודיין כפול, לוויני תקשורת', yt: 'http://www.youtube.com/watch?v=kjc7lvbl2Cg', i: 15, ppt: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', exm: '/lessons/Content/files/exam1.html' },
        { d: 'תקשורת לווינים ומבוא לתקשורת ספרתית', yt: 'http://www.youtube.com/watch?v=Vjy1FTF8z3o', i: 16, ppt: '', exm: '/lessons/Content/files/exam1.html' },
        { d: 'שידור ספרתי - רדיו מנות + תחילת חזרות למבחן העיוני', yt: 'http://www.youtube.com/watch?v=uZNyO_m0dPQ', i: 17, ppt: 'https://skydrive.live.com/embed?cid=FEA50A5AC86BFB4D&resid=FEA50A5AC86BFB4D%21106&authkey=AH0ZWnpjb0aU88A&em=2', exm: '/lessons/Content/files/exam1.html' },
        { d: 'פתרון מבחנים מהעבר', yt: 'http://www.youtube.com/watch?v=8DcUo09tvco', i: 18, ppt: '', exm: '/lessons/Content/files/exam1.html' }
    ]);

   
    
    return {
        viewAttached: function (view) {

            $("#accordion").accordion();
            
            $(".fancy").click(function () {
                $.fancybox({
                    'padding': 0,
                    'autoScale': false,
                    'transitionIn': 'none',
                    'transitionOut': 'none',
                    'title': this.title,
                    'width': 1152,
                    'height': 693,
                    'href': this.href.replace(new RegExp("watch\\?v=", "i"), 'v/'),
                    'type': 'swf',
                    'swf': {
                        'wmode': 'transparent',
                        'allowfullscreen': 'true'
                    }
                });

                return false;
            });

            $(".fancyppt").click(function () {
                $.fancybox({
                    'padding': 0,
                    'autoScale': false,
                    'transitionIn': 'none',
                    'transitionOut': 'none',
                    'title': this.title,
                    'width': 1152,
                    'height': 693,
                    'href': this.href.replace(new RegExp("watch\\?v=", "i"), 'v/'),
                    'type': 'iframe'
                });

                return false;
            });

            $(".fancyexm").click(function () {
                $.fancybox({
                    'padding': 0,
                    'autoScale':false,
                    'title': this.title,
                    'width': 360,
                    'height': 400,
                    'href': this.href,
                    'type': 'iframe'
                });

                return false;
            });

        },
        videoList: videoList
    };
});
