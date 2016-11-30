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

	parseData () {
		// Reset Everything
		//clearConsole();
		this.createDataTable();
		this.jssp.jobs = [];
		this.jssp.machines = [];
		this.jssp.currentTime = 0;

		// Start Parsing Data
		var text =  this.inputString; //document.getElementById('textinput').value;

		var jobsArray = text.split('\n');

		var numJobs = jobsArray.length;

		for(var c = 0; c < numJobs; c++) {
			var array = jobsArray[c].split('  ');
			
			var job = {
				instructions: [],
				running: false,
				completed: false,
				id: c,
			};

			var jobTime = 0;

			var instruction = {};
			var len = array.length;
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

			//outputToPage('Job ' + c + ' time: ' + jobTime);

			this.jssp.jobs.push(job);
		}

		for (var m = 0; m < 5; m++) {
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

			// For now this will be if there are no more jobs to schedule.  Will have to use latest finishing machine as ending time
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

	draw() {
		var container = document.getElementById('barchart_material');
		var chart = new google.visualization.Timeline(container);
		chart.draw(this.jssp.dataTable);
	}

	populateSchedulableOperations() {
		this.jssp.operationsToSchedule = [];
		var numJobs = this.jssp.jobs.length;

		for (var d = 0; d < numJobs; d++) {
			if (this.jssp.jobs[d].finished !== true && this.jssp.jobs[d].running !== true) {
				this.jssp.operationsToSchedule.push(this.jssp.jobs[d].instructions[0]);
			}
		}
	}

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
		this.jssp.dataTable.addRow([operation.machine.toString(), job.toString(), operation.start, operation.end]);

		// Increment to next element in GA
		this.currentGaPatternElement++;

		//outputToPage('Scheduled job ' + job + ' with machine ' + operation.machine.toString() + ' at time ' + this.jssp.currentTime);
		// If there is no more remaining work for this job, mark it as complete
		if(this.jssp.jobs[job].instructions.length === 0) {
			this.jssp.jobs[job].finished = true;
			console.log('Job ' + job + ' finished at timestep ' + operation.end + '!');
			// outputToPage('Job ' + job + ' finished at timestep ' + operation.end + '!');
			this.totalTime = operation.end;
		}
	}

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

	nonDelay(sortingFunction) {
		var numOperationsToSchedule = this.jssp.operationsToSchedule.length;
		this.jssp.operationsToSchedule.sort(sortingFunction);

		var a = 0;

		while (a < numOperationsToSchedule && this.jssp.machines[this.jssp.operationsToSchedule[a].machine].running === true) {
			a++;
		}

		this.scheduleAnOperation(jssp.operationsToSchedule[a]);
	}

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
	var text = document.getElementById('textinput').value;

	var jobsArray = text.split('\n');

	var numJobs = jobsArray.length;

	for(var c = 0; c < numJobs; c++) {
		var array = jobsArray[c].split('  ');
	}

	var numMachines = array.length / 2;

	var bestIndividual = {};

	// GA
	for(var generation = 0; generation < 30; generation++) {
		var individuals = [];

		for(var individual = 0; individual < 30; individual++) {
			var gaPattern = [];

			for(var machine = 0; machine < numMachines; machine++) {
				for(var job = 0; job < numJobs; job++) {
					var pair = {
						method: Math.floor(Math.random() * 2),
						heuristic: Math.floor(Math.random() * 4)
					}
					gaPattern.push(pair);
				}
			}
			individuals.push(new Individual(text, gaPattern));
		}

		individuals.sort(function (a, b) {
			return a.totalTime - b.totalTime;
		});

		individuals[0].draw();

		if(individuals[0].totalTime < bestIndividual.totalTime || generation === 0) {
			bestIndividual = individuals[0];
			outputToPage("New Best Individual!")
		}
		outputToPage("Best individual for generation " + generation.toString() + " finished at timestep " + individuals[0].totalTime.toString());
		outputToPage("Best individual overall at generation " + generation.toString() + " finished at timestep " + bestIndividual.totalTime.toString());
	}

}