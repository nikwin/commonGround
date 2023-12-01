/*jshint -W099*/

function setupCanvas(canvas) {
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

var canvas = document.getElementById('canvas');

var width = canvas.width;
var height = canvas.height;

var ctx = setupCanvas(canvas);

var FORCE_TICK_TIME = false;

var GAMEWIDTH = width;
var GAMEHEIGHT = height;

var DEBUG_MODE = false;

var max = function(a, b){return (a > b) ? a : b;};
var min = function(a, b){return (a < b) ? a : b;};

var d2 = function(p1, p2){
    var x, y;
    x = p1[0] - p2[0];
    y = p1[1] - p2[1];
    return x*x + y*y;
};

var FPS_CAP = 60;

window.requestAnimFrame = (function(){
    return window.requestAnimationFrame || 
        window.webkitRequestAnimationFrame || 
	window.mozRequestAnimationFrame    || 
	window.oRequestAnimationFrame      || 
	window.msRequestAnimationFrame     || 
	function(callback, element){
            window.setTimeout(callback, 1000 / FPS_CAP);
        };
})();

var bindHandler = (function(){
    var FunctionGroup = function(){
	this.clear();
    };
    FunctionGroup.prototype.clear = function(){
	var oldSet = {
	    functions: this.functions,
	    flipped: this.flipped
	};
	this.functions = {'down': [],
			  'up': [],
			  'move': []};
	this.flipped = {'down': [],
			'up': [],
			'move': []};
	return oldSet;
    };
    FunctionGroup.prototype.reset = function(oldSet){
	this.functions = oldSet.functions;
	this.flipped = oldSet.flipped;
    };
    FunctionGroup.prototype.run = function(key, e){
	var anyTrue = false;
	for (var i = 0; i < this.functions[key].length; i++){
	    if (this.functions[key][i](e)){
		anyTrue = true;
	    }
	}
	return anyTrue;
    };
    FunctionGroup.prototype.flip = function(functionDict){
	if (functionDict === undefined){
	    this.functions = this.flipped;
	}
	else{
	    this.flipped = this.functions;
	    this.functions = functionDict;
	}
    };
    FunctionGroup.prototype.addFunction = function(func, event){
	this.functions[event].push(func);
	var that = this;
	return function(){
	    for (var i = 0; i < that.functions[event].length; i++){
		if (that.functions[event][i] === func){
		    that.functions[event].splice(i, 1);
		    return;
		}
	    }
	};
    };

    var alwaysFunctions = new FunctionGroup();
    var ifNothingFunctions = new FunctionGroup();

    var functionGroups = [alwaysFunctions, ifNothingFunctions];
    
    var getBindFunction = function(key){
	return function(e){
	    e.preventDefault();
	    var runNothingFunctions = !alwaysFunctions.run(key, e);
	    if (runNothingFunctions){
		ifNothingFunctions.run(key, e);
	    }
	};
    };

    canvas.addEventListener('mousedown', getBindFunction('down'), false);
    canvas.addEventListener('mouseup', getBindFunction('up'), false);
    canvas.addEventListener('mousemove', getBindFunction('move'), false);
    canvas.addEventListener('touchstart', getBindFunction('down'), false);
    canvas.addEventListener('touchend', getBindFunction('up'), false);
    canvas.addEventListener('touchmove', getBindFunction('move'), false);
    canvas.addEventListener('pointerdown', getBindFunction('down'), false);
    canvas.addEventListener('pointerup', getBindFunction('up'), false);
    canvas.addEventListener('pointermove', getBindFunction('move'), false);

    return {
	flip: function(functionDicts){
	    for (var i = 0; i < functionGroups.length; i++){
		if (functionDicts === undefined){
		    functionGroups[i].flip();
		}
		else{
		    if (functionDicts[i] === undefined){
			console.log('Warning: undefined function flip');
		    }
		    functionGroups[i].flip(functionDicts[i]);
		}
	    }
	},
	bindFunction: function(func, event, group){
	    if (!event){
		event = 'down';
	    }

	    if (group === undefined || group == 'always'){
		return alwaysFunctions.addFunction(func, event);
	    }
	    else if (group == 'ifnothing'){
		return ifNothingFunctions.addFunction(func, event);
	    }
	    else{
		console.log('Warning: wrong bind group' + func);
	    }
            return null;
	},
	clear: function(){
	    var oldSets = [];
	    for (var i = 0; i < functionGroups.length; i++){
		oldSets.push(functionGroups[i].clear());
	    }
	    return oldSets;
	},
	reset: function(oldSets){
	    /*Resets the bindings to those passed,
	      Meant to be used with the result of a clear*/
	    for (var i = 0; i < oldSets.length; i++){
		functionGroups[i].reset(oldSets[i]);
	    }
	}
    };
})();

var timeFeed = (function(){
    var lastTime = new Date();
    var startTime = new Date();
    var baseTimeFactor = 1.0;
    var timeFactor = baseTimeFactor;
    var fullTimeElapsed = 0;
    var getInterval = function(){
        var nowTime = new Date();
	var interval = (nowTime.getTime() - lastTime.getTime()) / 1000;
	interval *= timeFactor;
	lastTime = nowTime;
        fullTimeElapsed = (nowTime.getTime() - startTime.getTime()) / 1000;
        if (FORCE_TICK_TIME){
            return FORCE_TICK_TIME;
        }
        else{
            return min(interval, 1);
        }
    };
    var setPaused = function(pause){
	timeFactor = pause ? 0 : baseTimeFactor;
    };
    var setFactor = function(factor){
	baseTimeFactor = factor;
	timeFactor = (timeFactor === 0) ? 0 : baseTimeFactor;
    };
    var setStartTime = function(){
        startTime = new Date();
    };
    
    return {
        getInterval: getInterval,
	setPaused: setPaused,
	setFactor: setFactor,
        setStartTime: setStartTime,
        getFullTime: function(){
            return fullTimeElapsed;
        }
    };
})();

var containsRect = function(outer, inner){
    return outer[0] < inner[0] &&
        outer[1] < inner[1] &&
        outer[0] + outer[2] > inner[0] + inner [2] &&
        outer[1] + outer[3] > inner[1] + inner[3];
};

var collideRect = function(rct1, rct2){
    return (max(rct1[0], rct2[0]) < min(rct1[0] + rct1[2], rct2[0] + rct2[2]) &&
	    max(rct1[1], rct2[1]) < min(rct1[1] + rct1[3], rct2[1] + rct2[3]));
};

var containsPos = function(rect, pos){
    return (rect[0] < pos[0] &&
            rect[1] < pos[1] &&
            rect[0] + rect[2] > pos[0] &&
            rect[1] + rect[3] > pos[1]);
};

var getImage = (function(){
    var imageMap = {};
    return function(imageName){
        if (!imageName){
            throw "Trying to get undefined image";
        }
        var img = imageMap[imageName];
        if (img === undefined){
            img = new Image();
            img.src = 'images/' + imageName + '.png';
            imageMap[imageName] = img;
        }
        return img;
    };
}());

var stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
var stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
var styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
var styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;

var html = document.body.parentNode;
var htmlTop = html.offsetTop;
var htmlLeft = html.offsetLeft;

var getPos = function(e) {
    var boundingRect = canvas.getBoundingClientRect();

    var mx = e.clientX - boundingRect.left;
    var my = e.clientY - boundingRect.top;

    var actualWidth = boundingRect.width;
    var actualHeight = boundingRect.height;

    mx *= width / actualWidth;
    my *= height / actualHeight;

    return [mx, my];
};

var simpleDict = function(key, val){
    var dict = {};
    dict[key] = val;
    return dict;
};

var dictFromPairs = function(pairs){
    var dict = {};
    _.each(pairs, function(pair){
        dict[pair[0]] = pair[1];
    });
    return dict;
};

var addFunction = function(a, b){
    return a + b;
};

var addDict = function(base, add){
    _.each(add, function(val, key){
        base[key] = zc(base[key]) + val;
    });
    return base;
};

var invertDict = function(dct){
    var newDict = {};
    for (var key in dct){
        newDict[key] = dct[key] * -1;
    }
    return newDict;
};

var containsDict = function(base, chk){
    return _.all(chk, (val, key) => val <= zc(base[key]));
};

var unrollDict = function(dct){
    var lst = [];
    _.each(dct, function(val, key){
        _.each(_.range(val), function(){
            lst.push(key);
        });
    });
    return lst;
};

var trueFunction = function(){ return true; };
var falseFunction = function(){ return false; };
var blankStringFunction = function(){ return ''; };
var emptyArrayFunction = function(){ return []; };
var zeroFunction = function(){ return 0; };

var incrementDict = function(dct, key, val){
    if (val === undefined){
        val = 1;
    }

    if (dct[key] === undefined){
        dct[key] = 0;
    }
    
    dct[key] += val;
    return dct[key];
};

var percentCheck = function(percent){
    return Math.random() * 100 < percent;
};

var ctxFillRect = function(rect){
    ctx.fillRect(...rect);
};

var addLists = function(lst1, lst2){
    return _.map(lst1, function(ele, i){
        return ele + (lst2[i] ? lst2[i] : 0);
    });
};

var reduceArray = function(lst){
    return _.reduce(lst, function(memo, ele){
        return memo.length ? memo + ', ' + ele : ele;
    }, '');
};

var comparePos = function(pos1, pos2){
    return (pos1 && pos2 &&
            (pos1[0] == pos2[0]) && 
            (pos1[1] == pos2[1]));
};

var ctxRoundedRect = function(rect){
    ctx.beginPath();
    ctx.moveTo(rect[0] + 2, rect[1]);
    ctx.lineTo(rect[0], rect[1] + 2);
    ctx.lineTo(rect[0], rect[1] + rect[3] - 2);
    ctx.lineTo(rect[0] + 2, rect[1] + rect[3]);
    ctx.lineTo(rect[0] + rect[2] - 2, rect[1] + rect[3]);
    ctx.lineTo(rect[0] + rect[2], rect[1] + rect[3] - 2);
    ctx.lineTo(rect[0] + rect[2], rect[1] + 2);
    ctx.lineTo(rect[0] + rect[2] - 2, rect[1]);
    ctx.lineTo(rect[0] + 2, rect[1]);
    ctx.stroke();
};

var ctxRoundedButton = function(rect, txt){
    ctxRoundedRect(rect);
    ctxRectCenteredText(txt, rect);
};

var scaledDraw = function(img, rect, scale){
    var newRect = [rect[0] - rect[2] * (scale - 1) / 2, rect[1] - rect[3] * (scale - 1) / 2, rect[2] * scale, rect[3] * scale];
    ctx.drawImage(img, newRect[0], newRect[1], newRect[2], newRect[3]);
};

var getFont = function(px){
    return '' + px + 'px OpenSans';
};

var clamp = function(val, mx, mn){
    return max(min(val, mx), mn);
};

var convertColor = function(st){
    return _.map(_.range(3), i => i + parseInt(st[i * 2 + 1] + st[i * 2 + 2]));
};

var interpolateColor = function(color1, color2, fraction){
    color1 = convertColor(color1);
    color2 = convertColor(color2);

    var newColor = _.map(color1, (c, i) => Math.floor(c + (color2[i] - c) * fraction));
    return 'rgb(' + newColor[0] + ',' + newColor[1] + ',' + newColor[2] + ')';
};


var hsvToRgb = function(h, s, v){
    var h_i = Math.floor(h * 6);
    var f = h * 6 - h_i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    var r, g, b;
    if (h_i === 0){
        r = v;
        g = t;
        b = p;
    }
    else if (h_i == 1){
        r = q;
        g = v;
        b = p;
    }
    else if (h_i == 2){
        r = p;
        g = v;
        b = t;
    }
    else if (h_i == 3){
        r = p;
        g = q;
        b = v;
    }
    else if (h_i == 4){
        r = t;
        g = p;
        b = v;
    }
    else{
        r = v;
        g = p;
        b = q;
    }
    return [Math.floor(r * 256), Math.floor(g * 256), Math.floor(b * 256)];
};

var goldenRatioRandomMaker = function(){
    var h = Math.random();
    var golden_ratio_conjugate = 0.618033988749895;
    return function(){
        h += golden_ratio_conjugate;
        h -= Math.floor(h);
        return h;
    };
};

var checkColorForBlackText = function(r, g, b){
    var RED_LUMINANCE = 299;
    var GREEN_LUMINANCE = 587;
    var BLUE_LUMINANCE = 114;
    var MAX_LUMINANCE = (RED_LUMINANCE * 255 + GREEN_LUMINANCE * 255 + BLUE_LUMINANCE * 255);
    var MID_LUMINANCE = MAX_LUMINANCE / 2;
    
    var luminance = (r * RED_LUMINANCE) + (g * GREEN_LUMINANCE) + (b * BLUE_LUMINANCE);
    return luminance > MID_LUMINANCE;
};

var drawCenteredText = function(txt, x, y){
    var width = ctx.measureText(txt).width;
    ctx.fillText(txt, Math.floor(x - width / 2), Math.floor(y + 7));
};

var ctxRectCenteredText = function(txt, rect, y){
    if (y === undefined){
        y = rect[3] / 2;
    }
    
    y += rect[1];
    
    drawCenteredText(txt, rect[0] + rect[2] / 2, y);
};

var stringForDict = function(dct){
    var st = '';
    for (var key in dct){
        if (st){
            st += ', ';
        }
        st += key + ':' + dct[key];
    }
    return st;
};

var manhattanDist = function(pos1, pos2){
    return Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]);
};

