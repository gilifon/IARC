define(["jquery","knockout"],function(e,t){return{callbackParam:"callback",get:function(t,n){return e.ajax(t,{data:n})},jsonp:function(t,n,a){return-1==t.indexOf("=?")&&(a=a||this.callbackParam,t+=-1==t.indexOf("?")?"?":"&",t+=a+"=?"),e.ajax({url:t,dataType:"jsonp",data:n})},post:function(n,a){return e.ajax({url:n,data:t.toJSON(a),type:"POST",contentType:"application/json",dataType:"json"})}}});