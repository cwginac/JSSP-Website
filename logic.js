'use strict';

var jssp = {
	jobs: []
};

var dataTable = {};
var machines = [];
var time = 0;

function parseData () {
	// Reset Everything
	clearConsole();
	createDataTable();
	jssp.jobs = [];
	machines = [];
	time = 0;

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
		machines.push(machine);
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

		gAndT(sortingFunction);

		// Increment timestep
		time++;

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

	var machinesJson = JSON.stringify(machines);

	console.log(machinesJson);

	var container = document.getElementById('barchart_material');
	var chart = new google.visualization.Timeline(container);
	chart.draw(dataTable);
}

function gAndT(sortingFunction) {
	var numJobs = jssp.jobs.length;
	var numMachines = machines.length;

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

	// c = machine
	for (var z = 0; z < numMachines; z++) {
		var c = machineArray[0].id;
		machineArray.splice(0,1);
		
		if (machines[c].nextAvailable <= time) {
			if(machines[c].running === true) {
				var runningJob = machines[c].scheduledOperations[machines[c].scheduledOperations.length - 1].jobId;
				jssp.jobs[runningJob].running = false;
				machines[c].running = false;
			}

			// Looking for jobs that next item is for machine C
			var jobsForThisMachine = [];

			// d = job
			for (var d = 0; d < numJobs; d++) {
				if (jssp.jobs[d].finished !== true && jssp.jobs[d].running !== true && jssp.jobs[d].instructions[0].machine == c) {
					jobsForThisMachine.push(jssp.jobs[d].instructions[0]);
				}
			}

			// Apply Hueristic
			jobsForThisMachine.sort(sortingFunction);

			// If there is a job for this machine, schedule it
			if(jobsForThisMachine.length > 0) {
				// Add timing information to this job
				jobsForThisMachine[0].start = time;
				jobsForThisMachine[0].end = time + parseInt(jobsForThisMachine[0].time, 10);

				// Add this job to the scheduled list
				machines[c].scheduledOperations.push(jobsForThisMachine[0]);
				machines[c].nextAvailable = time + parseInt(jobsForThisMachine[0].time, 10);
				machines[c].running = true;

				// Get a handle to the actual job, remove this operation from the remaining work
				// and mark it as running
				var job = jobsForThisMachine[0].jobId;
				jssp.jobs[job].instructions.splice(0,1);
				jssp.jobs[job].running = true;

				// Add information to the gantt chart data structure
				dataTable.addRow([c.toString(), job.toString(), jobsForThisMachine[0].start, jobsForThisMachine[0].end]);

				// If there is no more remaining work for this job, mark it as complete
				if(jssp.jobs[job].instructions.length === 0) {
					jssp.jobs[job].finished = true;
					console.log('Job ' + job + ' finished at timestep ' + jobsForThisMachine[0].end + '!');
					outputToPage('Job ' + job + ' finished at timestep ' + jobsForThisMachine[0].end + '!');
				}
			}
			// Else, just let this machine sit empty
			else {
				machines[c].idleCycles++;
			}
		}
	}
}

function nonDelay(sortingFunction) {
	var numJobs = jssp.jobs.length;

	// c = machine
	for (var c = 0; c < 5; c++) {

		if (machines[c].nextAvailable <= time) {
			if(machines[c].running === true) {
				var runningJob = machines[c].scheduledOperations[machines[c].scheduledOperations.length - 1].jobId;
				jssp.jobs[runningJob].running = false;
				machines[c].running = false;
			}

			// Looking for jobs that next item is for machine C
			var jobsForThisMachine = [];

			// d = job
			for (var d = 0; d < numJobs; d++) {
				if (jssp.jobs[d].finished !== true && jssp.jobs[d].running !== true && jssp.jobs[d].instructions[0].machine == c) {
					jobsForThisMachine.push(jssp.jobs[d].instructions[0]);
				}
			}

			// Apply Hueristic
			jobsForThisMachine.sort(sortingFunction);

			// If there is a job for this machine, schedule it
			if(jobsForThisMachine.length > 0) {
				// Add timing information to this job
				jobsForThisMachine[0].start = time;
				jobsForThisMachine[0].end = time + parseInt(jobsForThisMachine[0].time, 10);

				// Add this job to the scheduled list
				machines[c].scheduledOperations.push(jobsForThisMachine[0]);
				machines[c].nextAvailable = time + parseInt(jobsForThisMachine[0].time, 10);
				machines[c].running = true;

				// Get a handle to the actual job, remove this operation from the remaining work
				// and mark it as running
				var job = jobsForThisMachine[0].jobId;
				jssp.jobs[job].instructions.splice(0,1);
				jssp.jobs[job].running = true;

				// Add information to the gantt chart data structure
				dataTable.addRow([c.toString(), job.toString(), jobsForThisMachine[0].start, jobsForThisMachine[0].end]);

				// If there is no more remaining work for this job, mark it as complete
				if(jssp.jobs[job].instructions.length === 0) {
					jssp.jobs[job].finished = true;
					console.log('Job ' + job + ' finished at timestep ' + jobsForThisMachine[0].end + '!');
					outputToPage('Job ' + job + ' finished at timestep ' + jobsForThisMachine[0].end + '!');
				}
			}
			// Else, just let this machine sit empty
			else {
				machines[c].idleCycles++;
			}
		}
	}
}

function createDataTable () {
	dataTable = new google.visualization.DataTable();
	dataTable.addColumn({type: 'string', id: 'Machine'});
	dataTable.addColumn({type: 'string', id: 'Job'});
	dataTable.addColumn({type: 'number', id: 'Start'});
	dataTable.addColumn({type: 'number', id: 'End'});
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