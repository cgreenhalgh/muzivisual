var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var redisAdapter = require('socket.io-redis');
var _ = require('lodash');
var socketClient = require('socket.io-client');
var redis = require("redis");

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
console.log('using redis config ' + JSON.stringify(redis_config));
io.adapter(redisAdapter(redis_config));

var redisClient = redis.createClient(redis_config);

io.on('connection', function (socket) {

  //  socket.join('mobileapp');


  console.log('A client connected.');
  // socket.on('vTimer', function (data) {
  //   console.log(data);
  //   if (data <= 0) { return; }
  //   io.to('mobileapp').emit('vTimer', data);
  // })

  socket.on('disconnect', function () {
    socket.disconnect();
  })

  socket.on('serverSocket', function () {
    console.log('new server socket connected');
    socket.join('mobileapp');
  });

  var flag = 0;
  socket.on('client', function (perf) {
    if (flag === 0) {
      console.log('new client for performance ' + perf);
      var key = 'performance:' + perf;
      socket.join(key);
      redisClient.lrange(key, 0, -1, function (err, msgs) {
        if (err) {
          console.log('error getting saved messages for performance ' + perf, err);
          return;
        }
        for (var i in msgs) {
          var msg = msgs[i];
          console.log('got saved message: ' + msg);
          var data = JSON.parse(msg);
          socket.emit(data.name, data.data);
        }
      });
      flag = 1;
    }
  });

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

  fs.readFile(DATA_DIR + '/Climb!June8.csv', function (err, data) {
    if (err) throw err;
    processData(data, res);
  });
});


var NARR_DIR = __dirname + '/visualcontent/';
app.get('/fragments/', function (req, res) {
  console.log('get visual fragments');
  fs.readdir(NARR_DIR, function (err, fnames) {
    if (err) {
      res.status(500).send('Could not read map data directory (' + err + ')');
      return;
    }
  });

  fs.readFile(NARR_DIR + '/narrativesJune8.csv', function (err, data) {
    if (err) throw err;
    processNarrativeData(data, res);
  });
})

function processNarrativeData(data, res) {
  var rows = _.split(data, /\r\n|\n/);
  var resp = [];

  var narratives = [];
  var rlength = rows.length;
  var stageChange = '';

  for (var i = 1; i < rlength; i++) {
    row = rows[i].split('/');

    stageChange = row[0] + '->' + row[1];

    narrativeData = {
      "from": row[0],
      "to": row[1],
      "stageChange": stageChange,
      "narrative": row[2]
    }
    resp.push(narrativeData);
  }

  res.set('Content-Type', 'application/json').send(JSON.stringify(resp));
  console.log('narrative data sent.');
  //console.log(resp);
}

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
      "stage": stageRow[1],
      "cue": stageRow[2],
      "x": stageRow[3],
      "y": stageRow[4],
      "path": stageRow[5]
    }

    resp.push(stageData);
  }
  res.set('Content-Type', 'application/json').send(JSON.stringify(resp));
  console.log('map data sent.');
  //console.log(resp)
}

var port = process.env.PORT || 8000;
http.listen(port, function () {
  console.log('Visual listening on port ' + port + '!');

  var serverSocket = socketClient('http://localhost:8000');
  serverSocket.emit('serverSocket');

  serverSocket.on('vStart', function (data) {
    console.log('GET MESSAGE FROM MUZICODES:', data);
    //io.to('mobileapp').emit('vStart', data);
    // perfid:stage
    var parts = data.split(':');
    var perf = parts[0];
    var stage = parts[1];
    console.log('start performance ' + perf + ' at stage ' + stage);
    var key = 'performance:' + perf;
    redisClient.del(key, function () {
      console.log('cleared performance ' + perf);
      redisClient.rpush(key, JSON.stringify({ name: 'vStart', data: data, time: (new Date()).getTime() }));
    });
    io.to(key).emit('vStart', data);
  });
  // other messages
  serverSocket.on('vStageChange', function (data) {
    var parts = data.split(':');
    var perf = parts[0];
    var rest = parts.slice(1).join(':');
    console.log('stage change in performance ' + perf + ': ' + rest);
    var key = 'performance:' + perf;
    redisClient.rpush(key, JSON.stringify({ name: 'vStageChange', data: data, time: (new Date()).getTime() }));
    io.to(key).emit('vStageChange', data);
  });
  serverSocket.on('vStop', function (data) {
    var perf = data;
    console.log('stop performance ' + perf);
    var key = 'performance:' + perf;
    redisClient.rpush(key, JSON.stringify({ name: 'vStop', time: (new Date()).getTime() }));
    io.to(key).emit('vStop');
  });
})