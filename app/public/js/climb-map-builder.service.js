var visualMapBuilder = angular.module('MuziVisual.visualmapbuilder', []);

visualMapBuilder.factory('visualMapBuilder', ['d3Service', '$timeout', '$q', '$http', function (d3Service, $timeout, $q, $http) {
    console.log('visualMapBuilder');
    var NUM_COLUMN, NUM_ROW, RECT_WIDTH, RECT_HEIGHT;

    var R = 15;
    var mapRecord;
    var mapData;
    var stop_flag;

    function getRectFillColor(d) { // check if its a path or a stage 
         if (d.state === 'rev_succ') {
            return 'orange'
        }
        else if (d.state === 'rev_fail') {
            return 'red'
        }
        else {
            return 'white';
        }
    }

    function getStageOpacity(state) {
        if (state === 'missed') {
            return 0.4;
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
        if (_.includes(d.stage, 'path')) {
            return 10;
        } else if (d.state === 'active') {
            return 20;
        } else {
            return R;
        }
    }

    function getLineOpacity(pstate, cstate) {
        if ((pstate === 'rev_succ' && cstate === 'active') || (pstate === 'rev_fail' && cstate === 'active') || (pstate === 'active' && cstate === 'revealed')) {
            return 1;
        } else {
            return 0; // 
        }
    }

    function updateMapStage(stage, toState, delay) {
        _.find(mapData, { 'stage': stage }).state = toState;

        var data = _.find(mapData, { 'stage': stage });
        var sname = data.name;
        var state = data.state;

        d3Service.d3().then(function (d3) {
            d3.select('#circle_' + stage)
                .transition()
                .delay(delay * INTERVAL)
                .duration(INTERVAL)
                .attr('fill', function () { return getRectFillColor(data) })
                .attr('r', function () { return getCircleRadius(data) })
                .attr('opacity', function () { return getStageOpacity(state) })
        })
    }

    function updateMapLine(p, c, fss, pcstages, delay) {
        var cstage = c.stage;
        var cs = c.state;
        var ps, pstage, fs, fstage;

        d3Service.d3().then(function (d3) {
            if (fss.length > 0) {
                _.forEach(fss, function (f) {
                    fstage = f.stage;
                    fs = f.state;

                    // update lines linking pstage and cstage -> turn solid and change color
                    if (p) {
                        pstage = p.stage;
                        ps = p.state;
                        d3.select('#' + pstage + '_' + cstage)
                            .transition()
                            .delay(INTERVAL * delay)
                            .duration(INTERVAL)
                            .style("stroke-dasharray", ("0, 0"))
                            .attr('opacity', function () { return getLineOpacity(ps, cs) })
                            .attr('stroke', function () { return getLineColor(ps) })
                    }
                    // update lines linking cstage and fstage -> black dotted-line
                    d3.select('#' + cstage + '_' + fstage)
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
                    d3.select('#' + pstage + '_' + pcstage)
                        .transition()
                        .delay(INTERVAL * (delay + 1))
                        .duration(INTERVAL)
                        .attr('opacity', function () { return getLineOpacity(ps, pcstage) })
                })
            }
        });
    }

    return {
        updateMap: function (cstage, pstage) {
            console.log(cstage, pstage);
            var ps = 0, cs = 0, fss = 0, fs = 0, psCues = 0, psCuesWithoutCs = 0, revealeds = [], flist = [];

            // active new path
            cs = _.find(mapData, { 'stage': cstage });
            var cname = cs.name;
            updateMapStage(cstage, 'active', delaybase + 1)

            // turn the previous active stage into past -  succ / fail
            if (pstage) {
                ps = _.find(mapData, { 'stage': pstage });
                updateMapStage(pstage, 'rev_succ', delaybase)

                // ps cue stage
                psCues = ps.cue.split('/');
                psCuesWithoutCs = _.filter(psCues, function (s) { return s !== cstage });

                // get missed stages
                revealeds = _.filter(mapData, { 'state': 'revealed' })
                if (revealeds.length > 0) {
                    _.forEach(revealeds, function (rs) {
                        updateMapStage(rs.stage, 'missed', delaybase + 2)
                    });
                }
            }

            // reveal new stages
            if (cs.cue) {
                fss = _.split(cs.cue, '/');
                _.forEach(fss, function (s) {
                    fs = _.find(mapData, { 'stage': s })
                    flist.push(fs);
                    if (cname === 'begin') {
                        updateMapStage(fs.stage, 'revealed', delaybase + 2)
                    }
                    else {
                        updateMapStage(fs.stage, 'revealed', delaybase + 4)
                    }
                });
            }
            updateMapLine(ps, cs, flist, psCuesWithoutCs, delaybase + 1);
        },
        drawMap: function (canvas, data) {
            console.log('draw map');
            _.forEach(data, function (cStageDatum) {
                if (cStageDatum.stage !== 'end') {
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
                            .attr('fill', function () { return getLineColor(cStageDatum.state) })
                            .attr('opacity', function () {
                                return getLineOpacity(cStageDatum
                                    .state, cueStageDatum.state)
                            })
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
                .attr('r', R)
                .attr('id', function (d) { return 'circle_' + d.stage })
                .attr('opacity', 0)
                .attr('stroke', function (d) {
                    return getLineColor(d.state);
                })
                .attr('fill', function (d) {
                    return getRectFillColor(d);
                })
                .attr('opacity', function (d) { return getStageOpacity(d.state) })
        },
        initMap: function (canvas, data) {
            _.forEach(data, function (cStageDatum) {
                if (cStageDatum.stage !== 'end') {
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
                    return getRectFillColor(d)
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
            var delay = INTERVAL * (delaybase + 6);

            $timeout(function () {
                if (!stop_flag) {
                    d3Service.d3().then(function (d3) {
                        d3.select('#circle_' + sname)
                            .transition()
                            .duration(200)
                            .attr('fill', 'red')
                            .transition()
                            .duration(200)
                            .attr('fill', 'white')
                            .transition()
                            .duration(200)
                            .attr('fill', 'red')
                            .transition()
                            .duration(200)
                            .attr('fill', 'white')

                        d3.select('#visualImg')
                            .attr('src', stageDatum.img)
                            .style('opacity', 0)
                            .transition()
                            .delay(INTERVAL * 1.5)
                            .duration(2500)
                            .style('opacity', 1)
                    });
                }
            }, delay)

            return $q(function (resolve, reject) {
                if (!stop_flag)
                    setTimeout(function () {
                        resolve(true)
                    }, delay + 1500);  // 
            })
        },
        exitPerformMode: function (stageDatum) {
            d3Service.d3().then(function (d3) {
                console.log('fade out animation')
                $timeout(function () { return false; console.log('performMode end') }, INTERVAL * 1.5);  // should be the same with following duration
                d3.select('#visualImg')
                    .style('opacity', 1)
                    .transition()
                    .duration(1500)
                    .style('opacity', 0)
            });

            return $q(function (resolve, reject) {
                setTimeout(function () {
                    resolve(false)
                }, INTERVAL * 1.5)
            })
        },
        getMapRecord: function () {
            return mapRecord;
        },
        setMapRecord: function (d) {
            mapRecord = d;
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
        getMapData: function () {
            return mapData;
        },
        setMapData: function (d) {
            mapData = d;
        }
    }
}]);
