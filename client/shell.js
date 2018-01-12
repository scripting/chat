const appConsts = {
	urlChatServer: "http://localhost:1402/",
	urlChatSocket: "ws://localhost:1403/",
	productname: "jsonChat",
	productnameForDisplay: "json.chat",
	description: "A simple extensible JavaScript chat network.",
	leadingQuestion: "",
	editorPlaceholderText: "",
	domain: "json.chat", 
	version: "0.5.3"
	}

const fnameConfig = "config.json";
var whenLastUserAction = new Date ();
var myNodeStorageApp, myChatApp;
var userInfoFromTwitter = undefined;
var flTwitterWasConnected = undefined;
var appPrefs;

function toggleConnect () {
	$("#idTwitterButton").blur (); //take the focus off the button
	twToggleConnectCommand ();
	}
function updateJsonMenuItem () {
	$("#idJsonMenuItem").text (((myChatApp.chatGlobals.flJsonDisplayMode) ? "View in HTML" : "View in JSON") + "...");
	}
function toggleJsonDisplayMode () {
	myChatApp.toggleJsonDisplayMode ();
	updateJsonMenuItem ();
	}
function getUserInfo (callback) {
	if (twIsTwitterConnected ()) {
		var paramtable = {
			oauth_token: localStorage.twOauthToken,
			oauth_token_secret: localStorage.twOauthTokenSecret
			}
		var url = twGetDefaultServer () + "getuserinfo?" + twBuildParamList (paramtable, false);
		readHttpFile (url, function (jsontext) { 
			if (jsontext !== undefined) {
				userInfoFromTwitter = JSON.parse (jsontext);
				console.log ("getUserInfo: userInfoFromTwitter == " + jsonStringify (userInfoFromTwitter));
				}
			if (callback !== undefined) {
				callback ();
				}
			});
		}
	else {
		if (callback !== undefined) {
			callback ();
			}
		}
	}
function settingsCommand () {
	myChatApp.settingsCommand ();
	}
function initMenus () {
	var cmdKeyPrefix = getCmdKeyPrefix (); //10/6/14 by DW
	document.getElementById ("idMenuProductName").innerHTML = appConsts.productnameForDisplay; 
	document.getElementById ("idMenuAboutProductName").innerHTML = appConsts.productnameForDisplay; 
	$("#idMenubar .dropdown-menu li").each (function () {
		var li = $(this);
		var liContent = li.html ();
		liContent = liContent.replace ("Cmd-", cmdKeyPrefix);
		li.html (liContent);
		});
	$("#idTwitterIcon").html (twStorageConsts.fontAwesomeIcon);
	twUpdateTwitterMenuItem ("idTwitterConnectMenuItem");
	twUpdateTwitterUsername ("idTwitterUsername");
	flTwitterWasConnected = twIsTwitterConnected ();
	}
function readConfig (callback) {
	for (var x in globalConfig) {
		appConsts [x] = globalConfig [x];
		}
	callback ();
	}
function updateAreaAboveTextBox () {
	$("#idAreaAboveTextBox").css ("display", (twIsTwitterConnected ()) ? "block" : "none");
	}
function everySecond () {
	if (twIsTwitterConnected () !== flTwitterWasConnected) {
		initMenus ();
		updateAreaAboveTextBox ()
		}
	}
function startup () {
	console.log ("startup");
	readConfig (function () {
		twStorageData.urlTwitterServer = appConsts.urlChatServer;
		twGetOauthParams ();
		initMenus ();
		getUserInfo (function () {
			const chatOptions = {
				urlChatServer: appConsts.urlChatServer,
				urlChatSocket: appConsts.urlChatSocket,
				editorPlaceholderText: appConsts.editorPlaceholderText,
				minSecsBetwAutoSave: 3,
				userInfoFromTwitter: userInfoFromTwitter,
				newMessageCallback: function (jstruct) {
					},
				updatedMessageCallback: function (jstruct) {
					},
				getConfigCallback: function () {
					return (appConsts);
					},
				processTextCallback: function (s) {
					return (emojiProcess (s));
					}
				};
			myChatApp = new chatApp (chatOptions, function () {
				$("#idLeadingQuestion").text (appConsts.leadingQuestion);
				$("#idVersionNumber").text ("v" + appConsts.version);
				$("#idMainColumn").css ("visibility", "visible");
				updateAreaAboveTextBox ();
				updateJsonMenuItem ();
				self.setInterval (everySecond, 1000); 
				});
			});
		});
	}
