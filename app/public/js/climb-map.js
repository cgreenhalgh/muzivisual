
// var _ = require('lodash/core');
'use strict'
var map = angular.module('MuziVisual.map', ['ngRoute', 'MuziVisual.visualmapbuilder']);
// used as unit for time delay
var INTERVAL = 500;
var MAP_WIDTH, MAP_HEIGHT;
var delaybase = 1;

var ANI_DURATION = 8;


map.config(['$routeProvider', function ($routeProvider) {
  $routeProvider
    .when('/performance/', {
      templateUrl: 'map.html',
      controller: 'mapCtrl',
    })
    .when('/performance/past/', {
      templateUrl: 'pastMap.html',
      controller: 'pastPerfCtrl'
    })
    // .when('/post-performance', {
    //   templateUrl: 'map.html',
    //   controller: 'postPerformanceCtrl'
    // })
    .otherwise({
      redirectTo: '/',
    });


  // $locationProvider.html5Mode({
  //   enabled: true,
  //   requireBase: false
  // });
}])

map.directive('d3Map', ['d3Service', '$http', '$window', '$timeout', 'socket', '$location', 'visualMapBuilder', '$compile', function (d3Service, $http, $window, $timeout, socket, $location, visualMapBuilder, $compile) {
  return {
    restrict: 'EA',
    scope: false,
    link: function (scope, element, attr) {
      MAP_WIDTH = $window.innerWidth;
      MAP_HEIGHT = MAP_WIDTH * 1.5; // the original img is 640*960

      visualMapBuilder.setMapSize(MAP_WIDTH, MAP_HEIGHT);

      console.log("WINDOW: width: " + MAP_WIDTH + "  height: " + MAP_HEIGHT);
      angular.element(document).find('d3-map').append('<svg width=' + MAP_WIDTH + ' height=' + MAP_HEIGHT + ' id="map-container"></svg>')
    }
  }
}])

