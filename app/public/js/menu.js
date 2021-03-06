'user strict'

var menu = angular.module('MuziVisual.menu', ['ngRoute', 'ngSanitize', 'MuziVisual.visualmapbuilder']);


menu.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'menu.html',
        controller: 'menuCtrl'
    }).when('/content/map', {
        templateUrl: 'previewMap.html',
        controller: 'previewCtrl'
    }).when('/content/:inquery', {
        templateUrl: 'textContent.html',
        controller: 'contentCtrl'
    }).
        otherwise({
            redirectTo: '/',
        });
}])


menu.controller('menuCtrl', ['$scope', '$location', 'socket', '$window', '$anchorScroll', 'mpmLoguse', function ($scope, $location, socket, $window, $anchorScroll, mpmLoguse) {
    mpmLoguse.view('/', { performance:$location.search()['p'] });
    $scope.performing = false;
    $scope.archiveHighlight = false;
    
	// https://stackoverflow.com/questions/14573223/set-cookie-and-get-cookie-with-javascript
	function createCookie(name,value,days) {
	    var expires = "";
	    if (days) {
	        var date = new Date();
	        date.setTime(date.getTime() + (days*24*60*60*1000));
	        expires = "; expires=" + date.toUTCString();
	    }
	    document.cookie = name + "=" + value + expires + "; path=/";
	}

	function readCookie(name) {
	    var nameEQ = name + "=";
	    var ca = document.cookie.split(';');
	    for(var i=0;i < ca.length;i++) {
	        var c = ca[i];
	        while (c.charAt(0)==' ') c = c.substring(1,c.length);
	        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	    }
	    return null;
	}
	var COOKIE_NAME = 'muzivisual-hidestudyalert';
	var DEFAULT_DAYS = 365;

    $scope.showStudyAlert = !readCookie(COOKIE_NAME);
    $scope.hideStudyAlert = function() {
    	$scope.showStudyAlert = false;
    	createCookie(COOKIE_NAME,"1",DEFAULT_DAYS);
    }
    
    $scope.goToMenu = function () { $location.path('/'); };

    socket.on('vStart', function () {
        $scope.performing = true;
        console.log('start performing')
    })

    socket.on('vStop', function () {
        $scope.archiveHighlight = true;
        $scope.performing = false;
        console.log('stop performing');
    })

    $scope.openContent = function openContent(title) {
        console.log('This is menuCtrl ' + title);
        if (title === 'Map') {
            $location.path('/content/map');
            return;
        }

        if (title === 'Archive') {
            $scope.archiveHighlight = false;
        }

        $location.path('/content/' + title);
    }


    $scope.openPerformance = function () {
        var performanceid = $location.search()['p'];
        if (performanceid) {
            $location.path('/performance').search({p:performanceid,i:0});
        } else {
            alert('Sorry, this URL is wrong! (there is no performance specified)');
            return;
        }
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


menu.controller('contentCtrl', ['$scope', '$routeParams', 'mpmLoguse', '$window', '$location', '$timeout', 'visualMapBuilder', function ($scope, $routeParams, mpmLoguse, $window, $location, $timeout, visualMapBuilder) {
    console.log('open: ', $routeParams.inquery)
    mpmLoguse.view('/content/' + $routeParams.inquery, { performance:$location.search()['p'] });
    var title = $scope.title = $routeParams.inquery;
    $scope.links = [];
    $scope.userid = null;
    
    $scope.goToMenu = function () { $location.path('/'); }
    $scope.navigate = function($event,url) {
    	console.log('navigate '+url);
    	mpmLoguse.log({event:'link.out', url: url});
    	$event.preventDefault();
    	$timeout(function() {
    		console.log('actually link out to '+url);
        	$window.location.href =url;    		
    	}, 500);
    };
    
    //change contents for different parts
    if (title === 'Programme Note') {
        $scope.text = '<p>Climb! is a new interactive work for piano by composer and pianist Maria Kallionpää.</p><p>Climb! combines contemporary piano with elements of computer games to create a non-linear musical journey in which the pianist negotiates an ascent of a mountain, choosing their path as they go and encountering weather, animals and other obstacles along the way.</p><p>Climb! employs the Mixed Reality Lab’s Muzicodes technology to embed musical triggers within the composition. Like hyperlinks, these may transport the player to another point in the score when successfully played, and may also trigger additional musical effects or control visuals. Climb! also uses a Disklavier piano which physically plays alongside the human pianist during key passages, engaging them in a human-machine musical dialogue. The interactive score is delivered using The University of Oxford’s MELD dynamic annotated score renderer.</p><p>Climb! is supported by the EPSRC-funded FAST project (EP/L019981/1) and University of Nottingham’s Research Priority Area (RPA) Development Fund.</p>'
    } else if (title === 'Performers') {
        $scope.text = '';
        visualMapBuilder.loadData().then(function() {
            var performers = visualMapBuilder.getPerformers();
            if (performers) {
                for (var i=0; i<performers.length; i++) {
                    $scope.text = $scope.text+performers[i];
                }
            }
        });
    } else if (title === 'What can see and hear') {
        $scope.text = '<p>A performance of Climb! contains a number of audio visual interactions that are triggered by musical codes (muzicodes) embedded in the pianist’s piano part.</p>'+
        	'<p>On stage, the pianist plays the Disklavier piano and at times the Disklavier self-plays, taking over from the pianist or duets alongside them. These Disklavier parts are triggered by simple musical codes played by the pianist in the preceding musical material. Difficult to perform musical codes, (challenge codes) determine the route that the performer takes through the branching composition, where a ‘correct’ performance will find the performer staying on their chosen path, but an incorrect performance will result in being forced over to a different path. The performer reads the music from a dynamic digital score, where the result of ‘challenge codes’ automatically queues the next appropriate score section. The sound of the piano is fed through audio processing effects that aim to mimic weather conditions, which are also triggered by Muzicodes.</p>'+
        	'<p>The projections display a visual representation of these musical interactions, such as the changing weather conditions and background animations within the mountain outline. The self-playing Disklavier parts are represented by an animated mountain outline. The mountain flashes blue when a Disklavier part is triggered. When a ‘challenge code’ is approaching a ‘tunnel’ animation gradually appears and if the ‘challenge code’ is successfully performed the mountain flashes red. Blended into these visualisations is a live camera feed of the Disklavier keyboard.</p>'+
        	'<p>The ‘Climb! Audience App’ provides information about the composition and a performance of it. The ‘performance’ view shows the pianist’s progress through the composition in real-time, with updates also being triggered by the musical codes they play. A brief narrative outline is displayed as the performer progresses from section to section. Notifications alert you to upcoming ‘challenge codes’ and state if the pianist was successful in performing them correctly. Selecting the left-hand arrow in the performance view will display the completed routes taken at the previous performances of Climb!, so as to provide a comparison. Selecting the right-hand map icon will display the mountain with all possible paths and branching points in the composition.</p>';
    } else if (title === 'Archive') {
        $scope.text = '<p>This archive keeps a historical record of Climb! performances, enabling you to explore and compare different readings of this interactive work. The archive contains performance details (e.g. date, venue, performer and programme notes) alongside audio and video recordings of each performance. Accompanying visual representations of these performances highlight each unique journey through the branching composition. You can listen to complete performances or select individual sections from any chosen performance.</p><p><i>Select this link if you would like to visit the archive.</i></p>';
        $scope.links = [ { url: 'http://music-mrl.nott.ac.uk/1/archive/explore/Climb' } ];
    }
    else if (title === 'How it works') {
        $scope.text = '<p>Climb! Is realised using a combination of technologies. It is played on a Disklavier piano that can be instructed to physically play back computer generated parts (using the MIDI protocol) and can even duet along with the pianist, moving its keys around and between their fingers. Climb! also uses the Max/MSP software running on a laptop to generate various audio effects that transform the piano’s sound.</p><p>The performer controls how the work progresses – which path they follow and how they negotiate various events along the way – directly through their playing rather than by pressing buttons, pushing pedals or having someone do this from behind the scenes. This employs a technology called Muzicodes from the University of Nottingham’s Mixed Reality Lab. Muzicodes allows certain phrases in the score to be designated as hidden codes that, when successfully played by the pianist, trigger events such as jumping to a new place in the score (like following a hyperlink on the World Wide Web); introducing an audio effect to represent weather and environmental conditions; causing the Disklavier to duet with the pianist; driving the projected animations; and finally controlling the performance view on this app!</p><p>The MELD software from the University of Oxford is used to render the pianist’s score, turning the digital pages for them as they negotiate their route through the piece.</p>'+
        	'<p>These academic papers include more information (see links below):</p><ul><li>Chris Greenhalgh, Steve Benford, and Adrian Hazzard (2016) ^muzicode$: composing and performing musical codes. In: Audio Mostly 2016, 4-6 Oct 2016, Norrköping, Sweden.</li>'+
        	'<li>Maria Kallionpää, Chris Greenhalgh, Adrian Hazzard, David M. Weigl, Kevin R. Page, and Steve Benford (2017) Composing and realising a gamelike performance for disklavier and electronics. In: New Interfaces for Musical Expression (NIME\'17), 15-18 May2017, Copenhagen, Denmark</li></ul>';
        $scope.links = [ { url: 'http://eprints.nottingham.ac.uk/37081/'}, {url: 'http://eprints.nottingham.ac.uk/44529/' } ];
    } else if (title == 'Research') {
        $scope.text = '<p>This app collects <b>anonymous</b> data about how it is used, e.g. what pages within the app are looked at, for how long. Neither you nor this device can be identified from the collected data. No other data is collected, for example no data is collected from other apps or web pages.</p><p> This data will be used to help us to understand how audience members perceive and respond to Climb! and the technologies that it uses, and will help to shape future technologies and performances. This research is supported by the University of Nottingham and the EPSRC-funded FAST IMPACt project.</p><p>If you have any questions or concerns then you can contact <a href="mailto:chris.greenhalgh@nottingham.ac.uk?Subject=Climb!-London Performance" target="_top" class="menu-text">chris.greenhalgh@nottingham.ac.uk</a>, Chris Greenhalgh, School of Computer Science, The University of Nottingham, Jubilee Campus, Nottingham NG8 1BB.</p>';
        mpmLoguse.withuserid(function(userid) {
        	console.log('got userid '+userid);
        	$scope.userid = userid;
            $scope.text = '<p>This app collects <b>anonymous</b> data about how it is used, e.g. what pages within the app are looked at, for how long. Neither you nor this device can be identified from the collected data. No other data is collected, for example no data is collected from other apps or web pages.</p><p>The data collected from this device is linked to the following anonymous “User ID”: U'+$scope.userid+'. </p><p> This data will be used to help us to understand how audience members perceive and respond to Climb! and the technologies that it uses, and will help to shape future technologies and performances. This research is supported by the University of Nottingham and the EPSRC-funded FAST IMPACt project.</p><p>If you have any questions or concerns then you can contact <a href="mailto:chris.greenhalgh@nottingham.ac.uk?Subject=Climb!-London Performance" target="_top" class="menu-text">chris.greenhalgh@nottingham.ac.uk</a>, Chris Greenhalgh, School of Computer Science, The University of Nottingham, Jubilee Campus, Nottingham NG8 1BB.</p>'
        });
    } else {
        $scope.text = 'Sorry this page is empty'
    }

}])


menu.controller('previewCtrl', ['$scope', 'd3Service', 'visualMapBuilder', '$http', '$location', '$compile', 'mpmLoguse', '$window', function ($scope, d3Service, visualMapBuilder, $http, $location, $compile, mpmLoguse, $window) {
    console.log('PreviewCtrl')
    mpmLoguse.view('/content/map', { performance:$location.search()['p'] });

    $scope.mapTitle = 'Climb!';
    $scope.cstage = ''
    $scope.pstage = ''
    $scope.preview = 1;
    $scope.mapData = visualMapBuilder.getMapData();

    var tempRecord = {};

    $scope.goToMenu = function () { $location.path('/'); }

    $scope.showStageTitle = function (name, stage) {
    	mpmLoguse.log({event:'selectStage', stage:stage, title:name});
        $scope.title = name;
        d3Service.d3().then(function (d3) {
            if (tempRecord) {
                d3.select(tempRecord.id).attr('fill', tempRecord.fill)
                tempRecord = {}
            }
            var id = '#circle_' + stage;
            tempRecord.id = id;
            tempRecord.fill = d3.select(id).attr('fill')
            d3.select(id).attr('fill', 'red')
        })
        console.log('show stage title:' + name)
    }

    if (!$scope.mapData) {
        visualMapBuilder.loadData().then(function () {
          $scope.mapData = visualMapBuilder.getMapData();
          initMap();
        })
    } else {
        initMap();
    }

    function initMap() {
      visualMapBuilder.initMap().then(function() {
        d3Service.d3().then(function (d3) {
            console.log('initMap preview');
            d3.selectAll('line').attr('opacity', '1').attr('stroke', '#FAFAFB') //white

            d3.selectAll('circle')
                .attr('opacity', '1')
                .attr('ng-click', function (d) {
                    return 'showStageTitle("' + d.name + '","' + d.stage + '")'
                })
            var circles = document.getElementsByClassName('circle');
            $compile(angular.element(circles))($scope);
        });
      })
    }
}])
