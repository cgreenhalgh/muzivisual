'use strict';

// Declare app level module which depends on views, and components
var visual = angular.module('myApp', [
  'ngRoute',
  'myApp.map',
  'myApp.view2',
  'myApp.version',
  'myApp.socket'
]);

visual.config(['$locationProvider', '$routeProvider', function ($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');
  $routeProvider.otherwise({ redirectTo: '/' });
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
    scriptTag.src = '/vendor/d3/d3.min.js';
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



