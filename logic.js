'use strict';

var jssp = {
	jobs: [],
	machines: [],
	currentTime: 0,
	dataTable: {},
	operationsToSchedule: []
};

function parseData () {
	// Reset Everything
	clearConsole();
	createDataTable();
	jssp.jobs = [];
	jssp.machines = [];
	jssp.currentTime = 0;

	// Start Parsing Data
	var text = document.getElementById('textinput').value;

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

		console.log('Job ' + c + ' time: ' + jobTime);
		outputToPage('Job ' + c + ' time: ' + jobTime);

		jssp.jobs.push(job);
	}

	for (var m = 0; m < 5; m++) {
		var machine = {
			id: m,
			scheduledOperations: [],
			nextAvailable: 0,
			idleCycles: 0,
			running: false,
		};
		jssp.machines.push(machine);
	}

	schedule();
}

function schedule() {
	var numJobs = jssp.jobs.length;
	var finished = false;

	while (finished === false) {
		var heuristic = Math.floor(Math.random() * 4);
		var sortingFunction;
		if (heuristic === 0) {
			sortingFunction = shortestOperation;
		}
		else if (heuristic === 1) {
			sortingFunction = longestOperation;
		}
		else if (heuristic === 2) {
			sortingFunction = mostOperationsRemaining;
		}
		else if (heuristic === 3) {
			sortingFunction = leastOperationsRemaining;
		}

		var method = Math.floor(Math.random() * 2);
		var methodFunction;
		if (method === 0) {
			methodFunction = gAndT;
		}
		else {
			methodFunction = nonDelay;
		}

		updateAvailableMachines();

		var somethingToSchedule = true;
		while (somethingToSchedule === true) {
			somethingToSchedule = false;
			populateSchedulableOperations();
			for (var a = 0; a < jssp.operationsToSchedule.length; a++) {
				if (jssp.machines[jssp.operationsToSchedule[a].machine].running === false) {
					somethingToSchedule = true;
				}
			}
			if(somethingToSchedule === true) {
				//nonDelay(sortingFunction);
				gAndT(sortingFunction);
			}
		}

		// Increment timestep
		jssp.currentTime++;

		// For now this will be if there are no more jobs to schedule.  Will have to use latest finishing machine as ending time
		var completedJobs = 0;
		for (var j = 0; j < numJobs; j++) {
			if (jssp.jobs[j].finished === true) {
				completedJobs++;
			}
		}

		if (completedJobs >= numJobs) {
			finished = true;
		}
	}

	var container = document.getElementById('barchart_material');
	var chart = new google.visualization.Timeline(container);
	chart.draw(jssp.dataTable);
}

function populateSchedulableOperations() {
	jssp.operationsToSchedule = [];
	var numJobs = jssp.jobs.length;

	for (var d = 0; d < numJobs; d++) {
		if (jssp.jobs[d].finished !== true && jssp.jobs[d].running !== true) {
			jssp.operationsToSchedule.push(jssp.jobs[d].instructions[0]);
		}
	}
}

function updateAvailableMachines() {
	var numMachines = jssp.machines.length;
	for (var z = 0; z < numMachines; z++) {
		if (jssp.machines[z].nextAvailable <= jssp.currentTime) {
			if(jssp.machines[z].running === true) {
				var runningJob = jssp.machines[z].scheduledOperations[jssp.machines[z].scheduledOperations.length - 1].jobId;
				jssp.jobs[runningJob].running = false;
				jssp.machines[z].running = false;
			}
		}
	}
}

function scheduleAnOperation (operation) {
	// Add timing information to this job
	operation.start = jssp.currentTime;
	operation.end = jssp.currentTime + parseInt(operation.time, 10);


	// Add this job to the scheduled list
	jssp.machines[operation.machine].scheduledOperations.push(operation);
	jssp.machines[operation.machine].nextAvailable = jssp.currentTime + parseInt(operation.time, 10);
	jssp.machines[operation.machine].running = true;

	// Get a handle to the actual job, remove this operation from the remaining work
	// and mark it as running
	var job = operation.jobId;
	jssp.jobs[job].instructions.splice(0,1);
	jssp.jobs[job].running = true;

	// Add information to the gantt chart data structure
	jssp.dataTable.addRow([operation.machine.toString(), job.toString(), operation.start, operation.end]);

	outputToPage('Scheduled job ' + job + ' with machine ' + operation.machine.toString() + ' at time ' + jssp.currentTime);
	// If there is no more remaining work for this job, mark it as complete
	if(jssp.jobs[job].instructions.length === 0) {
		jssp.jobs[job].finished = true;
		console.log('Job ' + job + ' finished at timestep ' + operation.end + '!');
		outputToPage('Job ' + job + ' finished at timestep ' + operation.end + '!');
	}
}

function gAndT(sortingFunction) {
	var numJobs = jssp.jobs.length;
	var numMachines = jssp.machines.length;
	var numOperationsToSchedule = jssp.operationsToSchedule.length;

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
		var numOperations = jssp.jobs[m].instructions.length;
		for (var n = 0; n < numOperations; n++) {
			machineArray[jssp.jobs[m].instructions[n].machine].time += parseInt(jssp.jobs[m].instructions[n].time, 10);
		}
	}

	// Will sort to have m* be the first machine in the list
	machineArray.sort(function (a, b) {
		return a.time - b.time;
	});

	jssp.operationsToSchedule.sort(sortingFunction);

	for (var b = 0; b < numMachines; b++) {
		if(jssp.machines[machineArray[b].id].running === false) {
			for (var c = 0; c < numOperationsToSchedule; c++) {
				if(parseInt(jssp.operationsToSchedule[c].machine, 10) === machineArray[b].id) {
					scheduleAnOperation(jssp.operationsToSchedule[c]);
					return;
				}
			}
		}
	}
}

function nonDelay(sortingFunction) {
	var numOperationsToSchedule = jssp.operationsToSchedule.length;
	jssp.operationsToSchedule.sort(sortingFunction);

	var a = 0;

	while (a < numOperationsToSchedule && jssp.machines[jssp.operationsToSchedule[a].machine].running === true) {
		a++;
	}

	scheduleAnOperation(jssp.operationsToSchedule[a]);
}

function createDataTable () {
	jssp.dataTable = new google.visualization.DataTable();
	jssp.dataTable.addColumn({type: 'string', id: 'Machine'});
	jssp.dataTable.addColumn({type: 'string', id: 'Job'});
	jssp.dataTable.addColumn({type: 'number', id: 'Start'});
	jssp.dataTable.addColumn({type: 'number', id: 'End'});
}

/////////////////// Hueristics ///////////////////
function shortestOperation (a, b) {
	if (a.time < b.time) {
		return -1;
	}
	if (a.time > b.time) {
		return 1;
	}
	return 0;
}

function longestOperation (a, b) {
	return (-1 * shortestOperation(a, b));
}

function leastOperationsRemaining (a, b) {
	var aJobOperationsRemaining = jssp.jobs[a.jobId].instructions.length;
	var bJobOperationsRemaining = jssp.jobs[b.jobId].instructions.length;

	if (aJobOperationsRemaining < bJobOperationsRemaining) {
		return -1;
	}
	if (aJobOperationsRemaining > bJobOperationsRemaining) {
		return 1;
	}
	return 0;
}

function mostOperationsRemaining (a, b) {
	return (-1 * leastOperationsRemaining(a, b));
}
//////////////////////////////////////////////////