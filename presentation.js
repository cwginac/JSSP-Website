 'use strict';

window.onload = function () {
	google.charts.load('current', {'packages':['timeline', 'corechart', 'line']});
	addEventListeners();
};


function addEventListeners () {
	var $parseButton = document.getElementById('parseData');

	$parseButton.addEventListener('click', initialize);

	var $clearButton = document.getElementById('clearData');
	$clearButton.addEventListener('click', clearTextInput);

}

function clearTextInput () {
	document.getElementById('textinput').value = '';
}

function outputToPage(newText) {
	var consoleOutput = document.getElementById('console');

	var oldHtml = consoleOutput.innerHTML;

	var newHtml = oldHtml + '<br />' + newText;

	consoleOutput.innerHTML = newHtml;

	// Keep the div scrolled to the bottom to show current output.
    consoleOutput.scrollTop = consoleOutput.scrollHeight - consoleOutput.clientHeight;
}

function clearConsole() {
	var consoleOutput = document.getElementById('console');
	consoleOutput.innerHTML = "";
}