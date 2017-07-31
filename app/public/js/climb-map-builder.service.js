var R = 12;
var visualMapBuilder = angular.module('MuziVisual.visualmapbuilder', []);

visualMapBuilder.factory('visualMapBuilder', ['d3Service', '$timeout', '$q', '$http', function (d3Service, $timeout, $q, $http) {
    console.log('visualMapBuilder');
    var recordMap;
    var mapData;
    var narrativeData;
    var stop_flag;
    var journeyRecord = [];
    var passedRecord = [];
    var lastMapRecorder = [];

    function getPreviewCircleFillColor(d) {
        if (d.path === '1') {
            return '#C8F0D2' //green
        }
        else if (d.path === '2') {
            return '#F6E5A9' //yellow
        }
        else if (d.path === '0') {
            return '#C3C2F4' //purple
        }
        else {
            return '#FAFAFB'; //white
        }
    }

    function getCircleFillColor(d) { // check if its a path or a stage 
        if (stop_flag) {
            return;
        }

        if (d.state === 'rev_succ') {
            return 'orange'
        }
        else if (d.path === '1') {
            return '#C8F0D2' //green
        }
        else if (d.path === '2') {
            return '#F6E5A9' //yellow
        }
        else if (d.path === '0') {
            return '#C3C2F4' //purple
        }
        else {
            return '#FAFAFB'; //white
        }
    }

    function getStageOpacity(state) {
        if (state === 'missed') {
            return 0.2;
        } else if (state === 'hidden') {
            return 0;
        } else {
            return 1;
        }
    }

    function getLineColor(state) {
        if (state === 'rev_succ') {
            return 'orange';
        }
        else {
            return 'white';
        }
    }

    function getCircleRadius(d) {
        if (d.state === 'active') {
            return 15;
        }
        else if (_.head(d.stage) === 'p') {
            return 8;
        } else {
            return R;
        }
    }

    function getLineOpacity(pstate, cstate) {
        if ((pstate === 'rev_succ' && cstate === 'active') || (pstate === 'active' && cstate === 'revealed')) {
            return 1;
        } else {
            return 0; // 
        }
    }

    function updateMapStage(stage, toState, delay) {
        if (stop_flag) {
            return;
        }

        _.find(mapData, { 'stage': stage }).state = toState;

        var data = _.find(mapData, { 'stage': stage });
        var sname = data.name;
        var state = data.state;

        d3Service.d3().then(function (d3) {
            d3.select('#circle_' + stage)
                .transition()
                .delay(delay * INTERVAL)
                .duration(INTERVAL)
                .attr('fill', function () { return getCircleFillColor(data) })
                .attr('r', function () { return getCircleRadius(data) })
                .attr('opacity', function () { return getStageOpacity(state) })

        })

    }

    function updateMapLine(p, c, fss, pcstages, delay) {

        // if (_.includes(passedRecord, c.stage)) {
        //     console.log('stage already visited', p.stage)
        //     return;
        // }

        console.log(p.stage, c.stage)
        var cstage = c.stage;
        var cs = c.state;
        var ps, pstage, fs, fstage;


        d3Service.d3().then(function (d3) {
            // update lines linking pstage and cstage -> turn solid and change color
            pstage = p.stage;
            ps = p.state;
            d3.select('#line_' + pstage + '_' + cstage)
                .transition()
                .delay(INTERVAL * delay)
                .duration(INTERVAL)
                .style("stroke-dasharray", ("0, 0"))
                .attr('opacity', function () { return getLineOpacity(ps, cs) })
                .attr('stroke', function () { return getLineColor(ps) })

            // console.log("lines: ", '#line_' + pstage + '_' + cstage)

            if (fss.length > 0) {
                _.forEach(fss, function (f) {
                    fstage = f.stage;
                    fs = f.state;

                    // update lines linking cstage and fstage -> black dotted-line
                    d3.select('#line_' + cstage + '_' + fstage)
                        .transition()
                        .delay(INTERVAL * (delay + 2))  // depends on to show in what order
                        .duration(INTERVAL - 200)
                        .style("stroke-dasharray", ("6, 6"))
                        .attr('opacity', function () { return getLineOpacity(cs, fs) })
                        .attr('stroke', function () { return getLineColor(cs) })
                })
            }
            else {  // if there is no fs i.e. reach the summit - need test? 
                d3.select('#line_' + ps)
                    .transition()
                    .delay(INTERVAL * delay)
                    .duration(INTERVAL)
                    .attr('opacity', function () { return getLineOpacity(ps, cs) })
                    .attr('stroke', function () { return getLineColor(ps) })
            }


            // past cues stage links
            if (pcstages) {
                _.forEach(pcstages, function (pcstage) {
                    // the line linking pstage and missed stage -> disappear
                    d3.select('#line_' + pstage + '_' + pcstage)
                        .transition()
                        .delay(INTERVAL * (delay + 1))
                        .duration(INTERVAL)
                        .attr('opacity', function () { return getLineOpacity(ps, pcstage) })
                })
            }
        });
    }

    return {
        getPassedRecord: function () {
            return passedRecord;
        },
        updateMap: function (cstage, pstage) {
            if (stop_flag) {
                return;
            }

            console.log(cstage, pstage);
            var ps = 0, cs = 0, fss = 0, fs = 0, psCues = 0, psCuesWithoutCs = 0, revealeds = [], flist = [];

            // active new path
            cs = _.find(mapData, { 'stage': cstage });
            var cname = cs.name;
            updateMapStage(cstage, 'active', delaybase)

            // turn the previous active stage into past -  succ / fail
            if (pstage) {
                ps = _.find(mapData, { 'stage': pstage });
                updateMapStage(pstage, 'rev_succ', 0)

                // ps cue stage
                psCues = ps.cue.split('/');
                psCuesWithoutCs = _.filter(psCues, function (s) { return s !== cstage });

                // get missed stages
                revealeds = _.filter(mapData, { 'state': 'revealed' })
                if (revealeds.length > 0) {
                    _.forEach(revealeds, function (rs) {
                        console.log('update to missed: ', rs);
                        updateMapStage(rs.stage, 'missed', delaybase + 1)
                    });
                }
            }

            // reveal new stages
            if (cs.cue) {
                fss = _.split(cs.cue, '/');
                _.forEach(fss, function (s) {
                    fs = _.find(mapData, { 'stage': s })
                    flist.push(fs);

                    //console.log('update to new: ', s);

                    if (!_.includes(passedRecord, fs.stage)) {
                        console.log('reveal new stage:', fs.stage);
                        updateMapStage(fs.stage, 'revealed', delaybase + 4)
                    }
                });
            }
            console.log('reveal new stage with lines', ps.stage, cs.stage)
            updateMapLine(ps, cs, flist, psCuesWithoutCs, delaybase);
        },
        drawMap: function (canvas) {
            var data = journeyRecord;
            console.log('draw map');

            var cStageDatum;
            var cueStageDatum;
            var snum = data.length;
            if (snum > 1) {
                for (var i = 0; i < snum - 1; i++) {
                    console.log(data[i].stage);
                    cStageDatum = data[i];
                    cueStageDatum = data[i + 1];
                    canvas
                        .append('line')
                        .attr("x1", cStageDatum.x * MAP_WIDTH)
                        .attr("y1", cStageDatum.y * MAP_HEIGHT)
                        .attr("x2", cueStageDatum.x * MAP_WIDTH)
                        .attr("y2", cueStageDatum.y * MAP_HEIGHT)
                        .attr("id", function () {
                            return cueStageDatum.stage ? (cStageDatum.stage + '_' + cueStageDatum.stage
                            ) : ('line_' + cStageDatum.stage)
                        })
                        .attr('stroke', 'orange')
                        .attr('opacity', 1)
                        .attr('stroke-width', '2px')
                }
            }

            canvas
                .selectAll('circle')
                .data(data)
                .enter()
                .append('circle')
                .attr('cx', function (d) {
                    return d.x * MAP_WIDTH;
                })
                .attr('cy', function (d) {
                    return d.y * MAP_HEIGHT;
                })
                .attr('id', function (d) {
                    return 'circle_' + d.stage;
                })
                .attr('r', R)
                .attr('class', 'circle')
                // .attr('ng-click', function (d) {
                //     var len = d.visual.length;
                //     if (len) {
                //         return d.visual[0];
                //     }
                //     return '#';
                // })
                .attr('opacity', 0)
                .attr('stroke', 'orange')
                .attr('fill', 'orange')
                .attr('opacity', 1)
        },
        getPastMap: function (msgs, perfIndex) {
            console.log('This is the performance index: -', perfIndex)
            //cancel last draw if there was
            if (lastMapRecorder.length > 0) {
                d3Service.d3().then(function (d3) {
                    console.log('last draw', lastMapRecorder)
                    _.forEach(lastMapRecorder, function (draw) {
                        d3.select(draw.cid).attr('opacity', draw.opacity).attr('fill', draw.fill)
                    })
                    lastMapRecorder = [];
                    if (perfIndex) {
                        drawPastPerfMap(msgs);
                    }
                })
            } else {
                drawPastPerfMap(msgs);
            }

            function drawPastPerfMap(msgs) {
                _.forEach(msgs, function (m) {
                    var msg = JSON.parse(m)

                    var msgData = _.split(msg.data, ':');
                    var stages = _.split(msgData[1], '->')

                    if (!_.includes(passedRecord, stages[0])) {
                        if (msg.name === "vStop") {
                            var cid = "#circle_summit"
                            recordOneDraw(cid);
                        } else if (stages[0]) {
                            var cid = '#circle_' + stages[0];
                            recordOneDraw(cid);
                        }
                    }

                    if (!stages[1]) {
                        return;
                    }
                    var cid = '#line_' + stages[0] + '_' + stages[1];
                    recordOneDraw(cid);
                });

                d3Service.d3().then(function (d3) {
                    _.forEach(lastMapRecorder, function (draw) {
                        d3.select(draw.cid).transition().duration(INTERVAL).attr('opacity', 0.6).attr('fill', '#FAFAFB') //white
                    })
                })

                function recordOneDraw(cid) {
                    d3Service.d3().then(function (d3) {
                        var cfill = d3.select(cid).attr('fill');
                        var cop = d3.select(cid).attr('opacity');
                        var draw = {
                            "cid": cid,
                            "fill": cfill,
                            "opacity": cop
                        }
                        lastMapRecorder.push(draw)
                    })

                }

            }
        },
        initMap: function (canvas, data, mode) {
            if (stop_flag && mode != "preview") {
                return;
            }
            _.forEach(data, function (cStageDatum) {
                if (cStageDatum.stage !== 'summit') {
                    // get all the cues of this stage
                    var cueList = _.split(cStageDatum.cue, '/');
                    var cueStageDatum;
                    _.forEach(cueList, function (cueStage) {
                        cueStageDatum = _.find(data, { 'stage': _.trim(cueStage) });

                        canvas
                            .append('line')
                            .attr("x1", cStageDatum.x * MAP_WIDTH)
                            .attr("y1", cStageDatum.y * MAP_HEIGHT)
                            .attr("x2", cueStageDatum.x * MAP_WIDTH)
                            .attr("y2", cueStageDatum.y * MAP_HEIGHT)
                            .attr("id", function () {
                                return cueStageDatum.stage ? ('line_' + cStageDatum.stage + '_' + cueStageDatum.stage
                                ) : ('line_' + cStageDatum.stage)
                            })
                            .style("stroke-dasharray", ("6, 6"))
                            .attr('stroke', '#FAFAFB') //white
                            .attr('opacity', 0)
                            .attr('stroke-width', '2px')
                    });
                }
            });

            canvas
                .selectAll('circle')
                .data(data)
                .enter()
                .append('circle')
                .attr('cx', function (d) {
                    return d.x * MAP_WIDTH;
                })
                .attr('cy', function (d) {
                    return d.y * MAP_HEIGHT;
                })
                .attr('r', function (d) { return getCircleRadius(d) })
                .attr('id', function (d) { return 'circle_' + d.stage })
                .attr('fill', function (d) {
                    if (mode === "preview") {
                        console.log('preview mode')
                        return getPreviewCircleFillColor(d)
                    }
                    return getCircleFillColor(d)
                })
                .attr('stroke', 'black')
                .attr('stroke-width', '2px')
                .attr('opacity', 0)
                .attr('class', 'circle')

            // initialize begin stage
            d3.select('#circle_begin').attr('opacity', 1).attr('fill', 'white').attr('r', R);
        }
        ,
        getStop: function () {
            return stop_flag;
        },
        setStop: function () {
            stop_flag = true;            //updateMapStage('summit', 'rev_succ', delaybase+1) 
        },
        startPerformMode: function (sname, pname) {  // cs
            if (stop_flag) {
                return;
            }

            var stageDatum = _.find(mapData, { 'stage': sname })

            if (pname === null)
                pname = ''
            var stageChange = pname + '->' + sname;
            journeyRecord.push(stageChange);
            passedRecord.push(sname);

            //  _.find(mapData, { to: pname }).to = '';
            // console.log(mapData)

            console.log('passedRecord:', passedRecord)

            console.log('Journey Record: ' + journeyRecord);

            console.log('current stage name ', sname)
            if (sname === 'summit') {
                var delay = INTERVAL * (delaybase + 3);
            } else {
                var delay = INTERVAL * (delaybase + 6);
            }

            $timeout(function () {
                if (!stop_flag) {
                    d3Service.d3().then(function (d3) {
                        d3.select('#circle_' + sname)
                            .transition()
                            .duration(200)
                            .attr('fill', function () {
                                return getCircleFillColor(stageDatum)
                            })
                            .transition()
                            .duration(200)
                            .attr('fill', function () {
                                if (stageDatum.state === 'active') {
                                    return 'red'
                                } else {
                                    return getCircleFillColor(stageDatum)
                                }
                            })
                    });
                }
            }, delay)

            return $q(function (resolve, reject) {
                if (!stop_flag)
                    setTimeout(function () {
                        resolve(true)
                    }, delay);  // 
            })
        },
        getMapRecord: function () {
            return mapRecord;
        },
        recordMap: function () {
            mapRecord = mapData;
        },
        pastPerfConfig: function () {
            return $q(function (resolve, reject) {
                $http.get('/allPerformances').then(function (data) {
                    var performances = _.sortBy(data.data, 'time').reverse();
                    resolve(performances);
                }), function (err) {
                    reject(err);
                }
            })
        }
        ,
        mapConfig: function (d) {
            return $q(function (resolve, reject) {
                $http.get('maps').then(function (rawdata) {
                    mapData = rawdata.data
                    resolve(mapData);
                }), function (err) {
                    reject(err);
                }
            })
        },
        narrativeConfig: function (d) {
            return $q(function (resolve, reject) {
                $http.get('/fragments/').then(function (rawdata) {
                    narrativeData = rawdata.data
                    resolve(narrativeData);
                }), function (err) {
                    reject(err);
                }
            })
        },
        getNarrativeData: function () {
            return narrativeData;
        },
        getMapData: function () {
            return mapData;
        },
        setMapData: function (d) {
            mapData = d;
        },
        getJourney: function () {
            var journey = [];
            var narrative = '';
            var name = '';

            _.forEach(journeyRecord, function (stageChange) {
                narrative = _.find(narrativeData, { 'stageChange': stageChange })

                if (narrative) {
                    name = _.find(mapData, { 'stage': narrative.to }).name;
                    narrative.stageName = name;
                    journey.push(narrative);
                }
            })
            return journey;
        },
        openToolTip: function (cstage, data) {
            window.navigator.vibrate([200, 100, 200]);

            d3.select('.tool-tip')
                .transition()
                .duration(1000)
                .remove()

            var cData = _.find(mapData, { 'stage': cstage })
            console.log("Data for the current stage: " + JSON.stringify(cData))

            var maxWidth = 200;

            d3.select('d3-map')
                .append('div')
                .attr('class', 'tool-tip')
                .style('max-width', maxWidth + 'px')
                .text(data)
                .style('opacity', 0)

            var str = d3.select('.tool-tip').style('width');
            var substr = str.substring(0, str.length - 2);
            var width = parseFloat(substr)

            str = d3.select('.tool-tip').style('height');
            substr = str.substring(0, str.length - 2);
            var height = parseFloat(substr)

            var windowX = cData.x * MAP_WIDTH - width / 2;
            var windowY = cData.y * MAP_HEIGHT - height - 25;

            d3.select('.tool-tip')
                .style('top', windowY + 'px')
                .style('left', windowX + 'px')
                .transition()
                .duration(1000)
                .style('opacity', 0.8)
        }
    }
}]);
