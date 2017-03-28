'use strict'

var socket = angular.module('MuziVisual.socket', []);
socket.factory('socket', ['$rootScope', function ($rootScope) {
    var socket = io.connect();  // connect to visual channel 
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
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