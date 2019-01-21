define(["services/utilities","services/httpService","services/displayService"],function(e,t){var n,a,r=require("viewmodels/shell"),g=ko.observable(),o=ko.observable(),l=ko.observable(),s=ko.observable(),i=ko.observable(),d=ko.observable(),p=ko.observable(),m=ko.observable(),c=ko.observable(),L=ko.observable(),h=ko.observable("m"),w=ko.observable(),u=ko.observable(),v=ko.observable(),b=ko.observable(),f=ko.observable(),y=ko.observable(),_=ko.observable(),x=ko.observable(),S=ko.observable(),k=ko.observable(),C=function(){$("#registration-form").parsley().reset(),g(""),o(""),l(""),s(""),i(""),d(""),p(""),m(""),c(""),L(""),h("m"),w(""),u(""),v(""),b(""),f(""),y(""),_(""),x(""),S(""),n.removeCurrent()},A=ko.asyncCommand({execute:function(r){if($("#registration-form").parsley().validate(),$("#registration-form").parsley().isValid())if(n.getQueueSize()>0)n.submit();else if(a.getQueueSize()>0)a.submit();else{var S={info:{firstname:g(),lastname:o(),efirstname:l(),elastname:s(),email:i(),licensenum:d(),callsign:p(),birthdate:m(),id:c(),country:L(),gender:h(),city:w(),address:u(),house:v(),zip:b(),phone:f(),mobile:y(),reason:_(),cv:x(),timestamp:Date.now(),filename:""}};t.post("Server/register.php",S).done(function(e){alert("OK! "+e),C(),r(!0)}).error(function(){alert("Oops, an error has occured"),e.handleError(),r(!0)})}else r(!0)},canExecute:function(){return!0}});this.safe_tags=function(e){return String(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")};var B=function(){$("#mobile").tooltip(),$("#phone").tooltip(),$("#id").tooltip(),$("#licensenum").tooltip()},M={activate:function(){r.selectedSubMenu("register"),r.selectedMainMenu("aguda"),ko.bindingHandlers.datetimepicker={init:function(e,t){$(e).datetimepicker({format:"dd/MM/yyyy HH:mm:ss PP",language:"en",pick12HourFormat:!0}).on("changeDate",function(e){var n=t();n(e.date)})},update:function(e,t){var n=ko.utils.unwrapObservable(t());$(e).datetimepicker("setValue",n)}}},compositionComplete:function(){B(),$("#birthdate").datetimepicker({pickTime:!1}),$("#birthdate").on("dp.change",function(e){m(moment(e.date).format("DD-MM-YYYY"))}),$("#firstname").focus();var r=document.getElementById("upload-btn"),A=document.getElementById("payment-btn"),M=document.getElementById("pic-progress-wrap"),j=(document.getElementById("picbox"),document.getElementById("errormsg"));n=new ss.SimpleUpload({button:r,url:"Server/uploadHandler.php?dir=img",name:"uploadfile",multiple:!1,queue:!1,maxUploads:1,maxSize:600,accept:"image/*",hoverClass:"btn-hover",focusClass:"active",disabledClass:"disabled",responseType:"json",autoSubmit:!1,onChange:function(e){S(e)},onExtError:function(e){alert(e+" is not a permitted file type."+"\n\n"+"Only PNG, JPG, and GIF files are allowed.")},onSizeError:function(e){alert(e+" is too big. (600K max file size)")},onSubmit:function(e){var t=document.createElement("div"),n=document.createElement("div"),a=document.createElement("div"),r=document.createElement("div");t.className="prog",r.className="size",n.className="progress progress-striped active",a.className="progress-bar progress-bar-success",n.appendChild(a),t.innerHTML='<span style="vertical-align:middle;">'+safe_tags(e)+" - </span>",t.appendChild(r),t.appendChild(n),M.appendChild(t),this.setProgressBar(a),this.setProgressContainer(t),this.setFileSizeBox(r),j.innerHTML=""},startXHR:function(){var e=document.createElement("button");M.appendChild(e),e.className="btn btn-sm btn-info",e.innerHTML="Cancel",this.setAbortBtn(e,!0)},onComplete:function(n,r){if(S(r.file),a.getQueueSize()>0)a.submit();else{var A={info:{firstname:g(),lastname:o(),efirstname:l(),elastname:s(),email:i(),licensenum:d(),callsign:p(),birthdate:m(),id:c(),country:L(),gender:h(),city:w(),address:u(),house:v(),zip:b(),phone:f(),mobile:y(),reason:_(),cv:x(),timestamp:r.timestamp,filename:S,paymentfilename:k}};t.post("Server/register.php",A).done(function(e){alert("Very well! "+e),C()}).error(function(){e.handleError()})}}}),a=new ss.SimpleUpload({button:A,url:"Server/uploadHandler.php?dir=payment",name:"uploadfile",multiple:!1,queue:!1,maxUploads:1,maxSize:600,accept:"image/*",hoverClass:"btn-hover",focusClass:"active",disabledClass:"disabled",responseType:"json",autoSubmit:!1,onChange:function(e){k(e)},onExtError:function(e){alert(e+" is not a permitted file type."+"\n\n"+"Only PNG, JPG, and GIF files are allowed.")},onSizeError:function(e){alert(e+" is too big. (600K max file size)")},onSubmit:function(e){var t=document.createElement("div"),n=document.createElement("div"),a=document.createElement("div"),r=document.createElement("div");t.className="prog",r.className="size",n.className="progress progress-striped active",a.className="progress-bar progress-bar-success",n.appendChild(a),t.innerHTML='<span style="vertical-align:middle;">'+safe_tags(e)+" - </span>",t.appendChild(r),t.appendChild(n),M.appendChild(t),this.setProgressBar(a),this.setProgressContainer(t),this.setFileSizeBox(r),j.innerHTML=""},startXHR:function(){var e=document.createElement("button");M.appendChild(e),e.className="btn btn-sm btn-info",e.innerHTML="Cancel",this.setAbortBtn(e,!0)},onComplete:function(n,a){if(!a)return j.innerHTML="Unable to upload file",void 0;if(a.success===!0){k(a.file);var r={info:{firstname:g(),lastname:o(),efirstname:l(),elastname:s(),email:i(),licensenum:d(),callsign:p(),birthdate:m(),id:c(),country:L(),gender:h(),city:w(),address:u(),house:v(),zip:b(),phone:f(),mobile:y(),reason:_(),cv:x(),timestamp:a.timestamp,filename:S,paymentfilename:k}};t.post("Server/register.php",r).done(function(e){alert("Very well! "+e),C()}).error(function(){e.handleError()})}else j.innerHTML=a.msg?a.msg:"Unable to upload file"}})},firstname:g,lastname:o,efirstname:l,elastname:s,email:i,licensenum:d,callsign:p,birthdate:m,id:c,country:L,gender:h,city:w,address:u,house:v,zip:b,phone:f,mobile:y,reason:_,cv:x,file:S,paymentfile:k,Clear:C,Send:A,uploader:n,uploader2:a};return M});