var R = 12;
var visualMapBuilder = angular.module('MuziVisual.visualmapbuilder', []);

visualMapBuilder.factory('visualMapBuilder', ['d3Service', '$timeout', '$q', '$http', '$location', function (d3Service, $timeout, $q, $http, $location) {
    console.log('visualMapBuilder');
    var MAP_WIDTH, MAP_HEIGHT;
    var recordMap;
    var mapData;
    var narrativeData;
    var pperfData = null; // pperf does not exist
    var journeyRecord = [];
    var passedRecord = [];
    var lastMapRecorder = [];
    var performanceid;
    var performing = false;

    function pastPerfConfig() {
        return $q(function (resolve, reject) {
            $http.get('allPerformances').then(function (d) {
                var performances = _.sortBy(d.data, 'time').reverse();
                console.log('getPastPerfs:', performances)
                if (performances) {
                    resolve(performances);
                } else {
                    resolve(null);
                }
            }), function (err) {
                alert('Missing data files for past performances (performance.json & performance_metadata.json)')
                reject(err);
            }
        })
    }

    function mapConfig(d) {
        return $q(function (resolve, reject) {
            $http.get('maps').then(function (rawdata) {
                resolve(rawdata.data);
            }), function (err) {
                reject(err);
            }
        })
    }

    function narrativeConfig(d) {
        return $q(function (resolve, reject) {
            $http.get('fragments/').then(function (rawdata) {
                resolve(rawdata.data);
            }), function (err) {
                reject(err);
            }
        })
    }

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
        setMapSize(mw, mh) {
            MAP_WIDTH = mw;
            MAP_HEIGHT = mh;
        },
        setPerfId: function (id) {
            performanceid = id;
        },
        getPerfId: function () {
            if (!performanceid) {
                performanceid = $location.search()['p'];
                console.log("get perf id: ", performanceid
                )
                return performanceid;
            }
            return performanceid;
        },
        getPerfStatus: function () {
            return performing;
        },
        setPerfStatus: function (d) {
            performing = d;
        },
        getPastPerf: function (index) {
            return pperfData[index - 1];
        },
        getPassedRecord: function () {
            return passedRecord;
        },
        drawPreviewMap: function () {
            d3Service.d3().then(function (d3) {
                d3.selectAll('line').transition().duration(500).attr('opacity', 1)

                d3.selectAll('circle').transition().duration(500).attr('opacity', 1)
            })
        },
        updateMap: function (cstage, pstage) {
            console.log(cstage, pstage);

            if (pstage == 'summit') {
                updateMapStage(pstage, 'rev_succ', 0);
                return;
            }

            var ps = 0, cs = 0, fss = 0, fs = 0, psCues = 0, psCuesWithoutCs = 0, revealeds = [], flist = [];

            // active new path
            cs = _.find(mapData, { 'stage': cstage });
            var cname = cs.name;
            updateMapStage(cstage, 'active', delaybase)


            if (pstage) {
                // turn the previous active stage into past -  succ / fail

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
                .attr('opacity', 0)
                .attr('stroke', 'orange')
                .attr('fill', 'orange')
                .attr('opacity', 1)
        },
        drawPastMap: function (msgs, perfIndex) {
            var pjourney = [];
            var narrative = '';
            var name = '';
            _.forEach(msgs, function (m) {
                var msg = JSON.parse(m)

                var msgData = _.split(msg.data, ':');
                var stages = _.split(msgData[1], '->')
                narrative = _.find(narrativeData, { 'stageChange': msgData[1] })

                if (narrative) {
                    name = _.find(mapData, { 'stage': narrative.from }).name;
                    narrative.stageName = name;
                    pjourney.push(narrative);
                    if (narrative.to === 'summit') {
                        narrative = {}
                        narrative.stageName = 'Summit';
                        pjourney.push(narrative);
                    }
                }

                var cid;
                if (msg.name === "vStop") {
                    cid = "#circle_summit"
                    draw(cid);
                } else if (stages[0]) {
                    cid = '#circle_' + stages[0];
                    draw(cid);
                }

                if (!stages[1]) {
                    return;
                }
                var lid = '#line_' + stages[0] + '_' + stages[1];
                draw(lid);
            });

            function draw(cid) {
                d3Service.d3().then(function (d3) {
                    d3.select(cid).transition().duration(400).attr('opacity', 1)
                })
            }

            return pjourney;
        },
        drawCurrentMap: function (stages) {
            var cid;

            var i = 0;
            var lid;
            var lids = [];
            while (i < stages.length) {
                lid = '#line_' + stages[i] + '_' + stages[i + 1];
                i++;
                lids.push(lid)
            }

            d3Service.d3().then(function () {
                _.forEach(stages, function (stage) {
                    cid = '#circle_' + stage;
                    d3.select(cid).transition().duration(400).attr('opacity', 1).style('filter', "url(#glow)").attr('fill', 'orange').style('z-index', 200)
                })

                _.forEach(lids, function (lid) {
                    d3.select(lid).transition().duration(200).attr('opacity', 1).style('filter', "url(#glow)").attr('stroke', 'orange').style('z-index', 400).style('stroke-dasharray', ("0", "0"))
                })
            })
        },
        initMap: function () {
            console.log("initmap")
            var mode = 'perf'
            d3Service.d3().then(function (d3) {
                d3.select('#visualImg').style('width', '100%')
                    .style('max-height', MAP_HEIGHT + 'px')
                d3.select('#bg-img').style('width', '100%')
                    .style('max-height', MAP_HEIGHT + 'px')
                var canvas = d3.select('#map-container');

                var defs = canvas.append("defs");

                //Filter for the outside glow
                var filter = defs.append("filter")
                    .attr("id", "glow");
                filter.append("feGaussianBlur")
                    .attr("stdDeviation", "4")
                    .attr("result", "coloredBlur");
                var feMerge = filter.append("feMerge");
                feMerge.append("feMergeNode")
                    .attr("in", "coloredBlur");
                feMerge.append("feMergeNode")
                    .attr("in", "SourceGraphic");

                _.forEach(mapData, function (cStageDatum) {
                    if (cStageDatum.stage !== 'summit') {
                        // get all the cues of this stage
                        var cueList = _.split(cStageDatum.cue, '/');
                        var cueStageDatum;
                        _.forEach(cueList, function (cueStage) {
                            cueStageDatum = _.find(mapData, { 'stage': _.trim(cueStage) });

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
                    .data(mapData)
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
            });
            return $q(function (resolve, rej) {
                resolve(true)
            })
        },
        startPerformMode: function (sname, pname) {  // cs

            var stageDatum = _.find(mapData, { 'stage': sname })

            if (pname === null)
                pname = ''
            var stageChange = pname + '->' + sname;

            if (!_.includes(journeyRecord, stageChange)) {
                journeyRecord.push(stageChange);
                console.log('Journey Record: ' + journeyRecord);
            }

            if (!_.includes(passedRecord, sname)) {
                passedRecord.push(sname);
                console.log('passedRecord:', passedRecord)
            }

            if (sname === 'summit') {
                var delay = INTERVAL * (delaybase + 3);
            } else {
                var delay = INTERVAL * (delaybase + 6);
            }

            $timeout(function () {
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
            }, delay)

            return $q(function (resolve, reject) {
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
        loadData: function () {
            if (mapData && narrativeData) {
                return $q(function (res, rej) {
                    res(true)
                });
            }
            else {
                return $q(function (res, rej) {
                    console.log('Load data...')
                    mapConfig().then(function (mapd) {
                        console.log('Load mapdata:', mapd);
                        mapData = mapd;
                        narrativeConfig().then(function (nd) {
                            console.log('Narrative data:', nd);
                            narrativeData = nd;
                            pastPerfConfig().then(function (ppd) {
                                pperfData = ppd;
                                console.log('Past Perf data:', ppd);
                                if (mapData && narrativeData) {
                                    res(true);
                                } else {
                                    rej(true)
                                }
                            })
                        })
                    })
                })
            }
        },
        getPPerfData: function () {
            return pperfData;
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
