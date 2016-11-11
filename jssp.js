'use strict';

var graph_config = {
	type: 'line',

	data: {
		labels: [],
		datasets: [{
			label: 'Idle Cycles',
			data: [],
			borderColor: ['rgba(57,222,222,1)'],
			fill: false,
		}]
	},

	options: {
		responsive: false,
		legend: {
			position: 'bottom',
		},
		scales: {
			xAxes: [{
				display: true,
				scaleLabel: {
					display: true,
					labelString: 'Number Of Evaluations'
				}
			}],
			yAxes: [{
				display: true,
				scaleLabel: {
					display: true,
					labelString: 'Idle Cycles'
				}
			}]
		},
		title: {
			display: true,
			text: 'Current Progress'
		}
	},
};

window.onload = function () {
	var ctx = document.getElementById('myChart');
	window.myChart = new Chart(ctx, graph_config);

	//addEventListeners();

	// Test, update graph every second
	setInterval(testGraph, 1000);
};

/*
function addEventListeners () {

}
*/

var i = 0;
function testGraph () {

	if(i % 10 === 0) {
		updateGraph(i, i);
	}
	i++;
}

function updateGraph(value, label) {
	graph_config.data.datasets[0].data.push(value);
	graph_config.data.labels.push(label);

	window.myChart.update();
}