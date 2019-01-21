// Setup your quiz text and questions here

// NOTE: pay attention to commas, IE struggles with those bad boys

var quizJSON = {
    "info": {
        "name":    "מבחן קצר בנהלי קשר",
        "main":    "<p>בדוק האם אתה מוכן לבחינת הנהלים לדרגה ד</p>",
        "results": "<h5>תודה שנבחנת! המשך את ההכנה לבחינה בהתאם לתוצאות. בהצלחה!</p>",
        "level1":  "יפה מאוד, אתה מוכן למבחן!",
        "level2":  "יפה מאוד, לא מושלם אבל יש לך מושג על מה מדברים",
        "level3":  "למדת, אבל אתה צריך עוד קצת תרגול",
        "level4":  "כדאי שתעבור שוב על החומר, אולי תצליח שוב בפעם הבאה",
        "level5":  "כדאי ללמוד לפני שנגשים לבחינה" // no comma here
    },
    "questions": [
        { // Question 1 - Multiple Choice, Single True Answer
            "q": "כיצד תדווח בשיטת RST - מובנות טובה מאוד, עוצמה בינונית וצליל טהור?",
            "a": [
                {"option": "555",      "correct": false},
                {"option": "547",     "correct": false},
                {"option": "569",      "correct": true},
                {"option": "599",     "correct": false} // no comma here
            ],
            "correct": "<p><span>נכון מאוד!</span></p>",
            "incorrect": "<p><span>לא מדוייק!</span> עבור שוב על החומר שקשור לשיטת RST</p>" // no comma here
        },
        { // Question 2 - Multiple Choice, Multiple True Answers, Select Any
            "q": "הזמן במירבי לשידור קריאת CQ הוא?",
            "a": [
                {"option": "דקה",               "correct": false},
                {"option": "2 דקות",   "correct": true},
                {"option": "3 דקות",               "correct": false},
                {"option": "אין הגבלה", "correct": true} // no comma here
            ],
            "select_any": true,
            "correct": "<p><span>נכון!</span> חובב רדיו רשאי לקרוא CQ למשך 2 דקות רצופות</p>",
            "incorrect": "<p><span>לא נכון</span> חזור על הפרק שנוגע לקריאת CQ</p>" // no comma here
        },
        { // Question 3 - Multiple Choice, Multiple True Answers, Select All
            "q": "מהו הספק השידור המירבי לחובב בעל דרגה ד בתחום HF?",
            "a": [
                {"option": "10 וואט",           "correct": false},
                {"option": "100 וואט",                  "correct": false},
                {"option": "250 וואט",  "correct": false},
                {"option": "חובב בדרגה ד לא רשאי לשדר בתחום זה",          "correct": true} // no comma here
            ],
            "correct": "<p><span>יפה מאוד!</span> לחובב דרגה ד אסור לשדר ב HF, כשיישדרג לדרגה ב יוכל לשדר ב 250 וואט.</p>",
            "incorrect": "<p><span>לא!</span> חובבים בדרגה ד מוגבלים ל VHF ו UHF</p>" // no comma here
        },
        { // Question 4
            "q": "על-פי הנהלים, יש לשדר את אות הקשר כאמצעי זיהוי",
            "a": [
                {"option": "בתחילה ובסוף כל שידור ומידי 3 דקות",    "correct": true},
                {"option": "בתחילת כל שידור",     "correct": false},
                {"option": "בסוף כל שידור",      "correct": false},
                {"option": "בתחילה ובסוף כל שידור",   "correct": false} // no comma here
            ],
            "correct": "<p><span>מצויין!</span></p>",
            "incorrect": "<p><span>לא מדוייק</span> חזור על נהלי יצירת קשר</p>" // no comma here
        },
        { // Question 5
            "q": "ביומן תחנת החובבים יש לרשום",
            "a": [
                {"option": "תקשורת עם תחנות DX",    "correct": true},
				{"option": "תקשורות מעניינות",    "correct": false},
				{"option": "כל תקשורת",    "correct": false},
                {"option": "תקשורות חשובות בלבד",     "correct": false} // no comma here
            ],
            "correct": "<p><span>נכון מאוד!</span> חובב מחוייב לרשום את התקשורת עם תחנות מרוחקות - DX</p>",
            "incorrect": "<p><span>טעות!</span></p>" // no comma here
        } // no comma here
    ]
};
