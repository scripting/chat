var myVersion = "0.5.28", myProductName = "davechat";  

exports.start = start;

const utils = require ("daveutils");
const davecache = require ("davecache");
const filesystem = require ("davefilesystem");
const request = require ("request");
const davetwitter = require ("davetwitter"); 
const websocket = require ("nodejs-websocket"); 
const fs = require ("fs");
const dns = require ("dns");
const os = require ("os");
const AWS = require ("aws-sdk"); //5/8/19 by DW

var config = {
	httpPort: 1402,
	websocketPort: 1403,
	myDomain: "localhost",
	owner: undefined, //screenname of user who can admin the server
	blacklist: [
		],
	client: {
		flReadOnlyMode: false,
		productnameForDisplay: "json.chat",
		leadingQuestion: "What's for dinner?",
		editorPlaceholderText: "This is a good place for a (small) blog post."
		},
	twitter: {
		flLogToConsole: true,
		flForceTwitterLogin: true,
		twitterConsumerKey: undefined,
		twitterConsumerSecret: undefined
		},
	email: {
		enabled: true,
		sendFrom: "dave.winer@gmail.com",
		sendTo: "dave.winer@gmail.com"
		 },
	fnameChatlog: "data/chatlog.json",
	fnameStats: "data/stats.json",
	userDataFolder: "data/users/",
	archiveFolder: "data/archive/",
	fnamePrefs: "prefs.json",
	urlServerHomePageSource: "http://scripting.com/chat/code/template.html",
	flArchiveItems: true, //5/9/19 by DW
	urlStoriesTemplate: "http://scripting.com/chat/code/stories/template.html", //5/11/19 by DW
	};

var flAtLeastOneHitInLastMinute = false;

function getDomainName (clientIp, callback) { 
	if (clientIp === undefined) {
		if (callback !== undefined) {
			callback ("undefined");
			}
		}
	else {
		dns.reverse (clientIp, function (err, domains) {
			var name = clientIp;
			if (!err) {
				if (domains.length > 0) {
					name = domains [0];
					}
				}
			if (callback !== undefined) {
				callback (name);
				}
			});
		}
	}
function loadDataFile (f, callback) { 
	utils.sureFilePath (f, function () {
		fs.readFile (f, function (err, jsontext) {
			if (err) {
				console.log ("loadDataFile: error reading " + f + " == " + err.message);
				if (callback !== undefined) {
					callback (err);
					}
				}
			else {
				try {
					var jstruct = JSON.parse (jsontext);
					if (callback !== undefined) {
						callback (undefined, jstruct);
						}
					}
				catch (err) {
					console.log ("loadDataFile: error parsing " + f + " == " + err.message);
					if (callback !== undefined) {
						callback (err);
						}
					}
				}
			});
		});
	}
function saveDataFile (f, jstruct, callback) {
	utils.sureFilePath (f, function () {
		fs.writeFile (f, utils.jsonStringify (jstruct), function (err) {
			if (err) {
				console.log ("saveDataFile: error writing " + f + " == " + err.message);
				}
			if (callback !== undefined) {
				callback (err);
				}
			});
		});
	}

