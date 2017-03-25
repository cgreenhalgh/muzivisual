// var _ = require('lodash/core');
'use strict'

var map = angular.module('myApp.map', ['ngRoute']);

map.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
  $routeProvider.when('/', {
    templateUrl: '/map.html',
    controller: 'mapCtrl'
  })

  $locationProvider.html5Mode({
    enabled: true,
    requireBase: false
  });
}])

map.controller('schangeCtrl', ['$scope', '$http', '$routeParams', function ($scope, $http, $routeParams) {
  //console.log("FROM STAGE: "+$routeParams.from);
  //console.log("TO STAGE: "+$routeParams.to);
  console.log("HELLO STAGE: " + $routeParams.hello);
}]);

map.controller('mapCtrl', ['$scope', '$http', 'socket', function ($scope, $http, socket) {
  $scope.currentStage = 'basecamp';
  $scope.sebseStage = false;

  $scope.sendStage = function () {
    socket.emit('visualMsg', 'FROM visual-FRONT');
    console.log("msg sent");
  }

  socket.on('visualMsg', function (data) {
    console.log("visual-front receive: " + data);
    $scope.message = data;
  });

  // $scope.$watch('message', (after, before) => {
  //   console.log(after);
  //   // socket.emit('muzicode-message', 'This is a message from VISUAL BACKEND');
  // })

  $http.get('/maps/').success(function (data) {
    $scope.testData = data;
  });

  // room: room name (default "default")
  // pin: room pin/ password(default "")
  // name: control input name (required)
  // client: optional client identification

  $http({
    url: 'http://127.0.0.1:3000/input',
    method: 'POST',
    data: {
      contentType: 'application/x-www-form-urlencoded',
      room: "",
      pin: "",
      name: "visual",
      client: "visual",
      stage: $scope.stage
    }
  }).success(function (data) {
    console.log("Success" + data);
  }).error(function (data) {
    console.log("Erro: " + data);
  })
}])

