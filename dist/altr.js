(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var EE = require('events').EventEmitter
  , batch = require('batch-queue')
  , dirtybit = require('dirtybit')

var templateString = require('./template-string')
  , elementNode = require('./element-node')
  , mergeHooks = require('./merge-hooks')
  , textNode = require('./text-node')
  , toString = require('./to-string')
  , getEl = require('./get-element')
  , replace = require('./replace')
  , render = require('./render')
  , insert = require('./insert')
  , remove = require('./remove')
  , raf = require('./raf')

// dynamic require so it does not make it into the browserify bundle
var domModule = 'micro-dom'

altr.filters = {}
altr.includes = {}
altr.directives = {}
altr.render = render
altr.addTag = addTag
altr.include = include
altr.addFilter = addFilter
altr.addDirective = addDirective

module.exports = altr

function altr(root, data, sync, doc) {
  if(!(this instanceof altr)) {
    return new altr(root, data, sync, doc)
  }

  EE.call(this)
  this.sync = !!sync
  this.root = root
  this.document = doc || global.document || require(domModule).document
  this.filters = Object.create(altr.filters)
  this.includes = Object.create(altr.includes)
  this.directives = Object.create(altr.directives)
  this.lookups = dirtybit(data, {filters: this.filters})
  this.batch = batch((function() {
    if(!this.sync) {
      raf(this.runBatch.bind(this))
    }
  }).bind(this))

  if(global.Buffer && root instanceof global.Buffer) {
    root = root.toString()
  }

  if(typeof root === 'string') {
    var temp = this.document.createElement('div')

    temp.innerHTML = root
    this.root = this.document.createDocumentFragment()

    while(temp.firstChild) {
      this.root.appendChild(temp.firstChild)
    }
  }

  this.hooks = this.initNodes(this.rootNodes(), this.lookups)
  this.runBatch()
}

altr.prototype = Object.create(EE.prototype)
altr.prototype.constructor = altr

altr.prototype.templateString = templateString
altr.prototype.addDirective = addDirective
altr.prototype.mergeHooks = mergeHooks
altr.prototype.initNodes = initNodes
altr.prototype.rootNodes = root_nodes
altr.prototype.addFilter = addFilter
altr.prototype.runBatch = runBatch
altr.prototype.toString = toString
altr.prototype.getElement = getEl
altr.prototype.include = include
altr.prototype.replace = replace
altr.prototype.destroy = destroy
altr.prototype.into = appendTo
altr.prototype.update = update
altr.prototype.insert = insert
altr.prototype.remove = remove
altr.prototype.tagList = []
altr.prototype.tags = {}

var node_handlers = {}

node_handlers[1] = elementNode
node_handlers[3] = textNode

function update(data, sync) {
  this.state = data
  this.lookups.update(data)
  this.emit('update')

  if(sync || this.sync) {
    this.runBatch()
  }
}

function initNodes(nodes, _lookups) {
  var lookups = _lookups || dirtybit(null, {filters: this.filters})

  var hooks = Array.prototype.slice.call(nodes)
    .map(initNode.bind(this, lookups))
    .filter(Boolean)
    .reduce(this.mergeHooks.bind(this), {})

  return {hooks: hooks, lookups: lookups, nodes: nodes}
}

function initNode(lookups, el) {
  return node_handlers[el.nodeType] ?
    node_handlers[el.nodeType].call(this, el, lookups) :
    el.childNodes && el.childNodes.length ?
    this.initNodes(lookups, el.childNodes) :
    null
}

function root_nodes() {
  return this.root.nodeType === this.document.DOCUMENT_FRAGMENT_NODE ?
    [].slice.call(this.root.childNodes) :
    [this.root]
}

function addFilter(name, filter) {
  altr.filters[name] = filter
}

function addTag(attr, tag) {
  altr.prototype.tags[attr] = tag
  altr.prototype.tagList.push({
      attr: attr
    , constructor: tag
  })
}

function appendTo(node) {
  var root_nodes = this.rootNodes()

  for(var i = 0, l = root_nodes.length; i < l; ++i) {
    node.appendChild(getEl(root_nodes[i]))
  }
}

function include(name, template) {
  return this.includes[name] = template
}

function addFilter(name, fn) {
  return this.filters[name] = fn
}

function addDirective(name, fn) {
  return this.directives[name] = fn
}

function runBatch() {
  this.batch.run() && this.emit('draw', this.state)
}

function destroy() {
  var list = this.hooks.destroy

  if(!this.hooks.destroy) {
    return
  }

  if(Array.isArray(list)) {
    list = [list]
  }

  for(var i = 0, l = list.length; i < l; ++i) {
    list[i]()
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./element-node":5,"./get-element":6,"./insert":8,"./merge-hooks":9,"./raf":10,"./remove":11,"./render":12,"./replace":13,"./template-string":23,"./text-node":24,"./to-string":25,"batch-queue":26,"dirtybit":28,"events":27}],2:[function(require,module,exports){
module.exports.raw = rawAttribute
module.exports.altr = altrAttribute
module.exports.prop = altrProperty

function rawAttribute(el, attr, lookups) {
  return this.templateString(
      attr.value
    , this.batch.add(el.setAttribute.bind(el, attr.name))
    , lookups
  )
}

function altrAttribute(el, attr, lookups) {
  var name = attr.name.slice('altr-attr-'.length)

  lookups.register(attr.value, this.batch.add(update))
  el.removeAttribute(attr.name)

  function update(val) {
    if(!val && val !== '' && val !== 0) {
      return el.removeAttribute(name)
    }

    if(val === true) {
      return el.setAttribute(name, '')
    }

    el.setAttribute(name, val)
  }
}

function altrProperty(el, attr, lookups) {
  var name = attr.name.slice('altr-prop-'.length)

  el.removeAttribute(attr.name)
  lookups.register(attr.value, this.batch.add(update))

  function update(val) {
    el[name] = val
  }
}

},{}],3:[function(require,module,exports){
(function (global){
module.exports = global.altr = require('./index')

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./index":7}],4:[function(require,module,exports){
module.exports = directives

function directives(el, attrs, lookups) {
  var self = this
    , hooks = []

  for(var i = 0, l = attrs.length; i < l; ++i) {
    hooks.push(create_directive(
        el
      , self.directives[attrs[i].name]
      , attrs[i].value
    ))
  }

  if(hooks.length) {
    return hooks.reduce(self.mergeHooks, {})
  }

  function create_directive(el, create, getter) {
    var hooks = create(el)

    if(!hooks) {
      return
    }

    if(hooks.update) {
      lookups.register(getter, hooks.update)
      delete hooks.update
    }

    return hooks
  }
}

},{}],5:[function(require,module,exports){
var createDirectives = require('./directives')
  , createAttr = require('./attributes')

module.exports = createElementNode

function createElementNode(el, lookups) {
  var directives = []
    , altr = this
    , hooks = {}
    , attr

  var attrs = Array.prototype.slice.call(el.attributes)
    , directives = []
    , altr_tags = {}
    , updates = []
    , tags = {}

  for(var i = 0, l = attrs.length; i < l; ++i) {
    if(altr.tags[attrs[i].name]) {
      altr_tags[attrs[i].name] = attrs[i].value
    } else if(altr.directives[attrs[i].name]) {
      directives.push(attrs[i])
    } else if(!attrs[i].name.lastIndexOf('altr-attr-', 0)) {
      updates.push(createAttr.altr.call(this, el, attrs[i], lookups))
    } else if(!attrs[i].name.lastIndexOf('altr-prop-', 0)) {
      updates.push(createAttr.prop.call(this, el, attrs[i], lookups))
    } else {
      updates.push(createAttr.raw.call(this, el, attrs[i], lookups))
    }
  }

  hooks.updates

  if(directives.length) {
    hooks = altr.mergeHooks(
        hooks
      , createDirectives.call(altr, el, directives, lookups)
    )
  }

  for(var i = 0, l = altr.tagList.length; i < l; ++i) {
    if(attr = altr_tags[altr.tagList[i].attr]) {
      return altr.mergeHooks(
          hooks
        , altr.tagList[i].constructor.call(altr, el, attr, lookups)
      )
    }
  }

  return altr.mergeHooks(hooks, altr.initNodes(el.childNodes, lookups))
}

},{"./attributes":2,"./directives":4}],6:[function(require,module,exports){
module.exports = get

function get(_el) {
  var el = _el

  while(el && el._altrPlaceholder) {
    el = el._altrPlaceholder

    if(el === _el) {
      throw new Error('placeholder circular refference')
    }
  }

  return el
}

},{}],7:[function(require,module,exports){
var placeholder = require('./tags/placeholder')
  , childrenTag = require('./tags/children')
  , includeTag = require('./tags/include')
  , textTag = require('./tags/text')
  , htmlTag = require('./tags/html')
  , withTag = require('./tags/with')
  , forTag = require('./tags/for')
  , ifTag = require('./tags/if')
  , altr = require('./altr')

module.exports = altr

altr.addTag('altr-placeholder', placeholder)
altr.addTag('altr-children', childrenTag)
altr.addTag('altr-replace', placeholder)
altr.addTag('altr-include', includeTag)
altr.addTag('altr-text', textTag)
altr.addTag('altr-html', htmlTag)
altr.addTag('altr-with', withTag)
altr.addTag('altr-for', forTag)
altr.addTag('altr-if', ifTag)

},{"./altr":1,"./tags/children":15,"./tags/for":16,"./tags/html":17,"./tags/if":18,"./tags/include":19,"./tags/placeholder":20,"./tags/text":21,"./tags/with":22}],8:[function(require,module,exports){
module.exports = insert

function insert(parent, el, before) {
  var inserted = el.parentNode !== parent

  before = before || null

  if(inserted || el.nextSibling !== before) {
    parent.insertBefore(el, before)
  }

  if(inserted) {
    this.emit('insert', el, parent)
  }
}

},{}],9:[function(require,module,exports){
module.exports = merge

var types = ['update', 'insert', 'remove', 'destroy']

function merge(_lhs, _rhs) {
  var out = {}
    , type

  var lhs = _lhs || {}
    , rhs = _rhs || {}

  for(var i = 0, l = types.length; i < l; ++i) {
    type = arrayify(lhs[types[i]]).concat(arrayify(rhs[types[i]]))

    if(type.length) {
      out[types[i]] = type
    }
  }

  return Object.keys(out).length ? out : null
}

function arrayify(obj) {
  return obj ? Array.isArray(obj) ? obj.filter(Boolean) : [obj] : []
}

},{}],10:[function(require,module,exports){
(function (global){
module.exports = requestAnimationFrame

function requestAnimationFrame(callback) {
  var raf = global.requestAnimationFrame ||
    global.webkitRequestAnimationFrame ||
    global.mozRequestAnimationFrame ||
    timeout

  return raf(callback)

  function timeout(callback) {
    return setTimeout(callback, 1000 / 60)
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(require,module,exports){
module.exports = remove

function remove(parent, el) {
  parent.removeChild(el)
  this.emit('remove', el, parent)
}

},{}],12:[function(require,module,exports){
module.exports = render

function render(template, state, el) {
  if(this.includes[template]) {
    template = this.includes[template]
  }

  var instance = this(template)

  instance.update(state || {}, true)

  if(el) {
    instance.into(el)
  }

  return instance
}

},{}],13:[function(require,module,exports){
module.exports = replace

function replace(parent, el, old) {
  parent.replaceChild(el, old)
  this.emit('replace', el, old, parent)
  this.emit('insert', el, parent)
  this.emit('remove', old, parent)
}

},{}],14:[function(require,module,exports){
var get = require('./get-element')

module.exports = setChildren

function setChildren(root, nodes) {
  var prev = null
    , el

  for(var i = nodes.length - 1; i >= 0; --i) {
    el = get(nodes[i])
    this.insert(root, el, prev)
    prev = el
  }

  while((el = root.firstChild) !== prev) {
    this.remove(root, el)
  }
}

},{"./get-element":6}],15:[function(require,module,exports){
var setChildren = require('../set-children')

module.exports = children

function children(el, getter, lookups) {
  var current = []

  el.innerHTML = ''
  this.batch.add(lookups.register(getter, update.bind(this)))

  function update(val) {
    var nodes = (Array.isArray(val) ? val : [val]).filter(is_node)

    for(var i = 0, l = nodes.length; i < l; ++i) {
      if(nodes[i] !== current[i]) {
        break
      }
    }

    if(i === nodes.length === current.length) {
      return
    }

    current = nodes
    setChildren.call(this, el, current)
  }
}

function is_node(el) {
  return el && el.nodeType
}

},{"../set-children":14}],16:[function(require,module,exports){
var setChildren = require('../set-children')
  , for_regexp = /^(.*?)\s+in\s+(.*$)/

module.exports = forHandler

function forHandler(root, args, lookups) {
  var parts = args.match(for_regexp)
    , template = root.innerHTML
    , domNodes = []
    , children = []
    , altr = this
    , items = []

  if(!parts) {
    throw new Error('invalid for tag: ' + args)
  }

  root.innerHTML = ''

  var unique = parts[1].split(':')[1]
    , prop = parts[1].split(':')[0]
    , key = parts[2]

  var runUpdates = this.batch.add(runDomUpdates)

  lookups.register(key, update)

  return {destroy: destroy}

  function updateChildren(data) {
    var itemData

    for(var i = 0, l = children.length; i < l; ++i) {
      itemData = Object.create(data)
      itemData[prop] = items[i]
      itemData['$index'] = i
      children[i].lookups.update(itemData)
    }
  }

  function destroy() {
    for(var i = 0, l = children.length; i < l; ++i) {
      runDestroy(children[i].hooks)
    }
  }

  function update(newItems) {
    if(!Array.isArray(newItems)) {
      newItems = []
    }

    var newChildren = new Array(newItems.length)
      , matched = {}
      , index

    domNodes = []

    for(var i = 0, l = newItems.length; i < l; ++i) {
      index = findIndex(items, newItems[i], unique)

      if(index !== -1) {
        newChildren[i] = children[index]
        items[index] = children[index] = matched
      } else {
        newChildren[i] = makeChild()
      }

      domNodes = domNodes.concat(newChildren[i].nodes)
    }

    for(var i = 0, l = children.length; i < l; ++i) {
      if(children[i] !== matched) {
        runDestroy(children[i].hooks)
      }
    }

    children = newChildren.slice()
    items = newItems.slice()
    runUpdates.call(altr)
    updateChildren(lookups.state)
  }

  function findIndex(items, d, unique) {
    if(!unique) {
      return items.indexOf(d)
    }

    for(var i = 0, l = items.length; i < l; ++i) {
      if(items[i][unique] === d[unique]) {
        return i
      }
    }

    return -1
  }

  function makeChild() {
    var temp = altr.document.createElementNS(root.namespaceURI, 'div')

    temp.innerHTML = template

    return altr.initNodes(Array.prototype.slice.call(temp.childNodes))
  }

  function runDomUpdates() {
    setChildren.call(this, root, domNodes)
  }

  function runDestroy(hooks) {
    if(!hooks.destroy) {
      return
    }

    var list = Array.isArray(hooks.destroy) ? hooks.destroy : [hooks.destroy]

    for(var i = 0, l = list.length; i < l; ++i) {
      list[i]()
    }
  }
}

},{"../set-children":14}],17:[function(require,module,exports){
module.exports = html

function html(el, accessor, lookups) {
  this.batch.add(lookups.register(accessor, update, lookups))

  function update(val) {
    el.innerHTML = typeof val === 'undefined' ? '' : val

    if(el.getAttribute('altr-run-scripts')) {
      [].forEach.call(el.getElementsByTagName('script'), run)
    }
  }
}

function run(script) {
  var fixed = document.createElement('script')
    , parent = script.parentNode
    , attrs = script.attributes
    , src

  for(var i = 0, l = attrs.length; i < l; ++i) {
    fixed.setAttribute(attrs[i].name, attrs[i].value)
  }

  fixed.textContent = script.textContent
  parent.insertBefore(fixed, script)
  parent.removeChild(script)
}

},{}],18:[function(require,module,exports){
module.exports = ifTag

function ifTag(el, getter, lookups) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , children = this.initNodes(el.childNodes)
    , hidden = null
    , altr = this

  var hide = this.batch.add(function() {
    var parent = el.parentNode

    if(!hidden) {
      altr.replace(el.parentNode, placeholder, el)
      el._altrPlaceholder = placeholder
      hidden = true
    }
  })

  var show = this.batch.add(function() {
    if(hidden) {
      altr.replace(placeholder.parentNode, el, placeholder)
      delete el._altrPlaceholder
      hidden = false
    }
  })

  lookups.register(getter, toggle, true)

  return children.hooks

  function toggle(val) {
    if(!val) {
      return hide()
    }

    show()
    children.lookups.update(lookups.state)
  }
}

},{}],19:[function(require,module,exports){
module.exports = include

function include(el, name, lookups) {
  el.innerHTML = this.includes[name]

  return this.initNodes(el.childNodes, lookups)
}

},{}],20:[function(require,module,exports){
module.exports = placeholder

function placeholder(original, getter, lookups) {
  var current = original
    , altr = this

  this.batch.add(lookups.register(getter, update))

  function update(val) {
    if(!val || !val.nodeName || val === current) {
      return
    }

    altr.replace(current.parentNode, val, current)
    original._altrPlaceholder = val
    current = val
  }
}

},{}],21:[function(require,module,exports){
module.exports = text

function text(el, getter, lookups) {
  this.batch.add(lookups.register(getter, update))

  function update(val) {
    el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],22:[function(require,module,exports){
module.exports = withTag

function withTag(el, getter, lookups) {
  var children = this.initNodes(el.childNodes)
    , parts = getter.split(' as ')

  lookups.register(parts[0], update)

  return children.hooks

  function update(_val) {
    var val = Object.create(lookups.state)

    val[parts[1]] = _val
    children.lookups.update(val)
  }
}

},{}],23:[function(require,module,exports){
var TAG = /{{\s*(.*?)\s*}}/

module.exports = templatString

function templatString(template, change, lookups) {
  if(!template.match(TAG)) {
    return
  }

  var remaining = template
    , parts = []
    , hooks = []
    , index
    , next

  while(remaining && (next = remaining.match(TAG))) {
    if(index = remaining.indexOf(next[0])) {
      parts.push(remaining.slice(0, index))
    }

    parts.push('')
    remaining = remaining.slice(index + next[0].length)
    lookups.register(next[1], setPart.bind(this, parts.length - 1))
  }

  if(remaining) {
    parts.push(remaining)
  }

  function setPart(idx, val) {
    parts[idx] = val
    change(parts.join(''))
  }
}

},{}],24:[function(require,module,exports){
module.exports = initTextNode

function initTextNode(el, lookups) {
  this.templateString(
      el.textContent
    , this.batch.add(update)
    , lookups
  )

  function update(val) {
    el.textContent = val
  }
}

},{}],25:[function(require,module,exports){
module.exports = toString

function toString() {
  return this.rootNodes().map(function(node) {
    switch(node.nodeType) {
      case this.document.DOCUMENT_FRAGMENT_NODE:
      case this.document.COMMENT_NODE: return clone.call(this, node)
      case this.document.TEXT_NODE: return node.textContent
      default: return node.outerHTML
    }
  }, this).join('')

  function clone(node) {
    var temp = this.document.createElement('div')

    temp.appendChild(node.cloneNode(true))

    return temp.innerHTML
  }
}

},{}],26:[function(require,module,exports){
module.exports = Batch

function Batch(ready, all) {
  if(!(this instanceof Batch)) {
    return new Batch(ready, all)
  }

  this.jobs = []
  this.all = all
  this.ready = ready
  this.queud = false
  this.run = this.run.bind(this)
}

Batch.prototype.queue = queue
Batch.prototype.add = add
Batch.prototype.run = run

function add(fn) {
  var queued = false
    , batch = this
    , self
    , args

  return queue

  function queue() {
    args = [].slice.call(arguments)
    self = this

    if(queued) {
      return batch.all && batch.ready()
    }

    queued = true
    batch.queue(run)
  }

  function run() {
    queued = false
    fn.apply(self, args)
  }
}

function queue(fn) {
  this.jobs.push(fn)

  if(this.all || !this.queued) {
    this.queued = true
    this.ready(this)
  }
}

function run() {
  var jobs = this.jobs

  this.jobs = []
  this.queued = false

  for(var i = 0, l = jobs.length; i < l; ++i) {
    jobs[i]()
  }

  return !!this.jobs.length
}

},{}],27:[function(require,module,exports){
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
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
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

},{}],28:[function(require,module,exports){
var operators = require('./types/operators')
  , brackets = require('./types/brackets')
  , dot_path = require('./types/dot-path')
  , filters = require('./types/filters')
  , partial = require('./types/partial')
  , EE = require('events').EventEmitter
  , parens = require('./types/parens')
  , values = require('./types/values')
  , split = require('./split')
  , list = require('./list')

module.exports = DirtyBit

function DirtyBit(state, _options) {
  if(!(this instanceof DirtyBit)) {
    return new DirtyBit(state, _options)
  }

  var options = _options || {}

  EE.call(this)
  this.state = state || {}
  this.events = new EE
  this.deps = Object.create(null)
  this.values = Object.create(null)
  this.lookups = Object.create(null)
  this.filters = Object.create(options.filters || null)
  this.always = []
  this.getters = []
  this.updating = false
  this.updates = {}
  this.setMaxListeners(0)
  this.events.setMaxListeners(0)
  this.rootKey = options.rootKey
  this.lookups['this'] = Infinity
  this.lookups[this.rootKey] = Infinity
  this.update(this.state)
}

DirtyBit.prototype = Object.create(EE.prototype)
DirtyBit.prototype.updateValue = updateValue
DirtyBit.prototype.deregister = deregister
DirtyBit.prototype.constructor = DirtyBit
DirtyBit.prototype.addFilter = addFilter
DirtyBit.prototype.register = register
DirtyBit.prototype.registerList = list
DirtyBit.prototype.update = update
DirtyBit.prototype.on = cleaned_on
DirtyBit.prototype.watch = watch
DirtyBit.prototype.clean = clean
DirtyBit.prototype.split = split
DirtyBit.prototype.hash = hash
DirtyBit.prototype.types = []

DirtyBit.prototype.types.push(values)
DirtyBit.prototype.types.push(filters)
DirtyBit.prototype.types.push(partial)
DirtyBit.prototype.types.push(parens)
DirtyBit.prototype.types.push(operators)
DirtyBit.prototype.types.push(brackets)
DirtyBit.prototype.types.push(dot_path)

function register(_lookup, callback, all, dep_of, _first) {
  var first = _first || typeof first === 'undefined'
    , lookup = this.clean(_lookup)

  if(dep_of) {
    this.events.on(lookup, callback)
    this.deps[dep_of] = this.deps[dep_of] || {}
    this.deps[dep_of][lookup] = callback
  } else if(all) {
    this.always.push({lookup: lookup, callback: callback})
  } else {
    this.on(lookup, callback)
  }

  if((this.lookups[lookup] = (this.lookups[lookup] || 0) + 1) !== 1) {
    if(first) {
      callback.apply(
          this
        , this.values[lookup] ? this.values[lookup].slice(1) : undefined
      )
    }

    return
  }

  if(!this.updating) {
    this.updating = true
    this.watch(lookup)
    this.updating = false
    first && callback.apply(
        this
      , this.values[lookup] ? this.values[lookup].slice(1) : undefined
    )
    this.updates = {}
  } else {
    this.watch(lookup)
  }

}

function deregister(_lookup, callback) {
  var lookup = this.clean(_lookup)
    , deps = this.deps[lookup]
    , names

  this.removeListener(lookup, callback)
  this.events.removeListener(lookup, callback)
  --this.lookups[lookup]

  if(this.lookups[lookup] > 0 || !deps) {
    return
  }

  this.always = this.always.filter(function(handler) {
    return !(handler.callback === callback && handler.lookup === lookup)
  })

  if(!this._events[lookup] && !this.events._events[lookup]) {
    names = Object.keys(deps)
    delete this.deps[lookup]
    delete this.values[lookup]
    delete this.lookups[lookup]

    for(var i = 0, l = names.length; i < l; ++i) {
      this.deregister(names[i], deps[names[i]])
    }
  }
}

function watch(_lookup) {
  var lookups = this.split(this.clean(_lookup), ',', true)

  if(lookups.length > 1) {
    return this.registerList(lookups,lookups.join(','))
  }

  for(var i = 0, l = this.types.length; i < l; ++i) {
    if(this.types[i].call(this, lookups[0])) {
      break
    }
  }

  if(i === l) {
    throw new Error('invalid lookup: ' + lookups[0])
  }
}

function updateValue(lookup) {
  var args = Array.prototype.slice.call(arguments)

  for(var i = 0, l = args.length; i < l; ++i) {
    if(!this.values[lookup]) {
      break
    }

    if(this.values[lookup][i] === args[i] && typeof args[i] !== 'object') {
      break
    }
  }

  if(i === l) {
    return
  }

  this.values[lookup] = args
  this.events.emit.apply(this.events, args)

  if(this.updating) {
    return this.updates[lookup] = args
  }

  this.emit.apply(this, args)
}

function update(val) {
  this.updating = true
  this.state = val
  this.state

  this.updateValue('this', val)
  this.rootKey && this.updateValue(this.rootKey, val)

  for(var i = 0, l = this.getters.length; i < l; ++i) {
    this.getters[i](val)
  }

  this.updating = false

  var updates = Object.keys(this.updates)

  for(var i = 0, l = updates.length; i < l; ++i) {
    this.emit.apply(this, this.updates[updates[i]])
  }

  for(var i = 0, l = this.always.length; i < l; ++i) {
    this.always[i].callback.apply(
        this
      , this.values[this.always[i].lookup].slice(1)
    )
  }

  this.updates = {}
}

function addFilter(name, filter) {
  this.filters[name] = filter
}

function clean(lookup) {
  return this.split(lookup, ',', true).map(trim).join(',')
}

function trim(str) {
  return str.replace(/^\s+|\s+$/g, '')
}

function cleaned_on(lookup, callback) {
  EE.prototype.on.call(this, this.clean(lookup), callback)
}

function hash(str) {
  var hash = 0

  for(var i = 0, len = str.length; i < len; ++i) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }

  return hash.toString().replace('-', '#')
}

},{"./list":29,"./split":30,"./types/brackets":31,"./types/dot-path":32,"./types/filters":33,"./types/operators":34,"./types/parens":35,"./types/partial":36,"./types/values":37,"events":27}],29:[function(require,module,exports){
module.exports = list

function list(_lookups, key) {
  var lookups = _lookups.map(this.clean.bind(this))
    , values = new Array(_lookups.length)

  for(var i = 0, l = lookups.length; i < l; ++i) {
    this.register(lookups[i], update.bind(this, i), false, key)
  }

  function update(i, val) {
    values[i] = val
    this.updateValue.apply(this, [key].concat(values))
  }
}

},{}],30:[function(require,module,exports){
var default_pairs = [
    ['(', ')']
  , ['[', ']']
  , ['?', ':']
  , ['"', '"', true]
  , ["'", "'", true]
]

module.exports = split
module.exports.pairs = default_pairs

function split(parts, key, all, _pairs) {
  var pairs = _pairs || default_pairs
    , inString = false
    , layers = []

  for(var i = 0, l = parts.length; i < l; ++i) {
    if(!layers.length) {
      for(var j = 0, l2 = key.length; j < l2; ++j) {
        if(parts[i + j] !== key[j]) {
          break
        }
      }

      if(j === key.length) {
        break
      }
    }

    if(layers.length && layers[layers.length - 1] === parts[i]) {
      inString = false
      layers.pop()

      continue
    }

    if(inString) {
      continue
    }

    for(var j = 0, l2 = pairs.length; j < l2; ++j) {
      if(parts[i] === pairs[j][0]) {
        if(pairs[j][2]) {
          inString = true
        }

        layers.push(pairs[j][1])

        break
      }
    }
  }

  if(layers.length) {
    throw new Error(
      'Unmatched pair in ' + parts + '. expecting: ' + layers.pop()
    )
  }

  if(i === parts.length) {
    return [parts]
  }

  var right = parts.slice(i + key.length)
    , left = parts.slice(0, i)

  if(!all) {
    return [left, right]
  }

  return [left].concat(split(right, key, all, pairs))
}

},{}],31:[function(require,module,exports){
var has_bracket = /^.+\[.+\]$/

module.exports = dot_path

function dot_path(lookup) {
  if(!has_bracket.test(lookup)) {
    return
  }

  var pairs = this.split.pairs.map(function(pair) {
    return [pair[1], pair[0], pair[2]]
  })

  var parts = this.split(reverse(lookup.slice(0, -1)), '[', false, pairs)
    .map(reverse)

  var self = this
    , inner
    , root

  this.register(parts[0], update_inner, false, lookup)
  this.register(parts[1], update_root, false, lookup)

  function update_inner(val) {
    inner = val
    update()
  }

  function update_root(val) {
    root = val
    update()
  }

  return true

  function update() {
    if(root === null || root === undefined) {
      return self.updateValue(lookup, undefined)
    }

    self.updateValue(lookup, root[inner])
  }
}

function reverse(str) {
  return str.split('').reverse().join('')
}

},{}],32:[function(require,module,exports){
var valid_path = /^(.*)\.([^.\s]+)$/

module.exports = dot_path

function dot_path(lookup) {
  var parts = lookup.match(valid_path)
    , self = this

  if(parts) {
    self.register(parts[1], update, false, lookup)

    return true
  }

  update(self.state)

  return self.getters.push(update)

  function update(obj) {
    if(obj === null || obj === undefined) {
      return self.updateValue(lookup, undefined)
    }

    self.updateValue(lookup, obj[parts ? parts[2] : lookup])
  }
}

},{}],33:[function(require,module,exports){
var filter_regexp = /^([^\s(]+)\((.*)\)$/

module.exports = create_filter

function create_filter(lookup) {
  var parts = lookup.match(filter_regexp)
    , self = this

  if(!parts) {
    return
  }

  var filter = self.filters[parts[1]]

  if(!filter) {
    throw new Error('could not find filter: ' + lookup)
  }

  filter = filter.call(self, update)
  self.register(parts[2], notify, false, lookup)

  return true

  function notify() {
    filter.apply(self, arguments)
  }

  function update(val) {
    self.updateValue(lookup, val)
  }
}

},{}],34:[function(require,module,exports){
var ternary_regexp = /^\s*(.+?)\s*\?(.*)\s*$/

module.exports = operator

var updaters = {}
  , types = []

// push in inverse order of operations
types.push({
    test: ternary_regexp
  , create: create_ternary
})

types.push(binary(['|\\|']))
types.push(binary(['&&']))
types.push(binary(['|']))
types.push(binary(['^']))
types.push(binary(['&']))
types.push(binary(['===', '!==', '==', '!=']))
types.push(binary(['>=', '<=', '>', '<', ' in ', ' instanceof ']))
// types.push(binary(['<<', '>>', '>>>'])) //conflics with < and >
types.push(binary(['+', '-']))
types.push(binary(['*', '/', '%']))
types.push(unary(['!', '+', '-', '~']))

updaters['in'] = update_in
updaters['instanceof'] = update_instanceof

function operator(lookup) {
  var parts

  for(var i = 0, l = types.length; i < l; ++i) {
    if(parts = lookup.match(types[i].test)) {
      types[i].create.call(this, parts, lookup)

      return true
    }
  }
}

function create_ternary(parts, lookup) {
  var self = this
    , right
    , left
    , ok

  var rest = self.split(parts[2], ':')

  if(rest.length !== 2) {
    throw new Error('Unmatched ternary in: ' + lookup)
  }

  self.register(parts[1], update_ok, false, lookup)
  self.register(rest[0], update_left, false, lookup)
  self.register(rest[1], update_right, false, lookup)

  function update_ok(val) {
    ok = val
    update()
  }

  function update_left(val) {
    left = val
    update()
  }

  function update_right(val) {
    right = val
    update()
  }

  function update() {
    self.updateValue(lookup, ok ? left : right)
  }
}

function binary(list) {
  return {
      test: new RegExp('^(.+?)(\\' + list.join('|\\') + ')(.+)$')
    , create: create_binary
  }
}

function create_binary(parts, lookup) {
  var update = updaters[this.clean(parts[2])]
    , self = this
    , right
    , left

  if(!update) {
    update = Function('lhs, rhs', 'return lhs ' + parts[2] + ' rhs')
  }

  self.register(parts[1], update_left, false, lookup)
  self.register(parts[3], update_right, false, lookup)

  function update_left(val) {
    self.updateValue(lookup, update(left = val, right))
  }

  function update_right(val) {
    self.updateValue(lookup, update(left, right = val))
  }
}

function unary(list) {
  var regex = new RegExp('^(\\' + list.join('|\\') + ')(.+)$')

  return {test: regex, create: create_unary}
}

function create_unary(parts, lookup) {
  var update = Function('val', 'return ' + parts[1] + 'val')
    , self = this

  self.register(parts[2], function(val) {
    self.updateValue(lookup, update(val))
  }, false, lookup)
}

function update_in(left, right) {
  return typeof right !== 'undefined' && left in right
}

function update_instanceof(left, right) {
  return typeof right === 'function' && left instanceof right
}

},{}],35:[function(require,module,exports){
var parens_regexp = /(^|[^0-9a-zA-Z_$])\((.*)$/

module.exports = create_parens

function create_parens(lookup) {
  var parts = lookup.match(parens_regexp)

  if(!parts) {
    return
  }

  var body = parts[2]
    , self = this
    , count = 1
    , inner
    , outer

  for(var i = 0, l = body.length; i < l; ++i) {
    if(body[i] === ')') {
      --count
    } else if(body[i] === '(') {
      ++count
    }

    if(!count) {
      break
    }
  }

  if(!i || i === l) {
    throw new Error('Unmatched parens: ' + lookup)
  }

  var inner = body.slice(0, i)

  var key = '{{paren_' + self.hash(inner) + '}}'

  var patched = lookup.slice(0
    , lookup.lastIndexOf([parts[2]]) - 1
  ) + key + body.slice(i + 1)

  self.register(inner, function(val) {
    self.updateValue(key, val)
  }, false, lookup)

  self.register(patched, update, false, lookup)

  return true

  function update(val) {
    self.updateValue(lookup, val)
  }
}

},{}],36:[function(require,module,exports){
var regexp = /^\{\{.+\}\}$/

module.exports = partial

function partial(lookup) {
  var value = this.values[lookup]

  if(regexp.test(lookup)) {
    if(this.lookups[lookup] === 1) {
      this.values[lookup] = [lookup]
      this.updateValue.apply(this, value)
    }

    return true
  }
}

},{}],37:[function(require,module,exports){
var string_regexp = /^(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")$/
  , number_regexp = /^(\d*(?:\.\d+)?)$/

module.exports = create_value

var vals = {
    'true': true
  , 'false': false
  , 'null': null
  , 'undefined': undefined
}

function create_value(lookup) {
  var parts

  if(vals.hasOwnProperty(lookup)) {
    return this.updateValue(lookup, vals[lookup]) || true
  }

  if(parts = lookup.match(number_regexp)) {
    return this.updateValue(lookup, +parts[1]) || true
  }

  if(parts = lookup.match(string_regexp)) {
    return this.updateValue(lookup, parts[1] || parts[2] || '') || true
  }
}

},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYWx0ci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9hdHRyaWJ1dGVzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2Jyb3dzZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZGlyZWN0aXZlcy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50LW5vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZ2V0LWVsZW1lbnQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5zZXJ0LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL21lcmdlLWhvb2tzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3JhZi5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9yZW1vdmUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvcmVuZGVyLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3JlcGxhY2UuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvc2V0LWNoaWxkcmVuLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvY2hpbGRyZW4uanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvcGxhY2Vob2xkZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy90ZXh0LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3Mvd2l0aC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90ZW1wbGF0ZS1zdHJpbmcuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGV4dC1ub2RlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RvLXN0cmluZy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9iYXRjaC1xdWV1ZS9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvbGlzdC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvc3BsaXQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3R5cGVzL2JyYWNrZXRzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy9kb3QtcGF0aC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvZmlsdGVycy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvb3BlcmF0b3JzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy9wYXJlbnMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3R5cGVzL3BhcnRpYWwuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3R5cGVzL3ZhbHVlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcbiAgLCBiYXRjaCA9IHJlcXVpcmUoJ2JhdGNoLXF1ZXVlJylcbiAgLCBkaXJ0eWJpdCA9IHJlcXVpcmUoJ2RpcnR5Yml0JylcblxudmFyIHRlbXBsYXRlU3RyaW5nID0gcmVxdWlyZSgnLi90ZW1wbGF0ZS1zdHJpbmcnKVxuICAsIGVsZW1lbnROb2RlID0gcmVxdWlyZSgnLi9lbGVtZW50LW5vZGUnKVxuICAsIG1lcmdlSG9va3MgPSByZXF1aXJlKCcuL21lcmdlLWhvb2tzJylcbiAgLCB0ZXh0Tm9kZSA9IHJlcXVpcmUoJy4vdGV4dC1ub2RlJylcbiAgLCB0b1N0cmluZyA9IHJlcXVpcmUoJy4vdG8tc3RyaW5nJylcbiAgLCBnZXRFbCA9IHJlcXVpcmUoJy4vZ2V0LWVsZW1lbnQnKVxuICAsIHJlcGxhY2UgPSByZXF1aXJlKCcuL3JlcGxhY2UnKVxuICAsIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJylcbiAgLCBpbnNlcnQgPSByZXF1aXJlKCcuL2luc2VydCcpXG4gICwgcmVtb3ZlID0gcmVxdWlyZSgnLi9yZW1vdmUnKVxuICAsIHJhZiA9IHJlcXVpcmUoJy4vcmFmJylcblxuLy8gZHluYW1pYyByZXF1aXJlIHNvIGl0IGRvZXMgbm90IG1ha2UgaXQgaW50byB0aGUgYnJvd3NlcmlmeSBidW5kbGVcbnZhciBkb21Nb2R1bGUgPSAnbWljcm8tZG9tJ1xuXG5hbHRyLmZpbHRlcnMgPSB7fVxuYWx0ci5pbmNsdWRlcyA9IHt9XG5hbHRyLmRpcmVjdGl2ZXMgPSB7fVxuYWx0ci5yZW5kZXIgPSByZW5kZXJcbmFsdHIuYWRkVGFnID0gYWRkVGFnXG5hbHRyLmluY2x1ZGUgPSBpbmNsdWRlXG5hbHRyLmFkZEZpbHRlciA9IGFkZEZpbHRlclxuYWx0ci5hZGREaXJlY3RpdmUgPSBhZGREaXJlY3RpdmVcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmZ1bmN0aW9uIGFsdHIocm9vdCwgZGF0YSwgc3luYywgZG9jKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIGFsdHIpKSB7XG4gICAgcmV0dXJuIG5ldyBhbHRyKHJvb3QsIGRhdGEsIHN5bmMsIGRvYylcbiAgfVxuXG4gIEVFLmNhbGwodGhpcylcbiAgdGhpcy5zeW5jID0gISFzeW5jXG4gIHRoaXMucm9vdCA9IHJvb3RcbiAgdGhpcy5kb2N1bWVudCA9IGRvYyB8fCBnbG9iYWwuZG9jdW1lbnQgfHwgcmVxdWlyZShkb21Nb2R1bGUpLmRvY3VtZW50XG4gIHRoaXMuZmlsdGVycyA9IE9iamVjdC5jcmVhdGUoYWx0ci5maWx0ZXJzKVxuICB0aGlzLmluY2x1ZGVzID0gT2JqZWN0LmNyZWF0ZShhbHRyLmluY2x1ZGVzKVxuICB0aGlzLmRpcmVjdGl2ZXMgPSBPYmplY3QuY3JlYXRlKGFsdHIuZGlyZWN0aXZlcylcbiAgdGhpcy5sb29rdXBzID0gZGlydHliaXQoZGF0YSwge2ZpbHRlcnM6IHRoaXMuZmlsdGVyc30pXG4gIHRoaXMuYmF0Y2ggPSBiYXRjaCgoZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuc3luYykge1xuICAgICAgcmFmKHRoaXMucnVuQmF0Y2guYmluZCh0aGlzKSlcbiAgICB9XG4gIH0pLmJpbmQodGhpcykpXG5cbiAgaWYoZ2xvYmFsLkJ1ZmZlciAmJiByb290IGluc3RhbmNlb2YgZ2xvYmFsLkJ1ZmZlcikge1xuICAgIHJvb3QgPSByb290LnRvU3RyaW5nKClcbiAgfVxuXG4gIGlmKHR5cGVvZiByb290ID09PSAnc3RyaW5nJykge1xuICAgIHZhciB0ZW1wID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSByb290XG4gICAgdGhpcy5yb290ID0gdGhpcy5kb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcblxuICAgIHdoaWxlKHRlbXAuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy5yb290LmFwcGVuZENoaWxkKHRlbXAuZmlyc3RDaGlsZClcbiAgICB9XG4gIH1cblxuICB0aGlzLmhvb2tzID0gdGhpcy5pbml0Tm9kZXModGhpcy5yb290Tm9kZXMoKSwgdGhpcy5sb29rdXBzKVxuICB0aGlzLnJ1bkJhdGNoKClcbn1cblxuYWx0ci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVFLnByb3RvdHlwZSlcbmFsdHIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gYWx0clxuXG5hbHRyLnByb3RvdHlwZS50ZW1wbGF0ZVN0cmluZyA9IHRlbXBsYXRlU3RyaW5nXG5hbHRyLnByb3RvdHlwZS5hZGREaXJlY3RpdmUgPSBhZGREaXJlY3RpdmVcbmFsdHIucHJvdG90eXBlLm1lcmdlSG9va3MgPSBtZXJnZUhvb2tzXG5hbHRyLnByb3RvdHlwZS5pbml0Tm9kZXMgPSBpbml0Tm9kZXNcbmFsdHIucHJvdG90eXBlLnJvb3ROb2RlcyA9IHJvb3Rfbm9kZXNcbmFsdHIucHJvdG90eXBlLmFkZEZpbHRlciA9IGFkZEZpbHRlclxuYWx0ci5wcm90b3R5cGUucnVuQmF0Y2ggPSBydW5CYXRjaFxuYWx0ci5wcm90b3R5cGUudG9TdHJpbmcgPSB0b1N0cmluZ1xuYWx0ci5wcm90b3R5cGUuZ2V0RWxlbWVudCA9IGdldEVsXG5hbHRyLnByb3RvdHlwZS5pbmNsdWRlID0gaW5jbHVkZVxuYWx0ci5wcm90b3R5cGUucmVwbGFjZSA9IHJlcGxhY2VcbmFsdHIucHJvdG90eXBlLmRlc3Ryb3kgPSBkZXN0cm95XG5hbHRyLnByb3RvdHlwZS5pbnRvID0gYXBwZW5kVG9cbmFsdHIucHJvdG90eXBlLnVwZGF0ZSA9IHVwZGF0ZVxuYWx0ci5wcm90b3R5cGUuaW5zZXJ0ID0gaW5zZXJ0XG5hbHRyLnByb3RvdHlwZS5yZW1vdmUgPSByZW1vdmVcbmFsdHIucHJvdG90eXBlLnRhZ0xpc3QgPSBbXVxuYWx0ci5wcm90b3R5cGUudGFncyA9IHt9XG5cbnZhciBub2RlX2hhbmRsZXJzID0ge31cblxubm9kZV9oYW5kbGVyc1sxXSA9IGVsZW1lbnROb2RlXG5ub2RlX2hhbmRsZXJzWzNdID0gdGV4dE5vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEsIHN5bmMpIHtcbiAgdGhpcy5zdGF0ZSA9IGRhdGFcbiAgdGhpcy5sb29rdXBzLnVwZGF0ZShkYXRhKVxuICB0aGlzLmVtaXQoJ3VwZGF0ZScpXG5cbiAgaWYoc3luYyB8fCB0aGlzLnN5bmMpIHtcbiAgICB0aGlzLnJ1bkJhdGNoKClcbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0Tm9kZXMobm9kZXMsIF9sb29rdXBzKSB7XG4gIHZhciBsb29rdXBzID0gX2xvb2t1cHMgfHwgZGlydHliaXQobnVsbCwge2ZpbHRlcnM6IHRoaXMuZmlsdGVyc30pXG5cbiAgdmFyIGhvb2tzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobm9kZXMpXG4gICAgLm1hcChpbml0Tm9kZS5iaW5kKHRoaXMsIGxvb2t1cHMpKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAucmVkdWNlKHRoaXMubWVyZ2VIb29rcy5iaW5kKHRoaXMpLCB7fSlcblxuICByZXR1cm4ge2hvb2tzOiBob29rcywgbG9va3VwczogbG9va3Vwcywgbm9kZXM6IG5vZGVzfVxufVxuXG5mdW5jdGlvbiBpbml0Tm9kZShsb29rdXBzLCBlbCkge1xuICByZXR1cm4gbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV0gP1xuICAgIG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdLmNhbGwodGhpcywgZWwsIGxvb2t1cHMpIDpcbiAgICBlbC5jaGlsZE5vZGVzICYmIGVsLmNoaWxkTm9kZXMubGVuZ3RoID9cbiAgICB0aGlzLmluaXROb2Rlcyhsb29rdXBzLCBlbC5jaGlsZE5vZGVzKSA6XG4gICAgbnVsbFxufVxuXG5mdW5jdGlvbiByb290X25vZGVzKCkge1xuICByZXR1cm4gdGhpcy5yb290Lm5vZGVUeXBlID09PSB0aGlzLmRvY3VtZW50LkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUgP1xuICAgIFtdLnNsaWNlLmNhbGwodGhpcy5yb290LmNoaWxkTm9kZXMpIDpcbiAgICBbdGhpcy5yb290XVxufVxuXG5mdW5jdGlvbiBhZGRGaWx0ZXIobmFtZSwgZmlsdGVyKSB7XG4gIGFsdHIuZmlsdGVyc1tuYW1lXSA9IGZpbHRlclxufVxuXG5mdW5jdGlvbiBhZGRUYWcoYXR0ciwgdGFnKSB7XG4gIGFsdHIucHJvdG90eXBlLnRhZ3NbYXR0cl0gPSB0YWdcbiAgYWx0ci5wcm90b3R5cGUudGFnTGlzdC5wdXNoKHtcbiAgICAgIGF0dHI6IGF0dHJcbiAgICAsIGNvbnN0cnVjdG9yOiB0YWdcbiAgfSlcbn1cblxuZnVuY3Rpb24gYXBwZW5kVG8obm9kZSkge1xuICB2YXIgcm9vdF9ub2RlcyA9IHRoaXMucm9vdE5vZGVzKClcblxuICBmb3IodmFyIGkgPSAwLCBsID0gcm9vdF9ub2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBub2RlLmFwcGVuZENoaWxkKGdldEVsKHJvb3Rfbm9kZXNbaV0pKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluY2x1ZGUobmFtZSwgdGVtcGxhdGUpIHtcbiAgcmV0dXJuIHRoaXMuaW5jbHVkZXNbbmFtZV0gPSB0ZW1wbGF0ZVxufVxuXG5mdW5jdGlvbiBhZGRGaWx0ZXIobmFtZSwgZm4pIHtcbiAgcmV0dXJuIHRoaXMuZmlsdGVyc1tuYW1lXSA9IGZuXG59XG5cbmZ1bmN0aW9uIGFkZERpcmVjdGl2ZShuYW1lLCBmbikge1xuICByZXR1cm4gdGhpcy5kaXJlY3RpdmVzW25hbWVdID0gZm5cbn1cblxuZnVuY3Rpb24gcnVuQmF0Y2goKSB7XG4gIHRoaXMuYmF0Y2gucnVuKCkgJiYgdGhpcy5lbWl0KCdkcmF3JywgdGhpcy5zdGF0ZSlcbn1cblxuZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgdmFyIGxpc3QgPSB0aGlzLmhvb2tzLmRlc3Ryb3lcblxuICBpZighdGhpcy5ob29rcy5kZXN0cm95KSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBpZihBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgbGlzdCA9IFtsaXN0XVxuICB9XG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgbGlzdFtpXSgpXG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cy5yYXcgPSByYXdBdHRyaWJ1dGVcbm1vZHVsZS5leHBvcnRzLmFsdHIgPSBhbHRyQXR0cmlidXRlXG5tb2R1bGUuZXhwb3J0cy5wcm9wID0gYWx0clByb3BlcnR5XG5cbmZ1bmN0aW9uIHJhd0F0dHJpYnV0ZShlbCwgYXR0ciwgbG9va3Vwcykge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZVN0cmluZyhcbiAgICAgIGF0dHIudmFsdWVcbiAgICAsIHRoaXMuYmF0Y2guYWRkKGVsLnNldEF0dHJpYnV0ZS5iaW5kKGVsLCBhdHRyLm5hbWUpKVxuICAgICwgbG9va3Vwc1xuICApXG59XG5cbmZ1bmN0aW9uIGFsdHJBdHRyaWJ1dGUoZWwsIGF0dHIsIGxvb2t1cHMpIHtcbiAgdmFyIG5hbWUgPSBhdHRyLm5hbWUuc2xpY2UoJ2FsdHItYXR0ci0nLmxlbmd0aClcblxuICBsb29rdXBzLnJlZ2lzdGVyKGF0dHIudmFsdWUsIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSkpXG4gIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyLm5hbWUpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGlmKCF2YWwgJiYgdmFsICE9PSAnJyAmJiB2YWwgIT09IDApIHtcbiAgICAgIHJldHVybiBlbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSlcbiAgICB9XG5cbiAgICBpZih2YWwgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgJycpXG4gICAgfVxuXG4gICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbClcbiAgfVxufVxuXG5mdW5jdGlvbiBhbHRyUHJvcGVydHkoZWwsIGF0dHIsIGxvb2t1cHMpIHtcbiAgdmFyIG5hbWUgPSBhdHRyLm5hbWUuc2xpY2UoJ2FsdHItcHJvcC0nLmxlbmd0aClcblxuICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKVxuICBsb29rdXBzLnJlZ2lzdGVyKGF0dHIudmFsdWUsIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsW25hbWVdID0gdmFsXG4gIH1cbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gZ2xvYmFsLmFsdHIgPSByZXF1aXJlKCcuL2luZGV4JylcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IGRpcmVjdGl2ZXNcblxuZnVuY3Rpb24gZGlyZWN0aXZlcyhlbCwgYXR0cnMsIGxvb2t1cHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gICAgLCBob29rcyA9IFtdXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGF0dHJzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGhvb2tzLnB1c2goY3JlYXRlX2RpcmVjdGl2ZShcbiAgICAgICAgZWxcbiAgICAgICwgc2VsZi5kaXJlY3RpdmVzW2F0dHJzW2ldLm5hbWVdXG4gICAgICAsIGF0dHJzW2ldLnZhbHVlXG4gICAgKSlcbiAgfVxuXG4gIGlmKGhvb2tzLmxlbmd0aCkge1xuICAgIHJldHVybiBob29rcy5yZWR1Y2Uoc2VsZi5tZXJnZUhvb2tzLCB7fSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZV9kaXJlY3RpdmUoZWwsIGNyZWF0ZSwgZ2V0dGVyKSB7XG4gICAgdmFyIGhvb2tzID0gY3JlYXRlKGVsKVxuXG4gICAgaWYoIWhvb2tzKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZihob29rcy51cGRhdGUpIHtcbiAgICAgIGxvb2t1cHMucmVnaXN0ZXIoZ2V0dGVyLCBob29rcy51cGRhdGUpXG4gICAgICBkZWxldGUgaG9va3MudXBkYXRlXG4gICAgfVxuXG4gICAgcmV0dXJuIGhvb2tzXG4gIH1cbn1cbiIsInZhciBjcmVhdGVEaXJlY3RpdmVzID0gcmVxdWlyZSgnLi9kaXJlY3RpdmVzJylcbiAgLCBjcmVhdGVBdHRyID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzJylcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50Tm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50Tm9kZShlbCwgbG9va3Vwcykge1xuICB2YXIgZGlyZWN0aXZlcyA9IFtdXG4gICAgLCBhbHRyID0gdGhpc1xuICAgICwgaG9va3MgPSB7fVxuICAgICwgYXR0clxuXG4gIHZhciBhdHRycyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLmF0dHJpYnV0ZXMpXG4gICAgLCBkaXJlY3RpdmVzID0gW11cbiAgICAsIGFsdHJfdGFncyA9IHt9XG4gICAgLCB1cGRhdGVzID0gW11cbiAgICAsIHRhZ3MgPSB7fVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihhbHRyLnRhZ3NbYXR0cnNbaV0ubmFtZV0pIHtcbiAgICAgIGFsdHJfdGFnc1thdHRyc1tpXS5uYW1lXSA9IGF0dHJzW2ldLnZhbHVlXG4gICAgfSBlbHNlIGlmKGFsdHIuZGlyZWN0aXZlc1thdHRyc1tpXS5uYW1lXSkge1xuICAgICAgZGlyZWN0aXZlcy5wdXNoKGF0dHJzW2ldKVxuICAgIH0gZWxzZSBpZighYXR0cnNbaV0ubmFtZS5sYXN0SW5kZXhPZignYWx0ci1hdHRyLScsIDApKSB7XG4gICAgICB1cGRhdGVzLnB1c2goY3JlYXRlQXR0ci5hbHRyLmNhbGwodGhpcywgZWwsIGF0dHJzW2ldLCBsb29rdXBzKSlcbiAgICB9IGVsc2UgaWYoIWF0dHJzW2ldLm5hbWUubGFzdEluZGV4T2YoJ2FsdHItcHJvcC0nLCAwKSkge1xuICAgICAgdXBkYXRlcy5wdXNoKGNyZWF0ZUF0dHIucHJvcC5jYWxsKHRoaXMsIGVsLCBhdHRyc1tpXSwgbG9va3VwcykpXG4gICAgfSBlbHNlIHtcbiAgICAgIHVwZGF0ZXMucHVzaChjcmVhdGVBdHRyLnJhdy5jYWxsKHRoaXMsIGVsLCBhdHRyc1tpXSwgbG9va3VwcykpXG4gICAgfVxuICB9XG5cbiAgaG9va3MudXBkYXRlc1xuXG4gIGlmKGRpcmVjdGl2ZXMubGVuZ3RoKSB7XG4gICAgaG9va3MgPSBhbHRyLm1lcmdlSG9va3MoXG4gICAgICAgIGhvb2tzXG4gICAgICAsIGNyZWF0ZURpcmVjdGl2ZXMuY2FsbChhbHRyLCBlbCwgZGlyZWN0aXZlcywgbG9va3VwcylcbiAgICApXG4gIH1cblxuICBmb3IodmFyIGkgPSAwLCBsID0gYWx0ci50YWdMaXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGF0dHIgPSBhbHRyX3RhZ3NbYWx0ci50YWdMaXN0W2ldLmF0dHJdKSB7XG4gICAgICByZXR1cm4gYWx0ci5tZXJnZUhvb2tzKFxuICAgICAgICAgIGhvb2tzXG4gICAgICAgICwgYWx0ci50YWdMaXN0W2ldLmNvbnN0cnVjdG9yLmNhbGwoYWx0ciwgZWwsIGF0dHIsIGxvb2t1cHMpXG4gICAgICApXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGFsdHIubWVyZ2VIb29rcyhob29rcywgYWx0ci5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcywgbG9va3VwcykpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGdldFxuXG5mdW5jdGlvbiBnZXQoX2VsKSB7XG4gIHZhciBlbCA9IF9lbFxuXG4gIHdoaWxlKGVsICYmIGVsLl9hbHRyUGxhY2Vob2xkZXIpIHtcbiAgICBlbCA9IGVsLl9hbHRyUGxhY2Vob2xkZXJcblxuICAgIGlmKGVsID09PSBfZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncGxhY2Vob2xkZXIgY2lyY3VsYXIgcmVmZmVyZW5jZScpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGVsXG59XG4iLCJ2YXIgcGxhY2Vob2xkZXIgPSByZXF1aXJlKCcuL3RhZ3MvcGxhY2Vob2xkZXInKVxuICAsIGNoaWxkcmVuVGFnID0gcmVxdWlyZSgnLi90YWdzL2NoaWxkcmVuJylcbiAgLCBpbmNsdWRlVGFnID0gcmVxdWlyZSgnLi90YWdzL2luY2x1ZGUnKVxuICAsIHRleHRUYWcgPSByZXF1aXJlKCcuL3RhZ3MvdGV4dCcpXG4gICwgaHRtbFRhZyA9IHJlcXVpcmUoJy4vdGFncy9odG1sJylcbiAgLCB3aXRoVGFnID0gcmVxdWlyZSgnLi90YWdzL3dpdGgnKVxuICAsIGZvclRhZyA9IHJlcXVpcmUoJy4vdGFncy9mb3InKVxuICAsIGlmVGFnID0gcmVxdWlyZSgnLi90YWdzL2lmJylcbiAgLCBhbHRyID0gcmVxdWlyZSgnLi9hbHRyJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuYWRkVGFnKCdhbHRyLXBsYWNlaG9sZGVyJywgcGxhY2Vob2xkZXIpXG5hbHRyLmFkZFRhZygnYWx0ci1jaGlsZHJlbicsIGNoaWxkcmVuVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItcmVwbGFjZScsIHBsYWNlaG9sZGVyKVxuYWx0ci5hZGRUYWcoJ2FsdHItaW5jbHVkZScsIGluY2x1ZGVUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci10ZXh0JywgdGV4dFRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLWh0bWwnLCBodG1sVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItd2l0aCcsIHdpdGhUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci1mb3InLCBmb3JUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci1pZicsIGlmVGFnKVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRcblxuZnVuY3Rpb24gaW5zZXJ0KHBhcmVudCwgZWwsIGJlZm9yZSkge1xuICB2YXIgaW5zZXJ0ZWQgPSBlbC5wYXJlbnROb2RlICE9PSBwYXJlbnRcblxuICBiZWZvcmUgPSBiZWZvcmUgfHwgbnVsbFxuXG4gIGlmKGluc2VydGVkIHx8IGVsLm5leHRTaWJsaW5nICE9PSBiZWZvcmUpIHtcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGVsLCBiZWZvcmUpXG4gIH1cblxuICBpZihpbnNlcnRlZCkge1xuICAgIHRoaXMuZW1pdCgnaW5zZXJ0JywgZWwsIHBhcmVudClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBtZXJnZVxuXG52YXIgdHlwZXMgPSBbJ3VwZGF0ZScsICdpbnNlcnQnLCAncmVtb3ZlJywgJ2Rlc3Ryb3knXVxuXG5mdW5jdGlvbiBtZXJnZShfbGhzLCBfcmhzKSB7XG4gIHZhciBvdXQgPSB7fVxuICAgICwgdHlwZVxuXG4gIHZhciBsaHMgPSBfbGhzIHx8IHt9XG4gICAgLCByaHMgPSBfcmhzIHx8IHt9XG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHR5cGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHR5cGUgPSBhcnJheWlmeShsaHNbdHlwZXNbaV1dKS5jb25jYXQoYXJyYXlpZnkocmhzW3R5cGVzW2ldXSkpXG5cbiAgICBpZih0eXBlLmxlbmd0aCkge1xuICAgICAgb3V0W3R5cGVzW2ldXSA9IHR5cGVcbiAgICB9XG4gIH1cblxuICByZXR1cm4gT2JqZWN0LmtleXMob3V0KS5sZW5ndGggPyBvdXQgOiBudWxsXG59XG5cbmZ1bmN0aW9uIGFycmF5aWZ5KG9iaikge1xuICByZXR1cm4gb2JqID8gQXJyYXkuaXNBcnJheShvYmopID8gb2JqLmZpbHRlcihCb29sZWFuKSA6IFtvYmpdIDogW11cbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG5cbmZ1bmN0aW9uIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICB2YXIgcmFmID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgdGltZW91dFxuXG4gIHJldHVybiByYWYoY2FsbGJhY2spXG5cbiAgZnVuY3Rpb24gdGltZW91dChjYWxsYmFjaykge1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApXG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlbW92ZVxuXG5mdW5jdGlvbiByZW1vdmUocGFyZW50LCBlbCkge1xuICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpXG4gIHRoaXMuZW1pdCgncmVtb3ZlJywgZWwsIHBhcmVudClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVuZGVyXG5cbmZ1bmN0aW9uIHJlbmRlcih0ZW1wbGF0ZSwgc3RhdGUsIGVsKSB7XG4gIGlmKHRoaXMuaW5jbHVkZXNbdGVtcGxhdGVdKSB7XG4gICAgdGVtcGxhdGUgPSB0aGlzLmluY2x1ZGVzW3RlbXBsYXRlXVxuICB9XG5cbiAgdmFyIGluc3RhbmNlID0gdGhpcyh0ZW1wbGF0ZSlcblxuICBpbnN0YW5jZS51cGRhdGUoc3RhdGUgfHwge30sIHRydWUpXG5cbiAgaWYoZWwpIHtcbiAgICBpbnN0YW5jZS5pbnRvKGVsKVxuICB9XG5cbiAgcmV0dXJuIGluc3RhbmNlXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcGxhY2VcblxuZnVuY3Rpb24gcmVwbGFjZShwYXJlbnQsIGVsLCBvbGQpIHtcbiAgcGFyZW50LnJlcGxhY2VDaGlsZChlbCwgb2xkKVxuICB0aGlzLmVtaXQoJ3JlcGxhY2UnLCBlbCwgb2xkLCBwYXJlbnQpXG4gIHRoaXMuZW1pdCgnaW5zZXJ0JywgZWwsIHBhcmVudClcbiAgdGhpcy5lbWl0KCdyZW1vdmUnLCBvbGQsIHBhcmVudClcbn1cbiIsInZhciBnZXQgPSByZXF1aXJlKCcuL2dldC1lbGVtZW50JylcblxubW9kdWxlLmV4cG9ydHMgPSBzZXRDaGlsZHJlblxuXG5mdW5jdGlvbiBzZXRDaGlsZHJlbihyb290LCBub2Rlcykge1xuICB2YXIgcHJldiA9IG51bGxcbiAgICAsIGVsXG5cbiAgZm9yKHZhciBpID0gbm9kZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICBlbCA9IGdldChub2Rlc1tpXSlcbiAgICB0aGlzLmluc2VydChyb290LCBlbCwgcHJldilcbiAgICBwcmV2ID0gZWxcbiAgfVxuXG4gIHdoaWxlKChlbCA9IHJvb3QuZmlyc3RDaGlsZCkgIT09IHByZXYpIHtcbiAgICB0aGlzLnJlbW92ZShyb290LCBlbClcbiAgfVxufVxuIiwidmFyIHNldENoaWxkcmVuID0gcmVxdWlyZSgnLi4vc2V0LWNoaWxkcmVuJylcblxubW9kdWxlLmV4cG9ydHMgPSBjaGlsZHJlblxuXG5mdW5jdGlvbiBjaGlsZHJlbihlbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciBjdXJyZW50ID0gW11cblxuICBlbC5pbm5lckhUTUwgPSAnJ1xuICB0aGlzLmJhdGNoLmFkZChsb29rdXBzLnJlZ2lzdGVyKGdldHRlciwgdXBkYXRlLmJpbmQodGhpcykpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICB2YXIgbm9kZXMgPSAoQXJyYXkuaXNBcnJheSh2YWwpID8gdmFsIDogW3ZhbF0pLmZpbHRlcihpc19ub2RlKVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYobm9kZXNbaV0gIT09IGN1cnJlbnRbaV0pIHtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSBub2Rlcy5sZW5ndGggPT09IGN1cnJlbnQubGVuZ3RoKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjdXJyZW50ID0gbm9kZXNcbiAgICBzZXRDaGlsZHJlbi5jYWxsKHRoaXMsIGVsLCBjdXJyZW50KVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzX25vZGUoZWwpIHtcbiAgcmV0dXJuIGVsICYmIGVsLm5vZGVUeXBlXG59XG4iLCJ2YXIgc2V0Q2hpbGRyZW4gPSByZXF1aXJlKCcuLi9zZXQtY2hpbGRyZW4nKVxuICAsIGZvcl9yZWdleHAgPSAvXiguKj8pXFxzK2luXFxzKyguKiQpL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZvckhhbmRsZXJcblxuZnVuY3Rpb24gZm9ySGFuZGxlcihyb290LCBhcmdzLCBsb29rdXBzKSB7XG4gIHZhciBwYXJ0cyA9IGFyZ3MubWF0Y2goZm9yX3JlZ2V4cClcbiAgICAsIHRlbXBsYXRlID0gcm9vdC5pbm5lckhUTUxcbiAgICAsIGRvbU5vZGVzID0gW11cbiAgICAsIGNoaWxkcmVuID0gW11cbiAgICAsIGFsdHIgPSB0aGlzXG4gICAgLCBpdGVtcyA9IFtdXG5cbiAgaWYoIXBhcnRzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGZvciB0YWc6ICcgKyBhcmdzKVxuICB9XG5cbiAgcm9vdC5pbm5lckhUTUwgPSAnJ1xuXG4gIHZhciB1bmlxdWUgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzFdXG4gICAgLCBwcm9wID0gcGFydHNbMV0uc3BsaXQoJzonKVswXVxuICAgICwga2V5ID0gcGFydHNbMl1cblxuICB2YXIgcnVuVXBkYXRlcyA9IHRoaXMuYmF0Y2guYWRkKHJ1bkRvbVVwZGF0ZXMpXG5cbiAgbG9va3Vwcy5yZWdpc3RlcihrZXksIHVwZGF0ZSlcblxuICByZXR1cm4ge2Rlc3Ryb3k6IGRlc3Ryb3l9XG5cbiAgZnVuY3Rpb24gdXBkYXRlQ2hpbGRyZW4oZGF0YSkge1xuICAgIHZhciBpdGVtRGF0YVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaXRlbURhdGEgPSBPYmplY3QuY3JlYXRlKGRhdGEpXG4gICAgICBpdGVtRGF0YVtwcm9wXSA9IGl0ZW1zW2ldXG4gICAgICBpdGVtRGF0YVsnJGluZGV4J10gPSBpXG4gICAgICBjaGlsZHJlbltpXS5sb29rdXBzLnVwZGF0ZShpdGVtRGF0YSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIHJ1bkRlc3Ryb3koY2hpbGRyZW5baV0uaG9va3MpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKG5ld0l0ZW1zKSB7XG4gICAgaWYoIUFycmF5LmlzQXJyYXkobmV3SXRlbXMpKSB7XG4gICAgICBuZXdJdGVtcyA9IFtdXG4gICAgfVxuXG4gICAgdmFyIG5ld0NoaWxkcmVuID0gbmV3IEFycmF5KG5ld0l0ZW1zLmxlbmd0aClcbiAgICAgICwgbWF0Y2hlZCA9IHt9XG4gICAgICAsIGluZGV4XG5cbiAgICBkb21Ob2RlcyA9IFtdXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbmV3SXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpbmRleCA9IGZpbmRJbmRleChpdGVtcywgbmV3SXRlbXNbaV0sIHVuaXF1ZSlcblxuICAgICAgaWYoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld0NoaWxkcmVuW2ldID0gY2hpbGRyZW5baW5kZXhdXG4gICAgICAgIGl0ZW1zW2luZGV4XSA9IGNoaWxkcmVuW2luZGV4XSA9IG1hdGNoZWRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld0NoaWxkcmVuW2ldID0gbWFrZUNoaWxkKClcbiAgICAgIH1cblxuICAgICAgZG9tTm9kZXMgPSBkb21Ob2Rlcy5jb25jYXQobmV3Q2hpbGRyZW5baV0ubm9kZXMpXG4gICAgfVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYoY2hpbGRyZW5baV0gIT09IG1hdGNoZWQpIHtcbiAgICAgICAgcnVuRGVzdHJveShjaGlsZHJlbltpXS5ob29rcylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG5ld0NoaWxkcmVuLnNsaWNlKClcbiAgICBpdGVtcyA9IG5ld0l0ZW1zLnNsaWNlKClcbiAgICBydW5VcGRhdGVzLmNhbGwoYWx0cilcbiAgICB1cGRhdGVDaGlsZHJlbihsb29rdXBzLnN0YXRlKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluZEluZGV4KGl0ZW1zLCBkLCB1bmlxdWUpIHtcbiAgICBpZighdW5pcXVlKSB7XG4gICAgICByZXR1cm4gaXRlbXMuaW5kZXhPZihkKVxuICAgIH1cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGlmKGl0ZW1zW2ldW3VuaXF1ZV0gPT09IGRbdW5pcXVlXSkge1xuICAgICAgICByZXR1cm4gaVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZUNoaWxkKCkge1xuICAgIHZhciB0ZW1wID0gYWx0ci5kb2N1bWVudC5jcmVhdGVFbGVtZW50TlMocm9vdC5uYW1lc3BhY2VVUkksICdkaXYnKVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSB0ZW1wbGF0ZVxuXG4gICAgcmV0dXJuIGFsdHIuaW5pdE5vZGVzKEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRlbXAuY2hpbGROb2RlcykpXG4gIH1cblxuICBmdW5jdGlvbiBydW5Eb21VcGRhdGVzKCkge1xuICAgIHNldENoaWxkcmVuLmNhbGwodGhpcywgcm9vdCwgZG9tTm9kZXMpXG4gIH1cblxuICBmdW5jdGlvbiBydW5EZXN0cm95KGhvb2tzKSB7XG4gICAgaWYoIWhvb2tzLmRlc3Ryb3kpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBsaXN0ID0gQXJyYXkuaXNBcnJheShob29rcy5kZXN0cm95KSA/IGhvb2tzLmRlc3Ryb3kgOiBbaG9va3MuZGVzdHJveV1cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBsaXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgbGlzdFtpXSgpXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGh0bWxcblxuZnVuY3Rpb24gaHRtbChlbCwgYWNjZXNzb3IsIGxvb2t1cHMpIHtcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5yZWdpc3RlcihhY2Nlc3NvciwgdXBkYXRlLCBsb29rdXBzKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuXG4gICAgaWYoZWwuZ2V0QXR0cmlidXRlKCdhbHRyLXJ1bi1zY3JpcHRzJykpIHtcbiAgICAgIFtdLmZvckVhY2guY2FsbChlbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JyksIHJ1bilcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuKHNjcmlwdCkge1xuICB2YXIgZml4ZWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgICwgcGFyZW50ID0gc2NyaXB0LnBhcmVudE5vZGVcbiAgICAsIGF0dHJzID0gc2NyaXB0LmF0dHJpYnV0ZXNcbiAgICAsIHNyY1xuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBmaXhlZC5zZXRBdHRyaWJ1dGUoYXR0cnNbaV0ubmFtZSwgYXR0cnNbaV0udmFsdWUpXG4gIH1cblxuICBmaXhlZC50ZXh0Q29udGVudCA9IHNjcmlwdC50ZXh0Q29udGVudFxuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGZpeGVkLCBzY3JpcHQpXG4gIHBhcmVudC5yZW1vdmVDaGlsZChzY3JpcHQpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlmVGFnXG5cbmZ1bmN0aW9uIGlmVGFnKGVsLCBnZXR0ZXIsIGxvb2t1cHMpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgICAsIGNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcylcbiAgICAsIGhpZGRlbiA9IG51bGxcbiAgICAsIGFsdHIgPSB0aGlzXG5cbiAgdmFyIGhpZGUgPSB0aGlzLmJhdGNoLmFkZChmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZVxuXG4gICAgaWYoIWhpZGRlbikge1xuICAgICAgYWx0ci5yZXBsYWNlKGVsLnBhcmVudE5vZGUsIHBsYWNlaG9sZGVyLCBlbClcbiAgICAgIGVsLl9hbHRyUGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlclxuICAgICAgaGlkZGVuID0gdHJ1ZVxuICAgIH1cbiAgfSlcblxuICB2YXIgc2hvdyA9IHRoaXMuYmF0Y2guYWRkKGZ1bmN0aW9uKCkge1xuICAgIGlmKGhpZGRlbikge1xuICAgICAgYWx0ci5yZXBsYWNlKHBsYWNlaG9sZGVyLnBhcmVudE5vZGUsIGVsLCBwbGFjZWhvbGRlcilcbiAgICAgIGRlbGV0ZSBlbC5fYWx0clBsYWNlaG9sZGVyXG4gICAgICBoaWRkZW4gPSBmYWxzZVxuICAgIH1cbiAgfSlcblxuICBsb29rdXBzLnJlZ2lzdGVyKGdldHRlciwgdG9nZ2xlLCB0cnVlKVxuXG4gIHJldHVybiBjaGlsZHJlbi5ob29rc1xuXG4gIGZ1bmN0aW9uIHRvZ2dsZSh2YWwpIHtcbiAgICBpZighdmFsKSB7XG4gICAgICByZXR1cm4gaGlkZSgpXG4gICAgfVxuXG4gICAgc2hvdygpXG4gICAgY2hpbGRyZW4ubG9va3Vwcy51cGRhdGUobG9va3Vwcy5zdGF0ZSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmNsdWRlXG5cbmZ1bmN0aW9uIGluY2x1ZGUoZWwsIG5hbWUsIGxvb2t1cHMpIHtcbiAgZWwuaW5uZXJIVE1MID0gdGhpcy5pbmNsdWRlc1tuYW1lXVxuXG4gIHJldHVybiB0aGlzLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzLCBsb29rdXBzKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBwbGFjZWhvbGRlclxuXG5mdW5jdGlvbiBwbGFjZWhvbGRlcihvcmlnaW5hbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciBjdXJyZW50ID0gb3JpZ2luYWxcbiAgICAsIGFsdHIgPSB0aGlzXG5cbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5yZWdpc3RlcihnZXR0ZXIsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGlmKCF2YWwgfHwgIXZhbC5ub2RlTmFtZSB8fCB2YWwgPT09IGN1cnJlbnQpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGFsdHIucmVwbGFjZShjdXJyZW50LnBhcmVudE5vZGUsIHZhbCwgY3VycmVudClcbiAgICBvcmlnaW5hbC5fYWx0clBsYWNlaG9sZGVyID0gdmFsXG4gICAgY3VycmVudCA9IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRleHRcblxuZnVuY3Rpb24gdGV4dChlbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHRoaXMuYmF0Y2guYWRkKGxvb2t1cHMucmVnaXN0ZXIoZ2V0dGVyLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3aXRoVGFnXG5cbmZ1bmN0aW9uIHdpdGhUYWcoZWwsIGdldHRlciwgbG9va3Vwcykge1xuICB2YXIgY2hpbGRyZW4gPSB0aGlzLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzKVxuICAgICwgcGFydHMgPSBnZXR0ZXIuc3BsaXQoJyBhcyAnKVxuXG4gIGxvb2t1cHMucmVnaXN0ZXIocGFydHNbMF0sIHVwZGF0ZSlcblxuICByZXR1cm4gY2hpbGRyZW4uaG9va3NcblxuICBmdW5jdGlvbiB1cGRhdGUoX3ZhbCkge1xuICAgIHZhciB2YWwgPSBPYmplY3QuY3JlYXRlKGxvb2t1cHMuc3RhdGUpXG5cbiAgICB2YWxbcGFydHNbMV1dID0gX3ZhbFxuICAgIGNoaWxkcmVuLmxvb2t1cHMudXBkYXRlKHZhbClcbiAgfVxufVxuIiwidmFyIFRBRyA9IC97e1xccyooLio/KVxccyp9fS9cblxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0U3RyaW5nXG5cbmZ1bmN0aW9uIHRlbXBsYXRTdHJpbmcodGVtcGxhdGUsIGNoYW5nZSwgbG9va3Vwcykge1xuICBpZighdGVtcGxhdGUubWF0Y2goVEFHKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRlbXBsYXRlXG4gICAgLCBwYXJ0cyA9IFtdXG4gICAgLCBob29rcyA9IFtdXG4gICAgLCBpbmRleFxuICAgICwgbmV4dFxuXG4gIHdoaWxlKHJlbWFpbmluZyAmJiAobmV4dCA9IHJlbWFpbmluZy5tYXRjaChUQUcpKSkge1xuICAgIGlmKGluZGV4ID0gcmVtYWluaW5nLmluZGV4T2YobmV4dFswXSkpIHtcbiAgICAgIHBhcnRzLnB1c2gocmVtYWluaW5nLnNsaWNlKDAsIGluZGV4KSlcbiAgICB9XG5cbiAgICBwYXJ0cy5wdXNoKCcnKVxuICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZy5zbGljZShpbmRleCArIG5leHRbMF0ubGVuZ3RoKVxuICAgIGxvb2t1cHMucmVnaXN0ZXIobmV4dFsxXSwgc2V0UGFydC5iaW5kKHRoaXMsIHBhcnRzLmxlbmd0aCAtIDEpKVxuICB9XG5cbiAgaWYocmVtYWluaW5nKSB7XG4gICAgcGFydHMucHVzaChyZW1haW5pbmcpXG4gIH1cblxuICBmdW5jdGlvbiBzZXRQYXJ0KGlkeCwgdmFsKSB7XG4gICAgcGFydHNbaWR4XSA9IHZhbFxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbml0VGV4dE5vZGVcblxuZnVuY3Rpb24gaW5pdFRleHROb2RlKGVsLCBsb29rdXBzKSB7XG4gIHRoaXMudGVtcGxhdGVTdHJpbmcoXG4gICAgICBlbC50ZXh0Q29udGVudFxuICAgICwgdGhpcy5iYXRjaC5hZGQodXBkYXRlKVxuICAgICwgbG9va3Vwc1xuICApXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdG9TdHJpbmdcblxuZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gIHJldHVybiB0aGlzLnJvb3ROb2RlcygpLm1hcChmdW5jdGlvbihub2RlKSB7XG4gICAgc3dpdGNoKG5vZGUubm9kZVR5cGUpIHtcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFOlxuICAgICAgY2FzZSB0aGlzLmRvY3VtZW50LkNPTU1FTlRfTk9ERTogcmV0dXJuIGNsb25lLmNhbGwodGhpcywgbm9kZSlcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5URVhUX05PREU6IHJldHVybiBub2RlLnRleHRDb250ZW50XG4gICAgICBkZWZhdWx0OiByZXR1cm4gbm9kZS5vdXRlckhUTUxcbiAgICB9XG4gIH0sIHRoaXMpLmpvaW4oJycpXG5cbiAgZnVuY3Rpb24gY2xvbmUobm9kZSkge1xuICAgIHZhciB0ZW1wID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXG4gICAgdGVtcC5hcHBlbmRDaGlsZChub2RlLmNsb25lTm9kZSh0cnVlKSlcblxuICAgIHJldHVybiB0ZW1wLmlubmVySFRNTFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEJhdGNoXG5cbmZ1bmN0aW9uIEJhdGNoKHJlYWR5LCBhbGwpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgQmF0Y2gpKSB7XG4gICAgcmV0dXJuIG5ldyBCYXRjaChyZWFkeSwgYWxsKVxuICB9XG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5hbGwgPSBhbGxcbiAgdGhpcy5yZWFkeSA9IHJlYWR5XG4gIHRoaXMucXVldWQgPSBmYWxzZVxuICB0aGlzLnJ1biA9IHRoaXMucnVuLmJpbmQodGhpcylcbn1cblxuQmF0Y2gucHJvdG90eXBlLnF1ZXVlID0gcXVldWVcbkJhdGNoLnByb3RvdHlwZS5hZGQgPSBhZGRcbkJhdGNoLnByb3RvdHlwZS5ydW4gPSBydW5cblxuZnVuY3Rpb24gYWRkKGZuKSB7XG4gIHZhciBxdWV1ZWQgPSBmYWxzZVxuICAgICwgYmF0Y2ggPSB0aGlzXG4gICAgLCBzZWxmXG4gICAgLCBhcmdzXG5cbiAgcmV0dXJuIHF1ZXVlXG5cbiAgZnVuY3Rpb24gcXVldWUoKSB7XG4gICAgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHNlbGYgPSB0aGlzXG5cbiAgICBpZihxdWV1ZWQpIHtcbiAgICAgIHJldHVybiBiYXRjaC5hbGwgJiYgYmF0Y2gucmVhZHkoKVxuICAgIH1cblxuICAgIHF1ZXVlZCA9IHRydWVcbiAgICBiYXRjaC5xdWV1ZShydW4pXG4gIH1cblxuICBmdW5jdGlvbiBydW4oKSB7XG4gICAgcXVldWVkID0gZmFsc2VcbiAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXVlKGZuKSB7XG4gIHRoaXMuam9icy5wdXNoKGZuKVxuXG4gIGlmKHRoaXMuYWxsIHx8ICF0aGlzLnF1ZXVlZCkge1xuICAgIHRoaXMucXVldWVkID0gdHJ1ZVxuICAgIHRoaXMucmVhZHkodGhpcylcbiAgfVxufVxuXG5mdW5jdGlvbiBydW4oKSB7XG4gIHZhciBqb2JzID0gdGhpcy5qb2JzXG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5xdWV1ZWQgPSBmYWxzZVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBqb2JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGpvYnNbaV0oKVxuICB9XG5cbiAgcmV0dXJuICEhdGhpcy5qb2JzLmxlbmd0aFxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwidmFyIG9wZXJhdG9ycyA9IHJlcXVpcmUoJy4vdHlwZXMvb3BlcmF0b3JzJylcbiAgLCBicmFja2V0cyA9IHJlcXVpcmUoJy4vdHlwZXMvYnJhY2tldHMnKVxuICAsIGRvdF9wYXRoID0gcmVxdWlyZSgnLi90eXBlcy9kb3QtcGF0aCcpXG4gICwgZmlsdGVycyA9IHJlcXVpcmUoJy4vdHlwZXMvZmlsdGVycycpXG4gICwgcGFydGlhbCA9IHJlcXVpcmUoJy4vdHlwZXMvcGFydGlhbCcpXG4gICwgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcbiAgLCBwYXJlbnMgPSByZXF1aXJlKCcuL3R5cGVzL3BhcmVucycpXG4gICwgdmFsdWVzID0gcmVxdWlyZSgnLi90eXBlcy92YWx1ZXMnKVxuICAsIHNwbGl0ID0gcmVxdWlyZSgnLi9zcGxpdCcpXG4gICwgbGlzdCA9IHJlcXVpcmUoJy4vbGlzdCcpXG5cbm1vZHVsZS5leHBvcnRzID0gRGlydHlCaXRcblxuZnVuY3Rpb24gRGlydHlCaXQoc3RhdGUsIF9vcHRpb25zKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIERpcnR5Qml0KSkge1xuICAgIHJldHVybiBuZXcgRGlydHlCaXQoc3RhdGUsIF9vcHRpb25zKVxuICB9XG5cbiAgdmFyIG9wdGlvbnMgPSBfb3B0aW9ucyB8fCB7fVxuXG4gIEVFLmNhbGwodGhpcylcbiAgdGhpcy5zdGF0ZSA9IHN0YXRlIHx8IHt9XG4gIHRoaXMuZXZlbnRzID0gbmV3IEVFXG4gIHRoaXMuZGVwcyA9IE9iamVjdC5jcmVhdGUobnVsbClcbiAgdGhpcy52YWx1ZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gIHRoaXMubG9va3VwcyA9IE9iamVjdC5jcmVhdGUobnVsbClcbiAgdGhpcy5maWx0ZXJzID0gT2JqZWN0LmNyZWF0ZShvcHRpb25zLmZpbHRlcnMgfHwgbnVsbClcbiAgdGhpcy5hbHdheXMgPSBbXVxuICB0aGlzLmdldHRlcnMgPSBbXVxuICB0aGlzLnVwZGF0aW5nID0gZmFsc2VcbiAgdGhpcy51cGRhdGVzID0ge31cbiAgdGhpcy5zZXRNYXhMaXN0ZW5lcnMoMClcbiAgdGhpcy5ldmVudHMuc2V0TWF4TGlzdGVuZXJzKDApXG4gIHRoaXMucm9vdEtleSA9IG9wdGlvbnMucm9vdEtleVxuICB0aGlzLmxvb2t1cHNbJ3RoaXMnXSA9IEluZmluaXR5XG4gIHRoaXMubG9va3Vwc1t0aGlzLnJvb3RLZXldID0gSW5maW5pdHlcbiAgdGhpcy51cGRhdGUodGhpcy5zdGF0ZSlcbn1cblxuRGlydHlCaXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFRS5wcm90b3R5cGUpXG5EaXJ0eUJpdC5wcm90b3R5cGUudXBkYXRlVmFsdWUgPSB1cGRhdGVWYWx1ZVxuRGlydHlCaXQucHJvdG90eXBlLmRlcmVnaXN0ZXIgPSBkZXJlZ2lzdGVyXG5EaXJ0eUJpdC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEaXJ0eUJpdFxuRGlydHlCaXQucHJvdG90eXBlLmFkZEZpbHRlciA9IGFkZEZpbHRlclxuRGlydHlCaXQucHJvdG90eXBlLnJlZ2lzdGVyID0gcmVnaXN0ZXJcbkRpcnR5Qml0LnByb3RvdHlwZS5yZWdpc3Rlckxpc3QgPSBsaXN0XG5EaXJ0eUJpdC5wcm90b3R5cGUudXBkYXRlID0gdXBkYXRlXG5EaXJ0eUJpdC5wcm90b3R5cGUub24gPSBjbGVhbmVkX29uXG5EaXJ0eUJpdC5wcm90b3R5cGUud2F0Y2ggPSB3YXRjaFxuRGlydHlCaXQucHJvdG90eXBlLmNsZWFuID0gY2xlYW5cbkRpcnR5Qml0LnByb3RvdHlwZS5zcGxpdCA9IHNwbGl0XG5EaXJ0eUJpdC5wcm90b3R5cGUuaGFzaCA9IGhhc2hcbkRpcnR5Qml0LnByb3RvdHlwZS50eXBlcyA9IFtdXG5cbkRpcnR5Qml0LnByb3RvdHlwZS50eXBlcy5wdXNoKHZhbHVlcylcbkRpcnR5Qml0LnByb3RvdHlwZS50eXBlcy5wdXNoKGZpbHRlcnMpXG5EaXJ0eUJpdC5wcm90b3R5cGUudHlwZXMucHVzaChwYXJ0aWFsKVxuRGlydHlCaXQucHJvdG90eXBlLnR5cGVzLnB1c2gocGFyZW5zKVxuRGlydHlCaXQucHJvdG90eXBlLnR5cGVzLnB1c2gob3BlcmF0b3JzKVxuRGlydHlCaXQucHJvdG90eXBlLnR5cGVzLnB1c2goYnJhY2tldHMpXG5EaXJ0eUJpdC5wcm90b3R5cGUudHlwZXMucHVzaChkb3RfcGF0aClcblxuZnVuY3Rpb24gcmVnaXN0ZXIoX2xvb2t1cCwgY2FsbGJhY2ssIGFsbCwgZGVwX29mLCBfZmlyc3QpIHtcbiAgdmFyIGZpcnN0ID0gX2ZpcnN0IHx8IHR5cGVvZiBmaXJzdCA9PT0gJ3VuZGVmaW5lZCdcbiAgICAsIGxvb2t1cCA9IHRoaXMuY2xlYW4oX2xvb2t1cClcblxuICBpZihkZXBfb2YpIHtcbiAgICB0aGlzLmV2ZW50cy5vbihsb29rdXAsIGNhbGxiYWNrKVxuICAgIHRoaXMuZGVwc1tkZXBfb2ZdID0gdGhpcy5kZXBzW2RlcF9vZl0gfHwge31cbiAgICB0aGlzLmRlcHNbZGVwX29mXVtsb29rdXBdID0gY2FsbGJhY2tcbiAgfSBlbHNlIGlmKGFsbCkge1xuICAgIHRoaXMuYWx3YXlzLnB1c2goe2xvb2t1cDogbG9va3VwLCBjYWxsYmFjazogY2FsbGJhY2t9KVxuICB9IGVsc2Uge1xuICAgIHRoaXMub24obG9va3VwLCBjYWxsYmFjaylcbiAgfVxuXG4gIGlmKCh0aGlzLmxvb2t1cHNbbG9va3VwXSA9ICh0aGlzLmxvb2t1cHNbbG9va3VwXSB8fCAwKSArIDEpICE9PSAxKSB7XG4gICAgaWYoZmlyc3QpIHtcbiAgICAgIGNhbGxiYWNrLmFwcGx5KFxuICAgICAgICAgIHRoaXNcbiAgICAgICAgLCB0aGlzLnZhbHVlc1tsb29rdXBdID8gdGhpcy52YWx1ZXNbbG9va3VwXS5zbGljZSgxKSA6IHVuZGVmaW5lZFxuICAgICAgKVxuICAgIH1cblxuICAgIHJldHVyblxuICB9XG5cbiAgaWYoIXRoaXMudXBkYXRpbmcpIHtcbiAgICB0aGlzLnVwZGF0aW5nID0gdHJ1ZVxuICAgIHRoaXMud2F0Y2gobG9va3VwKVxuICAgIHRoaXMudXBkYXRpbmcgPSBmYWxzZVxuICAgIGZpcnN0ICYmIGNhbGxiYWNrLmFwcGx5KFxuICAgICAgICB0aGlzXG4gICAgICAsIHRoaXMudmFsdWVzW2xvb2t1cF0gPyB0aGlzLnZhbHVlc1tsb29rdXBdLnNsaWNlKDEpIDogdW5kZWZpbmVkXG4gICAgKVxuICAgIHRoaXMudXBkYXRlcyA9IHt9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy53YXRjaChsb29rdXApXG4gIH1cblxufVxuXG5mdW5jdGlvbiBkZXJlZ2lzdGVyKF9sb29rdXAsIGNhbGxiYWNrKSB7XG4gIHZhciBsb29rdXAgPSB0aGlzLmNsZWFuKF9sb29rdXApXG4gICAgLCBkZXBzID0gdGhpcy5kZXBzW2xvb2t1cF1cbiAgICAsIG5hbWVzXG5cbiAgdGhpcy5yZW1vdmVMaXN0ZW5lcihsb29rdXAsIGNhbGxiYWNrKVxuICB0aGlzLmV2ZW50cy5yZW1vdmVMaXN0ZW5lcihsb29rdXAsIGNhbGxiYWNrKVxuICAtLXRoaXMubG9va3Vwc1tsb29rdXBdXG5cbiAgaWYodGhpcy5sb29rdXBzW2xvb2t1cF0gPiAwIHx8ICFkZXBzKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLmFsd2F5cyA9IHRoaXMuYWx3YXlzLmZpbHRlcihmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgcmV0dXJuICEoaGFuZGxlci5jYWxsYmFjayA9PT0gY2FsbGJhY2sgJiYgaGFuZGxlci5sb29rdXAgPT09IGxvb2t1cClcbiAgfSlcblxuICBpZighdGhpcy5fZXZlbnRzW2xvb2t1cF0gJiYgIXRoaXMuZXZlbnRzLl9ldmVudHNbbG9va3VwXSkge1xuICAgIG5hbWVzID0gT2JqZWN0LmtleXMoZGVwcylcbiAgICBkZWxldGUgdGhpcy5kZXBzW2xvb2t1cF1cbiAgICBkZWxldGUgdGhpcy52YWx1ZXNbbG9va3VwXVxuICAgIGRlbGV0ZSB0aGlzLmxvb2t1cHNbbG9va3VwXVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgdGhpcy5kZXJlZ2lzdGVyKG5hbWVzW2ldLCBkZXBzW25hbWVzW2ldXSlcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd2F0Y2goX2xvb2t1cCkge1xuICB2YXIgbG9va3VwcyA9IHRoaXMuc3BsaXQodGhpcy5jbGVhbihfbG9va3VwKSwgJywnLCB0cnVlKVxuXG4gIGlmKGxvb2t1cHMubGVuZ3RoID4gMSkge1xuICAgIHJldHVybiB0aGlzLnJlZ2lzdGVyTGlzdChsb29rdXBzLGxvb2t1cHMuam9pbignLCcpKVxuICB9XG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMudHlwZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYodGhpcy50eXBlc1tpXS5jYWxsKHRoaXMsIGxvb2t1cHNbMF0pKSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmKGkgPT09IGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgbG9va3VwOiAnICsgbG9va3Vwc1swXSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVWYWx1ZShsb29rdXApIHtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoIXRoaXMudmFsdWVzW2xvb2t1cF0pIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgaWYodGhpcy52YWx1ZXNbbG9va3VwXVtpXSA9PT0gYXJnc1tpXSAmJiB0eXBlb2YgYXJnc1tpXSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYoaSA9PT0gbCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdGhpcy52YWx1ZXNbbG9va3VwXSA9IGFyZ3NcbiAgdGhpcy5ldmVudHMuZW1pdC5hcHBseSh0aGlzLmV2ZW50cywgYXJncylcblxuICBpZih0aGlzLnVwZGF0aW5nKSB7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlc1tsb29rdXBdID0gYXJnc1xuICB9XG5cbiAgdGhpcy5lbWl0LmFwcGx5KHRoaXMsIGFyZ3MpXG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgdGhpcy51cGRhdGluZyA9IHRydWVcbiAgdGhpcy5zdGF0ZSA9IHZhbFxuICB0aGlzLnN0YXRlXG5cbiAgdGhpcy51cGRhdGVWYWx1ZSgndGhpcycsIHZhbClcbiAgdGhpcy5yb290S2V5ICYmIHRoaXMudXBkYXRlVmFsdWUodGhpcy5yb290S2V5LCB2YWwpXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuZ2V0dGVycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB0aGlzLmdldHRlcnNbaV0odmFsKVxuICB9XG5cbiAgdGhpcy51cGRhdGluZyA9IGZhbHNlXG5cbiAgdmFyIHVwZGF0ZXMgPSBPYmplY3Qua2V5cyh0aGlzLnVwZGF0ZXMpXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHVwZGF0ZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgdGhpcy5lbWl0LmFwcGx5KHRoaXMsIHRoaXMudXBkYXRlc1t1cGRhdGVzW2ldXSlcbiAgfVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmFsd2F5cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB0aGlzLmFsd2F5c1tpXS5jYWxsYmFjay5hcHBseShcbiAgICAgICAgdGhpc1xuICAgICAgLCB0aGlzLnZhbHVlc1t0aGlzLmFsd2F5c1tpXS5sb29rdXBdLnNsaWNlKDEpXG4gICAgKVxuICB9XG5cbiAgdGhpcy51cGRhdGVzID0ge31cbn1cblxuZnVuY3Rpb24gYWRkRmlsdGVyKG5hbWUsIGZpbHRlcikge1xuICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmaWx0ZXJcbn1cblxuZnVuY3Rpb24gY2xlYW4obG9va3VwKSB7XG4gIHJldHVybiB0aGlzLnNwbGl0KGxvb2t1cCwgJywnLCB0cnVlKS5tYXAodHJpbSkuam9pbignLCcpXG59XG5cbmZ1bmN0aW9uIHRyaW0oc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbmZ1bmN0aW9uIGNsZWFuZWRfb24obG9va3VwLCBjYWxsYmFjaykge1xuICBFRS5wcm90b3R5cGUub24uY2FsbCh0aGlzLCB0aGlzLmNsZWFuKGxvb2t1cCksIGNhbGxiYWNrKVxufVxuXG5mdW5jdGlvbiBoYXNoKHN0cikge1xuICB2YXIgaGFzaCA9IDBcblxuICBmb3IodmFyIGkgPSAwLCBsZW4gPSBzdHIubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBoYXNoID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhhc2ggfD0gMFxuICB9XG5cbiAgcmV0dXJuIGhhc2gudG9TdHJpbmcoKS5yZXBsYWNlKCctJywgJyMnKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBsaXN0XG5cbmZ1bmN0aW9uIGxpc3QoX2xvb2t1cHMsIGtleSkge1xuICB2YXIgbG9va3VwcyA9IF9sb29rdXBzLm1hcCh0aGlzLmNsZWFuLmJpbmQodGhpcykpXG4gICAgLCB2YWx1ZXMgPSBuZXcgQXJyYXkoX2xvb2t1cHMubGVuZ3RoKVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBsb29rdXBzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHRoaXMucmVnaXN0ZXIobG9va3Vwc1tpXSwgdXBkYXRlLmJpbmQodGhpcywgaSksIGZhbHNlLCBrZXkpXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoaSwgdmFsKSB7XG4gICAgdmFsdWVzW2ldID0gdmFsXG4gICAgdGhpcy51cGRhdGVWYWx1ZS5hcHBseSh0aGlzLCBba2V5XS5jb25jYXQodmFsdWVzKSlcbiAgfVxufVxuIiwidmFyIGRlZmF1bHRfcGFpcnMgPSBbXG4gICAgWycoJywgJyknXVxuICAsIFsnWycsICddJ11cbiAgLCBbJz8nLCAnOiddXG4gICwgWydcIicsICdcIicsIHRydWVdXG4gICwgW1wiJ1wiLCBcIidcIiwgdHJ1ZV1cbl1cblxubW9kdWxlLmV4cG9ydHMgPSBzcGxpdFxubW9kdWxlLmV4cG9ydHMucGFpcnMgPSBkZWZhdWx0X3BhaXJzXG5cbmZ1bmN0aW9uIHNwbGl0KHBhcnRzLCBrZXksIGFsbCwgX3BhaXJzKSB7XG4gIHZhciBwYWlycyA9IF9wYWlycyB8fCBkZWZhdWx0X3BhaXJzXG4gICAgLCBpblN0cmluZyA9IGZhbHNlXG4gICAgLCBsYXllcnMgPSBbXVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZighbGF5ZXJzLmxlbmd0aCkge1xuICAgICAgZm9yKHZhciBqID0gMCwgbDIgPSBrZXkubGVuZ3RoOyBqIDwgbDI7ICsraikge1xuICAgICAgICBpZihwYXJ0c1tpICsgal0gIT09IGtleVtqXSkge1xuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYoaiA9PT0ga2V5Lmxlbmd0aCkge1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGxheWVycy5sZW5ndGggJiYgbGF5ZXJzW2xheWVycy5sZW5ndGggLSAxXSA9PT0gcGFydHNbaV0pIHtcbiAgICAgIGluU3RyaW5nID0gZmFsc2VcbiAgICAgIGxheWVycy5wb3AoKVxuXG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGlmKGluU3RyaW5nKSB7XG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGZvcih2YXIgaiA9IDAsIGwyID0gcGFpcnMubGVuZ3RoOyBqIDwgbDI7ICsraikge1xuICAgICAgaWYocGFydHNbaV0gPT09IHBhaXJzW2pdWzBdKSB7XG4gICAgICAgIGlmKHBhaXJzW2pdWzJdKSB7XG4gICAgICAgICAgaW5TdHJpbmcgPSB0cnVlXG4gICAgICAgIH1cblxuICAgICAgICBsYXllcnMucHVzaChwYWlyc1tqXVsxXSlcblxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKGxheWVycy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnVW5tYXRjaGVkIHBhaXIgaW4gJyArIHBhcnRzICsgJy4gZXhwZWN0aW5nOiAnICsgbGF5ZXJzLnBvcCgpXG4gICAgKVxuICB9XG5cbiAgaWYoaSA9PT0gcGFydHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIFtwYXJ0c11cbiAgfVxuXG4gIHZhciByaWdodCA9IHBhcnRzLnNsaWNlKGkgKyBrZXkubGVuZ3RoKVxuICAgICwgbGVmdCA9IHBhcnRzLnNsaWNlKDAsIGkpXG5cbiAgaWYoIWFsbCkge1xuICAgIHJldHVybiBbbGVmdCwgcmlnaHRdXG4gIH1cblxuICByZXR1cm4gW2xlZnRdLmNvbmNhdChzcGxpdChyaWdodCwga2V5LCBhbGwsIHBhaXJzKSlcbn1cbiIsInZhciBoYXNfYnJhY2tldCA9IC9eLitcXFsuK1xcXSQvXG5cbm1vZHVsZS5leHBvcnRzID0gZG90X3BhdGhcblxuZnVuY3Rpb24gZG90X3BhdGgobG9va3VwKSB7XG4gIGlmKCFoYXNfYnJhY2tldC50ZXN0KGxvb2t1cCkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBwYWlycyA9IHRoaXMuc3BsaXQucGFpcnMubWFwKGZ1bmN0aW9uKHBhaXIpIHtcbiAgICByZXR1cm4gW3BhaXJbMV0sIHBhaXJbMF0sIHBhaXJbMl1dXG4gIH0pXG5cbiAgdmFyIHBhcnRzID0gdGhpcy5zcGxpdChyZXZlcnNlKGxvb2t1cC5zbGljZSgwLCAtMSkpLCAnWycsIGZhbHNlLCBwYWlycylcbiAgICAubWFwKHJldmVyc2UpXG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gICAgLCBpbm5lclxuICAgICwgcm9vdFxuXG4gIHRoaXMucmVnaXN0ZXIocGFydHNbMF0sIHVwZGF0ZV9pbm5lciwgZmFsc2UsIGxvb2t1cClcbiAgdGhpcy5yZWdpc3RlcihwYXJ0c1sxXSwgdXBkYXRlX3Jvb3QsIGZhbHNlLCBsb29rdXApXG5cbiAgZnVuY3Rpb24gdXBkYXRlX2lubmVyKHZhbCkge1xuICAgIGlubmVyID0gdmFsXG4gICAgdXBkYXRlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZV9yb290KHZhbCkge1xuICAgIHJvb3QgPSB2YWxcbiAgICB1cGRhdGUoKVxuICB9XG5cbiAgcmV0dXJuIHRydWVcblxuICBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgaWYocm9vdCA9PT0gbnVsbCB8fCByb290ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBzZWxmLnVwZGF0ZVZhbHVlKGxvb2t1cCwgdW5kZWZpbmVkKVxuICAgIH1cblxuICAgIHNlbGYudXBkYXRlVmFsdWUobG9va3VwLCByb290W2lubmVyXSlcbiAgfVxufVxuXG5mdW5jdGlvbiByZXZlcnNlKHN0cikge1xuICByZXR1cm4gc3RyLnNwbGl0KCcnKS5yZXZlcnNlKCkuam9pbignJylcbn1cbiIsInZhciB2YWxpZF9wYXRoID0gL14oLiopXFwuKFteLlxcc10rKSQvXG5cbm1vZHVsZS5leHBvcnRzID0gZG90X3BhdGhcblxuZnVuY3Rpb24gZG90X3BhdGgobG9va3VwKSB7XG4gIHZhciBwYXJ0cyA9IGxvb2t1cC5tYXRjaCh2YWxpZF9wYXRoKVxuICAgICwgc2VsZiA9IHRoaXNcblxuICBpZihwYXJ0cykge1xuICAgIHNlbGYucmVnaXN0ZXIocGFydHNbMV0sIHVwZGF0ZSwgZmFsc2UsIGxvb2t1cClcblxuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICB1cGRhdGUoc2VsZi5zdGF0ZSlcblxuICByZXR1cm4gc2VsZi5nZXR0ZXJzLnB1c2godXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShvYmopIHtcbiAgICBpZihvYmogPT09IG51bGwgfHwgb2JqID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBzZWxmLnVwZGF0ZVZhbHVlKGxvb2t1cCwgdW5kZWZpbmVkKVxuICAgIH1cblxuICAgIHNlbGYudXBkYXRlVmFsdWUobG9va3VwLCBvYmpbcGFydHMgPyBwYXJ0c1syXSA6IGxvb2t1cF0pXG4gIH1cbn1cbiIsInZhciBmaWx0ZXJfcmVnZXhwID0gL14oW15cXHMoXSspXFwoKC4qKVxcKSQvXG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX2ZpbHRlclxuXG5mdW5jdGlvbiBjcmVhdGVfZmlsdGVyKGxvb2t1cCkge1xuICB2YXIgcGFydHMgPSBsb29rdXAubWF0Y2goZmlsdGVyX3JlZ2V4cClcbiAgICAsIHNlbGYgPSB0aGlzXG5cbiAgaWYoIXBhcnRzKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgZmlsdGVyID0gc2VsZi5maWx0ZXJzW3BhcnRzWzFdXVxuXG4gIGlmKCFmaWx0ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCBmaW5kIGZpbHRlcjogJyArIGxvb2t1cClcbiAgfVxuXG4gIGZpbHRlciA9IGZpbHRlci5jYWxsKHNlbGYsIHVwZGF0ZSlcbiAgc2VsZi5yZWdpc3RlcihwYXJ0c1syXSwgbm90aWZ5LCBmYWxzZSwgbG9va3VwKVxuXG4gIHJldHVybiB0cnVlXG5cbiAgZnVuY3Rpb24gbm90aWZ5KCkge1xuICAgIGZpbHRlci5hcHBseShzZWxmLCBhcmd1bWVudHMpXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgc2VsZi51cGRhdGVWYWx1ZShsb29rdXAsIHZhbClcbiAgfVxufVxuIiwidmFyIHRlcm5hcnlfcmVnZXhwID0gL15cXHMqKC4rPylcXHMqXFw/KC4qKVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IG9wZXJhdG9yXG5cbnZhciB1cGRhdGVycyA9IHt9XG4gICwgdHlwZXMgPSBbXVxuXG4vLyBwdXNoIGluIGludmVyc2Ugb3JkZXIgb2Ygb3BlcmF0aW9uc1xudHlwZXMucHVzaCh7XG4gICAgdGVzdDogdGVybmFyeV9yZWdleHBcbiAgLCBjcmVhdGU6IGNyZWF0ZV90ZXJuYXJ5XG59KVxuXG50eXBlcy5wdXNoKGJpbmFyeShbJ3xcXFxcfCddKSlcbnR5cGVzLnB1c2goYmluYXJ5KFsnJiYnXSkpXG50eXBlcy5wdXNoKGJpbmFyeShbJ3wnXSkpXG50eXBlcy5wdXNoKGJpbmFyeShbJ14nXSkpXG50eXBlcy5wdXNoKGJpbmFyeShbJyYnXSkpXG50eXBlcy5wdXNoKGJpbmFyeShbJz09PScsICchPT0nLCAnPT0nLCAnIT0nXSkpXG50eXBlcy5wdXNoKGJpbmFyeShbJz49JywgJzw9JywgJz4nLCAnPCcsICcgaW4gJywgJyBpbnN0YW5jZW9mICddKSlcbi8vIHR5cGVzLnB1c2goYmluYXJ5KFsnPDwnLCAnPj4nLCAnPj4+J10pKSAvL2NvbmZsaWNzIHdpdGggPCBhbmQgPlxudHlwZXMucHVzaChiaW5hcnkoWycrJywgJy0nXSkpXG50eXBlcy5wdXNoKGJpbmFyeShbJyonLCAnLycsICclJ10pKVxudHlwZXMucHVzaCh1bmFyeShbJyEnLCAnKycsICctJywgJ34nXSkpXG5cbnVwZGF0ZXJzWydpbiddID0gdXBkYXRlX2luXG51cGRhdGVyc1snaW5zdGFuY2VvZiddID0gdXBkYXRlX2luc3RhbmNlb2ZcblxuZnVuY3Rpb24gb3BlcmF0b3IobG9va3VwKSB7XG4gIHZhciBwYXJ0c1xuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0eXBlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihwYXJ0cyA9IGxvb2t1cC5tYXRjaCh0eXBlc1tpXS50ZXN0KSkge1xuICAgICAgdHlwZXNbaV0uY3JlYXRlLmNhbGwodGhpcywgcGFydHMsIGxvb2t1cClcblxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3Rlcm5hcnkocGFydHMsIGxvb2t1cCkge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgICAsIHJpZ2h0XG4gICAgLCBsZWZ0XG4gICAgLCBva1xuXG4gIHZhciByZXN0ID0gc2VsZi5zcGxpdChwYXJ0c1syXSwgJzonKVxuXG4gIGlmKHJlc3QubGVuZ3RoICE9PSAyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgdGVybmFyeSBpbjogJyArIGxvb2t1cClcbiAgfVxuXG4gIHNlbGYucmVnaXN0ZXIocGFydHNbMV0sIHVwZGF0ZV9vaywgZmFsc2UsIGxvb2t1cClcbiAgc2VsZi5yZWdpc3RlcihyZXN0WzBdLCB1cGRhdGVfbGVmdCwgZmFsc2UsIGxvb2t1cClcbiAgc2VsZi5yZWdpc3RlcihyZXN0WzFdLCB1cGRhdGVfcmlnaHQsIGZhbHNlLCBsb29rdXApXG5cbiAgZnVuY3Rpb24gdXBkYXRlX29rKHZhbCkge1xuICAgIG9rID0gdmFsXG4gICAgdXBkYXRlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZV9sZWZ0KHZhbCkge1xuICAgIGxlZnQgPSB2YWxcbiAgICB1cGRhdGUoKVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlX3JpZ2h0KHZhbCkge1xuICAgIHJpZ2h0ID0gdmFsXG4gICAgdXBkYXRlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBzZWxmLnVwZGF0ZVZhbHVlKGxvb2t1cCwgb2sgPyBsZWZ0IDogcmlnaHQpXG4gIH1cbn1cblxuZnVuY3Rpb24gYmluYXJ5KGxpc3QpIHtcbiAgcmV0dXJuIHtcbiAgICAgIHRlc3Q6IG5ldyBSZWdFeHAoJ14oLis/KShcXFxcJyArIGxpc3Quam9pbignfFxcXFwnKSArICcpKC4rKSQnKVxuICAgICwgY3JlYXRlOiBjcmVhdGVfYmluYXJ5XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX2JpbmFyeShwYXJ0cywgbG9va3VwKSB7XG4gIHZhciB1cGRhdGUgPSB1cGRhdGVyc1t0aGlzLmNsZWFuKHBhcnRzWzJdKV1cbiAgICAsIHNlbGYgPSB0aGlzXG4gICAgLCByaWdodFxuICAgICwgbGVmdFxuXG4gIGlmKCF1cGRhdGUpIHtcbiAgICB1cGRhdGUgPSBGdW5jdGlvbignbGhzLCByaHMnLCAncmV0dXJuIGxocyAnICsgcGFydHNbMl0gKyAnIHJocycpXG4gIH1cblxuICBzZWxmLnJlZ2lzdGVyKHBhcnRzWzFdLCB1cGRhdGVfbGVmdCwgZmFsc2UsIGxvb2t1cClcbiAgc2VsZi5yZWdpc3RlcihwYXJ0c1szXSwgdXBkYXRlX3JpZ2h0LCBmYWxzZSwgbG9va3VwKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZV9sZWZ0KHZhbCkge1xuICAgIHNlbGYudXBkYXRlVmFsdWUobG9va3VwLCB1cGRhdGUobGVmdCA9IHZhbCwgcmlnaHQpKVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlX3JpZ2h0KHZhbCkge1xuICAgIHNlbGYudXBkYXRlVmFsdWUobG9va3VwLCB1cGRhdGUobGVmdCwgcmlnaHQgPSB2YWwpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHVuYXJ5KGxpc3QpIHtcbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgnXihcXFxcJyArIGxpc3Quam9pbignfFxcXFwnKSArICcpKC4rKSQnKVxuXG4gIHJldHVybiB7dGVzdDogcmVnZXgsIGNyZWF0ZTogY3JlYXRlX3VuYXJ5fVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdW5hcnkocGFydHMsIGxvb2t1cCkge1xuICB2YXIgdXBkYXRlID0gRnVuY3Rpb24oJ3ZhbCcsICdyZXR1cm4gJyArIHBhcnRzWzFdICsgJ3ZhbCcpXG4gICAgLCBzZWxmID0gdGhpc1xuXG4gIHNlbGYucmVnaXN0ZXIocGFydHNbMl0sIGZ1bmN0aW9uKHZhbCkge1xuICAgIHNlbGYudXBkYXRlVmFsdWUobG9va3VwLCB1cGRhdGUodmFsKSlcbiAgfSwgZmFsc2UsIGxvb2t1cClcbn1cblxuZnVuY3Rpb24gdXBkYXRlX2luKGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiB0eXBlb2YgcmlnaHQgIT09ICd1bmRlZmluZWQnICYmIGxlZnQgaW4gcmlnaHRcbn1cblxuZnVuY3Rpb24gdXBkYXRlX2luc3RhbmNlb2YobGVmdCwgcmlnaHQpIHtcbiAgcmV0dXJuIHR5cGVvZiByaWdodCA9PT0gJ2Z1bmN0aW9uJyAmJiBsZWZ0IGluc3RhbmNlb2YgcmlnaHRcbn1cbiIsInZhciBwYXJlbnNfcmVnZXhwID0gLyhefFteMC05YS16QS1aXyRdKVxcKCguKikkL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZV9wYXJlbnNcblxuZnVuY3Rpb24gY3JlYXRlX3BhcmVucyhsb29rdXApIHtcbiAgdmFyIHBhcnRzID0gbG9va3VwLm1hdGNoKHBhcmVuc19yZWdleHApXG5cbiAgaWYoIXBhcnRzKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgYm9keSA9IHBhcnRzWzJdXG4gICAgLCBzZWxmID0gdGhpc1xuICAgICwgY291bnQgPSAxXG4gICAgLCBpbm5lclxuICAgICwgb3V0ZXJcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYm9keS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihib2R5W2ldID09PSAnKScpIHtcbiAgICAgIC0tY291bnRcbiAgICB9IGVsc2UgaWYoYm9keVtpXSA9PT0gJygnKSB7XG4gICAgICArK2NvdW50XG4gICAgfVxuXG4gICAgaWYoIWNvdW50KSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmKCFpIHx8IGkgPT09IGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCBwYXJlbnM6ICcgKyBsb29rdXApXG4gIH1cblxuICB2YXIgaW5uZXIgPSBib2R5LnNsaWNlKDAsIGkpXG5cbiAgdmFyIGtleSA9ICd7e3BhcmVuXycgKyBzZWxmLmhhc2goaW5uZXIpICsgJ319J1xuXG4gIHZhciBwYXRjaGVkID0gbG9va3VwLnNsaWNlKDBcbiAgICAsIGxvb2t1cC5sYXN0SW5kZXhPZihbcGFydHNbMl1dKSAtIDFcbiAgKSArIGtleSArIGJvZHkuc2xpY2UoaSArIDEpXG5cbiAgc2VsZi5yZWdpc3Rlcihpbm5lciwgZnVuY3Rpb24odmFsKSB7XG4gICAgc2VsZi51cGRhdGVWYWx1ZShrZXksIHZhbClcbiAgfSwgZmFsc2UsIGxvb2t1cClcblxuICBzZWxmLnJlZ2lzdGVyKHBhdGNoZWQsIHVwZGF0ZSwgZmFsc2UsIGxvb2t1cClcblxuICByZXR1cm4gdHJ1ZVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBzZWxmLnVwZGF0ZVZhbHVlKGxvb2t1cCwgdmFsKVxuICB9XG59XG4iLCJ2YXIgcmVnZXhwID0gL15cXHtcXHsuK1xcfVxcfSQvXG5cbm1vZHVsZS5leHBvcnRzID0gcGFydGlhbFxuXG5mdW5jdGlvbiBwYXJ0aWFsKGxvb2t1cCkge1xuICB2YXIgdmFsdWUgPSB0aGlzLnZhbHVlc1tsb29rdXBdXG5cbiAgaWYocmVnZXhwLnRlc3QobG9va3VwKSkge1xuICAgIGlmKHRoaXMubG9va3Vwc1tsb29rdXBdID09PSAxKSB7XG4gICAgICB0aGlzLnZhbHVlc1tsb29rdXBdID0gW2xvb2t1cF1cbiAgICAgIHRoaXMudXBkYXRlVmFsdWUuYXBwbHkodGhpcywgdmFsdWUpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfVxufVxuIiwidmFyIHN0cmluZ19yZWdleHAgPSAvXig/OicoKD86W14nXFxcXF18KD86XFxcXC4pKSopJ3xcIigoPzpbXlwiXFxcXF18KD86XFxcXC4pKSopXCIpJC9cbiAgLCBudW1iZXJfcmVnZXhwID0gL14oXFxkKig/OlxcLlxcZCspPykkL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZV92YWx1ZVxuXG52YXIgdmFscyA9IHtcbiAgICAndHJ1ZSc6IHRydWVcbiAgLCAnZmFsc2UnOiBmYWxzZVxuICAsICdudWxsJzogbnVsbFxuICAsICd1bmRlZmluZWQnOiB1bmRlZmluZWRcbn1cblxuZnVuY3Rpb24gY3JlYXRlX3ZhbHVlKGxvb2t1cCkge1xuICB2YXIgcGFydHNcblxuICBpZih2YWxzLmhhc093blByb3BlcnR5KGxvb2t1cCkpIHtcbiAgICByZXR1cm4gdGhpcy51cGRhdGVWYWx1ZShsb29rdXAsIHZhbHNbbG9va3VwXSkgfHwgdHJ1ZVxuICB9XG5cbiAgaWYocGFydHMgPSBsb29rdXAubWF0Y2gobnVtYmVyX3JlZ2V4cCkpIHtcbiAgICByZXR1cm4gdGhpcy51cGRhdGVWYWx1ZShsb29rdXAsICtwYXJ0c1sxXSkgfHwgdHJ1ZVxuICB9XG5cbiAgaWYocGFydHMgPSBsb29rdXAubWF0Y2goc3RyaW5nX3JlZ2V4cCkpIHtcbiAgICByZXR1cm4gdGhpcy51cGRhdGVWYWx1ZShsb29rdXAsIHBhcnRzWzFdIHx8IHBhcnRzWzJdIHx8ICcnKSB8fCB0cnVlXG4gIH1cbn1cbiJdfQ==
