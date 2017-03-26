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


map.controller('mapCtrl', ['$scope', '$http', 'socket', function ($scope, $http, socket) {
  $scope.pstage = '';
  $scope.cstage = '';

  // $scope.sendStage = function () {
  //   socket.emit('visualMsg', 'FROM visual-FRONT');
  //   console.log("msg sent");
  // }

  socket.on('visualMsg', function (data) {
    console.log("visual-front receive: " + data);
    var stages = data.split('->')
    $scope.pstage = stages[0];
    $scope.cstage = stages[1];
  });


  $http.get('/maps/').success(function (data) {
    $scope.iniData = data;
  });

  // room: room name (default "default")
  // pin: room pin/ password(default "")
  // name: control input name (required)
  // client: optional client identification

  //   $http({
  //     url: 'http://127.0.0.1:3000/input',
  //     method: 'POST',
  //     data: {
  //       contentType: 'application/x-www-form-urlencoded',
  //       room: "",
  //       pin: "",
  //       name: "visual",
  //       client: "visual",
  //       stage: $scope.stage
  //     }
  //   }).success(function (data) {
  //     console.log("Success" + data);
  //   }).error(function (data) {
  //     console.log("Erro: " + data);
  //   })
}])

map.directive('d3Map', ['d3Service', '$http', '$window', function (d3Service, $http, $window) {
  return {
    restrict: 'EA',
    scope: false,
    link: function (scope, element, attrs) {

      $http.get('/maps/').success(function (data) {
        var iniData = data;
        console.log("GOT MAP: " + JSON.stringify(iniData));

        // EXTRACT INFO FROM DATA 
        // get normal stages (except bc and summit)
        var stages = _.remove(iniData, function (n) {
          if (n.stage === 'summit' || n.stage === 'basecamp')
            return false;
          return true;
        })

        // collect path names to help sort stages i.e. a, b, c...
        var pathCode = _.orderBy(_.uniq(_.map(stages, function (o) { return _.head(o.stage); })));
        var NUM_COLUMN = pathCode.length; // column of the map
        var NUM_ROW = 0;

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
        var RECT_WIDTH = 120;
        var RECT_HEIGHT = 40;

        var MAP_WIDTH = $window.innerWidth;
        var MAP_HEIGHT = $window.innerHeight;
        console.log("WINDOW: width: " + MAP_WIDTH + "  height: " + MAP_HEIGHT);

        var INI_X, RECT_X, INI_Y, RECT_Y, TEXT_X, TEXT_Y, X_OFFSET, Y_OFFSET, LEFT_X;

        INI_Y = RECT_Y = MAP_HEIGHT * 0.1;

        X_OFFSET = MAP_WIDTH / NUM_COLUMN;
        Y_OFFSET = MAP_HEIGHT * 0.8 / NUM_ROW;

        LEFT_X = MAP_WIDTH / (NUM_COLUMN * 2) - RECT_WIDTH / 2;

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
          var summitData = _.find(iniData, { 'stage': 'summit' });
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

          var bcData = _.find(iniData, { 'stage': 'basecamp' });
          if (bcData.visual) {
            // change state for the basecamp and its subsequent stage
            bcData.state = "active";
            var cueList = _.split(bcData.cue, '/');
            _.forEach(cueList, function (cue) {
              var stage = _.find(data, { stage: cue });
              stage.state = "revealed";
            });

            bcData.x = (NUM_COLUMN - 1) / 2;
            bcData.y = NUM_ROW - 1;
            bcData = _.castArray(bcData);
            data = _.concat(data, bcData);
          }


          // Data updated
          // ps - previous stage, the passed one
          // cs - current stage, the triggered one
          // fs - future stage, the stages cued next
          var customPath = [];
          scope.$watch('cstage', function () {
            if (scope.cstage) {

              // turn the previous active stage into past -  succ / fail
              var ps = _.find(data, { 'stage': scope.pstage })
              ps.state = "rev_succ";
              customPath.push(scope.pstage)
              updateMapStage(ps, 0);

              // active new path
              var cs = _.find(data, { 'stage': scope.cstage });
              cs.state = 'active';
              updateMapStage(cs, 1);

              // ps cue stage
              var psCues = ps.cue.split('/');
              var psCuesWithoutCs = _.filter(psCues, function (s) { return s !== cs.stage });

              // get missed stages
              var revealeds = _.filter(data, { 'state': 'revealed' })

              _.forEach(revealeds, function (rs) {
                if (_.isObject(rs))
                  rs.state = 'missed';
                updateMapStage(rs, 1);
              });

              // reveal new stages
              var fss = _.split(cs.cue, '/');
              var flist = [];
              _.forEach(fss, function (c) {
                var fs = _.find(data, { 'stage': c })
                fs.state = 'revealed';
                flist.push(fs);
                updateMapStage(fs, 2);
              });

              updateMapLine(ps, cs, flist, psCuesWithoutCs);

              // CALL IMAGE DISPLAY / CONTENT / WHATSOEVER
              // END DATA PROCESS
            }
          });


          // COLLECT CUSTOM PATH
          // DRAW 
          drawArrow(canvas, data);
          drawStage(canvas, data);

          function drawArrow(canvas, data) {
            _.forEach(data, function (cStageDatum) {
              if (cStageDatum && cStageDatum.cue) {
                // get all the cues of this stage
                var cueList = _.split(cStageDatum.cue, '/');

                var cueStageDatum;
                _.forEach(cueList, function (cueStage) {
                  cueStageDatum = _.find(data, { 'stage': _.trim(cueStage) });
                  canvas
                    .append('line')
                    .attr("x1", function () { return LEFT_X + cStageDatum.x * X_OFFSET + RECT_WIDTH / 2 })
                    .attr("y1", function () { return INI_Y + cStageDatum.y * Y_OFFSET + RECT_HEIGHT / 2 })
                    .attr("x2", function () { return LEFT_X + cueStageDatum.x * X_OFFSET + RECT_WIDTH / 2 })
                    .attr("y2", function () { return INI_Y + cueStageDatum.y * Y_OFFSET + RECT_HEIGHT / 2 })
                    .style("stroke-dasharray", ("6, 6"))
                    .attr('stroke', function () { return getLineColor(cStageDatum); })
                    .attr('stroke-width', '2px')
                    .attr("id", function () {
                      return cueStageDatum.stage ? (cStageDatum.stage + '_' + cueStageDatum.stage
                      ) : ('line_' + cStageDatum.stage)
                    })
                    .attr('opacity', function () { return getLineOpacity(cStageDatum.state, cueStageDatum.state) })
                });
              }
            });
          }

          function drawStage(canvas, data) {
            canvas
              .selectAll('rect')
              .data(data)
              .enter()
              .append('rect')
              .attr('x', function (d) { return LEFT_X + d.x * X_OFFSET })
              .attr('y', function (d) { return INI_Y + d.y * Y_OFFSET })
              .attr('width', RECT_WIDTH)
              .attr('height', RECT_HEIGHT)
              .attr('fill', function (d) { return getRectFillColor(d.state); })
              .attr('stroke', function (d) { return getLineColor(d.state) })
              .attr('stroke-width', '2px')
              .attr('opacity', function (d) { return getStageOpacity(d.state); })
              .attr('id', function (d) { return 'rect_' + d.stage })
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
              .attr('fill', function (d) { return getTextColor(d.state) })
              .attr('id', function (d) { return d.stage })
              .attr('opacity', function (d) { return getStageOpacity(d.state); })
          }


        });
      })

      // used as unit for time delay
      var INTERVAL = 1000;
      function updateMapStage(stage, delay) {
        var sname = stage.stage;
        var state;
        if (_.indexOf(sname) === 'path') {
          state = 'path';  // speical 
        } else {
          state = stage.state;
        }

        d3Service.d3().then(function (d3) {
          // update rect
          d3.select('#rect_' + sname)
            .transition()
            .delay(delay * INTERVAL)
            .duration(INTERVAL)
            .attr('fill', function () { return getRectFillColor(state) })
            .attr('stroke', function () { return getLineColor(state) })
            .attr('opacity', function () { return getStageOpacity(state) })

          // update text
          d3.select('#' + sname)
            .transition()
            .delay(delay * INTERVAL)
            .duration(INTERVAL)
            .attr('fill', function () { return getTextColor(state) })
            .attr('opacity', function () { return getStageOpacity(state) })
        })
      }


      // Update lines
      function updateMapLine(p, c, fss, pcstages) {
        var pstage = p.stage;
        var cstage = c.stage;
        var ps = p.state;
        var cs = c.state;
        var fs, fstage;

        d3Service.d3().then(function (d3) {
          if (fss) {
            _.forEach(fss, function (f) {
              fstage = f.stage;
              fs = f.state;

              // update lines linking pstage and cstage -> turn solid and change color
              d3.select('#' + pstage + '_' + cstage)
                .transition()
                .delay(INTERVAL)
                .duration(INTERVAL)
                .style("stroke-dasharray", ("0, 0"))
                .attr('opacity', function () { return getLineOpacity(ps, cs) })
                .attr('stroke', function () { return getLineColor(ps) })

              // update lines linking cstage and fstage -> black dotted-line
              d3.select('#' + cstage + '_' + fstage)
                .transition()
                .delay(INTERVAL * 2)
                .duration(INTERVAL)
                .style("stroke-dasharray", ("6, 6"))
                .attr('opacity', function () { return getLineOpacity(cs, fs) })
                .attr('stroke', function () { return getLineColor(cs) })
            })
          }
          else {  // if there is no fs i.e. reach the summit - need test? 
            d3.select('#line_' + ps)
              .transition()
              .delay(INTERVAL)
              .duration(INTERVAL)
              .attr('opacity', function () { return getLineOpacity(ps, cs) })
              .attr('stroke', function () { return getLineColor(ps) })
          }

          // past cues stage 
          _.forEach(pcstages, function (pcstage) {
            // the line linking pstage and missed stage -> disappear
            d3.select('#' + pstage + '_' + pcstage)
              .transition()
              .delay(INTERVAL * 1)
              .duration(INTERVAL)
              .attr('opacity', function () { return getLineOpacity(ps, pcstage) })
          })
        });
      }

      function getLineOpacity(pstate, cstate) {
        if ((pstate === 'rev_succ' && cstate === 'active') || (pstate === 'rev_fail' && cstate === 'active') || (pstate === 'active' && cstate === 'revealed')) {
          return 1;
        } else {
          return 0; // should be 0
        }
      }

      function getRectFillColor(state) { // check if its a path or a stage 
        if (state === 'path') {
          return '#C5C9FF';  // blue
        } else if (state === 'active') {
          return 'black';
        } else {
          return 'white';
        }
      }

      function getTextColor(state) {
        if (state === 'rev_succ') {
          return 'green';
        } else if (state === 'rev_fail') {
          return 'red';
        }
        else if (state === 'active') {
          return 'white';
        } else {
          return 'black';
        }
      }

      function getLineColor(state) {
        if (state === 'rev_succ') {
          return 'green';
        } else if (state === 'rev_fail') {
          return 'red';
        }
        else {
          return 'black';
        }
      }

      function getStageOpacity(state) {
        if (state === 'missed') {
          return 0.2;
        } else if (state === 'hidden') {
          return 0;
        } else {
          return 1;
        }
      }

    }
  }
}])