map.directive('d3Map', ['d3Service', '$http', '$window', function (d3Service, $http, $window) {
  return {
    restrict: 'EA',
    scope: false,
    link: function (scope, element, attrs) {
      // scope.$watch('mapData', function(newValue, oldValue){
      //    console.log('D3MAP SCOPE: ' + scope.mapData + "\n" + newValue);
      // });

      $http.get('/maps/').success(function (data) {
        var testData = data;
        console.log("GOT MAP: " + JSON.stringify(testData));

        // EXTRACT INFO FROM DATA 
        // get normal stages (except bc and summit)
        var stages = _.remove(testData, function (n) {
          if (n.stage === 'summit' || n.stage === 'basecamp')
            return false;
          return true;
        })

        // collect path names to help sort stages i.e. a, b, c...
        var pathCode = _.orderBy(_.uniq(_.map(stages, function (o) { return _.head(o.stage); })));
        var NUM_COLUMN = pathCode.length; // column of the map
        var NUM_ROW = 0;
        console.log(pathCode);

        // sort normal stages by path and stage number in desc order
        // sample: [[a2,a1],[b2,b1],[c2,c1]]
        var pathStageContainer = [];
        _.forEach(pathCode, function (obj) {
          var spePath = _.filter(stages, function (o) { return _.head(o.stage) == obj; });
          var orderedSpePath = _.orderBy(spePath, ['stage'], ['desc']);
          var pathHeight = orderedSpePath.length + 2;
          // get the maximum stages in one path as the NUM_ROW
          pathHeight > NUM_ROW ? NUM_ROW = pathHeight : 0;
          pathStageContainer.push(orderedSpePath);
        });

        // DISPLAY SETTINGS
        //var NUM_COLUMN = 3; // column of the map
        //var NUM_ROW = 10; // row of the map
        var RECT_WIDTH = 100;
        var RECT_HEIGHT = 40;

        var MAP_WIDTH = $window.innerWidth;
        var MAP_HEIGHT = $window.innerHeight;
        console.log("WINDOW: width: " + MAP_WIDTH + "  height: " + MAP_HEIGHT);

        var INI_X, RECT_X, INI_Y, RECT_Y, TEXT_X, TEXT_Y, X_OFFSET, Y_OFFSET;
        // x and y of rectangulars
        INI_X = RECT_X = (MAP_WIDTH - RECT_WIDTH) / 2;
        INI_Y = RECT_Y = 50;

        X_OFFSET = MAP_WIDTH / (NUM_COLUMN * 2) + RECT_WIDTH / 2;
        Y_OFFSET = (MAP_HEIGHT - 50) / (NUM_ROW * 2) + RECT_HEIGHT / 2;

        var LEFT_X = MAP_WIDTH / (NUM_COLUMN * 2) - RECT_WIDTH / 2;

        // DRAW
        d3Service.d3().then(function (d3) {
          var canvas = d3.select(element[0]).append('svg').attr('width', MAP_WIDTH).attr('height', MAP_HEIGHT).attr('id', 'map-container');

          var data = []; // data contains data with x, y and are ordered
          var length = 0;
          var pathData;
          var i = 0;
          var j = 0;

          // DATA PROCESS 
          // data are processed seperately: summit + normal stages + basecamp
          var summitData = _.find(testData, { 'stage': 'summit' });
          // if the summit exists, draw summit
          if (summitData.visual) {
            summitData.x = (NUM_COLUMN - 1) / 2;
            summitData.y = 0;
            summitData = _.castArray(summitData);
            data = summitData;
          }

          _.forEach(pathStageContainer, function (pathData) {
            _.forEach(pathData, function (o) {
              if (_.isObject(o)) {
                o.x = i;
                o.y = j + 1;
                j++;
              }
            });
            j = 0;
            i++;
            data = _.concat(data, pathData);
          });

          var bcData = _.find(testData, { 'stage': 'basecamp' });
          if (bcData.visual) {
            // change state for the basecamp and its subsequent stage
            bcData.state = "active";
            var cueList = _.split(bcData.cue, '/');
            _.forEach(cueList, function (cue) {
              var stage = _.find(data, { stage: cue });
              stage.state = "revealed";
              // console.log(_.find(data, { stage: cue }));
            });

            bcData.x = (NUM_COLUMN - 1) / 2;
            bcData.y = NUM_ROW - 1;
            bcData = _.castArray(bcData);
            data = _.concat(data, bcData);
          }


          // MAP MANIPULATION
          var customPath = [];
          scope.$watch(scope.sebseStage, function () {

            if (scope.sebseStage) {

              // turn the previous active stage into past -  succ / fail
              var cs = _.find(data, { 'stage': scope.currentStage })
              console.log(cs);
              cs.state = "rev_succ";
              customPath.push(scope.currentStage)
              console.log("ADD STAGE " + scope.currentStage + " TO CUSTOM PATH");

              // active new path
              var ss = _.find(data, { 'stage': scope.sebseStage });
              ss.state = 'active'

              // get missed stages
              var revealeds = _.filter(data, { 'state': 'revealed' })
              console.log(revealeds);
              _.forEach(revealeds, function (r) {
                console.log(r);
                if (_.isObject(r))
                  r.state = 'missed';
              });

              // reveal new stages
              var cues = _.split(ss.cue, '/');
              _.forEach(cues, function (c) {
                var ob = _.find(data, { 'stage': c })
                ob.state = 'revealed';
              });

              scope.currentStage = scope.sebseStage;
              drawArrow(canvas, data);
              drawStage(canvas, data);

              // CALL IMAGE DISPLAY / CONTENT / WHATSOEVER
              // END DATA PROCESS
            }
          });

          // COLLECT CUSTOM PATH
          // DRAW 
          drawArrow(canvas, data);
          drawStage(canvas, data);

          function drawArrow(canvas, data) {
            _.forEach(data, function (da) {
              if (da && da.cue) {
                // get all the cues of this stage
                var cueList = _.split(da.cue, '/');

                var cueStageInfo;
                _.forEach(cueList, function (cueStage) {
                  cueStageInfo = _.find(data, { 'stage': _.trim(cueStage) });
                  canvas
                    .append('line')
                    .attr("x1", function () { return LEFT_X + da.x * X_OFFSET + RECT_WIDTH / 2 })
                    .attr("y1", function () { return INI_Y + da.y * Y_OFFSET + RECT_HEIGHT / 2 })
                    .attr("x2", function () { return LEFT_X + cueStageInfo.x * X_OFFSET + RECT_WIDTH / 2 })
                    .attr("y2", function () { return INI_Y + cueStageInfo.y * Y_OFFSET + RECT_HEIGHT / 2 })
                    .attr('stroke', function () { return checkTextAndRectBorderColor(da); })
                    .attr('stroke-width', '2px')
                    .attr("id", function () { return cueStageInfo.stage ? (cueStageInfo.stage + '_' + cueStage.stage) : (cueStageInfo.stage + '_line') })
                    .attr('opacity', function () { return getLineOpacity(da, cueStageInfo) })

                });
              }
            });
          }

          function drawStage(canvas, data) {
            // console.log(data);
            canvas
              .selectAll('rect')
              .data(data)
              .enter()
              .append('rect')
              .attr('x', function (d) { return LEFT_X + d.x * X_OFFSET })
              .attr('y', function (d) { return INI_Y + d.y * Y_OFFSET })
              .attr('width', RECT_WIDTH)
              .attr('height', RECT_HEIGHT)
              .attr('fill', function (d) { return getRectFillColor(d); })
              .attr('stroke', function (d) { return checkTextAndRectBorderColor(d) })
              .attr('stroke-width', '2px')
              .attr('opacity', function (d) { return getOpacity(d); })
            canvas
              .selectAll('text')
              .data(data)
              .enter()
              .append('text')
              .text(function (d) { return d.stage; })
              .attr('x', function (d) { return LEFT_X + d.x * X_OFFSET + RECT_WIDTH / 2 })
              .attr('y', function (d) { return INI_Y + d.y * Y_OFFSET + 25 })
              .attr('text-anchor', 'middle')
              .attr('font-size', '20px')
              .attr('fill', function (d) { return checkTextAndRectBorderColor(d) })
              .attr('id', function (d) { return d.stage })
              .attr('opacity', function (d) { return getOpacity(d); })
          }

          // var test
          // var defs = canvas.append('svg:defs');
          // defs.selectAll('svg:marker')
          //   .data(test)
          //   .enter()
          //   .append('svg:marker')
          //   .attr('markerHeight', 5)
          //   .attr('markerWidth', 5)
          //   .attr('orient', 'auto')
          //   .attr('refX', 0)
          //   .attr('refY', 0)
          //   .attr('viewBox', '0 -5 10 10')
          //   .append("svg:path")
          //   .attr("d", "M0,-5L10,0L0,5")
          //   .attr('fill', 'red');
        });
      })

      function getLineOpacity(activeS, cueS) {
        if (activeS.state === 'rev_succ' && cueS.state === 'active') {
          return 1;
        } else {
          return 0; // should be 0
        }
      }

      function getRectFillColor(d) { // check if its a path or a stage Î
        if (_.includes(d.stage, 'path')) {
          return '#C5C9FF';  // blue
        } else if (d.state === 'active') {
          return 'black';
        } else {
          return 'white';
        }
      }

      function checkTextAndRectBorderColor(d) {
        if (d.state === 'rev_succ') {
          return 'green';
        } else if (d.state === 'rev_fail') {
          return 'red';
        }
        else if (d.state === 'active') {
          return 'white';
        } else {
          return 'black';
        }
      }

      function getOpacity(d) {
        if (d.state === 'missed') {
          return 0.4;
        } else if (d.state === 'hidden') {
          return 0;
        } else {
          return 1;
        }
      }
    }
  }
}])