var zc = function(x){ return x ? x : 0; };

var randInt = function(x){ return Math.floor(x * Math.random()); };

var weightedRandom = function(weights){
    var total = _.reduce(weights, addFunction);
    var rand = Math.random() * total;
    for (var key in weights){
        rand -= weights[key];
        if (rand < 0){
            return key;
        }
    }
    return Object.keys(weights)[0];//Will return this for a dictionary with all values 0
};

var alphaSortDict = function(dct){
    return _.chain(dct)
        .map((val, key) => [key, val])
        .sortBy(0)
        .value();
};

var toggleListItem = function(lst, item){
    if (_.contains(lst, item)){
        lst.splice(lst.indexOf(item), 1);
    }
    else{
        lst.push(item);
    }
};

var ticksForCost = function(cost, paid, prod){
    var ticks = _.chain(cost)
        .map((val, key) => prod[key] ? ((val - paid[key] ? paid[key] : 0) / prod[key]): 999)
        .max()
        .value();
    return Math.ceil(ticks);
};

var printPass = function(x){
    console.log(x);
    return x;
};

var rollDice = function(dice, sides){
    sides = sides ? sides : 6;
    dice = dice ? dice : 1;

    return _.map(_.range(dice), () => randInt(sides));
};

var containsList = function(superset, subset){
    return _.all(subset, ele => _.contains(superset, ele));
};

