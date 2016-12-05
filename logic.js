'use strict';

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
		this.createDataTable();
		this.jssp.jobs = [];
		this.jssp.machines = [];
		this.jssp.currentTime = 0;

		// Start Parsing Data
		var text =  this.inputString;

		var jobsArray = text.split('\n');

		var numJobs = jobsArray.length;

		var numMachines = 0;

		for(var c = 0; c < numJobs; c++) {
			var array = jobsArray[c].split(' ');
			
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

	var variables = {
		text: document.getElementById('textinput').value,
		numJobs: 0,
		numMachines: 0,
		bestIndividual: {},
		generation: 0,
		run: 0
	};

	var jobsArray = variables.text.split('\n');

	variables.numJobs = jobsArray.length;

	var	array = jobsArray[0].split(' ');

	variables.numMachines = array.length / 2;

	population(variables);
}

function population (variables) {
	var individuals = [];

	for(var individual = 0; individual < 30; individual++) {
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
	individuals.sort(function (a, b) {
		return a.totalTime - b.totalTime;
	});

	if(variables.bestIndividual.totalTime === undefined || individuals[0].totalTime < variables.bestIndividual.totalTime) {
		variables.bestIndividual = individuals[0];
		variables.bestIndividual.draw();
		outputToPage("New Best Individual!");
	}

	outputToPage("Best individual for Run " + variables.run + " Gen " + variables.generation + " finished at timestep " + individuals[0].totalTime.toString());
	outputToPage("Best individual overall for Run " + variables.run + " Gen " + variables.generation + " finished at timestep " + variables.bestIndividual.totalTime.toString());

	var newGAPattern = [];

	// 1+2+3+4+...+30 = 465
	for(var parent = 0; parent < 30; parent++) {
		var rankBased = Math.floor(Math.random() * 465);

		var runningRank = 0;
		var rank = 0;
		for(rank = 0; rank < 30 && rankBased > runningRank; rank++) {
			runningRank += (30-rank);
		}
		newGAPattern.push(individuals[rank].gaPattern);

		// Mutation
		for(var chromosome = 0; chromosome < (variables.numJobs * variables.numMachines); chromosome++) {
			var mutation = Math.random();

			if(mutation < 0.10) {
				var newHeuristic = Math.floor(Math.random() * 6);
				newGAPattern[parent][chromosome].heuristic = newHeuristic;
				mutation = Math.random();
				if(mutation < 0.50) {
					var newMethod = Math.floor(Math.random() * 2);
					newGAPattern[parent][chromosome].method = newMethod;
				}
			}
		}
		
		// Crossover
		if (parent % 2 === 0 && parent > 0) {
			// Crossover always happens
			var crossoverPoint = Math.floor(Math.random () * (variables.numJobs * variables.numMachines - 1));

			for(var crossover = crossoverPoint; crossover < (variables.numJobs * variables.numMachines); crossover++) {
				var temp = newGAPattern[parent][crossover];
				newGAPattern[parent][crossover] = newGAPattern[parent - 1][crossover];
				newGAPattern[parent - 1][crossover] = temp;
			}
		}
	}

	// Kill off parents, let the children rule the world (like Lord of the Flies)
	individuals = [];
	for(var children = 0; children < 30; children++) {
		individuals.push(new Individual(variables.text, newGAPattern[children]));
	}

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

	// method to generate an function reference with properly scoped variables
	var fnPopulationGenerator = function(variables) {
	    var wrapperFn = function() {
	        population(variables);
	    };
	    return wrapperFn;
	};

	var populationFnToCall = fnPopulationGenerator(variables);

	if (variables.generation < 5) {
		setTimeout(fnToCall, 10);
	}
	else if (variables.run < 50) {
		variables.run++;
		variables.generation = 0;
		setTimeout(populationFnToCall, 10);
	}
}
