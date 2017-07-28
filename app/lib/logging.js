// LOGGING STUFF...
var fs = require('fs');
var path = require('path');
var dateFormat = require('dateformat');

var ROOT_DIR = path.join(__dirname,'..');

module.exports.LEVEL_DEBUG = 2;
module.exports.LEVEL_INFO = 4;
module.exports.LEVEL_WARN = 6;
module.exports.LEVEL_ERROR = 8;
module.exports.LEVEL_SEVERE = 10;

var LOG_FILENAME_DATE_FORMAT = "yyyymmdd'T'HHMMssl'Z'";
var LOG_DATE_FORMAT = "yyyy-mm-dd'T'HH:MM:ss.l'Z'";

var DEFAULT_TIMEOUT = 30000;
function run_process(cmd, args, cwd, timeout, cont) {
	console.log('spawn '+cmd+' '+args.join(' '));
	var output = [];
	var process = require('child_process').spawn(cmd,
			args, {
		cwd: cwd
	});
	process.stdin.on('error', function() {});
	process.stdout.on('data', function(data) {
		//console.log( 'Client stdout: '+data);
		output.push(data);
	});
	process.stdout.on('end', function() {});
	process.stdout.on('error', function() {});
	process.stderr.on('data', function(data) {
		output.push('Error: '+data);
	});
	process.stderr.on('end', function() {});
	process.stderr.on('error', function() {});
	process.on('close', function(code) {
		console.log('process '+cmd+' exited ('+code+')');
		cont(code, output.join(''));
	});
	console.log('done spawn');
}

var LOG_DIR = path.join(ROOT_DIR,'logs');
if (!fs.existsSync(LOG_DIR)) {
	console.log('Try to create log dir '+LOG_DIR);
	fs.mkdirSync(LOG_DIR);
	if (!fs.existsSync(LOG_DIR)) {
		console.log('ERROR: could not create log dir '+LOG_DIR);
	} else {
		console.log('Created log dir '+LOG_DIR);		
	}
}
var packageInfo = null;
try {
	var json = fs.readFileSync(path.join(ROOT_DIR,'package.json'),'utf8');
	packageInfo = JSON.parse(json);
}
catch (err) {
	console.log("Error reading/parsing package info from "+ROOT_DIR+'/package.json: '+err.message);
}
var appCommit = null;
run_process('git',['log','--pretty=format:%H','-1'], ROOT_DIR,DEFAULT_TIMEOUT,function(code,output) {
	if (code!==0) {
		console.log('Could not get git commit');
	} else {
		appCommit = output.trim();
		console.log('git commit = '+appCommit);
		// async
		module.exports.log('server','git.commit', appCommit, module.exports.LEVEL_INFO);
	}
});
var installId = null;
try {
	fs.accessSync(path.join(ROOT_DIR,'installId'), fs.R_OK);
	installId = fs.readFileSync(path.join(ROOT_DIR,'installId'),'utf8').trim();
} catch (err) {
	console.log('Error reading '+ROOT_DIR+'/installId: '+err.message);
}
if (installId===null) {
	var uuid = require('uuid');
	installId = uuid.v1();
	console.log('Generated installId '+installId);
	try {
		fs.writeFileSync(path.join(ROOT_DIR,'installId'), installId, 'utf8');
	} catch (err) {
		console.log('Error: could not write installId: '+err.message);
	}
}

var logPath=null;
var logFile=null;

module.exports.init = function(component, default_application)
{
	var now = new Date();
	logPath = path.join(LOG_DIR, dateFormat(now, LOG_FILENAME_DATE_FORMAT)+'.log');
	var info = {
		logVersion: '1.0'
	};
	if (packageInfo!==null) {
		info.application = packageInfo.name;
		info.version = packageInfo.version;
	} else {
		info.application = default_application;
		// version ?!
	}
	// installId, machineNickname, appCommit
	if (appCommit!==null)
		info.appCommit = appCommit;
	if (installId!==null)
		info.installId = installId;

	try {
		console.log('create log file '+logPath);
		logFile = fs.createWriteStream(logPath, {flags:'a+',defaultEncoding:'utf8',autoClose:true,mode:0o644});
	} catch (err) {
		console.log('Error creating log file '+logPath+': '+err.message);
	}
	
	module.exports.log(component, 'log.start', info, module.exports.LEVEL_INFO);
}
module.exports.log = function(component, event, info, level) {
	if (logFile!==null) {
		if (level===undefined)
			level = module.exports.LEVEL_INFO;
		var now = new Date();
		var entry = {
				time: now.getTime(),
				datetime: dateFormat(now, LOG_DATE_FORMAT),
				level: level,
				component: component,
				event: event,
				info: info
		};
		logFile.write(JSON.stringify(entry));
		logFile.write('\n');
	} else {
		console.log('no log: component='+component+' event='+event+' info='+JSON.stringify(info)+' level='+level)
	}
}
// logging

