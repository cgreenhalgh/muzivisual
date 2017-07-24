
// var _ = require('lodash/core');
'use strict'
var map = angular.module('MuziVisual.map', ['ngRoute', 'MuziVisual.visualmapbuilder']);
// used as unit for time delay
var INTERVAL = 1000;
var MAP_WIDTH, MAP_HEIGHT;
var delaybase = 1;

var ANI_DURATION = 8;


map.config(['$routeProvider', function ($routeProvider) {
  $routeProvider.when('/performance/', {
    templateUrl: 'map.html',
    controller: 'mapCtrl',
  }).when('/post-performance', {
    templateUrl: 'map.html',
    controller: 'postPerformanceCtrl'
  }).
    otherwise({
      redirectTo: '/',
    });


  // $locationProvider.html5Mode({
  //   enabled: true,
  //   requireBase: false
  // });
}])

map.directive('d3Map', ['d3Service', '$http', '$window', '$timeout', 'socket', '$location', 'visualMapBuilder', function (d3Service, $http, $window, $timeout, socket, $location, visualMapBuilder) {
  return {
    restrict: 'EA',
    scope: false,
    link: function (scope, element, attr) {
      MAP_WIDTH = $window.innerWidth;
      MAP_HEIGHT = MAP_WIDTH * 1.5; // the original img is 640*960

      console.log("WINDOW: width: " + MAP_WIDTH + "  height: " + MAP_HEIGHT);
      angular.element(document).find('d3-map').append('<svg width=' + MAP_WIDTH + ' height=' + MAP_HEIGHT + ' id="map-container"></svg>')

      scope.pstage = null;
      scope.cstage = null;

      scope.mapData = null;
      scope.mapRecord = null;

      scope.back = function () {
        $location.path('/');
      }
    }
  }
}])

