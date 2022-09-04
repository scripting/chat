const chat = require ("davechat"); 
const fs = require ("fs"); 

console.log ("This is the demo server that's part of the davechat repository, edited in the OPML Editor in the davechatServer package.");

fs.readFile ("config.json", function (err, jsontext) {
	if (err) {
		console.log (err.message);
		}
	else {
		try {
			var jstruct = JSON.parse (jsontext);
			if (process.env.PORT !== undefined) { //5/21/20 by DW
				jstruct.httpPort = process.env.PORT;
				}
			chat.start (jstruct);
			}
		catch (err) {
			console.log (err.message);
			}
		}
	});
