var socket = angular.module('linkapps', []);
// replacement for socket to slave to archive via webRTC (that's the idea...)
socket.factory('linkapp', ['$rootScope', '$timeout', '$location', '$window', function ($rootScope, $timeout, $location, $window) {
  return function() {
    console.log('init linkapp');
/*
    // Create peer connections and add behavior.
    var peerConnection = new RTCPeerConnection({iceServers:[]});
    console.log('Created peer connection object.');

    peerConnection.addEventListener('icecandidate', function(ev) {
      //console.log('icecandidate', ev);
      const peerConnection = ev.target;
      const iceCandidate = ev.candidate;

      if (iceCandidate) {
        //const newIceCandidate = new RTCIceCandidate(iceCandidate);
        console.log('ice candidate: '+JSON.stringify(iceCandidate));
        if ($window.opener) {
          console.log('send ice candidate to opener');
          $window.opener.postMessage(JSON.stringify({iceCandidate:iceCandidate}), '*')
        }
      }
    });
    peerConnection.addEventListener('iceconnectionstatechange', function(ev) {
      // event.target
      console.log('ICE state change event: ', ev);
    });
    
    // single fixed id and name (=[out of band] negotiated)
    let channel = peerConnection.createDataChannel('linkapps', {ordered:true});//, negotiated:true, id:123
    channel.onopen = function(event) {
      console.log('channel open');
      channel.send('Hi you!');
    }
    channel.onmessage = function(event) {
      console.log('channel onmessage: ', event.data);
    }
    peerConnection.createOffer({})
    .then(function(sessionDesc) {
      console.log('created offer', sessionDesc)
      peerConnection.setLocalDescription(sessionDesc);
      //peerConnection.setRemoteDescription(sessionDesc);
      if ($window.opener) {
        let data = JSON.stringify({remoteDescription:sessionDesc})
        $window.opener.postMessage(data, '*')
      }
    })
    .catch(function(err) {
      console.log('error creating offer', err);
    });
*/
    
    console.log('wait for window message(s)')
    // option to get archive end from window message
    $window.addEventListener('message', function(ev) {
      console.log('window message: '+ev.data);
    }, false);
    
    // TODO...
    return {
      on: function (eventName, callback) {
        //onPerformance(eventName, performanceid, callback);
      },
      on2: function (eventName, performanceid, callback) {
        //onPerformance(eventName, performanceid, callback);
      },
      emit: function (eventname, data, callback) {
        //socket.emit(eventname, data, function () {
        //  var args = arguments;
        //  $rootScope.$apply(function () {
        //    if (callback) {
        //      callback.apply(socket, args);
        //    }
        //  });
        //})
      }
    };
  };
}]);