map.controller('mapCtrl', ['$scope', '$http', 'socket', 'd3Service', '$timeout', '$window', 'visualMapBuilder', '$location', '$route', function ($scope, $http, socket, d3Service, $timeout, $window, visualMapBuilder, $location, $route) {
  console.log('mapCtrl')
  $scope.map = true;
  $scope.cstage = '';
  $scope.pstage = '';
  $scope.narrative = '';
  $scope.title = '';
  $scope.stop = false;
  $scope.mapLoaded = false;
  $scope.narrativeLoaded = false;
  $scope.history = false;
  $scope.popWindow = true;

  var visualIdx = 0;
  var visuals = '';
  var visualNum = 0;

  socket.on('vContents', function (data) {
    console.log('get content: ' + data)
    visualMapBuilder.openToolTip($scope.cstage, data);
  })

  $scope.getHistory = function () {
    $scope.history = true;
  }

  angular.element($window).bind('orientationchange', function () {
    console.log('orientation changed')
    $window.location.reload(true);
    $route.reload();
  })

  var params = $location.search();
  console.log('params', params);
  var performanceid = params['p'] === undefined ? '' : params['p'];
  if (performanceid) {
    console.log('client for performance ' + performanceid);
    socket.emit('client', performanceid);
  } else {
    console.log('no performance id!');
    alert('Sorry, this URL is wrong! (there is no performance specified)');
  }

  $scope.narrativeData = visualMapBuilder.getNarrativeData();
  if (!$scope.narrativeData) {
    visualMapBuilder.narrativeConfig().then(function (data) {
      console.log('load narrative: ' + JSON.stringify(data));
      $scope.narrativeData = data;
      $scope.narrativeLoaded = true;
      if (!$scope.mapData) {
        visualMapBuilder.mapConfig().then(function (data) {
          console.log("LOAD MAP: " + JSON.stringify(data));
          visualMapBuilder.setMapData(data);
          $scope.mapData = data;
          initMap();
          $scope.mapLoaded = true;
        });
      }
    })
  }

  $scope.mapData = visualMapBuilder.getMapData();

  // when data is updated
  // ps - previous stage, the passed one
  // cs - current stage, the triggered one
  // fs - future stage, the stages cued next
  // var countDown = ANI_DURATION;
  // var stop;

  // $scope.stop = function () {
  //   console.log('stop')
  //   visualMapBuilder.recordMap();
  //   //clearInterval($scope.timerId);

  //   d3Service.d3().then(function (d3) {
  //     d3.selectAll('circle').transition().duration(0);
  //     d3.selectAll('img').transition().duration(0);
  //     d3.selectAll('line').transition().duration(0);
  //     //d3.selectAll('text').transition().duration(0);
  //     d3.select('#visualImg').transition().duration(0);
  //     //d3.select('#' + $scope.cstage).transition().duration(0);
  //     d3.select('#circle_' + $scope.cstage).transition().duration(0);

  //     //socket.emit('vTimer', 'stop');
  //     visualMapBuilder.setStop();
  //   })
  // }

  // $scope.openCusMap = function () {
  //   $scope.stop();
  //   visualMapBuilder.recordMap();
  //   d3Service.d3().then(function (d3) {
  //     d3.select('#map-container').remove();
  //     $location.path('/cus-map');
  //   })
  // }


  function initMap() {
    console.log("initmap")
    d3Service.d3().then(function (d3) {
      d3.select('#visualImg').style('width', '100%')
        .style('max-height', MAP_HEIGHT + 'px')
      d3.select('#bg-img').style('width', '100%')
        .style('max-height', MAP_HEIGHT + 'px')
      var canvas = d3.select('#map-container');

      visualMapBuilder.initMap(canvas, visualMapBuilder.getMapData());
    });
    if (!$scope.cstage) {
      $scope.cstage = 'basecamp'; // reveal basecamp
      visualMapBuilder.openToolTip($scope.cstage, 'this is a pop up');
    }
  }

  function mapLoaded() {
    console.log('mapLoaded - registering listeners');
    // format stage->stage
    socket.on('vStageChange', function (data) {

      console.log("visual-front receive: " + data);
      var da = data.split(':');

      var stageChange = da[1];

      var stages = stageChange.split('->');
      $scope.pstage = stages[0];
      $scope.cstage = stages[1];
      visualMapBuilder.openToolTip($scope.cstage, 'this is a pop up');

      d3Service.d3().then(function (d3) {
        d3.select('#title')
          .transition()
          .duration(INTERVAL)
          .style('opacity', '0')

        d3.select('#narrative')
          .transition()
          .duration(INTERVAL)
          .style('opacity', '0')
      });
    })

    socket.on('vStop', function () {
      visualMapBuilder.setStop();
      $scope.stop = true;

      var stop_flag = visualMapBuilder.getStop()
      console.log('stop flag: ', stop_flag)

      $scope.journey = visualMapBuilder.getJourney();
    });
  }

  // to avoid the asynchronized file loading latency
  if ($scope.mapLoaded)
    mapLoaded();
  else {
    $scope.$watch('mapLoaded', function (newvalue, oldvalue) {
      if (newvalue) {
        mapLoaded();
      }
    });
  }

  $scope.$watch('cstage', function (ns, os) {
    if (delaybase === 1) {
      delaybase = 2;
    }

    console.log('stage change: ' + os + '->' + ns);

    if ($scope.cstage) {
      visualMapBuilder.updateMap($scope.cstage, $scope.pstage);
      visualMapBuilder.startPerformMode($scope.cstage, $scope.pstage).then(function (t) {
        $scope.narrativeData = visualMapBuilder.getNarrativeData();
        if (!$scope.narrativeData) {
          visualMapBuilder.narrativeConfig().then(function (data) {
            console.log('load narrative: ' + JSON.stringify(data));
            $scope.narrativeData = data;
          })
        }

        $scope.mapData = visualMapBuilder.getMapData();
        if (!$scope.mapData) {
          visualMapBuilder.mapConfig().then(function (data) {
            console.log("LOAD MAP: " + JSON.stringify(data));
            visualMapBuilder.setMapData(data);
            $scope.mapData = data;
          });
        }

        if (!visualMapBuilder.getStop()) {
          console.log('performMode on');

          var stageChange = '';

          if ($scope.pstage) {
            stageChange = $scope.pstage + '->' + $scope.cstage;
          } else {
            stageChange = '->' + $scope.cstage;
          }

          var narrativeData = _.find($scope.narrativeData, { "stageChange": stageChange });

          var stageData = _.find($scope.mapData, { 'stage': $scope.cstage });
          $scope.title = stageData.name;
          $scope.narrative = narrativeData ? narrativeData.narrative : '';

          d3Service.d3().then(function (d3) {
            d3.select('#title')
              .transition()
              .duration(INTERVAL)
              .style('opacity', '1')

            d3.select('#narrative')
              .transition()
              .duration(INTERVAL)
              .style('opacity', '1')
          });
        }
      })
    }
  });

  function recordStageChange(stage, delay) {
    changedStages.push({
      'stage': stage,
      'delay': delay
    })
  }

  // $scope.flip = function () {
  //   if (visualIdx === visualNum) {
  //     visualIdx = 0;
  //   }
  //   if (!visuals) {
  //     visuals = visualMapBuilder.getVisual($scope.cstage);
  //     console.log('get visual' + visuals);
  //     visualNum = visuals.length;
  //   }

  //   if (visualNum > 1) {
  //     d3Service.d3().then(function () {
  //       console.log('flip visual');

  //       d3.select('#visualImg')
  //         .transition()
  //         .duration(1000)
  //         .style('opacity', 0)

  //       setTimeout(function () {
  //         d3.select('#visualImg')
  //           .attr('src', visuals[visualIdx])
  //           .style('opacity', 0)
  //           .transition()
  //           .duration(1000)
  //           .style('opacity', 1)
  //         visualIdx++;
  //       }, 1000)
  //     })
  //   }
  // }

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


map.controller('postPerformanceCtrl', ['$scope', 'visualMapBuilder', 'd3Service', function ($scope, visualMapBuilder, d3Service) {
  $scope.cstage = ''
  $scope.pstage = ''
  $scope.cusMap = 1;
  console.log('cusMap');

  var cusMapData = visualMapBuilder.getMapRecord();

  if (cusMapData) {
    d3Service.d3().then(function (d3) {
      d3.selectAll
      var canvas = d3.select('#map-container');
      visualMapBuilder.drawMap(canvas);
    })
  } else {
    $scope.message = 'NO RECORD YET'
  }

  $scope.openScore = function (link) {
    $location.url(toString(link));
  }
}])
