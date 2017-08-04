
// var _ = require('lodash/core');
'use strict'
var map = angular.module('MuziVisual.map', ['ngRoute', 'MuziVisual.visualmapbuilder']);
// used as unit for time delay
var INTERVAL = 250;
var MAP_WIDTH, MAP_HEIGHT;
var delaybase = 0.5;

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
      angular.element(document).find('d3-map').append('<svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 '+MAP_WIDTH+' '+MAP_HEIGHT+'" id="map-container"></svg>')
    }
  }
}])

map.controller('pastPerfCtrl', ['$scope', 'socket', 'd3Service', '$location', 'visualMapBuilder', '$window', function ($scope, socket, d3Service, $location, visualMapBuilder, $window) {
  console.log('pastPerfCtrl');

  $scope.cpassedRecord = [];

  socket.on('vStart', function (data) {
    console.log('pastPerf '+$location.search()['i']+' vStart');
    visualMapBuilder.setPerfStatus(true);
    $scope.performing = true;
    var d = _.split(data, ':')[1];
    if (!_.includes($scope.cpassedRecord, d)) {
      $scope.cpassedRecord.push(d);
    }
  })

  $scope.$watch('cpassedRecord.length', function (n, o) {
    drawCurrentMap();
  })

  socket.on('vStageChange', function (data) {
    var sc = _.split(data, ':');
    var sts = _.split(sc, '->')

    if (!_.includes($scope.cpassedRecord, sts[1])) {
      $scope.cpassedRecord.push(sts[1]);
    }
  })

  socket.on('vStop', function (data) {
    $scope.performing = false;
    visualMapBuilder.setPerfStatus(false);
  })

  var index = parseInt($location.search()['i']);
  var performanceid = $location.search()['p']

  console.log('current passed:', $scope.cpassedRecord)

  $scope.goToMenu = function () {
    $location.path('/');
  }

  if (index == 100) {
    $scope.mapTitle = 'Climb!';
    $scope.performer = "Maria Kallionpää";
    $scope.location = 'London'
  }

  $scope.previewBack = function () {
    if (index == 100) {
      $location.path('/performance/').search({
        'p': performanceid
      });
    }
  }

  if (!visualMapBuilder.getPassedRecord().length) {
    $scope.prePerf = true;
  } else {
    $scope.prePerf = false;
  }

  $scope.pastCounter = index;
  console.log('index', index);

  $scope.showLeftArrow = true;
  $scope.existPmap = true;

  visualMapBuilder.loadData().then(function () {

      $scope.mapData = visualMapBuilder.getMapData();
      $scope.narrativeData = visualMapBuilder.getNarrativeData();
      $scope.pperfData = visualMapBuilder.getPPerfData();

      if (index == 100) {
        $scope.preview = true;
        visualMapBuilder.initMap(true).then(function () {
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
          visualMapBuilder.initMap(true).then(function () {
            drawPastMap();
            drawCurrentMap();
          })
        }
      }
  })


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
    visualMapBuilder.drawCurrentMap($scope.cpassedRecord);

    if ($scope.cpassedRecord.length && $scope.narrativeData) {
      var plen = $scope.cpassedRecord.length;
      var cstage = $scope.cpassedRecord[plen - 1];
      var stageChange = $scope.cpassedRecord[plen - 2] + '->' + $scope.cpassedRecord[plen - 1];

      var narrativeData = _.find($scope.narrativeData, { "stageChange": stageChange });

      if ($scope.mapData) {
        var stageData = _.find($scope.mapData, { 'stage': cstage });
        $scope.title = stageData.name;
        $scope.narrative = narrativeData ? narrativeData.narrative : '';
      }
    }
  }

  $scope.getLastPerf = function () {
    if (index == 100) {
      $location.path('/performance/').search({ 'p': performanceid });
    } else {
      $location.path('/performance/past/').search({
        'i': ++index
        , 'p': performanceid
      });
    }
  }

  $scope.getNextPerf = function () {
    if (index == 1 || index == 100) {
      console.log("get next in pastCtrl")
      $location.path('/performance/').search({ 'p': performanceid });
    } else {
      $location.path('/performance/past/').search({
        'i': --index, 'p': performanceid
      });
    }
  }


  var plength = visualMapBuilder.getPassedRecord().length
  $scope.cstage = visualMapBuilder.getPassedRecord()[plength - 1]

  var stageData = _.find($scope.mapData, { 'stage': $scope.cstage });

  if (stageData) {
    $scope.title = stageData.name;
  }
}])


