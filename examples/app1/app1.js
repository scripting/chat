var myVersion = "0.4.1", myProductName = "app1";

const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");

const urlChatServer = "http://json.chat/";
const fnameStats = "stats.json";
var ctStatsCalls = 0;

function everyMinute () {
	var now = new Date (), timestring = now.toLocaleTimeString ();
	console.log ("\n" + myProductName + " v" + myVersion + ": " + timestring + ", ct == " + ctStatsCalls++ + ".\n");
	request (urlChatServer + "stats", function (err, response, jsontext) {
		if (err) {
			console.log ("everyMinute: err.message == " + err.message);
			}
		else {
			var stats = JSON.parse (jsontext);
			console.log ("everyMinute: stats == " + utils.jsonStringify (stats));
			fs.writeFile (fnameStats, jsontext, function (err) {
				if (err) {
					console.log ("everyMinute: err.message == " + err.message);
					}
				});
			}
		});
	}
function startup () {
	everyMinute ();
	utils.runAtTopOfMinute (function () {
		setInterval (everyMinute, 60000); 
		everyMinute ();
		});
	}
startup ();
