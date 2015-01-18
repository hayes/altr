(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var extend = require('extend')

module.exports = altrExtend

function altrExtend(base, options) {
  var baseOptions = extend(true, base, options)
  var altr = this

  extension.render = altr.render.bind(altr, baseOptions)
  extension.extend = altr.extend.bind(altr)
  extension.addTag = altr.addTag.bind(altr)
  extension.include = altr.include.bind(altr)
  extension.addFilter = altr.addFilter.bind(altr)
  extension.addDecorator = altr.addDecorator.bind(altr)

  return extension

  function extension(root, state, options) {
    return new altr(root, state, extend(
        true
      , Object.create(baseOptions)
      , options || {}
    ))
  }
}
},{"extend":48}],2:[function(require,module,exports){
(function (global){
var EE = require('events').EventEmitter
var batch = require('batch-queue')
var dirtybit = require('dirtybit')
var extend = require('extend')

var templateString = require('./template-string')
var elementNode = require('./element-node')
var mergeHooks = require('./merge-hooks')
var altrExtend = require('./altr-extend')
var textNode = require('./text-node')
var toString = require('./to-string')
var runHooks = require('./run-hooks')
var getEl = require('./get-element')
var destroy = require('./destroy')
var render = require('./render')
var remove = require('./remove')
var raf = require('./raf')

// dynamic require so it does not make it into the browserify bundle
var domModule = 'micro-dom'

module.exports = altr

altr.helpers = {}
altr.decorators = {}

altr.render = render
altr.addTag = addTag
altr.extend = altrExtend
altr.addHelper = addHelper
altr.addDecorator = addDecorator

function altr(root, data, options) {
  if(!(this instanceof altr)) {
    return new altr(root, data, options)
  }

  var options = options || {}

  this.helpers = extend(
      false
    , Object.create(altr.helpers)
    , options.helpers || {}
  )

  this.decorators = extend(
      false
    , Object.create(altr.decorators)
    , options.decorators || {}
  )

  this.root = root
  this.sync = !!options.sync
  this.tagRegExp = makeTagRegExp(options.delimiters)
  this.document = options.doc || global.document || require(domModule).document
  this.lookups = dirtybit(data, {filters: this.helpers})

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

  this.children = this.initNodes(this.rootNodes(), this.lookups)
  this.runHooks(this.children.hooks, 'insert', null)
  this.runBatch()
}

altr.prototype = Object.create(EE.prototype)
altr.prototype.constructor = altr

altr.prototype.templateString = templateString
altr.prototype.addDecorator = addDecorator
altr.prototype.mergeHooks = mergeHooks
altr.prototype.initNodes = initNodes
altr.prototype.rootNodes = rootNodes
altr.prototype.addHelper = addHelper
altr.prototype.runBatch = runBatch
altr.prototype.toString = toString
altr.prototype.runHooks = runHooks
altr.prototype.getElement = getEl
altr.prototype.destroy = destroy
altr.prototype.remove = remove
altr.prototype.into = appendTo
altr.prototype.update = update
altr.prototype.tagList = []
altr.prototype.tags = {}

var node_handlers = {}

node_handlers[1] = elementNode
node_handlers[3] = textNode

function update(data, sync) {
  this.state = data
  this.lookups.update(data)

  if(sync || this.sync) {
    this.runBatch()
  }
}

function initNodes(_nodes, _lookups, state) {
  var altr = this
  var lookups = _lookups || dirtybit(state, {filters: this.helpers})
  var nodes = Array.prototype.slice.call(_nodes)
  var hooks = nodes.reduce(join, []).filter(Boolean)

  return {hooks: hooks, lookups: lookups, nodes: nodes}

  function join(list, node) {
    var hooks = initNode.call(altr, lookups, node)

    return hooks ? list.concat(hooks) : list
  }
}

function initNode(lookups, el) {
  return node_handlers[el.nodeType] ?
    node_handlers[el.nodeType].call(this, el, lookups) :
    el.childNodes && el.childNodes.length ?
    this.initNodes(lookups, el.childNodes) :
    null
}

function rootNodes() {
  return this.root.nodeType === this.document.DOCUMENT_FRAGMENT_NODE ?
    [].slice.call(this.root.childNodes) :
    [this.root]
}

function addHelper(name, helper) {
  this.helpers[name] = helper
}

function addTag(attr, tag) {
  this.prototype.tags[attr] = tag
  this.prototype.tagList.push({
      attr: attr
    , constructor: tag
  })
}

function appendTo(node) {
  var rootNodes = this.rootNodes()

  for(var i = 0, l = rootNodes.length; i < l; ++i) {
    node.appendChild(getEl(rootNodes[i]))
  }
}

function addHelper(name, fn) {
  return this.helpers[name] = fn
}

function addDecorator(name, fn) {
  return this.decorators[name] = fn
}

function runBatch() {
  this.batch.run() && this.emit('update', this.state)
}

function makeTagRegExp(_delimiters) {
  var delimiters = _delimiters || ['{{', '}}']

  return new RegExp(delimiters[0] + '\\s*(.*?)\\s*' + delimiters[1])
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./altr-extend":1,"./destroy":6,"./element-node":7,"./get-element":8,"./merge-hooks":10,"./raf":11,"./remove":12,"./render":13,"./run-hooks":14,"./template-string":25,"./text-node":26,"./to-string":27,"batch-queue":28,"dirtybit":32,"events":29,"extend":48}],3:[function(require,module,exports){
module.exports.raw = rawAttribute
module.exports.altr = altrAttribute
module.exports.prop = altrProperty

function rawAttribute(el, attr, lookups) {
  this.templateString(
      attr.value
    , this.batch.add(el.setAttribute.bind(el, attr.name))
    , lookups
  )
}

function altrAttribute(el, attr, lookups) {
  var name = attr.name.slice('altr-attr-'.length)

  lookups.on(attr.value, this.batch.add(update))
  el.removeAttribute(attr.name)

  function update(val) {
    if(!val && val !== '' && val !== 0) {
      return el.removeAttribute(name)
    }

    el.setAttribute(name, val)
  }
}

function altrProperty(el, attr, lookups) {
  var name = attr.name.slice('altr-prop-'.length)

  el.removeAttribute(attr.name)
  lookups.on(attr.value, this.batch.add(update))

  function update(val) {
    el[name] = val
  }
}

},{}],4:[function(require,module,exports){
(function (global){
module.exports = global.altr = require('./index')

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./index":9}],5:[function(require,module,exports){
module.exports = decorators

function decorators(el, attrs, lookups) {
  var altr = this
  var hooks = []

  return attrs.map(createDecorator)

  function createDecorator(attr) {
    var decorator = altr.decorators[attr.name].call(altr, el)
    var expression = '[' + attr.value + ']'

    if(!decorator) {
      return
    }

    var hooks = {insert: decorator.insert, remove: decorator.remove}

    if(decorator.update) {
      lookups.on(expression, update)
    }

    hooks.destroy = destroy

    return hooks

    function destroy() {
      lookups.removeListener(expression, update)

      if(decorator.destroy) {
        decorator.destroy()
      }
    }

    function update(args) {
      decorator.update.apply(null, args)
    }
  }
}

},{}],6:[function(require,module,exports){
module.exports = destroy

function destroy(children, el, done) {
  var altr = this

  altr.remove(children, el, function(el) {
    altr.runHooks(children, 'destroy', el)
    done()
  })
}

},{}],7:[function(require,module,exports){
var createDecorators = require('./decorators')
  , createAttr = require('./attributes')

module.exports = createElementNode

function createElementNode(el, lookups) {
  var decorators = []
  var altr = this
  var attr

  var attrs = Array.prototype.slice.call(el.attributes)
  var decorators = []
  var altr_tags = {}
  var tags = {}

  for(var i = 0, l = attrs.length; i < l; ++i) {
    if(altr.tags[attrs[i].name]) {
      altr_tags[attrs[i].name] = attrs[i].value
    } else if(altr.decorators[attrs[i].name]) {
      decorators.push(attrs[i])
    } else if(!attrs[i].name.lastIndexOf('altr-attr-', 0)) {
      createAttr.altr.call(this, el, attrs[i], lookups)
    } else if(!attrs[i].name.lastIndexOf('altr-prop-', 0)) {
      createAttr.prop.call(this, el, attrs[i], lookups)
    } else {
      createAttr.raw.call(this, el, attrs[i], lookups)
    }
  }

  var hooks = createDecorators.call(altr, el, decorators, lookups)

  for(var i = 0, l = altr.tagList.length; i < l; ++i) {
    if(attr = altr_tags[altr.tagList[i].attr]) {
      return hooks.concat([
          altr.tagList[i].constructor.call(altr, el, attr, lookups, hooks) || {}
      ])
    }
  }

  return hooks.concat(altr.initNodes(el.childNodes, lookups).hooks)
}

},{"./attributes":3,"./decorators":5}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
var placeholder = require('./tags/placeholder')
  , childrenTag = require('./tags/children')
  , includeTag = require('./tags/include')
  , textTag = require('./tags/text')
  , htmlTag = require('./tags/html')
  , withTag = require('./tags/with')
  , forTag = require('./tags/for')
  , rawTag = require('./tags/raw')
  , ifTag = require('./tags/if')
  , altr = require('./altr')

module.exports = altr

altr.addTag('altr-children', childrenTag)
altr.addTag('altr-replace', placeholder)
altr.addTag('altr-include', includeTag)
altr.addTag('altr-text', textTag)
altr.addTag('altr-html', htmlTag)
altr.addTag('altr-with', withTag)
altr.addTag('altr-for', forTag)
altr.addTag('altr-raw', rawTag)
altr.addTag('altr-if', ifTag)

},{"./altr":2,"./tags/children":16,"./tags/for":17,"./tags/html":18,"./tags/if":19,"./tags/include":20,"./tags/placeholder":21,"./tags/raw":22,"./tags/text":23,"./tags/with":24}],10:[function(require,module,exports){
module.exports = merge

function merge(children) {
  var altr = this

  return {
      insert: each.bind(null, 'insert')
    , destroy: each.bind(null, 'destroy')
    , remove: remove
  }

  function each(type, el) {
    var nodes = children()

    for(var i = 0, l = nodes.length; i < l; i++) {
      nodes[i][type] && nodes[i][type](el)
    }
  }

  function remove(el, ready) {
    altr.remove(children(), el, ready)
  }
}
},{}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
module.exports = remove

function remove(hooks, el, ready) {
  var remaining = hooks.length
  var c = 0

  for(var i = 0, l = remaining; i < l; i++) {
    hooks[i].remove ? hooks[i].remove(el, done) : --remaining
  }

  if(!remaining) {
    ready()
  }

  function done() {
    if(!--remaining) {
      remaining = -1
      ready()
    }
  }
}
},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
module.exports = runHooks

function runHooks(hooks, type, el) {
  for(var i = 0, l = hooks.length; i < l; i++) {
    hooks[i][type] && hooks[i][type](el)
  }
}

},{}],15:[function(require,module,exports){
var get = require('./get-element')

module.exports = setChildren

function setChildren(root, nodes) {
  var prev = null
    , el

  for(var i = nodes.length - 1; i >= 0; --i) {
    el = get(nodes[i])
    root.insertBefore(el, prev)
    prev = el
  }

  while((el = root.firstChild) !== prev) {
    root.removeChild(el)
  }
}

},{"./get-element":8}],16:[function(require,module,exports){
var setChildren = require('../set-children')

module.exports = children

function children(el, getter, lookups) {
  var current = []

  el.innerHTML = ''
  this.batch.add(lookups.on(getter, update.bind(this)))

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

},{"../set-children":15}],17:[function(require,module,exports){
var setChildren = require('../set-children')
var forRegexp = /^(.*?)\s+in\s+(.*$)/

module.exports = forHandler

function forHandler(root, args, lookups) {
  var template = root.cloneNode(true)
  var parts = args.match(forRegexp)
  var domNodes = []
  var children = []
  var altr = this
  var items = []

  if(!parts) {
    return console.error('invalid `for` tag: ' + args)
  }

  var runUpdates = altr.batch.add(runDomUpdates)

  root.innerHTML = ''

  var unique = parts[1].split(':')[1]
  var prop = parts[1].split(':')[0]
  var key = parts[2]


  lookups.on(key, update)

  return altr.mergeHooks(function() {
    return flatten(children)
  })

  function updateChildren(data) {
    var itemData

    for(var i = 0, l = children.length; i < l; ++i) {
      itemData = Object.create(data)
      itemData[prop] = items[i]
      itemData['$index'] = i
      children[i].lookups.update(itemData)
    }
  }

  function update(newItems) {
    if(!Array.isArray(newItems)) {
      newItems = []
    }

    var newChildren = new Array(newItems.length)
    var removed = []
    var matched = {}
    var added = []
    var index

    domNodes = []

    for(var i = 0, l = newItems.length; i < l; ++i) {
      index = findIndex(items, newItems[i], unique)

      if(index !== -1) {
        newChildren[i] = children[index]
        items[index] = children[index] = matched
      } else {
        added.push(newChildren[i] = makeChild())
      }

      domNodes = domNodes.concat(newChildren[i].nodes)
    }

    for(var i = 0, l = children.length; i < l; ++i) {
      if(children[i] !== matched) {
        removed.push(children[i])
      }
    }

    children = newChildren.slice()
    items = newItems.slice()
    updateChildren(lookups.state)
    altr.destroy(flatten(removed), root, runUpdates.bind(
        altr
      , domNodes
      , flatten(added)
    ))
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
    return altr.initNodes(template.cloneNode(true).childNodes)
  }

  function runDomUpdates(children, added) {
    setChildren.call(this, root, children)
    altr.runHooks(added, 'insert', root)
  }
}

function flatten(list) {
  return list.reduce(function(all, part) {
    return part.hooks ? all.concat(part.hooks) : all
  }, [])
}
},{"../set-children":15}],18:[function(require,module,exports){
module.exports = html

function html(el, accessor, lookups) {
  this.batch.add(lookups.on(accessor, update))

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

},{}],19:[function(require,module,exports){
module.exports = ifTag

function ifTag(el, getter, lookups, decorators) {
  var placeholder = this.document.createComment('altr-if-placeholder')
  var children = this.initNodes(el.childNodes)
  var all = children.hooks.concat(decorators)
  var lastVal = null
  var hidden = null
  var first = true
  var altr = this

  var update = this.batch.add(function(show, origin) {
    if(!hidden && !show) {
      el.parentNode.replaceChild(placeholder, el)
      el._altrPlaceholder = placeholder
      hidden = true
    } else if(hidden && show) {
      placeholder.parentNode.replaceChild(el, placeholder)
      altr.runHooks(all, 'insert', origin)
      delete el._altrPlaceholder
      hidden = false
    } else if(first) {
      first = false
      altr.runHooks(all, 'insert', origin)
    }
  })

  lookups.on(getter, toggle, true)

  return {
      insert: insert
    , remove: remove
    , destroy: destroy
  }

  function destroy(el) {
    altr.runHooks(children.hooks, 'destroy', el)
  }

  function toggle(val) {
    lastVal = val

    if(val) {
      update(true, el)
      children.lookups.update(lookups.state)
    } else {
      altr.remove(all, el, function() {
        return update(false, el)
      })
    }
  }

  function insert(el) {
    if(lastVal) {
      update(true, el)
    }
  }

  function remove(el, done) {
    if(hidden) {
      done()

      return update(false)
    }

    altr.remove(children.hooks, el, function() {
      update(false)
      done()
    })
  }
}


},{}],20:[function(require,module,exports){
module.exports = include

function include(el, getter, lookups) {
  var removeListeners = []
  var children = null
  var content = ''
  var altr = this

  lookups.on(getter, set)
  lookups.on('this', update)

  return {insert: insert, remove: remove, destroy: destroy}

  function set(data) {
    content = typeof data === 'string' ? data : ''
    if(children) remove(el, insert)
  }

  function insert() {
    if(children) {
      return
    }

    el.innerHTML = content
    children = altr.initNodes(el.childNodes, null, lookups.state)
  }

  function remove(el, done) {
    if(!children) {
      return done()
    }

    if(removeListeners.push(done) > 1) {
      return
    }

    children = null
    removing = true
    altr.destroy(children, el, function() {
      var listener

      if(!children) {
        el.innerHTML = ''
      }

      while(listener = removeListeners.pop()) {
        listener()
      }
    })

  }

  function update(state) {
    children && children.lookups.update(state)
  }

  function destroy() {
    lookups.removeListener('this', update)
    lookups.removeListeners(getter, set)
  }
}

},{}],21:[function(require,module,exports){
module.exports = placeholder

function placeholder(original, getter, lookups) {
  var current = original
    , altr = this

  this.batch.add(lookups.on(getter, update))

  function update(val) {
    if(!val || !val.nodeName || val === current) {
      return
    }

    current.parentNode.replaceChild(val, current)
    original._altrPlaceholder = val
    current = val
  }
}

},{}],22:[function(require,module,exports){
module.exports = function raw() {}

},{}],23:[function(require,module,exports){
module.exports = text

function text(el, getter, lookups) {
  this.batch.add(lookups.on(getter, update))

  function update(val) {
    el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],24:[function(require,module,exports){
module.exports = withTag

function withTag(el, getter, lookups) {
  var children = this.initNodes(el.childNodes)
    , parts = getter.split(' as ')

  lookups.on(parts[0], update)

  return children.hooks

  function update(_val) {
    var val = Object.create(lookups.state)

    val[parts[1]] = _val
    children.lookups.update(val)
  }
}

},{}],25:[function(require,module,exports){
module.exports = templatString

function templatString(template, change, lookups) {
  if(!template.match(this.tagRegExp)) {
    return
  }

  var remaining = template
    , parts = []
    , hooks = []
    , index
    , next

  while(remaining && (next = remaining.match(this.tagRegExp))) {
    if(index = remaining.indexOf(next[0])) {
      parts.push(remaining.slice(0, index))
    }

    parts.push('')
    remaining = remaining.slice(index + next[0].length)
    lookups.on(next[1], setPart.bind(this, parts.length - 1))
  }

  if(remaining) {
    setPart(parts.length, remaining)
  }

  function setPart(idx, val) {
    parts[idx] = val

    change(parts.join(''))
  }
}

},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
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

  return !!jobs.length
}

},{}],29:[function(require,module,exports){
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
      }
      throw TypeError('Uncaught, unspecified "error" event.');
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

},{}],30:[function(require,module,exports){
module.exports = Expression

function Expression(parsed, deps, value, handler) {
  this.dependents = []
  this.deps = deps
  this.parsed = parsed
  this.changed = false
  this.removable = true
  this.value = value
  this.update = update.bind(this)
  this.handler = handler

  for(var i = 0, l = deps.length; i < l; ++i) {
    deps[i].dependents.push(this)
  }
}

Expression.prototype.change = change
Expression.prototype.update = update

function change(val) {
  if(this.value === val && (!this.value || typeof this.value !== 'object')) {
    return
  }

  this.value = val
  this.changed = true

  for(var i = 0, l = this.dependents.length; i < l; ++i) {
    this.dependents[i].update()
  }
}

function update() {
  var args = new Array(this.deps.length)

  for(var i = 0, l = this.deps.length; i < l; ++i) {
    args[i] = this.deps[i].value
  }

  this.handler.apply(null, args)
}

},{}],31:[function(require,module,exports){
module.exports = hash

function hash(str) {
  var val = 0

  for(var i = 0, len = str.length; i < len; ++i) {
    val = ((val << 5) - val) + str.charCodeAt(i)
    val |= 0
  }

  return val.toString().replace('-', '_')
}

},{}],32:[function(require,module,exports){
var Expression = require('./expression')
var remove = require('./remove')
var types = require('./types')
var parse = require('./parse')
var split = require('./split')
var watch = require('./watch')
var hash = require('./hash')

module.exports = DirtyBit

function DirtyBit(state, options) {
  if(!(this instanceof DirtyBit)) {
    return new DirtyBit(state, options)
  }

  this.options = options || {}

  this.partials = {}
  this.state = state || {}
  this.filters = Object.create(this.options.filters || null)
  this.rootKey = this.options.rootKey

  this.rootExpression = new Expression('this', [], this.state)

  this.expressions = {}
  this.handlers = {}
  this.handlerList = []

  this.expressions['this'] = this.rootExpression
  this.rootExpression.removable = false

  if(this.rootKey) {
    this.expressions[this.rootKey] = this.rootExpression
  }

  this.updating = false
}

DirtyBit.prototype.removeListener = remove
DirtyBit.prototype.addFilter = addFilter
DirtyBit.prototype.update = update
DirtyBit.prototype.report = report
DirtyBit.prototype.types = types
DirtyBit.prototype.split = split
DirtyBit.prototype.parse = parse
DirtyBit.prototype.watch = watch
DirtyBit.prototype.hash = hash
DirtyBit.prototype.trim = trim
DirtyBit.prototype.on = on

DirtyBit.parsed = {}

function update(state) {
  this.state = state
  this.updating = true
  this.rootExpression.change(state)
  this.updating = false
  this.report()
}

function report() {
  var expression
  var lookup

  for(var i = 0, l = this.handlerList.length; i < l; ++i) {
    lookup = this.handlerList[i]
    expression = this.expressions[lookup]

    if(!expression.changed) {
      continue
    }

    for(var j = 0, l2 = this.handlers[lookup].length; j < l2; ++j) {
      this.handlers[lookup][j](expression.value)
    }

    expression.changed = false
  }
}

function addFilter(name, filter) {
  this.filters[name] = filter
}

function trim(str) {
  return str.replace(/^\s+|\s+$/g, '')
}

function on(_lookup, handler) {
  var lookup = this.trim(_lookup)

  if(this.handlers[lookup]) {
    this.handlers[lookup].push(handler)

    return handler(this.expressions[lookup].value)
  }

  this.updating = true
  this.watch(lookup)
  this.handlerList.push(lookup)
  this.handlers[lookup] = [handler]
  this.updating = false
  handler(this.expressions[lookup].value)
}

},{"./expression":30,"./hash":31,"./parse":33,"./remove":34,"./split":35,"./types":40,"./watch":47}],33:[function(require,module,exports){
module.exports = parse

function parse(lookup) {
  var val

  for(var i = 0, l = this.types.order.length; i < l; ++i) {
    val = this.types.types[this.types.order[i]].parse.call(this, lookup)

    if(val) {
      break
    }
  }

  val.type = this.types.order[i]
  val.lookup = lookup

  return val
}

},{}],34:[function(require,module,exports){
module.exports = remove

function remove(_lookup, handler) {
  var lookup = this.trim(_lookup)
  var handlers = this.handlers[lookup]

  if(!handlers) {
    return
  }

  var index = handlers.indexOf(handler)

  if(index < 0) {
    return
  }

  handlers.splice(index, 1)

  if(this.handlers[lookup].length) {
    return
  }

  delete this.handlers[lookup]
  this.handlerList.splice(this.handlerList.indexOf(lookup), 1)
  removeExpression(this, this.expressions[lookup])
}

function removeExpression(self, expression) {
  if(expression.dependents.length || !expression.removable) {
    return
  }

  delete self.expressions[expression.parsed.lookup]

  for(var i = 0, l = expression.deps.length, dep; i < l; ++i) {
    dep = expression.deps[i]
    dep.dependents.splice(dep.dependents.indexOf(expression), 1)
    removeExpression(self, dep)
  }
}

},{}],35:[function(require,module,exports){
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
    if(!~parts.indexOf(key)) {
      i = l

      break
    }

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
    console.error(
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

},{}],36:[function(require,module,exports){
module.exports = create
module.exports.parse = parse

var tests = []
var ops = {}

add(['|\\|'])
add(['&&'])
add(['|'])
add(['^'])
add(['&'])
add(['===', '!==', '==', '!='])
add(['>=', '<=', '>', '<', ' in ', ' instanceof '])
// add(['<<', '>>', '>>>']) //conflics with < and >
add(['+', '-'])
add(['*', '/', '%'])

ops['in'] = updateIn
ops['instanceof'] = updateInstanceof

function add(list) {
  tests.push(new RegExp('^(.+?)(\\' + list.join('|\\') + ')(.+)$'))
}

function parse(lookup) {
  var parts

  for(var i = 0, l = tests.length; i < l; ++i) {
    parts = lookup.match(tests[i])

    if(parts) {
      break
    }
  }

  if(!parts) {
    return false
  }

  return {deps: [parts[1], parts[3]], options: parts[2]}
}

function create(change, op) {
  if(!ops[op]) {
    ops[op] = createOp(op)
  }

  return ops[op].bind(null, change)
}

function createOp(op) {
  return Function('change, left, right', 'change(left ' + op + ' right)')
}

function updateIn(left, right) {
  return typeof right !== 'undefined' && left in right
}

function updateInstanceof(left, right) {
  return typeof right === 'function' && left instanceof right
}

},{}],37:[function(require,module,exports){
var has_bracket = /^.*\S\[.+\]$/

module.exports = brackets
module.exports.parse = parse

function parse(lookup) {
  if(!has_bracket.test(lookup)) {
    return false
  }

  var pairs = this.split.pairs.map(function(pair) {
    return [pair[1], pair[0], pair[2]]
  })

  return {
      deps: this.split(reverse(lookup.slice(0, -1)), '[', false, pairs)
        .map(reverse)
  }
}

function reverse(str) {
  return str.split('').reverse().join('')
}

function brackets(change) {
  return function(inner, root) {
    if(root === null || root === undefined) {
      return change()
    }

    change(root[inner])
  }
}

},{}],38:[function(require,module,exports){
var valid_path = /^(.*)\.([^.\s]+)$/

module.exports = create
module.exports.parse = parse

function parse(lookup) {
  var parts = lookup.match(valid_path)

  return parts ?
    {deps: [parts[1]], options: parts[2]} :
    {deps: ['this'], options: lookup}
}

function create(change, key) {
  return function(obj) {
    if(obj === null || obj === undefined) {
      return change()
    }

    change(obj[key])
  }
}

},{}],39:[function(require,module,exports){
var filter_regexp = /^([^\s(]+)\((.*)\)$/

module.exports = create
module.exports.parse = parse

function parse(lookup) {
  var parts = lookup.match(filter_regexp)

  if(!parts) {
    return false
  }

  return {deps: this.split(parts[2], ',', true), options: parts[1]}
}

function create(change, name) {
  return this.filters[name](change) || function() {
    console.error('could not find filter: ' + name)
  }
}

},{}],40:[function(require,module,exports){
var brackets = require('./brackets')
var dot_path = require('./dot-path')
var filters = require('./filters')
var partial = require('./partial')
var ternary = require('./ternary')
var parens = require('./parens')
var values = require('./values')
var binary = require('./binary')
var unary = require('./unary')
var list = require('./list')

module.exports.order = [
    'values'
  , 'filters'
  , 'partial'
  , 'parens'
  , 'ternary'
  , 'binary'
  , 'unary'
  , 'brackets'
  , 'list'
  , 'dot_path'
]

module.exports.types = {
    values: values
  , filters: filters
  , partial: partial
  , parens: parens
  , ternary: ternary
  , binary: binary
  , unary: unary
  , brackets: brackets
  , list: list
  , dot_path: dot_path
}

},{"./binary":36,"./brackets":37,"./dot-path":38,"./filters":39,"./list":41,"./parens":42,"./partial":43,"./ternary":44,"./unary":45,"./values":46}],41:[function(require,module,exports){
var is_list = /^\[.+\]$/

module.exports = list
module.exports.parse = parse

function parse(lookup) {
  if(!is_list.test(lookup)) {
    return false
  }

  return {deps: this.split(lookup.slice(1, -1), ',', true)}
}

function list(change) {
  return function() {
    change([].slice.call(arguments))
  }
}

},{}],42:[function(require,module,exports){
var parens_regexp = /(^|[^0-9a-zA-Z_$])\((.*)$/

module.exports.parse = parse

function parse(lookup) {
  var parts = lookup.match(parens_regexp)

  if(!parts) {
    return false
  }

  var body = this.split(parts[2], ')')[0]
  var key = '{{paren_' + this.hash(body) + '}}'
  var partials = {}

  partials[key] = body

  var patched = lookup.slice(0, lookup.lastIndexOf([parts[2]]) - 1) +
    key + parts[2].slice(body.length + 1)

  return {proxy: patched, partials: partials}
}

},{}],43:[function(require,module,exports){
var regexp = /^\{\{[#_\w]+\}\}$/

module.exports.parse = parse

function parse(lookup) {
  return regexp.test(lookup) ? {proxy: this.partials[lookup]} : false
}

},{}],44:[function(require,module,exports){
var ternary_regexp = /^\s*(.+?)\s*\?(.*)\s*$/

module.exports = create
module.exports.parse = parse

function parse(lookup) {
  var parts = lookup.match(ternary_regexp)

  if(!parts) {
    return false
  }

  var rest = this.split(parts[2], ':')

  if(rest.length !== 2) {
    console.error('Unmatched ternary in: ' + lookup)
  }

  return {deps: [parts[1], rest[0], rest[1]]}
}

function create(change) {
  return function(ok, left, right) {
    change(ok ? left : right)
  }
}

},{}],45:[function(require,module,exports){
module.exports = create
module.exports.parse = parse

var test = new RegExp('^(\\' + ['!', '+', '-', '~'].join('|\\') + ')(.+)$')

var ops = {}

function parse(lookup) {
  var parts = lookup.match(test)

  if(!parts) {
    return false
  }

  return {deps: [parts[2]], options: parts[1]}
}

function create(change, op) {
  if(!ops[op]) {
    ops[op] = create_op(op)
  }

  return ops[op].bind(null, change)
}

function create_op(op) {
  return Function('change, val', 'change(' + op + 'val)')
}

},{}],46:[function(require,module,exports){
var string_regexp = /^(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")$/
  , number_regexp = /^(\d*(?:\.\d+)?)$/

module.exports.parse = parse

var vals = {
    'true': true
  , 'false': false
  , 'null': null
  , 'undefined': undefined
}

function parse(lookup) {
  if(vals.hasOwnProperty(lookup)) {
    return {value: vals[lookup]}
  }

  if(number_regexp.test(lookup)) {
    return {value: +lookup}
  }

  if(string_regexp.test(lookup)) {
    return {value: lookup.slice(1, -1)}
  }
}

},{}],47:[function(require,module,exports){
var Expression = require('./expression')

module.exports = watch

var seen = {}

function watch(lookup) {
  var self = this

  var parsed = seen[lookup] || (seen[lookup] = self.parse(lookup))
  var partials = parsed.partials && Object.keys(parsed.partials)

  var handler = createHandler.call(self, parsed, change)

  if(partials) {
    for(var i = 0, l = partials.length; i < l; ++i) {
      self.partials[partials[i]] = parsed.partials[partials[i]]
      getDep.call(self, self.partials[partials[i]])
    }
  }

  var expression = createExpression.call(self, parsed, handler)

  self.expressions[lookup] = expression

  if(expression.handler) {
    expression.update()
  }

  return expression

  function change(val) {
    if(self.updating) {
      return expression.change(val)
    }

    self.updating = true
    expression.change(val)
    self.updating = false
    self.report()
  }
}

function createHandler(parsed, change) {
  var type = this.types.types[parsed.type]

  if(typeof type === 'function') {
    return type.call(this, change, parsed.options)
  }

  return null
}

function createExpression(parsed, handler) {
  var deps = parsed.deps ? parsed.deps.map(getDep.bind(this)) : []
  var proxy = parsed.proxy && getDep.call(this, parsed.proxy)
  var expression

  if(proxy) {
    return expression = new Expression(parsed, [proxy], proxy.value, echo)
  }

  return new Expression(parsed, deps, parsed.value, handler)

  function echo(val) {
    expression.change(val)
  }
}

function getDep(_lookup) {
  var lookup = this.trim(_lookup)

  return this.expressions[lookup] || this.watch(lookup)
}

},{"./expression":30}],48:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	"use strict";
	if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval) {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	"use strict";
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === "boolean") {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if (typeof target !== "object" && typeof target !== "function" || target == undefined) {
			target = {};
	}

	for (; i < length; ++i) {
		// Only deal with non-null/undefined values
		if ((options = arguments[i]) != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvYWx0ci1leHRlbmQuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvYWx0ci5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9hdHRyaWJ1dGVzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL2Jyb3dzZXIuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvZGVjb3JhdG9ycy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9kZXN0cm95LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL2VsZW1lbnQtbm9kZS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9nZXQtZWxlbWVudC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9tZXJnZS1ob29rcy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9yYWYuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvcmVtb3ZlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3JlbmRlci5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9ydW4taG9va3MuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvc2V0LWNoaWxkcmVuLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvY2hpbGRyZW4uanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvcGxhY2Vob2xkZXIuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9yYXcuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy90ZXh0LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3Mvd2l0aC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi90ZW1wbGF0ZS1zdHJpbmcuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGV4dC1ub2RlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RvLXN0cmluZy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9iYXRjaC1xdWV1ZS9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9leHByZXNzaW9uLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9oYXNoLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvcGFyc2UuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3JlbW92ZS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvc3BsaXQuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3R5cGVzL2JpbmFyeS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvYnJhY2tldHMuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3R5cGVzL2RvdC1wYXRoLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy9maWx0ZXJzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvbGlzdC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvcGFyZW5zLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy9wYXJ0aWFsLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy90ZXJuYXJ5LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi90eXBlcy91bmFyeS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvdHlwZXMvdmFsdWVzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi93YXRjaC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9leHRlbmQvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBleHRlbmQgPSByZXF1aXJlKCdleHRlbmQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJFeHRlbmRcblxuZnVuY3Rpb24gYWx0ckV4dGVuZChiYXNlLCBvcHRpb25zKSB7XG4gIHZhciBiYXNlT3B0aW9ucyA9IGV4dGVuZCh0cnVlLCBiYXNlLCBvcHRpb25zKVxuICB2YXIgYWx0ciA9IHRoaXNcblxuICBleHRlbnNpb24ucmVuZGVyID0gYWx0ci5yZW5kZXIuYmluZChhbHRyLCBiYXNlT3B0aW9ucylcbiAgZXh0ZW5zaW9uLmV4dGVuZCA9IGFsdHIuZXh0ZW5kLmJpbmQoYWx0cilcbiAgZXh0ZW5zaW9uLmFkZFRhZyA9IGFsdHIuYWRkVGFnLmJpbmQoYWx0cilcbiAgZXh0ZW5zaW9uLmluY2x1ZGUgPSBhbHRyLmluY2x1ZGUuYmluZChhbHRyKVxuICBleHRlbnNpb24uYWRkRmlsdGVyID0gYWx0ci5hZGRGaWx0ZXIuYmluZChhbHRyKVxuICBleHRlbnNpb24uYWRkRGVjb3JhdG9yID0gYWx0ci5hZGREZWNvcmF0b3IuYmluZChhbHRyKVxuXG4gIHJldHVybiBleHRlbnNpb25cblxuICBmdW5jdGlvbiBleHRlbnNpb24ocm9vdCwgc3RhdGUsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IGFsdHIocm9vdCwgc3RhdGUsIGV4dGVuZChcbiAgICAgICAgdHJ1ZVxuICAgICAgLCBPYmplY3QuY3JlYXRlKGJhc2VPcHRpb25zKVxuICAgICAgLCBvcHRpb25zIHx8IHt9XG4gICAgKSlcbiAgfVxufSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlclxudmFyIGJhdGNoID0gcmVxdWlyZSgnYmF0Y2gtcXVldWUnKVxudmFyIGRpcnR5Yml0ID0gcmVxdWlyZSgnZGlydHliaXQnKVxudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpXG5cbnZhciB0ZW1wbGF0ZVN0cmluZyA9IHJlcXVpcmUoJy4vdGVtcGxhdGUtc3RyaW5nJylcbnZhciBlbGVtZW50Tm9kZSA9IHJlcXVpcmUoJy4vZWxlbWVudC1ub2RlJylcbnZhciBtZXJnZUhvb2tzID0gcmVxdWlyZSgnLi9tZXJnZS1ob29rcycpXG52YXIgYWx0ckV4dGVuZCA9IHJlcXVpcmUoJy4vYWx0ci1leHRlbmQnKVxudmFyIHRleHROb2RlID0gcmVxdWlyZSgnLi90ZXh0LW5vZGUnKVxudmFyIHRvU3RyaW5nID0gcmVxdWlyZSgnLi90by1zdHJpbmcnKVxudmFyIHJ1bkhvb2tzID0gcmVxdWlyZSgnLi9ydW4taG9va3MnKVxudmFyIGdldEVsID0gcmVxdWlyZSgnLi9nZXQtZWxlbWVudCcpXG52YXIgZGVzdHJveSA9IHJlcXVpcmUoJy4vZGVzdHJveScpXG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKVxudmFyIHJlbW92ZSA9IHJlcXVpcmUoJy4vcmVtb3ZlJylcbnZhciByYWYgPSByZXF1aXJlKCcuL3JhZicpXG5cbi8vIGR5bmFtaWMgcmVxdWlyZSBzbyBpdCBkb2VzIG5vdCBtYWtlIGl0IGludG8gdGhlIGJyb3dzZXJpZnkgYnVuZGxlXG52YXIgZG9tTW9kdWxlID0gJ21pY3JvLWRvbSdcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuaGVscGVycyA9IHt9XG5hbHRyLmRlY29yYXRvcnMgPSB7fVxuXG5hbHRyLnJlbmRlciA9IHJlbmRlclxuYWx0ci5hZGRUYWcgPSBhZGRUYWdcbmFsdHIuZXh0ZW5kID0gYWx0ckV4dGVuZFxuYWx0ci5hZGRIZWxwZXIgPSBhZGRIZWxwZXJcbmFsdHIuYWRkRGVjb3JhdG9yID0gYWRkRGVjb3JhdG9yXG5cbmZ1bmN0aW9uIGFsdHIocm9vdCwgZGF0YSwgb3B0aW9ucykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBvcHRpb25zKVxuICB9XG5cbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgdGhpcy5oZWxwZXJzID0gZXh0ZW5kKFxuICAgICAgZmFsc2VcbiAgICAsIE9iamVjdC5jcmVhdGUoYWx0ci5oZWxwZXJzKVxuICAgICwgb3B0aW9ucy5oZWxwZXJzIHx8IHt9XG4gIClcblxuICB0aGlzLmRlY29yYXRvcnMgPSBleHRlbmQoXG4gICAgICBmYWxzZVxuICAgICwgT2JqZWN0LmNyZWF0ZShhbHRyLmRlY29yYXRvcnMpXG4gICAgLCBvcHRpb25zLmRlY29yYXRvcnMgfHwge31cbiAgKVxuXG4gIHRoaXMucm9vdCA9IHJvb3RcbiAgdGhpcy5zeW5jID0gISFvcHRpb25zLnN5bmNcbiAgdGhpcy50YWdSZWdFeHAgPSBtYWtlVGFnUmVnRXhwKG9wdGlvbnMuZGVsaW1pdGVycylcbiAgdGhpcy5kb2N1bWVudCA9IG9wdGlvbnMuZG9jIHx8IGdsb2JhbC5kb2N1bWVudCB8fCByZXF1aXJlKGRvbU1vZHVsZSkuZG9jdW1lbnRcbiAgdGhpcy5sb29rdXBzID0gZGlydHliaXQoZGF0YSwge2ZpbHRlcnM6IHRoaXMuaGVscGVyc30pXG5cbiAgdGhpcy5iYXRjaCA9IGJhdGNoKChmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5zeW5jKSB7XG4gICAgICByYWYodGhpcy5ydW5CYXRjaC5iaW5kKHRoaXMpKVxuICAgIH1cbiAgfSkuYmluZCh0aGlzKSlcblxuICBpZihnbG9iYWwuQnVmZmVyICYmIHJvb3QgaW5zdGFuY2VvZiBnbG9iYWwuQnVmZmVyKSB7XG4gICAgcm9vdCA9IHJvb3QudG9TdHJpbmcoKVxuICB9XG5cbiAgaWYodHlwZW9mIHJvb3QgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHJvb3RcbiAgICB0aGlzLnJvb3QgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXG4gICAgd2hpbGUodGVtcC5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGVtcC5maXJzdENoaWxkKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMuY2hpbGRyZW4gPSB0aGlzLmluaXROb2Rlcyh0aGlzLnJvb3ROb2RlcygpLCB0aGlzLmxvb2t1cHMpXG4gIHRoaXMucnVuSG9va3ModGhpcy5jaGlsZHJlbi5ob29rcywgJ2luc2VydCcsIG51bGwpXG4gIHRoaXMucnVuQmF0Y2goKVxufVxuXG5hbHRyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRUUucHJvdG90eXBlKVxuYWx0ci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBhbHRyXG5cbmFsdHIucHJvdG90eXBlLnRlbXBsYXRlU3RyaW5nID0gdGVtcGxhdGVTdHJpbmdcbmFsdHIucHJvdG90eXBlLmFkZERlY29yYXRvciA9IGFkZERlY29yYXRvclxuYWx0ci5wcm90b3R5cGUubWVyZ2VIb29rcyA9IG1lcmdlSG9va3NcbmFsdHIucHJvdG90eXBlLmluaXROb2RlcyA9IGluaXROb2Rlc1xuYWx0ci5wcm90b3R5cGUucm9vdE5vZGVzID0gcm9vdE5vZGVzXG5hbHRyLnByb3RvdHlwZS5hZGRIZWxwZXIgPSBhZGRIZWxwZXJcbmFsdHIucHJvdG90eXBlLnJ1bkJhdGNoID0gcnVuQmF0Y2hcbmFsdHIucHJvdG90eXBlLnRvU3RyaW5nID0gdG9TdHJpbmdcbmFsdHIucHJvdG90eXBlLnJ1bkhvb2tzID0gcnVuSG9va3NcbmFsdHIucHJvdG90eXBlLmdldEVsZW1lbnQgPSBnZXRFbFxuYWx0ci5wcm90b3R5cGUuZGVzdHJveSA9IGRlc3Ryb3lcbmFsdHIucHJvdG90eXBlLnJlbW92ZSA9IHJlbW92ZVxuYWx0ci5wcm90b3R5cGUuaW50byA9IGFwcGVuZFRvXG5hbHRyLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcbmFsdHIucHJvdG90eXBlLnRhZ0xpc3QgPSBbXVxuYWx0ci5wcm90b3R5cGUudGFncyA9IHt9XG5cbnZhciBub2RlX2hhbmRsZXJzID0ge31cblxubm9kZV9oYW5kbGVyc1sxXSA9IGVsZW1lbnROb2RlXG5ub2RlX2hhbmRsZXJzWzNdID0gdGV4dE5vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEsIHN5bmMpIHtcbiAgdGhpcy5zdGF0ZSA9IGRhdGFcbiAgdGhpcy5sb29rdXBzLnVwZGF0ZShkYXRhKVxuXG4gIGlmKHN5bmMgfHwgdGhpcy5zeW5jKSB7XG4gICAgdGhpcy5ydW5CYXRjaCgpXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdE5vZGVzKF9ub2RlcywgX2xvb2t1cHMsIHN0YXRlKSB7XG4gIHZhciBhbHRyID0gdGhpc1xuICB2YXIgbG9va3VwcyA9IF9sb29rdXBzIHx8IGRpcnR5Yml0KHN0YXRlLCB7ZmlsdGVyczogdGhpcy5oZWxwZXJzfSlcbiAgdmFyIG5vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoX25vZGVzKVxuICB2YXIgaG9va3MgPSBub2Rlcy5yZWR1Y2Uoam9pbiwgW10pLmZpbHRlcihCb29sZWFuKVxuXG4gIHJldHVybiB7aG9va3M6IGhvb2tzLCBsb29rdXBzOiBsb29rdXBzLCBub2Rlczogbm9kZXN9XG5cbiAgZnVuY3Rpb24gam9pbihsaXN0LCBub2RlKSB7XG4gICAgdmFyIGhvb2tzID0gaW5pdE5vZGUuY2FsbChhbHRyLCBsb29rdXBzLCBub2RlKVxuXG4gICAgcmV0dXJuIGhvb2tzID8gbGlzdC5jb25jYXQoaG9va3MpIDogbGlzdFxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXROb2RlKGxvb2t1cHMsIGVsKSB7XG4gIHJldHVybiBub2RlX2hhbmRsZXJzW2VsLm5vZGVUeXBlXSA/XG4gICAgbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV0uY2FsbCh0aGlzLCBlbCwgbG9va3VwcykgOlxuICAgIGVsLmNoaWxkTm9kZXMgJiYgZWwuY2hpbGROb2Rlcy5sZW5ndGggP1xuICAgIHRoaXMuaW5pdE5vZGVzKGxvb2t1cHMsIGVsLmNoaWxkTm9kZXMpIDpcbiAgICBudWxsXG59XG5cbmZ1bmN0aW9uIHJvb3ROb2RlcygpIHtcbiAgcmV0dXJuIHRoaXMucm9vdC5ub2RlVHlwZSA9PT0gdGhpcy5kb2N1bWVudC5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFID9cbiAgICBbXS5zbGljZS5jYWxsKHRoaXMucm9vdC5jaGlsZE5vZGVzKSA6XG4gICAgW3RoaXMucm9vdF1cbn1cblxuZnVuY3Rpb24gYWRkSGVscGVyKG5hbWUsIGhlbHBlcikge1xuICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBoZWxwZXJcbn1cblxuZnVuY3Rpb24gYWRkVGFnKGF0dHIsIHRhZykge1xuICB0aGlzLnByb3RvdHlwZS50YWdzW2F0dHJdID0gdGFnXG4gIHRoaXMucHJvdG90eXBlLnRhZ0xpc3QucHVzaCh7XG4gICAgICBhdHRyOiBhdHRyXG4gICAgLCBjb25zdHJ1Y3RvcjogdGFnXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRvKG5vZGUpIHtcbiAgdmFyIHJvb3ROb2RlcyA9IHRoaXMucm9vdE5vZGVzKClcblxuICBmb3IodmFyIGkgPSAwLCBsID0gcm9vdE5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQoZ2V0RWwocm9vdE5vZGVzW2ldKSlcbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRIZWxwZXIobmFtZSwgZm4pIHtcbiAgcmV0dXJuIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuXG59XG5cbmZ1bmN0aW9uIGFkZERlY29yYXRvcihuYW1lLCBmbikge1xuICByZXR1cm4gdGhpcy5kZWNvcmF0b3JzW25hbWVdID0gZm5cbn1cblxuZnVuY3Rpb24gcnVuQmF0Y2goKSB7XG4gIHRoaXMuYmF0Y2gucnVuKCkgJiYgdGhpcy5lbWl0KCd1cGRhdGUnLCB0aGlzLnN0YXRlKVxufVxuXG5mdW5jdGlvbiBtYWtlVGFnUmVnRXhwKF9kZWxpbWl0ZXJzKSB7XG4gIHZhciBkZWxpbWl0ZXJzID0gX2RlbGltaXRlcnMgfHwgWyd7eycsICd9fSddXG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAoZGVsaW1pdGVyc1swXSArICdcXFxccyooLio/KVxcXFxzKicgKyBkZWxpbWl0ZXJzWzFdKVxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzLnJhdyA9IHJhd0F0dHJpYnV0ZVxubW9kdWxlLmV4cG9ydHMuYWx0ciA9IGFsdHJBdHRyaWJ1dGVcbm1vZHVsZS5leHBvcnRzLnByb3AgPSBhbHRyUHJvcGVydHlcblxuZnVuY3Rpb24gcmF3QXR0cmlidXRlKGVsLCBhdHRyLCBsb29rdXBzKSB7XG4gIHRoaXMudGVtcGxhdGVTdHJpbmcoXG4gICAgICBhdHRyLnZhbHVlXG4gICAgLCB0aGlzLmJhdGNoLmFkZChlbC5zZXRBdHRyaWJ1dGUuYmluZChlbCwgYXR0ci5uYW1lKSlcbiAgICAsIGxvb2t1cHNcbiAgKVxufVxuXG5mdW5jdGlvbiBhbHRyQXR0cmlidXRlKGVsLCBhdHRyLCBsb29rdXBzKSB7XG4gIHZhciBuYW1lID0gYXR0ci5uYW1lLnNsaWNlKCdhbHRyLWF0dHItJy5sZW5ndGgpXG5cbiAgbG9va3Vwcy5vbihhdHRyLnZhbHVlLCB0aGlzLmJhdGNoLmFkZCh1cGRhdGUpKVxuICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBpZighdmFsICYmIHZhbCAhPT0gJycgJiYgdmFsICE9PSAwKSB7XG4gICAgICByZXR1cm4gZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpXG4gICAgfVxuXG4gICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbClcbiAgfVxufVxuXG5mdW5jdGlvbiBhbHRyUHJvcGVydHkoZWwsIGF0dHIsIGxvb2t1cHMpIHtcbiAgdmFyIG5hbWUgPSBhdHRyLm5hbWUuc2xpY2UoJ2FsdHItcHJvcC0nLmxlbmd0aClcblxuICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKVxuICBsb29rdXBzLm9uKGF0dHIudmFsdWUsIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsW25hbWVdID0gdmFsXG4gIH1cbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gZ2xvYmFsLmFsdHIgPSByZXF1aXJlKCcuL2luZGV4JylcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IGRlY29yYXRvcnNcblxuZnVuY3Rpb24gZGVjb3JhdG9ycyhlbCwgYXR0cnMsIGxvb2t1cHMpIHtcbiAgdmFyIGFsdHIgPSB0aGlzXG4gIHZhciBob29rcyA9IFtdXG5cbiAgcmV0dXJuIGF0dHJzLm1hcChjcmVhdGVEZWNvcmF0b3IpXG5cbiAgZnVuY3Rpb24gY3JlYXRlRGVjb3JhdG9yKGF0dHIpIHtcbiAgICB2YXIgZGVjb3JhdG9yID0gYWx0ci5kZWNvcmF0b3JzW2F0dHIubmFtZV0uY2FsbChhbHRyLCBlbClcbiAgICB2YXIgZXhwcmVzc2lvbiA9ICdbJyArIGF0dHIudmFsdWUgKyAnXSdcblxuICAgIGlmKCFkZWNvcmF0b3IpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBob29rcyA9IHtpbnNlcnQ6IGRlY29yYXRvci5pbnNlcnQsIHJlbW92ZTogZGVjb3JhdG9yLnJlbW92ZX1cblxuICAgIGlmKGRlY29yYXRvci51cGRhdGUpIHtcbiAgICAgIGxvb2t1cHMub24oZXhwcmVzc2lvbiwgdXBkYXRlKVxuICAgIH1cblxuICAgIGhvb2tzLmRlc3Ryb3kgPSBkZXN0cm95XG5cbiAgICByZXR1cm4gaG9va3NcblxuICAgIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgICBsb29rdXBzLnJlbW92ZUxpc3RlbmVyKGV4cHJlc3Npb24sIHVwZGF0ZSlcblxuICAgICAgaWYoZGVjb3JhdG9yLmRlc3Ryb3kpIHtcbiAgICAgICAgZGVjb3JhdG9yLmRlc3Ryb3koKVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZShhcmdzKSB7XG4gICAgICBkZWNvcmF0b3IudXBkYXRlLmFwcGx5KG51bGwsIGFyZ3MpXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGRlc3Ryb3lcblxuZnVuY3Rpb24gZGVzdHJveShjaGlsZHJlbiwgZWwsIGRvbmUpIHtcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgYWx0ci5yZW1vdmUoY2hpbGRyZW4sIGVsLCBmdW5jdGlvbihlbCkge1xuICAgIGFsdHIucnVuSG9va3MoY2hpbGRyZW4sICdkZXN0cm95JywgZWwpXG4gICAgZG9uZSgpXG4gIH0pXG59XG4iLCJ2YXIgY3JlYXRlRGVjb3JhdG9ycyA9IHJlcXVpcmUoJy4vZGVjb3JhdG9ycycpXG4gICwgY3JlYXRlQXR0ciA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcycpXG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlRWxlbWVudE5vZGVcblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudE5vZGUoZWwsIGxvb2t1cHMpIHtcbiAgdmFyIGRlY29yYXRvcnMgPSBbXVxuICB2YXIgYWx0ciA9IHRoaXNcbiAgdmFyIGF0dHJcblxuICB2YXIgYXR0cnMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5hdHRyaWJ1dGVzKVxuICB2YXIgZGVjb3JhdG9ycyA9IFtdXG4gIHZhciBhbHRyX3RhZ3MgPSB7fVxuICB2YXIgdGFncyA9IHt9XG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGF0dHJzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGFsdHIudGFnc1thdHRyc1tpXS5uYW1lXSkge1xuICAgICAgYWx0cl90YWdzW2F0dHJzW2ldLm5hbWVdID0gYXR0cnNbaV0udmFsdWVcbiAgICB9IGVsc2UgaWYoYWx0ci5kZWNvcmF0b3JzW2F0dHJzW2ldLm5hbWVdKSB7XG4gICAgICBkZWNvcmF0b3JzLnB1c2goYXR0cnNbaV0pXG4gICAgfSBlbHNlIGlmKCFhdHRyc1tpXS5uYW1lLmxhc3RJbmRleE9mKCdhbHRyLWF0dHItJywgMCkpIHtcbiAgICAgIGNyZWF0ZUF0dHIuYWx0ci5jYWxsKHRoaXMsIGVsLCBhdHRyc1tpXSwgbG9va3VwcylcbiAgICB9IGVsc2UgaWYoIWF0dHJzW2ldLm5hbWUubGFzdEluZGV4T2YoJ2FsdHItcHJvcC0nLCAwKSkge1xuICAgICAgY3JlYXRlQXR0ci5wcm9wLmNhbGwodGhpcywgZWwsIGF0dHJzW2ldLCBsb29rdXBzKVxuICAgIH0gZWxzZSB7XG4gICAgICBjcmVhdGVBdHRyLnJhdy5jYWxsKHRoaXMsIGVsLCBhdHRyc1tpXSwgbG9va3VwcylcbiAgICB9XG4gIH1cblxuICB2YXIgaG9va3MgPSBjcmVhdGVEZWNvcmF0b3JzLmNhbGwoYWx0ciwgZWwsIGRlY29yYXRvcnMsIGxvb2t1cHMpXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGFsdHIudGFnTGlzdC5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihhdHRyID0gYWx0cl90YWdzW2FsdHIudGFnTGlzdFtpXS5hdHRyXSkge1xuICAgICAgcmV0dXJuIGhvb2tzLmNvbmNhdChbXG4gICAgICAgICAgYWx0ci50YWdMaXN0W2ldLmNvbnN0cnVjdG9yLmNhbGwoYWx0ciwgZWwsIGF0dHIsIGxvb2t1cHMsIGhvb2tzKSB8fCB7fVxuICAgICAgXSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaG9va3MuY29uY2F0KGFsdHIuaW5pdE5vZGVzKGVsLmNoaWxkTm9kZXMsIGxvb2t1cHMpLmhvb2tzKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBnZXRcblxuZnVuY3Rpb24gZ2V0KF9lbCkge1xuICB2YXIgZWwgPSBfZWxcblxuICB3aGlsZShlbCAmJiBlbC5fYWx0clBsYWNlaG9sZGVyKSB7XG4gICAgZWwgPSBlbC5fYWx0clBsYWNlaG9sZGVyXG5cbiAgICBpZihlbCA9PT0gX2VsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BsYWNlaG9sZGVyIGNpcmN1bGFyIHJlZmZlcmVuY2UnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBlbFxufVxuIiwidmFyIHBsYWNlaG9sZGVyID0gcmVxdWlyZSgnLi90YWdzL3BsYWNlaG9sZGVyJylcbiAgLCBjaGlsZHJlblRhZyA9IHJlcXVpcmUoJy4vdGFncy9jaGlsZHJlbicpXG4gICwgaW5jbHVkZVRhZyA9IHJlcXVpcmUoJy4vdGFncy9pbmNsdWRlJylcbiAgLCB0ZXh0VGFnID0gcmVxdWlyZSgnLi90YWdzL3RleHQnKVxuICAsIGh0bWxUYWcgPSByZXF1aXJlKCcuL3RhZ3MvaHRtbCcpXG4gICwgd2l0aFRhZyA9IHJlcXVpcmUoJy4vdGFncy93aXRoJylcbiAgLCBmb3JUYWcgPSByZXF1aXJlKCcuL3RhZ3MvZm9yJylcbiAgLCByYXdUYWcgPSByZXF1aXJlKCcuL3RhZ3MvcmF3JylcbiAgLCBpZlRhZyA9IHJlcXVpcmUoJy4vdGFncy9pZicpXG4gICwgYWx0ciA9IHJlcXVpcmUoJy4vYWx0cicpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuXG5hbHRyLmFkZFRhZygnYWx0ci1jaGlsZHJlbicsIGNoaWxkcmVuVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItcmVwbGFjZScsIHBsYWNlaG9sZGVyKVxuYWx0ci5hZGRUYWcoJ2FsdHItaW5jbHVkZScsIGluY2x1ZGVUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci10ZXh0JywgdGV4dFRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLWh0bWwnLCBodG1sVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItd2l0aCcsIHdpdGhUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci1mb3InLCBmb3JUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci1yYXcnLCByYXdUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci1pZicsIGlmVGFnKVxuIiwibW9kdWxlLmV4cG9ydHMgPSBtZXJnZVxuXG5mdW5jdGlvbiBtZXJnZShjaGlsZHJlbikge1xuICB2YXIgYWx0ciA9IHRoaXNcblxuICByZXR1cm4ge1xuICAgICAgaW5zZXJ0OiBlYWNoLmJpbmQobnVsbCwgJ2luc2VydCcpXG4gICAgLCBkZXN0cm95OiBlYWNoLmJpbmQobnVsbCwgJ2Rlc3Ryb3knKVxuICAgICwgcmVtb3ZlOiByZW1vdmVcbiAgfVxuXG4gIGZ1bmN0aW9uIGVhY2godHlwZSwgZWwpIHtcbiAgICB2YXIgbm9kZXMgPSBjaGlsZHJlbigpXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBub2Rlc1tpXVt0eXBlXSAmJiBub2Rlc1tpXVt0eXBlXShlbClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUoZWwsIHJlYWR5KSB7XG4gICAgYWx0ci5yZW1vdmUoY2hpbGRyZW4oKSwgZWwsIHJlYWR5KVxuICB9XG59IiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcblxuZnVuY3Rpb24gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG4gIHZhciByYWYgPSBnbG9iYWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB0aW1lb3V0XG5cbiAgcmV0dXJuIHJhZihjYWxsYmFjaylcblxuICBmdW5jdGlvbiB0aW1lb3V0KGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MClcbiAgfVxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlXG5cbmZ1bmN0aW9uIHJlbW92ZShob29rcywgZWwsIHJlYWR5KSB7XG4gIHZhciByZW1haW5pbmcgPSBob29rcy5sZW5ndGhcbiAgdmFyIGMgPSAwXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHJlbWFpbmluZzsgaSA8IGw7IGkrKykge1xuICAgIGhvb2tzW2ldLnJlbW92ZSA/IGhvb2tzW2ldLnJlbW92ZShlbCwgZG9uZSkgOiAtLXJlbWFpbmluZ1xuICB9XG5cbiAgaWYoIXJlbWFpbmluZykge1xuICAgIHJlYWR5KClcbiAgfVxuXG4gIGZ1bmN0aW9uIGRvbmUoKSB7XG4gICAgaWYoIS0tcmVtYWluaW5nKSB7XG4gICAgICByZW1haW5pbmcgPSAtMVxuICAgICAgcmVhZHkoKVxuICAgIH1cbiAgfVxufSIsIm1vZHVsZS5leHBvcnRzID0gcmVuZGVyXG5cbmZ1bmN0aW9uIHJlbmRlcih0ZW1wbGF0ZSwgc3RhdGUsIGVsKSB7XG4gIGlmKHRoaXMuaW5jbHVkZXNbdGVtcGxhdGVdKSB7XG4gICAgdGVtcGxhdGUgPSB0aGlzLmluY2x1ZGVzW3RlbXBsYXRlXVxuICB9XG5cbiAgdmFyIGluc3RhbmNlID0gdGhpcyh0ZW1wbGF0ZSlcblxuICBpbnN0YW5jZS51cGRhdGUoc3RhdGUgfHwge30sIHRydWUpXG5cbiAgaWYoZWwpIHtcbiAgICBpbnN0YW5jZS5pbnRvKGVsKVxuICB9XG5cbiAgcmV0dXJuIGluc3RhbmNlXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJ1bkhvb2tzXG5cbmZ1bmN0aW9uIHJ1bkhvb2tzKGhvb2tzLCB0eXBlLCBlbCkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gaG9va3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaG9va3NbaV1bdHlwZV0gJiYgaG9va3NbaV1bdHlwZV0oZWwpXG4gIH1cbn1cbiIsInZhciBnZXQgPSByZXF1aXJlKCcuL2dldC1lbGVtZW50JylcblxubW9kdWxlLmV4cG9ydHMgPSBzZXRDaGlsZHJlblxuXG5mdW5jdGlvbiBzZXRDaGlsZHJlbihyb290LCBub2Rlcykge1xuICB2YXIgcHJldiA9IG51bGxcbiAgICAsIGVsXG5cbiAgZm9yKHZhciBpID0gbm9kZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICBlbCA9IGdldChub2Rlc1tpXSlcbiAgICByb290Lmluc2VydEJlZm9yZShlbCwgcHJldilcbiAgICBwcmV2ID0gZWxcbiAgfVxuXG4gIHdoaWxlKChlbCA9IHJvb3QuZmlyc3RDaGlsZCkgIT09IHByZXYpIHtcbiAgICByb290LnJlbW92ZUNoaWxkKGVsKVxuICB9XG59XG4iLCJ2YXIgc2V0Q2hpbGRyZW4gPSByZXF1aXJlKCcuLi9zZXQtY2hpbGRyZW4nKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNoaWxkcmVuXG5cbmZ1bmN0aW9uIGNoaWxkcmVuKGVsLCBnZXR0ZXIsIGxvb2t1cHMpIHtcbiAgdmFyIGN1cnJlbnQgPSBbXVxuXG4gIGVsLmlubmVySFRNTCA9ICcnXG4gIHRoaXMuYmF0Y2guYWRkKGxvb2t1cHMub24oZ2V0dGVyLCB1cGRhdGUuYmluZCh0aGlzKSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIHZhciBub2RlcyA9IChBcnJheS5pc0FycmF5KHZhbCkgPyB2YWwgOiBbdmFsXSkuZmlsdGVyKGlzX25vZGUpXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpZihub2Rlc1tpXSAhPT0gY3VycmVudFtpXSkge1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGkgPT09IG5vZGVzLmxlbmd0aCA9PT0gY3VycmVudC5sZW5ndGgpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGN1cnJlbnQgPSBub2Rlc1xuICAgIHNldENoaWxkcmVuLmNhbGwodGhpcywgZWwsIGN1cnJlbnQpXG4gIH1cbn1cblxuZnVuY3Rpb24gaXNfbm9kZShlbCkge1xuICByZXR1cm4gZWwgJiYgZWwubm9kZVR5cGVcbn1cbiIsInZhciBzZXRDaGlsZHJlbiA9IHJlcXVpcmUoJy4uL3NldC1jaGlsZHJlbicpXG52YXIgZm9yUmVnZXhwID0gL14oLio/KVxccytpblxccysoLiokKS9cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JIYW5kbGVyXG5cbmZ1bmN0aW9uIGZvckhhbmRsZXIocm9vdCwgYXJncywgbG9va3Vwcykge1xuICB2YXIgdGVtcGxhdGUgPSByb290LmNsb25lTm9kZSh0cnVlKVxuICB2YXIgcGFydHMgPSBhcmdzLm1hdGNoKGZvclJlZ2V4cClcbiAgdmFyIGRvbU5vZGVzID0gW11cbiAgdmFyIGNoaWxkcmVuID0gW11cbiAgdmFyIGFsdHIgPSB0aGlzXG4gIHZhciBpdGVtcyA9IFtdXG5cbiAgaWYoIXBhcnRzKSB7XG4gICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgYGZvcmAgdGFnOiAnICsgYXJncylcbiAgfVxuXG4gIHZhciBydW5VcGRhdGVzID0gYWx0ci5iYXRjaC5hZGQocnVuRG9tVXBkYXRlcylcblxuICByb290LmlubmVySFRNTCA9ICcnXG5cbiAgdmFyIHVuaXF1ZSA9IHBhcnRzWzFdLnNwbGl0KCc6JylbMV1cbiAgdmFyIHByb3AgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzBdXG4gIHZhciBrZXkgPSBwYXJ0c1syXVxuXG5cbiAgbG9va3Vwcy5vbihrZXksIHVwZGF0ZSlcblxuICByZXR1cm4gYWx0ci5tZXJnZUhvb2tzKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmbGF0dGVuKGNoaWxkcmVuKVxuICB9KVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUNoaWxkcmVuKGRhdGEpIHtcbiAgICB2YXIgaXRlbURhdGFcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGl0ZW1EYXRhID0gT2JqZWN0LmNyZWF0ZShkYXRhKVxuICAgICAgaXRlbURhdGFbcHJvcF0gPSBpdGVtc1tpXVxuICAgICAgaXRlbURhdGFbJyRpbmRleCddID0gaVxuICAgICAgY2hpbGRyZW5baV0ubG9va3Vwcy51cGRhdGUoaXRlbURhdGEpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKG5ld0l0ZW1zKSB7XG4gICAgaWYoIUFycmF5LmlzQXJyYXkobmV3SXRlbXMpKSB7XG4gICAgICBuZXdJdGVtcyA9IFtdXG4gICAgfVxuXG4gICAgdmFyIG5ld0NoaWxkcmVuID0gbmV3IEFycmF5KG5ld0l0ZW1zLmxlbmd0aClcbiAgICB2YXIgcmVtb3ZlZCA9IFtdXG4gICAgdmFyIG1hdGNoZWQgPSB7fVxuICAgIHZhciBhZGRlZCA9IFtdXG4gICAgdmFyIGluZGV4XG5cbiAgICBkb21Ob2RlcyA9IFtdXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbmV3SXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpbmRleCA9IGZpbmRJbmRleChpdGVtcywgbmV3SXRlbXNbaV0sIHVuaXF1ZSlcblxuICAgICAgaWYoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld0NoaWxkcmVuW2ldID0gY2hpbGRyZW5baW5kZXhdXG4gICAgICAgIGl0ZW1zW2luZGV4XSA9IGNoaWxkcmVuW2luZGV4XSA9IG1hdGNoZWRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFkZGVkLnB1c2gobmV3Q2hpbGRyZW5baV0gPSBtYWtlQ2hpbGQoKSlcbiAgICAgIH1cblxuICAgICAgZG9tTm9kZXMgPSBkb21Ob2Rlcy5jb25jYXQobmV3Q2hpbGRyZW5baV0ubm9kZXMpXG4gICAgfVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYoY2hpbGRyZW5baV0gIT09IG1hdGNoZWQpIHtcbiAgICAgICAgcmVtb3ZlZC5wdXNoKGNoaWxkcmVuW2ldKVxuICAgICAgfVxuICAgIH1cblxuICAgIGNoaWxkcmVuID0gbmV3Q2hpbGRyZW4uc2xpY2UoKVxuICAgIGl0ZW1zID0gbmV3SXRlbXMuc2xpY2UoKVxuICAgIHVwZGF0ZUNoaWxkcmVuKGxvb2t1cHMuc3RhdGUpXG4gICAgYWx0ci5kZXN0cm95KGZsYXR0ZW4ocmVtb3ZlZCksIHJvb3QsIHJ1blVwZGF0ZXMuYmluZChcbiAgICAgICAgYWx0clxuICAgICAgLCBkb21Ob2Rlc1xuICAgICAgLCBmbGF0dGVuKGFkZGVkKVxuICAgICkpXG4gIH1cblxuICBmdW5jdGlvbiBmaW5kSW5kZXgoaXRlbXMsIGQsIHVuaXF1ZSkge1xuICAgIGlmKCF1bmlxdWUpIHtcbiAgICAgIHJldHVybiBpdGVtcy5pbmRleE9mKGQpXG4gICAgfVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGl0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYoaXRlbXNbaV1bdW5pcXVlXSA9PT0gZFt1bmlxdWVdKSB7XG4gICAgICAgIHJldHVybiBpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIC0xXG4gIH1cblxuICBmdW5jdGlvbiBtYWtlQ2hpbGQoKSB7XG4gICAgcmV0dXJuIGFsdHIuaW5pdE5vZGVzKHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKS5jaGlsZE5vZGVzKVxuICB9XG5cbiAgZnVuY3Rpb24gcnVuRG9tVXBkYXRlcyhjaGlsZHJlbiwgYWRkZWQpIHtcbiAgICBzZXRDaGlsZHJlbi5jYWxsKHRoaXMsIHJvb3QsIGNoaWxkcmVuKVxuICAgIGFsdHIucnVuSG9va3MoYWRkZWQsICdpbnNlcnQnLCByb290KVxuICB9XG59XG5cbmZ1bmN0aW9uIGZsYXR0ZW4obGlzdCkge1xuICByZXR1cm4gbGlzdC5yZWR1Y2UoZnVuY3Rpb24oYWxsLCBwYXJ0KSB7XG4gICAgcmV0dXJuIHBhcnQuaG9va3MgPyBhbGwuY29uY2F0KHBhcnQuaG9va3MpIDogYWxsXG4gIH0sIFtdKVxufSIsIm1vZHVsZS5leHBvcnRzID0gaHRtbFxuXG5mdW5jdGlvbiBodG1sKGVsLCBhY2Nlc3NvciwgbG9va3Vwcykge1xuICB0aGlzLmJhdGNoLmFkZChsb29rdXBzLm9uKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC5pbm5lckhUTUwgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG5cbiAgICBpZihlbC5nZXRBdHRyaWJ1dGUoJ2FsdHItcnVuLXNjcmlwdHMnKSkge1xuICAgICAgW10uZm9yRWFjaC5jYWxsKGVsLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgcnVuKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBydW4oc2NyaXB0KSB7XG4gIHZhciBmaXhlZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgLCBwYXJlbnQgPSBzY3JpcHQucGFyZW50Tm9kZVxuICAgICwgYXR0cnMgPSBzY3JpcHQuYXR0cmlidXRlc1xuICAgICwgc3JjXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGF0dHJzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGZpeGVkLnNldEF0dHJpYnV0ZShhdHRyc1tpXS5uYW1lLCBhdHRyc1tpXS52YWx1ZSlcbiAgfVxuXG4gIGZpeGVkLnRleHRDb250ZW50ID0gc2NyaXB0LnRleHRDb250ZW50XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoZml4ZWQsIHNjcmlwdClcbiAgcGFyZW50LnJlbW92ZUNoaWxkKHNjcmlwdClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaWZUYWdcblxuZnVuY3Rpb24gaWZUYWcoZWwsIGdldHRlciwgbG9va3VwcywgZGVjb3JhdG9ycykge1xuICB2YXIgcGxhY2Vob2xkZXIgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ2FsdHItaWYtcGxhY2Vob2xkZXInKVxuICB2YXIgY2hpbGRyZW4gPSB0aGlzLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzKVxuICB2YXIgYWxsID0gY2hpbGRyZW4uaG9va3MuY29uY2F0KGRlY29yYXRvcnMpXG4gIHZhciBsYXN0VmFsID0gbnVsbFxuICB2YXIgaGlkZGVuID0gbnVsbFxuICB2YXIgZmlyc3QgPSB0cnVlXG4gIHZhciBhbHRyID0gdGhpc1xuXG4gIHZhciB1cGRhdGUgPSB0aGlzLmJhdGNoLmFkZChmdW5jdGlvbihzaG93LCBvcmlnaW4pIHtcbiAgICBpZighaGlkZGVuICYmICFzaG93KSB7XG4gICAgICBlbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChwbGFjZWhvbGRlciwgZWwpXG4gICAgICBlbC5fYWx0clBsYWNlaG9sZGVyID0gcGxhY2Vob2xkZXJcbiAgICAgIGhpZGRlbiA9IHRydWVcbiAgICB9IGVsc2UgaWYoaGlkZGVuICYmIHNob3cpIHtcbiAgICAgIHBsYWNlaG9sZGVyLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGVsLCBwbGFjZWhvbGRlcilcbiAgICAgIGFsdHIucnVuSG9va3MoYWxsLCAnaW5zZXJ0Jywgb3JpZ2luKVxuICAgICAgZGVsZXRlIGVsLl9hbHRyUGxhY2Vob2xkZXJcbiAgICAgIGhpZGRlbiA9IGZhbHNlXG4gICAgfSBlbHNlIGlmKGZpcnN0KSB7XG4gICAgICBmaXJzdCA9IGZhbHNlXG4gICAgICBhbHRyLnJ1bkhvb2tzKGFsbCwgJ2luc2VydCcsIG9yaWdpbilcbiAgICB9XG4gIH0pXG5cbiAgbG9va3Vwcy5vbihnZXR0ZXIsIHRvZ2dsZSwgdHJ1ZSlcblxuICByZXR1cm4ge1xuICAgICAgaW5zZXJ0OiBpbnNlcnRcbiAgICAsIHJlbW92ZTogcmVtb3ZlXG4gICAgLCBkZXN0cm95OiBkZXN0cm95XG4gIH1cblxuICBmdW5jdGlvbiBkZXN0cm95KGVsKSB7XG4gICAgYWx0ci5ydW5Ib29rcyhjaGlsZHJlbi5ob29rcywgJ2Rlc3Ryb3knLCBlbClcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvZ2dsZSh2YWwpIHtcbiAgICBsYXN0VmFsID0gdmFsXG5cbiAgICBpZih2YWwpIHtcbiAgICAgIHVwZGF0ZSh0cnVlLCBlbClcbiAgICAgIGNoaWxkcmVuLmxvb2t1cHMudXBkYXRlKGxvb2t1cHMuc3RhdGUpXG4gICAgfSBlbHNlIHtcbiAgICAgIGFsdHIucmVtb3ZlKGFsbCwgZWwsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXBkYXRlKGZhbHNlLCBlbClcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5zZXJ0KGVsKSB7XG4gICAgaWYobGFzdFZhbCkge1xuICAgICAgdXBkYXRlKHRydWUsIGVsKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShlbCwgZG9uZSkge1xuICAgIGlmKGhpZGRlbikge1xuICAgICAgZG9uZSgpXG5cbiAgICAgIHJldHVybiB1cGRhdGUoZmFsc2UpXG4gICAgfVxuXG4gICAgYWx0ci5yZW1vdmUoY2hpbGRyZW4uaG9va3MsIGVsLCBmdW5jdGlvbigpIHtcbiAgICAgIHVwZGF0ZShmYWxzZSlcbiAgICAgIGRvbmUoKVxuICAgIH0pXG4gIH1cbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmNsdWRlXG5cbmZ1bmN0aW9uIGluY2x1ZGUoZWwsIGdldHRlciwgbG9va3Vwcykge1xuICB2YXIgcmVtb3ZlTGlzdGVuZXJzID0gW11cbiAgdmFyIGNoaWxkcmVuID0gbnVsbFxuICB2YXIgY29udGVudCA9ICcnXG4gIHZhciBhbHRyID0gdGhpc1xuXG4gIGxvb2t1cHMub24oZ2V0dGVyLCBzZXQpXG4gIGxvb2t1cHMub24oJ3RoaXMnLCB1cGRhdGUpXG5cbiAgcmV0dXJuIHtpbnNlcnQ6IGluc2VydCwgcmVtb3ZlOiByZW1vdmUsIGRlc3Ryb3k6IGRlc3Ryb3l9XG5cbiAgZnVuY3Rpb24gc2V0KGRhdGEpIHtcbiAgICBjb250ZW50ID0gdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnID8gZGF0YSA6ICcnXG4gICAgaWYoY2hpbGRyZW4pIHJlbW92ZShlbCwgaW5zZXJ0KVxuICB9XG5cbiAgZnVuY3Rpb24gaW5zZXJ0KCkge1xuICAgIGlmKGNoaWxkcmVuKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBlbC5pbm5lckhUTUwgPSBjb250ZW50XG4gICAgY2hpbGRyZW4gPSBhbHRyLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzLCBudWxsLCBsb29rdXBzLnN0YXRlKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGVsLCBkb25lKSB7XG4gICAgaWYoIWNoaWxkcmVuKSB7XG4gICAgICByZXR1cm4gZG9uZSgpXG4gICAgfVxuXG4gICAgaWYocmVtb3ZlTGlzdGVuZXJzLnB1c2goZG9uZSkgPiAxKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG51bGxcbiAgICByZW1vdmluZyA9IHRydWVcbiAgICBhbHRyLmRlc3Ryb3koY2hpbGRyZW4sIGVsLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsaXN0ZW5lclxuXG4gICAgICBpZighY2hpbGRyZW4pIHtcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gJydcbiAgICAgIH1cblxuICAgICAgd2hpbGUobGlzdGVuZXIgPSByZW1vdmVMaXN0ZW5lcnMucG9wKCkpIHtcbiAgICAgICAgbGlzdGVuZXIoKVxuICAgICAgfVxuICAgIH0pXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShzdGF0ZSkge1xuICAgIGNoaWxkcmVuICYmIGNoaWxkcmVuLmxvb2t1cHMudXBkYXRlKHN0YXRlKVxuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBsb29rdXBzLnJlbW92ZUxpc3RlbmVyKCd0aGlzJywgdXBkYXRlKVxuICAgIGxvb2t1cHMucmVtb3ZlTGlzdGVuZXJzKGdldHRlciwgc2V0KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHBsYWNlaG9sZGVyXG5cbmZ1bmN0aW9uIHBsYWNlaG9sZGVyKG9yaWdpbmFsLCBnZXR0ZXIsIGxvb2t1cHMpIHtcbiAgdmFyIGN1cnJlbnQgPSBvcmlnaW5hbFxuICAgICwgYWx0ciA9IHRoaXNcblxuICB0aGlzLmJhdGNoLmFkZChsb29rdXBzLm9uKGdldHRlciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgaWYoIXZhbCB8fCAhdmFsLm5vZGVOYW1lIHx8IHZhbCA9PT0gY3VycmVudCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY3VycmVudC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZCh2YWwsIGN1cnJlbnQpXG4gICAgb3JpZ2luYWwuX2FsdHJQbGFjZWhvbGRlciA9IHZhbFxuICAgIGN1cnJlbnQgPSB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByYXcoKSB7fVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZXh0XG5cbmZ1bmN0aW9uIHRleHQoZWwsIGdldHRlciwgbG9va3Vwcykge1xuICB0aGlzLmJhdGNoLmFkZChsb29rdXBzLm9uKGdldHRlciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gd2l0aFRhZ1xuXG5mdW5jdGlvbiB3aXRoVGFnKGVsLCBnZXR0ZXIsIGxvb2t1cHMpIHtcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcylcbiAgICAsIHBhcnRzID0gZ2V0dGVyLnNwbGl0KCcgYXMgJylcblxuICBsb29rdXBzLm9uKHBhcnRzWzBdLCB1cGRhdGUpXG5cbiAgcmV0dXJuIGNoaWxkcmVuLmhvb2tzXG5cbiAgZnVuY3Rpb24gdXBkYXRlKF92YWwpIHtcbiAgICB2YXIgdmFsID0gT2JqZWN0LmNyZWF0ZShsb29rdXBzLnN0YXRlKVxuXG4gICAgdmFsW3BhcnRzWzFdXSA9IF92YWxcbiAgICBjaGlsZHJlbi5sb29rdXBzLnVwZGF0ZSh2YWwpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdGVtcGxhdFN0cmluZ1xuXG5mdW5jdGlvbiB0ZW1wbGF0U3RyaW5nKHRlbXBsYXRlLCBjaGFuZ2UsIGxvb2t1cHMpIHtcbiAgaWYoIXRlbXBsYXRlLm1hdGNoKHRoaXMudGFnUmVnRXhwKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRlbXBsYXRlXG4gICAgLCBwYXJ0cyA9IFtdXG4gICAgLCBob29rcyA9IFtdXG4gICAgLCBpbmRleFxuICAgICwgbmV4dFxuXG4gIHdoaWxlKHJlbWFpbmluZyAmJiAobmV4dCA9IHJlbWFpbmluZy5tYXRjaCh0aGlzLnRhZ1JlZ0V4cCkpKSB7XG4gICAgaWYoaW5kZXggPSByZW1haW5pbmcuaW5kZXhPZihuZXh0WzBdKSkge1xuICAgICAgcGFydHMucHVzaChyZW1haW5pbmcuc2xpY2UoMCwgaW5kZXgpKVxuICAgIH1cblxuICAgIHBhcnRzLnB1c2goJycpXG4gICAgcmVtYWluaW5nID0gcmVtYWluaW5nLnNsaWNlKGluZGV4ICsgbmV4dFswXS5sZW5ndGgpXG4gICAgbG9va3Vwcy5vbihuZXh0WzFdLCBzZXRQYXJ0LmJpbmQodGhpcywgcGFydHMubGVuZ3RoIC0gMSkpXG4gIH1cblxuICBpZihyZW1haW5pbmcpIHtcbiAgICBzZXRQYXJ0KHBhcnRzLmxlbmd0aCwgcmVtYWluaW5nKVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGFydChpZHgsIHZhbCkge1xuICAgIHBhcnRzW2lkeF0gPSB2YWxcblxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbml0VGV4dE5vZGVcblxuZnVuY3Rpb24gaW5pdFRleHROb2RlKGVsLCBsb29rdXBzKSB7XG4gIHRoaXMudGVtcGxhdGVTdHJpbmcoXG4gICAgICBlbC50ZXh0Q29udGVudFxuICAgICwgdGhpcy5iYXRjaC5hZGQodXBkYXRlKVxuICAgICwgbG9va3Vwc1xuICApXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdG9TdHJpbmdcblxuZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gIHJldHVybiB0aGlzLnJvb3ROb2RlcygpLm1hcChmdW5jdGlvbihub2RlKSB7XG4gICAgc3dpdGNoKG5vZGUubm9kZVR5cGUpIHtcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFOlxuICAgICAgY2FzZSB0aGlzLmRvY3VtZW50LkNPTU1FTlRfTk9ERTogcmV0dXJuIGNsb25lLmNhbGwodGhpcywgbm9kZSlcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5URVhUX05PREU6IHJldHVybiBub2RlLnRleHRDb250ZW50XG4gICAgICBkZWZhdWx0OiByZXR1cm4gbm9kZS5vdXRlckhUTUxcbiAgICB9XG4gIH0sIHRoaXMpLmpvaW4oJycpXG5cbiAgZnVuY3Rpb24gY2xvbmUobm9kZSkge1xuICAgIHZhciB0ZW1wID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXG4gICAgdGVtcC5hcHBlbmRDaGlsZChub2RlLmNsb25lTm9kZSh0cnVlKSlcblxuICAgIHJldHVybiB0ZW1wLmlubmVySFRNTFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEJhdGNoXG5cbmZ1bmN0aW9uIEJhdGNoKHJlYWR5LCBhbGwpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgQmF0Y2gpKSB7XG4gICAgcmV0dXJuIG5ldyBCYXRjaChyZWFkeSwgYWxsKVxuICB9XG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5hbGwgPSBhbGxcbiAgdGhpcy5yZWFkeSA9IHJlYWR5XG4gIHRoaXMucXVldWQgPSBmYWxzZVxuICB0aGlzLnJ1biA9IHRoaXMucnVuLmJpbmQodGhpcylcbn1cblxuQmF0Y2gucHJvdG90eXBlLnF1ZXVlID0gcXVldWVcbkJhdGNoLnByb3RvdHlwZS5hZGQgPSBhZGRcbkJhdGNoLnByb3RvdHlwZS5ydW4gPSBydW5cblxuZnVuY3Rpb24gYWRkKGZuKSB7XG4gIHZhciBxdWV1ZWQgPSBmYWxzZVxuICAgICwgYmF0Y2ggPSB0aGlzXG4gICAgLCBzZWxmXG4gICAgLCBhcmdzXG5cbiAgcmV0dXJuIHF1ZXVlXG5cbiAgZnVuY3Rpb24gcXVldWUoKSB7XG4gICAgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHNlbGYgPSB0aGlzXG5cbiAgICBpZihxdWV1ZWQpIHtcbiAgICAgIHJldHVybiBiYXRjaC5hbGwgJiYgYmF0Y2gucmVhZHkoKVxuICAgIH1cblxuICAgIHF1ZXVlZCA9IHRydWVcbiAgICBiYXRjaC5xdWV1ZShydW4pXG4gIH1cblxuICBmdW5jdGlvbiBydW4oKSB7XG4gICAgcXVldWVkID0gZmFsc2VcbiAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXVlKGZuKSB7XG4gIHRoaXMuam9icy5wdXNoKGZuKVxuXG4gIGlmKHRoaXMuYWxsIHx8ICF0aGlzLnF1ZXVlZCkge1xuICAgIHRoaXMucXVldWVkID0gdHJ1ZVxuICAgIHRoaXMucmVhZHkodGhpcylcbiAgfVxufVxuXG5mdW5jdGlvbiBydW4oKSB7XG4gIHZhciBqb2JzID0gdGhpcy5qb2JzXG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5xdWV1ZWQgPSBmYWxzZVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBqb2JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGpvYnNbaV0oKVxuICB9XG5cbiAgcmV0dXJuICEham9icy5sZW5ndGhcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gRXhwcmVzc2lvblxyXG5cclxuZnVuY3Rpb24gRXhwcmVzc2lvbihwYXJzZWQsIGRlcHMsIHZhbHVlLCBoYW5kbGVyKSB7XHJcbiAgdGhpcy5kZXBlbmRlbnRzID0gW11cclxuICB0aGlzLmRlcHMgPSBkZXBzXHJcbiAgdGhpcy5wYXJzZWQgPSBwYXJzZWRcclxuICB0aGlzLmNoYW5nZWQgPSBmYWxzZVxyXG4gIHRoaXMucmVtb3ZhYmxlID0gdHJ1ZVxyXG4gIHRoaXMudmFsdWUgPSB2YWx1ZVxyXG4gIHRoaXMudXBkYXRlID0gdXBkYXRlLmJpbmQodGhpcylcclxuICB0aGlzLmhhbmRsZXIgPSBoYW5kbGVyXHJcblxyXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBkZXBzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xyXG4gICAgZGVwc1tpXS5kZXBlbmRlbnRzLnB1c2godGhpcylcclxuICB9XHJcbn1cclxuXHJcbkV4cHJlc3Npb24ucHJvdG90eXBlLmNoYW5nZSA9IGNoYW5nZVxyXG5FeHByZXNzaW9uLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcclxuXHJcbmZ1bmN0aW9uIGNoYW5nZSh2YWwpIHtcclxuICBpZih0aGlzLnZhbHVlID09PSB2YWwgJiYgKCF0aGlzLnZhbHVlIHx8IHR5cGVvZiB0aGlzLnZhbHVlICE9PSAnb2JqZWN0JykpIHtcclxuICAgIHJldHVyblxyXG4gIH1cclxuXHJcbiAgdGhpcy52YWx1ZSA9IHZhbFxyXG4gIHRoaXMuY2hhbmdlZCA9IHRydWVcclxuXHJcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuZGVwZW5kZW50cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcclxuICAgIHRoaXMuZGVwZW5kZW50c1tpXS51cGRhdGUoKVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlKCkge1xyXG4gIHZhciBhcmdzID0gbmV3IEFycmF5KHRoaXMuZGVwcy5sZW5ndGgpXHJcblxyXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmRlcHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XHJcbiAgICBhcmdzW2ldID0gdGhpcy5kZXBzW2ldLnZhbHVlXHJcbiAgfVxyXG5cclxuICB0aGlzLmhhbmRsZXIuYXBwbHkobnVsbCwgYXJncylcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGhhc2hcclxuXHJcbmZ1bmN0aW9uIGhhc2goc3RyKSB7XHJcbiAgdmFyIHZhbCA9IDBcclxuXHJcbiAgZm9yKHZhciBpID0gMCwgbGVuID0gc3RyLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICB2YWwgPSAoKHZhbCA8PCA1KSAtIHZhbCkgKyBzdHIuY2hhckNvZGVBdChpKVxyXG4gICAgdmFsIHw9IDBcclxuICB9XHJcblxyXG4gIHJldHVybiB2YWwudG9TdHJpbmcoKS5yZXBsYWNlKCctJywgJ18nKVxyXG59XHJcbiIsInZhciBFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJylcclxudmFyIHJlbW92ZSA9IHJlcXVpcmUoJy4vcmVtb3ZlJylcclxudmFyIHR5cGVzID0gcmVxdWlyZSgnLi90eXBlcycpXHJcbnZhciBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKVxyXG52YXIgc3BsaXQgPSByZXF1aXJlKCcuL3NwbGl0JylcclxudmFyIHdhdGNoID0gcmVxdWlyZSgnLi93YXRjaCcpXHJcbnZhciBoYXNoID0gcmVxdWlyZSgnLi9oYXNoJylcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGlydHlCaXRcclxuXHJcbmZ1bmN0aW9uIERpcnR5Qml0KHN0YXRlLCBvcHRpb25zKSB7XHJcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgRGlydHlCaXQpKSB7XHJcbiAgICByZXR1cm4gbmV3IERpcnR5Qml0KHN0YXRlLCBvcHRpb25zKVxyXG4gIH1cclxuXHJcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG5cclxuICB0aGlzLnBhcnRpYWxzID0ge31cclxuICB0aGlzLnN0YXRlID0gc3RhdGUgfHwge31cclxuICB0aGlzLmZpbHRlcnMgPSBPYmplY3QuY3JlYXRlKHRoaXMub3B0aW9ucy5maWx0ZXJzIHx8IG51bGwpXHJcbiAgdGhpcy5yb290S2V5ID0gdGhpcy5vcHRpb25zLnJvb3RLZXlcclxuXHJcbiAgdGhpcy5yb290RXhwcmVzc2lvbiA9IG5ldyBFeHByZXNzaW9uKCd0aGlzJywgW10sIHRoaXMuc3RhdGUpXHJcblxyXG4gIHRoaXMuZXhwcmVzc2lvbnMgPSB7fVxyXG4gIHRoaXMuaGFuZGxlcnMgPSB7fVxyXG4gIHRoaXMuaGFuZGxlckxpc3QgPSBbXVxyXG5cclxuICB0aGlzLmV4cHJlc3Npb25zWyd0aGlzJ10gPSB0aGlzLnJvb3RFeHByZXNzaW9uXHJcbiAgdGhpcy5yb290RXhwcmVzc2lvbi5yZW1vdmFibGUgPSBmYWxzZVxyXG5cclxuICBpZih0aGlzLnJvb3RLZXkpIHtcclxuICAgIHRoaXMuZXhwcmVzc2lvbnNbdGhpcy5yb290S2V5XSA9IHRoaXMucm9vdEV4cHJlc3Npb25cclxuICB9XHJcblxyXG4gIHRoaXMudXBkYXRpbmcgPSBmYWxzZVxyXG59XHJcblxyXG5EaXJ0eUJpdC5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSByZW1vdmVcclxuRGlydHlCaXQucHJvdG90eXBlLmFkZEZpbHRlciA9IGFkZEZpbHRlclxyXG5EaXJ0eUJpdC5wcm90b3R5cGUudXBkYXRlID0gdXBkYXRlXHJcbkRpcnR5Qml0LnByb3RvdHlwZS5yZXBvcnQgPSByZXBvcnRcclxuRGlydHlCaXQucHJvdG90eXBlLnR5cGVzID0gdHlwZXNcclxuRGlydHlCaXQucHJvdG90eXBlLnNwbGl0ID0gc3BsaXRcclxuRGlydHlCaXQucHJvdG90eXBlLnBhcnNlID0gcGFyc2VcclxuRGlydHlCaXQucHJvdG90eXBlLndhdGNoID0gd2F0Y2hcclxuRGlydHlCaXQucHJvdG90eXBlLmhhc2ggPSBoYXNoXHJcbkRpcnR5Qml0LnByb3RvdHlwZS50cmltID0gdHJpbVxyXG5EaXJ0eUJpdC5wcm90b3R5cGUub24gPSBvblxyXG5cclxuRGlydHlCaXQucGFyc2VkID0ge31cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZShzdGF0ZSkge1xyXG4gIHRoaXMuc3RhdGUgPSBzdGF0ZVxyXG4gIHRoaXMudXBkYXRpbmcgPSB0cnVlXHJcbiAgdGhpcy5yb290RXhwcmVzc2lvbi5jaGFuZ2Uoc3RhdGUpXHJcbiAgdGhpcy51cGRhdGluZyA9IGZhbHNlXHJcbiAgdGhpcy5yZXBvcnQoKVxyXG59XHJcblxyXG5mdW5jdGlvbiByZXBvcnQoKSB7XHJcbiAgdmFyIGV4cHJlc3Npb25cclxuICB2YXIgbG9va3VwXHJcblxyXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmhhbmRsZXJMaXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xyXG4gICAgbG9va3VwID0gdGhpcy5oYW5kbGVyTGlzdFtpXVxyXG4gICAgZXhwcmVzc2lvbiA9IHRoaXMuZXhwcmVzc2lvbnNbbG9va3VwXVxyXG5cclxuICAgIGlmKCFleHByZXNzaW9uLmNoYW5nZWQpIHtcclxuICAgICAgY29udGludWVcclxuICAgIH1cclxuXHJcbiAgICBmb3IodmFyIGogPSAwLCBsMiA9IHRoaXMuaGFuZGxlcnNbbG9va3VwXS5sZW5ndGg7IGogPCBsMjsgKytqKSB7XHJcbiAgICAgIHRoaXMuaGFuZGxlcnNbbG9va3VwXVtqXShleHByZXNzaW9uLnZhbHVlKVxyXG4gICAgfVxyXG5cclxuICAgIGV4cHJlc3Npb24uY2hhbmdlZCA9IGZhbHNlXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRGaWx0ZXIobmFtZSwgZmlsdGVyKSB7XHJcbiAgdGhpcy5maWx0ZXJzW25hbWVdID0gZmlsdGVyXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyaW0oc3RyKSB7XHJcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcclxufVxyXG5cclxuZnVuY3Rpb24gb24oX2xvb2t1cCwgaGFuZGxlcikge1xyXG4gIHZhciBsb29rdXAgPSB0aGlzLnRyaW0oX2xvb2t1cClcclxuXHJcbiAgaWYodGhpcy5oYW5kbGVyc1tsb29rdXBdKSB7XHJcbiAgICB0aGlzLmhhbmRsZXJzW2xvb2t1cF0ucHVzaChoYW5kbGVyKVxyXG5cclxuICAgIHJldHVybiBoYW5kbGVyKHRoaXMuZXhwcmVzc2lvbnNbbG9va3VwXS52YWx1ZSlcclxuICB9XHJcblxyXG4gIHRoaXMudXBkYXRpbmcgPSB0cnVlXHJcbiAgdGhpcy53YXRjaChsb29rdXApXHJcbiAgdGhpcy5oYW5kbGVyTGlzdC5wdXNoKGxvb2t1cClcclxuICB0aGlzLmhhbmRsZXJzW2xvb2t1cF0gPSBbaGFuZGxlcl1cclxuICB0aGlzLnVwZGF0aW5nID0gZmFsc2VcclxuICBoYW5kbGVyKHRoaXMuZXhwcmVzc2lvbnNbbG9va3VwXS52YWx1ZSlcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHBhcnNlXHJcblxyXG5mdW5jdGlvbiBwYXJzZShsb29rdXApIHtcclxuICB2YXIgdmFsXHJcblxyXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnR5cGVzLm9yZGVyLmxlbmd0aDsgaSA8IGw7ICsraSkge1xyXG4gICAgdmFsID0gdGhpcy50eXBlcy50eXBlc1t0aGlzLnR5cGVzLm9yZGVyW2ldXS5wYXJzZS5jYWxsKHRoaXMsIGxvb2t1cClcclxuXHJcbiAgICBpZih2YWwpIHtcclxuICAgICAgYnJlYWtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhbC50eXBlID0gdGhpcy50eXBlcy5vcmRlcltpXVxyXG4gIHZhbC5sb29rdXAgPSBsb29rdXBcclxuXHJcbiAgcmV0dXJuIHZhbFxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlXHJcblxyXG5mdW5jdGlvbiByZW1vdmUoX2xvb2t1cCwgaGFuZGxlcikge1xyXG4gIHZhciBsb29rdXAgPSB0aGlzLnRyaW0oX2xvb2t1cClcclxuICB2YXIgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzW2xvb2t1cF1cclxuXHJcbiAgaWYoIWhhbmRsZXJzKSB7XHJcbiAgICByZXR1cm5cclxuICB9XHJcblxyXG4gIHZhciBpbmRleCA9IGhhbmRsZXJzLmluZGV4T2YoaGFuZGxlcilcclxuXHJcbiAgaWYoaW5kZXggPCAwKSB7XHJcbiAgICByZXR1cm5cclxuICB9XHJcblxyXG4gIGhhbmRsZXJzLnNwbGljZShpbmRleCwgMSlcclxuXHJcbiAgaWYodGhpcy5oYW5kbGVyc1tsb29rdXBdLmxlbmd0aCkge1xyXG4gICAgcmV0dXJuXHJcbiAgfVxyXG5cclxuICBkZWxldGUgdGhpcy5oYW5kbGVyc1tsb29rdXBdXHJcbiAgdGhpcy5oYW5kbGVyTGlzdC5zcGxpY2UodGhpcy5oYW5kbGVyTGlzdC5pbmRleE9mKGxvb2t1cCksIDEpXHJcbiAgcmVtb3ZlRXhwcmVzc2lvbih0aGlzLCB0aGlzLmV4cHJlc3Npb25zW2xvb2t1cF0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUV4cHJlc3Npb24oc2VsZiwgZXhwcmVzc2lvbikge1xyXG4gIGlmKGV4cHJlc3Npb24uZGVwZW5kZW50cy5sZW5ndGggfHwgIWV4cHJlc3Npb24ucmVtb3ZhYmxlKSB7XHJcbiAgICByZXR1cm5cclxuICB9XHJcblxyXG4gIGRlbGV0ZSBzZWxmLmV4cHJlc3Npb25zW2V4cHJlc3Npb24ucGFyc2VkLmxvb2t1cF1cclxuXHJcbiAgZm9yKHZhciBpID0gMCwgbCA9IGV4cHJlc3Npb24uZGVwcy5sZW5ndGgsIGRlcDsgaSA8IGw7ICsraSkge1xyXG4gICAgZGVwID0gZXhwcmVzc2lvbi5kZXBzW2ldXHJcbiAgICBkZXAuZGVwZW5kZW50cy5zcGxpY2UoZGVwLmRlcGVuZGVudHMuaW5kZXhPZihleHByZXNzaW9uKSwgMSlcclxuICAgIHJlbW92ZUV4cHJlc3Npb24oc2VsZiwgZGVwKVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgZGVmYXVsdF9wYWlycyA9IFtcclxuICAgIFsnKCcsICcpJ11cclxuICAsIFsnWycsICddJ11cclxuICAsIFsnPycsICc6J11cclxuICAsIFsnXCInLCAnXCInLCB0cnVlXVxyXG4gICwgW1wiJ1wiLCBcIidcIiwgdHJ1ZV1cclxuXVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBzcGxpdFxyXG5tb2R1bGUuZXhwb3J0cy5wYWlycyA9IGRlZmF1bHRfcGFpcnNcclxuXHJcbmZ1bmN0aW9uIHNwbGl0KHBhcnRzLCBrZXksIGFsbCwgX3BhaXJzKSB7XHJcbiAgdmFyIHBhaXJzID0gX3BhaXJzIHx8IGRlZmF1bHRfcGFpcnNcclxuICAgICwgaW5TdHJpbmcgPSBmYWxzZVxyXG4gICAgLCBsYXllcnMgPSBbXVxyXG5cclxuICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XHJcbiAgICBpZighfnBhcnRzLmluZGV4T2Yoa2V5KSkge1xyXG4gICAgICBpID0gbFxyXG5cclxuICAgICAgYnJlYWtcclxuICAgIH1cclxuXHJcbiAgICBpZighbGF5ZXJzLmxlbmd0aCkge1xyXG4gICAgICBmb3IodmFyIGogPSAwLCBsMiA9IGtleS5sZW5ndGg7IGogPCBsMjsgKytqKSB7XHJcbiAgICAgICAgaWYocGFydHNbaSArIGpdICE9PSBrZXlbal0pIHtcclxuICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihqID09PSBrZXkubGVuZ3RoKSB7XHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmKGxheWVycy5sZW5ndGggJiYgbGF5ZXJzW2xheWVycy5sZW5ndGggLSAxXSA9PT0gcGFydHNbaV0pIHtcclxuICAgICAgaW5TdHJpbmcgPSBmYWxzZVxyXG4gICAgICBsYXllcnMucG9wKClcclxuXHJcbiAgICAgIGNvbnRpbnVlXHJcbiAgICB9XHJcblxyXG4gICAgaWYoaW5TdHJpbmcpIHtcclxuICAgICAgY29udGludWVcclxuICAgIH1cclxuXHJcbiAgICBmb3IodmFyIGogPSAwLCBsMiA9IHBhaXJzLmxlbmd0aDsgaiA8IGwyOyArK2opIHtcclxuICAgICAgaWYocGFydHNbaV0gPT09IHBhaXJzW2pdWzBdKSB7XHJcbiAgICAgICAgaWYocGFpcnNbal1bMl0pIHtcclxuICAgICAgICAgIGluU3RyaW5nID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGF5ZXJzLnB1c2gocGFpcnNbal1bMV0pXHJcblxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKGxheWVycy5sZW5ndGgpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoXHJcbiAgICAgICAgJ1VubWF0Y2hlZCBwYWlyIGluICcgKyBwYXJ0cyArICcuIGV4cGVjdGluZzogJyArIGxheWVycy5wb3AoKVxyXG4gICAgKVxyXG4gIH1cclxuXHJcbiAgaWYoaSA9PT0gcGFydHMubGVuZ3RoKSB7XHJcbiAgICByZXR1cm4gW3BhcnRzXVxyXG4gIH1cclxuXHJcbiAgdmFyIHJpZ2h0ID0gcGFydHMuc2xpY2UoaSArIGtleS5sZW5ndGgpXHJcbiAgICAsIGxlZnQgPSBwYXJ0cy5zbGljZSgwLCBpKVxyXG5cclxuICBpZighYWxsKSB7XHJcbiAgICByZXR1cm4gW2xlZnQsIHJpZ2h0XVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIFtsZWZ0XS5jb25jYXQoc3BsaXQocmlnaHQsIGtleSwgYWxsLCBwYWlycykpXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVcclxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxyXG5cclxudmFyIHRlc3RzID0gW11cclxudmFyIG9wcyA9IHt9XHJcblxyXG5hZGQoWyd8XFxcXHwnXSlcclxuYWRkKFsnJiYnXSlcclxuYWRkKFsnfCddKVxyXG5hZGQoWydeJ10pXHJcbmFkZChbJyYnXSlcclxuYWRkKFsnPT09JywgJyE9PScsICc9PScsICchPSddKVxyXG5hZGQoWyc+PScsICc8PScsICc+JywgJzwnLCAnIGluICcsICcgaW5zdGFuY2VvZiAnXSlcclxuLy8gYWRkKFsnPDwnLCAnPj4nLCAnPj4+J10pIC8vY29uZmxpY3Mgd2l0aCA8IGFuZCA+XHJcbmFkZChbJysnLCAnLSddKVxyXG5hZGQoWycqJywgJy8nLCAnJSddKVxyXG5cclxub3BzWydpbiddID0gdXBkYXRlSW5cclxub3BzWydpbnN0YW5jZW9mJ10gPSB1cGRhdGVJbnN0YW5jZW9mXHJcblxyXG5mdW5jdGlvbiBhZGQobGlzdCkge1xyXG4gIHRlc3RzLnB1c2gobmV3IFJlZ0V4cCgnXiguKz8pKFxcXFwnICsgbGlzdC5qb2luKCd8XFxcXCcpICsgJykoLispJCcpKVxyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZShsb29rdXApIHtcclxuICB2YXIgcGFydHNcclxuXHJcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRlc3RzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xyXG4gICAgcGFydHMgPSBsb29rdXAubWF0Y2godGVzdHNbaV0pXHJcblxyXG4gICAgaWYocGFydHMpIHtcclxuICAgICAgYnJlYWtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKCFwYXJ0cykge1xyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG5cclxuICByZXR1cm4ge2RlcHM6IFtwYXJ0c1sxXSwgcGFydHNbM11dLCBvcHRpb25zOiBwYXJ0c1syXX1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlKGNoYW5nZSwgb3ApIHtcclxuICBpZighb3BzW29wXSkge1xyXG4gICAgb3BzW29wXSA9IGNyZWF0ZU9wKG9wKVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG9wc1tvcF0uYmluZChudWxsLCBjaGFuZ2UpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU9wKG9wKSB7XHJcbiAgcmV0dXJuIEZ1bmN0aW9uKCdjaGFuZ2UsIGxlZnQsIHJpZ2h0JywgJ2NoYW5nZShsZWZ0ICcgKyBvcCArICcgcmlnaHQpJylcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlSW4obGVmdCwgcmlnaHQpIHtcclxuICByZXR1cm4gdHlwZW9mIHJpZ2h0ICE9PSAndW5kZWZpbmVkJyAmJiBsZWZ0IGluIHJpZ2h0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUluc3RhbmNlb2YobGVmdCwgcmlnaHQpIHtcclxuICByZXR1cm4gdHlwZW9mIHJpZ2h0ID09PSAnZnVuY3Rpb24nICYmIGxlZnQgaW5zdGFuY2VvZiByaWdodFxyXG59XHJcbiIsInZhciBoYXNfYnJhY2tldCA9IC9eLipcXFNcXFsuK1xcXSQvXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGJyYWNrZXRzXHJcbm1vZHVsZS5leHBvcnRzLnBhcnNlID0gcGFyc2VcclxuXHJcbmZ1bmN0aW9uIHBhcnNlKGxvb2t1cCkge1xyXG4gIGlmKCFoYXNfYnJhY2tldC50ZXN0KGxvb2t1cCkpIHtcclxuICAgIHJldHVybiBmYWxzZVxyXG4gIH1cclxuXHJcbiAgdmFyIHBhaXJzID0gdGhpcy5zcGxpdC5wYWlycy5tYXAoZnVuY3Rpb24ocGFpcikge1xyXG4gICAgcmV0dXJuIFtwYWlyWzFdLCBwYWlyWzBdLCBwYWlyWzJdXVxyXG4gIH0pXHJcblxyXG4gIHJldHVybiB7XHJcbiAgICAgIGRlcHM6IHRoaXMuc3BsaXQocmV2ZXJzZShsb29rdXAuc2xpY2UoMCwgLTEpKSwgJ1snLCBmYWxzZSwgcGFpcnMpXHJcbiAgICAgICAgLm1hcChyZXZlcnNlKVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmV2ZXJzZShzdHIpIHtcclxuICByZXR1cm4gc3RyLnNwbGl0KCcnKS5yZXZlcnNlKCkuam9pbignJylcclxufVxyXG5cclxuZnVuY3Rpb24gYnJhY2tldHMoY2hhbmdlKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKGlubmVyLCByb290KSB7XHJcbiAgICBpZihyb290ID09PSBudWxsIHx8IHJvb3QgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gY2hhbmdlKClcclxuICAgIH1cclxuXHJcbiAgICBjaGFuZ2Uocm9vdFtpbm5lcl0pXHJcbiAgfVxyXG59XHJcbiIsInZhciB2YWxpZF9wYXRoID0gL14oLiopXFwuKFteLlxcc10rKSQvXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVxyXG5tb2R1bGUuZXhwb3J0cy5wYXJzZSA9IHBhcnNlXHJcblxyXG5mdW5jdGlvbiBwYXJzZShsb29rdXApIHtcclxuICB2YXIgcGFydHMgPSBsb29rdXAubWF0Y2godmFsaWRfcGF0aClcclxuXHJcbiAgcmV0dXJuIHBhcnRzID9cclxuICAgIHtkZXBzOiBbcGFydHNbMV1dLCBvcHRpb25zOiBwYXJ0c1syXX0gOlxyXG4gICAge2RlcHM6IFsndGhpcyddLCBvcHRpb25zOiBsb29rdXB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZShjaGFuZ2UsIGtleSkge1xyXG4gIHJldHVybiBmdW5jdGlvbihvYmopIHtcclxuICAgIGlmKG9iaiA9PT0gbnVsbCB8fCBvYmogPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gY2hhbmdlKClcclxuICAgIH1cclxuXHJcbiAgICBjaGFuZ2Uob2JqW2tleV0pXHJcbiAgfVxyXG59XHJcbiIsInZhciBmaWx0ZXJfcmVnZXhwID0gL14oW15cXHMoXSspXFwoKC4qKVxcKSQvXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVxyXG5tb2R1bGUuZXhwb3J0cy5wYXJzZSA9IHBhcnNlXHJcblxyXG5mdW5jdGlvbiBwYXJzZShsb29rdXApIHtcclxuICB2YXIgcGFydHMgPSBsb29rdXAubWF0Y2goZmlsdGVyX3JlZ2V4cClcclxuXHJcbiAgaWYoIXBhcnRzKSB7XHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9XHJcblxyXG4gIHJldHVybiB7ZGVwczogdGhpcy5zcGxpdChwYXJ0c1syXSwgJywnLCB0cnVlKSwgb3B0aW9uczogcGFydHNbMV19XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZShjaGFuZ2UsIG5hbWUpIHtcclxuICByZXR1cm4gdGhpcy5maWx0ZXJzW25hbWVdKGNoYW5nZSkgfHwgZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdjb3VsZCBub3QgZmluZCBmaWx0ZXI6ICcgKyBuYW1lKVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgYnJhY2tldHMgPSByZXF1aXJlKCcuL2JyYWNrZXRzJylcclxudmFyIGRvdF9wYXRoID0gcmVxdWlyZSgnLi9kb3QtcGF0aCcpXHJcbnZhciBmaWx0ZXJzID0gcmVxdWlyZSgnLi9maWx0ZXJzJylcclxudmFyIHBhcnRpYWwgPSByZXF1aXJlKCcuL3BhcnRpYWwnKVxyXG52YXIgdGVybmFyeSA9IHJlcXVpcmUoJy4vdGVybmFyeScpXHJcbnZhciBwYXJlbnMgPSByZXF1aXJlKCcuL3BhcmVucycpXHJcbnZhciB2YWx1ZXMgPSByZXF1aXJlKCcuL3ZhbHVlcycpXHJcbnZhciBiaW5hcnkgPSByZXF1aXJlKCcuL2JpbmFyeScpXHJcbnZhciB1bmFyeSA9IHJlcXVpcmUoJy4vdW5hcnknKVxyXG52YXIgbGlzdCA9IHJlcXVpcmUoJy4vbGlzdCcpXHJcblxyXG5tb2R1bGUuZXhwb3J0cy5vcmRlciA9IFtcclxuICAgICd2YWx1ZXMnXHJcbiAgLCAnZmlsdGVycydcclxuICAsICdwYXJ0aWFsJ1xyXG4gICwgJ3BhcmVucydcclxuICAsICd0ZXJuYXJ5J1xyXG4gICwgJ2JpbmFyeSdcclxuICAsICd1bmFyeSdcclxuICAsICdicmFja2V0cydcclxuICAsICdsaXN0J1xyXG4gICwgJ2RvdF9wYXRoJ1xyXG5dXHJcblxyXG5tb2R1bGUuZXhwb3J0cy50eXBlcyA9IHtcclxuICAgIHZhbHVlczogdmFsdWVzXHJcbiAgLCBmaWx0ZXJzOiBmaWx0ZXJzXHJcbiAgLCBwYXJ0aWFsOiBwYXJ0aWFsXHJcbiAgLCBwYXJlbnM6IHBhcmVuc1xyXG4gICwgdGVybmFyeTogdGVybmFyeVxyXG4gICwgYmluYXJ5OiBiaW5hcnlcclxuICAsIHVuYXJ5OiB1bmFyeVxyXG4gICwgYnJhY2tldHM6IGJyYWNrZXRzXHJcbiAgLCBsaXN0OiBsaXN0XHJcbiAgLCBkb3RfcGF0aDogZG90X3BhdGhcclxufVxyXG4iLCJ2YXIgaXNfbGlzdCA9IC9eXFxbLitcXF0kL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBsaXN0XHJcbm1vZHVsZS5leHBvcnRzLnBhcnNlID0gcGFyc2VcclxuXHJcbmZ1bmN0aW9uIHBhcnNlKGxvb2t1cCkge1xyXG4gIGlmKCFpc19saXN0LnRlc3QobG9va3VwKSkge1xyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG5cclxuICByZXR1cm4ge2RlcHM6IHRoaXMuc3BsaXQobG9va3VwLnNsaWNlKDEsIC0xKSwgJywnLCB0cnVlKX1cclxufVxyXG5cclxuZnVuY3Rpb24gbGlzdChjaGFuZ2UpIHtcclxuICByZXR1cm4gZnVuY3Rpb24oKSB7XHJcbiAgICBjaGFuZ2UoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgcGFyZW5zX3JlZ2V4cCA9IC8oXnxbXjAtOWEtekEtWl8kXSlcXCgoLiopJC9cclxuXHJcbm1vZHVsZS5leHBvcnRzLnBhcnNlID0gcGFyc2VcclxuXHJcbmZ1bmN0aW9uIHBhcnNlKGxvb2t1cCkge1xyXG4gIHZhciBwYXJ0cyA9IGxvb2t1cC5tYXRjaChwYXJlbnNfcmVnZXhwKVxyXG5cclxuICBpZighcGFydHMpIHtcclxuICAgIHJldHVybiBmYWxzZVxyXG4gIH1cclxuXHJcbiAgdmFyIGJvZHkgPSB0aGlzLnNwbGl0KHBhcnRzWzJdLCAnKScpWzBdXHJcbiAgdmFyIGtleSA9ICd7e3BhcmVuXycgKyB0aGlzLmhhc2goYm9keSkgKyAnfX0nXHJcbiAgdmFyIHBhcnRpYWxzID0ge31cclxuXHJcbiAgcGFydGlhbHNba2V5XSA9IGJvZHlcclxuXHJcbiAgdmFyIHBhdGNoZWQgPSBsb29rdXAuc2xpY2UoMCwgbG9va3VwLmxhc3RJbmRleE9mKFtwYXJ0c1syXV0pIC0gMSkgK1xyXG4gICAga2V5ICsgcGFydHNbMl0uc2xpY2UoYm9keS5sZW5ndGggKyAxKVxyXG5cclxuICByZXR1cm4ge3Byb3h5OiBwYXRjaGVkLCBwYXJ0aWFsczogcGFydGlhbHN9XHJcbn1cclxuIiwidmFyIHJlZ2V4cCA9IC9eXFx7XFx7WyNfXFx3XStcXH1cXH0kL1xyXG5cclxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxyXG5cclxuZnVuY3Rpb24gcGFyc2UobG9va3VwKSB7XHJcbiAgcmV0dXJuIHJlZ2V4cC50ZXN0KGxvb2t1cCkgPyB7cHJveHk6IHRoaXMucGFydGlhbHNbbG9va3VwXX0gOiBmYWxzZVxyXG59XHJcbiIsInZhciB0ZXJuYXJ5X3JlZ2V4cCA9IC9eXFxzKiguKz8pXFxzKlxcPyguKilcXHMqJC9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlXHJcbm1vZHVsZS5leHBvcnRzLnBhcnNlID0gcGFyc2VcclxuXHJcbmZ1bmN0aW9uIHBhcnNlKGxvb2t1cCkge1xyXG4gIHZhciBwYXJ0cyA9IGxvb2t1cC5tYXRjaCh0ZXJuYXJ5X3JlZ2V4cClcclxuXHJcbiAgaWYoIXBhcnRzKSB7XHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9XHJcblxyXG4gIHZhciByZXN0ID0gdGhpcy5zcGxpdChwYXJ0c1syXSwgJzonKVxyXG5cclxuICBpZihyZXN0Lmxlbmd0aCAhPT0gMikge1xyXG4gICAgY29uc29sZS5lcnJvcignVW5tYXRjaGVkIHRlcm5hcnkgaW46ICcgKyBsb29rdXApXHJcbiAgfVxyXG5cclxuICByZXR1cm4ge2RlcHM6IFtwYXJ0c1sxXSwgcmVzdFswXSwgcmVzdFsxXV19XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZShjaGFuZ2UpIHtcclxuICByZXR1cm4gZnVuY3Rpb24ob2ssIGxlZnQsIHJpZ2h0KSB7XHJcbiAgICBjaGFuZ2Uob2sgPyBsZWZ0IDogcmlnaHQpXHJcbiAgfVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlXHJcbm1vZHVsZS5leHBvcnRzLnBhcnNlID0gcGFyc2VcclxuXHJcbnZhciB0ZXN0ID0gbmV3IFJlZ0V4cCgnXihcXFxcJyArIFsnIScsICcrJywgJy0nLCAnfiddLmpvaW4oJ3xcXFxcJykgKyAnKSguKykkJylcclxuXHJcbnZhciBvcHMgPSB7fVxyXG5cclxuZnVuY3Rpb24gcGFyc2UobG9va3VwKSB7XHJcbiAgdmFyIHBhcnRzID0gbG9va3VwLm1hdGNoKHRlc3QpXHJcblxyXG4gIGlmKCFwYXJ0cykge1xyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG5cclxuICByZXR1cm4ge2RlcHM6IFtwYXJ0c1syXV0sIG9wdGlvbnM6IHBhcnRzWzFdfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGUoY2hhbmdlLCBvcCkge1xyXG4gIGlmKCFvcHNbb3BdKSB7XHJcbiAgICBvcHNbb3BdID0gY3JlYXRlX29wKG9wKVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG9wc1tvcF0uYmluZChudWxsLCBjaGFuZ2UpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZV9vcChvcCkge1xyXG4gIHJldHVybiBGdW5jdGlvbignY2hhbmdlLCB2YWwnLCAnY2hhbmdlKCcgKyBvcCArICd2YWwpJylcclxufVxyXG4iLCJ2YXIgc3RyaW5nX3JlZ2V4cCA9IC9eKD86JygoPzpbXidcXFxcXXwoPzpcXFxcLikpKiknfFwiKCg/OlteXCJcXFxcXXwoPzpcXFxcLikpKilcIikkL1xyXG4gICwgbnVtYmVyX3JlZ2V4cCA9IC9eKFxcZCooPzpcXC5cXGQrKT8pJC9cclxuXHJcbm1vZHVsZS5leHBvcnRzLnBhcnNlID0gcGFyc2VcclxuXHJcbnZhciB2YWxzID0ge1xyXG4gICAgJ3RydWUnOiB0cnVlXHJcbiAgLCAnZmFsc2UnOiBmYWxzZVxyXG4gICwgJ251bGwnOiBudWxsXHJcbiAgLCAndW5kZWZpbmVkJzogdW5kZWZpbmVkXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlKGxvb2t1cCkge1xyXG4gIGlmKHZhbHMuaGFzT3duUHJvcGVydHkobG9va3VwKSkge1xyXG4gICAgcmV0dXJuIHt2YWx1ZTogdmFsc1tsb29rdXBdfVxyXG4gIH1cclxuXHJcbiAgaWYobnVtYmVyX3JlZ2V4cC50ZXN0KGxvb2t1cCkpIHtcclxuICAgIHJldHVybiB7dmFsdWU6ICtsb29rdXB9XHJcbiAgfVxyXG5cclxuICBpZihzdHJpbmdfcmVnZXhwLnRlc3QobG9va3VwKSkge1xyXG4gICAgcmV0dXJuIHt2YWx1ZTogbG9va3VwLnNsaWNlKDEsIC0xKX1cclxuICB9XHJcbn1cclxuIiwidmFyIEV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB3YXRjaFxyXG5cclxudmFyIHNlZW4gPSB7fVxyXG5cclxuZnVuY3Rpb24gd2F0Y2gobG9va3VwKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcblxyXG4gIHZhciBwYXJzZWQgPSBzZWVuW2xvb2t1cF0gfHwgKHNlZW5bbG9va3VwXSA9IHNlbGYucGFyc2UobG9va3VwKSlcclxuICB2YXIgcGFydGlhbHMgPSBwYXJzZWQucGFydGlhbHMgJiYgT2JqZWN0LmtleXMocGFyc2VkLnBhcnRpYWxzKVxyXG5cclxuICB2YXIgaGFuZGxlciA9IGNyZWF0ZUhhbmRsZXIuY2FsbChzZWxmLCBwYXJzZWQsIGNoYW5nZSlcclxuXHJcbiAgaWYocGFydGlhbHMpIHtcclxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0aWFscy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcclxuICAgICAgc2VsZi5wYXJ0aWFsc1twYXJ0aWFsc1tpXV0gPSBwYXJzZWQucGFydGlhbHNbcGFydGlhbHNbaV1dXHJcbiAgICAgIGdldERlcC5jYWxsKHNlbGYsIHNlbGYucGFydGlhbHNbcGFydGlhbHNbaV1dKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFyIGV4cHJlc3Npb24gPSBjcmVhdGVFeHByZXNzaW9uLmNhbGwoc2VsZiwgcGFyc2VkLCBoYW5kbGVyKVxyXG5cclxuICBzZWxmLmV4cHJlc3Npb25zW2xvb2t1cF0gPSBleHByZXNzaW9uXHJcblxyXG4gIGlmKGV4cHJlc3Npb24uaGFuZGxlcikge1xyXG4gICAgZXhwcmVzc2lvbi51cGRhdGUoKVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGV4cHJlc3Npb25cclxuXHJcbiAgZnVuY3Rpb24gY2hhbmdlKHZhbCkge1xyXG4gICAgaWYoc2VsZi51cGRhdGluZykge1xyXG4gICAgICByZXR1cm4gZXhwcmVzc2lvbi5jaGFuZ2UodmFsKVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGYudXBkYXRpbmcgPSB0cnVlXHJcbiAgICBleHByZXNzaW9uLmNoYW5nZSh2YWwpXHJcbiAgICBzZWxmLnVwZGF0aW5nID0gZmFsc2VcclxuICAgIHNlbGYucmVwb3J0KClcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUhhbmRsZXIocGFyc2VkLCBjaGFuZ2UpIHtcclxuICB2YXIgdHlwZSA9IHRoaXMudHlwZXMudHlwZXNbcGFyc2VkLnR5cGVdXHJcblxyXG4gIGlmKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICByZXR1cm4gdHlwZS5jYWxsKHRoaXMsIGNoYW5nZSwgcGFyc2VkLm9wdGlvbnMpXHJcbiAgfVxyXG5cclxuICByZXR1cm4gbnVsbFxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVFeHByZXNzaW9uKHBhcnNlZCwgaGFuZGxlcikge1xyXG4gIHZhciBkZXBzID0gcGFyc2VkLmRlcHMgPyBwYXJzZWQuZGVwcy5tYXAoZ2V0RGVwLmJpbmQodGhpcykpIDogW11cclxuICB2YXIgcHJveHkgPSBwYXJzZWQucHJveHkgJiYgZ2V0RGVwLmNhbGwodGhpcywgcGFyc2VkLnByb3h5KVxyXG4gIHZhciBleHByZXNzaW9uXHJcblxyXG4gIGlmKHByb3h5KSB7XHJcbiAgICByZXR1cm4gZXhwcmVzc2lvbiA9IG5ldyBFeHByZXNzaW9uKHBhcnNlZCwgW3Byb3h5XSwgcHJveHkudmFsdWUsIGVjaG8pXHJcbiAgfVxyXG5cclxuICByZXR1cm4gbmV3IEV4cHJlc3Npb24ocGFyc2VkLCBkZXBzLCBwYXJzZWQudmFsdWUsIGhhbmRsZXIpXHJcblxyXG4gIGZ1bmN0aW9uIGVjaG8odmFsKSB7XHJcbiAgICBleHByZXNzaW9uLmNoYW5nZSh2YWwpXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXREZXAoX2xvb2t1cCkge1xyXG4gIHZhciBsb29rdXAgPSB0aGlzLnRyaW0oX2xvb2t1cClcclxuXHJcbiAgcmV0dXJuIHRoaXMuZXhwcmVzc2lvbnNbbG9va3VwXSB8fCB0aGlzLndhdGNoKGxvb2t1cClcclxufVxyXG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgdW5kZWZpbmVkO1xuXG52YXIgaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXHRpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nIHx8IG9iai5ub2RlVHlwZSB8fCBvYmouc2V0SW50ZXJ2YWwpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1swXSxcblx0XHRpID0gMSxcblx0XHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRcdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICh0eXBlb2YgdGFyZ2V0ID09PSBcImJvb2xlYW5cIikge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fSBlbHNlIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB0YXJnZXQgIT09IFwiZnVuY3Rpb25cIiB8fCB0YXJnZXQgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKChvcHRpb25zID0gYXJndW1lbnRzW2ldKSAhPSBudWxsKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKG5hbWUgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbbmFtZV07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zW25hbWVdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKHRhcmdldCA9PT0gY29weSkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmIChkZWVwICYmIGNvcHkgJiYgKGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gQXJyYXkuaXNBcnJheShjb3B5KSkpKSB7XG5cdFx0XHRcdFx0aWYgKGNvcHlJc0FycmF5KSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGV4dGVuZChkZWVwLCBjbG9uZSwgY29weSk7XG5cblx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKGNvcHkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuIl19
