const chat = require ("davechat");
const fs = require ("fs");

fs.readFile ("config.json", function (err, jsontext) {
	if (err) {
		console.log (err.message);
		}
	else {
		try {
			var jstruct = JSON.parse (jsontext);
			chat.start (jstruct);
			}
		catch (err) {
			console.log (err.message);
			}
		}
	});
