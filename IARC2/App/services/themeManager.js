define(function () {

    // *** TO BE CUSTOMISED ***

    var style_cookie_name = "style";
    var style_cookie_duration = 30;

    // *** END OF CUSTOMISABLE SECTION ***

    var switch_style = function (css_title) {
        // You may use this script on your site free of charge provided
        // you do not remove this notice or the URL below. Script from
        // http://www.thesitewizard.com/javascripts/change-style-sheets.shtml
        var i, link_tag;
        for (i = 0, link_tag = document.getElementsByTagName("link") ;
          i < link_tag.length ; i++) {
            if ((link_tag[i].rel.indexOf("stylesheet") != -1) &&
              link_tag[i].title) {
                link_tag[i].disabled = true;
                if (link_tag[i].title == css_title) {
                    link_tag[i].disabled = false;
                }
            }
            set_cookie(style_cookie_name, css_title, style_cookie_duration);
        }
    }
    var set_style_from_cookie = function () {
        var css_title = get_cookie(style_cookie_name);
        if (css_title.length) {
            switch_style(css_title);
        }
    }
    var set_cookie = function (cookie_name, cookie_value, lifespan_in_days, valid_domain) {
        // http://www.thesitewizard.com/javascripts/cookies.shtml
        var domain_string = valid_domain ? ("; domain=" + valid_domain) : '';
        document.cookie = cookie_name + "=" + encodeURIComponent(cookie_value) + "; max-age=" + 60 * 60 * 24 * lifespan_in_days + "; path=/" + domain_string;
    }
    var get_cookie = function (cookie_name) {
        // http://www.thesitewizard.com/javascripts/cookies.shtml
        var cookie_string = document.cookie;
        if (cookie_string.length != 0) {
            var cookie_value1 = cookie_string.match('(^|;)[\s]*' + cookie_name + '=([^;]*)');
            var cookie_value = cookie_string.match( cookie_name + '=([^;]*)');
            return decodeURIComponent(cookie_value[1]);
        }
        return '';
    }

    var themeManager = {
        switch_style: switch_style,
        set_style_from_cookie: set_style_from_cookie
    }

    return themeManager;
});