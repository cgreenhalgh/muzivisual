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
    
    console.log('wait for window message(s)');
    var playState = [];
    var callbacks = {};
    var queue = [];
    function callCallbacks(name,msg) {
      queue.push({name:name, msg:msg});
      var cbs = callbacks[name];
      if (cbs===undefined)
        return;
      for (var ci in cbs) {
        var cb = cbs[ci];
        $rootScope.$apply(function () {
          cb.apply(null, [msg]);
        });
      }
    }
    // option to get archive end from window message
    $window.addEventListener('message', function(ev) {
      console.log('window message: '+ev.data);
      if (typeof ev.data =='string') {
        let msg = JSON.parse(ev.data)
        if ('mrl-music.archive/1.0'!=msg.version) {
          console.log('app ignore window message with no/wrong version: ', ev.data)
          return
        }
        if ('play.update'==msg.event) {
          // performanceTitle, performanceId, performers[], stages, venue(?)
          // note: problem getting ID at the moment
          if (playState.length>0 && (playState[0].performanceId!=msg.performanceId || playState[0].performanceTitle!=msg.performanceTitle)) {
            console.log('reload app for performance change '+playState[0].performanceId+' ('+ playState[0].performanceTitle+') -> '+msg.performanceId+' ('+msg.performanceTitle+')');
            if ($location.search()['archive']===undefined)
              $window.location.href = $window.location.href+'&archive=';
            else
              $window.location.reload();
            return;
          }
          if (playState.length>0 && msg.stages && playState[0].stages) {
            let changed = playState[0].stages.length > msg.stages.length;
            for (var si=0; !changed && si<msg.stages.length && si<playState[0].stages.length; si++) {
              if (msg.stages[si] != playState[0].stages[si])
                changed = true;
            }
            if (changed) {
              console.log('reload app for going from stages '+playState[0].stages+' -> '+msg.stages);
              if ($location.search()['archive']===undefined)
                $window.location.href = $window.location.href+'&archive=';
              else
                $window.location.reload();
              return;
            }
          }
          if (playState.length==0) {
            playState.push(msg);
            callCallbacks('archive.init' , msg)
            if (msg.stages.length>0) {
              callCallbacks('vStart' , ':'+msg.stages[0]);
            }
            for (var si=1; si<msg.stages.length; si++) {
              callCallbacks('vStageChange', ':'+msg.stages[si-1]+'->'+msg.stages[si]);
            }
          } else {
            for (var si=playState[0].stages.length; si<msg.stages.length; si++) {
              callCallbacks('vStageChange', ':'+msg.stages[si-1]+'->'+msg.stages[si]);
            }
            playState[0] = msg;
          }
        }
      }
    }, false);
    
    // say hello to parent
    var msg = JSON.stringify({version: 'mrl-music.archive/1.0', event:'app.start'});
    $window.parent.postMessage(msg, '*');

    return {
      ignoreLinks: function() { return true; },
      on: function (eventName, callback) {
        //onPerformance(eventName, performanceid, callback);
        var msgs = [];
        for (var mi in queue) {
          var msg = queue[mi];
          if (msg.name == eventName) {
            msgs.push(msg.msg);
          }
        }
        if (callbacks[eventName]===undefined)
          callbacks[eventName] = [];
        callbacks[eventName].push(callback);
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
      on2: function (eventName, performanceid, callback) {
        //onPerformance(eventName, performanceid, callback);
        // TODO
      },
      emit: function (eventname, data, callback) {
        console.log('inArchive: ignore emit '+eventname, data);
      }
    };
  };
}]);