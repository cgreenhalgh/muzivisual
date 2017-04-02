// var _ = require('lodash/core');
'use strict'



var map = angular.module('MuziVisual.map', ['ngRoute', 'MuziVisual.visualmapbuilder']);
// used as unit for time delay
var INTERVAL = 1000;
var MAP_WIDTH, MAP_HEIGHT;
var delaybase = 1;

var ALL_MODE = true;
var ANI_DURATION = 5; // 8/5 allmode ;


map.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
  $routeProvider.when('/', {
    templateUrl: 'menu.html',
    controller: 'menuCtrl'
  }).when('/map', {
    templateUrl: '/map.html',
    controller: 'mapCtrl'
  }).when('/preview', {
    templateUrl: '/map.html',
    controller: 'previewCtrl'
  }).when('/cus-map', {
    templateUrl: '/map.html',
    controller: 'cusMapCtrl'
  }).
    otherwise({
      redirectTo: '/'
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
      MAP_HEIGHT = $window.innerHeight;

      console.log("WINDOW: width: " + MAP_WIDTH + "  height: " + MAP_HEIGHT);
      angular.element(document).find('d3-map').append('<svg width=' + MAP_WIDTH + ' height=' + MAP_HEIGHT + ' id=map-container></svg>')

      scope.pstage = null;
      scope.cstage = null;

      scope.mapData = null;
      scope.performing = false;
      scope.mapRecord = null;

      scope.back = function () {
        $location.url('/');
      }

    }
  }
}])

