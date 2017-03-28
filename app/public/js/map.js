// var _ = require('lodash/core');
'use strict'

var map = angular.module('MuziVisual.map', ['ngRoute', 'MuziVisual.visualmapbuilder']);
// used as unit for time delay
var INTERVAL = 1000;
var MAP_WIDTH, MAP_HEIGHT;
var ANI_DURATION = 8;
var delaybase = 1;

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
  }).
    otherwise({
      redirectTo: '/'
    });

  // $locationProvider.html5Mode({
  //   enabled: true,
  //   requireBase: false
  // });
}])

map.directive('d3Map', ['d3Service', '$http', '$window', '$timeout', 'visualMapBuilder', 'socket', function (d3Service, $http, $window, $timeout, visualMapBuilder, socket) {
  return {
    restrict: 'EA',
    scope: false,
    compile: function (scope, element, attr) {
      MAP_WIDTH = $window.innerWidth;
      MAP_HEIGHT = $window.innerHeight;

      console.log("WINDOW: width: " + MAP_WIDTH + "  height: " + MAP_HEIGHT);
      angular.element(document).find('d3-map').append('<svg width=' + MAP_WIDTH + ' height=' + MAP_HEIGHT + ' id=map-container></svg>')

      scope.pstage = '';
      scope.cstage = '';

      scope.mapData = null;
      scope.performing = 0;
    }
  }
}])

map.controller('mapCtrl', ['$scope', '$http', 'socket', 'd3Service', '$timeout', '$window', 'visualMapBuilder', function ($scope, $http, socket, d3Service, $timeout, $window, visualMapBuilder) {

  // when data is updated
  // ps - previous stage, the passed one
  // cs - current stage, the triggered one
  // fs - future stage, the stages cued next
  var customPath = [];
  var ps = 0, cs = 0, fss = 0, fs = 0, psCues = 0, psCuesWithoutCs = 0, revealeds = [], flist = [];
  var countDown = ANI_DURATION;
  var changedStages = [];

  $http.get('/maps/').success(function (data) {
    if (!$scope.mapData) {
      $scope.mapData = visualMapBuilder.dataProcess(data);
    }
    // process data - add postion on the map and ordered
    console.log("GOT MAP: " + JSON.stringify($scope.mapData));
    // ad certain condition - i.e. called by muzi ..?

    d3Service.d3().then(function (d3) {
      d3.select('#visualImg').style('width', '100%')
        .style('max-height', MAP_HEIGHT + 'px')
      var canvas = d3.select('#map-container');
      visualMapBuilder.initMap(canvas, $scope.mapData);

      if (!$scope.cstage) {
        $scope.cstage = 'begin'; // reveal basecamp
      }
    });
  })

  // format stage->stage
  socket.on('vStageChange', function (data) {
    console.log("visual-front receive: " + data);
    var stages = data.split('->')
    $scope.pstage = stages[0];
    $scope.cstage = stages[1];
  });

  // start a timer
  $scope.timerId = $window.setInterval(function () {
    console.log(countDown);
    socket.emit('vTimer', countDown);
    countDown--;
  }, 1000);

  $scope.$watch('cstage', function (ns, os) {
    if ($scope.performing) {
      if (delaybase === 1) {
        delaybase = 4;
      }

      visualMapBuilder.exitPerformMode($scope.pstage).then(function (f) {
        $scope.performing = f;
        $socket.emit('vTimer', 'exiting...');
        console.log('start timer')
        setTimeout(function () {
          $scope.timerId = setInterval(function () {
            socket.emit('vTimer', countDown);
            countDown--;
          }, 1000)
        }, 1000)
      });
      console.log('stage change: ' + os + '-> ' + ns);
    }

    if ($scope.cstage) {
      // active new path
      cs = _.find($scope.mapData, { 'stage': $scope.cstage });
      $scope.csname = cs.name;
      cs.state = 'active';
      recordStageChange(cs, delaybase + 1);

      // turn the previous active stage into past -  succ / fail
      if ($scope.pstage) {
        ps = _.find($scope.mapData, { 'stage': $scope.pstage })
        ps.state = "rev_succ";
        customPath.push($scope.pstage)
        recordStageChange(ps, delaybase);

        // ps cue stage
        psCues = ps.cue.split('/');
        psCuesWithoutCs = _.filter(psCues, function (s) { return s !== cs.stage });

        // get missed stages
        revealeds = _.filter($scope.mapData, { 'state': 'revealed' })
        _.forEach(revealeds, function (rs) {
          if (_.isObject(rs))
            rs.state = 'missed';
          recordStageChange(rs, delaybase + 2);
        });
      }

      // reveal new stages
      fss = _.split(cs.cue, '/');
      _.forEach(fss, function (s) {
        fs = _.find($scope.mapData, { 'stage': s })
        fs.state = 'revealed';
        flist.push(fs);
        recordStageChange(fs, delaybase + 4);
      });

      // update map
      visualMapBuilder.updateChangedStages(changedStages);
      visualMapBuilder.updateMapLine(ps, cs, flist, psCuesWithoutCs, delaybase + 1);

      visualMapBuilder.startPerformMode(cs).then(function (t) {
        $scope.performing = t;
        clearInterval($scope.timerId);
        socket.emit('vTimer', 'performing...');
        countDown = ANI_DURATION;
        console.log('performMode on');
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

map.controller('previewCtrl', ['$scope', 'd3Service', 'visualMapBuilder', '$http', function ($scope, d3Service, visualMapBuilder, $http) {
  console.log('Preview')
  console.log($scope.mapData);

  $http.get('/maps/').success(function (data) {
    $scope.mapData = visualMapBuilder.dataProcess(data);  // process data - add postion on the map and ordered
    console.log("GOT MAP: " + JSON.stringify($scope.mapData));
    // ad certain condition - i.e. called by muzi ..?

    d3Service.d3().then(function (d3) {
      d3.select('#visualImg').style('width', '100%')
        .style('max-height', MAP_HEIGHT + 'px')
      var canvas = d3.select('#map-container');
      visualMapBuilder.initMap(canvas, $scope.mapData);
      //basecamp =

      d3.selectAll('line').attr('opacity', '1').attr('stroke', 'black')
      d3.selectAll('rect').attr('opacity', '1')
      d3.selectAll('text').attr('opacity', '1')
      d3.select('#rect_begin').attr('fill', 'white')
    });
  })
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