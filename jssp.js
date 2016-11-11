 var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        var randomScalingFactor = function() {
            return Math.round(Math.random() * 100 * (Math.random() > 0.5 ? -1 : 1));
        };
        var randomColorFactor = function() {
            return Math.round(Math.random() * 255);
        };
        var randomColor = function(opacity) {
            return 'rgba(' + randomColorFactor() + ',' + randomColorFactor() + ',' + randomColorFactor() + ',' + (opacity || '.3') + ')';
        };

        var config = {
            type: 'line',
            data: {
                labels: [0],
                datasets: [{
                    label: "My First dataset",
                    data: [0],
                    fill: false,
                    borderDash: [5, 5],
                }]
            },
            options: {
                responsive: false,
                legend: {
                    position: 'bottom',
                },
                hover: {
                    mode: 'label'
                },
                scales: {
                    xAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Month'
                        }
                    }],
                    yAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Value'
                        }
                    }]
                },
                title: {
                    display: true,
                    text: 'Chart.js Line Chart - Legend'
                }
            }
        };

        $.each(config.data.datasets, function(i, dataset) {
            var background = randomColor(0.5);
            dataset.borderColor = background;
            dataset.backgroundColor = background;
            dataset.pointBorderColor = background;
            dataset.pointBackgroundColor = background;
            dataset.pointBorderWidth = 1;
        });

        window.onload = function() {
            var ctx = document.getElementById("myChart");
            window.myLine = new Chart(ctx, config);

            //$('#addData').click(function() {
            document.getElementById('addData').addEventListener('click', function(event) {
                if (config.data.datasets.length > 0) {
                    config.data.labels.push("NEW!");

                    $.each(config.data.datasets, function(i, dataset) {
                        dataset.data.push(55);
                    });

                    window.myLine.update();
                }
            });
        };




       	var myVar = setInterval (updateGraph, 1000);
       	var j = 0;

       	function updateGraph() {
       		j++;
       		if (config.data.datasets.length > 0) {
                config.data.labels.push(j);

                $.each(config.data.datasets, function(i, dataset) {
                    dataset.data.push(j);
                });

                window.myLine.update();
            }
       	}