map.controller('mapCtrl', ['$scope', '$http', 'socket', 'd3Service', '$timeout', '$window', 'visualMapBuilder', '$location', function ($scope, $http, socket, d3Service, $timeout, $window, visualMapBuilder, $location) {

  $scope.cstage = ''
  $scope.pstage = ''
  var visualIdx = 0;
  var visuals = '';
  var visualNum = 0;

  $scope.flip = function () {
    if (visualIdx === visualNum) {
      visualIdx = 0;
    }
    if (!visuals) {
      visuals = visualMapBuilder.getVisual($scope.cstage);
      console.log('get visual' + visuals);
      visualNum = visuals.length;
    }

    if (visualNum > 1) {
      d3Service.d3().then(function () {
        console.log('flip visual');

        d3.select('#visualImg')
          .transition()
          .duration(1000)
          .style('opacity', 0)

        setTimeout(function () {
          d3.select('#visualImg')
            .attr('src', visuals[visualIdx])
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .style('opacity', 1)
          visualIdx++;
        }, 1000)
      })
    }
  }
  // when data is updated
  // ps - previous stage, the passed one
  // cs - current stage, the triggered one
  // fs - future stage, the stages cued next
  var countDown = ANI_DURATION;
  var stop;

  $scope.stop = function () {
    console.log('stop')
    visualMapBuilder.recordMap();
    clearInterval($scope.timerId);

    d3Service.d3().then(function (d3) {
      d3.selectAll('circle').transition().duration(0);
      d3.selectAll('img').transition().duration(0);
      d3.selectAll('line').transition().duration(0);
      //d3.selectAll('text').transition().duration(0);
      d3.select('#visualImg').transition().duration(0);
      //d3.select('#' + $scope.cstage).transition().duration(0);
      d3.select('#circle_' + $scope.cstage).transition().duration(0);
      socket.emit('vTimer', 'stop');
      visualMapBuilder.setStop();
    })
  }

  $scope.openCusMap = function () {
    $scope.stop();
    visualMapBuilder.recordMap();
    d3Service.d3().then(function (d3) {
      d3.select('#map-container').remove();
      $location.url('/cus-map');
    })
  }

  $scope.mapData = visualMapBuilder.getMapData();
  if (!$scope.mapData) {
    visualMapBuilder.mapConfig().then(function (data) {
      console.log("LOAD MAP: " + JSON.stringify(data));
      visualMapBuilder.setMapData(data);
      $scope.mapData = data;
      initMap();
    });
  } else {
    initMap();
  }

  function initMap() {
    d3Service.d3().then(function (d3) {
      d3.select('#visualImg').style('width', '100%')
        .style('max-height', MAP_HEIGHT + 'px')
      d3.select('#bg-img').style('width', '100%')
        .style('max-height', MAP_HEIGHT + 'px')
      var canvas = d3.select('#map-container');

      if (!ALL_MODE) {
        visualMapBuilder.initMap(canvas, visualMapBuilder.getMapData());
      } else {
        visualMapBuilder.initMapAllMode(canvas, visualMapBuilder.getMapData());
      }
    });
    if (!$scope.cstage) {
      $scope.cstage = 'begin'; // reveal basecamp
    }
  }

  // format stage->stage
  socket.on('vStageChange', function (data) {
    console.log("visual-front receive: " + data);
    var stages = data.split('->')
    $scope.pstage = stages[0];
    $scope.cstage = stages[1];
  });

  socket.on('vStop', function (data) {
    visualMapBuilder.recordMap();
    socket.emit('vTimer', '');
    if ($scope.performing) {
      visualMapBuilder.exitPerformMode($scope.pstage)

    } else {
      clearInterval($scope.timerId);
      console.log('visual stopped by Muzicode');
      $scope.message = 'quitting...'
      socket.emit('vTimer', '');
    }

    setTimeout(function () {
      $location.url('/cus-map');
      $scope.$apply();
    }, 1000)
  })

  // start a timer
  $scope.timerId = $window.setInterval(function () {
    console.log(countDown);
    socket.emit('vTimer', countDown);
    countDown--;
  }, 1000);

  $scope.$watch('cstage', function (ns, os) {
    visualIdx = 0;
    visuals = '';
    visualNum = 0;

    if ($scope.performing) {
      if (delaybase === 1) {
        // allmode
        if (ALL_MODE) {
          delaybase = 0;
        } else {
          delaybase = 4;
        }
      }

      visualMapBuilder.exitPerformMode($scope.pstage).then(function (f) {
        $scope.performing = f;
        socket.emit('vTimer', 'exiting...');

        if (ALL_MODE) {
          visualMapBuilder.updateMapAllMode($scope.pstage, $scope.cstage, 2);
        }
        console.log('start timer')
        setTimeout(function () {
          $scope.timerId = setInterval(function () {
            socket.emit('vTimer', countDown);
            countDown--;
          }, 1000)
          $scope.$apply();
        }, 1000)
      });
      console.log('stage change: ' + os + '-> ' + ns);
    }

    if ($scope.cstage) {
      if (ALL_MODE) {
        visualMapBuilder.updateMapAllMode($scope.cstage, $scope.pstage, 1);
      }
      else {
        visualMapBuilder.updateMap($scope.cstage, $scope.pstage);
      }
      visualMapBuilder.startPerformMode($scope.cstage).then(function (t) {
        if (!visualMapBuilder.getStop()) {
          $scope.performing = t;
          clearInterval($scope.timerId);
          socket.emit('vTimer', 'performing...');
          countDown = ANI_DURATION;
          console.log('performMode on');
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

map.controller('previewCtrl', ['$scope', 'd3Service', 'visualMapBuilder', '$http', '$location', function ($scope, d3Service, visualMapBuilder, $http, $location) {
  console.log('Open Preview')

  $scope.cstage = ''
  $scope.pstage = ''
  $scope.preview = 1;
  $scope.mapData = visualMapBuilder.getMapData();
  if (!$scope.mapData) {
    visualMapBuilder.mapConfig().then(function (data) {
      console.log("LOAD MAP: " + JSON.stringify(data));
      visualMapBuilder.setMapData(data);
      $scope.mapData = data;
      initMap();
    })
  } else {
    initMap();
  }

  function initMap() {
    d3Service.d3().then(function (d3) {
      d3.select('#visualImg').style('width', '100%')
        .style('max-height', MAP_HEIGHT + 'px')
      var canvas = d3.select('#map-container');
      if (!ALL_MODE) {
        visualMapBuilder.initMap(canvas, visualMapBuilder.getMapData());
      } else {
        visualMapBuilder.initMapAllMode(canvas, visualMapBuilder.getMapData());
      }


      d3.selectAll('line').attr('opacity', '1').attr('stroke', 'white')
      d3.selectAll('circle').attr('opacity', '1')
      // d3.selectAll('text').attr('opacity', '1')
      d3.select('#circle_begin').attr('fill', 'white')
    });
  }
}])

map.controller('menuCtrl', ['$scope', '$location', 'socket', '$window', function ($scope, $location, socket, $window) {
  $scope.ready = false;
  $scope.start = function () {
    $location.url('/map');
  }

  // counter for audiance
  socket.on('vStart', function (data) {
    $scope.ready = true;

    $scope.counter = 3;
    var timerId = $window.setInterval(function () {
      socket.emit('vTimer', $scope.counter);
      console.log($scope.counter)
      $scope.counter--;
      $scope.$apply();
    }, 1000)

    setTimeout(function () {
      clearInterval(timerId);
      socket.emit('vTimer', 'animation start');
      $location.url('/map');
      console.log(data);
      $scope.$apply();
    }, 4000)
  });
}]);

map.controller('cusMapCtrl', ['$scope', 'visualMapBuilder', 'd3Service', function ($scope, visualMapBuilder, d3Service) {
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
    $scope.message = 'Following are the stages that you have visited today! Click and download your music scores!'
  } else {
    $scope.message = 'NO RECORD YET'
  }

  $scope.openScore = function (link) {
    $location.url(toString(link));
  }
}])