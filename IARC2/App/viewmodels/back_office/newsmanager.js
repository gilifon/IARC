define(['services/utilities', 'services/httpService', 'services/displayService'], function (utilities, httpService, displayService) {
    
    //members
    this.itemList = ko.observableArray();
   
    //methods

    var getData = function () {
        httpService.get("Server/bo/news/get.php?d=" + Date.now()).done(function (data) { itemList(data); }).error(utilities.handleError);
    }

    this.remove = function (item) {
        if (confirm('You are about to delete this user. Are you sure?')) {
            httpService.post("Server/news.php?d=" + Date.now(), { 'user': item }).done(function (data) {
                displayService.display(data);
                getData();
            }).error(utilities.handleError);
        }

    }
    
    this.addItem = function() {
      
    };

    return {
       
        getData:getData,
        compositionComplete: function () {
            getData();
            $('table.sortable').shamirSortable(itemList);
        },
        addItem: addItem,
        itemList: itemList,
        remove: remove
    };
});
