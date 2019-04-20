var appPrefs = {
	savedTextArea: "",
	flPostOnReturnKey: false,
	flEchoPostsToTwitter: false,
	hashTagForTwitter: "", flSendHashTagToTwitter: true
	};

function chatApp (options, callback) {
	var chatOptions = {
		flReadOnlyMode: false,
		flAutoSave: true, minSecsBetwAutoSaves: 1,
		urlChatServer: undefined,
		urlChatSocket: undefined,
		editorPlaceholderText: "",
		userInfoFromTwitter: undefined, //this should come from the identity system
		everyoneFollows: {"davewiner": true}, //8/23/17 by DW -- screennames of users everyone follows
		defaultEditorButtons: ["bold", "italic", "anchor", "h4", "orderedlist", "unorderedlist", "quote"],
		maxTweetLength: 280, //1/7/18 by DW
		newMessageCallback: function (jstruct) {
			},
		updatedMessageCallback: function (jstruct) {
			},
		getConfigCallback: function () {
			var emptyConfig = {
				};
			return (emptyConfig);
			},
		dynamicElementsCallback: function () {
			},
		processTextCallback: function (s) {
			return (s);
			}
		};
	var chatGlobals = {
		chatlog: new Array (),
		chatlogSerialnum: 0,
		myChatLogSocket: undefined,
		idLastTweet: undefined,
		flMsgBeingEdited: false, 
		idMsgBeingEdited: undefined,
		flSetupDynamicElements: false,
		flMessageNotPosted: undefined,
		whenLastAutoSave: new Date (),
		urlDefaultIcon: "http://static.scripting.com/larryKing/images/2012/10/16/clarus.gif", //8/21/17 by DW
		initialEditorText: "<p><br></p>",
		flPrefsChanged: false,
		flJsonDisplayMode: false,
		serverStats: undefined //a copy of the stats object returned from the server
		};
	
	function settingsCommand () {
		prefsDialogShow (function () {
			prefsChanged ();
			});
		}
	function chatGetWhen (jstruct) {
		var when;
		if (jstruct.pubDate !== undefined) {
			when = jstruct.pubDate;
			}
		else {
			when = jstruct.when;
			}
		return (new Date (when));
		}
	function viewChatMsg (jstruct) {
		var htmltext = "", indentlevel = 0, flAddContainer = false;
		
		function add (s) {
			htmltext += filledString ("\t", indentlevel) + s + "\n";
			}
		function getBodyText () {
			function removeSchmutzFromText (theText) { //8/24/17 by DW -- remove extra stuff added by medium-editor
				if (endsWith (theText, chatGlobals.initialEditorText)) {
					theText = stringMid (theText, 1, theText.length - chatGlobals.initialEditorText.length);
					}
				return (theText);
				}
			var bodytext = removeSchmutzFromText (jstruct.text);
			
			function getTitle (flPeriod) {
				let theTitle = jstruct.title;
				if ((theTitle !== undefined) && (theTitle.length > 0)) {
					if (flPeriod) {
						theTitle = addPeriodAtEnd (theTitle);
						}
					return ("<span class=\"spChatTitle\">" + theTitle + "</span>");
					}
				else {
					return ("");
					}
				}
			
			if (jstruct.enclosure !== undefined) { //see if it's an image
				if (jstruct.enclosure.type !== undefined) {
					if (beginsWith (jstruct.enclosure.type, "image/")) {
						let htmltext = getTitle (false) + "<img src=\"" + jstruct.enclosure.url + "\">";
						return (htmltext);
						}
					}
				}
			
			if (jstruct.outline !== undefined) {
				if (jstruct.outline.subs !== undefined) {
					let htmltext = renderOutlineBrowser (jstruct.outline, false, undefined, undefined, true);
					return (htmltext);
					}
				else {
					bodytext = jstruct.outline.text; //single-headline outline, keep it simple --7/28/17 by DW
					if (jstruct.outline.image !== undefined) {
						bodytext = "<img src=\"" + jstruct.outline.image + "\" style=\"float: right; margin-left: 1px; margin-top: 1px;\">" + bodytext;
						}
					}
				}
			bodytext = getTitle (true) + bodytext;
			
			bodytext = chatOptions.processTextCallback (bodytext);
			
			//fancy stuff with show more/show less, disabled
				if (false) {
					var maxchars = 400, showMore = "", remainingText = "";
					if (bodytext.length > maxchars) {
						var idRemainingText = "rt" + rtSerialnum, idShowMoreLink = "sm" + rtSerialnum++;
						showMore = " <a id=\"" + idShowMoreLink + "\" class=\"aShowMoreLink\" onclick=\"showMore ('" + idRemainingText + "', '" + idShowMoreLink + "')\">Show more</a>";
						bodytext = maxStringLength (bodytext, maxchars, true, false);
						remainingText = "</p><span class=\"spHiddenText\" id=\"" + idRemainingText + "\"><p>" + stringMid (jstruct.text, bodytext.length, jstruct.text.length - bodytext.length + 1) + "</span>";
						}
					bodytext = bodytext  + remainingText + showMore
					}
			
			if (jstruct.screenname == twGetScreenName ()) {
				bodytext = "<div class=\"divClickableMsg\" data-idmsg=\"" + jstruct.id + "\">" + bodytext + "</div>";
				chatGlobals.flSetupDynamicElements = true;
				}
			return (bodytext);
			}
		function getIcon () {
			if (jstruct.urlIcon == "http://pbs.twimg.com/profile_images/888857400886906881/TfGkETi-_normal.jpg") {
				jstruct.urlIcon = undefined;
				}
			if (jstruct.urlIcon === undefined) {
				return (chatGlobals.urlDefaultIcon); //1/1/18 by DW
				}
			else {
				return (jstruct.urlIcon);
				}
			}
		function getAuthorLink (linktext) {
			var authorlink;
			if (jstruct.screenname !== undefined) {
				authorlink = "<a href=\"https://twitter.com/" + jstruct.screenname + "/\" target=\"_blank\">" + linktext + "</a>";
				}
			else {
				authorlink = linktext;
				}
			return (authorlink);
			}
		function getCheckbox () { //1/13/18 by DW
			var theChecked = ""; //not checked initially
			var theCheckbox = "<input type=\"checkbox\" data-id=\"" + jstruct.id + "\" value=\"xxx\" " + theChecked + ">";
			return ("<div class=\"divChatMsgCheckbox\">" + theCheckbox + "</div>");
			}
		
		if (jstruct.text.length == 0) { //8/25/17 by DW
			return (""); 
			}
		
		if (jstruct.idHtmlObject === undefined) {
			jstruct.serialnum = chatGlobals.chatlogSerialnum++;
			jstruct.idHtmlObject = "idChatMsg" + jstruct.serialnum;
			flAddContainer = true;
			}
		if (flAddContainer) {
			add ("<div class=\"divChatMsgContainer\" id=\"" + jstruct.idHtmlObject + "\">"); indentlevel++;
			}
		
		if (chatGlobals.flJsonDisplayMode) { //1/8/18; by DW
			let jsontext = jsonStringify (jstruct);
			let jstructcopy = JSON.parse (jsontext);
			
			function deleteValue (name) {
				try {
					delete jstructcopy [name];
					}
				catch (err) {
					}
				}
			deleteValue ("urlIcon");
			deleteValue ("serialnum");
			deleteValue ("idHtmlObject");
			
			jsontext = jsonStringify (jstructcopy);
			
			jsontext = replaceAll (jsontext, "<", "&lt;");
			add ("<div class=\"divJsonText\"><pre>" + jsontext + "</pre></div>");
			}
		else {
			add (getCheckbox ());
			add ("<table>"); indentlevel++;
			add ("<tr>"); indentlevel++;
			//icon
				add ("<td class=\"tdIconInChat\">"); indentlevel++;
				add ("<div class=\"divUserIcon\">" + getAuthorLink ("<img src=\"" + getIcon () + "\" width=\"48\" height=\"48\" border=\"0\">") + "</div>");
				add ("</td>"); indentlevel--;
			//text
				add ("<td class=\"tdTextInChat\">"); indentlevel++;
				//top line
					add ("<div class=\"divChatTopLine\">"); indentlevel++;
					add ("<span class=\"spChatAuthorName\">" + getAuthorLink (jstruct.authorname) + "</span>");
					add ("<span class=\"spChatWhen\" id=\"idWhen" + jstruct.serialnum + "\">" + getFacebookTimeString (chatGetWhen (jstruct)) + "</span>");
					
					if (jstruct.idTweet !== undefined) { //9/28/16 by DW
						var urlForTweet = "https://twitter.com/" + jstruct.screenname + "/status/" + jstruct.idTweet;
						add ("<span class=\"spChatTweetLink\"><a href=\"" + urlForTweet + "\" target=\"_blank\">" + twStorageConsts.fontAwesomeIcon + "</a></span>");
						}
					
					add ("</div>"); indentlevel--;
				add ("<div class=\"divChatBody\">" + getBodyText () + "</div>");
				//linktext -- 8/15/17 by DW
					var linktext = "";
					if ((jstruct.link != undefined) && (jstruct.link.length > 0)) {
						var splitUrl = urlSplitter (trimLeading (jstruct.link, " "));
						var host = splitUrl.host;
						if (beginsWith (host, "www.")) {
							host = stringDelete (host, 1, 4);
							}
						linktext = "<span class=\"spLink\"><a class=\"aHost\" href=\"" + jstruct.link + "\" target=\"blank\">" + host + "</a></span>";
						}
				//likes -- 10/8/16 by DW
					(function () {
						var ct = 0, likenames = "", thumbDirection = "up";
						if (jstruct.likes !== undefined) {
							for (var x in jstruct.likes) {
								ct++;
								likenames += x + ", ";
								}
							}
						
						var thumbUp = "";
						if (twIsTwitterConnected ()) {
							thumbUp = "<span class=\"spThumb\"><a class=\"aLikeIcon\" data-idmsg=\"" + jstruct.id + "\"><i class=\"fa fa-thumbs-" + thumbDirection + "\"></i></a></span>&nbsp;";
							}
						
						var ctLikes = ct + " like";
						
						if (ct == 0) {
							ctLikes = ""; //get rid of 0 Likes -- 8/24/17 by DW
							}
						else {
							if (ct != 1) {
								ctLikes += "s";
								}
							if (ct > 0) {
								likenames = stringMid (likenames, 1, likenames.length - 2); //pop off comma and blank at end
								ctLikes = "<span rel=\"tooltip\" title=\"" + likenames + "\">" + ctLikes + "</span>";
								}
							}
						
						add ("<div class=\"divChatBottomLine\">" + linktext + "<span class=\"spLikes\">" + thumbUp + ctLikes + "</span></div>");
						}) ();
				add ("</td>"); indentlevel--;
			add ("</tr>"); indentlevel--;
			add ("</table>"); indentlevel--;
			}
		
		if (flAddContainer) {
			add ("</div>"); indentlevel--;
			}
		return (htmltext);
		}
	function chatSocketStart (urlSocket, callback) {
		if (chatGlobals.socket === undefined) {
			chatGlobals.socket = new WebSocket (urlSocket); 
			chatGlobals.socket.onopen = function (evt) {
				console.log ("chatGlobals.socket is open, sending \"watch chatlog\" message.");
				viewServerStats ();
				chatGlobals.socket.send ("watch chatlog");
				};
			chatGlobals.socket.onmessage = function (evt) {
				var s = evt.data;
				if (s !== undefined) { //no error
					var verb = stringNthField (s, "\r", 1);
					s = stringDelete (s, 1, verb.length + 1);
					callback (verb, s);
					}
				};
			chatGlobals.socket.onclose = function (evt) {
				console.log ("chatGlobals.socket was closed.");
				chatGlobals.socket = undefined;
				};
			chatGlobals.socket.onerror = function (evt) {
				console.log ("chatGlobals.socket received an error");
				};
			}
		}
	function checkChatSocket () {
		chatSocketStart (chatOptions.urlChatSocket, function (verb, s) {
			console.log ("chatlogEverySecond: verb == " + verb);
			switch (verb.toLowerCase ()) {
				case "update":
					var jstruct = JSON.parse (s);
					for (var i = 0; i < chatGlobals.chatlog.messages.length; i++) { //see if an existing message was updated
						var item = chatGlobals.chatlog.messages [i];
						if (item.id == jstruct.id) {
							for (var x in jstruct) { //8/27/17 by DW -- don't eliminate items that aren't present in jstruct
								item [x] = jstruct [x];
								}
							
							if (isPostVisible (item)) {
								$("#" + item.idHtmlObject).html (viewChatMsg (item)); 
								}
							console.log ("chatlogEverySecond: existing object updated == " + jsonStringify (jstruct));
							chatOptions.updatedMessageCallback (jstruct); //8/11/17 by DW
							chatGlobals.flSetupDynamicElements = true;
							return;
							}
						}
					console.log ("chatlogEverySecond: new object == " + jsonStringify (jstruct));
					chatGlobals.chatlog.messages.unshift (jstruct);
					if (isPostVisible (jstruct)) {
						$("#idChatlogViewer").prepend (viewChatMsg (jstruct));
						chatOptions.newMessageCallback (jstruct); //8/11/17 by DW
						}
					break;
				case "rollover":
					chatlogStart ();
					break;
				case "reload":
					window.location.href  = window.location.href; 
					break;
				case "deleteitem":
					var jstruct = JSON.parse (s);
					deleteMessage (jstruct.id)
					break;
				}
			});
		}
	function serverCall (verb, params, flAuthenticated, callback, method, postbody) {
		if (flAuthenticated === undefined) {
			flAuthenticated = true;
			}
		if (params === undefined) {
			params = new Object ();
			}
		if (method === undefined) {
			method = "GET";
			}
		if (flAuthenticated) {
			params.oauth_token = localStorage.twOauthToken;
			params.oauth_token_secret = localStorage.twOauthTokenSecret;
			}
		
		var apiUrl = chatOptions.urlChatServer + verb;
		var paramString = twBuildParamList (params);
		if (paramString.length > 0) {
			apiUrl += "?" + paramString;
			}
		
		console.log ("serverCall: verb == " + verb + ", apiUrl == " + apiUrl);
		
		$.ajax ({
			type: method,
			url: apiUrl,
			data: postbody, 
			success: function (data) {
				if (callback !== undefined) {
					callback (undefined, data);
					}
				},
			error: function (status, something, otherthing) { 
				console.log ("serverCall: error == " + JSON.stringify (status, undefined, 4));
				if (callback !== undefined) {
					var err = {
						code: status.status,
						message: JSON.parse (status.responseText).message
						};
					if (callback !== undefined) {
						callback (err);
						}
					}
				},
			dataType: "json"
			});
		}
	function isPostVisible (jstruct) { //8/23/17 by DW
		var theName = jstruct.screenname;
		if (theName === undefined) { //the post came from scripting news, or linkblog, or...
			return (true);
			}
		if (theName == twGetScreenName ()) { //it's the user's own post
			return (true);
			}
		if (getBoolean (chatOptions.everyoneFollows [theName])) {
			return (true);
			}
		if (twGetScreenName () == "davewiner") { //for now I see everything
			return (true);
			}
		return (false);
		}
	function prefsChanged () {
		chatGlobals.flPrefsChanged = true;
		}
	function getPrefs (callback) {
		if (twIsTwitterConnected ()) {
			serverCall ("getprefs", undefined, true, function (err, data) {
				if (!err) {
					appPrefs = data;
					console.log ("getPrefs: appPrefs == " + jsonStringify (appPrefs));
					}
				callback ();
				});
			}
		else {
			callback ();
			}
		}
	function savePrefs (callback) {
		var whenstart = new Date ();
		var params = {
			jsontext: jsonStringify (appPrefs)
			}
		serverCall ("saveprefs", params, true, function (err, data) {
			if (!err) {
				console.log ("savePrefs: " + secondsSince (whenstart) + " secs");
				}
			if (callback !== undefined) {
				callback ();
				}
			});
		}
	function getConfig () {
		return (chatOptions.getConfigCallback ());
		}
	function showEditControls () {
		$("#idStuffThatsHiddenWhenNotActive").css ("visibility", "visible");
		$("#idPostButton").css ("visibility", "visible");
		}
	function hideEditControls () {
		$("#idStuffThatsHiddenWhenNotActive").css ("visibility", "hidden");
		$("#idPostButton").css ("visibility", "hidden");
		}
	function visitCheckedMessages (callback) {
		$(".divChatMsgCheckbox input").each (function () {
			if ($(this).prop ("checked")) {
				var id = $(this).data ("id");
				console.log ("visitCheckedMessages: id == " + id);
				if (callback !== undefined) {
					callback (id);
					}
				}
			});
		}
	function likeClick (idMessage, callback) {
		var params = {
			id: idMessage
			};
		serverCall ("like", params, true, callback);
		}
	function chatlogDeleteItem (idMessage, callback) {
		var params = {
			id: idMessage
			};
		serverCall ("delete", params, true, callback);
		}
	function getChatlog (callback) {
		serverCall ("getchatlog", undefined, false, callback);
		}
	function getMyScreenName (callback) {
		serverCall ("getmyscreenname", undefined, true, function (err, data) {
			callback (data);
			});
		}
	function getMainEditorText (flStripMarkup) {
		var s = $("#idBodyEditor").html ();
		if (flStripMarkup) {
			s = stripMarkup (s);
			}
		s = replaceAll (s, "&nbsp;", " "); //sometimes medium-editor appends a &nbsp; at the end
		return (s);
		}
	function getMainEditorTextLength (flStripMarkup) {
		if (flStripMarkup === undefined) {
			flStripMarkup = true;
			}
		return (getMainEditorText (flStripMarkup).length);
		}
	function getHashTag () { //includes the space separating the tag from the text
		var s = trimWhitespace (appPrefs.hashTagForTwitter);
		if (s.length == 0) {
			return ("");
			}
		return (" " + s);
		}
	function setEditorText (bodytext) {
		$("#idBodyEditor").html (bodytext);
		var editorBody = new MediumEditor (".divBodyEditor", {
			placeholder: {
				text: " " + chatOptions.editorPlaceholderText
				},
			toolbar: {
				buttons: chatOptions.defaultEditorButtons,
				},
			buttonLabels: "fontawesome",
			imageDragging: false, //10/18/16 by DW
			autoLink: true
			});
		}
	function showMore (idRemainingText, idShowMoreLink) {
		console.log ("showMore: idRemainingText == " + idRemainingText + ", idShowMoreLink == " + idShowMoreLink);
		if ($("#" + idRemainingText).css ("display") == "inline") { //it's visible, hide it
			$("#" + idRemainingText).css ("display", "none");
			$("#" + idShowMoreLink).text ("Show more");
			}
		else { //it's hidden, make it visible
			$("#" + idRemainingText).css ("display", "inline");
			$("#" + idShowMoreLink).text ("Show less");
			}
		}
	function getEditorJstruct () {
		var jstruct = {
			text: encodeXml (getMainEditorText ()),
			authorname: chatOptions.userInfoFromTwitter.name,
			screenname: twGetScreenName (),
			urlIcon: chatOptions.userInfoFromTwitter.profile_image_url,
			when: new Date (),
			idTweet: chatGlobals.idLastTweet
			};
		return (jstruct);
		}
	function chatlogRollover (callback) {
		serverCall ("rollover", undefined, true, callback);
		}
	function chatlogReload (callback) {
		serverCall ("reload", undefined, true, callback);
		}
	function updateCharCount () {
		var ct = getMainEditorTextLength ();
		if (appPrefs.flSendHashTagToTwitter) {
			ct += getHashTag ().length
			}
		if (appPrefs.flEchoPostsToTwitter) {
			if (ct > chatOptions.maxTweetLength) {
				ct = "<span class=\"spRedCharCount\">" + ct + "</span>";
				}
			}
		$("#idCharCount").html (ct);
		}
	function postNewMsg (callback) {
		if (getMainEditorTextLength () > 0) {
			var postbody = jsonStringify (getEditorJstruct ());
			serverCall ("post", undefined, true, callback, "POST", postbody);
			}
		else {
			if (callback !== undefined) {
				callback (undefined);
				}
			}
		}
	function updateExistingMsg (callback) {
		console.log ("updateExistingMsg: chatGlobals.idMsgBeingEdited == " + chatGlobals.idMsgBeingEdited);
		var params = {
			id: chatGlobals.idMsgBeingEdited,
			text: getMainEditorText ()
			};
		serverCall ("updatetext", params, true, callback);
		}
	function resetEditor () {
		setEditorText (chatGlobals.initialEditorText);   
		updateCharCount ();
		setPostButtonText ();
		hideEditControls ();
		$("#idBodyEditor").blur (); //take the focus off the editor
		}
	function cancelEdit () {
		chatGlobals.flMsgBeingEdited = false;
		chatGlobals.idMsgBeingEdited = undefined;
		resetEditor ();
		}
	function postButtonClick () {
		if (chatOptions.flReadOnlyMode) {
			alertDialog ("Sorry, " + getConfig ().productnameForDisplay + " is operating in read-only mode at this time.");
			}
		else {
			function doPost () {
				postNewMsg (function (err, data) {
					console.log ("postButtonClick: the server returned == " + jsonStringify (data));
					resetEditor ();
					});
				}
			if (chatGlobals.flMsgBeingEdited) {
				updateExistingMsg (function (err, data) {
					console.log ("postButtonClick: the server returned == " + jsonStringify (data));
					chatGlobals.flMsgBeingEdited = false;
					chatGlobals.idMsgBeingEdited = undefined;
					resetEditor ();
					});
				}
			else {
				if (appPrefs.flEchoPostsToTwitter) {
					var s = getMainEditorText (true);
					s = replaceAll (s, "&nbsp;", " ");
					s = trimWhitespace (s);
					if (s.length > 0) {
						if (appPrefs.flSendHashTagToTwitter) {
							s += getHashTag ();
							}
						console.log ("postButtonClick: what we're tweeting == " + s);
						twTweet (s, "", function (data) {
							chatGlobals.idLastTweet = data.id_str; //set global
							doPost ();
							});
						}
					}
				else {
					chatGlobals.idLastTweet = undefined;
					doPost ();
					}
				}
			}
		}
	function cancelButtonClick () {
		if (chatGlobals.flMsgBeingEdited) {
			cancelEdit ();
			}
		}
	function getServerStats (callback) {
		serverCall ("stats", undefined, false, callback);
		}
	function setupDynamicElements () {
		$("#idChatlogViewer *").off (); //remove all pre-existing handlers attached to the chatlog -- 1/7/18 by DW
		$('[rel="tooltip"]').tooltip ({
			animation: true,
			placement: "right"
			});
		$("a[rel=tooltip]").tooltip ({
			live: true
			});
		$(".divClickableMsg").on ("click", function (event) {
			var idmsg = $(this).data ("idmsg");
			editMessage (idmsg);
			event.stopPropagation ();
			});
		$(".aLikeIcon").on ("click", function (event) {
			var idmsg = $(this).data ("idmsg");
			console.log ("You clicked on a .aLikeIcon, iidmsg == " + idmsg);
			likeClick (idmsg);
			event.stopPropagation ();
			});
		$("#idBodyEditor").focus (function (event) {
			showEditControls (); //4/20/19 by DW
			chatGlobals.flMessageNotPosted = true;
			showEditControls ();
			});
		$("#idBodyEditor").blur (function (event) {
			console.log ("You clicked away from #idBodyEditor.");
			if ($("#medium-editor-toolbar-1").css ("visibility") == "hidden") { //don't hide controls if the toolbar got the click -- 1/12/18 by DW
				hideEditControls ();
				}
			});
		$("#idBodyEditor").keyup (function (event) {
			if (event.which == 27) { //escape key
				console.log ("You pressed the ESC key in an editing text area.");
				if (chatGlobals.flMsgBeingEdited) {
					cancelEdit ();
					}
				else {
					hideEditControls ();
					}
				$("#idBodyEditor").blur (); //take the focus off the editor
				event.stopPropagation ();
				return;
				}
			updateCharCount ();
			});
		$("#idBodyEditor").keydown (function () {
			if (event.which == 13) { //return key
				if (appPrefs.flPostOnReturnKey) {
					postButtonClick ();
					event.stopPropagation ();
					return;
					}
				}
			});
		$("#idTweetCheckbox").click (function () {
			console.log ("You clicked the checkbox, its value is " + this.checked);
			appPrefs.flEchoPostsToTwitter = getBoolean (this.checked);
			updateCharCount ();
			prefsChanged ();
			});
		
		$("#idPostButton").mousedown (function (event) {
			console.log ("You clicked on the post button.");
			if (chatGlobals.flMessageNotPosted) { //it's a new click
				postButtonClick ();
				event.stopPropagation ();
				event.preventDefault ();
				chatGlobals.flMessageNotPosted = false;
				}
			else {
				console.log ("Repeat mousedown event, not processed.");
				}
			});
		$("#idCancelButton").mousedown (function (event) {
			cancelButtonClick ();
			$("#idBodyEditor").blur (); //take the focus off the editor
			event.stopPropagation ();
			event.preventDefault ();
			});
		
		if (chatOptions.dynamicElementsCallback !== undefined) { //8/21/17 by DW
			chatOptions.dynamicElementsCallback ();
			}
		}
	function findMessage (id, callback) {
		for (var i = 0; i < chatGlobals.chatlog.messages.length; i++) {
			var item = chatGlobals.chatlog.messages [i];
			if (item.id == id) {
				callback (item, i);
				return;
				}
			}
		callback (undefined);
		}
	function viewChatlog () {
		var htmltext = "";
		for (var i = 0; i < chatGlobals.chatlog.messages.length; i++) {
			let item = chatGlobals.chatlog.messages [i];
			if (isPostVisible (item)) {
				item.idHtmlObject = undefined;
				htmltext += viewChatMsg (item);
				}
			}
		$("#idChatlogViewer").html (htmltext);
		chatGlobals.flSetupDynamicElements = true;
		}
	function toggleJsonDisplayMode () {
		chatGlobals.flJsonDisplayMode = !chatGlobals.flJsonDisplayMode;
		viewChatlog ();
		}
	function chatlogStart (callback) {
		const whenstart = new Date ();
		getChatlog (function (err, chatlogSubset) {
			if (!err) {
				console.log ("chatlogStart: " + chatlogSubset.messages.length + " messages, took " + secondsSince (whenstart) + " secs.");
				chatGlobals.chatlog = chatlogSubset;
				viewChatlog ();
				if (callback !== undefined) {
					callback ();
					}
				}
			});
		}
	function viewSysopMenu (server) {
		var att = (server.owner == twGetScreenName ()) ? "block" : "none";
		$("#idSysopMenu").css ("display", att);
		}
	function viewServerStats () {
		getServerStats (function (err, server) {
			if (!err) {
				$("#idServerStats").html ("Server: " + server.productName + " v" + server.version + ", open sockets: " + server.ctSockets + ".");
				$("#idVersionNumber").text ("v" + server.version);
				chatGlobals.serverStats = server; 
				viewSysopMenu (server); //depends on server.owner
				}
			});
		}
	function setPostButtonText () {
		var theText, cancelVisible;
		if (chatGlobals.flMsgBeingEdited) {
			theText = "Update";
			cancelVisible = "visible";
			}
		else {
			theText = "Post";
			cancelVisible = "hidden";
			}
		$("#idPostButton").html ("<i class=\"fa fa-check\"></i> " + theText);
		
		$("#idCancelButton").css ("visibility", cancelVisible);
		}
	function editMessage (idmsg) {
		findMessage (idmsg, function (item) {
			console.log ("editMessage: item == " + jsonStringify (item));
			setEditorText (item.text);
			$("#idBodyEditor").focus ();
			chatGlobals.flMsgBeingEdited = true;
			chatGlobals.idMsgBeingEdited = idmsg;
			setPostButtonText ();
			});
		}
	function deleteMessage (idmsg) {
		findMessage (idmsg, function (item, ix) {
			$("#" + item.idHtmlObject).remove ();
			chatGlobals.chatlog.messages.splice (ix, 1);
			});
		}
	function showHideEditor () {
		var displayval;
		if (twIsTwitterConnected ()) {
			displayval = "block";
			}
		else {
			displayval = "none";
			}
		if ($("#idEditorSection").css ("display") !== displayval) { //you only see the editor if you're logged in
			$("#idEditorSection").css ("display", displayval); 
			}
		
		
		}
	function initEditor (initialText) {
		if (initialText !== undefined) {
			setEditorText (initialText);  //9/22/16 by DW
			}
		$("#idTweetCheckbox").attr ("checked", appPrefs.flEchoPostsToTwitter);
		$("#idHashtagCheckbox").attr ("checked", appPrefs.flSendHashTagToTwitter);
		updateCharCount (); //9/23/16 by DW
		showHideEditor ();
		}
	function setValuesFromConfig () {
		$("#idBodyEditor").attr ("data-placeholder", " " + chatOptions.editorPlaceholderText);
		}
	function everyMinute () {
		var now = new Date ();
		console.log ("\neveryMinute: " + now.toLocaleTimeString () + ", v" + getConfig ().version);
		for (var i = chatGlobals.chatlog.messages.length - 1; i >= 0; i--) {
			var item = chatGlobals.chatlog.messages [i];
			$("#idWhen" + item.serialnum).text (getFacebookTimeString (chatGetWhen (item)));
			}
		viewServerStats ();
		}
	function everySecond () {
		checkChatSocket ();
		if (chatGlobals.flSetupDynamicElements) {
			setupDynamicElements ();
			chatGlobals.flSetupDynamicElements = false;
			}
		if (chatOptions.flAutoSave) {
			if (!chatGlobals.flMsgBeingEdited) {
				if (secondsSince (chatGlobals.whenLastAutoSave) > chatOptions.minSecsBetwAutoSaves) {
					var chattext = getMainEditorText ();
					if (chattext != appPrefs.savedTextArea) {
						appPrefs.savedTextArea = chattext;
						chatGlobals.whenLastAutoSave = new Date ();
						prefsChanged ();
						}
					}
				}
			}
		if (chatGlobals.flPrefsChanged) {
			savePrefs ();
			chatGlobals.flPrefsChanged = false;
			}
		showHideEditor (); //1/3/18 by DW
		}
	
	console.log ("chatApp");
	this.rollover = chatlogRollover;
	this.reload = chatlogReload;
	this.deleteItem = chatlogDeleteItem;
	this.likeClick = likeClick;
	this.serverCall = serverCall; //1/4/18 by DW
	this.initEditor = initEditor; //1/4/18 by DW
	this.chatGlobals = chatGlobals; //1/7/18 by DW
	this.prefs = appPrefs; //1/7/18 by DW
	this.prefsChanged = prefsChanged; //1/9/18 by DW
	this.toggleJsonDisplayMode = toggleJsonDisplayMode; //1/8/18 by DW
	this.settingsCommand = settingsCommand; //1/9/18 by DW
	this.visitCheckedMessages = visitCheckedMessages; //1/13/18 by DW
	this.getOptions = function () {
		return (chatOptions);
		};
	for (var x in options) {
		chatOptions [x] = options [x];
		}
	showHideEditor (); //4/20/19 by DW -- moved this to the beginning as an experiment
	chatlogStart (function () {
		setValuesFromConfig ();
		viewServerStats ();
		getPrefs (function () {
			initEditor (appPrefs.savedTextArea);  
			self.setInterval (everySecond, 1000); 
			runAtTopOfMinute (function () {
				self.setInterval (everyMinute, 60000); 
				everyMinute ();
				});
			callback ();
			});
		});
	}