//websockets
	var theWsServer;
	
	function notifySocketSubscribers (verb, jstruct) {
		if (theWsServer !== undefined) {
			var ctUpdates = 0, now = new Date ();
			if (jstruct === undefined) {
				jstruct = {};
				}
			var jsontext = utils.jsonStringify (jstruct);
			for (var i = 0; i < theWsServer.connections.length; i++) {
				var conn = theWsServer.connections [i];
				if (conn.chatLogData !== undefined) { //it's one of ours
					try {
						conn.sendText (verb + "\r" + jsontext);
						conn.chatLogData.whenLastUpdate = now;
						conn.chatLogData.ctUpdates++;
						ctUpdates++;
						}
					catch (err) {
						console.log ("notifySocketSubscribers: socket #" + i + ": error updating");
						}
					}
				}
			}
		}
	function countOpenSockets () {
		if (theWsServer === undefined) { //12/18/15 by DW
			return (0);
			}
		else {
			return (theWsServer.connections.length);
			}
		}
	function getOpenSocketsArray () { //return an array with data about open sockets
		var theArray = new Array ();
		for (var i = 0; i < theWsServer.connections.length; i++) {
			var conn = theWsServer.connections [i];
			if (conn.chatLogData !== undefined) { //it's one of ours
				theArray [theArray.length] = {
					arrayIndex: i,
					lastVerb: conn.chatLogData.lastVerb,
					urlToWatch: conn.chatLogData.urlToWatch,
					domain: conn.chatLogData.domain,
					whenStarted: utils.viewDate (conn.chatLogData.whenStarted),
					whenLastUpdate: (conn.chatLogData.whenLastUpdate === undefined) ? "" : utils.viewDate (conn.chatLogData.whenLastUpdate),
					ctUpdates: conn.chatLogData.ctUpdates
					};
				}
			}
		return (theArray);
		}
	function handleWebSocketConnection (conn) { 
		var now = new Date ();
		
		function logToConsole (conn, verb, value) {
			getDomainName (conn.socket.remoteAddress, function (theName) { //log the request
				var freemem = utils.gigabyteString (os.freemem ()), method = "WS:" + verb, now = new Date (); 
				if (theName === undefined) {
					theName = conn.socket.remoteAddress;
					}
				console.log (now.toLocaleTimeString () + " " + freemem + " " + method + " " + value + " " + theName);
				conn.chatLogData.domain = theName; 
				});
			}
		
		conn.chatLogData = {
			whenStarted: now,
			whenLastUpdate: undefined,
			ctUpdates: 0
			};
		conn.on ("text", function (s) {
			var words = s.split (" ");
			if (words.length > 1) { //new protocol as of 11/29/15 by DW
				conn.chatLogData.lastVerb = words [0];
				switch (words [0]) {
					case "watch":
						conn.chatLogData.urlToWatch = utils.trimWhitespace (words [1]);
						logToConsole (conn, conn.chatLogData.lastVerb, conn.chatLogData.urlToWatch);
						break;
					}
				}
			else {
				conn.close ();
				}
			});
		conn.on ("close", function () {
			});
		conn.on ("error", function (err) {
			});
		}
	function webSocketStartup (thePort) {
		console.log ("webSocketStartup: thePort == " + thePort);
		try {
			theWsServer = websocket.createServer (handleWebSocketConnection);
			theWsServer.listen (thePort);
			}
		catch (err) {
			console.log ("webSocketStartup: err.message == " + err.message);
			}
		}
	function sendReloadMessage (screenname, callback) {
		if (screenname == config.owner) {
			notifySocketSubscribers ("reload");
			callback (undefined, {"message": "reload message sent to all websocket subscribers."});
			}
		else {
			callback ({message: "Can't send the message because the account is not authorized."});
			}
		}
//mail -- 5/8/19 by DW
	var ses = new AWS.SES ({
		apiVersion: "2010-12-01",
		region: "us-east-1"
		});
	function sendMail (recipient, subject, message, sender, callback) {
		var theMail = {
			Source: sender,
			ReplyToAddresses: [sender],
			ReturnPath: sender,
			Destination: {
				ToAddresses: [recipient]
				},
			Message: {
				Body: {
					Html: {
						Data: message
						},
					Text: {
						Data: utils.stripMarkup (message)
						}
					},
				Subject: {
					Data: subject
					}
				},
			};
		ses.sendEmail (theMail, function (err, data) { 
			if (err) {
				console.log ("\nsendMail: err.message == " + err.message);
				}
			else {
				console.log ("\nsendMail: data == " + JSON.stringify (data, undefined, 4));
				}
			});
		}
	function sendNotificationMail (thePost) { //5/8/19 by DW
		if (config.email.enabled) {
			var emailtext = "";
			function add (s) {
				emailtext += s
				}
			add ("<table>");
			add ("<tr><td>icon:</td><td><img src=\"" + thePost.urlIcon + "\"></td></tr>");
			add ("<tr><td>screenname:</td><td>" + thePost.screenname + "</td></tr>");
			add ("<tr><td>authorname:</td><td>" + thePost.authorname + "</td></tr>");
			add ("<tr><td>when:</td><td>" + thePost.when + "</td></tr>");
			add ("<tr><td>id:</td><td>" + thePost.id + "</td></tr>");
			add ("<tr><td></td><td>" + thePost.text + "</td></tr>");
			add ("</table>");
			add ("<br><br><br>");
			sendMail (config.email.sendTo, "New chat post", emailtext, config.email.sendFrom, function () {
				});
			}
		}
