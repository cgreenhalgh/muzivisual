// log use (of browser)
var loguse = angular.module('mpm-loguse', ['MuziVisual.socket']);

// note: needs uuid.js

//socket.io wrapper, exposes on() and emit()
loguse.factory('mpmLoguse', ['socket', 'clientid', '$interval', function (socket, clientidin, $interval) {
  var clientid = clientidin;
	console.log('mpmLoguse '+clientid);
	socket.emit('loguse.client.id', {clientid:clientid});
	var userid = null;
	var fns = [];
	// callback with userid
	socket.on('loguse.client.userid', function(msg) {
		userid = msg.userid;
		console.log('mpm.client.userid '+userid);
		if (userid) {
			for (var i in fns) {
				var fn = fns[i];
				try {
					fn(userid);
				} catch (err) {
					console.log('error calling withuserid', err);
				}				
			}
			fns = [];
		}
	});
	//https://stackoverflow.com/questions/1060008/is-there-a-way-to-detect-if-a-browser-window-is-not-currently-active
	(function() {
		  var hidden = "hidden";

		  // Standards:
		  if (hidden in document)
		    document.addEventListener("visibilitychange", onchange);
		  else if ((hidden = "mozHidden") in document)
		    document.addEventListener("mozvisibilitychange", onchange);
		  else if ((hidden = "webkitHidden") in document)
		    document.addEventListener("webkitvisibilitychange", onchange);
		  else if ((hidden = "msHidden") in document)
		    document.addEventListener("msvisibilitychange", onchange);
		  // IE 9 and lower:
		  else if ("onfocusin" in document)
		    document.onfocusin = document.onfocusout = onchange;
		  // All others:
		  else
		    window.onpageshow = window.onpagehide
		    = window.onfocus = window.onblur = onchange;

		  var last_hidden_time = null, last_visible_time = null;
		  function onchange (evt) {
		    var v = "visible", h = "hidden",
		        evtMap = {
		          focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h
		        };

		    evt = evt || window.event;
		    var res = null;
		    if (evt.type in evtMap)
		      res = evtMap[evt.type];
		    else
		      res = this[hidden] ? "hidden" : "visible";
		    
		    console.log('visible?? '+res);
		    var time = (new Date()).getTime();
		    if (res=='visible' && last_hidden_time!==null) {
		    	socket.emit('loguse.client.visible', {clientid: clientid, clienttime: time, after: time-last_hidden_time});
		    	last_visible_time = time;
		    } else if (res=='visible') {
		    	socket.emit('loguse.client.visible', {clientid: clientid, clienttime: time});
		    	last_visible_time = time;
		    } else if (res=='hidden' && last_visible_time!==null) {
		    	socket.emit('loguse.client.hidden', {clientid: clientid, clienttime: time, after: time-last_visible_time});
		    	last_hidden_time = time;
		    } else if (res=='hidden') {
		    	socket.emit('loguse.client.hidden', {clientid: clientid, clienttime: time});
		    	last_hidden_time = time;
		    }
		  }

		  // set the initial state (but only if browser supports the Page Visibility API)
		  if( document[hidden] !== undefined )
		    onchange({type: document[hidden] ? "blur" : "focus"});
		})();
/*
	var REPORT_INTERVAL = 5000;
	var CHECK_INTERVAL = 500;
	var last_report_time = 0;
	var check_count = 0;
	$interval(function() {
		var time = (new Date()).getTime();
		var elapsed = time-last_report_time;
		if (elapsed>REPORT_INTERVAL) {
			socket.emit('loguse.client.awake', {clientid: clientid, clienttime: time});
			last_report_time = time;
			check_count = 0;
		} else if (time-(last_report_time+CHECK_INTERVAL*check_count) > 2*CHECK_INTERVAL) {
			socket.emit('loguse.client.awake', {clientid: clientid, clienttime: time, aftersleep: time-(last_report_time+CHECK_INTERVAL*check_count)-CHECK_INTERVAL});
			last_report_time = time;
			check_count = 0;
		} else {
			check_count++;
		}
	}, CHECK_INTERVAL);
*/
	return {
		withuserid: function(fn) {
			if (userid===null)
				fns.push(fn);
			else {
				try {
					fn(userid);
				} catch (err) {
					console.log('error calling withuserid', err);
				}
			}
		},
		log: function(data) {
		    var time = (new Date()).getTime();
		    data.clienttime = time;
		    data.clientid = clientid;
		    // clientid and userid added by server
			socket.emit('loguse.client.log', data);
		},
		view: function(path, info) {
		    var time = (new Date()).getTime();
			var data = { clienttime: time, clientid: clientid, path: path, info: info };
		    // clientid and userid added by server
			socket.emit('loguse.client.view', data);
		}
	};
}]);

loguse.factory('clientid', function() {
	// cookie?
	// https://stackoverflow.com/questions/14573223/set-cookie-and-get-cookie-with-javascript
	function createCookie(name,value,days) {
	    var expires = "";
	    if (days) {
	        var date = new Date();
	        date.setTime(date.getTime() + (days*24*60*60*1000));
	        expires = "; expires=" + date.toUTCString();
	    }
	    document.cookie = name + "=" + value + expires + "; path=/";
	}

	function readCookie(name) {
	    var nameEQ = name + "=";
	    var ca = document.cookie.split(';');
	    for(var i=0;i < ca.length;i++) {
	        var c = ca[i];
	        while (c.charAt(0)==' ') c = c.substring(1,c.length);
	        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	    }
	    return null;
	}
	var COOKIE_NAME = 'mpmclientidv1';
	var DEFAULT_DAYS = 365;
	
	var guid = readCookie(COOKIE_NAME);
	if (guid===null) {
		guid = uuid.v1();
		console.log('New clientid '+guid);
		createCookie(COOKIE_NAME, guid, DEFAULT_DAYS);
	} else {
		console.log('existing clientid '+guid);
	}
	return guid;
});