var drawFromList = function(lst){
    var idx = randInt(lst.length);
    var ele = lst[idx];
    lst.splice(idx, 1);
    return ele;
};

var unintCompare = function(lst1, lst2){
    return _.union(lst1, lst2).length == _.intersection(lst1, lst2).length;
};

var tileFill = function(rect, img){
    var x, y, i;
    var image = getImage(img);
    var width = image.width;
    var height = image.height;

    if (!(width && height)){
        return;
    }
    
    for (x = 0; x <= (rect[2] - width); x += width){
        for (y = 0; y <= (rect[3] - height); y += height){
            ctx.drawImage(image, rect[0] + x, rect[1] + y);
        }
    }

    if (x < rect[2]){
        for (i = 0; i <= (rect[3] - height); i += height){
            ctx.drawImage(image, 0, 0, rect[2] - x, height, rect[0] + x, rect[1] + i, rect[2] - x, height);
        }
    }
    if (y < rect[3]){
        for (i = 0; i <= (rect[2] - width); i += width){
            ctx.drawImage(image, 0, 0, width, rect[3] - y, rect[0] + i, rect[1] + y, width, rect[3] - y);
        }
    }
    if (x < rect[2] && y < rect[3]){
        ctx.drawImage(image, 0, 0, rect[2] - x, rect[3] - y, rect[0] + x, rect[1] + y, rect[2] - x, rect[3] - y);
    }
};