//saving items to a file -- 5/9/19 by DW
	function getItemFilePath (item) {
		var f = config.archiveFolder + utils.getDatePath (item.when) + utils.padWithZeros (item.id, 5) + ".json";
		return (f);
		}
	function getItemPermalink (item) {
		return ("http://" + config.myDomain + "/story?day=" + utils.getDatePath (item.when) + "&id=" + item.id);
		}
	function saveItemToFile (item, callback) { 
		if (config.flArchiveItems) {
			var f = getItemFilePath (item);
			utils.sureFilePath (f, function () {
				fs.writeFile (f, utils.jsonStringify (item), function (err) {
					if (err) {
						console.log ("saveItemToFile: err.message == " + err.message);
						}
					if (callback !== undefined) {
						callback ();
						}
					});
				});
			}
		else {
			if (callback !== undefined) {
				callback ();
				}
			}
		}
	function deleteFileItem (item, callback) {
		var f = getItemFilePath (item);
		console.log ("deleteFileItem: f == " + f);
		fs.unlink (f, function (err) {
			if (err) {
				console.log ("deleteFileItem: err.message == " + err.message);
				}
			if (callback !== undefined) {
				callback ();
				}
			});
		}
	function returnStoryPage (jsontext, templatetext, callback) {
		try {
			var item = JSON.parse (jsontext);
			var pagetable = {
				jsontext: jsontext,
				title: (item.authorname) ? item.authorname : item.screenname
				};
			var pagetext = utils.multipleReplaceAll (templatetext, pagetable, false, "[%", "%]");
			callback (undefined, pagetext);
			}
		catch (err) {
			callback (err);
			}
		}
	function serveStory (day, id, callback) {
		var year = utils.stringNthField (day, "/", 1);
		var month = utils.stringNthField (day, "/", 2);
		var day = utils.stringNthField (day, "/", 3);
		var f = config.archiveFolder + year + "/" + month + "/" + day + "/" + utils.padWithZeros (id, 5) + ".json";
		console.log ("serveStory: f == " + f);
		fs.readFile (f, function (err, filedata) {
			if (err) {
				callback (err);
				}
			else {
				request (config.urlStoriesTemplate, function (err, response, templatetext) {
					if (err) {
						callback (err);
						}
					else {
						if (response.statusCode != 200) {
							var myError = {
								message: "HTTP response code == " + response.statusCode + "."
								};
							callback (myError);
							}
						else {
							returnStoryPage (filedata, templatetext, callback);
							}
						}
					});
				}
			});
		}
	