map.controller('mapCtrl', ['$scope', '$http', 'socket', 'd3Service', '$timeout', '$window', 'visualMapBuilder', '$location', '$route', 'mpmLoguse', function ($scope, $http, socket, d3Service, $timeout, $window, visualMapBuilder, $location, $route, mpmLoguse) {
  console.log('mapCtrl')
  mpmLoguse.view('/performance/', {});

  // $scope.mapIndicator = 'Past Performance'
  $scope.cstage = '';
  $scope.pstage = '';
  $scope.narrative = '';
  $scope.title = '';
  $scope.mapLoaded = false;
  $scope.narrativeLoaded = false;
  $scope.history = false;
  $scope.popWindow = true;

  $scope.mapTitle = "This Performance"
  $scope.location = "London"
  $scope.performer = 'Maria Kallionpää'
  $scope.pastPerfs = '';
  $scope.alertMsg = 'The challenge was performed successfully'
  $scope.prePerf = true;
  $scope.showLeftArrow = true;
  $scope.existPmap = false;
  $scope.inited = false;
  
  visualMapBuilder.loadData().then(init);

  function init() {
    if (!$scope.inited) {
        console.log('init!');
        $scope.inited = true;
        $scope.mapData = visualMapBuilder.getMapData();
        $scope.narrativeData = visualMapBuilder.getNarrativeData();
        if (visualMapBuilder.getPPerfData()) {
          $scope.existPmap = true;
        }
        visualMapBuilder.initMap(false);
     
    }
  }
//  if (!$scope.cstage && !$scope.prePerf) {
//    $scope.cstage = 'basecamp'
//  } else {
//    $scope.$watch('prePerf', function (n, o) {
//      if (!n) {
//        $scope.cstage = 'basecamp'
//      }
//    })
//  }
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

$scope.alertTimeout = null;
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
        .duration($scope.alertTimeout ? 100 : 0)
        .style('opacity', '0')
        .transition()
        .duration($scope.alertTimeout ? 200 : 500)
        .style('opacity', '1')
        .style('z-index', 100)

      if ($scope.alertTimeout)
        $timeout.cancel($scope.alertTimeout);
      $scope.alertTimeout = $timeout(function () {
        $scope.alertTimeout = null;
        d3.select('.alert')
          .transition()
          .duration(500)
          .style('opacity', '0')
          .style('z-index', 0)
      }, alertTime)
    })

    if (vib) {
        $window.navigator.vibrate([200,200,200,200,200]);
    }
  })


  socket.on('vStart', function () {
    console.log('mapCtrl vStart');
    $scope.performing = true;
    $scope.prePerf = false;
    $scope.cstage = 'basecamp'
  })


  $scope.getLastPerf = function () {
    var path = $location.path();
    $location.path('/performance/past/').search({
      'i': 1,
      'p': performanceid
    });
  }

  $scope.preview = function () {
    $location.path('/performance/past/').search({
      'i': 100,  // special for preview
      'p': performanceid
    });
  }



  angular.element($window).bind('orientationchange', function () {
    console.log('orientation changed')
    $window.location.reload(true);
    $route.reload();
  })


  $scope.goToMenu = function () {
	$location.path('/');
  }

  socket.on('vStageChange', function (data) {
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
    visualMapBuilder.updateMap('summit', 'summit');
    $scope.performing = false;
    $scope.journey = visualMapBuilder.getJourney();
  });

  $scope.$watch('cstage', function (ns, os) {
    console.log('stage change: ' + os + '->' + ns);

    if ($scope.cstage) {
      visualMapBuilder.loadData().then(function() {
        init();
        visualMapBuilder.updateMap($scope.cstage, $scope.pstage);

        if ($scope.performing) {
          console.log('performMode on');
          $scope.showLeftArrow = true;
          var stageChange = '';

          if ($scope.pstage) {
            stageChange = $scope.pstage + '->' + $scope.cstage;
          } else {
            stageChange = '->' + $scope.cstage;
          }

          visualMapBuilder.startPerformMode($scope.cstage, $scope.pstage);
          var narrativeData = _.find($scope.narrativeData, { "stageChange": stageChange });

          var stageData = _.find($scope.mapData, { 'stage': $scope.cstage });
          $scope.title = stageData.name;
          $scope.narrative = narrativeData ? narrativeData.narrative : '';

          d3Service.d3().then(function (d3) {
            d3.select('#narrative-title')
              .style('opacity', '0')
              .transition()
              .duration(INTERVAL)
              .style('opacity', '1')

            d3.select('#narrative')
              .style('opacity', '0')
              .transition()
              .duration(INTERVAL)
              .style('opacity', '1')
          });
        }
      });
    }
  });

  function recordStageChange(stage, delay) {
    changedStages.push({
      'stage': stage,
      'delay': delay
    })
  }
}])
