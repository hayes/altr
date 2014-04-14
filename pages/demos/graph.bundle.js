;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var ease = require('ease-component')
  , raf = require('raf').polyfill

module.exports = ease_filter

function ease_filter(parts, change) {
  var fn = 'linear'
  , current = {}
  , target = {}
  , ms = 1
  , start
  , wait
  , prev

  var update_ms = this.create_part(parts[0], function(d) {
    ms = +d
    animate()
  })

  var update_fn = this.create_part(parts[1] || 'linear', function(d) {
    fn = d || 'linear'
    animate()
  })

  function animate() {
    if(wait) {
      return
    }

    wait = raf(function() {
      wait = null
      update()
    })
  }

  return function(d, ctx) {
    animate()
    prev = current
    target = JSON.parse(JSON.stringify(d))
    start = new Date
    update_ms(ctx)
    update_fn(ctx)
  }

  function update() {
    var diff = new Date - start
      , p = diff / ms

    if(p >= 1) {
      p = 1
    } else {
      animate()
    }

    p = ease[fn](p)

    current = update_part(prev, target, p)
    change(current)
  }

  function update_part(prev, target, p) {
    var result = target
      , keys

    if(typeof prev !== typeof target) {
      return result
    } else if(Array.isArray(target)) {
      result = Array(target.length)

      for(var i = 0, l = target.length; i < l; ++i) {
        result[i] = update_part(prev[i], target[i], p)
      }
    } else if(typeof target === 'object') {
      keys = Object.keys(target)
      result = {}

      for(var i = 0, l = keys.length; i < l; ++i) {
        result[keys[i]] = update_part(prev[keys[i]], target[keys[i]], p)
      }
    } else if(prev !== target && typeof target === 'number') {
      return prev + (target - prev) * p
    }

    return result
  }
}

},{"ease-component":4,"raf":2}],2:[function(require,module,exports){
module.exports = raf

var EE = require('events').EventEmitter
  , global = typeof window === 'undefined' ? this : window
  , now = global.performance && global.performance.now ? function() {
    return performance.now()
  } : Date.now || function () {
    return +new Date()
  }

var _raf =
  global.requestAnimationFrame ||
  global.webkitRequestAnimationFrame ||
  global.mozRequestAnimationFrame ||
  global.msRequestAnimationFrame ||
  global.oRequestAnimationFrame ||
  (global.setImmediate ? function(fn, el) {
    setImmediate(fn)
  } :
  function(fn, el) {
    setTimeout(fn, 0)
  })

function raf(el, tick) {
  var now = raf.now()
    , ee = new EE
    
  if(typeof el === 'function') {
    tick = el
    el = undefined
  }
  
  ee.pause = function() { ee.paused = true }
  ee.resume = function() { ee.paused = false }

  _raf(iter, el)
  
  if(tick) {
    ee.on('data', function(dt) {
      tick(dt)
    })
  }

  return ee

  function iter(timestamp) {
    var _now = raf.now()
      , dt = _now - now
    
    now = _now

    if(!ee.paused) {
      ee.emit('data', dt)
    }
    
    _raf(iter, el)
  }
}

raf.polyfill = _raf
raf.now = now


},{"events":6}],3:[function(require,module,exports){
module.exports = scale

function scale(parts, change) {
  var ranges = JSON.parse(parts[1])
    , dimensions = []
    , prev = []

  var update_range = this.create_part(parts[0], function(domains, ctx) {
    dimensions = new Array(Math.max(domains.length, ranges.length))

    for(var i = 0, l = dimensions.length; i < l; ++i) {
      dimensions[i] = {
          scale: (ranges[i][1] - ranges[i][0]) / (domains[i][1] - domains[i][0])
        , offset: domains[i][0]
      }
    }

    map(prev)
  })

  return map

  function map(data, ctx) {
    if(ctx) {
      prev = data

      return update_range(data, ctx)
    }

    var out = Array(data.length)

    for(var i = 0, l = data.length; i < l; ++i) {
      out[i] = Array(dimensions)

      for(var j = 0; j < dimensions.length; ++j) {
        out[i][j] = (data[i][j] - dimensions[j].offset) * dimensions[j].scale
      }
    }

    change(out)
  }
}

},{}],4:[function(require,module,exports){

// easing functions from "Tween.js"

exports.linear = function(n){
  return n;
};

exports.inQuad = function(n){
  return n * n;
};

exports.outQuad = function(n){
  return n * (2 - n);
};

exports.inOutQuad = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n;
  return - 0.5 * (--n * (n - 2) - 1);
};

exports.inCube = function(n){
  return n * n * n;
};

exports.outCube = function(n){
  return --n * n * n + 1;
};

exports.inOutCube = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n * n;
  return 0.5 * ((n -= 2 ) * n * n + 2);
};

