'use strict';

var populationSize = 100;
var maxGens = 150;

var pMut = 0.02;
var originalPMut = 0.02;

var collectData = false;
var statisticalData = [];
var maxRuns = 30;
var runs = 0;

class Individual {
	constructor (inputString, gaPattern) {
		this.inputString = inputString;
		this.jssp = {
			jobs: [],
			machines: [],
			currentTime: 0,
			dataTable: {},
			operationsToSchedule: []
		};
		this.currentGaPatternElement = 0;
		this.gaPattern = gaPattern;
		this.totalTime = -1;

		this.parseData();
	}

	/**
	 * Parses the data that was given in constructor (this.inputString), sets up the jobs and machines, then calls {@link schedule}
	 */
	parseData () {
		// Reset Everything
		this.currentGaPatternElement = 0;
		this.totalTime = -1;
		this.jssp = {
			jobs: [],
			machines: [],
			currentTime: 0,
			dataTable: {},
			operationsToSchedule: []
		};

		this.createDataTable();

		// Start Parsing Data
		var text =  this.inputString;
		var jobsArray = text.split('\n');

		if (jobsArray[0][1] == '+') {
			jobsArray.splice (0, 3);
			jobsArray.splice (jobsArray.length - 1, 1);
		}
		else{
			jobsArray.splice (0, 2);
		}
		var numMachines = 0;
		var numJobs = jobsArray.length;

		for(var c = 0; c < numJobs; c++) {
			var array = jobsArray[c].split(/\s+/);

			if (array[0] === '') {
				array.splice (0, 1);
			}
			
			var job = {
				instructions: [],
				running: false,
				completed: false,
				id: c,
			};

			var jobTime = 0;

			var instruction = {};
			var len = array.length;
			numMachines = len / 2;
			for (var i = 0; i < len; i++) {
				if (i % 2 === 0) {
					instruction.machine = array[i];
					instruction.jobId = c;
				}
				else {
					instruction.time = array [i];
					jobTime += parseInt(instruction.time, 10);
					job.instructions.push(instruction);
					instruction = {};
				}
			}
			this.jssp.jobs.push(job);
		}

		for (var m = 0; m < numMachines; m++) {
			var machine = {
				id: m,
				scheduledOperations: [],
				nextAvailable: 0,
				idleCycles: 0,
				running: false,
			};
			this.jssp.machines.push(machine);
		}

		this.schedule();
	}

	/**
	 * Schedules all jobs and operations.  Once this function is finished, JSSP is scheduled.
	 */
	schedule() {
		var numJobs = this.jssp.jobs.length;
		var finished = false;

		while (finished === false) {
			var heuristic = this.gaPattern[this.currentGaPatternElement].heuristic;
			var sortingFunction;
			if (heuristic === 0) {
				sortingFunction = this.shortestOperation.bind(this);
			}
			else if (heuristic === 1) {
				sortingFunction = this.longestOperation.bind(this);
			}
			else if (heuristic === 2) {
				sortingFunction = this.mostOperationsRemaining.bind(this);
			}
			else if (heuristic === 3) {
				sortingFunction = this.leastOperationsRemaining.bind(this);
			}
			else if (heuristic === 4) {
				sortingFunction = this.leastTimeRemaining.bind(this);
			}
			else {
				sortingFunction = this.mostTimeRemaining.bind(this);
			}

			var method = this.gaPattern[this.currentGaPatternElement].method;
			var methodFunction;
			if (method === 0) {
				methodFunction = this.gAndT;
			}
			else {
				methodFunction = this.nonDelay;
			}

			this.updateAvailableMachines();

			var somethingToSchedule = true;
			while (somethingToSchedule === true) {
				somethingToSchedule = false;
				this.populateSchedulableOperations();
				for (var a = 0; a < this.jssp.operationsToSchedule.length; a++) {
					if (this.jssp.machines[this.jssp.operationsToSchedule[a].machine].running === false) {
						somethingToSchedule = true;
					}
				}
				if(somethingToSchedule === true) {
					//this.nonDelay(sortingFunction);
					this.gAndT(sortingFunction);
				}
			}

			// Increment timestep
			this.jssp.currentTime++;

			// See if we have finished this JSSP
			var completedJobs = 0;
			for (var j = 0; j < numJobs; j++) {
				if (this.jssp.jobs[j].finished === true) {
					completedJobs++;
				}
			}

			if (completedJobs >= numJobs) {
				finished = true;
			}
		}
	}