var shrinkRect = function(rect, diff){
    diff = diff ? diff : 2;

    return [
        rect[0] + diff,
        rect[1] + diff,
        rect[2] - diff * 2,
        rect[3] - diff * 2
    ];
};

var scale9Stretch = function(rect, imgName){
    var image = getImage(imgName + 1);
    var innerRect = [0, 0, 0, 0];

    ctx.drawImage(image, rect[0], rect[1]);
    innerRect[0] = image.width;
    innerRect[1] = image.height;
    
    image = getImage(imgName + 9);
    innerRect[2] = rect[2] - innerRect[0] - image.width;
    innerRect[3] = rect[3] - innerRect[1] - image.height;
    
    ctx.drawImage(image, rect[0] + innerRect[0] + innerRect[2], rect[1] + innerRect[1] + innerRect[3]);

    image = getImage(imgName + 2);
    ctx.drawImage(image, rect[0] + innerRect[0], rect[1], innerRect[2], innerRect[1]);

    image = getImage(imgName + 3);
    ctx.drawImage(image, rect[0] + innerRect[0] + innerRect[2], rect[1]);

    image = getImage(imgName + 4);
    ctx.drawImage(image, rect[0], rect[1] + innerRect[1], innerRect[0], innerRect[3]);

    image = getImage(imgName + 5);
    ctx.drawImage(image, rect[0] + innerRect[0], rect[1] + innerRect[1], innerRect[2], innerRect[3]);
    
    image = getImage(imgName + 6);
    ctx.drawImage(image, rect[0] + innerRect[0] + innerRect[2], rect[1] + innerRect[1], 
                  rect[2] - (innerRect[0] + innerRect[2]), innerRect[3]);

    image = getImage(imgName + 7);
    ctx.drawImage(image, rect[0], rect[1] + innerRect[1] + innerRect[3]);

    image = getImage(imgName + 8);
    ctx.drawImage(image, rect[0] + innerRect[0], rect[1] + innerRect[1] + innerRect[3],
                  innerRect[2], rect[3] - (innerRect[1] + innerRect[3]));
};

