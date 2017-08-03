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

app.get('/allPerformances/', function (req, res) {
  fs.readdir(__dirname, function (err, fnames) {
    if (err) {
      res.status(500).send('Could not read performances file directory (' + err + ')');
      return;
    }
  });
  fs.readFile(__dirname + '/public/config/performances.json', function (err, perfData) {
    var data = [];
    if (err) throw err;
    var pperf = JSON.parse(perfData);
    fs.readFile(__dirname + '/public/config/performances_metadata.json',
      // get configrations from two files
      function (err, perfMeta) {
        if (err) throw err;
        var pperfMeta = JSON.parse(perfMeta);
        var ppKeys = _.keys(pperf);
        _.forEach(ppKeys, function (ppKey) {
          var obj1 = _.get(pperfMeta, ppKey);
          var obj2 = _.get(pperf, ppKey);
          var newObj = _.assign(obj1, obj2);
          newObj.time = JSON.parse(newObj.value[0]).time;
         // _.concat(data,newObj);
          data.push(newObj);
          //console.log("New Object: ", );
        })
        //console.log('get pperf data', data)
        res.set('Content-Type', 'application/json').send(data);
      });

  });
});


var DATA_DIR = __dirname + '/maps/';
app.get('/maps/', function (req, res) {
  console.log('get map data');
  fs.readdir(DATA_DIR, function (err, fnames) {
    if (err) {
      res.status(500).send('Could not read map data directory (' + err + ')');
      return;
    }
  });

  fs.readFile(DATA_DIR + '/Climb!London.csv', function (err, data) {
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

  fs.readFile(NARR_DIR + '/narrativesLondon.csv', function (err, data) {
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
    var narrative = row[2].substring(0, row[2].length - 1)

    narrativeData = {
      "from": row[0],
      "to": row[1],
      "stageChange": stageChange,
      "narrative": narrative
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

    // var jobs = [];
    // redisClient.set('KEYS*', function (err, keys) {
    //     if (err) return console.log(err);
    //     if(keys){
    //         async.map(keys, function(key, cb) {
    //            redisClient.get(key, function (error, value) {
    //                 if (error) return cb(error);
    //                 var job = {};
    //                 job['jobId']=key;
    //                 job['data']=value;
    //                 cb(null, job);
    //             }); 
    //         }, function (error, results) {
    //            if (error) return console.log(error);
    //            console.log(results);
    //            res.json({data:results});
    //         });
    //     }
    // });
    // console.log(jobs)

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
    console.log('eevnt in performance ' + perf + ': ' + rest);
    var key = 'performance:' + perf;
    redisClient.rpush(key, JSON.stringify({ name: 'vEvent', data: data, time: (new Date()).getTime() }));
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