	/**
	 * Draws the gantt chart for this JSSP.
	 * Check out {@link https://developers.google.com/chart/interactive/docs/gallery/barchart#stacked-bar-charts|Google Charts - Barchart}
	 */
	draw() {
		var container = document.getElementById('barchart_material');
		var chart = new google.visualization.Timeline(container);

		this.jssp.dataTable.sort(0);
		chart.draw(this.jssp.dataTable);
	}

	/**
	 * Populates this.jssp.operationsToSchedule with operations that are ready to be scheduled (only if the machine they want on isn't running)
	 */
	populateSchedulableOperations() {
		this.jssp.operationsToSchedule = [];
		var numJobs = this.jssp.jobs.length;

		for (var d = 0; d < numJobs; d++) {
			if (this.jssp.jobs[d].finished !== true && this.jssp.jobs[d].running !== true) {
				this.jssp.operationsToSchedule.push(this.jssp.jobs[d].instructions[0]);
			}
		}
	}

	/**
	 * Updates this.jssp.machines with what machines are ready for new operations.
	 */
	updateAvailableMachines() {
		var numMachines = this.jssp.machines.length;
		for (var z = 0; z < numMachines; z++) {
			if (this.jssp.machines[z].nextAvailable <= this.jssp.currentTime) {
				if(this.jssp.machines[z].running === true) {
					var runningJob = this.jssp.machines[z].scheduledOperations[this.jssp.machines[z].scheduledOperations.length - 1].jobId;
					this.jssp.jobs[runningJob].running = false;
					this.jssp.machines[z].running = false;
				}
			}
		}
	}

	/**
	 * Schedules operation on a specific machine.
	 * @param  {object} operation [operation from job that was created in {@link parseData}]
	 */
	scheduleAnOperation (operation) {
		// Add timing information to this job
		operation.start = this.jssp.currentTime;
		operation.end = this.jssp.currentTime + parseInt(operation.time, 10);


		// Add this job to the scheduled list
		this.jssp.machines[operation.machine].scheduledOperations.push(operation);
		this.jssp.machines[operation.machine].nextAvailable = this.jssp.currentTime + parseInt(operation.time, 10);
		this.jssp.machines[operation.machine].running = true;

		// Get a handle to the actual job, remove this operation from the remaining work
		// and mark it as running
		var job = operation.jobId;
		this.jssp.jobs[job].instructions.splice(0,1);
		this.jssp.jobs[job].running = true;

		// Add information to the gantt chart data structure
		this.jssp.dataTable.addRow(['Machine ' + operation.machine.toString(), job.toString(), operation.start, operation.end]);

		// Increment to next element in GA
		this.currentGaPatternElement++;

		// If there is no more remaining work for this job, mark it as complete
		if(this.jssp.jobs[job].instructions.length === 0) {
			this.jssp.jobs[job].finished = true;
			if (operation.end > this.totalTime)  {
				this.totalTime = operation.end;
			}
		}
	}