//chatlog
	var theChatlog = {
		idNextPost: 0,
		messages: []
		};
	var flChatlogChanged = false;
	
	function chatlogChanged () {
		flChatlogChanged = true;
		}
	function OKToPost (screenname, callback) {
		if (config.flReadOnlyMode) { //11/26/16 by DW
			callback ({message: "Can't post because the server is in read-only mode."});
			return (false);
			}
		else {
			if (config.blacklist !== undefined) {
				var lowerscreenname = screenname.toLowerCase ();
				for (var i = 0; i < config.blacklist.length; i++) {
					if (config.blacklist [i].toLowerCase () == lowerscreenname) {
						callback ({message: "Can't post because the account is not authorized."});
						return (false);
						}
					}
				}
			return (true);
			}
		}
	function findChatlogItem (id) {
		for (var i = 0; i < theChatlog.messages.length; i++) {
			var item = theChatlog.messages [i];
			if (item.id == id) {
				return (i);
				}
			}
		return (-1);
		}
	function postToChatlog (jsontext, screenname, callback) {
		if (OKToPost (screenname, callback)) {
			try {
				var thePost = JSON.parse (jsontext);
				thePost.text = decodeURIComponent (thePost.text); //4/25/19 by DW
				thePost.id = theChatlog.idNextPost++;
				thePost.when = new Date ();
				thePost.screenname = screenname;
				thePost.permalink = getItemPermalink (thePost); //5/10/19 by DW
				theChatlog.messages.unshift (thePost);
				chatlogChanged ();
				saveItemToFile (thePost); //5/9/19 by DW
				notifySocketSubscribers ("update", thePost);
				sendNotificationMail (thePost); //5/8/19 by DW
				if (callback !== undefined) {
					callback (undefined, thePost);
					}
				}
			catch (err) {
				if (callback !== undefined) {
					callback (err);
					}
				}
			}
		}
	function getChatlog (callback) {
		var chatlogSubset = {
			messages: []
			};
		for (var i = 0; i < theChatlog.messages.length; i++) {
			var item = theChatlog.messages [i], flInclude = true;
			if (item.flDeleted !== undefined) {
				if (item.flDeleted) {
					flInclude = false;
					}
				}
			if (flInclude) {
				chatlogSubset.messages.push (item);
				}
			}
		callback (chatlogSubset);
		}
	function updateChatlogItem (id, theText, screenname, callback) {
		if (OKToPost (screenname, callback)) {
			var now = new Date ();
			for (var i = 0; i < theChatlog.messages.length; i++) {
				var item = theChatlog.messages [i];
				if (item.id == id) {
					if (item.screenname == screenname) {
						item.text = theText;
						item.ctUpdates = (item.ctUpdates === undefined) ? 1 : item.ctUpdates++;
						item.whenLastUpdate = now;
						item.permalink = getItemPermalink (item);
						notifySocketSubscribers ("update", item);
						saveItemToFile (item); //5/9/19 by DW
						if (callback !== undefined) {
							callback (undefined, item); 
							}
						chatlogChanged ();
						return;
						}
					else {
						callback ({message: "Can't update because there is no message with the indicated id and screenname."});
						return;
						}
					}
				}
			callback ({message: "Can't update because there is no message with the indicated id."});
			}
		}
	function likeChatlogItem (id, screenname, callback) {
		if (OKToPost (screenname, callback)) {
			var now = new Date ();
			for (var i = 0; i < theChatlog.messages.length; i++) {
				var item = theChatlog.messages [i];
				if (item.id == id) {
					var fl = true;
					if (item.likes === undefined) {
						item.likes = new Object ();
						}
					if (item.likes [screenname] === undefined) {
						item.likes [screenname] = {
							when: now
							};
						}
					else {
						delete item.likes [screenname];
						fl = false;
						}
					notifySocketSubscribers ("update", item);
					if (callback !== undefined) {
						callback (undefined, fl); //return true if we liked, false if we unliked
						}
					chatlogChanged ();
					return;
					}
				}
			}
		}
	function deleteChatlogItem (id, screenname, callback) {
		if (OKToPost (screenname, callback)) {
			if (screenname == config.owner) {
				var ix = findChatlogItem (id);
				if (ix >= 0) {
					var item = theChatlog.messages [ix];
					item.flDeleted = true;
					chatlogChanged ();
					deleteFileItem (item); //5/9/19 by DW
					notifySocketSubscribers ("deleteItem", {id: id});
					callback (undefined, "deleted");
					}
				else {
					callback ({message: "Can't update because there is no message with the indicated id."});
					}
				}
			else {
				callback ({message: "Can't delete the item because the account is not authorized."});
				}
			}
		}
	function rolloverChatlog (screenname, callback) {
		if (screenname == config.owner) {
			var f = config.archiveFolder + "rollovers/chatlog" + utils.padWithZeros (stats.backupSerialNum++, 3) + ".json";
			saveDataFile (f, theChatlog, function (err) {
				if (err) {
					callback (err);
					}
				else {
					console.log ("rolloverChatlog: archived chatlog == " + f);
					theChatlog.messages = [];
					statsChanged ();
					chatlogChanged ();
					notifySocketSubscribers ("rollover");
					callback (undefined, "rolled over");
					}
				});
			}
		else {
			callback ({message: "Can't rollover because the account is not authorized."});
			}
		}
	function readChatlog (callback) {
		loadDataFile (config.fnameChatlog, function (err, jstruct) {
			if (jstruct === undefined) { //force the initial file to be written
				chatlogChanged ();
				}
			else {
				theChatlog = jstruct;
				}
			if (callback !== undefined) {
				callback ();
				}
			});
		}
	function saveChatlogIfChanged (callback) {
		if (flChatlogChanged) {
			saveDataFile (config.fnameChatlog, theChatlog, callback);
			flChatlogChanged = false;
			}
		}
//stats
	var stats = {
		productName: myProductName,
		version: myVersion,
		
		ctServerStarts: 0,
		whenServerStart: undefined,
		ctHoursServerUp: 0,
		
		ctHits: 0, 
		ctHitsThisRun: 0,
		ctHitsToday: 0, 
		whenLastDayRollover: undefined,
		
		ctStatsSaves: 0,
		
		backupSerialNum: 0 //10/6/16 by DW
		};
	var flStatsChanged = false;
	
	function statsChanged () {
		flStatsChanged = true;
		}
	function readStats (callback) {
		loadDataFile (config.fnameStats, function (err, jstruct) {
			if (jstruct === undefined) { //force the initial file to be written
				statsChanged ();
				}
			else {
				for (var x in jstruct) {
					stats [x] = jstruct [x];
					}
				}
			if (callback !== undefined) {
				callback ();
				}
			});
		}
	function saveStats (callback) {
		getStats (); //set dynamic stats
		stats.ctStatsSaves++; 
		fs.writeFile (config.fnameStats, utils.jsonStringify (stats), callback);
		}
	function getStats (callback) { //the stats we return to clients via HTTP
		stats.productName = myProductName;
		stats.version = myVersion;
		stats.ctSockets = countOpenSockets ();
		stats.ctHoursServerUp = Number ((utils.secondsSince (stats.whenServerStart) / 3600).toFixed (3));
		stats.urlChatSocket = config.client.urlChatSocket;
		stats.owner = config.owner;
		if (callback !== undefined) {
			callback (stats);
			}
		}