map.controller('pastPerfCtrl', ['$scope', 'socket', 'd3Service', '$location', 'visualMapBuilder', function ($scope, socket, d3Service, $location, visualMapBuilder) {
  console.log('pastPerfCtrl');

  var getPassedRecord = [];

  var index = parseInt($location.search()['i']);
  var pid = $location.search()['p']

  console.log('pid:', pid)

  socket.emit('client', pid);

  socket.on('vStart', function (data) {
    console.log('get start in pastperf:', _.split(data, ':')[1])
    getPassedRecord.push(_.split(data, ':')[1]);
  })

  socket.on('vStageChange', function (data) {
    var sc = _.split(data, ':');
    var sts = _.split(sc, '->')
     console.log('get start in pastperf:', sts[1])
    getPassedRecord.push(sts[1]);
  })

  socket.on('vStop', function (data) {
    var sc = _.split(data, ':');
    var sts = _.split(sc, '->')
    getPassedRecord.push(sts[1]);
  })

  if (!visualMapBuilder.getPassedRecord().length) {
    $scope.prePerf = true;
  } else {
    $scope.prePerf = false;
  }



  $scope.pastCounter = index;
  console.log('index', index);

  $scope.mapData = visualMapBuilder.getMapData();
  $scope.narrativeData = visualMapBuilder.getNarrativeData();
  $scope.pperfData = visualMapBuilder.getPPerfData();

  // if ($scope.mapData || $scope.narrativeData || $scope.pperfData) {
  //   $location.path('/').search({ 'p': visualMapBuilder.getPerfId() });
  // }

  $scope.showLeftArrow = true;
  $scope.existPmap = true;

  if (!($scope.mapData && $scope.narrativeData)) {
    visualMapBuilder.loadData().then(function () {

      $scope.mapData = visualMapBuilder.getMapData();
      $scope.narrativeData = visualMapBuilder.getNarrativeData();
      $scope.pperfData = visualMapBuilder.getPPerfData();

      if (index == 100) {
        $scope.preview = true;
        visualMapBuilder.initMap().then(function () {
          visualMapBuilder.drawPreviewMap()
          drawCurrentMap();
          return;
        })
        //return;
      } else {
        if ($scope.pperfData) {
          if ((index > $scope.pperfData.length || index < -1) && index != 100) {
            alert('This past performance does not exist!')
            $location.path('/').search({ 'p': visualMapBuilder.getPerfId() });
            return;
          }

          $scope.existPmap = true;
          visualMapBuilder.initMap().then(function () {
            drawPastMap();
            drawCurrentMap();
          })
        }
      }
    })
  } else {

    if (index == 100) {
      $scope.preview = true;
      console.log("im in 100 part")
      visualMapBuilder.initMap().then(function () {
        visualMapBuilder.drawPreviewMap()
        drawCurrentMap();
        return;
      })
    } else {
      visualMapBuilder.initMap().then(function () {
        drawPastMap();
        drawCurrentMap();
      })
    }
  }

  function drawPastMap() {
    if (index && index != 100) {
      var msgs;
      var pperf = visualMapBuilder.getPastPerf(index)

      $scope.mapTitle = pperf.title;
      $scope.performer = pperf.performer;
      $scope.location = pperf.location;
      msgs = pperf.value;
    } else {
      $scope.mapTitle = 'Climb!'; // config file later
      $scope.location = 'Earth';
      $scope.performer = 'Maria';
    }

    if (index == $scope.pperfData.length) {
      $scope.showLeftArrow = false;
    } else {
      $scope.showLeftArrow = true;
    }
    $scope.journey = visualMapBuilder.drawPastMap(msgs, index)
    console.log('pjourney', $scope.journey)
    console.log($scope.prePerf, $scope.pastCounter)
  }


  function drawCurrentMap() {
      visualMapBuilder.drawCurrentMap(getPassedRecord);  
  }

  $scope.getLastPerf = function () {
    if (index == 100) {
      $location.path('/performance/').search({ 'p': pid });
    } else {
      $location.path('/performance/past/').search({
        'i': ++index
        , 'p': pid
      });
    }
  }

  $scope.getNextPerf = function () {
    if (index == 1 || index == 100) {
      console.log("get next in pastCtrl")
      $location.path('/performance/').search({ 'p': pid });
    } else {
      $location.path('/performance/past/').search({
        'i': --index, 'p': pid
      });
    }
  }

  // var narrativeData = _.find($scope.narrativeData, { "stageChange": stageChange });

  var plength = visualMapBuilder.getPassedRecord().length
  $scope.cstage = visualMapBuilder.getPassedRecord()[plength - 1]

  var stageData = _.find($scope.mapData, { 'stage': $scope.cstage });

  if (stageData) {
    $scope.title = stageData.name;
  }
  // $scope.narrative = narrativeData ? narrativeData.narrative : '';


}])


