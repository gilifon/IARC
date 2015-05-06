$(document).ajaxStart(function () {
    $("#loadingImage").show();
}).ajaxStop(function () {
    $("#loadingImage").hide();
});

