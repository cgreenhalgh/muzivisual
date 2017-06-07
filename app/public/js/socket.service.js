'use strict'

var socket = angular.module('MuziVisual.socket', []);
socket.factory('socket', ['$rootScope', '$timeout', function ($rootScope, $timeout) {
    var socket = io.connect();  // connect to visual channel 
    var queue = [];
    socket.on('vStart', function(msg) {
      queue.push({name:'vStart', msg:msg});
    });
    socket.on('vStop', function(msg) {
      queue.push({name:'vStop', msg:msg});
    });
    socket.on('vStageChange', function(msg) {
      queue.push({name:'vStageChange', msg:msg});
    });
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
              if (item.name==eventName) {
                msgs.push(item.msg);
              }
            }
            if (msgs.length>0) {
              $timeout(function() {
                console.log('sending '+msgs.length+' missed messages of type '+eventName);
                for (var i in msgs) {
                  var msg = msgs[i];
                    callback.apply(socket, [msg]);
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