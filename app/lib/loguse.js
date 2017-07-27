// log use - link to mpm-loguse client, via socket.io
logging = require('./logging');

var userids = {};
var nextuserid = 0;

module.exports.addClient = function(socket) {
	socket.mpmuserid = null;
	var userid = null;
	var clientid = null;
	socket.on('loguse.client.id', function(msg) {
		clientid = msg.clientid;
		if (clientid) {
			userid = userids[clientid];
			if (userid===undefined) {
				userid = ++nextuserid;
				userids[clientid] = ''+userid;
			}
			console.log('client '+clientid+' -> user '+userid);
			socket.emit('loguse.client.userid', {userid: userid});
			logging.log('loguse', 'loguse.client.add', {clientid:clientid, userid:userid}, logging.LEVEL_INFO);
			socket.mpmuserid = userid;
			socket.mpmclientid = clientid;
		}
	});
	socket.on('loguse.client.awake', function(msg) {
		// clientid: clientid, clienttime: ms, aftersleep: ms
		logging.log('loguse:'+userid, 'loguse.client.awake',
				{clientid:msg.clientid, userid:userid, clienttime:msg.clienttime, aftersleep:msg.aftersleep}, 
				logging.LEVEL_INFO);		
	});
	socket.on('loguse.client.log', function(msg) {
		// clientid: clientid, clienttime: ms, aftersleep: ms
		if (typeof(msg)=='object') {
			msg.clientid = clientid;
			msg.userid = userid;
		}
		logging.log('loguse:'+userid, 'loguse.client.log',
				msg, 
				logging.LEVEL_INFO);		
	});
	socket.on('loguse.client.view', function(msg) {
		// clientid: clientid, clienttime: ms, path: path, info: info
		logging.log('loguse:'+userid, 'loguse.client.view',
				{clientid:msg.clientid, userid:userid, clienttime:msg.clienttime, path:msg.path, info: msg.info}, 
				logging.LEVEL_INFO);		
	});
	socket.on('loguse.client.visible', function(msg) {
		// clientid: clientid, clienttime: ms, aftersleep: ms
		logging.log('loguse:'+userid, 'loguse.client.visible',
				{clientid:msg.clientid, userid:userid, clienttime:msg.clienttime, after:msg.after}, 
				logging.LEVEL_INFO);		
	});
	socket.on('loguse.client.hidden', function(msg) {
		// clientid: clientid, clienttime: ms, aftersleep: ms
		logging.log('loguse:'+userid, 'loguse.client.hidden',
				{clientid:msg.clientid, userid:userid, clienttime:msg.clienttime, after:msg.after}, 
				logging.LEVEL_INFO);		
	});
}