exports.inQuart = function(n){
  return n * n * n * n;
};

exports.outQuart = function(n){
  return 1 - (--n * n * n * n);
};

exports.inOutQuart = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n * n * n;
  return -0.5 * ((n -= 2) * n * n * n - 2);
};

exports.inQuint = function(n){
  return n * n * n * n * n;
}

exports.outQuint = function(n){
  return --n * n * n * n * n + 1;
}

exports.inOutQuint = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n * n * n * n;
  return 0.5 * ((n -= 2) * n * n * n * n + 2);
};

exports.inSine = function(n){
  return 1 - Math.cos(n * Math.PI / 2 );
};

exports.outSine = function(n){
  return Math.sin(n * Math.PI / 2);
};

exports.inOutSine = function(n){
  return .5 * (1 - Math.cos(Math.PI * n));
};

exports.inExpo = function(n){
  return 0 == n ? 0 : Math.pow(1024, n - 1);
};

exports.outExpo = function(n){
  return 1 == n ? n : 1 - Math.pow(2, -10 * n);
};

exports.inOutExpo = function(n){
  if (0 == n) return 0;
  if (1 == n) return 1;
  if ((n *= 2) < 1) return .5 * Math.pow(1024, n - 1);
  return .5 * (-Math.pow(2, -10 * (n - 1)) + 2);
};

exports.inCirc = function(n){
  return 1 - Math.sqrt(1 - n * n);
};

exports.outCirc = function(n){
  return Math.sqrt(1 - (--n * n));
};

exports.inOutCirc = function(n){
  n *= 2
  if (n < 1) return -0.5 * (Math.sqrt(1 - n * n) - 1);
  return 0.5 * (Math.sqrt(1 - (n -= 2) * n) + 1);
};

exports.inBack = function(n){
  var s = 1.70158;
  return n * n * (( s + 1 ) * n - s);
};

exports.outBack = function(n){
  var s = 1.70158;
  return --n * n * ((s + 1) * n + s) + 1;
};

exports.inOutBack = function(n){
  var s = 1.70158 * 1.525;
  if ( ( n *= 2 ) < 1 ) return 0.5 * ( n * n * ( ( s + 1 ) * n - s ) );
  return 0.5 * ( ( n -= 2 ) * n * ( ( s + 1 ) * n + s ) + 2 );
};

exports.inBounce = function(n){
  return 1 - exports.outBounce(1 - n);
};

exports.outBounce = function(n){
  if ( n < ( 1 / 2.75 ) ) {
    return 7.5625 * n * n;
  } else if ( n < ( 2 / 2.75 ) ) {
    return 7.5625 * ( n -= ( 1.5 / 2.75 ) ) * n + 0.75;
  } else if ( n < ( 2.5 / 2.75 ) ) {
    return 7.5625 * ( n -= ( 2.25 / 2.75 ) ) * n + 0.9375;
  } else {
    return 7.5625 * ( n -= ( 2.625 / 2.75 ) ) * n + 0.984375;
  }
};

exports.inOutBounce = function(n){
  if (n < .5) return exports.inBounce(n * 2) * .5;
  return exports.outBounce(n * 2 - 1) * .5 + .5;
};

// aliases

