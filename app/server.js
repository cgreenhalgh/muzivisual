var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var redis = require('socket.io-redis');
var _ = require('lodash');

//CORS
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

var redis_host = process.env.REDIS_HOST || '127.0.0.1';
var redis_config = { host: redis_host, port: 6379 };
if (process.env.REDIS_PASSWORD) {
	redis_config.auth_pass = process.env.REDIS_PASSWORD;
}
console.log('using redis config '+JSON.stringify(redis_config));
io.adapter(redis(redis_config));

io.on('connection', function (socket) {
  socket.join('mobileapp');

  console.log('A client connected.');
  socket.on('vTimer', function (data) {
    console.log(data);
    if(data<=0){return;}
    io.to('mobileapp').emit('vTimer', data);
  })

  socket.on('disconnect', function () {
    socket.disconnect();
  })
  socket.on('vStart', function (data) {
    io.to('mobileapp').emit('vStart', data);
  })
});

app.get('/', function (req, res) {
  console.log('get /');
  res.sendFile(__dirname + '/public/index.html');
});

// app.get('/map', function (req, res) {
//   console.log('get /map')
//   res.sendFile(__dirname + '/public/map.html')
// })

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

  fs.readFile(DATA_DIR + '/Climb!June8.csv', function (err, data) {
    if (err) throw err;
    processData(data, res);
  });
});

function processData(data, res) {
  // split content based on new line
  var rows = _.split(data, /\r\n|\n/);
  var resp = [];

  var stageRow;
  var x = '';
  var y = '';
  var visual = [];

  var rlength = rows.length;

  console.log('Rlength is : ', rlength);
  var stageData;


  for (var i = 1; i < rlength; i++) {
    // split content based on comma
    stageRow = rows[i].split(',');

    stageData = {
      "name": stageRow[0],
      "stage":stageRow[1],
      "cue":stageRow[2],
      "x":stageRow[3],
      "y":stageRow[4],
      "path":stageRow[5]
    }

    resp.push(stageData);
  }
  res.set('Content-Type', 'application/json').send(JSON.stringify(resp));
  console.log('map data sent.');
  console.log(resp)
}

var port = process.env.PORT || 8000;
http.listen(port, function () {
  console.log('Visual listening on port ' + port + '!')
})