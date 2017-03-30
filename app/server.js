var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var redis = require('socket.io-redis');
var _ = require('lodash');

var BK_WIDTH = 1025;
var BK_HEIGHT = 1334;

//CORS
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

io.adapter(redis({ host: '127.0.0.1', port: 6379 }));

io.on('connection', function (socket) {
  socket.join('visualRoom');

  console.log('A client connected.');
  socket.on('vTimer', function (data) {
    io.to('visualRoom').emit('vTimer', data);
  })

  socket.on('disconnect', function () {
    socket.disconnect();
  })
  // socket.on('vStart', function () {
  //   io.to('visualRoom').emit('vStart', data);
  // })
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

  fs.readFile(DATA_DIR + '/climb.csv', function (err, data) {
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
  var score = [];

  var length = rows.length;
  var stageData

  var index = 6;
  var scoreExist;
  var i;
  for (i = 1; i < rows.length; i++) {
    // split content based on comma
    stageRow = rows[i].split(',');

    // for Climb!
    // if map has its own point location setting
    if (stageRow[4] && stageRow[5]) {
      x = (parseInt(stageRow[4]) / BK_WIDTH).toFixed(3);
      y = (parseInt(stageRow[5]) / BK_HEIGHT).toFixed(3);
    }

    while (stageRow[index]) {
      scoreExist = stageRow[index];
      if (scoreExist) {
        score.push(scoreExist);
      }
      index++;
    }

    index = 6;
    scoreExist = '';

    stageData = {
      "name": stageRow[0],
      "stage": stageRow[1],
      "cue": stageRow[2],
      "img": stageRow[3],
      "x": x,
      "y": y,
      "score": score,
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