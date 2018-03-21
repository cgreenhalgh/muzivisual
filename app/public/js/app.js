'use strict';

// Declare app level module which depends on views, and components
var visual = angular.module('MuziVisual', [
  'ngRoute',
  'MuziVisual.map',
  'MuziVisual.menu',
  'MuziVisual.socket',
  'linkapps',
  'MuziVisual.visualmapbuilder',
  'mpm-loguse',
]);

visual.config(['$locationProvider', '$routeProvider', function ($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');
  $locationProvider.html5Mode(true);
  $routeProvider.
    otherwise({
      redirectTo: '/'
    });
}]);

// lodash injector
visual.factory('_', ['$window', function ($window) {
  var _ = $window._;
  return (_);
}]);

// d3 injector - see http://www.ng-newsletter.com/posts/d3-on-angular.html
visual.factory('d3Service', ['$document', '$q', '$rootScope',
  function ($document, $q, $rootScope) {
    console.log('d3Service...');
    var d = $q.defer();
    function onScriptLoad() {
      // Load client in the browser
      $rootScope.$apply(function () { d.resolve(window.d3); });
    }
    // Create a script tag with d3 as the source
    // and call our onScriptLoad callback when it
    // has been loaded
    var scriptTag = $document[0].createElement('script');
    scriptTag.type = 'text/javascript';
    scriptTag.async = true;
    scriptTag.src = 'vendor/d3/d3.min.js';
    scriptTag.onreadystatechange = function () {
      if (this.readyState == 'complete') onScriptLoad();
    }
    scriptTag.onload = onScriptLoad;

    var s = $document[0].getElementsByTagName('body')[0];
    s.appendChild(scriptTag);

    return {
      d3: function () { return d.promise; }
    }
  }
])

visual.controller('AlertCtrl', ['$scope', 'socket', '$timeout', 'mpmLoguse', 'd3Service', '$window', function ($scope, socket, $timeout, mpmLoguse, d3Service, $window) {
	console.log('AlertCtrl');
	$scope.alertTimeout = null;
	socket.on('vEvent', function (data) {
		// format: perfid:msg:time:bool
		console.log('get event content: ' + data)
		var splitedData = _.split(data, ':');
		$scope.alertMsg = splitedData[1];
		var alertTime = parseInt(splitedData[2]) * 1000;
		var vib = 'true'==splitedData[3];
		$scope.vibrate = vib;
		mpmLoguse.log({event:'alert', message: splitedData[1], duration: alertTime, vibrate: vib});

		d3Service.d3().then(function (d3) {
			d3.select('.alert')
			//.transition()
			//.duration($scope.alertTimeout ? 100 : 0)
			.style('opacity', '0')
			.transition()
			.duration($scope.alertTimeout ? 200 : 500)
			.style('opacity', '1')
			.style('z-index', '200')

			if ($scope.alertTimeout)
				$timeout.cancel($scope.alertTimeout);
			$scope.alertTimeout = $timeout(function () {
				$scope.alertTimeout = null;
				d3.select('.alert')
				.transition()
				.duration(500)
				.style('opacity', '0')
				.style('z-index', '50')
			}, alertTime)
		})

		if (vib) {
			$window.navigator.vibrate([200,200,200,200,200]);
		}
	})

}]);



