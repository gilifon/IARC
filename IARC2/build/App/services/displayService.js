define(function (require) {
    
    var display = function (message, type) {
        toastr.options = {
            "positionClass": "toast-top-full-width",
            "fadeIn": 300,
            "fadeOut": 1000,
            "timeOut": 0,
            "extendedTimeOut": 0
        };

        switch (type) {
            case 'error':
                toastr.error(message, 'Error!');
                break;
            case 'info':
                toastr.info(message, 'Info!');
                break;
            case 'warning':
                toastr.warning(message, 'Warning!');
                break;
            case 'Success':
                toastr.warning(message, 'O.K.!');
                break;
            default:
                toastr.success(message, 'O.K.!');
        }
    };

    return {
        display: display
    };

});