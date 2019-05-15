define(["services/utilities","services/httpService","services/displayService"],function(t,e,n){var a,r=require("viewmodels/shell"),g=ko.observable(),o=function(){g(""),a.removeCurrent()},l=ko.asyncCommand({execute:function(t){a.getQueueSize()>0?a.submit():n.display("Do not forget to select your log file","error"),t(!0)},canExecute:function(t){return!t}});this.safe_tags=function(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")};var i=function(){},s={activate:function(){r.selectedSubMenu("logupload"),r.selectedMainMenu("holyland")},compositionComplete:function(){i(),$(".selectpicker").selectpicker();var r=document.getElementById("upload-btn"),l=document.getElementById("pic-progress-wrap"),s=(document.getElementById("picbox"),document.getElementById("errormsg"));a=new ss.SimpleUpload({button:r,url:"Server/uploadHandler.php?dir=log",name:"uploadfile",multiple:!1,queue:!1,maxUploads:1,maxSize:300,allowedExtensions:["adi","txt","cabrillo.txt","log","cbr"],hoverClass:"btn-hover",focusClass:"active",disabledClass:"disabled",responseType:"json",autoSubmit:!1,onChange:function(t){g(t)},onExtError:function(t){n.display(t+" is not a permitted file type."+"\n\n"+"Only ADI, TXT, LOG and CBR files are allowed.","error")},onSizeError:function(t){n.display(t+" is too big. (300K max file size)","error")},onSubmit:function(t){var e=document.createElement("div"),n=document.createElement("div"),a=document.createElement("div"),r=document.createElement("div");e.className="prog",r.className="size",n.className="progress progress-striped active",a.className="progress-bar progress-bar-success",n.appendChild(a),e.innerHTML='<span style="vertical-align:middle;">'+safe_tags(t)+" - </span>",e.appendChild(r),e.appendChild(n),l.appendChild(e),this.setProgressBar(a),this.setProgressContainer(e),this.setFileSizeBox(r),s.innerHTML=""},startXHR:function(){var t=document.createElement("button");l.appendChild(t),t.className="btn btn-sm btn-info",t.innerHTML="Cancel",this.setAbortBtn(t,!0)},onComplete:function(a,r){if(!r)return s.innerHTML="Unable to upload file",void 0;if(r.success===!0){var g={info:{timestamp:r.timestamp,filename:r.file}};e.post("Server/upload_log.php",g).done(function(t){t.success===!0?n.display(t.msg):n.display(t.msg,"error"),o()}).error(function(){t.handleError()})}else s.innerHTML=r.msg?r.msg:"Unable to upload file"}})},file:g,Clear:o,Send:l,uploader:a};return s});