
// var _ = require('lodash/core');
'use strict'
var map = angular.module('MuziVisual.map', ['ngRoute', 'MuziVisual.visualmapbuilder']);
// used as unit for time delay
var INTERVAL = 500;
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

map.directive('d3Map', ['d3Service', '$http', '$window', '$timeout', 'socket', '$location', 'visualMapBuilder', '$compile', function (d3Service, $http, $window, $timeout, socket, $location, visualMapBuilder, $compile) {
  return {
    restrict: 'EA',
    scope: false,
    link: function (scope, element, attr) {
      MAP_WIDTH = $window.innerWidth;
      MAP_HEIGHT = MAP_WIDTH * 1.5; // the original img is 640*960

      console.log("WINDOW: width: " + MAP_WIDTH + "  height: " + MAP_HEIGHT);
      angular.element(document).find('d3-map').append('<svg width=' + MAP_WIDTH + ' height=' + MAP_HEIGHT + ' id="map-container"></svg>')
    }
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
  $scope.alert = true;
  $scope.alertMsg = 'The challenge was performed successfully'
  $scope.prePerf = true;
  $scope.showLeftArrow = true;

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

  var performanceid = $location.search()['p']

  if (performanceid) {
    socket.emit('client', performanceid);
  } else {
    console.log('no performance id!');
    alert('Sorry, this URL is wrong! (there is no performance specified)');
    return;
  }

  socket.on('vEvent', function (data) {
    console.log('get content: ' + data)
    $scope.alert = true;
    $scope.alertMsg = data.data;

    d3Service.d3().then(function (d3) {
      d3.select('.alert')
        .transition()
        .duration(1000)
        .style('opacity', '1')
        .style('z-index', 100)

      $timeout(function () {
        d3.select('.alert')
          .transition()
          .duration(1000)
          .style('opacity', '0')
          .style('z-index', 0)
      }, 2000)
    })

    if (data.vibration && data.time) {
      $window.navigator.vibrate(data.time);
    }
    //visualMapBuilder.openToolTip($scope.cstage, data);
  })


  socket.on('vStart', function () {
    $scope.prePerf = false;

    // for perf->menu->perf
    if (visualMapBuilder.getMapData() && visualMapBuilder.getNarrativeData && !$scope.mapLoaded) {

      console.log('inside the vStart');
      initMap();
      $scope.mapLoaded = true;
    }
  })

  $scope.getLastPerf = function () {
    if ($scope.mapIconColor == '#1D8DEE') {
      $scope.mapIconColor = 'white'
      $scope.preview();
    }
    loadPastPerf(++$scope.pastCounter);
  }

  $scope.getNextPerf = function () {
    loadPastPerf(--$scope.pastCounter)
  }

  $scope.preview = function () {
    d3Service.d3().then(function (d3) {
      d3.selectAll('line').each(
        function (d) {
          getOpacity(this)
        }
      )

      d3.selectAll('circle').each(
        function (d) {
          getOpacity(this)
        }
      )
    })

    function getOpacity(d) {
      var op;
      op = d3.select(d).attr('opacity');
      if (op == 0) {
        $scope.mapIconColor = '#1D8DEE'
        d3.select(d).attr('opacity', 0.5);
      } else if (op == 0.5) {
        $scope.mapIconColor = 'white'
        d3.select(d).attr('opacity', 0);
      }
    }
  }

  function loadPastPerf(index) {
    if (!$scope.pastPerfs) {
      visualMapBuilder.pastPerfConfig().then(function (data) {
        console.log(data)
        $scope.pastPerfs = data;
        getPastPerfInfo(index);
        return;
      })
    } else {
      getPastPerfInfo(index);
    }
  }

  function getPastPerfInfo(index) {
    if (index) {
      var msgs;
      var pperf = $scope.pastPerfs[index - 1];
      $scope.mapTitle = pperf.title;
      $scope.performer = pperf.performer;
      $scope.location = pperf.location;
      msgs = pperf.value;
    } else {
      $scope.mapTitle = 'Climb!'; // config file later
      $scope.location = 'Earth';
      $scope.performer = 'Maria';
    }

    $scope.journey = visualMapBuilder.getPastMap(msgs, $scope.pastCounter)

    if ($scope.pastCounter === $scope.pastPerfs.length) {
      $scope.showLeftArrow = false;
      return;
    } else {
      $scope.showLeftArrow = true;
    }
  }

  angular.element($window).bind('orientationchange', function () {
    console.log('orientation changed')
    $window.location.reload(true);
    $route.reload();
  })


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


  $scope.goToMenu = function () {

    //$state.go('/', $state.params, { reload: true });
    $window.location.href = "http://localhost:8000/#!/?p=" + performanceid;
    // $window.location.reload(true);
  }

  //  $scope.mapData = visualMapBuilder.getMapData();


  function initMap() {
    console.log("initmap")
    d3Service.d3().then(function (d3) {
      d3.select('#visualImg').style('width', '100%')
        .style('max-height', MAP_HEIGHT + 'px')
      d3.select('#bg-img').style('width', '100%')
        .style('max-height', MAP_HEIGHT + 'px')
      var canvas = d3.select('#map-container');

      console.log('inside initMap: get map data', canvas, visualMapBuilder.getMapData())
      visualMapBuilder.initMap(canvas, visualMapBuilder.getMapData(), 'perf').then(function () {
        if (!$scope.cstage && !$scope.prePerf) {
          $scope.cstage = 'basecamp'
        } else {
          $scope.$watch('prePerf', function (n, o) {
            if (!n) {
              $scope.cstage = 'basecamp'
            }
          })
        }
      })

      if (!$scope.cstage && !$scope.prePerf) {
        $scope.cstage = 'basecamp'
      }

      //  console.log($scope.cstage, visualMapBuilder.getPrePerf())

    });
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
      //visualMapBuilder.openToolTip($scope.cstage, 'this is a pop up');

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
  }

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


map.controller('postPerformanceCtrl', ['$scope', 'visualMapBuilder', 'd3Service', 'mpmLoguse', function ($scope, visualMapBuilder, d3Service, mpmLoguse) {
  mpmLoguse.view('/post-performance', {});
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