	/**
	 * Giffler and Thompson Algorithm
	 * One of the methods to schedule operations by, this one will find the machine that has the least time to completion and schedules an operation chosen by sortingFunction (heuristic)
	 * @param  {function} sortingFunction [hueristic to sort this.schedulableOperations by]
	 */
	gAndT(sortingFunction) {
		var numJobs = this.jssp.jobs.length;
		var numMachines = this.jssp.machines.length;
		var numOperationsToSchedule = this.jssp.operationsToSchedule.length;

		// The difference between G&T and Non-Delay is the step where you:
		// "Calculate the completion time of all operations in C and let m* equal
		// the machine on which the mimimum completion time t is achieved."

		var machineArray = [];
		for (var a = 0; a < numMachines; a++) {
			var mach = {
				id: a,
				time: 0
			};
			machineArray.push(mach);
		}

		for (var m = 0; m < numJobs; m++) {
			var numOperations = this.jssp.jobs[m].instructions.length;
			for (var n = 0; n < numOperations; n++) {
				machineArray[this.jssp.jobs[m].instructions[n].machine].time += parseInt(this.jssp.jobs[m].instructions[n].time, 10);
			}
		}

		// Will sort to have m* be the first machine in the list
		machineArray.sort(function (a, b) {
			return a.time - b.time;
		});

		this.jssp.operationsToSchedule.sort(sortingFunction);

		for (var b = 0; b < numMachines; b++) {
			if(this.jssp.machines[machineArray[b].id].running === false) {
				for (var c = 0; c < numOperationsToSchedule; c++) {
					if(parseInt(this.jssp.operationsToSchedule[c].machine, 10) === machineArray[b].id) {
						this.scheduleAnOperation(this.jssp.operationsToSchedule[c]);
						return;
					}
				}
			}
		}
	}

	/**
	 * One of the methods to schedule operations by, this one schedules an operation (on any available machine) chosen by sortingFunction (heuristic)
	 * @param  {function} sortingFunction [hueristic to sort this.schedulableOperations by]
	 */
	nonDelay(sortingFunction) {
		var numOperationsToSchedule = this.jssp.operationsToSchedule.length;
		this.jssp.operationsToSchedule.sort(sortingFunction);

		var a = 0;

		while (a < numOperationsToSchedule && this.jssp.machines[this.jssp.operationsToSchedule[a].machine].running === true) {
			a++;
		}

		this.scheduleAnOperation(this.jssp.operationsToSchedule[a]);
	}

	/**
	 * Sets up DataTable for the Google Chart (see {@link https://developers.google.com/chart/interactive/docs/gallery/barchart#data-format})
	 */
	createDataTable () {
		this.jssp.dataTable = new google.visualization.DataTable();
		this.jssp.dataTable.addColumn({type: 'string', id: 'Machine'});
		this.jssp.dataTable.addColumn({type: 'string', id: 'Job'});
		this.jssp.dataTable.addColumn({type: 'number', id: 'Start'});
		this.jssp.dataTable.addColumn({type: 'number', id: 'End'});
	}

	/////////////////// Hueristics ///////////////////
	shortestOperation (a, b) {
		if (a.time < b.time) {
			return -1;
		}
		if (a.time > b.time) {
			return 1;
		}
		return 0;
	}

	longestOperation (a, b) {
		return (-1 * this.shortestOperation(a, b));
	}

	leastTimeRemaining (a, b) {
		var aJobOperationsRemaining = this.jssp.jobs[a.jobId].instructions.length;
		var bJobOperationsRemaining = this.jssp.jobs[b.jobId].instructions.length;

		var aTimeRemaining = 0;
		var bTimeRemaining = 0;

		for(var aCount = 0; aCount < aJobOperationsRemaining; aCount++) {
			aTimeRemaining += this.jssp.jobs[a.jobId].instructions[aCount].time;
		}

		for(var bCount = 0; bCount < bJobOperationsRemaining; bCount++) {
			bTimeRemaining += this.jssp.jobs[b.jobId].instructions[bCount].time;
		}

		if (aTimeRemaining < bTimeRemaining) {
			return -1;
		}
		if (aTimeRemaining > bTimeRemaining) {
			return 1;
		}
		return 0;
	}

	mostTimeRemaining (a, b) {
		return (-1 * this.leastTimeRemaining(a, b));	
	}

	leastOperationsRemaining (a, b) {
		var aJobOperationsRemaining = this.jssp.jobs[a.jobId].instructions.length;
		var bJobOperationsRemaining = this.jssp.jobs[b.jobId].instructions.length;

		if (aJobOperationsRemaining < bJobOperationsRemaining) {
			return -1;
		}
		if (aJobOperationsRemaining > bJobOperationsRemaining) {
			return 1;
		}
		return 0;
	}

