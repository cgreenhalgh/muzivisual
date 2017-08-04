'use strict'

var socket = angular.module('MuziVisual.socket', []);
socket.factory('socket', ['$rootScope', '$timeout', '$location', function ($rootScope, $timeout, $location) {
  var params = $location.search();
  var performanceid = params['p'] === undefined ? '' : params['p'];
  console.log('performanceid: ', performanceid);
  
  var socket = io.connect();  // connect to visual channel 
  var queue = [];
  socket.on('vStart', function (msg) {
    queue.push({ name: 'vStart', msg: msg });
  });
  socket.on('vStop', function (msg) {
    queue.push({ name: 'vStop', msg: msg });
  });
  socket.on('vStageChange', function (msg) {
    queue.push({ name: 'vStageChange', msg: msg });
  });
  
  if (performanceid) {
      socket.emit('client', performanceid);
  } else {
      console.log('no performance id!');
      alert('Sorry, this URL is wrong! (there is no performance specified)');
      return;
  }

  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
      var msgs = [];
      for (var i in queue) {
        var item = queue[i];
        if (item.name == eventName && !_.includes(msgs, item.msg)) {
          msgs.push(item.msg);
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