var xor = function(a, b){
    return (a && !b) || (!a && b);
};

var interpolate = function(start, end, fraction){
    return start.map((x, i) => x + (end[i] - x) * fraction);
};

var midpoint = function(rect){
    return [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2];
};

var renderLines = function(lines, x, y, wordCount, yDiff){
    wordCount = (wordCount === undefined) ? 5000 : wordCount;
    yDiff = yDiff ? yDiff : 28;
    var wordIndex = 0;
    _.each(lines, line => {
        if (wordIndex < wordCount){
            if (line != '_'){
                var words = line.split(' ');
                if (wordIndex + words.length > wordCount){
                    line = words[0];
                    wordIndex += 1;
                    for (var i = 1; wordIndex + i < wordCount; i++){
                        line += ' ' + words[i];
                    }
                }
                ctx.fillText(line, x, y);
                wordIndex += words.length;
            }
            y += yDiff;
        }
    });
    return y;
};

var posGroupIntersect = function(posGroup1, posGroup2){
    return _.any(posGroup1, pos1 => _.any(posGroup2, pos2 => comparePos(pos1, pos2)));
};

var plural = function(count, word, suffix){
    suffix = suffix ? suffix : 's';
    return '' + count + ' ' + word + ((count == 1) ? '' : suffix);
};

var randomPos = function(rect){
    return [rect[0] + randInt(rect[2]),
            rect[1] + randInt(rect[3])];
};

var renderProgressCircle = function(progress, x, y, radius){
    radius = radius ? radius : 14;
    var angle = 2 * Math.PI * progress;
    ctx.beginPath();
    ctx.arc(x + radius, y + radius - 2, radius, -Math.PI / 2, angle - Math.PI / 2);
    ctx.stroke();
    return y + 2 * radius;
};

var dctVal = function(dct){
    return _.reduce(dct, (memo, val) => memo + val, 0);
};

var posInArray = function(pos, ary){
    return _.any(ary, chkPos => comparePos(chkPos, pos));
};