	mostOperationsRemaining (a, b) {
		return (-1 * this.leastOperationsRemaining(a, b));
	}
	//////////////////////////////////////////////////
}

function initialize () {
	if(statisticalData.length === 0 && collectData) {
		setupStatisticalData();
	}
	document.getElementById('textinput').disabled = true;
	document.getElementById('parseData').disabled = true;
	document.getElementById('clearData').disabled = true;

	var variables = {
		text: document.getElementById('textinput').value,
		numJobs: 0,
		numMachines: 0,
		bestIndividual: {},
		generation: 0,
		run: 0,
		data: {},
		options: {},
		chart: {}
	};

	variables.data = new google.visualization.DataTable();
	variables.data.addColumn('number', 'X');
	variables.data.addColumn('number', 'Overall Best');
	variables.data.addColumn('number', 'Current Best');
	variables.data.addColumn('number', 'Current Average');

	variables.options = {
		hAxis: {
			title: 'Generation',
			format: '0',
			viewWindow: {
				min: 0
			}
		},
		vAxis: {
			title: 'Total Time',
			format: '0'
		}
	};

	variables.chart = new google.visualization.LineChart(document.getElementById('linechart_div'));

	var jobsArray = variables.text.split('\n');

	if (jobsArray[0][1] == '+') {
		jobsArray.splice (0, 3);
		jobsArray.splice (jobsArray.length - 1, 1);
	}
	else{
		jobsArray.splice (0, 2);
	}

	variables.numJobs = jobsArray.length;

	var	array = jobsArray[0].split(/\s+/);

	if (array [0] === '') {
		array.splice (0, 1);
	}

	variables.numMachines = array.length / 2;
	population(variables);
}

function population (variables) {
	var individuals = [];

	for(var individual = 0; individual < populationSize; individual++) {
		var gaPattern = [];

		for(var machine = 0; machine < variables.numMachines; machine++) {
			for(var job = 0; job < variables.numJobs; job++) {
				var pair = {
					method: Math.floor(Math.random() * 2),
					heuristic: Math.floor(Math.random() * 6)
				};
				gaPattern.push(pair);
			}
		}
		individuals.push(new Individual(variables.text, gaPattern));
	}
	generation(individuals, variables);
}

