'use strict'

var socket = angular.module('MuziVisual.socket', []);
socket.factory('socket', ['$rootScope', '$timeout', '$location', 'linkapp', '$window', function ($rootScope, $timeout, $location, linkapp, $window) {
  var params = $location.search();
  console.log('$location: ',$location)
  var inArchive = ($location.search()['archive']!==undefined);
  console.log('app inArchive: '+inArchive);
  if (inArchive) {
    return linkapp();
  }
  var performanceid = params['p'] === undefined ? '' : params['p'];
  console.log('performanceid: ', performanceid);
  var subscribedTo = []
  var FILTERED_EVENTS = ['vStart', 'vStop', 'vStageChange']
  var socket = io.connect();  // connect to visual channel 
  var queue = [];
  socket.on('vStart', function (msg) {
    console.log('socket vStart '+msg);
    queue.push({ name: 'vStart', msg: msg });
  });
  socket.on('vStop', function (msg) {
    console.log('socket vStop '+msg);
    queue.push({ name: 'vStop', msg: msg });
  });
  socket.on('vStageChange', function (msg) {
    console.log('socket vStageChange '+msg);
    queue.push({ name: 'vStageChange', msg: msg });
  });
  
  if (performanceid) {
      // can sent multiple for different performanceids
      // Note, msg always starts with 'PERFORMANCEID:'
      socket.emit('client', performanceid);
      subscribedTo.push(performanceid);
  } else {
      console.log('no performance id!');
      alert('Sorry, this URL is wrong! (there is no performance specified)');
  }
  function onPerformance(eventName, performanceid, callback) {
      if (subscribedTo.indexOf(performanceid)<0) {
        console.log('subscribe to '+performanceid);
        socket.emit('client',  performanceid);
        subscribedTo.push(performanceid);
      }
      //console.log('socket on '+eventName+'...');
      var msgs = [];
      for (var i in queue) {
        var item = queue[i];
        if (item.name == eventName && !_.includes(msgs, item.msg)) {
          if (FILTERED_EVENTS.indexOf(eventName)<0 || item.msg.indexOf(performanceid+':')==0 || item.msg==performanceid) {
            msgs.push(item.msg);
          } else {
            console.log('skip past message (performanceid = '+performanceid+'): '+item.name+' '+item.msg);
          }
        }
      }
      if (msgs.length > 0) {
        $timeout(function () {
          console.log('sending ' + msgs.length + ' missed messages of type ' + eventName);
          for (var i in msgs) {
            var msg = msgs[i];
            $rootScope.$apply(function () {
              callback.apply(socket, [msg]);
            });
          }
        }, 0);
      }
      socket.on(eventName, function () {
          var args = arguments;
          if (args.length>0) {
            var msg = String(args[0]);
            if (FILTERED_EVENTS.indexOf(eventName)>=0 && msg.indexOf(performanceid+':')!=0 && msg!=performanceid) {
              console.log('dont return new event '+eventName+' '+msg+' to performance '+performanceid);
              return;
            }
          }
          $timeout(function () {
            $rootScope.$apply(function () {
              callback.apply(socket, args);
            });
          }, 0);
        });
  }

  return {
    ignoreLinks: function() { return false; },
    on: function (eventName, callback) {
      onPerformance(eventName, performanceid, callback);
    },
    on2: function (eventName, performanceid, callback) {
      onPerformance(eventName, performanceid, callback);
    },
    emit: function (eventname, data, callback) {
      socket.emit(eventname, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
}]);