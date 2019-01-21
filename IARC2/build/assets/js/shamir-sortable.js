jQuery.fn.extend({
    shamirSortable: function (list, options) {
        //set this
        $this = $(this);

        //set sorting direction
        var asc = false;

        //members
        var propertyParser, upArrowClass, downArrowClass;

        //set initialization method
        var init = function () {
            propertyParser = (options != undefined) ? (options.propertyParser != undefined) ? options.propertyParser : defaultPropertyParser : defaultPropertyParser;
            upArrowClass = (options != undefined) ? (options.upArrowClass != undefined) ? options.upArrowClass : 'icon-chevron-up' : 'icon-chevron-up';
            downArrowClass = (options != undefined) ? (options.downArrowClass != undefined) ? options.downArrowClass : 'icon-chevron-down' : 'icon-chevron-down';
        }

        //define a property parser
        var defaultPropertyParser = function (object, prop)
        {
            //initialize drillObjectTree to the object 
            var drillObjectTree = object;

            //get the property list -> split the property on '.'
            var propComponents = prop.split('.');

            //for each property
            //1. try to match array notation
            //2. use non array notation
            //3. check for undefined values
            for (var i = 0; i < propComponents.length; i++) {
                //1. try match array notation
                var arrayProp = propComponents[i].match(/.+\[\d\]/g);
                // 1.1 if it is array notation
                if (arrayProp != undefined) {
                    //1.2 get the array notation
                    var arrayPos = arrayProp[0].match(/\[\d\]/g);
                    //1.3 get the position
                    var pos = arrayPos[0].match(/\d/g)[0];
                    // 1.4 drill down the object
                    drillObjectTree = drillObjectTree[propComponents[i].replace(arrayPos[0], '')]()[pos * 1];
                }
                //2. non array notation
                else {
                    //2.1 drill down the object
                    drillObjectTree = drillObjectTree[propComponents[i]]();
                }
                //3. if in the drilling process we got to an undefined value, return ''
                if (drillObjectTree == undefined) {
                    drillObjectTree = '';
                    break;
                }
            }
            //return the drilled value
            return drillObjectTree;
        }

        //define a sorting method
        var sortTable = function (header, list, prop) {
            //set this
            var $this = $(header);
            
            //remove the icons from other headers
            $this.parent().children().each(function (index, item) {
                $(item).children('i').removeClass();
            });

            asc = !asc;
            list.sort(function (left, right) {
                //try {
                var leftValue = propertyParser(left, prop);
                var rightValue = propertyParser(right, prop);
                if (asc) {
                    $this.children('i').removeClass().addClass(downArrowClass);
                    return ko.unwrap(leftValue) == ko.unwrap(rightValue) ? 0 : ko.unwrap(leftValue) < ko.unwrap(rightValue) ? -1 : 1;
                }
                else {
                    $this.children('i').removeClass().addClass(upArrowClass);
                    return ko.unwrap(leftValue) == ko.unwrap(rightValue) ? 0 : ko.unwrap(leftValue) > ko.unwrap(rightValue) ? -1 : 1;
                }
                //}
                //catch (e) {
                //    return true;
                //}
            });
        }

        //initialize shamirSortable
        init();

        //get the headers of the table
        var headers = $this.find('thead tr th');

        //foreach header -> add icon and bind a click event (if not unsortable)
        headers.each(function (index, header) {
            header = $(header);
            //add the icon place holder
            header.append('&nbsp;<i></i>');

            //get the data-source property value 
            var prop = header.attr('data-source');
            //if the header does not have one -> it is unsortable, ignore
            if (prop === undefined) return;

            //foreach sortable header, add a click event
            header.on('click', function () {
                //sort according to the property
                sortTable(this, list, prop);
            });
        });
    }
});