//prefs
	function getPrefs (screenname, callback) {
		var f = config.userDataFolder + screenname + "/" + config.fnamePrefs;
		loadDataFile (f, function (err, jstruct) {
			callback (err, jstruct);
			});
		}
	function savePrefs (screenname, jsontext, callback) {
		var f = config.userDataFolder + screenname + "/" + config.fnamePrefs;
		try {
			saveDataFile (f, JSON.parse (jsontext), callback);
			}
		catch (err) {
			callback (err);
			}
		}

function handleHttpRequest (theRequest) {
	var now = new Date ();
	var token = (theRequest.params.oauth_token !== undefined) ? theRequest.params.oauth_token : undefined;
	var secret = (theRequest.params.oauth_token_secret !== undefined) ? theRequest.params.oauth_token_secret : undefined;
	
	//stats
		stats.ctHits++;
		stats.ctHitsThisRun++;
		stats.ctHitsToday++;
		statsChanged ()
		
		flAtLeastOneHitInLastMinute = true;
	
	function returnPlainText (s) {
		theRequest.httpReturn (200, "text/plain", s.toString ());
		}
	function returnData (jstruct) {
		if (jstruct === undefined) {
			jstruct = {};
			}
		theRequest.httpReturn (200, "application/json", utils.jsonStringify (jstruct));
		}
	function returnHtml (htmltext) {
		theRequest.httpReturn (200, "text/html", htmltext);
		}
	function returnNotFound () {
		theRequest.httpReturn (404, "text/plain", "Not found.");
		}
	function returnError (jstruct) {
		console.log ("returnError: jstruct.message == " + jstruct.message);
		theRequest.httpReturn (500, "application/json", utils.jsonStringify (jstruct));
		}
	function httpReturn (err, jstruct) {
		if (err) {
			returnError (err);
			}
		else {
			returnData (jstruct);
			}
		}
	function returnServerHomePage () {
		request (config.urlServerHomePageSource, function (error, response, templatetext) {
			if (!error && response.statusCode == 200) {
				var pagetable = {
					config: utils.jsonStringify (config.client),
					title: config.client.productnameForDisplay,
					version: myVersion
					};
				var pagetext = utils.multipleReplaceAll (templatetext, pagetable, false, "[%", "%]");
				returnHtml (pagetext);
				}
			});
		}
	
	function callWithScreenname (callback) {
		davetwitter.getScreenName (token, secret, function (screenname) {
			if (screenname === undefined) {
				returnError ({message: "Can't do the thing you want because the accessToken is not valid."});    
				}
			else {
				callback (screenname);
				}
			});
		}
	
	switch (theRequest.method) {
		case "POST":
			console.log ("handleHttpRequest: theRequest.method == " + theRequest.method + ", theRequest.lowerpath == " + theRequest.lowerpath); //xxx
			switch (theRequest.lowerpath) {
				case "/post": 
					callWithScreenname (function (screenname) {
						postToChatlog (theRequest.postBody, screenname, function (err, theResponse) {
							if (err) { //debugging -- xxx
								console.log ("postToChatlog callback: err == " + utils.jsonStringify (err));
								}
							httpReturn (err, theResponse);
							});
						});
				}
		case "GET":
			switch (theRequest.lowerpath) {
				case "/":
					returnServerHomePage ();
					return (true); 
				case "/version":
					returnPlainText (myVersion);
					return (true);
				case "/now":
					returnPlainText (now.toString ());
					return (true);
				case "/stats":
					getStats (function (response) {
						returnData (response);
						});
					return (true); 
				case "/getchatlog":
					getChatlog (function (response) {
						returnData (response);
						});
					return (true);
				case "/getmyscreenname":
					callWithScreenname (function (screenname) {
						returnPlainText (screenname);
						});
					return (true);
				case "/updatetext":
					callWithScreenname (function (screenname) {
						updateChatlogItem (theRequest.params.id, theRequest.params.text, screenname, function (err, response) {
							httpReturn (err, response);
							});
						});
					return (true); 
				case "/like":
					callWithScreenname (function (screenname) {
						likeChatlogItem (theRequest.params.id, screenname, function (err, response) {
							httpReturn (err, response);
							});
						});
					return (true); 
				case "/delete":
					callWithScreenname (function (screenname) {
						deleteChatlogItem (theRequest.params.id, screenname, function (err, response) {
							httpReturn (err, response);
							});
						});
					return (true); 
				case "/saveprefs":
					callWithScreenname (function (screenname) {
						savePrefs (screenname, theRequest.params.jsontext, function (err, response) {
							httpReturn (err, response);
							});
						});
					return (true); 
				case "/getprefs":
					callWithScreenname (function (screenname) {
						getPrefs (screenname, function (err, response) {
							httpReturn (err, response);
							});
						});
					return (true); 
				case "/getuserinfo":
					callWithScreenname (function (screenname) {
						davetwitter.getUserInfo (token, secret, screenname, function (err, theInfo) {
							httpReturn (err, theInfo);
							});
						});
					return (true); 
				case "/rollover":
					callWithScreenname (function (screenname) {
						rolloverChatlog (screenname, function (err, response) {
							httpReturn (err, response);
							});
						});
					return (true); 
				case "/reload":
					callWithScreenname (function (screenname) {
						sendReloadMessage (screenname, function (err, response) {
							httpReturn (err, response);
							});
						});
					return (true); 
				
				case "/story": //5/10/19 by DW
					serveStory (theRequest.params.day, theRequest.params.id, function (err, htmltext) {
						if (err) {
							returnError (err);
							}
						else {
							returnHtml (htmltext);
							}
						});
					return (true); 
				
				}
			break;
		}
	
	return (false); //we didn't handle it
	}

