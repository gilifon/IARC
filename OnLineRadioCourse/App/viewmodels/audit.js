define(function (require) {

    //require
    this.app = require('durandal/app');
    this.cachingService = require('services/cachingService');
    this.utilities = require('services/utilities');

    //members
    this.auditList = ko.observableArray();


    
    this.generateChartData = function (data) {
        var chartData = [];
        $(Enumerable.From(data).GroupBy("$.username", "", 'key,e=>{k:key,c:e.Count()}', "").ToArray()).each(function (i, d) {
            chartData.push({
                category: d.k,
                value: d.c,
                color: chart.colors[i]//'#0094ff'// + utilities.pad(Math.floor(Math.random() * 255).toString(16), 2, '0') + utilities.pad(Math.floor(Math.random() * 255).toString(16), 2, '0') + utilities.pad(Math.floor(Math.random() * 255).toString(16), 2, '0')
            });
        })
        return chartData;
    }

    //methods
    this.getData = function () {
        $.ajax({
            type: 'GET',
            url: "./Server/audit/get.php?d=" + Date.now(),
            headers: {
                "Authorization": utilities.getBase64Auth(cachingService.get('username'), cachingService.get('password'))
            },
        }).done(function (data) {
            auditList(data);
            
            /*********************************** amCharts.js ***********************************/
            
            // SERIAL CHART
            chart = new AmCharts.AmSerialChart();
            chart.dataProvider = generateChartData(data, chart);
            chart.categoryField = "category";
            chart.marginRight = 0;
            chart.marginTop = 0;
            chart.autoMarginOffset = 0;
            // the following two lines makes chart 3D
            chart.depth3D = 20;
            chart.angle = 30;

            // AXES
            // category
            var categoryAxis = chart.categoryAxis;
            categoryAxis.labelRotation = 30;
            categoryAxis.dashLength = 5;
            categoryAxis.gridPosition = "start";

            // value
            var valueAxis = new AmCharts.ValueAxis();
            valueAxis.title = "Operations";
            valueAxis.dashLength = 5;
            valueAxis.minimum = 0;
            chart.addValueAxis(valueAxis);

            // GRAPH
            //$(chart.dataProvider).each(function (i, d) {
            //    //alert(d.category + ":" + d.value);
            //    var graph = new AmCharts.AmGraph();
            //    graph.valueField = "value";
            //    //graph.colorField = "color";
            //    graph.balloonText = "[[category]]: [[value]]";
            //    graph.type = "column";
            //    graph.lineAlpha = 0;
            //    graph.fillAlphas = 1;
            //    chart.addGraph(graph);
            //});
            var graph = new AmCharts.AmGraph();
            graph.valueField = "value";
            graph.colorField = "color";
            graph.balloonText = "[[category]]: [[value]]";
            graph.type = "column";
            graph.lineAlpha = 0;
            graph.fillAlphas = 1;
            chart.addGraph(graph);

            // WRITE
            chart.write("chartdiv");

            /***********************************************************************************/

            // PIE CHART
            pie = new AmCharts.AmPieChart();
            pie.dataProvider = generateChartData(data);
            pie.titleField = "category";
            pie.valueField = "value";
            pie.colorField = "color";
            pie.outlineColor = "#FFFFFF";
            pie.outlineAlpha = 0.8;
            pie.outlineThickness = 2;
            // this makes the chart 3D
            pie.depth3D = 15;
            pie.angle = 30;

            // WRITE
            pie.write("piediv");
            
            /******************************** End of amCharts.js ********************************/


        }).error(function (xhr, ajaxOptions, thrownError) {
            alert(jQuery.parseJSON(xhr.responseText).error);
        });
    }

    return {
        viewAttached: function (view, parent) {
            getData(view);
            
            

        },
        activate: function () {
            app.on('audit').then(function () {
                getData();
            });
        },
        auditList: auditList,
        getData: getData
    };
});
