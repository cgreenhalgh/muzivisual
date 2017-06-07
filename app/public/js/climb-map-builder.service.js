var R = 10;
var visualMapBuilder = angular.module('MuziVisual.visualmapbuilder', []);

visualMapBuilder.factory('visualMapBuilder', ['d3Service', '$timeout', '$q', '$http', function (d3Service, $timeout, $q, $http) {
    console.log('visualMapBuilder');
    var mapRecord;
    var mapData;
    var narrativeData;
    var stop_flag;
    var journeyRecord = [];

    function getCircleFillColor(d) { // check if its a path or a stage 
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
            return 'white';
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
        } else if (state === 'rev_fail') {
            return 'red';
        }
        else {
            return 'white';
        }
    }

    function getCircleRadius(d) {
        if (_.head(d.stage) === 'p') {
            return 6;
        } else if (d.state === 'active') {
            return 15;
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
        console.log('update map stage')
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

    function updateMapLinePreMode(p, c, delay) {
        console.log('updateLinePreMode')
        var pstage = p.stage;
        var cstage = c.stage;
        var ps = p.state;
        var cs = c.state;

        d3Service.d3().then(function () {
            d3.select('#' + pstage + '_' + cstage)
                .transition()
                //.delay(INTERVAL * delay)
                //.duration(INTERVAL)
                .style("stroke-dasharray", ("0, 0"))
                .attr('opacity', 1)
                .attr('stroke', 'orange')
        })
    }

    function updateMapLine(p, c, fss, pcstages, delay) {
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

            console.log("lines: ", '#line_' + pstage + '_' + cstage)

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

                console.log("lines: ", '#line_' + cstage + '_' + fstage)
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
        updateMapPreMode: function (cstage, pstage, flag) {
            var ps = 0, cs = 0, fss = 0, fs = 0, psCues = 0, psCuesWithoutCs = 0, revealeds = [], flist = [];

            if (flag === 1) {
                cs = _.find(mapData, { 'stage': cstage });
                updateMapStage(cstage, 'active', delaybase)
            } else {
                cs = _.find(mapData, { 'stage': cstage });
                var cname = cs.name;
                updateMapStage(cstage, 'rev_succ', delaybase)

                // turn the previous active stage into past -  succ / fail
                if (pstage) {
                    ps = _.find(mapData, { 'stage': pstage });
                    //updateMapStage(pstage, 'act', delaybase)

                    // ps cue stage
                    psCues = ps.cue.split('/');
                    psCuesWithoutCs = _.filter(psCues, function (s) { return s !== cstage });

                    // get missed stages
                    revealeds = _.filter(mapData, { 'state': 'revealed' })
                    if (revealeds.length > 0) {
                        _.forEach(revealeds, function (rs) {
                            updateMapStage(rs.stage, 'missed', delaybase)
                        });
                    }
                }
                updateMapLinePreMode(cs, ps, delaybase + 3);
            }
        },
        updateMap: function (cstage, pstage) {
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
                    if (cname === 'basecamp') {
                        updateMapStage(fs.stage, 'revealed', delaybase + 1)
                    }
                    else {
                        updateMapStage(fs.stage, 'revealed', delaybase + 4)
                    }
                });
            }
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
        initMapPreMode: function (canvas, data) {
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
                                return cueStageDatum.stage ? (cStageDatum.stage + '_' + cueStageDatum.stage
                                ) : ('line_' + cStageDatum.stage)
                            })
                            .style("stroke-dasharray", ("6, 6"))
                            .attr('stroke', 'white')
                            .attr('opacity', 1)
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
                .attr('r', function (d) { return 5 })
                .attr('id', function (d) { return 'circle_' + d.stage })
                .attr('fill', function (d) {
                    return getCircleFillColor(d)
                })
                .attr('stroke', 'black')
                .attr('stroke-width', '2px')
                .attr('opacity', 1)

            // initialize begin stage
            d3.select('#circle_begin').attr('opacity', 1).attr('fill', 'white').attr('r', R);
        },
        initMap: function (canvas, data) {
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
                            .attr('stroke', 'white')
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
                    return getCircleFillColor(d)
                })
                .attr('stroke', 'black')
                .attr('stroke-width', '2px')
                .attr('opacity', 0)

            // initialize begin stage
            d3.select('#circle_begin').attr('opacity', 1).attr('fill', 'white').attr('r', R);
        }
        ,
        getStop: function () {
            return stop_flag;
        },
        setStop: function () {
            stop_flag = true;
        },
        startPerformMode: function (sname) {  // cs
            var stageDatum = _.find(mapData, { 'stage': sname })

            //PreMode
            if (PRE_REVEAL_MODE) {
                var delay = INTERVAL * (delaybase + 2);
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
                            .duration(100)
                            .attr('fill', function () {
                                if (stageDatum.state === 'active') {
                                    return 'red'
                                } else {
                                    return getCircleFillColor(stageDatum)
                                }
                            })
                        // .transition()
                        // .duration(200)
                        // .attr('fill', 'white')
                        // .transition()
                        // .duration(200)
                        // .attr('fill', 'red')
                        // .transition()
                        // .duration(200)
                        // .attr('fill', 'white')

                        // d3.select('#visualImg')
                        //     .attr('src', stageDatum.img)
                        //     .style('opacity', 0)
                        //     .transition()
                        //     .delay(INTERVAL * 1.5)
                        //     .duration(2500)
                        //     .style('opacity', 1)
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
        exitPerformMode: function (stage) {
            d3Service.d3().then(function (d3) {
                //console.log('fade out animation')
                var record = _.find(mapData, { 'stage': stage });
                journeyRecord.push(record);
                // $timeout(function () { return false; console.log('performMode end') }, INTERVAL * 0.5);  // should be the same with following duration
                // d3.select('#visualImg')
                //     .style('opacity', 1)
                //     .transition()
                //     .duration(1500)
                //     .style('opacity', 0)
            });


            console.log('new status saved' + stage);

            return $q(function (resolve, reject) {
                // setTimeout(function () {
                resolve(false)
                // }, INTERVAL * 1.5)
            })
        },
        getMapRecord: function () {
            return mapRecord;
        },
        recordMap: function () {
            mapRecord = mapData;
        },
        mapConfig: function (d) {
            return $q(function (resolve, reject) {
                $http.get('/maps').then(function (rawdata) {
                    mapData = rawdata.data
                    resolve(mapData);
                }), function (err) {
                    reject(err);
                }
            })
        },
        narrativeConfig: function (d) {
            return $q(function (resolve, reject) {
                $http.get('/fragments').then(function (rawdata) {
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
        getVisual: function (cstage) {
            var datum = _.find(mapData, { 'stage': cstage })
            console.log(datum)
            var visual = datum.visual;
            var img = datum.img;
            visual.push(img);
            return visual;
        },
        getJourney: function () {
            return journeyRecord;
        }
    }
}]);
