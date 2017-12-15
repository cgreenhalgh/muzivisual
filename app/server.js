var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var redisAdapter = require('socket.io-redis');
var _ = require('lodash');
var socketClient = require('socket.io-client');
var redis = require("redis");
var logging = require("./lib/logging");
var loguse = require("./lib/loguse");

logging.init('server', 'muzivisual');

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
  console.log('A client connected.');

  loguse.addClient(socket);

  socket.on('disconnect', function () {
    socket.disconnect();
  })

  socket.on('serverSocket', function () {
    console.log('new server socket connected');
    socket.join('mobileapp');
  });

  var flag = 0;
  socket.on('client', function (perf) {
    console.log('flag value: ', flag)
    //if (flag === 0) {
    {
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
      // flag = 1;
    }
  });

  // socket.on('performance',function(){
  //   console.log('get data about performance')
  // })

});

function returnIndex(req, res) {
  console.log('get index.html as '+req.url);
  res.sendFile(__dirname + '/public/index.html');
}
app.get('/', returnIndex);
app.get('/content/*', returnIndex);
app.get('/performance/*', returnIndex);
app.get('/past-performance/*', returnIndex);

function returnPublicFile(req, res) {
  var url = require('url').parse(req.url);
  console.log('get ' + req.url + ' -> ' + url.pathname);
  res.sendFile(__dirname + '/public' + url.pathname);
};

app.get('/*.html', returnPublicFile);
app.get('/*.png', returnPublicFile);
app.get('/*.jpg', returnPublicFile);
app.get('/css/*.css', returnPublicFile);
app.get('/js/*', returnPublicFile);
app.get('/vendor/*', returnPublicFile);
app.get('/components/*', returnPublicFile);

function returnDataFile(req, res) {
  var url = require('url').parse(req.url);
  if (url.pathname.substring(0,6)!='/data/') {
    console.log('Error: get data ' + req.url + ' -> ' + url.pathname+' doesn\'t start with /data/');
    res.sendStatus(500);
    return;
  }
  console.log('get ' + req.url + ' -> ' + url.pathname);
  res.sendFile(__dirname + url.pathname);
};

app.get('/data/*.json', returnDataFile);

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
  logging.log('server', 'http.listen', { port: port }, logging.LEVEL_INFO);

  var serverSocket = socketClient('http://localhost:' + port);
  serverSocket.emit('serverSocket');

  serverSocket.on('vStart', function (data) {
    console.log('GET MESSAGE FROM MUZICODES:', data);
    //io.to('mobileapp').emit('vStart', data);
    // perfid:stage
    if (!data) {
      return;
    }

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

  serverSocket.on('vEvent', function (data) {
    var parts = data.split(':');
    var perf = parts[0];
    var rest = parts.slice(1).join(':');
    console.log('event in performance ' + perf + ': ' + rest);
    var key = 'performance:' + perf;
    // don't persist
    io.to(key).emit('vEvent', data);
  });

  serverSocket.on('vStop', function (data) {
    if (!data) {
      return;
    }
    var perf = data;
    console.log('stop performance ' + perf);
    var key = 'performance:' + perf;
    redisClient.rpush(key, JSON.stringify({ name: 'vStop', time: (new Date()).getTime() }));
    io.to(key).emit('vStop');
  });
})