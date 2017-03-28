var visualMapBuilder = angular.module('MuziVisual.visualmapbuilder', []);

visualMapBuilder.factory('visualMapBuilder', ['d3Service', '$timeout', '$q', function (d3Service, $timeout, $q) {
    console.log('visualMapBuilder');
    var NUM_COLUMN, NUM_ROW, RECT_WIDTH, RECT_HEIGHT;
    var INI_X, RECT_X, INI_Y, RECT_Y, TEXT_X, TEXT_Y, X_OFFSET, Y_OFFSET, LEFT_X;
    // DISPLAY config
    RECT_WIDTH = MAP_WIDTH / (NUM_COLUMN * 2);
    RECT_HEIGHT = MAP_HEIGHT / (NUM_ROW * 2);

    function getRectFillColor(stage) { // check if its a path or a stage 
        if (stage.stage.indexOf('path') > 0) {
            return '#C5C9FF';  // blue
        } else if (stage.state === 'active') {
            return 'black';
        } else {
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
            return 'green';
        } else if (state === 'rev_fail') {
            return 'red';
        }
        else {
            return 'black';
        }
    }

    function getTextColor(state) {
        if (state === 'rev_succ') {
            return 'green';
        } else if (state === 'rev_fail') {
            return 'red';
        }
        else if (state === 'revealed' || state === 'missed') {
            return 'black';
        } else {
            return 'white';
        }
    }

    function getLineOpacity(pstate, cstate) {
        if ((pstate === 'rev_succ' && cstate === 'active') || (pstate === 'rev_fail' && cstate === 'active') || (pstate === 'active' && cstate === 'revealed')) {
            return 1;
        } else {
            return 0; // should be 0
        }
    }

    function mapConfig() {
        RECT_WIDTH = MAP_WIDTH / (NUM_COLUMN * 2);
        RECT_HEIGHT = MAP_HEIGHT / (NUM_ROW * 2);

        INI_Y = RECT_Y = MAP_HEIGHT * 0.1;
        X_OFFSET = MAP_WIDTH / NUM_COLUMN;
        Y_OFFSET = MAP_HEIGHT * 0.8 / NUM_ROW;
        LEFT_X = MAP_WIDTH / (NUM_COLUMN * 2) - RECT_WIDTH / 2;
    }

    var updateMapLine = function updateMapLine(p, c, fss, pcstages, delay) {
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

    var updateMapStage = function updateMapStage(stage, delay) {
        var sname = stage.stage;
        var state;
        if (_.indexOf(sname) === 'path') {
            state = 'path';  // speical 
        } else {
            state = stage.state;
        }

        d3Service.d3().then(function (d3) {
            // update rect
            d3.select('#rect_' + sname)
                .transition()
                .delay(delay * INTERVAL)
                .duration(INTERVAL)
                .attr('fill', function () { return getRectFillColor(stage) })
                .attr('stroke', function () { return getLineColor(state) })
                .attr('opacity', function () { return getStageOpacity(state) })

            // update text
            d3.select('#' + sname)
                .transition()
                .delay(delay * INTERVAL)
                .duration(INTERVAL)
                .text(function () { return stage.name })
                .attr('fill', function () { return getTextColor(state) })
                .attr('opacity', function () { return getStageOpacity(state) })
        })
    }

    return {
        updateMapStage,
        updateMapLine,
        dataProcess: function (d) {
            // process data - add postion on the map and ordered
            // EXTRACT INFO FROM DATA 
            // get normal stages (except bc and summit)
            var stages = _.remove(d, function (n) {
                if (n.stage === 'end' || n.stage === 'begin')
                    return false;
                return true;
            })

            // collect path names to help sort stages i.e. a, b, c...
            var pathCode = _.orderBy(_.uniq(_.map(stages, function (o) { return _.head(o.stage); })));
            NUM_COLUMN = pathCode.length; // column of the map
            NUM_ROW = 0;

            // sort normal stages by path and stage number in desc order
            // sample: [[a2,a1],[b2,b1],[c2,c1]]
            var pathStageContainer = [];
            _.forEach(pathCode, function (obj) {
                var spePath = _.filter(stages, function (o) { return _.head(o.stage) == obj; });
                var orderedSpePath = _.orderBy(spePath, ['stage'], ['desc']);
                var pathHeight = orderedSpePath.length + 2;
                // get the maximum stages in one path as the NUM_ROW
                pathHeight > NUM_ROW ? NUM_ROW = pathHeight : 0;
                pathStageContainer.push(orderedSpePath);
            });

            var data = []; // data contains data with x, y and are ordered
            var length = 0;
            var pathData;
            var i = 0;
            var j = 0;

            // DATA PROCESS 
            // data are processed seperately: summit + normal stages + basecamp
            var summitData = _.find(d, { 'stage': 'end' });
            // if the summit exists, draw summit
            if (summitData.img) {
                summitData.x = (NUM_COLUMN - 1) / 2;
                summitData.y = 0;
                summitData = _.castArray(summitData);
                data = summitData;
            }

            _.forEach(pathStageContainer, function (pathData) {
                _.forEach(pathData, function (o) {
                    if (_.isObject(o)) {
                        o.x = i;
                        o.y = j + 1;
                        j++;
                    }
                });
                j = 0;
                i++;
                data = _.concat(data, pathData);
            });

            var bcData = _.find(d, { 'stage': 'begin' });
            // change state for the basecamp and its subsequent stage
            bcData.state = "active";
            var cueList = _.split(bcData.cue, '/');
            _.forEach(cueList, function (cue) {
                var stage = _.find(data, { stage: cue });
                stage.state = "revealed";
            });

            bcData.x = (NUM_COLUMN - 1) / 2;
            bcData.y = NUM_ROW - 1;
            bcData = _.castArray(bcData);
            data = _.concat(data, bcData);

            mapConfig();
            return data;
        },
        initMap: function initMap(canvas, data) {
            _.forEach(data, function (cStageDatum) {
                if (cStageDatum.stage !== 'end') {
                    // get all the cues of this stage
                    var cueList = _.split(cStageDatum.cue, '/');
                    var cueStageDatum;
                    _.forEach(cueList, function (cueStage) {
                        cueStageDatum = _.find(data, { 'stage': _.trim(cueStage) });
                        canvas
                            .append('line')
                            .attr("x1", function () { return LEFT_X + cStageDatum.x * X_OFFSET + RECT_WIDTH / 2 })
                            .attr("y1", function () { return INI_Y + cStageDatum.y * Y_OFFSET + RECT_HEIGHT / 2 })
                            .attr("x2", function () { return LEFT_X + cueStageDatum.x * X_OFFSET + RECT_WIDTH / 2 })
                            .attr("y2", function () { return INI_Y + cueStageDatum.y * Y_OFFSET + RECT_HEIGHT / 2 })
                            .attr("id", function () {
                                return cueStageDatum.stage ? (cStageDatum.stage + '_' + cueStageDatum.stage
                                ) : ('line_' + cStageDatum.stage)
                            })
                            .attr('fill', 'black')
                            .attr('opacity', 0)
                            .attr('stroke-width', '2px')
                    });
                }
            });

            var center;
            var minWidth = RECT_HEIGHT * 3;
            canvas
                .selectAll('rect')
                .data(data)
                .enter()
                .append('rect')
                .attr('x', function (d) { // make sure the rect always big enough to wrap the stage names
                    if (RECT_WIDTH >= minWidth)
                        return LEFT_X + d.x * X_OFFSET
                    else {
                        center = LEFT_X + d.x * X_OFFSET + RECT_WIDTH / 2;
                        return (center - minWidth / 2); // new LEFT
                    }
                })
                .attr('y', function (d) { return INI_Y + d.y * Y_OFFSET })
                .style('width', function () {
                    return RECT_WIDTH < minWidth ? minWidth : RECT_WIDTH
                })
                //  .style('class', 'rect')
                .attr('height', RECT_HEIGHT)
                .style('min-width', RECT_HEIGHT * 5)
                .attr('id', function (d) { return 'rect_' + d.stage })
                .attr('stroke-width', '2px')
                .attr('stroke', 'black')
                .attr('fill', function (d) {
                    return getRectFillColor(d)
                })
                .attr('opacity', 0)

            canvas
                .selectAll('text')
                .data(data)
                .enter()
                .append('text')
                .text(function (d) { return d.name })
                .attr('x', function (d) { return LEFT_X + d.x * X_OFFSET + RECT_WIDTH / 2 })
                .attr('y', function (d) { return INI_Y + d.y * Y_OFFSET + RECT_HEIGHT / 1.5 })
                .attr('id', function (d) { return d.stage })
                .attr('text-anchor', 'middle')
                .attr('font-size', function () { return RECT_HEIGHT / 2 })
                .attr('fill', 'black')
                .attr('opacity', 0)
        },
        startPerformMode: function (stageDatum) {  // cs
            console.log(secbase);
            var sname = stageDatum.stage;
            var delay = INTERVAL * (secbase + 6);

            $timeout(function () {
                d3Service.d3().then(function (d3) {
                    d3.select('#' + sname)
                        .transition()
                        .duration(200)
                        .attr('fill', 'black')
                        .transition()
                        .duration(200)
                        .attr('fill', 'white')
                        .transition()
                        .duration(200)
                        .attr('fill', 'black')
                        .transition()
                        .duration(200)
                        .attr('fill', 'white')

                    d3.select('#rect_' + sname)
                        .transition()
                        .duration(200)
                        .attr('fill', 'white')
                        .transition()
                        .duration(200)
                        .attr('fill', 'black')
                        .transition()
                        .duration(200)
                        .attr('fill', 'white')
                        .transition()
                        .duration(200)
                        .attr('fill', 'black')

                    d3.select('#visualImg')
                        .attr('src', stageDatum.img)
                        .style('opacity', 0)
                        .transition()
                        .delay(INTERVAL * 1.5)
                        .duration(2500)
                        .style('opacity', 1)
                });
            }, delay)

            return $q(function (resolve, reject) {
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
    }
}]);
