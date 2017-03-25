var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var redis = require('socket.io-redis');
var _ = require('lodash');

//CORS
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

io.adapter(redis({ host: '127.0.0.1', port: 6379 }));

io.on('connection', function (socket) {
  socket.join('visualRoom');
	  console.log('A client connected.');
	socket.on('visualMsg', function (data) {
		console.log("MESSAGE FROM FRONT-END: " + data);
		io.to('visualRoom').emit('visualMsg', 'From visual-backend');
	})
});

app.get('/map', (req, res, next) => {
    res.send(Object.keys(io.connected));
});

app.get('/', function (req, res) {
  console.log('get /');
  res.sendFile(__dirname + '/public/index.html');
});

function returnPublicFile(req, res) {
  var url = require('url').parse(req.url);
  console.log('get ' + req.url + ' -> ' + url.pathname);
  res.sendFile(__dirname + '/public' + url.pathname);
};

app.get('/*.html', returnPublicFile);
app.get('/css/*.css', returnPublicFile);
app.get('/js/*', returnPublicFile);
app.get('/vendor/*', returnPublicFile);
app.get('/components/*', returnPublicFile);

var DATA_DIR = __dirname + '/maps/';
app.get('/maps/', function (req, res) {
  console.log('get map data');
  fs.readdir(DATA_DIR, function (err, fnames) {
    if (err) {
      res.status(500).send('Could not read map data directory (' + err + ')');
      return;
    }
  });

  fs.readFile(DATA_DIR + '/test.csv', function (err, data) {
    if (err) throw err;
    processData(data, res);
  });
});

var stageInfo;
app.get('/stage/:from/:to', function (req, res) {
  res.send(req.params);
});

// app.get('/:stage', function (req, res) {
//   var info = req.params;
//   console.log('SEND SERVER' + info);
//   res.render(info);
// });

function processData(data, res) {
  // split content based on new line
  var rows = _.split(data, /\r\n|\n/);
  var resp = [];

  var stageRow;
  for (var i = 1; i < rows.length; i++) {
    // split content based on comma
    stageRow = rows[i].split(',');
    var stageData = {
      "stage": stageRow[0],
      "cue": stageRow[1],
      "visual": stageRow[2],
      "state": "hidden"
    }
    resp.push(stageData);
  }
  res.set('Content-Type', 'application/json').send(JSON.stringify(resp));
  console.log('map data sent.');
}

var port = process.env.PORT || 8000;
http.listen(port, function () {
  console.log('Visual listening on port ' + port + '!')
})