function everyMinute () {
	var now = new Date (), timestring = now.toLocaleTimeString ();
	var ct = countOpenSockets (), countstring = ct + " open socket" + ((ct != 1) ? "s" : "");
	if (flAtLeastOneHitInLastMinute) {
		console.log ("");
		flAtLeastOneHitInLastMinute = false;
		}
	console.log (myProductName + " v" + myVersion + ": " + timestring + ", " + countstring + ".\n");
	if (!utils.sameDay (stats.whenLastDayRollover, now)) { //date rollover
		stats.whenLastDayRollover = now;
		stats.ctHitsToday = 0;
		statsChanged ();
		}
	if (flStatsChanged) {
		flStatsChanged = false;
		saveStats (function () {
			notifySocketSubscribers ("stats", stats);
			});
		}
	}
function everySecond () {
	saveChatlogIfChanged ();
	}
function start (options, callback) {
	var now = new Date ();
	function copyOptions () {
		function copyObject (source, dest) {
			for (x in source) {
				let val = source [x], type = typeof (val);
				if ((type == "object") && (val.constructor !== Array) && (!(val instanceof Date))) {
					if (dest [x] === undefined) {
						dest [x] = new Object ();
						}
					copyObject  (val, dest [x]);
					}
				else {
					dest [x] = val;
					}
				}
			}
		if (options !== undefined) {
			copyObject (options, config);
			}
		}
	
	copyOptions ();
	
	//some items in config are derived from others
		config.twitter.myDomain = config.myDomain; //4/19/19 by DW -- no longer add the port
		config.twitter.httpPort = config.httpPort;
	
	console.log ("\n" + myProductName + " v" + myVersion + ", running on port " + config.httpPort + ".\n");
	console.log ("config == " + utils.jsonStringify (config));
	
	config.twitter.flPostEnabled = true; //we want davehttp to handle POST messages for us
	config.twitter.httpRequestCallback = handleHttpRequest; //we get first shot at all incoming HTTP requests
	
	davetwitter.start (config.twitter, function () {
		readChatlog (function () {
			readStats (function () {
				stats.ctServerStarts++;
				stats.whenServerStart = now; 
				stats.whenLastDayRollover = now; 
				stats.ctHitsThisRun = 0;
				statsChanged ();
				setInterval (everySecond, 1000); 
				utils.runEveryMinute (everyMinute);
				webSocketStartup (config.websocketPort); 
				davecache.start (undefined, function () {
					});
				});
			});
		});
	}
