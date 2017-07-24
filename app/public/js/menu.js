'user strict'

var menu = angular.module('MuziVisual.menu', ['ngRoute', 'ngSanitize', 'MuziVisual.visualmapbuilder']);


menu.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'menu.html',
        controller: 'menuCtrl'
    }).when('/content/map', {
        templateUrl: 'map.html',
        controller: 'previewCtrl'
    }).when('/content/:inquery', {
        templateUrl: 'textContent.html',
        controller: 'contentCtrl'
    }).
        otherwise({
            redirectTo: '/',
        });
}])


menu.controller('menuCtrl', ['$scope', '$location', 'socket', '$window', '$anchorScroll', function ($scope, $location, socket, $window, $anchorScroll) {
    $scope.performing = false;
    $scope.perfOpacity = 0.2;
    $scope.archOp = 1;
    $scope.pstop = false;

    socket.on('vStart', function () {
        $scope.perfOpacity = 1;
        $scope.performing = true;
        $scope.archOp = 0.2;
        console.log('start performing')
    })

    socket.on('vStop', function () {
        $scope.perfOpacity = 0.2;
        $scope.performing = false;
        $scope.archOp = 1;
        $scope.pstop = true;
        console.log('stop performing');
    })

    $scope.openContent = function openContent(title) {
        console.log('This is menuCtrl ' + title);
        if (title === 'Map') {
            $location.path('/content/map');
            return;
        }
        $location.path('/content/' + title);
    }

    $scope.openArchive = function () {
        $window.open('http://music-mrl.nott.ac.uk/1/archive/explore/Climb', '_self')
    }

    $scope.openPerformance = function () {
        $window.location.href = 'http://localhost:8000/#!/performance/?p=9333e7a2-16a9-4352-a45a-f6f42d848cde'
        $window.location.reload(true)
    }


    //   $anchorScroll.yOffset = 40;

    //   console.log('menuctrl')
    //   socket.on('vStart', function (data) {
    //     console.log('vStart: get data ', data);
    //     var da = data.split(':')
    //     var performanceid = da[0];
    //     //console.log('PerformanceID: ', performanceid);
    //     $location.path('/performance/');
    //   });

    //   var params = $location.search();

    //   var performanceid = params['p'] === undefined ? '' : params['p'];
    //   if (performanceid) {
    //     if (performanceid === '9333e7a2-16a9-4352-a45a-f6f42d848cde') {
    //       $scope.title = 'test(title)'
    //       //$scope.performance2 = true;
    //     } else if (performanceid === 'be418821-436d-41c2-880c-058dffb57d91') {
    //       $scope.title = 'Performance 1'
    //       $scope.performance1 = true;
    //       $scope.performance2 = false;
    //     } else if (performanceid === '13a7fa70-ae91-4541-9526-fd3b332b585d') {
    //       $scope.title = 'Performance 2'
    //       $scope.performance2 = true;
    //       $scope.performance1 = false;
    //     }

    //     console.log('client for performance ' + performanceid);
    //     socket.emit('client', performanceid);
    //   } else {
    //     console.log('no performance id!');
    //     alert('Sorry, this URL is wrong! (there is no performance specified)');
    //   }

    //   $scope.gotoAnchor = function (anchorName) {
    //     console.log('go to anchor' + anchorName);
    //     if ($location.hash() !== anchorName) {
    //       $location.hash(anchorName);
    //     } else {
    //       $anchorScroll();
    //     }
    //   }
}]);


menu.controller('contentCtrl', ['$scope', '$routeParams', function ($scope, $routeParams) {
    console.log('open: ', $routeParams.inquery)
    var title = $scope.title = $routeParams.inquery;
    //change contents for different parts
    if (title === 'Programme Note') {
        $scope.text = '<p>Climb! is a new interactive work for piano by composer and pianist Maria Kallionpää.</p><p>Climb! combines contemporary piano with elements of computer games to create a non-linear musical journal in which the pianist negotiates an ascent of a mountain, choosing their path as they go and encountering weather, animals and other obstacles along the way.</p><p>Climb! employs the Mixed Reality Lab’s Muzicodes technology to embed musical triggers within the composition. Like hyperlinks, these may transport the player to another point in the score when successfully played, and may also trigger additional musical effects or control visuals. Climb! also uses a disklavier piano which physically plays alongside the human pianist during key passages, engaging them in a human-machine musical dialogue. The interactive score is delivered using The University of Oxford’s MELD dynamic annotated score renderer.</p><p>The performance is part of the Nottingham Forum for Artistic Research (NottFAR) concert and events series. Climb! is supported by the EPSRC-funded FAST project (EP/L019981/1) and University of Nottingham’s Research Priority Area (RPA) Development Fund.</p>'
    } else if (title === 'Performer') {
        $scope.text = '<div><b>Dr. Maria Kallionpää (1981)</b> is an internationally active composer and pianist. She earned her PhD in composition at the university of Oxford in 2015. Kallionpää won the first prize of the OUPHIL composition competition in 2013. She has graduated from the Royal Academy of Music (2009) and Universität für Musik and Darstellende Kunst Wien (2010) and has also studied composition and piano at Sibelius Academy and Universität Mozarteum Salzburg. Her works have been performed at Musikverein Wien, Philharmonie Luxembourg, and Sibiu Philharmonia. In 2011 Kallionpää was a commissioned composer of the Turku European Culture Capital and a finalist of the Tenso European Chamber Choir Composition Competition. Kallionpää has performed at numerous music festivals including Rainy Days Festival at Philharmonie Luxembourg, Musica Nova (Helsinki), Spitalfields Festival (London), and Neue Musik von Thuringen. In 2016 her music was performed at the Florida International Toy Piano Festival.</div>'
    } else if (title === 'What can see and hear') {
        $scope.text = 'What can see and hear'
    } else if (title === 'How it works') {
        $scope.text = '<p>Climb! Is realised using a combination of technologies. It is played on a Disklavier piano that can be instructed to physically play back computer generated parts (using the MIDI protocol) and can even duet along with the pianist, moving its keys around and between their fingers. Climb! also uses the Max/MSP software running on a laptop to generate various audio effects that transform the piano’s sound.</p><p>The performer controls how the work progresses – which path they follow and how they negotiate various events along the way – directly through their playing rather than by pressing buttons, pushing pedals or having someone do this from behind the scenes. This employs a technology called Muzicodes from the University of Nottingham’s Mixed Reality Lab. Muzicodes allows certain phrases in the score to be designated as hidden codes that, when successfully played by the pianist, trigger events such as jumping to a new place in the score (like following a hyperlink on the World Wide Web); introducing an audio effect to represent weather, animals, stones and so forth; causing the Disklavier to duet with the pianist; driving the projected animations; and finally controlling these very programme notes!</p><p>The MELD software from the University of Oxford is used to render the pianist’s score, turning the digital pages for them as they negotiate their route through the piece. </p>'
    } else {
        $scope.text = 'Sorry this page is empty'
    }

}])


menu.controller('previewCtrl', ['$scope', 'd3Service', 'visualMapBuilder', '$http', '$location', function ($scope, d3Service, visualMapBuilder, $http, $location) {
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

            visualMapBuilder.initMap(canvas, visualMapBuilder.getMapData());

            d3.selectAll('line').attr('opacity', '1').attr('stroke', 'white')
            d3.selectAll('circle').attr('opacity', '1')
            d3.select('#circle_begin').attr('fill', 'white')
        });
    }

}])