exports['in-quad'] = exports.inQuad;
exports['out-quad'] = exports.outQuad;
exports['in-out-quad'] = exports.inOutQuad;
exports['in-cube'] = exports.inCube;
exports['out-cube'] = exports.outCube;
exports['in-out-cube'] = exports.inOutCube;
exports['in-quart'] = exports.inQuart;
exports['out-quart'] = exports.outQuart;
exports['in-out-quart'] = exports.inOutQuart;
exports['in-quint'] = exports.inQuint;
exports['out-quint'] = exports.outQuint;
exports['in-out-quint'] = exports.inOutQuint;
exports['in-sine'] = exports.inSine;
exports['out-sine'] = exports.outSine;
exports['in-out-sine'] = exports.inOutSine;
exports['in-expo'] = exports.inExpo;
exports['out-expo'] = exports.outExpo;
exports['in-out-expo'] = exports.inOutExpo;
exports['in-circ'] = exports.inCirc;
exports['out-circ'] = exports.outCirc;
exports['in-out-circ'] = exports.inOutCirc;
exports['in-back'] = exports.inBack;
exports['out-back'] = exports.outBack;
exports['in-out-back'] = exports.inOutBack;
exports['in-bounce'] = exports.inBounce;
exports['out-bounce'] = exports.outBounce;
exports['in-out-bounce'] = exports.inOutBounce;

},{}],5:[function(require,module,exports){
var scale = require('altr-scale')
  , ease = require('altr-ease')

altr.add_filter('svg_path', svg_path)
altr.add_filter('scale', scale)
altr.add_filter('ease', ease)

var data = {
    points: [[+new Date - 30000, 300]]
  , range: [
        [+new Date, +new Date]
      , [0, 300]
    ]
  , ticks: {
    y: [50, 100, 150, 200, 250]
  }
}

var template = altr(document.getElementById('graph1'), data)

for(var i = 29; i > 0; --i) {
  add_item(new Date - i * 1000)
}

setInterval(add_item, 2000)

function add_item(time) {
  data.points.push([
      time || +new Date
    , ~~(Math.random() * 300)
  ])

  data.points = data.points.slice(-100)
  data.range[0][0] = new Date - 30000
  data.range[0][1] = +new Date
  template.update(data)
}

function svg_path(parts, change) {
  return function(data) {
    var result = parts.slice()
      , data = data.slice()

    result.splice.apply(result, [1, 0].concat(data.map(function(p) {
      return 'L ' + p[0] + ' ' + p[1]
    })))

    change(result.join(' '))
  }
}

},{"altr-ease":1,"altr-scale":3}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[5])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1lYXNlL2luZGV4LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItZWFzZS9ub2RlX21vZHVsZXMvcmFmL2luZGV4LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItc2NhbGUvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvZWFzZS1jb21wb25lbnQvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9wYWdlcy9kZW1vcy9ncmFwaC5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbInZhciBlYXNlID0gcmVxdWlyZSgnZWFzZS1jb21wb25lbnQnKVxuICAsIHJhZiA9IHJlcXVpcmUoJ3JhZicpLnBvbHlmaWxsXG5cbm1vZHVsZS5leHBvcnRzID0gZWFzZV9maWx0ZXJcblxuZnVuY3Rpb24gZWFzZV9maWx0ZXIocGFydHMsIGNoYW5nZSkge1xuICB2YXIgZm4gPSAnbGluZWFyJ1xuICAsIGN1cnJlbnQgPSB7fVxuICAsIHRhcmdldCA9IHt9XG4gICwgbXMgPSAxXG4gICwgc3RhcnRcbiAgLCB3YWl0XG4gICwgcHJldlxuXG4gIHZhciB1cGRhdGVfbXMgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzBdLCBmdW5jdGlvbihkKSB7XG4gICAgbXMgPSArZFxuICAgIGFuaW1hdGUoKVxuICB9KVxuXG4gIHZhciB1cGRhdGVfZm4gPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzFdIHx8ICdsaW5lYXInLCBmdW5jdGlvbihkKSB7XG4gICAgZm4gPSBkIHx8ICdsaW5lYXInXG4gICAgYW5pbWF0ZSgpXG4gIH0pXG5cbiAgZnVuY3Rpb24gYW5pbWF0ZSgpIHtcbiAgICBpZih3YWl0KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB3YWl0ID0gcmFmKGZ1bmN0aW9uKCkge1xuICAgICAgd2FpdCA9IG51bGxcbiAgICAgIHVwZGF0ZSgpXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihkLCBjdHgpIHtcbiAgICBhbmltYXRlKClcbiAgICBwcmV2ID0gY3VycmVudFxuICAgIHRhcmdldCA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZCkpXG4gICAgc3RhcnQgPSBuZXcgRGF0ZVxuICAgIHVwZGF0ZV9tcyhjdHgpXG4gICAgdXBkYXRlX2ZuKGN0eClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgZGlmZiA9IG5ldyBEYXRlIC0gc3RhcnRcbiAgICAgICwgcCA9IGRpZmYgLyBtc1xuXG4gICAgaWYocCA+PSAxKSB7XG4gICAgICBwID0gMVxuICAgIH0gZWxzZSB7XG4gICAgICBhbmltYXRlKClcbiAgICB9XG5cbiAgICBwID0gZWFzZVtmbl0ocClcblxuICAgIGN1cnJlbnQgPSB1cGRhdGVfcGFydChwcmV2LCB0YXJnZXQsIHApXG4gICAgY2hhbmdlKGN1cnJlbnQpXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVfcGFydChwcmV2LCB0YXJnZXQsIHApIHtcbiAgICB2YXIgcmVzdWx0ID0gdGFyZ2V0XG4gICAgICAsIGtleXNcblxuICAgIGlmKHR5cGVvZiBwcmV2ICE9PSB0eXBlb2YgdGFyZ2V0KSB7XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfSBlbHNlIGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgcmVzdWx0ID0gQXJyYXkodGFyZ2V0Lmxlbmd0aClcblxuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHRhcmdldC5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgcmVzdWx0W2ldID0gdXBkYXRlX3BhcnQocHJldltpXSwgdGFyZ2V0W2ldLCBwKVxuICAgICAgfVxuICAgIH0gZWxzZSBpZih0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xuICAgICAga2V5cyA9IE9iamVjdC5rZXlzKHRhcmdldClcbiAgICAgIHJlc3VsdCA9IHt9XG5cbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICByZXN1bHRba2V5c1tpXV0gPSB1cGRhdGVfcGFydChwcmV2W2tleXNbaV1dLCB0YXJnZXRba2V5c1tpXV0sIHApXG4gICAgICB9XG4gICAgfSBlbHNlIGlmKHByZXYgIT09IHRhcmdldCAmJiB0eXBlb2YgdGFyZ2V0ID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHByZXYgKyAodGFyZ2V0IC0gcHJldikgKiBwXG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJhZlxuXG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcbiAgLCBnbG9iYWwgPSB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IHRoaXMgOiB3aW5kb3dcbiAgLCBub3cgPSBnbG9iYWwucGVyZm9ybWFuY2UgJiYgZ2xvYmFsLnBlcmZvcm1hbmNlLm5vdyA/IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKVxuICB9IDogRGF0ZS5ub3cgfHwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiArbmV3IERhdGUoKVxuICB9XG5cbnZhciBfcmFmID1cbiAgZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIChnbG9iYWwuc2V0SW1tZWRpYXRlID8gZnVuY3Rpb24oZm4sIGVsKSB7XG4gICAgc2V0SW1tZWRpYXRlKGZuKVxuICB9IDpcbiAgZnVuY3Rpb24oZm4sIGVsKSB7XG4gICAgc2V0VGltZW91dChmbiwgMClcbiAgfSlcblxuZnVuY3Rpb24gcmFmKGVsLCB0aWNrKSB7XG4gIHZhciBub3cgPSByYWYubm93KClcbiAgICAsIGVlID0gbmV3IEVFXG4gICAgXG4gIGlmKHR5cGVvZiBlbCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRpY2sgPSBlbFxuICAgIGVsID0gdW5kZWZpbmVkXG4gIH1cbiAgXG4gIGVlLnBhdXNlID0gZnVuY3Rpb24oKSB7IGVlLnBhdXNlZCA9IHRydWUgfVxuICBlZS5yZXN1bWUgPSBmdW5jdGlvbigpIHsgZWUucGF1c2VkID0gZmFsc2UgfVxuXG4gIF9yYWYoaXRlciwgZWwpXG4gIFxuICBpZih0aWNrKSB7XG4gICAgZWUub24oJ2RhdGEnLCBmdW5jdGlvbihkdCkge1xuICAgICAgdGljayhkdClcbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuIGVlXG5cbiAgZnVuY3Rpb24gaXRlcih0aW1lc3RhbXApIHtcbiAgICB2YXIgX25vdyA9IHJhZi5ub3coKVxuICAgICAgLCBkdCA9IF9ub3cgLSBub3dcbiAgICBcbiAgICBub3cgPSBfbm93XG5cbiAgICBpZighZWUucGF1c2VkKSB7XG4gICAgICBlZS5lbWl0KCdkYXRhJywgZHQpXG4gICAgfVxuICAgIFxuICAgIF9yYWYoaXRlciwgZWwpXG4gIH1cbn1cblxucmFmLnBvbHlmaWxsID0gX3JhZlxucmFmLm5vdyA9IG5vd1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHNjYWxlXG5cbmZ1bmN0aW9uIHNjYWxlKHBhcnRzLCBjaGFuZ2UpIHtcbiAgdmFyIHJhbmdlcyA9IEpTT04ucGFyc2UocGFydHNbMV0pXG4gICAgLCBkaW1lbnNpb25zID0gW11cbiAgICAsIHByZXYgPSBbXVxuXG4gIHZhciB1cGRhdGVfcmFuZ2UgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzBdLCBmdW5jdGlvbihkb21haW5zLCBjdHgpIHtcbiAgICBkaW1lbnNpb25zID0gbmV3IEFycmF5KE1hdGgubWF4KGRvbWFpbnMubGVuZ3RoLCByYW5nZXMubGVuZ3RoKSlcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBkaW1lbnNpb25zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgZGltZW5zaW9uc1tpXSA9IHtcbiAgICAgICAgICBzY2FsZTogKHJhbmdlc1tpXVsxXSAtIHJhbmdlc1tpXVswXSkgLyAoZG9tYWluc1tpXVsxXSAtIGRvbWFpbnNbaV1bMF0pXG4gICAgICAgICwgb2Zmc2V0OiBkb21haW5zW2ldWzBdXG4gICAgICB9XG4gICAgfVxuXG4gICAgbWFwKHByZXYpXG4gIH0pXG5cbiAgcmV0dXJuIG1hcFxuXG4gIGZ1bmN0aW9uIG1hcChkYXRhLCBjdHgpIHtcbiAgICBpZihjdHgpIHtcbiAgICAgIHByZXYgPSBkYXRhXG5cbiAgICAgIHJldHVybiB1cGRhdGVfcmFuZ2UoZGF0YSwgY3R4KVxuICAgIH1cblxuICAgIHZhciBvdXQgPSBBcnJheShkYXRhLmxlbmd0aClcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgb3V0W2ldID0gQXJyYXkoZGltZW5zaW9ucylcblxuICAgICAgZm9yKHZhciBqID0gMDsgaiA8IGRpbWVuc2lvbnMubGVuZ3RoOyArK2opIHtcbiAgICAgICAgb3V0W2ldW2pdID0gKGRhdGFbaV1bal0gLSBkaW1lbnNpb25zW2pdLm9mZnNldCkgKiBkaW1lbnNpb25zW2pdLnNjYWxlXG4gICAgICB9XG4gICAgfVxuXG4gICAgY2hhbmdlKG91dClcbiAgfVxufVxuIiwiXG4vLyBlYXNpbmcgZnVuY3Rpb25zIGZyb20gXCJUd2Vlbi5qc1wiXG5cbmV4cG9ydHMubGluZWFyID0gZnVuY3Rpb24obil7XG4gIHJldHVybiBuO1xufTtcblxuZXhwb3J0cy5pblF1YWQgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIG4gKiBuO1xufTtcblxuZXhwb3J0cy5vdXRRdWFkID0gZnVuY3Rpb24obil7XG4gIHJldHVybiBuICogKDIgLSBuKTtcbn07XG5cbmV4cG9ydHMuaW5PdXRRdWFkID0gZnVuY3Rpb24obil7XG4gIG4gKj0gMjtcbiAgaWYgKG4gPCAxKSByZXR1cm4gMC41ICogbiAqIG47XG4gIHJldHVybiAtIDAuNSAqICgtLW4gKiAobiAtIDIpIC0gMSk7XG59O1xuXG5leHBvcnRzLmluQ3ViZSA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gbiAqIG4gKiBuO1xufTtcblxuZXhwb3J0cy5vdXRDdWJlID0gZnVuY3Rpb24obil7XG4gIHJldHVybiAtLW4gKiBuICogbiArIDE7XG59O1xuXG5leHBvcnRzLmluT3V0Q3ViZSA9IGZ1bmN0aW9uKG4pe1xuICBuICo9IDI7XG4gIGlmIChuIDwgMSkgcmV0dXJuIDAuNSAqIG4gKiBuICogbjtcbiAgcmV0dXJuIDAuNSAqICgobiAtPSAyICkgKiBuICogbiArIDIpO1xufTtcblxuZXhwb3J0cy5pblF1YXJ0ID0gZnVuY3Rpb24obil7XG4gIHJldHVybiBuICogbiAqIG4gKiBuO1xufTtcblxuZXhwb3J0cy5vdXRRdWFydCA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gMSAtICgtLW4gKiBuICogbiAqIG4pO1xufTtcblxuZXhwb3J0cy5pbk91dFF1YXJ0ID0gZnVuY3Rpb24obil7XG4gIG4gKj0gMjtcbiAgaWYgKG4gPCAxKSByZXR1cm4gMC41ICogbiAqIG4gKiBuICogbjtcbiAgcmV0dXJuIC0wLjUgKiAoKG4gLT0gMikgKiBuICogbiAqIG4gLSAyKTtcbn07XG5cbmV4cG9ydHMuaW5RdWludCA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gbiAqIG4gKiBuICogbiAqIG47XG59XG5cbmV4cG9ydHMub3V0UXVpbnQgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIC0tbiAqIG4gKiBuICogbiAqIG4gKyAxO1xufVxuXG5leHBvcnRzLmluT3V0UXVpbnQgPSBmdW5jdGlvbihuKXtcbiAgbiAqPSAyO1xuICBpZiAobiA8IDEpIHJldHVybiAwLjUgKiBuICogbiAqIG4gKiBuICogbjtcbiAgcmV0dXJuIDAuNSAqICgobiAtPSAyKSAqIG4gKiBuICogbiAqIG4gKyAyKTtcbn07XG5cbmV4cG9ydHMuaW5TaW5lID0gZnVuY3Rpb24obil7XG4gIHJldHVybiAxIC0gTWF0aC5jb3MobiAqIE1hdGguUEkgLyAyICk7XG59O1xuXG5leHBvcnRzLm91dFNpbmUgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIE1hdGguc2luKG4gKiBNYXRoLlBJIC8gMik7XG59O1xuXG5leHBvcnRzLmluT3V0U2luZSA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gLjUgKiAoMSAtIE1hdGguY29zKE1hdGguUEkgKiBuKSk7XG59O1xuXG5leHBvcnRzLmluRXhwbyA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gMCA9PSBuID8gMCA6IE1hdGgucG93KDEwMjQsIG4gLSAxKTtcbn07XG5cbmV4cG9ydHMub3V0RXhwbyA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gMSA9PSBuID8gbiA6IDEgLSBNYXRoLnBvdygyLCAtMTAgKiBuKTtcbn07XG5cbmV4cG9ydHMuaW5PdXRFeHBvID0gZnVuY3Rpb24obil7XG4gIGlmICgwID09IG4pIHJldHVybiAwO1xuICBpZiAoMSA9PSBuKSByZXR1cm4gMTtcbiAgaWYgKChuICo9IDIpIDwgMSkgcmV0dXJuIC41ICogTWF0aC5wb3coMTAyNCwgbiAtIDEpO1xuICByZXR1cm4gLjUgKiAoLU1hdGgucG93KDIsIC0xMCAqIChuIC0gMSkpICsgMik7XG59O1xuXG5leHBvcnRzLmluQ2lyYyA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gMSAtIE1hdGguc3FydCgxIC0gbiAqIG4pO1xufTtcblxuZXhwb3J0cy5vdXRDaXJjID0gZnVuY3Rpb24obil7XG4gIHJldHVybiBNYXRoLnNxcnQoMSAtICgtLW4gKiBuKSk7XG59O1xuXG5leHBvcnRzLmluT3V0Q2lyYyA9IGZ1bmN0aW9uKG4pe1xuICBuICo9IDJcbiAgaWYgKG4gPCAxKSByZXR1cm4gLTAuNSAqIChNYXRoLnNxcnQoMSAtIG4gKiBuKSAtIDEpO1xuICByZXR1cm4gMC41ICogKE1hdGguc3FydCgxIC0gKG4gLT0gMikgKiBuKSArIDEpO1xufTtcblxuZXhwb3J0cy5pbkJhY2sgPSBmdW5jdGlvbihuKXtcbiAgdmFyIHMgPSAxLjcwMTU4O1xuICByZXR1cm4gbiAqIG4gKiAoKCBzICsgMSApICogbiAtIHMpO1xufTtcblxuZXhwb3J0cy5vdXRCYWNrID0gZnVuY3Rpb24obil7XG4gIHZhciBzID0gMS43MDE1ODtcbiAgcmV0dXJuIC0tbiAqIG4gKiAoKHMgKyAxKSAqIG4gKyBzKSArIDE7XG59O1xuXG5leHBvcnRzLmluT3V0QmFjayA9IGZ1bmN0aW9uKG4pe1xuICB2YXIgcyA9IDEuNzAxNTggKiAxLjUyNTtcbiAgaWYgKCAoIG4gKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiAoIG4gKiBuICogKCAoIHMgKyAxICkgKiBuIC0gcyApICk7XG4gIHJldHVybiAwLjUgKiAoICggbiAtPSAyICkgKiBuICogKCAoIHMgKyAxICkgKiBuICsgcyApICsgMiApO1xufTtcblxuZXhwb3J0cy5pbkJvdW5jZSA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gMSAtIGV4cG9ydHMub3V0Qm91bmNlKDEgLSBuKTtcbn07XG5cbmV4cG9ydHMub3V0Qm91bmNlID0gZnVuY3Rpb24obil7XG4gIGlmICggbiA8ICggMSAvIDIuNzUgKSApIHtcbiAgICByZXR1cm4gNy41NjI1ICogbiAqIG47XG4gIH0gZWxzZSBpZiAoIG4gPCAoIDIgLyAyLjc1ICkgKSB7XG4gICAgcmV0dXJuIDcuNTYyNSAqICggbiAtPSAoIDEuNSAvIDIuNzUgKSApICogbiArIDAuNzU7XG4gIH0gZWxzZSBpZiAoIG4gPCAoIDIuNSAvIDIuNzUgKSApIHtcbiAgICByZXR1cm4gNy41NjI1ICogKCBuIC09ICggMi4yNSAvIDIuNzUgKSApICogbiArIDAuOTM3NTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gNy41NjI1ICogKCBuIC09ICggMi42MjUgLyAyLjc1ICkgKSAqIG4gKyAwLjk4NDM3NTtcbiAgfVxufTtcblxuZXhwb3J0cy5pbk91dEJvdW5jZSA9IGZ1bmN0aW9uKG4pe1xuICBpZiAobiA8IC41KSByZXR1cm4gZXhwb3J0cy5pbkJvdW5jZShuICogMikgKiAuNTtcbiAgcmV0dXJuIGV4cG9ydHMub3V0Qm91bmNlKG4gKiAyIC0gMSkgKiAuNSArIC41O1xufTtcblxuLy8gYWxpYXNlc1xuXG5leHBvcnRzWydpbi1xdWFkJ10gPSBleHBvcnRzLmluUXVhZDtcbmV4cG9ydHNbJ291dC1xdWFkJ10gPSBleHBvcnRzLm91dFF1YWQ7XG5leHBvcnRzWydpbi1vdXQtcXVhZCddID0gZXhwb3J0cy5pbk91dFF1YWQ7XG5leHBvcnRzWydpbi1jdWJlJ10gPSBleHBvcnRzLmluQ3ViZTtcbmV4cG9ydHNbJ291dC1jdWJlJ10gPSBleHBvcnRzLm91dEN1YmU7XG5leHBvcnRzWydpbi1vdXQtY3ViZSddID0gZXhwb3J0cy5pbk91dEN1YmU7XG5leHBvcnRzWydpbi1xdWFydCddID0gZXhwb3J0cy5pblF1YXJ0O1xuZXhwb3J0c1snb3V0LXF1YXJ0J10gPSBleHBvcnRzLm91dFF1YXJ0O1xuZXhwb3J0c1snaW4tb3V0LXF1YXJ0J10gPSBleHBvcnRzLmluT3V0UXVhcnQ7XG5leHBvcnRzWydpbi1xdWludCddID0gZXhwb3J0cy5pblF1aW50O1xuZXhwb3J0c1snb3V0LXF1aW50J10gPSBleHBvcnRzLm91dFF1aW50O1xuZXhwb3J0c1snaW4tb3V0LXF1aW50J10gPSBleHBvcnRzLmluT3V0UXVpbnQ7XG5leHBvcnRzWydpbi1zaW5lJ10gPSBleHBvcnRzLmluU2luZTtcbmV4cG9ydHNbJ291dC1zaW5lJ10gPSBleHBvcnRzLm91dFNpbmU7XG5leHBvcnRzWydpbi1vdXQtc2luZSddID0gZXhwb3J0cy5pbk91dFNpbmU7XG5leHBvcnRzWydpbi1leHBvJ10gPSBleHBvcnRzLmluRXhwbztcbmV4cG9ydHNbJ291dC1leHBvJ10gPSBleHBvcnRzLm91dEV4cG87XG5leHBvcnRzWydpbi1vdXQtZXhwbyddID0gZXhwb3J0cy5pbk91dEV4cG87XG5leHBvcnRzWydpbi1jaXJjJ10gPSBleHBvcnRzLmluQ2lyYztcbmV4cG9ydHNbJ291dC1jaXJjJ10gPSBleHBvcnRzLm91dENpcmM7XG5leHBvcnRzWydpbi1vdXQtY2lyYyddID0gZXhwb3J0cy5pbk91dENpcmM7XG5leHBvcnRzWydpbi1iYWNrJ10gPSBleHBvcnRzLmluQmFjaztcbmV4cG9ydHNbJ291dC1iYWNrJ10gPSBleHBvcnRzLm91dEJhY2s7XG5leHBvcnRzWydpbi1vdXQtYmFjayddID0gZXhwb3J0cy5pbk91dEJhY2s7XG5leHBvcnRzWydpbi1ib3VuY2UnXSA9IGV4cG9ydHMuaW5Cb3VuY2U7XG5leHBvcnRzWydvdXQtYm91bmNlJ10gPSBleHBvcnRzLm91dEJvdW5jZTtcbmV4cG9ydHNbJ2luLW91dC1ib3VuY2UnXSA9IGV4cG9ydHMuaW5PdXRCb3VuY2U7XG4iLCJ2YXIgc2NhbGUgPSByZXF1aXJlKCdhbHRyLXNjYWxlJylcbiAgLCBlYXNlID0gcmVxdWlyZSgnYWx0ci1lYXNlJylcblxuYWx0ci5hZGRfZmlsdGVyKCdzdmdfcGF0aCcsIHN2Z19wYXRoKVxuYWx0ci5hZGRfZmlsdGVyKCdzY2FsZScsIHNjYWxlKVxuYWx0ci5hZGRfZmlsdGVyKCdlYXNlJywgZWFzZSlcblxudmFyIGRhdGEgPSB7XG4gICAgcG9pbnRzOiBbWytuZXcgRGF0ZSAtIDMwMDAwLCAzMDBdXVxuICAsIHJhbmdlOiBbXG4gICAgICAgIFsrbmV3IERhdGUsICtuZXcgRGF0ZV1cbiAgICAgICwgWzAsIDMwMF1cbiAgICBdXG4gICwgdGlja3M6IHtcbiAgICB5OiBbNTAsIDEwMCwgMTUwLCAyMDAsIDI1MF1cbiAgfVxufVxuXG52YXIgdGVtcGxhdGUgPSBhbHRyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdncmFwaDEnKSwgZGF0YSlcblxuZm9yKHZhciBpID0gMjk7IGkgPiAwOyAtLWkpIHtcbiAgYWRkX2l0ZW0obmV3IERhdGUgLSBpICogMTAwMClcbn1cblxuc2V0SW50ZXJ2YWwoYWRkX2l0ZW0sIDIwMDApXG5cbmZ1bmN0aW9uIGFkZF9pdGVtKHRpbWUpIHtcbiAgZGF0YS5wb2ludHMucHVzaChbXG4gICAgICB0aW1lIHx8ICtuZXcgRGF0ZVxuICAgICwgfn4oTWF0aC5yYW5kb20oKSAqIDMwMClcbiAgXSlcblxuICBkYXRhLnBvaW50cyA9IGRhdGEucG9pbnRzLnNsaWNlKC0xMDApXG4gIGRhdGEucmFuZ2VbMF1bMF0gPSBuZXcgRGF0ZSAtIDMwMDAwXG4gIGRhdGEucmFuZ2VbMF1bMV0gPSArbmV3IERhdGVcbiAgdGVtcGxhdGUudXBkYXRlKGRhdGEpXG59XG5cbmZ1bmN0aW9uIHN2Z19wYXRoKHBhcnRzLCBjaGFuZ2UpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0gcGFydHMuc2xpY2UoKVxuICAgICAgLCBkYXRhID0gZGF0YS5zbGljZSgpXG5cbiAgICByZXN1bHQuc3BsaWNlLmFwcGx5KHJlc3VsdCwgWzEsIDBdLmNvbmNhdChkYXRhLm1hcChmdW5jdGlvbihwKSB7XG4gICAgICByZXR1cm4gJ0wgJyArIHBbMF0gKyAnICcgKyBwWzFdXG4gICAgfSkpKVxuXG4gICAgY2hhbmdlKHJlc3VsdC5qb2luKCcgJykpXG4gIH1cbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
;