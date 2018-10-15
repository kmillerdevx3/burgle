'use strict';

var Burgle = (function () {
    var _showHeatmap = false,
        _floors = 3,
        _size = 4,
        _walls = 8,
        _shaft = -1,
        _size_sq = _size * _size,
        _defaultFloor0 = undefined,
        _defaultFloor1 = undefined,
        _defaultFloor2 = undefined;

    var _getRootLink = function () {
        var link = window.location.protocol + '//' + window.location.hostname;

        if (window.location.port) {
            link += ':' + window.location.port;
        }

        link += window.location.pathname;

        return link;
    }

    var _getTargetUrl = function (job, showHeatmap, shaft, floor0, floor1, floor2) {
        var link = _getRootLink() + '?';

        link += 'job=' + job;

        if (showHeatmap) {
            link += '&heat=on';
        }

        if (shaft > -1) {
            link += '&s=' + shaft.toString(36);
        }

        link += '&f0=' + floor0 + '&f1=' + floor1;

        if (!!floor2) {
            link += '&f2=' + floor2;
        }

        return link;
    }

    var _updateDefault = function () {
        var linkElement = document.getElementById('burgle_default_href');

        if (!!_defaultFloor0) {
            var job = document.getElementById('job').selectedIndex;
            linkElement.href = _getTargetUrl(job, _showHeatmap, _shaft, _defaultFloor0, _defaultFloor1, _defaultFloor2);
            linkElement.removeAttribute('class');
        } else {
            linkElement.setAttribute('class', 'hidden');
        }
    }

    var _getParameterByName = function (name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');

        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
            results = regex.exec(location.search);

        return !results ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    var _updateDistance = function (a_ind, b_ind, dist) {
        if (a_ind === _shaft || b_ind === _shaft) {
            return;
        }

        var a = a_ind * _size_sq;
        var b = b_ind * _size_sq;

        for (var i = 0; i < _size_sq; i++) {
            if (dist[a] < dist[b]) {
                dist[b] = dist[a] + 1;
            } else if (dist[b] < dist[a]) {
                dist[a] = dist[b] + 1;
            }

            a++;
            b++;
        }
    }

    var _buildDistance = function (floor) {
        var i;
        var dist = new Array(_size_sq * _size_sq + 1).join(1).split('').map(function () {
            return 50
        });

        for (i = 0; i < _size_sq; i++) {
            dist[i * _size_sq + i] = 0;
        }

        for (var r = 0; r < _size_sq; r++) {
            for (i = 0; i < _size_sq; i++) {
                if (floor[i].n) {
                    _updateDistance(i, i - _size, dist);
                }

                if (floor[i].e) {
                    _updateDistance(i, i + 1, dist);
                }

                if (floor[i].s) {
                    _updateDistance(i, i + _size, dist);
                }

                if (floor[i].w) {
                    _updateDistance(i, i - 1, dist);
                }
            }
        }

        return dist;
    }

    var _updateDom = function () {
        var floorElem = document.getElementById('floors');

        while (floorElem.lastChild) {
            floorElem.removeChild(floorElem.lastChild);
        }

        var cols = _size * 2 - 1;

        for (var f = 0; f < _floors; f++) {
            var id = 'f' + f;

            var container = document.createElement('div');
            container.setAttribute('class', 'floorContainer');

            var floor = document.createElement('div');
            floor.setAttribute('class', (_size == 5 ? 'knox' : 'bank') + ' floor');
            floor.setAttribute('id', id);

            var table = document.createElement('table');
            var wall = 0;

            for (var i = 0; i < cols; i++) {
                var row = document.createElement('tr');
                for (var j = 0; j < cols; j++) {
                    var td = document.createElement('td');

                    if (i % 2 === 0 && j % 2 === 0) {
                        td.className = 'tile';
                        td.setAttribute('id', id + '_t' + (i / 2 * _size + (j / 2)));
                    }

                    if (i % 2 === 0 ? j % 2 != 0 : j % 2 === 0) {
                        td.setAttribute('id', id + '_' + wall++);
                    }

                    row.appendChild(td);
                }

                table.appendChild(row);
            }

            floor.appendChild(table);

            var btn = document.createElement('button');
            btn.setAttribute('class', 'center');
            btn.setAttribute('onClick', 'Burgle.generate("' + id + '")');
            btn.appendChild(document.createTextNode('Generate Floor ' + (f + 1) + '.'));

            container.appendChild(floor);
            container.appendChild(btn);
            floorElem.appendChild(container);
        }
    }

    var _updateHref = function () {
        var job = document.getElementById('job').selectedIndex;
        var floors = document.getElementsByClassName('floor');
        var floor0 = floors[0].getAttribute('layout');
        var floor1 = floors[1].getAttribute('layout');
        var floor2 = floors[2].getAttribute('layout');

        document.getElementById('burgle_href').href = _getTargetUrl(job, _showHeatmap, _shaft, floor0, floor1, floor2);
    }

    var _updateJob = function () {
        var job = document.getElementById('job');
        var info = job.options[job.selectedIndex].value.split(':');

        _floors = parseInt(info[0]);
        _size = parseInt(info[1]);
        _walls = parseInt(info[2]);

        _defaultFloor0 = info[3];
        _defaultFloor1 = info[4];
        _defaultFloor2 = info[5];

        _shaft = -1;
        _size_sq = _size * _size;

        _updateDefault();
        _updateDom();
    }

    var wallsToString = function (walls) {
        var val = 0,
            j = (walls.length - 1) % 5,
            str = '';

        for (var i = walls.length - 1; i >= 0; i--) {
            if (!!walls[i]) {
                val |= (1 << j);
            }

            j--;

            if (j < 0) {
                str += val.toString(32);
                val = 0;
                j = 4;
            }
        }

        return str;
    }

    var parseWalls = function (str) {
        var walls = [],
            i = str.length,
            val, j;

        while (i--) {
            val = parseInt(str[i], 32);

            for (j = 0; j < 5; j++) {
                walls.push(!!(val & (1 << j)));
            }
        }

        return walls;
    }

    var toFloor = function (walls) {
        var i = 0, x = 0;
        var floor = new Array(_size_sq + 1).join(1).split('').map(function () {
            return { heat: 0 }
        });
        for (var y = 0; y < _size; y++) {
            for (x = 0; x < _size - 1; x++) {
                if (!walls[i]) {
                    floor[y * _size + x].e = true;
                    floor[y * _size + x + 1].w = true;
                }
                i++;
            }
            if (y < _size - 1) {
                for (x = 0; x < _size; x++) {
                    if (!walls[i]) {
                        floor[y * _size + x].s = true;
                        floor[(y + 1) * _size + x].n = true;
                    }
                    i++;
                }
            }
        }
        return floor;
    }

    var isValid = function (floor) {
        var check = [_shaft == 0 ? 1 : 0];
        var visited = 0;
        if (_shaft > -1) {
            floor[_shaft].v = true;
            visited++;
        }
        while (check.length > 0) {
            var next = check.pop();
            var tile = floor[next];
            if (tile.v)
                continue;
            visited++;
            tile.v = true;
            if (tile.n)
                check.push(next - _size);
            if (tile.e)
                check.push(next + 1);
            if (tile.s)
                check.push(next + _size);
            if (tile.w)
                check.push(next - 1);
        }
        return visited === _size_sq;
    }

    //from: index of tile
    //to: index of tile
    //options: array of [radians, neighbor's index]
    var findClockwise = function (from, to, options) {
        var dy = Math.floor(to / _size) - Math.floor(from / _size);
        var dx = to % _size - from % _size;
        var target = Math.atan2(dy, dx);
        var max = 0;
        var dir;
        for (var i = 0; i < options.length; i++) {
            var o = options[i];
            var r = o[0] - target;
            if (r < 0)
                r += 2 * Math.PI;
            if (r > max) {
                max = r;
                dir = o[1];
            }
        }
        return dir;
    }

    var _walk = function (from, to, floor, dist) {
        if (from === _shaft || to === _shaft) return;

        var min, shortest = [], tile;

        function look(dir, neighbor, r) {
            var ind = neighbor * _size_sq + to;
            if (tile[dir]) {
                if (dist[ind] < min) {
                    shortest = [[r, neighbor]];
                    min = dist[ind];
                }
                else if (dist[ind] === min) {
                    shortest.push([r, neighbor]);
                }
            }
        }

        while (from !== to) {
            min = 50;
            tile = floor[from];
            look('n', from - _size, Math.PI * -.5);
            look('e', from + 1, 0);
            look('s', from + _size, Math.PI * .5);
            look('w', from - 1, Math.PI);
            var next = shortest.length > 1 ? findClockwise(from, to, shortest) : shortest[0][1];
            floor[next].heat++;
            from = next;
        }
    }

    var _generateHeatmap = function (id, floor, show) {
        var i, j, heat = [];
        if (!show) {
            for (i = 0; i < _size_sq; i++) {
                document.getElementById(id + '_t' + i).style.backgroundColor = '';
            }
            return;
        }

        var dist = _buildDistance(floor);
        for (i = 0; i < _size_sq; i++) {
            for (j = 0; j < _size_sq; j++) {
                _walk(i, j, floor, dist);
            }
        }
        for (i = 0; i < _size_sq; i++) {
            if (i !== _shaft) {
                heat = (1.0 - (floor[i].heat - (_size_sq - 1)) / 168) * 240;
                document.getElementById(id + '_t' + i).style.backgroundColor = 'hsl(' + heat + ',100%,50%)';
            }
        }
        if (_shaft > -1) {
            //When regenerating a level and changing the location of the shaft, if there was a heatmap, a backgroundColor will exist for the new location
            document.getElementById(id + '_t' + _shaft).style.backgroundColor = '';
        }
        heat = [];
        for (var y = 0; y < _size; y++) {
            var r = [];
            for (var x = 0; x < _size; x++) {
                r.push(floor[y * _size + x].heat);
            }
            heat.push(r);
        }
        var total_heat = 0;
        for (i = 0; i < _size_sq; i++) {
            total_heat += floor[i].heat;
        }
    }

    var _setLayout = function (id, walls) {
        var floor = toFloor(walls);
        if (!isValid(floor))
            return false;
        var f = document.getElementById(id);
        f.setAttribute('layout', wallsToString(walls));
        if (_shaft > -1) {
            document.getElementById(id + '_t' + _shaft).className = 'shaft';
        }
        for (var w = 0; w < _size * (_size - 1) * 2; w++) {
            document.getElementById(id + '_' + w).className = walls[w] ? 'wall' : '';
        }
        _generateHeatmap(id, floor, _showHeatmap);
        return true;
    }

    var getWalls = function (tile) {
        var dec = _size - 1,
            max = 2 * _size * dec,
            off = tile % _size,
            row = Math.floor(tile / _size) * (_size + dec),
            ind = row + off,
            val = [];
        if (off > 0) val.push(ind - 1);
        if (off < dec) val.push(ind);
        if (ind >= _size + dec) val.push(ind - _size);
        if (ind + dec < max) val.push(ind + dec);
        return val;
    }

    var generate = function (id) {
        var floors;
        var max = 2 * _size * (_size - 1);
        var permanent_walls = [];
        var shaft_walls = [];
        if (id === undefined || id === 'all') {
            floors = document.getElementsByClassName('floor');
            if (_size === 5) {
                if (_shaft > -1) {
                    for (var f = 0; f < floors.length; f++) {
                        var id = floors[f].getAttribute('id');
                        document.getElementById(id + '_t' + _shaft).className = 'tile';
                    }
                }
                _shaft = Math.floor(Math.random() * _size_sq);
            }
        }
        else {
            floors = [document.getElementById(id)];
        }
        if (_shaft > -1) {
            shaft_walls = getWalls(_shaft);
            shaft_walls.forEach(function (w) {
                permanent_walls[w] = true;
            });
        }
        for (var f = 0; f < floors.length; f++) {
            var id = floors[f].getAttribute('id');
            while (true) {
                var wall = permanent_walls.slice();
                for (var w = 0; w < _walls;) {
                    var n = Math.floor(Math.random() * max);
                    if (!wall[n]) {
                        w++;
                        wall[n] = true;
                    }
                }
                shaft_walls.forEach(function (w) {
                    wall[w] = false;
                });
                if (_setLayout(id, wall)) {
                    break;
                }
            }
        }
        _updateHref();
    }

    var setDims = function (opt) {
        _size = opt.size;
        _shaft = opt.shaft;
        _size_sq = _size * _size;
    }

    var newJob = function () {
        _updateJob();
        generate();
    }

    var showHeat = function (show) {
        _showHeatmap = show;

        var floors = document.getElementsByClassName('floor');
        for (var f = 0; f < floors.length; f++) {
            var layout = floors[f].getAttribute('layout');
            if (layout !== null) {
                var floor = toFloor(parseWalls(layout));
                _generateHeatmap(floors[f].getAttribute('id'), floor, show);
            }
        }
        _updateHref();
    }

    var init = function () {
        var j = _getParameterByName('job');
        if (j !== '') document.getElementById('job').options[j].selected = true;
        _updateJob();
        var s = _getParameterByName('s');
        if (s !== '') _shaft = parseInt(s, 36);
        var heatmap = false;
        if (_getParameterByName('heat') !== '') {
            heatmap = true;
            var heat = document.getElementById('burgle_heat');
            if (heat !== null) heat.checked = heatmap;
        }
        var haveFloorsInUrl = false;
        var floors = document.getElementsByClassName('floor');
        for (var f = 0; f < floors.length; f++) {
            var layout = _getParameterByName(floors[f].getAttribute('id'));
            if (layout) {
                _setLayout(floors[f].getAttribute('id'), parseWalls(layout));
                haveFloorsInUrl = true;
            }
        }
        if (!haveFloorsInUrl)
            generate();
        else
            showHeat(heatmap);
    }

    var toggleHeatmap = function () {
        var ck = document.getElementById('toggle_heatmap').checked;
        showHeat(ck);
    }

    return {
        findClockwise: findClockwise,
        generate: generate,
        getWalls: getWalls,
        init: init,
        newJob: newJob,
        parseWalls: parseWalls,
        toggleHeatmap: toggleHeatmap,
        toFloor: toFloor,
        isValid: isValid,
        wallsToString: wallsToString,
        setDims: setDims
    }
})();
module.exports = Burgle;