map.controller('mapCtrl', ['$scope', '$http', 'socket', 'd3Service', '$timeout', '$window', 'visualMapBuilder', '$location', '$route', 'mpmLoguse', function ($scope, $http, socket, d3Service, $timeout, $window, visualMapBuilder, $location, $route, mpmLoguse) {
  console.log('mapCtrl')
  mpmLoguse.view('/performance/', {});

  // $scope.mapIndicator = 'Past Performance'
  $scope.cstage = '';
  $scope.pstage = '';
  $scope.narrative = '';
  $scope.title = '';
  $scope.stop = false;
  $scope.mapLoaded = false;
  $scope.narrativeLoaded = false;
  $scope.history = false;
  $scope.popWindow = true;

  $scope.mapTitle = "Climb!"
  $scope.location = "London"
  $scope.performer = 'Maria'
  $scope.pastPerfs = '';
  $scope.pastCounter = 0;
  $scope.alertMsg = 'The challenge was performed successfully'
  $scope.prePerf = true;
  $scope.showLeftArrow = true;
  $scope.existPmap = false;

  if (visualMapBuilder.getPPerfData()) {
    $scope.existPmap = true;
  }

  // d3Service.d3().then(function (d3) {
  //   d3.select('.alert')
  //     .transition()
  //     .duration(1000)
  //     .style('opacity', '1')
  //     .style('z-index', 100)

  //   $timeout(function () {
  //     d3.select('.alert')
  //       .transition()
  //       .duration(1000)
  //       .style('opacity', '0')
  //       .style('z-index', 0)
  //   }, 2000)
  // })

  var performanceid = $location.search()['p'];

  visualMapBuilder.setPerfId(performanceid);

  if (performanceid) {
    socket.emit('client', performanceid);
  } else {
    console.log('no performance id!');
    alert('Sorry, this URL is wrong! (there is no performance specified)');
    return;
  }

  $scope.mapData = visualMapBuilder.getMapData();
  $scope.narrativeData = visualMapBuilder.getNarrativeData();

  if (!($scope.mapData && $scope.narrativeData)) {
    visualMapBuilder.loadData().then(function () {
      if (visualMapBuilder.getPPerfData()) {
        $scope.existPmap = true;
      }
      visualMapBuilder.initMap()
    })
  } else {
    visualMapBuilder.initMap()

    if (!$scope.cstage && !$scope.prePerf) {
      $scope.cstage = 'basecamp'
    } else {
      $scope.$watch('prePerf', function (n, o) {
        if (!n) {
          $scope.cstage = 'basecamp'
        }
      })
    }
  }

  if ($scope.prePerf && $scope.mapData) {
    visualMapBuilder.initMap();
  }


  socket.on('vEvent', function (data) {
    // format: perfid:msg:time:bool
    console.log('get content: ' + data)
    var splitedData = _.split(data, ':');
    $scope.alertMsg = splitedData[1];
    var alertTime = parseInt(splitedData[2]) * 1000;
    var vib = splitedData[3];

    d3Service.d3().then(function (d3) {
      d3.select('.alert')
        .transition()
        .duration(500)
        .style('opacity', '1')
        .style('z-index', 100)

      $timeout(function () {
        d3.select('.alert')
          .transition()
          .duration(500)
          .style('opacity', '0')
          .style('z-index', 0)
      }, alertTime)
    })

    if (vib) {
      $window.navigator.vibrate(1000);
    }
    //visualMapBuilder.openToolTip($scope.cstage, data);
  })


  socket.on('vStart', function () {
    $scope.prePerf = false;


    if (!($scope.mapData && $scope.narrativeData)) {
      visualMapBuilder.loadData().then(function () {
        if (visualMapBuilder.getPPerfData()) {
          $scope.existPmap = true;
        }
        visualMapBuilder.initMap()
        $scope.cstage = 'basecamp'
      })
    } else {
      visualMapBuilder.initMap()
      $scope.cstage = 'basecamp'
    }

    // for perf->menu->perf
    // if (visualMapBuilder.getMapData() && visualMapBuilder.getNarrativeData && !$scope.mapLoaded) {
    //   initMap();
    // }
  })


  $scope.getLastPerf = function () {
    var path = $location.path();
    $location.path('/performance/past/').search({
      'i': ++$scope.pastCounter,
      'p': performanceid
    });
    return;
  }

  $scope.preview = function () {

    $location.path('/performance/past/').search({
      'i': 100,
      'p': performanceid
    });
    return;
  }



  angular.element($window).bind('orientationchange', function () {
    console.log('orientation changed')
    $window.location.reload(true);
    $route.reload();
  })


  $scope.goToMenu = function () {
    $window.location.href = "http://localhost:8000/#!/?p=" + performanceid;
  }

  socket.on('vStageChange', function (data) {
    console.log("visual-front receive: " + data);
    var da = data.split(':');

    var stageChange = da[1];

    var stages = stageChange.split('->');
    $scope.pstage = stages[0];
    $scope.cstage = stages[1];

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
    visualMapBuilder.setStop(true);
    $scope.stop = true;

    var stop_flag = visualMapBuilder.getStop()
    console.log('stop flag: ', stop_flag)

    $scope.journey = visualMapBuilder.getJourney();
  });
  //}

  $scope.$watch('cstage', function (ns, os) {
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
            console.log("load map: " + JSON.stringify(data));
            visualMapBuilder.setMapData(data);
            $scope.mapData = data;
          });
        }

        if (!visualMapBuilder.getStop()) {
          console.log('performMode on');
          $scope.showLeftArrow = true;
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
}])