function generation (individuals, variables) {
	// 1+2+3+4+...+30 = 465
	// 1+2+3+...+populationSize = (populationSize*(populationSize+1)) / 2
	for(var children = 0; children < populationSize; children++) {
		var parent1 = Math.floor(Math.random() * ((populationSize*(populationSize+1)) / 2));

		var runningRank = 0;
		var rank1 = 0;
		for(rank1 = 0; rank1 < populationSize && parent1 > runningRank; rank1++) {
			runningRank += (populationSize-rank1);
		}

		var parent2 = Math.floor(Math.random() * ((populationSize*(populationSize+1)) / 2));

		runningRank = 0;
		var rank2 = 0;
		for(rank2 = 0; rank2 < populationSize && parent2 > runningRank; rank2++) {
			runningRank += (populationSize-rank2);
		}

		var gaPattern1 = JSON.parse(JSON.stringify(individuals[rank1].gaPattern));
		var gaPattern2 = JSON.parse(JSON.stringify(individuals[rank2].gaPattern));
		
		// Crossover always happens
		for(var crossover = 0; crossover < (variables.numJobs * variables.numMachines); crossover++) {
			var swap = Math.floor(Math.random() * 2);

			if(swap === 1) {
				var temp = gaPattern1[crossover];
				gaPattern1[crossover] = gaPattern2[crossover];
				gaPattern2[crossover] = temp;
			}
		}

		individuals.push(new Individual (individuals[rank1].inputString, gaPattern1));
		individuals.push(new Individual (individuals[rank2].inputString, gaPattern2));
	}

	for(var individual = 0; individual < individuals.length; individual++) {
		var individualChanged = false;
		for(var chromosome = 0; chromosome < (variables.numJobs * variables.numMachines); chromosome++) {
			var mutation = Math.random();

			if(mutation < pMut) {
				var newHeuristic = Math.floor(Math.random() * 6);
				individuals[individual].gaPattern[chromosome].heuristic = newHeuristic;
				mutation = Math.random();
				if(mutation < 0.50) {
					var newMethod = Math.floor(Math.random() * 2);
					individuals[individual].gaPattern[chromosome].method = newMethod;
				}
				individualChanged = true;
			}
		}

		if (individualChanged === true) {
			individuals[individual].parseData();
		}
	}

	// Sort individuals and kill off weaker individuals
	individuals.sort(function (a, b) {
		return a.totalTime - b.totalTime;
	});
	individuals.splice(populationSize);

	// Save off best individual
	if(variables.bestIndividual.totalTime === undefined || individuals[0].totalTime < variables.bestIndividual.totalTime) {
		variables.bestIndividual = new Individual(individuals[0].inputString, individuals[0].gaPattern);
		variables.bestIndividual.draw();
		//outputToPage("New Best Individual!");
	}

	// Compute Average
	var average = 0.0;
	for (var a = 0; a < populationSize; a++) {
		average += individuals[a].totalTime;
	}
	average = average / populationSize;

	//outputToPage("Best individual overall for Gen " + variables.generation + " finished at timestep " + variables.bestIndividual.totalTime.toString());
	//outputToPage("Best individual for Gen " + variables.generation + " finished at timestep " + individuals[0].totalTime.toString());
	//outputToPage("Average fitness for Gen " + variables.generation + " is " + average);

	variables.data.addRow([variables.generation, variables.bestIndividual.totalTime, individuals[0].totalTime, average]);

	if(collectData) {
		statisticalData[variables.generation].best += variables.bestIndividual.totalTime;
		statisticalData[variables.generation].currentBest += individuals[0].totalTime;
		statisticalData[variables.generation].average += average;
		statisticalData[variables.generation].numberOfDataPoints++;
	}

	variables.chart.draw(variables.data, variables.options);

	var converged = (average === individuals[0].totalTime);
	variables.generation++;

	// method to generate an function reference with properly scoped variables
	var fnGenerator = function(individuals, variables) {
	    var wrapperFn = function() {
	        generation(individuals, variables);
	    };
	    return wrapperFn;
	};

	// call the generator and return the wrapping function
	var fnToCall = fnGenerator(individuals, variables);

	if (variables.generation < maxGens && converged === false) {
		setTimeout(fnToCall, 10);
	}
	else {
		document.getElementById('textinput').disabled = false;
		document.getElementById('parseData').disabled = false;
		document.getElementById('clearData').disabled = false;
		alert ('HGA has converged.  Best solution found displayed below.  Best time: ' + variables.bestIndividual.totalTime);

		if(runs < maxRuns && collectData) {
			runs++;
			initialize ();
		}
		else if(collectData){
			outputStatisticalData();
		}
	}
}

function setupStatisticalData() {
	for(var a = 0; a < maxGens; a++) {
		var runData = {
			best: 0,
			currentBest: 0,
			average: 0,
			numberOfDataPoints: 0,
		};
		statisticalData.push(runData);
	}
}

function outputStatisticalData() {
	var outputString = '';
	for(var b = 0; b < maxGens; b++) {
		outputString += b.toString() + ', ' + (statisticalData[b].best / statisticalData[b].numberOfDataPoints).toString() + ', ';
		outputString += (statisticalData[b].currentBest / statisticalData[b].numberOfDataPoints).toString() + ', ';
		outputString += (statisticalData[b].average / statisticalData[b].numberOfDataPoints).toString() + ', ';
		outputString += statisticalData[b].numberOfDataPoints + '\n';
	}

	document.getElementById('textinput').value = outputString;
}
