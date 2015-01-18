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
  extension.addHelper = altr.addHelper.bind(altr)
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

},{"extend":36}],2:[function(require,module,exports){
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

function altr(root, data, _options) {
  if(!(this instanceof altr)) {
    return new altr(root, data, _options)
  }

  var options = _options || {}

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
  this.lookups = dirtybit(data, {helpers: this.helpers})

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
  var lookups = _lookups || dirtybit(state, {helpers: this.helpers})
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
},{"./altr-extend":1,"./destroy":6,"./element-node":7,"./get-element":8,"./merge-hooks":10,"./raf":11,"./remove":12,"./render":13,"./run-hooks":14,"./template-string":25,"./text-node":26,"./to-string":27,"batch-queue":28,"dirtybit":32,"events":29,"extend":36}],3:[function(require,module,exports){
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
      if(decorator.update) lookups.removeListener(expression, update)

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
  lookups.on('this', updateChildren)

  return altr.mergeHooks(function() {
    return flatten(children)
  })

  function updateChildren(data) {
    var itemData

    for(var i = 0, l = children.length; i < l; ++i) {
      itemData = typeof data === 'object' ? Object.create(data) : {}
      itemData[prop] = items[i]
      itemData.$index = i
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

    altr.destroy(children, el, function() {
      var listener

      if(!children) {
        el.innerHTML = ''
      }

      while(listener = removeListeners.pop()) {
        listener()
      }
    })

    children = null
  }

  function update(state) {
    children && children.lookups.update(state)
  }

  function destroy() {
    lookups.removeListener('this', update)
    lookups.removeListener(getter, set)
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
module.exports = function(node) {
  var built = build(node, [])
  return {
    deps: built.deps,
    raw: node.value,
    body: built.body,
    compiled: compile(built.body),
  }
}

function build(node, deps) {
  if(node.type === 'group') {
    var group = build(node.data.expression, deps)
    return {
      deps: group.deps,
      body: '(' + group.body + ')'
    }
  }

  if(node.type === 'number' || node.type === 'string' || node.type === 'keyword') {
    return {body: node.value, deps: []}
  }

  if(node.type === 'unary') {
    var child = build(node.data.right, deps)
    return {body: node.data.op + '(' + child.body + ')', deps: child.deps}
  }

  if(node.type === 'label' || node.type === 'helper') {
    var newDeps = addDep(node, deps)
    return {body: 'arguments[' + newDeps.index + ']', deps: newDeps.deps}
  }

  if(node.type === 'member') {
    var left = build(node.data.left, deps)
    'this.lookup(' + left.body + ', "' + node.data.right.value + '")'
    return {
      body: 'this.lookup(' + left.body + ', "' + node.data.right.value + '")',
      deps: left.deps
    }
  }

  if(node.type === 'index') {
    var left = build(node.data.left, deps)
    var right = build(node.data.right, deps.concat(left.deps))
    return {
      body: 'this.lookup(' + left.body + ', ' + right.body + ')',
      deps: left.deps.concat(right.deps)
    }
  }

  if(node.type === 'binary') {
    var left = build(node.data.left, deps)
    var right = build(node.data.right, deps.concat(left.deps))
    return {
      body: left.body + ' ' + node.data.op + ' ' + right.body,
      deps: left.deps.concat(right.deps)
    }
  }

  if(node.type === 'ternary') {
    var left = build(node.data.left, deps)
    var middle = build(node.data.middle, deps)
    var right = build(node.data.right, deps.concat(left.deps))
    return {
      body: left.body + ' ? ' + middle.body + ' : ' + right.body,
      deps: left.deps.concat(middle.deps, right.deps)
    }
  }

  if(node.type === 'helper') {
    var newDeps = addDep(node, deps)
    return {body: 'arguments[' + newDeps.index + ']', deps: newDeps.deps}
  }

  if(node.type === 'array') {
    var allDeps = deps
    var newDeps = []
    var deps = []
    var body = '['
    var child
    for(var i = 0, l = node.data.children.length - 1; i < l; ++i) {
      child = build(node.data.children[i], allDeps)
      body += child.body + ', '
      newDeps = newDeps.concat(child.deps)
      allDeps = deps.concat(newDeps)
    }

    child = build(node.data.children[i], allDeps)

    return {
      body: body += child.body + ']',
      deps: newDeps.concat(child.deps)
    }
  }
}

function addDep(node, deps) {
  for(var i = 0, l = deps.length; i < l; ++i) {
    if(node.value === deps[i].value) break
  }

  if(i === l) return {index: i, deps: [node]}
  return {index: i, deps: []}
}

function compile(raw) {
  return new Function('', 'return (' + raw + ')').bind({
    lookup: lookup
  })
}

function lookup(root, prop) {
  return typeof root === 'null' || typeof root === 'undefined' ?
    undefined :
    root[prop]
}

},{}],31:[function(require,module,exports){
module.exports = Expression

function Expression(lookup, type, update, value) {
  this.dependents = []
  this.deps = []
  this.lookup = lookup
  this.type = type
  this.changed = false
  this.update = update
  this.depValues = []
  this.value = value
  this.removable = true
}

Expression.prototype.setValue = setValue
Expression.prototype.addDep = addDep

function setValue(value) {
  if(this.value === value && typeof value !== 'object') return

  this.value = value
  this.changed = true
  for(var i = 0, l = this.dependents.length; i < l; ++i) {
    this.dependents[i](value)
  }
}

function addDep(dep) {
  var i = this.deps.length
  this.deps[i] = dep
  var self = this
  dep.dependents.push(function(val) {
    self.depValues[i] = val
    self.update(self.depValues)
  })
  this.depValues[i] = dep.value
}

},{}],32:[function(require,module,exports){
var Expression = require('./expression')
var remove = require('./remove')
var parse = require('./parse')
var watch = require('./watch')

module.exports = DirtyBit

function DirtyBit(state, options) {
  if(!(this instanceof DirtyBit)) {
    return new DirtyBit(state, options)
  }

  this.options = options || {}

  this.state = state || {}
  this.helpers = Object.create(this.options.helpers || null)
  this.values = {}
  this.watched = []
  this.expressions = {
    list: [],
    map: {}
  }

  this.handlers = {}
  this.always = {}
  this.updating = false

  this.rootKey = this.options.rootKey

  this.rootExpression = new Expression('this', 'root', null, this.state)
  this.expressions.map.this = this.rootExpression
  this.rootExpression.removable = false


  if(this.rootKey) {
    this.expressions[this.rootKey] = this.rootExpression
  }
}

DirtyBit.prototype.removeListener = remove
DirtyBit.prototype.addHelper = addHelper
DirtyBit.prototype.update = update
DirtyBit.prototype.report = report
DirtyBit.prototype.parse = parse
DirtyBit.prototype.watch = watch
DirtyBit.prototype.on = on

DirtyBit.parsed = {}

function update(state) {
  this.state = state
  this.updating = true
  for(var i = 0, l = this.watched.length; i < l; ++i) {
    this.watched[i].update()
  }
  this.updating = false
  this.report()
}

function report() {
  var lookups = Object.keys(this.handlers)

  for(var i = 0, l = lookups.length; i < l; ++i) {
    var expression = this.expressions.map[lookups[i]]
    var handlers = this.handlers[lookups[i]].always
    for(var j = 0, l2 = handlers.length; j < l2; ++j) {
      handlers[j](expression.value)
    }
    if(!expression.changed) continue
    handlers = this.handlers[lookups[i]].update
    for(var j = 0, l2 = handlers.length; j < l2; ++j) {
      handlers[j](expression.value)
    }

    expression.changed = false
  }
}

function addHelper(name, helper) {
  this.helpers[name] = helper
}

function on(lookup, handler, always) {
  var exp = this.expressions.map[lookup]
  if(!exp) {
    this.updating = true
    exp = this.watch(lookup)
    this.updating = false
  }

  if(!this.handlers[lookup]) {
    this.handlers[lookup] = {
      always: [],
      update: [],
    }
  }

  if(always) {
    this.handlers[lookup].always.push(handler)
  } else {
    this.handlers[lookup].update.push(handler)
  }
  handler(exp.value)
  return this
}

},{"./expression":31,"./parse":33,"./remove":34,"./watch":35}],33:[function(require,module,exports){
var types = [group, array, keyword, number, string, label, unary]
var continuations = [helper, member, index, binary, ternary]
var keywords = ['true', 'false', 'null', 'undefined']
var keywordValues = [true, false, null, undefined]
var unaryOperators = ['!', '+', '-', '~', 'void', 'instanceof']
var whitesapce = ' \xA0\uFEFF\f\n\r\t\v​\u00a0\u1680​\u180e\u2000​\u2001\u2002​\u2003\u2004\u2005\u2006​\u2007\u2008​\u2009\u200a​\u2028\u2029​\u202f\u205f​\u3000'.split('')
var reservedCharacters = whitesapce.concat('(){}[]|&^=><+-*%/\\!@#\'"~.,?:`'.split(''))
var boundary = whitesapce.concat(['('])
var binaryOperators = {
  '%': 5,
  '/': 5,
  '*': 5,
  '-': 6,
  '+': 6,
  '>>': 7,
  '<<': 7,
  '>>>': 7,
  '<': 8,
  '>': 8,
  '<=': 8,
  '>=': 8,
  instanceof: 8,
  in: 8,
  '!=': 9,
  '==': 9,
  '!==': 9,
  '===': 9,
  '&': 10,
  '|': 11,
  '^': 12,
  '&&': 13,
  '||': 14
}

var sortedBinaryOperators = Object.keys(binaryOperators).sort(function(l, r) {
  return l.length < r.length ? 1 : -1
})

module.exports.parse = parse

function parse(str) {
  return trim(str, expression, 0)
}

function expression(str, start, end) {
  if(!str || !str[start]) return null
  for(var i = 0, l = types.length; i < l; ++i) {
    var node = types[i](str, start, end)
    if(node) break
  }

  if(!node) {
    throw new Error(
      'Unexpected token: ' + str[start] + ' in "' + str.slice(start, 20) + '"'
    )
  }

  var cur = node.range[1]
  while(whitesapce.indexOf(str[cur]) !== -1) cur = cur + 1

  return end.indexOf(str[cur]) !== -1 ? node : continueExpression(str, node, end)
}

function continueExpression(str, node, end) {
  var start = node.range[1]
  while(str[start] && end.indexOf(str[start]) === -1) {
    node = trim(str, findContinuation, start, end)
    start = node.range[1]
    while(whitesapce.indexOf(str[start]) !== -1) start = start + 1
  }

  if(end.indexOf(str[start]) === -1) {
    throw new Error(
      'Expected to find token: ' + end
    )
  }

  return node

  function findContinuation(str, start, end) {
    for(var i = 0, l = continuations.length; i < l; ++i) {
      var continuation = continuations[i](node, str, start, end)
      if(continuation) break
    }

    if(!continuation) {
      throw new Error(
        'Unexpected token: ' + str[start] + ' in "' + str.slice(start, start + 20) + '"'
      )
    }

    return continuation
  }
}

function keyword(str, start) {
  for(var i = 0, l = keywords.length; i < l; ++i) {
    var word = keywords[i]
    for(var j = 0, l2 = word.length; j < l2; ++j) {
      if(str[start + j] !== word[j]) break
    }

    if(j === l2) break
  }

  if(i === l) return null

  return new Node(
    'keyword',
    [start, start + word.length],
    str,
    null,
    true,
    keywordValues[word]
  )
}

function string(str, start) {
  var open = str[start]
  if(open !== '"' && open !== '\'') return null
  var cur = start + 1
  var chr
  while((chr = str[cur]) && chr !== open) {
    if(str === '\\') ++cur
    cur = cur + 1
  }

  if(str[cur++] !== open) throw new Error('Expected string to be closed')
  return new Node(
    'string',
    [start, cur],
    str,
    null,
    true,
    str.slice(start + 1, cur - 1)
  )
}

function number(str, start) {
  var decimal = false
  var cur = start
  var chr
  while(chr = str[cur]) {
    if(chr === '.') {
      if(decimal) break
      decimal = true
      cur = cur + 1
      continue
    }
    if(chr < '0' || chr > '9') break
    cur = cur + 1
  }

  return cur - start ? new Node(
    'number',
    [start, cur],
    str,
    null,
    true,
    parseInt(str.slice(start, cur), 10)
  ) : null
}

function label(str, start) {
  var chr = str[start]
  if(chr < 0 || chr > 9 || reservedCharacters.indexOf(chr) !== -1) return null
  var cur = start + 1

  while(chr = str[cur]) {
    if(reservedCharacters.indexOf(chr) !== -1) break
    cur = cur + 1
  }

  return new Node('label', [start, cur], str, null)
}

function array(str, start) {
  if(str[start] !== '[') return null
  var cur = start + 1
  var children = []
  var next
  var ends = [',', ']']
  while(next = trim(str, expression, cur, ends)) {
    children.push(next)
    cur = next.range[1]
    while(ends.indexOf(str[cur]) === -1) cur = cur + 1
    if(str[cur] === ']') break
    cur = cur + 1
  }

  return new Node('array', [start, cur + 1], str, {
    children: children,
  })
}

function group(str, start) {
  if(str[start] !== '(') return null

  var node = trim(str, expression, start + 1, [')'])
  var end = node.range[1]
  while(whitesapce.indexOf(str[end]) !== -1) end = end + 1
  return new Node('group', [start, end + 1], str, {
    expression: node
  })
}

function helper(left, str, start, end) {
  if(left.type !== 'label' || str[start] !== '(') return
  var cur = start + 1
  var children = []
  var next
  var ends = [',', ')']
  while(next = trim(str, expression, cur, ends)) {
    children.push(next)
    cur = next.range[1]
    while(ends.indexOf(str[cur]) === -1) cur = cur + 1
    if(str[cur] === ')') break
    cur = cur + 1
  }

  cur = cur + 1

  return new Node('helper', [left.range[0], cur], str, {
    left: left,
    children: children,
  })
}

function member(left, str, start) {
  if(str[start] !== '.') return null
  var node = label(str, start + 1)

  if(!node) throw new Error('Expected Label')
  return new Node('member', [left.range[0], node.range[1]], str, {
    left: left,
    right: node,
  })
}

function index(left, str, start) {
  if(str[start] !== '[') return null
  var node = trim(str, expression, start + 1, [']'])
  var end = node.range[1] + 1
  while(whitesapce.indexOf(str[end]) !== -1) end = end + 1
  return new Node('index', [left.range[0], end], str, {
    left: left,
    right: node,
  })
}

function unary(str, start, end) {
  for(var i = 0, l = unaryOperators.length; i < l; ++i) {
    var op = unaryOperators[i]
    for(var j = 0, l2 = op.length; j < l2; ++j) {
      if(str[start + j] !== op[j]) break
    }

    if(j === l2) break
  }

  if(i === l) return null
  var len = op.length
  var next = str[start + len]
  if(len > 1 && boundary.indexOf(next) === '-1') return null
  var child = trim(str, expression, start + len, end)
  var node = new Node('unary', [start, child.range[1]], str, {
    op: op,
    right: child,
    presidence: 4
  })

  if(child.presidence && child.presidence > 4) {
    node.right = child.left
    child.left = node
    return child
  }

  return node
}

function binary(left, str, start, end) {
  for(var i = 0, l = sortedBinaryOperators.length; i < l; ++i) {
    var op = sortedBinaryOperators[i]
    for(var j = 0, l2 = op.length; j < l2; ++j) {
      if(str[start + j] !== op[j]) break
    }

    if(j === l2) break
  }

  if(i === l) return null
  if(op === 'in' || op === 'instanceof') {
    var next = str[start + op.length]
    if(boundary.indexOf(next) === -1) return null
  }

  var presidence = binaryOperators[op]
  var right = trim(str, expression, start + op.length, end)
  var node = new Node('binary', [left.range[0], right.range[1]], str, {
    op: op,
    left: left,
    right: right,
    presidence: presidence
  })

  if(right.presidence && right.presidence >= presidence) {
    node.right = right.left
    right.left = node
    return right
  }

  return node
}

function ternary(condition, str, start, end) {
  if(str[start] !== '?') return null
  var ok = trim(str, expression, start + 1, [':'])
  if(!ok) throw new Error('Expected token: ":"')
  var next = ok.range[1] + 1
  while(whitesapce.indexOf(str[next]) !== -1) next = next + 1
  var not = trim(str, expression, next + 1, end)

  return new Node('ternary', [condition.range[0], not.range[1]], str, {
    left: condition,
    middle: ok,
    right: not,
    presidence: 15
  })
}

function trim(str, parse, start, end) {
  while(chr = str[start]) {
    if(whitesapce.indexOf(chr) === -1) break
    start = start + 1
  }

  return parse(str, start, end || [undefined])
}

function Node(type, range, str, data, litteral, val) {
  this.type = type
  this.range = range
  this.value = str.slice(range[0], range[1])
  this.data = data
  this.litteral = !!litteral
  this.rawValue = val
}

},{}],34:[function(require,module,exports){
module.exports = remove

function remove(_lookup, handler) {
  if(!this.watch.seen[_lookup]) return
  var lookup = this.watch.seen[_lookup].value
  var handlers = this.handlers[lookup]

  if(!handlers) {
    return
  }

  var index
  if((index = handlers.update.indexOf(handler)) !== -1) {
    handlers.update.splice(index, 1)
  }

  if((index = handlers.always.indexOf(handler)) !== -1) {
    handlers.always.splice(index, 1)
  }

  if(handlers.always.length || handlers.update.length) {
    return
  }

  delete this.handlers[lookup]
  removeExpression(this, this.expressions.map[lookup])
}

function removeExpression(self, expression) {
  if(expression.dependents.length || !expression.removable) {
    return
  }


  delete self.expressions.map[expression.lookup]

  var list = expression.type === 'label' ? self.watched : self.expressions.list
  var index = list.indexOf(expression)

  if(index !== -1) {
    list.splice(index, 1)
  }

  for(var i = 0, l = expression.deps.length, dep; i < l; ++i) {
    dep = expression.deps[i]
    dep.dependents.splice(dep.dependents.indexOf(expression), 1)
    if(!self.handlers[dep.lookup]) removeExpression(self, dep)
  }
}

},{}],35:[function(require,module,exports){
var Expression = require('./expression')
var Parser = require('./parse')
var build = require('./build')

var seen = {}

module.exports = watch
module.exports.seen = seen

function watch(lookup) {
  var parsed = seen[lookup] || (seen[lookup] = Parser.parse(lookup))

  return watchNode.call(this, parsed)
}

function watchNode(node, parent) {
  var exp

  if(node.type === 'label') {
    exp = addLabel.call(this, node)
  } else if(node.type === 'helper') {
    exp = addHelper.call(this, node)
  } else {
    exp = addExpression.call(this, node)
  }

  if(parent) {
    parent.addDep(exp)
  }

  return exp
}

function addLabel(label, parent) {
  var self = this
  var key = label.value
  if(this.expressions.map[key]) {
    return this.expressions.map[key]
  }
  var exp = new Expression(key, 'label', lookup)
  this.watched.push(exp)
  this.expressions.map[key] = exp
  exp.update()
  if(parent) parent.addDep(exp)
  exp.changed = false

  return exp

  function lookup() {
    this.setValue(
      (self.state === null) || (typeof self.state === 'undefined') ?
      undefined :
      self.state[key]
    )
  }
}

function addExpression(node) {
  var lookup = node.value
  if(this.expressions.map[lookup]) {
    return this.expressions.map[lookup]
  }

  var built = build(node)

  var exp = new Expression(
    lookup,
    'expression',
    updateExpression(built.compiled)
  )

  this.expressions.map[lookup] = exp
  this.expressions.list.push(exp)
  addDeps.call(this, exp, built.deps)
  exp.update()
  exp.changed = false

  return exp
}

function addDeps(parent, deps) {
  for(var i = 0, l = deps.length; i < l; ++i) {
    if(deps[i].litteral) {
      parent.depValues[i] = deps[i].rawValue
      continue
    }

    watchNode.call(this, deps[i], parent)
  }
}

function addHelper(node) {
  var self = this
  var key = node.value
  var name = node.data.left.value
  if(this.expressions.map[key]) {
    return this.expressions.map[key]
  }
  var helper = this.helpers[name]
  if(!helper) throw new Error('could not find handler: ' + name)
  var update = helper(change)
  var exp = new Expression(key, 'helper', function(args) {
    update.apply(null, args)
  })
  this.expressions.map[key] = exp
  this.expressions.list.push(exp)
  addDeps.call(this, exp, node.data.children)
  update.apply(null, exp.depValues)
  exp.changed = false

  return exp

  function change(val) {
    if(self.updating) return exp.setValue(val)
    self.updating = true
    exp.setValue(val)
    self.updating = false
    self.report()
  }
}

function updateExpression(run) {
  return function() {
    this.setValue(run.apply(null, this.depValues))
  }
}

},{"./build":30,"./expression":31,"./parse":33}],36:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvYWx0ci1leHRlbmQuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvYWx0ci5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9hdHRyaWJ1dGVzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL2Jyb3dzZXIuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvZGVjb3JhdG9ycy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9kZXN0cm95LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL2VsZW1lbnQtbm9kZS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9nZXQtZWxlbWVudC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9tZXJnZS1ob29rcy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9yYWYuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvcmVtb3ZlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3JlbmRlci5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9ydW4taG9va3MuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvc2V0LWNoaWxkcmVuLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvY2hpbGRyZW4uanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvcGxhY2Vob2xkZXIuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9yYXcuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy90ZXh0LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3Mvd2l0aC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi90ZW1wbGF0ZS1zdHJpbmcuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGV4dC1ub2RlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RvLXN0cmluZy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9iYXRjaC1xdWV1ZS9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9idWlsZC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvZXhwcmVzc2lvbi5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvaW5kZXguanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3BhcnNlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9yZW1vdmUuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3dhdGNoLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2V4dGVuZC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0ckV4dGVuZFxuXG5mdW5jdGlvbiBhbHRyRXh0ZW5kKGJhc2UsIG9wdGlvbnMpIHtcbiAgdmFyIGJhc2VPcHRpb25zID0gZXh0ZW5kKHRydWUsIGJhc2UsIG9wdGlvbnMpXG4gIHZhciBhbHRyID0gdGhpc1xuXG4gIGV4dGVuc2lvbi5yZW5kZXIgPSBhbHRyLnJlbmRlci5iaW5kKGFsdHIsIGJhc2VPcHRpb25zKVxuICBleHRlbnNpb24uZXh0ZW5kID0gYWx0ci5leHRlbmQuYmluZChhbHRyKVxuICBleHRlbnNpb24uYWRkVGFnID0gYWx0ci5hZGRUYWcuYmluZChhbHRyKVxuICBleHRlbnNpb24uaW5jbHVkZSA9IGFsdHIuaW5jbHVkZS5iaW5kKGFsdHIpXG4gIGV4dGVuc2lvbi5hZGRIZWxwZXIgPSBhbHRyLmFkZEhlbHBlci5iaW5kKGFsdHIpXG4gIGV4dGVuc2lvbi5hZGREZWNvcmF0b3IgPSBhbHRyLmFkZERlY29yYXRvci5iaW5kKGFsdHIpXG5cbiAgcmV0dXJuIGV4dGVuc2lvblxuXG4gIGZ1bmN0aW9uIGV4dGVuc2lvbihyb290LCBzdGF0ZSwgb3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBzdGF0ZSwgZXh0ZW5kKFxuICAgICAgICB0cnVlXG4gICAgICAsIE9iamVjdC5jcmVhdGUoYmFzZU9wdGlvbnMpXG4gICAgICAsIG9wdGlvbnMgfHwge31cbiAgICApKVxuICB9XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcbnZhciBiYXRjaCA9IHJlcXVpcmUoJ2JhdGNoLXF1ZXVlJylcbnZhciBkaXJ0eWJpdCA9IHJlcXVpcmUoJ2RpcnR5Yml0JylcbnZhciBleHRlbmQgPSByZXF1aXJlKCdleHRlbmQnKVxuXG52YXIgdGVtcGxhdGVTdHJpbmcgPSByZXF1aXJlKCcuL3RlbXBsYXRlLXN0cmluZycpXG52YXIgZWxlbWVudE5vZGUgPSByZXF1aXJlKCcuL2VsZW1lbnQtbm9kZScpXG52YXIgbWVyZ2VIb29rcyA9IHJlcXVpcmUoJy4vbWVyZ2UtaG9va3MnKVxudmFyIGFsdHJFeHRlbmQgPSByZXF1aXJlKCcuL2FsdHItZXh0ZW5kJylcbnZhciB0ZXh0Tm9kZSA9IHJlcXVpcmUoJy4vdGV4dC1ub2RlJylcbnZhciB0b1N0cmluZyA9IHJlcXVpcmUoJy4vdG8tc3RyaW5nJylcbnZhciBydW5Ib29rcyA9IHJlcXVpcmUoJy4vcnVuLWhvb2tzJylcbnZhciBnZXRFbCA9IHJlcXVpcmUoJy4vZ2V0LWVsZW1lbnQnKVxudmFyIGRlc3Ryb3kgPSByZXF1aXJlKCcuL2Rlc3Ryb3knKVxudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJylcbnZhciByZW1vdmUgPSByZXF1aXJlKCcuL3JlbW92ZScpXG52YXIgcmFmID0gcmVxdWlyZSgnLi9yYWYnKVxuXG4vLyBkeW5hbWljIHJlcXVpcmUgc28gaXQgZG9lcyBub3QgbWFrZSBpdCBpbnRvIHRoZSBicm93c2VyaWZ5IGJ1bmRsZVxudmFyIGRvbU1vZHVsZSA9ICdtaWNyby1kb20nXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuXG5hbHRyLmhlbHBlcnMgPSB7fVxuYWx0ci5kZWNvcmF0b3JzID0ge31cblxuYWx0ci5yZW5kZXIgPSByZW5kZXJcbmFsdHIuYWRkVGFnID0gYWRkVGFnXG5hbHRyLmV4dGVuZCA9IGFsdHJFeHRlbmRcbmFsdHIuYWRkSGVscGVyID0gYWRkSGVscGVyXG5hbHRyLmFkZERlY29yYXRvciA9IGFkZERlY29yYXRvclxuXG5mdW5jdGlvbiBhbHRyKHJvb3QsIGRhdGEsIF9vcHRpb25zKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIGFsdHIpKSB7XG4gICAgcmV0dXJuIG5ldyBhbHRyKHJvb3QsIGRhdGEsIF9vcHRpb25zKVxuICB9XG5cbiAgdmFyIG9wdGlvbnMgPSBfb3B0aW9ucyB8fCB7fVxuXG4gIHRoaXMuaGVscGVycyA9IGV4dGVuZChcbiAgICAgIGZhbHNlXG4gICAgLCBPYmplY3QuY3JlYXRlKGFsdHIuaGVscGVycylcbiAgICAsIG9wdGlvbnMuaGVscGVycyB8fCB7fVxuICApXG5cbiAgdGhpcy5kZWNvcmF0b3JzID0gZXh0ZW5kKFxuICAgICAgZmFsc2VcbiAgICAsIE9iamVjdC5jcmVhdGUoYWx0ci5kZWNvcmF0b3JzKVxuICAgICwgb3B0aW9ucy5kZWNvcmF0b3JzIHx8IHt9XG4gIClcblxuICB0aGlzLnJvb3QgPSByb290XG4gIHRoaXMuc3luYyA9ICEhb3B0aW9ucy5zeW5jXG4gIHRoaXMudGFnUmVnRXhwID0gbWFrZVRhZ1JlZ0V4cChvcHRpb25zLmRlbGltaXRlcnMpXG4gIHRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvYyB8fCBnbG9iYWwuZG9jdW1lbnQgfHwgcmVxdWlyZShkb21Nb2R1bGUpLmRvY3VtZW50XG4gIHRoaXMubG9va3VwcyA9IGRpcnR5Yml0KGRhdGEsIHtoZWxwZXJzOiB0aGlzLmhlbHBlcnN9KVxuXG4gIHRoaXMuYmF0Y2ggPSBiYXRjaCgoZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuc3luYykge1xuICAgICAgcmFmKHRoaXMucnVuQmF0Y2guYmluZCh0aGlzKSlcbiAgICB9XG4gIH0pLmJpbmQodGhpcykpXG5cbiAgaWYoZ2xvYmFsLkJ1ZmZlciAmJiByb290IGluc3RhbmNlb2YgZ2xvYmFsLkJ1ZmZlcikge1xuICAgIHJvb3QgPSByb290LnRvU3RyaW5nKClcbiAgfVxuXG4gIGlmKHR5cGVvZiByb290ID09PSAnc3RyaW5nJykge1xuICAgIHZhciB0ZW1wID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSByb290XG4gICAgdGhpcy5yb290ID0gdGhpcy5kb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcblxuICAgIHdoaWxlKHRlbXAuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy5yb290LmFwcGVuZENoaWxkKHRlbXAuZmlyc3RDaGlsZClcbiAgICB9XG4gIH1cblxuICB0aGlzLmNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXModGhpcy5yb290Tm9kZXMoKSwgdGhpcy5sb29rdXBzKVxuICB0aGlzLnJ1bkhvb2tzKHRoaXMuY2hpbGRyZW4uaG9va3MsICdpbnNlcnQnLCBudWxsKVxuICB0aGlzLnJ1bkJhdGNoKClcbn1cblxuYWx0ci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVFLnByb3RvdHlwZSlcbmFsdHIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gYWx0clxuXG5hbHRyLnByb3RvdHlwZS50ZW1wbGF0ZVN0cmluZyA9IHRlbXBsYXRlU3RyaW5nXG5hbHRyLnByb3RvdHlwZS5hZGREZWNvcmF0b3IgPSBhZGREZWNvcmF0b3JcbmFsdHIucHJvdG90eXBlLm1lcmdlSG9va3MgPSBtZXJnZUhvb2tzXG5hbHRyLnByb3RvdHlwZS5pbml0Tm9kZXMgPSBpbml0Tm9kZXNcbmFsdHIucHJvdG90eXBlLnJvb3ROb2RlcyA9IHJvb3ROb2Rlc1xuYWx0ci5wcm90b3R5cGUuYWRkSGVscGVyID0gYWRkSGVscGVyXG5hbHRyLnByb3RvdHlwZS5ydW5CYXRjaCA9IHJ1bkJhdGNoXG5hbHRyLnByb3RvdHlwZS50b1N0cmluZyA9IHRvU3RyaW5nXG5hbHRyLnByb3RvdHlwZS5ydW5Ib29rcyA9IHJ1bkhvb2tzXG5hbHRyLnByb3RvdHlwZS5nZXRFbGVtZW50ID0gZ2V0RWxcbmFsdHIucHJvdG90eXBlLmRlc3Ryb3kgPSBkZXN0cm95XG5hbHRyLnByb3RvdHlwZS5yZW1vdmUgPSByZW1vdmVcbmFsdHIucHJvdG90eXBlLmludG8gPSBhcHBlbmRUb1xuYWx0ci5wcm90b3R5cGUudXBkYXRlID0gdXBkYXRlXG5hbHRyLnByb3RvdHlwZS50YWdMaXN0ID0gW11cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG52YXIgbm9kZV9oYW5kbGVycyA9IHt9XG5cbm5vZGVfaGFuZGxlcnNbMV0gPSBlbGVtZW50Tm9kZVxubm9kZV9oYW5kbGVyc1szXSA9IHRleHROb2RlXG5cbmZ1bmN0aW9uIHVwZGF0ZShkYXRhLCBzeW5jKSB7XG4gIHRoaXMuc3RhdGUgPSBkYXRhXG4gIHRoaXMubG9va3Vwcy51cGRhdGUoZGF0YSlcblxuICBpZihzeW5jIHx8IHRoaXMuc3luYykge1xuICAgIHRoaXMucnVuQmF0Y2goKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXROb2Rlcyhfbm9kZXMsIF9sb29rdXBzLCBzdGF0ZSkge1xuICB2YXIgYWx0ciA9IHRoaXNcbiAgdmFyIGxvb2t1cHMgPSBfbG9va3VwcyB8fCBkaXJ0eWJpdChzdGF0ZSwge2hlbHBlcnM6IHRoaXMuaGVscGVyc30pXG4gIHZhciBub2RlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKF9ub2RlcylcbiAgdmFyIGhvb2tzID0gbm9kZXMucmVkdWNlKGpvaW4sIFtdKS5maWx0ZXIoQm9vbGVhbilcblxuICByZXR1cm4ge2hvb2tzOiBob29rcywgbG9va3VwczogbG9va3Vwcywgbm9kZXM6IG5vZGVzfVxuXG4gIGZ1bmN0aW9uIGpvaW4obGlzdCwgbm9kZSkge1xuICAgIHZhciBob29rcyA9IGluaXROb2RlLmNhbGwoYWx0ciwgbG9va3Vwcywgbm9kZSlcblxuICAgIHJldHVybiBob29rcyA/IGxpc3QuY29uY2F0KGhvb2tzKSA6IGxpc3RcbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0Tm9kZShsb29rdXBzLCBlbCkge1xuICByZXR1cm4gbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV0gP1xuICAgIG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdLmNhbGwodGhpcywgZWwsIGxvb2t1cHMpIDpcbiAgICBlbC5jaGlsZE5vZGVzICYmIGVsLmNoaWxkTm9kZXMubGVuZ3RoID9cbiAgICB0aGlzLmluaXROb2Rlcyhsb29rdXBzLCBlbC5jaGlsZE5vZGVzKSA6XG4gICAgbnVsbFxufVxuXG5mdW5jdGlvbiByb290Tm9kZXMoKSB7XG4gIHJldHVybiB0aGlzLnJvb3Qubm9kZVR5cGUgPT09IHRoaXMuZG9jdW1lbnQuRE9DVU1FTlRfRlJBR01FTlRfTk9ERSA/XG4gICAgW10uc2xpY2UuY2FsbCh0aGlzLnJvb3QuY2hpbGROb2RlcykgOlxuICAgIFt0aGlzLnJvb3RdXG59XG5cbmZ1bmN0aW9uIGFkZEhlbHBlcihuYW1lLCBoZWxwZXIpIHtcbiAgdGhpcy5oZWxwZXJzW25hbWVdID0gaGVscGVyXG59XG5cbmZ1bmN0aW9uIGFkZFRhZyhhdHRyLCB0YWcpIHtcbiAgdGhpcy5wcm90b3R5cGUudGFnc1thdHRyXSA9IHRhZ1xuICB0aGlzLnByb3RvdHlwZS50YWdMaXN0LnB1c2goe1xuICAgICAgYXR0cjogYXR0clxuICAgICwgY29uc3RydWN0b3I6IHRhZ1xuICB9KVxufVxuXG5mdW5jdGlvbiBhcHBlbmRUbyhub2RlKSB7XG4gIHZhciByb290Tm9kZXMgPSB0aGlzLnJvb3ROb2RlcygpXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHJvb3ROb2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBub2RlLmFwcGVuZENoaWxkKGdldEVsKHJvb3ROb2Rlc1tpXSkpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkSGVscGVyKG5hbWUsIGZuKSB7XG4gIHJldHVybiB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBhZGREZWNvcmF0b3IobmFtZSwgZm4pIHtcbiAgcmV0dXJuIHRoaXMuZGVjb3JhdG9yc1tuYW1lXSA9IGZuXG59XG5cbmZ1bmN0aW9uIHJ1bkJhdGNoKCkge1xuICB0aGlzLmJhdGNoLnJ1bigpICYmIHRoaXMuZW1pdCgndXBkYXRlJywgdGhpcy5zdGF0ZSlcbn1cblxuZnVuY3Rpb24gbWFrZVRhZ1JlZ0V4cChfZGVsaW1pdGVycykge1xuICB2YXIgZGVsaW1pdGVycyA9IF9kZWxpbWl0ZXJzIHx8IFsne3snLCAnfX0nXVxuXG4gIHJldHVybiBuZXcgUmVnRXhwKGRlbGltaXRlcnNbMF0gKyAnXFxcXHMqKC4qPylcXFxccyonICsgZGVsaW1pdGVyc1sxXSlcbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cy5yYXcgPSByYXdBdHRyaWJ1dGVcbm1vZHVsZS5leHBvcnRzLmFsdHIgPSBhbHRyQXR0cmlidXRlXG5tb2R1bGUuZXhwb3J0cy5wcm9wID0gYWx0clByb3BlcnR5XG5cbmZ1bmN0aW9uIHJhd0F0dHJpYnV0ZShlbCwgYXR0ciwgbG9va3Vwcykge1xuICB0aGlzLnRlbXBsYXRlU3RyaW5nKFxuICAgICAgYXR0ci52YWx1ZVxuICAgICwgdGhpcy5iYXRjaC5hZGQoZWwuc2V0QXR0cmlidXRlLmJpbmQoZWwsIGF0dHIubmFtZSkpXG4gICAgLCBsb29rdXBzXG4gIClcbn1cblxuZnVuY3Rpb24gYWx0ckF0dHJpYnV0ZShlbCwgYXR0ciwgbG9va3Vwcykge1xuICB2YXIgbmFtZSA9IGF0dHIubmFtZS5zbGljZSgnYWx0ci1hdHRyLScubGVuZ3RoKVxuXG4gIGxvb2t1cHMub24oYXR0ci52YWx1ZSwgdGhpcy5iYXRjaC5hZGQodXBkYXRlKSlcbiAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgaWYoIXZhbCAmJiB2YWwgIT09ICcnICYmIHZhbCAhPT0gMCkge1xuICAgICAgcmV0dXJuIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKVxuICAgIH1cblxuICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCB2YWwpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWx0clByb3BlcnR5KGVsLCBhdHRyLCBsb29rdXBzKSB7XG4gIHZhciBuYW1lID0gYXR0ci5uYW1lLnNsaWNlKCdhbHRyLXByb3AtJy5sZW5ndGgpXG5cbiAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSlcbiAgbG9va3Vwcy5vbihhdHRyLnZhbHVlLCB0aGlzLmJhdGNoLmFkZCh1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbFtuYW1lXSA9IHZhbFxuICB9XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5hbHRyID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSBkZWNvcmF0b3JzXG5cbmZ1bmN0aW9uIGRlY29yYXRvcnMoZWwsIGF0dHJzLCBsb29rdXBzKSB7XG4gIHZhciBhbHRyID0gdGhpc1xuICB2YXIgaG9va3MgPSBbXVxuXG4gIHJldHVybiBhdHRycy5tYXAoY3JlYXRlRGVjb3JhdG9yKVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZURlY29yYXRvcihhdHRyKSB7XG4gICAgdmFyIGRlY29yYXRvciA9IGFsdHIuZGVjb3JhdG9yc1thdHRyLm5hbWVdLmNhbGwoYWx0ciwgZWwpXG4gICAgdmFyIGV4cHJlc3Npb24gPSAnWycgKyBhdHRyLnZhbHVlICsgJ10nXG5cbiAgICBpZighZGVjb3JhdG9yKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgaG9va3MgPSB7aW5zZXJ0OiBkZWNvcmF0b3IuaW5zZXJ0LCByZW1vdmU6IGRlY29yYXRvci5yZW1vdmV9XG5cbiAgICBpZihkZWNvcmF0b3IudXBkYXRlKSB7XG4gICAgICBsb29rdXBzLm9uKGV4cHJlc3Npb24sIHVwZGF0ZSlcbiAgICB9XG5cbiAgICBob29rcy5kZXN0cm95ID0gZGVzdHJveVxuXG4gICAgcmV0dXJuIGhvb2tzXG5cbiAgICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgaWYoZGVjb3JhdG9yLnVwZGF0ZSkgbG9va3Vwcy5yZW1vdmVMaXN0ZW5lcihleHByZXNzaW9uLCB1cGRhdGUpXG5cbiAgICAgIGlmKGRlY29yYXRvci5kZXN0cm95KSB7XG4gICAgICAgIGRlY29yYXRvci5kZXN0cm95KClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGUoYXJncykge1xuICAgICAgZGVjb3JhdG9yLnVwZGF0ZS5hcHBseShudWxsLCBhcmdzKVxuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBkZXN0cm95XG5cbmZ1bmN0aW9uIGRlc3Ryb3koY2hpbGRyZW4sIGVsLCBkb25lKSB7XG4gIHZhciBhbHRyID0gdGhpc1xuXG4gIGFsdHIucmVtb3ZlKGNoaWxkcmVuLCBlbCwgZnVuY3Rpb24oZWwpIHtcbiAgICBhbHRyLnJ1bkhvb2tzKGNoaWxkcmVuLCAnZGVzdHJveScsIGVsKVxuICAgIGRvbmUoKVxuICB9KVxufVxuIiwidmFyIGNyZWF0ZURlY29yYXRvcnMgPSByZXF1aXJlKCcuL2RlY29yYXRvcnMnKVxuICAsIGNyZWF0ZUF0dHIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnROb2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROb2RlKGVsLCBsb29rdXBzKSB7XG4gIHZhciBkZWNvcmF0b3JzID0gW11cbiAgdmFyIGFsdHIgPSB0aGlzXG4gIHZhciBhdHRyXG5cbiAgdmFyIGF0dHJzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwuYXR0cmlidXRlcylcbiAgdmFyIGRlY29yYXRvcnMgPSBbXVxuICB2YXIgYWx0cl90YWdzID0ge31cbiAgdmFyIHRhZ3MgPSB7fVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihhbHRyLnRhZ3NbYXR0cnNbaV0ubmFtZV0pIHtcbiAgICAgIGFsdHJfdGFnc1thdHRyc1tpXS5uYW1lXSA9IGF0dHJzW2ldLnZhbHVlXG4gICAgfSBlbHNlIGlmKGFsdHIuZGVjb3JhdG9yc1thdHRyc1tpXS5uYW1lXSkge1xuICAgICAgZGVjb3JhdG9ycy5wdXNoKGF0dHJzW2ldKVxuICAgIH0gZWxzZSBpZighYXR0cnNbaV0ubmFtZS5sYXN0SW5kZXhPZignYWx0ci1hdHRyLScsIDApKSB7XG4gICAgICBjcmVhdGVBdHRyLmFsdHIuY2FsbCh0aGlzLCBlbCwgYXR0cnNbaV0sIGxvb2t1cHMpXG4gICAgfSBlbHNlIGlmKCFhdHRyc1tpXS5uYW1lLmxhc3RJbmRleE9mKCdhbHRyLXByb3AtJywgMCkpIHtcbiAgICAgIGNyZWF0ZUF0dHIucHJvcC5jYWxsKHRoaXMsIGVsLCBhdHRyc1tpXSwgbG9va3VwcylcbiAgICB9IGVsc2Uge1xuICAgICAgY3JlYXRlQXR0ci5yYXcuY2FsbCh0aGlzLCBlbCwgYXR0cnNbaV0sIGxvb2t1cHMpXG4gICAgfVxuICB9XG5cbiAgdmFyIGhvb2tzID0gY3JlYXRlRGVjb3JhdG9ycy5jYWxsKGFsdHIsIGVsLCBkZWNvcmF0b3JzLCBsb29rdXBzKVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhbHRyLnRhZ0xpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYXR0ciA9IGFsdHJfdGFnc1thbHRyLnRhZ0xpc3RbaV0uYXR0cl0pIHtcbiAgICAgIHJldHVybiBob29rcy5jb25jYXQoW1xuICAgICAgICAgIGFsdHIudGFnTGlzdFtpXS5jb25zdHJ1Y3Rvci5jYWxsKGFsdHIsIGVsLCBhdHRyLCBsb29rdXBzLCBob29rcykgfHwge31cbiAgICAgIF0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhvb2tzLmNvbmNhdChhbHRyLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzLCBsb29rdXBzKS5ob29rcylcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZ2V0XG5cbmZ1bmN0aW9uIGdldChfZWwpIHtcbiAgdmFyIGVsID0gX2VsXG5cbiAgd2hpbGUoZWwgJiYgZWwuX2FsdHJQbGFjZWhvbGRlcikge1xuICAgIGVsID0gZWwuX2FsdHJQbGFjZWhvbGRlclxuXG4gICAgaWYoZWwgPT09IF9lbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdwbGFjZWhvbGRlciBjaXJjdWxhciByZWZmZXJlbmNlJylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZWxcbn1cbiIsInZhciBwbGFjZWhvbGRlciA9IHJlcXVpcmUoJy4vdGFncy9wbGFjZWhvbGRlcicpXG4gICwgY2hpbGRyZW5UYWcgPSByZXF1aXJlKCcuL3RhZ3MvY2hpbGRyZW4nKVxuICAsIGluY2x1ZGVUYWcgPSByZXF1aXJlKCcuL3RhZ3MvaW5jbHVkZScpXG4gICwgdGV4dFRhZyA9IHJlcXVpcmUoJy4vdGFncy90ZXh0JylcbiAgLCBodG1sVGFnID0gcmVxdWlyZSgnLi90YWdzL2h0bWwnKVxuICAsIHdpdGhUYWcgPSByZXF1aXJlKCcuL3RhZ3Mvd2l0aCcpXG4gICwgZm9yVGFnID0gcmVxdWlyZSgnLi90YWdzL2ZvcicpXG4gICwgcmF3VGFnID0gcmVxdWlyZSgnLi90YWdzL3JhdycpXG4gICwgaWZUYWcgPSByZXF1aXJlKCcuL3RhZ3MvaWYnKVxuICAsIGFsdHIgPSByZXF1aXJlKCcuL2FsdHInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcblxuYWx0ci5hZGRUYWcoJ2FsdHItY2hpbGRyZW4nLCBjaGlsZHJlblRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLXJlcGxhY2UnLCBwbGFjZWhvbGRlcilcbmFsdHIuYWRkVGFnKCdhbHRyLWluY2x1ZGUnLCBpbmNsdWRlVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItdGV4dCcsIHRleHRUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci1odG1sJywgaHRtbFRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLXdpdGgnLCB3aXRoVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItZm9yJywgZm9yVGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItcmF3JywgcmF3VGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItaWYnLCBpZlRhZylcbiIsIm1vZHVsZS5leHBvcnRzID0gbWVyZ2VcblxuZnVuY3Rpb24gbWVyZ2UoY2hpbGRyZW4pIHtcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgcmV0dXJuIHtcbiAgICAgIGluc2VydDogZWFjaC5iaW5kKG51bGwsICdpbnNlcnQnKVxuICAgICwgZGVzdHJveTogZWFjaC5iaW5kKG51bGwsICdkZXN0cm95JylcbiAgICAsIHJlbW92ZTogcmVtb3ZlXG4gIH1cblxuICBmdW5jdGlvbiBlYWNoKHR5cGUsIGVsKSB7XG4gICAgdmFyIG5vZGVzID0gY2hpbGRyZW4oKVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbm9kZXNbaV1bdHlwZV0gJiYgbm9kZXNbaV1bdHlwZV0oZWwpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGVsLCByZWFkeSkge1xuICAgIGFsdHIucmVtb3ZlKGNoaWxkcmVuKCksIGVsLCByZWFkeSlcbiAgfVxufSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG5cbmZ1bmN0aW9uIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICB2YXIgcmFmID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgdGltZW91dFxuXG4gIHJldHVybiByYWYoY2FsbGJhY2spXG5cbiAgZnVuY3Rpb24gdGltZW91dChjYWxsYmFjaykge1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApXG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlbW92ZVxuXG5mdW5jdGlvbiByZW1vdmUoaG9va3MsIGVsLCByZWFkeSkge1xuICB2YXIgcmVtYWluaW5nID0gaG9va3MubGVuZ3RoXG4gIHZhciBjID0gMFxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSByZW1haW5pbmc7IGkgPCBsOyBpKyspIHtcbiAgICBob29rc1tpXS5yZW1vdmUgPyBob29rc1tpXS5yZW1vdmUoZWwsIGRvbmUpIDogLS1yZW1haW5pbmdcbiAgfVxuXG4gIGlmKCFyZW1haW5pbmcpIHtcbiAgICByZWFkeSgpXG4gIH1cblxuICBmdW5jdGlvbiBkb25lKCkge1xuICAgIGlmKCEtLXJlbWFpbmluZykge1xuICAgICAgcmVtYWluaW5nID0gLTFcbiAgICAgIHJlYWR5KClcbiAgICB9XG4gIH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHJlbmRlclxuXG5mdW5jdGlvbiByZW5kZXIodGVtcGxhdGUsIHN0YXRlLCBlbCkge1xuICBpZih0aGlzLmluY2x1ZGVzW3RlbXBsYXRlXSkge1xuICAgIHRlbXBsYXRlID0gdGhpcy5pbmNsdWRlc1t0ZW1wbGF0ZV1cbiAgfVxuXG4gIHZhciBpbnN0YW5jZSA9IHRoaXModGVtcGxhdGUpXG5cbiAgaW5zdGFuY2UudXBkYXRlKHN0YXRlIHx8IHt9LCB0cnVlKVxuXG4gIGlmKGVsKSB7XG4gICAgaW5zdGFuY2UuaW50byhlbClcbiAgfVxuXG4gIHJldHVybiBpbnN0YW5jZVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBydW5Ib29rc1xuXG5mdW5jdGlvbiBydW5Ib29rcyhob29rcywgdHlwZSwgZWwpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IGhvb2tzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGhvb2tzW2ldW3R5cGVdICYmIGhvb2tzW2ldW3R5cGVdKGVsKVxuICB9XG59XG4iLCJ2YXIgZ2V0ID0gcmVxdWlyZSgnLi9nZXQtZWxlbWVudCcpXG5cbm1vZHVsZS5leHBvcnRzID0gc2V0Q2hpbGRyZW5cblxuZnVuY3Rpb24gc2V0Q2hpbGRyZW4ocm9vdCwgbm9kZXMpIHtcbiAgdmFyIHByZXYgPSBudWxsXG4gICAgLCBlbFxuXG4gIGZvcih2YXIgaSA9IG5vZGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgZWwgPSBnZXQobm9kZXNbaV0pXG4gICAgcm9vdC5pbnNlcnRCZWZvcmUoZWwsIHByZXYpXG4gICAgcHJldiA9IGVsXG4gIH1cblxuICB3aGlsZSgoZWwgPSByb290LmZpcnN0Q2hpbGQpICE9PSBwcmV2KSB7XG4gICAgcm9vdC5yZW1vdmVDaGlsZChlbClcbiAgfVxufVxuIiwidmFyIHNldENoaWxkcmVuID0gcmVxdWlyZSgnLi4vc2V0LWNoaWxkcmVuJylcblxubW9kdWxlLmV4cG9ydHMgPSBjaGlsZHJlblxuXG5mdW5jdGlvbiBjaGlsZHJlbihlbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciBjdXJyZW50ID0gW11cblxuICBlbC5pbm5lckhUTUwgPSAnJ1xuICB0aGlzLmJhdGNoLmFkZChsb29rdXBzLm9uKGdldHRlciwgdXBkYXRlLmJpbmQodGhpcykpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICB2YXIgbm9kZXMgPSAoQXJyYXkuaXNBcnJheSh2YWwpID8gdmFsIDogW3ZhbF0pLmZpbHRlcihpc19ub2RlKVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYobm9kZXNbaV0gIT09IGN1cnJlbnRbaV0pIHtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSBub2Rlcy5sZW5ndGggPT09IGN1cnJlbnQubGVuZ3RoKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjdXJyZW50ID0gbm9kZXNcbiAgICBzZXRDaGlsZHJlbi5jYWxsKHRoaXMsIGVsLCBjdXJyZW50KVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzX25vZGUoZWwpIHtcbiAgcmV0dXJuIGVsICYmIGVsLm5vZGVUeXBlXG59XG4iLCJ2YXIgc2V0Q2hpbGRyZW4gPSByZXF1aXJlKCcuLi9zZXQtY2hpbGRyZW4nKVxudmFyIGZvclJlZ2V4cCA9IC9eKC4qPylcXHMraW5cXHMrKC4qJCkvXG5cbm1vZHVsZS5leHBvcnRzID0gZm9ySGFuZGxlclxuXG5mdW5jdGlvbiBmb3JIYW5kbGVyKHJvb3QsIGFyZ3MsIGxvb2t1cHMpIHtcbiAgdmFyIHRlbXBsYXRlID0gcm9vdC5jbG9uZU5vZGUodHJ1ZSlcbiAgdmFyIHBhcnRzID0gYXJncy5tYXRjaChmb3JSZWdleHApXG4gIHZhciBkb21Ob2RlcyA9IFtdXG4gIHZhciBjaGlsZHJlbiA9IFtdXG4gIHZhciBhbHRyID0gdGhpc1xuICB2YXIgaXRlbXMgPSBbXVxuXG4gIGlmKCFwYXJ0cykge1xuICAgIHJldHVybiBjb25zb2xlLmVycm9yKCdpbnZhbGlkIGBmb3JgIHRhZzogJyArIGFyZ3MpXG4gIH1cblxuICB2YXIgcnVuVXBkYXRlcyA9IGFsdHIuYmF0Y2guYWRkKHJ1bkRvbVVwZGF0ZXMpXG5cbiAgcm9vdC5pbm5lckhUTUwgPSAnJ1xuXG4gIHZhciB1bmlxdWUgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzFdXG4gIHZhciBwcm9wID0gcGFydHNbMV0uc3BsaXQoJzonKVswXVxuICB2YXIga2V5ID0gcGFydHNbMl1cblxuXG4gIGxvb2t1cHMub24oa2V5LCB1cGRhdGUpXG4gIGxvb2t1cHMub24oJ3RoaXMnLCB1cGRhdGVDaGlsZHJlbilcblxuICByZXR1cm4gYWx0ci5tZXJnZUhvb2tzKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmbGF0dGVuKGNoaWxkcmVuKVxuICB9KVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUNoaWxkcmVuKGRhdGEpIHtcbiAgICB2YXIgaXRlbURhdGFcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGl0ZW1EYXRhID0gdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnID8gT2JqZWN0LmNyZWF0ZShkYXRhKSA6IHt9XG4gICAgICBpdGVtRGF0YVtwcm9wXSA9IGl0ZW1zW2ldXG4gICAgICBpdGVtRGF0YS4kaW5kZXggPSBpXG4gICAgICBjaGlsZHJlbltpXS5sb29rdXBzLnVwZGF0ZShpdGVtRGF0YSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUobmV3SXRlbXMpIHtcbiAgICBpZighQXJyYXkuaXNBcnJheShuZXdJdGVtcykpIHtcbiAgICAgIG5ld0l0ZW1zID0gW11cbiAgICB9XG5cbiAgICB2YXIgbmV3Q2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3SXRlbXMubGVuZ3RoKVxuICAgIHZhciByZW1vdmVkID0gW11cbiAgICB2YXIgbWF0Y2hlZCA9IHt9XG4gICAgdmFyIGFkZGVkID0gW11cbiAgICB2YXIgaW5kZXhcblxuICAgIGRvbU5vZGVzID0gW11cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBuZXdJdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGluZGV4ID0gZmluZEluZGV4KGl0ZW1zLCBuZXdJdGVtc1tpXSwgdW5pcXVlKVxuXG4gICAgICBpZihpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgbmV3Q2hpbGRyZW5baV0gPSBjaGlsZHJlbltpbmRleF1cbiAgICAgICAgaXRlbXNbaW5kZXhdID0gY2hpbGRyZW5baW5kZXhdID0gbWF0Y2hlZFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWRkZWQucHVzaChuZXdDaGlsZHJlbltpXSA9IG1ha2VDaGlsZCgpKVxuICAgICAgfVxuXG4gICAgICBkb21Ob2RlcyA9IGRvbU5vZGVzLmNvbmNhdChuZXdDaGlsZHJlbltpXS5ub2RlcylcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpZihjaGlsZHJlbltpXSAhPT0gbWF0Y2hlZCkge1xuICAgICAgICByZW1vdmVkLnB1c2goY2hpbGRyZW5baV0pXG4gICAgICB9XG4gICAgfVxuXG4gICAgY2hpbGRyZW4gPSBuZXdDaGlsZHJlbi5zbGljZSgpXG4gICAgaXRlbXMgPSBuZXdJdGVtcy5zbGljZSgpXG4gICAgdXBkYXRlQ2hpbGRyZW4obG9va3Vwcy5zdGF0ZSlcbiAgICBhbHRyLmRlc3Ryb3koZmxhdHRlbihyZW1vdmVkKSwgcm9vdCwgcnVuVXBkYXRlcy5iaW5kKFxuICAgICAgICBhbHRyXG4gICAgICAsIGRvbU5vZGVzXG4gICAgICAsIGZsYXR0ZW4oYWRkZWQpXG4gICAgKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRJbmRleChpdGVtcywgZCwgdW5pcXVlKSB7XG4gICAgaWYoIXVuaXF1ZSkge1xuICAgICAgcmV0dXJuIGl0ZW1zLmluZGV4T2YoZClcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gaXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpZihpdGVtc1tpXVt1bmlxdWVdID09PSBkW3VuaXF1ZV0pIHtcbiAgICAgICAgcmV0dXJuIGlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gLTFcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VDaGlsZCgpIHtcbiAgICByZXR1cm4gYWx0ci5pbml0Tm9kZXModGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpLmNoaWxkTm9kZXMpXG4gIH1cblxuICBmdW5jdGlvbiBydW5Eb21VcGRhdGVzKGNoaWxkcmVuLCBhZGRlZCkge1xuICAgIHNldENoaWxkcmVuLmNhbGwodGhpcywgcm9vdCwgY2hpbGRyZW4pXG4gICAgYWx0ci5ydW5Ib29rcyhhZGRlZCwgJ2luc2VydCcsIHJvb3QpXG4gIH1cbn1cblxuZnVuY3Rpb24gZmxhdHRlbihsaXN0KSB7XG4gIHJldHVybiBsaXN0LnJlZHVjZShmdW5jdGlvbihhbGwsIHBhcnQpIHtcbiAgICByZXR1cm4gcGFydC5ob29rcyA/IGFsbC5jb25jYXQocGFydC5ob29rcykgOiBhbGxcbiAgfSwgW10pXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGh0bWxcblxuZnVuY3Rpb24gaHRtbChlbCwgYWNjZXNzb3IsIGxvb2t1cHMpIHtcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuXG4gICAgaWYoZWwuZ2V0QXR0cmlidXRlKCdhbHRyLXJ1bi1zY3JpcHRzJykpIHtcbiAgICAgIFtdLmZvckVhY2guY2FsbChlbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JyksIHJ1bilcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuKHNjcmlwdCkge1xuICB2YXIgZml4ZWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgICwgcGFyZW50ID0gc2NyaXB0LnBhcmVudE5vZGVcbiAgICAsIGF0dHJzID0gc2NyaXB0LmF0dHJpYnV0ZXNcbiAgICAsIHNyY1xuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBmaXhlZC5zZXRBdHRyaWJ1dGUoYXR0cnNbaV0ubmFtZSwgYXR0cnNbaV0udmFsdWUpXG4gIH1cblxuICBmaXhlZC50ZXh0Q29udGVudCA9IHNjcmlwdC50ZXh0Q29udGVudFxuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGZpeGVkLCBzY3JpcHQpXG4gIHBhcmVudC5yZW1vdmVDaGlsZChzY3JpcHQpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlmVGFnXG5cbmZ1bmN0aW9uIGlmVGFnKGVsLCBnZXR0ZXIsIGxvb2t1cHMsIGRlY29yYXRvcnMpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcylcbiAgdmFyIGFsbCA9IGNoaWxkcmVuLmhvb2tzLmNvbmNhdChkZWNvcmF0b3JzKVxuICB2YXIgbGFzdFZhbCA9IG51bGxcbiAgdmFyIGhpZGRlbiA9IG51bGxcbiAgdmFyIGZpcnN0ID0gdHJ1ZVxuICB2YXIgYWx0ciA9IHRoaXNcblxuICB2YXIgdXBkYXRlID0gdGhpcy5iYXRjaC5hZGQoZnVuY3Rpb24oc2hvdywgb3JpZ2luKSB7XG4gICAgaWYoIWhpZGRlbiAmJiAhc2hvdykge1xuICAgICAgZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQocGxhY2Vob2xkZXIsIGVsKVxuICAgICAgZWwuX2FsdHJQbGFjZWhvbGRlciA9IHBsYWNlaG9sZGVyXG4gICAgICBoaWRkZW4gPSB0cnVlXG4gICAgfSBlbHNlIGlmKGhpZGRlbiAmJiBzaG93KSB7XG4gICAgICBwbGFjZWhvbGRlci5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChlbCwgcGxhY2Vob2xkZXIpXG4gICAgICBhbHRyLnJ1bkhvb2tzKGFsbCwgJ2luc2VydCcsIG9yaWdpbilcbiAgICAgIGRlbGV0ZSBlbC5fYWx0clBsYWNlaG9sZGVyXG4gICAgICBoaWRkZW4gPSBmYWxzZVxuICAgIH0gZWxzZSBpZihmaXJzdCkge1xuICAgICAgZmlyc3QgPSBmYWxzZVxuICAgICAgYWx0ci5ydW5Ib29rcyhhbGwsICdpbnNlcnQnLCBvcmlnaW4pXG4gICAgfVxuICB9KVxuXG4gIGxvb2t1cHMub24oZ2V0dGVyLCB0b2dnbGUsIHRydWUpXG5cbiAgcmV0dXJuIHtcbiAgICAgIGluc2VydDogaW5zZXJ0XG4gICAgLCByZW1vdmU6IHJlbW92ZVxuICAgICwgZGVzdHJveTogZGVzdHJveVxuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveShlbCkge1xuICAgIGFsdHIucnVuSG9va3MoY2hpbGRyZW4uaG9va3MsICdkZXN0cm95JywgZWwpXG4gIH1cblxuICBmdW5jdGlvbiB0b2dnbGUodmFsKSB7XG4gICAgbGFzdFZhbCA9IHZhbFxuXG4gICAgaWYodmFsKSB7XG4gICAgICB1cGRhdGUodHJ1ZSwgZWwpXG4gICAgICBjaGlsZHJlbi5sb29rdXBzLnVwZGF0ZShsb29rdXBzLnN0YXRlKVxuICAgIH0gZWxzZSB7XG4gICAgICBhbHRyLnJlbW92ZShhbGwsIGVsLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZShmYWxzZSwgZWwpXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGluc2VydChlbCkge1xuICAgIGlmKGxhc3RWYWwpIHtcbiAgICAgIHVwZGF0ZSh0cnVlLCBlbClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUoZWwsIGRvbmUpIHtcbiAgICBpZihoaWRkZW4pIHtcbiAgICAgIGRvbmUoKVxuXG4gICAgICByZXR1cm4gdXBkYXRlKGZhbHNlKVxuICAgIH1cblxuICAgIGFsdHIucmVtb3ZlKGNoaWxkcmVuLmhvb2tzLCBlbCwgZnVuY3Rpb24oKSB7XG4gICAgICB1cGRhdGUoZmFsc2UpXG4gICAgICBkb25lKClcbiAgICB9KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluY2x1ZGVcblxuZnVuY3Rpb24gaW5jbHVkZShlbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciByZW1vdmVMaXN0ZW5lcnMgPSBbXVxuICB2YXIgY2hpbGRyZW4gPSBudWxsXG4gIHZhciBjb250ZW50ID0gJydcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgbG9va3Vwcy5vbihnZXR0ZXIsIHNldClcbiAgbG9va3Vwcy5vbigndGhpcycsIHVwZGF0ZSlcblxuICByZXR1cm4ge2luc2VydDogaW5zZXJ0LCByZW1vdmU6IHJlbW92ZSwgZGVzdHJveTogZGVzdHJveX1cblxuICBmdW5jdGlvbiBzZXQoZGF0YSkge1xuICAgIGNvbnRlbnQgPSB0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycgPyBkYXRhIDogJydcbiAgICBpZihjaGlsZHJlbikgcmVtb3ZlKGVsLCBpbnNlcnQpXG4gIH1cblxuICBmdW5jdGlvbiBpbnNlcnQoKSB7XG4gICAgaWYoY2hpbGRyZW4pIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGVsLmlubmVySFRNTCA9IGNvbnRlbnRcbiAgICBjaGlsZHJlbiA9IGFsdHIuaW5pdE5vZGVzKGVsLmNoaWxkTm9kZXMsIG51bGwsIGxvb2t1cHMuc3RhdGUpXG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUoZWwsIGRvbmUpIHtcbiAgICBpZighY2hpbGRyZW4pIHtcbiAgICAgIHJldHVybiBkb25lKClcbiAgICB9XG5cbiAgICBpZihyZW1vdmVMaXN0ZW5lcnMucHVzaChkb25lKSA+IDEpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGFsdHIuZGVzdHJveShjaGlsZHJlbiwgZWwsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxpc3RlbmVyXG5cbiAgICAgIGlmKCFjaGlsZHJlbikge1xuICAgICAgICBlbC5pbm5lckhUTUwgPSAnJ1xuICAgICAgfVxuXG4gICAgICB3aGlsZShsaXN0ZW5lciA9IHJlbW92ZUxpc3RlbmVycy5wb3AoKSkge1xuICAgICAgICBsaXN0ZW5lcigpXG4gICAgICB9XG4gICAgfSlcblxuICAgIGNoaWxkcmVuID0gbnVsbFxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHN0YXRlKSB7XG4gICAgY2hpbGRyZW4gJiYgY2hpbGRyZW4ubG9va3Vwcy51cGRhdGUoc3RhdGUpXG4gIH1cblxuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGxvb2t1cHMucmVtb3ZlTGlzdGVuZXIoJ3RoaXMnLCB1cGRhdGUpXG4gICAgbG9va3Vwcy5yZW1vdmVMaXN0ZW5lcihnZXR0ZXIsIHNldClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBwbGFjZWhvbGRlclxuXG5mdW5jdGlvbiBwbGFjZWhvbGRlcihvcmlnaW5hbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciBjdXJyZW50ID0gb3JpZ2luYWxcbiAgICAsIGFsdHIgPSB0aGlzXG5cbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihnZXR0ZXIsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGlmKCF2YWwgfHwgIXZhbC5ub2RlTmFtZSB8fCB2YWwgPT09IGN1cnJlbnQpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGN1cnJlbnQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodmFsLCBjdXJyZW50KVxuICAgIG9yaWdpbmFsLl9hbHRyUGxhY2Vob2xkZXIgPSB2YWxcbiAgICBjdXJyZW50ID0gdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcmF3KCkge31cbiIsIm1vZHVsZS5leHBvcnRzID0gdGV4dFxuXG5mdW5jdGlvbiB0ZXh0KGVsLCBnZXR0ZXIsIGxvb2t1cHMpIHtcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihnZXR0ZXIsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHdpdGhUYWdcblxuZnVuY3Rpb24gd2l0aFRhZyhlbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciBjaGlsZHJlbiA9IHRoaXMuaW5pdE5vZGVzKGVsLmNoaWxkTm9kZXMpXG4gICAgLCBwYXJ0cyA9IGdldHRlci5zcGxpdCgnIGFzICcpXG5cbiAgbG9va3Vwcy5vbihwYXJ0c1swXSwgdXBkYXRlKVxuXG4gIHJldHVybiBjaGlsZHJlbi5ob29rc1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZShfdmFsKSB7XG4gICAgdmFyIHZhbCA9IE9iamVjdC5jcmVhdGUobG9va3Vwcy5zdGF0ZSlcblxuICAgIHZhbFtwYXJ0c1sxXV0gPSBfdmFsXG4gICAgY2hpbGRyZW4ubG9va3Vwcy51cGRhdGUodmFsKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRTdHJpbmdcblxuZnVuY3Rpb24gdGVtcGxhdFN0cmluZyh0ZW1wbGF0ZSwgY2hhbmdlLCBsb29rdXBzKSB7XG4gIGlmKCF0ZW1wbGF0ZS5tYXRjaCh0aGlzLnRhZ1JlZ0V4cCkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0ZW1wbGF0ZVxuICAgICwgcGFydHMgPSBbXVxuICAgICwgaG9va3MgPSBbXVxuICAgICwgaW5kZXhcbiAgICAsIG5leHRcblxuICB3aGlsZShyZW1haW5pbmcgJiYgKG5leHQgPSByZW1haW5pbmcubWF0Y2godGhpcy50YWdSZWdFeHApKSkge1xuICAgIGlmKGluZGV4ID0gcmVtYWluaW5nLmluZGV4T2YobmV4dFswXSkpIHtcbiAgICAgIHBhcnRzLnB1c2gocmVtYWluaW5nLnNsaWNlKDAsIGluZGV4KSlcbiAgICB9XG5cbiAgICBwYXJ0cy5wdXNoKCcnKVxuICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZy5zbGljZShpbmRleCArIG5leHRbMF0ubGVuZ3RoKVxuICAgIGxvb2t1cHMub24obmV4dFsxXSwgc2V0UGFydC5iaW5kKHRoaXMsIHBhcnRzLmxlbmd0aCAtIDEpKVxuICB9XG5cbiAgaWYocmVtYWluaW5nKSB7XG4gICAgc2V0UGFydChwYXJ0cy5sZW5ndGgsIHJlbWFpbmluZylcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFBhcnQoaWR4LCB2YWwpIHtcbiAgICBwYXJ0c1tpZHhdID0gdmFsXG5cbiAgICBjaGFuZ2UocGFydHMuam9pbignJykpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaW5pdFRleHROb2RlXG5cbmZ1bmN0aW9uIGluaXRUZXh0Tm9kZShlbCwgbG9va3Vwcykge1xuICB0aGlzLnRlbXBsYXRlU3RyaW5nKFxuICAgICAgZWwudGV4dENvbnRlbnRcbiAgICAsIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSlcbiAgICAsIGxvb2t1cHNcbiAgKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvU3RyaW5nXG5cbmZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICByZXR1cm4gdGhpcy5yb290Tm9kZXMoKS5tYXAoZnVuY3Rpb24obm9kZSkge1xuICAgIHN3aXRjaChub2RlLm5vZGVUeXBlKSB7XG4gICAgICBjYXNlIHRoaXMuZG9jdW1lbnQuRE9DVU1FTlRfRlJBR01FTlRfTk9ERTpcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5DT01NRU5UX05PREU6IHJldHVybiBjbG9uZS5jYWxsKHRoaXMsIG5vZGUpXG4gICAgICBjYXNlIHRoaXMuZG9jdW1lbnQuVEVYVF9OT0RFOiByZXR1cm4gbm9kZS50ZXh0Q29udGVudFxuICAgICAgZGVmYXVsdDogcmV0dXJuIG5vZGUub3V0ZXJIVE1MXG4gICAgfVxuICB9LCB0aGlzKS5qb2luKCcnKVxuXG4gIGZ1bmN0aW9uIGNsb25lKG5vZGUpIHtcbiAgICB2YXIgdGVtcCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIHRlbXAuYXBwZW5kQ2hpbGQobm9kZS5jbG9uZU5vZGUodHJ1ZSkpXG5cbiAgICByZXR1cm4gdGVtcC5pbm5lckhUTUxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBCYXRjaFxuXG5mdW5jdGlvbiBCYXRjaChyZWFkeSwgYWxsKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIEJhdGNoKSkge1xuICAgIHJldHVybiBuZXcgQmF0Y2gocmVhZHksIGFsbClcbiAgfVxuXG4gIHRoaXMuam9icyA9IFtdXG4gIHRoaXMuYWxsID0gYWxsXG4gIHRoaXMucmVhZHkgPSByZWFkeVxuICB0aGlzLnF1ZXVkID0gZmFsc2VcbiAgdGhpcy5ydW4gPSB0aGlzLnJ1bi5iaW5kKHRoaXMpXG59XG5cbkJhdGNoLnByb3RvdHlwZS5xdWV1ZSA9IHF1ZXVlXG5CYXRjaC5wcm90b3R5cGUuYWRkID0gYWRkXG5CYXRjaC5wcm90b3R5cGUucnVuID0gcnVuXG5cbmZ1bmN0aW9uIGFkZChmbikge1xuICB2YXIgcXVldWVkID0gZmFsc2VcbiAgICAsIGJhdGNoID0gdGhpc1xuICAgICwgc2VsZlxuICAgICwgYXJnc1xuXG4gIHJldHVybiBxdWV1ZVxuXG4gIGZ1bmN0aW9uIHF1ZXVlKCkge1xuICAgIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICBzZWxmID0gdGhpc1xuXG4gICAgaWYocXVldWVkKSB7XG4gICAgICByZXR1cm4gYmF0Y2guYWxsICYmIGJhdGNoLnJlYWR5KClcbiAgICB9XG5cbiAgICBxdWV1ZWQgPSB0cnVlXG4gICAgYmF0Y2gucXVldWUocnVuKVxuICB9XG5cbiAgZnVuY3Rpb24gcnVuKCkge1xuICAgIHF1ZXVlZCA9IGZhbHNlXG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWV1ZShmbikge1xuICB0aGlzLmpvYnMucHVzaChmbilcblxuICBpZih0aGlzLmFsbCB8fCAhdGhpcy5xdWV1ZWQpIHtcbiAgICB0aGlzLnF1ZXVlZCA9IHRydWVcbiAgICB0aGlzLnJlYWR5KHRoaXMpXG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuKCkge1xuICB2YXIgam9icyA9IHRoaXMuam9ic1xuXG4gIHRoaXMuam9icyA9IFtdXG4gIHRoaXMucXVldWVkID0gZmFsc2VcblxuICBmb3IodmFyIGkgPSAwLCBsID0gam9icy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBqb2JzW2ldKClcbiAgfVxuXG4gIHJldHVybiAhIWpvYnMubGVuZ3RoXG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgdmFyIGJ1aWx0ID0gYnVpbGQobm9kZSwgW10pXG4gIHJldHVybiB7XG4gICAgZGVwczogYnVpbHQuZGVwcyxcbiAgICByYXc6IG5vZGUudmFsdWUsXG4gICAgYm9keTogYnVpbHQuYm9keSxcbiAgICBjb21waWxlZDogY29tcGlsZShidWlsdC5ib2R5KSxcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZChub2RlLCBkZXBzKSB7XG4gIGlmKG5vZGUudHlwZSA9PT0gJ2dyb3VwJykge1xuICAgIHZhciBncm91cCA9IGJ1aWxkKG5vZGUuZGF0YS5leHByZXNzaW9uLCBkZXBzKVxuICAgIHJldHVybiB7XG4gICAgICBkZXBzOiBncm91cC5kZXBzLFxuICAgICAgYm9keTogJygnICsgZ3JvdXAuYm9keSArICcpJ1xuICAgIH1cbiAgfVxuXG4gIGlmKG5vZGUudHlwZSA9PT0gJ251bWJlcicgfHwgbm9kZS50eXBlID09PSAnc3RyaW5nJyB8fCBub2RlLnR5cGUgPT09ICdrZXl3b3JkJykge1xuICAgIHJldHVybiB7Ym9keTogbm9kZS52YWx1ZSwgZGVwczogW119XG4gIH1cblxuICBpZihub2RlLnR5cGUgPT09ICd1bmFyeScpIHtcbiAgICB2YXIgY2hpbGQgPSBidWlsZChub2RlLmRhdGEucmlnaHQsIGRlcHMpXG4gICAgcmV0dXJuIHtib2R5OiBub2RlLmRhdGEub3AgKyAnKCcgKyBjaGlsZC5ib2R5ICsgJyknLCBkZXBzOiBjaGlsZC5kZXBzfVxuICB9XG5cbiAgaWYobm9kZS50eXBlID09PSAnbGFiZWwnIHx8IG5vZGUudHlwZSA9PT0gJ2hlbHBlcicpIHtcbiAgICB2YXIgbmV3RGVwcyA9IGFkZERlcChub2RlLCBkZXBzKVxuICAgIHJldHVybiB7Ym9keTogJ2FyZ3VtZW50c1snICsgbmV3RGVwcy5pbmRleCArICddJywgZGVwczogbmV3RGVwcy5kZXBzfVxuICB9XG5cbiAgaWYobm9kZS50eXBlID09PSAnbWVtYmVyJykge1xuICAgIHZhciBsZWZ0ID0gYnVpbGQobm9kZS5kYXRhLmxlZnQsIGRlcHMpXG4gICAgJ3RoaXMubG9va3VwKCcgKyBsZWZ0LmJvZHkgKyAnLCBcIicgKyBub2RlLmRhdGEucmlnaHQudmFsdWUgKyAnXCIpJ1xuICAgIHJldHVybiB7XG4gICAgICBib2R5OiAndGhpcy5sb29rdXAoJyArIGxlZnQuYm9keSArICcsIFwiJyArIG5vZGUuZGF0YS5yaWdodC52YWx1ZSArICdcIiknLFxuICAgICAgZGVwczogbGVmdC5kZXBzXG4gICAgfVxuICB9XG5cbiAgaWYobm9kZS50eXBlID09PSAnaW5kZXgnKSB7XG4gICAgdmFyIGxlZnQgPSBidWlsZChub2RlLmRhdGEubGVmdCwgZGVwcylcbiAgICB2YXIgcmlnaHQgPSBidWlsZChub2RlLmRhdGEucmlnaHQsIGRlcHMuY29uY2F0KGxlZnQuZGVwcykpXG4gICAgcmV0dXJuIHtcbiAgICAgIGJvZHk6ICd0aGlzLmxvb2t1cCgnICsgbGVmdC5ib2R5ICsgJywgJyArIHJpZ2h0LmJvZHkgKyAnKScsXG4gICAgICBkZXBzOiBsZWZ0LmRlcHMuY29uY2F0KHJpZ2h0LmRlcHMpXG4gICAgfVxuICB9XG5cbiAgaWYobm9kZS50eXBlID09PSAnYmluYXJ5Jykge1xuICAgIHZhciBsZWZ0ID0gYnVpbGQobm9kZS5kYXRhLmxlZnQsIGRlcHMpXG4gICAgdmFyIHJpZ2h0ID0gYnVpbGQobm9kZS5kYXRhLnJpZ2h0LCBkZXBzLmNvbmNhdChsZWZ0LmRlcHMpKVxuICAgIHJldHVybiB7XG4gICAgICBib2R5OiBsZWZ0LmJvZHkgKyAnICcgKyBub2RlLmRhdGEub3AgKyAnICcgKyByaWdodC5ib2R5LFxuICAgICAgZGVwczogbGVmdC5kZXBzLmNvbmNhdChyaWdodC5kZXBzKVxuICAgIH1cbiAgfVxuXG4gIGlmKG5vZGUudHlwZSA9PT0gJ3Rlcm5hcnknKSB7XG4gICAgdmFyIGxlZnQgPSBidWlsZChub2RlLmRhdGEubGVmdCwgZGVwcylcbiAgICB2YXIgbWlkZGxlID0gYnVpbGQobm9kZS5kYXRhLm1pZGRsZSwgZGVwcylcbiAgICB2YXIgcmlnaHQgPSBidWlsZChub2RlLmRhdGEucmlnaHQsIGRlcHMuY29uY2F0KGxlZnQuZGVwcykpXG4gICAgcmV0dXJuIHtcbiAgICAgIGJvZHk6IGxlZnQuYm9keSArICcgPyAnICsgbWlkZGxlLmJvZHkgKyAnIDogJyArIHJpZ2h0LmJvZHksXG4gICAgICBkZXBzOiBsZWZ0LmRlcHMuY29uY2F0KG1pZGRsZS5kZXBzLCByaWdodC5kZXBzKVxuICAgIH1cbiAgfVxuXG4gIGlmKG5vZGUudHlwZSA9PT0gJ2hlbHBlcicpIHtcbiAgICB2YXIgbmV3RGVwcyA9IGFkZERlcChub2RlLCBkZXBzKVxuICAgIHJldHVybiB7Ym9keTogJ2FyZ3VtZW50c1snICsgbmV3RGVwcy5pbmRleCArICddJywgZGVwczogbmV3RGVwcy5kZXBzfVxuICB9XG5cbiAgaWYobm9kZS50eXBlID09PSAnYXJyYXknKSB7XG4gICAgdmFyIGFsbERlcHMgPSBkZXBzXG4gICAgdmFyIG5ld0RlcHMgPSBbXVxuICAgIHZhciBkZXBzID0gW11cbiAgICB2YXIgYm9keSA9ICdbJ1xuICAgIHZhciBjaGlsZFxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2RlLmRhdGEuY2hpbGRyZW4ubGVuZ3RoIC0gMTsgaSA8IGw7ICsraSkge1xuICAgICAgY2hpbGQgPSBidWlsZChub2RlLmRhdGEuY2hpbGRyZW5baV0sIGFsbERlcHMpXG4gICAgICBib2R5ICs9IGNoaWxkLmJvZHkgKyAnLCAnXG4gICAgICBuZXdEZXBzID0gbmV3RGVwcy5jb25jYXQoY2hpbGQuZGVwcylcbiAgICAgIGFsbERlcHMgPSBkZXBzLmNvbmNhdChuZXdEZXBzKVxuICAgIH1cblxuICAgIGNoaWxkID0gYnVpbGQobm9kZS5kYXRhLmNoaWxkcmVuW2ldLCBhbGxEZXBzKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGJvZHk6IGJvZHkgKz0gY2hpbGQuYm9keSArICddJyxcbiAgICAgIGRlcHM6IG5ld0RlcHMuY29uY2F0KGNoaWxkLmRlcHMpXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkZERlcChub2RlLCBkZXBzKSB7XG4gIGZvcih2YXIgaSA9IDAsIGwgPSBkZXBzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKG5vZGUudmFsdWUgPT09IGRlcHNbaV0udmFsdWUpIGJyZWFrXG4gIH1cblxuICBpZihpID09PSBsKSByZXR1cm4ge2luZGV4OiBpLCBkZXBzOiBbbm9kZV19XG4gIHJldHVybiB7aW5kZXg6IGksIGRlcHM6IFtdfVxufVxuXG5mdW5jdGlvbiBjb21waWxlKHJhdykge1xuICByZXR1cm4gbmV3IEZ1bmN0aW9uKCcnLCAncmV0dXJuICgnICsgcmF3ICsgJyknKS5iaW5kKHtcbiAgICBsb29rdXA6IGxvb2t1cFxuICB9KVxufVxuXG5mdW5jdGlvbiBsb29rdXAocm9vdCwgcHJvcCkge1xuICByZXR1cm4gdHlwZW9mIHJvb3QgPT09ICdudWxsJyB8fCB0eXBlb2Ygcm9vdCA9PT0gJ3VuZGVmaW5lZCcgP1xuICAgIHVuZGVmaW5lZCA6XG4gICAgcm9vdFtwcm9wXVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBFeHByZXNzaW9uXG5cbmZ1bmN0aW9uIEV4cHJlc3Npb24obG9va3VwLCB0eXBlLCB1cGRhdGUsIHZhbHVlKSB7XG4gIHRoaXMuZGVwZW5kZW50cyA9IFtdXG4gIHRoaXMuZGVwcyA9IFtdXG4gIHRoaXMubG9va3VwID0gbG9va3VwXG4gIHRoaXMudHlwZSA9IHR5cGVcbiAgdGhpcy5jaGFuZ2VkID0gZmFsc2VcbiAgdGhpcy51cGRhdGUgPSB1cGRhdGVcbiAgdGhpcy5kZXBWYWx1ZXMgPSBbXVxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5yZW1vdmFibGUgPSB0cnVlXG59XG5cbkV4cHJlc3Npb24ucHJvdG90eXBlLnNldFZhbHVlID0gc2V0VmFsdWVcbkV4cHJlc3Npb24ucHJvdG90eXBlLmFkZERlcCA9IGFkZERlcFxuXG5mdW5jdGlvbiBzZXRWYWx1ZSh2YWx1ZSkge1xuICBpZih0aGlzLnZhbHVlID09PSB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKSByZXR1cm5cblxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5jaGFuZ2VkID0gdHJ1ZVxuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5kZXBlbmRlbnRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHRoaXMuZGVwZW5kZW50c1tpXSh2YWx1ZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBhZGREZXAoZGVwKSB7XG4gIHZhciBpID0gdGhpcy5kZXBzLmxlbmd0aFxuICB0aGlzLmRlcHNbaV0gPSBkZXBcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIGRlcC5kZXBlbmRlbnRzLnB1c2goZnVuY3Rpb24odmFsKSB7XG4gICAgc2VsZi5kZXBWYWx1ZXNbaV0gPSB2YWxcbiAgICBzZWxmLnVwZGF0ZShzZWxmLmRlcFZhbHVlcylcbiAgfSlcbiAgdGhpcy5kZXBWYWx1ZXNbaV0gPSBkZXAudmFsdWVcbn1cbiIsInZhciBFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJylcbnZhciByZW1vdmUgPSByZXF1aXJlKCcuL3JlbW92ZScpXG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlJylcbnZhciB3YXRjaCA9IHJlcXVpcmUoJy4vd2F0Y2gnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IERpcnR5Qml0XG5cbmZ1bmN0aW9uIERpcnR5Qml0KHN0YXRlLCBvcHRpb25zKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIERpcnR5Qml0KSkge1xuICAgIHJldHVybiBuZXcgRGlydHlCaXQoc3RhdGUsIG9wdGlvbnMpXG4gIH1cblxuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgdGhpcy5zdGF0ZSA9IHN0YXRlIHx8IHt9XG4gIHRoaXMuaGVscGVycyA9IE9iamVjdC5jcmVhdGUodGhpcy5vcHRpb25zLmhlbHBlcnMgfHwgbnVsbClcbiAgdGhpcy52YWx1ZXMgPSB7fVxuICB0aGlzLndhdGNoZWQgPSBbXVxuICB0aGlzLmV4cHJlc3Npb25zID0ge1xuICAgIGxpc3Q6IFtdLFxuICAgIG1hcDoge31cbiAgfVxuXG4gIHRoaXMuaGFuZGxlcnMgPSB7fVxuICB0aGlzLmFsd2F5cyA9IHt9XG4gIHRoaXMudXBkYXRpbmcgPSBmYWxzZVxuXG4gIHRoaXMucm9vdEtleSA9IHRoaXMub3B0aW9ucy5yb290S2V5XG5cbiAgdGhpcy5yb290RXhwcmVzc2lvbiA9IG5ldyBFeHByZXNzaW9uKCd0aGlzJywgJ3Jvb3QnLCBudWxsLCB0aGlzLnN0YXRlKVxuICB0aGlzLmV4cHJlc3Npb25zLm1hcC50aGlzID0gdGhpcy5yb290RXhwcmVzc2lvblxuICB0aGlzLnJvb3RFeHByZXNzaW9uLnJlbW92YWJsZSA9IGZhbHNlXG5cblxuICBpZih0aGlzLnJvb3RLZXkpIHtcbiAgICB0aGlzLmV4cHJlc3Npb25zW3RoaXMucm9vdEtleV0gPSB0aGlzLnJvb3RFeHByZXNzaW9uXG4gIH1cbn1cblxuRGlydHlCaXQucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gcmVtb3ZlXG5EaXJ0eUJpdC5wcm90b3R5cGUuYWRkSGVscGVyID0gYWRkSGVscGVyXG5EaXJ0eUJpdC5wcm90b3R5cGUudXBkYXRlID0gdXBkYXRlXG5EaXJ0eUJpdC5wcm90b3R5cGUucmVwb3J0ID0gcmVwb3J0XG5EaXJ0eUJpdC5wcm90b3R5cGUucGFyc2UgPSBwYXJzZVxuRGlydHlCaXQucHJvdG90eXBlLndhdGNoID0gd2F0Y2hcbkRpcnR5Qml0LnByb3RvdHlwZS5vbiA9IG9uXG5cbkRpcnR5Qml0LnBhcnNlZCA9IHt9XG5cbmZ1bmN0aW9uIHVwZGF0ZShzdGF0ZSkge1xuICB0aGlzLnN0YXRlID0gc3RhdGVcbiAgdGhpcy51cGRhdGluZyA9IHRydWVcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMud2F0Y2hlZC5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB0aGlzLndhdGNoZWRbaV0udXBkYXRlKClcbiAgfVxuICB0aGlzLnVwZGF0aW5nID0gZmFsc2VcbiAgdGhpcy5yZXBvcnQoKVxufVxuXG5mdW5jdGlvbiByZXBvcnQoKSB7XG4gIHZhciBsb29rdXBzID0gT2JqZWN0LmtleXModGhpcy5oYW5kbGVycylcblxuICBmb3IodmFyIGkgPSAwLCBsID0gbG9va3Vwcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB2YXIgZXhwcmVzc2lvbiA9IHRoaXMuZXhwcmVzc2lvbnMubWFwW2xvb2t1cHNbaV1dXG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1tsb29rdXBzW2ldXS5hbHdheXNcbiAgICBmb3IodmFyIGogPSAwLCBsMiA9IGhhbmRsZXJzLmxlbmd0aDsgaiA8IGwyOyArK2opIHtcbiAgICAgIGhhbmRsZXJzW2pdKGV4cHJlc3Npb24udmFsdWUpXG4gICAgfVxuICAgIGlmKCFleHByZXNzaW9uLmNoYW5nZWQpIGNvbnRpbnVlXG4gICAgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzW2xvb2t1cHNbaV1dLnVwZGF0ZVxuICAgIGZvcih2YXIgaiA9IDAsIGwyID0gaGFuZGxlcnMubGVuZ3RoOyBqIDwgbDI7ICsraikge1xuICAgICAgaGFuZGxlcnNbal0oZXhwcmVzc2lvbi52YWx1ZSlcbiAgICB9XG5cbiAgICBleHByZXNzaW9uLmNoYW5nZWQgPSBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkZEhlbHBlcihuYW1lLCBoZWxwZXIpIHtcbiAgdGhpcy5oZWxwZXJzW25hbWVdID0gaGVscGVyXG59XG5cbmZ1bmN0aW9uIG9uKGxvb2t1cCwgaGFuZGxlciwgYWx3YXlzKSB7XG4gIHZhciBleHAgPSB0aGlzLmV4cHJlc3Npb25zLm1hcFtsb29rdXBdXG4gIGlmKCFleHApIHtcbiAgICB0aGlzLnVwZGF0aW5nID0gdHJ1ZVxuICAgIGV4cCA9IHRoaXMud2F0Y2gobG9va3VwKVxuICAgIHRoaXMudXBkYXRpbmcgPSBmYWxzZVxuICB9XG5cbiAgaWYoIXRoaXMuaGFuZGxlcnNbbG9va3VwXSkge1xuICAgIHRoaXMuaGFuZGxlcnNbbG9va3VwXSA9IHtcbiAgICAgIGFsd2F5czogW10sXG4gICAgICB1cGRhdGU6IFtdLFxuICAgIH1cbiAgfVxuXG4gIGlmKGFsd2F5cykge1xuICAgIHRoaXMuaGFuZGxlcnNbbG9va3VwXS5hbHdheXMucHVzaChoYW5kbGVyKVxuICB9IGVsc2Uge1xuICAgIHRoaXMuaGFuZGxlcnNbbG9va3VwXS51cGRhdGUucHVzaChoYW5kbGVyKVxuICB9XG4gIGhhbmRsZXIoZXhwLnZhbHVlKVxuICByZXR1cm4gdGhpc1xufVxuIiwidmFyIHR5cGVzID0gW2dyb3VwLCBhcnJheSwga2V5d29yZCwgbnVtYmVyLCBzdHJpbmcsIGxhYmVsLCB1bmFyeV1cbnZhciBjb250aW51YXRpb25zID0gW2hlbHBlciwgbWVtYmVyLCBpbmRleCwgYmluYXJ5LCB0ZXJuYXJ5XVxudmFyIGtleXdvcmRzID0gWyd0cnVlJywgJ2ZhbHNlJywgJ251bGwnLCAndW5kZWZpbmVkJ11cbnZhciBrZXl3b3JkVmFsdWVzID0gW3RydWUsIGZhbHNlLCBudWxsLCB1bmRlZmluZWRdXG52YXIgdW5hcnlPcGVyYXRvcnMgPSBbJyEnLCAnKycsICctJywgJ34nLCAndm9pZCcsICdpbnN0YW5jZW9mJ11cbnZhciB3aGl0ZXNhcGNlID0gJyBcXHhBMFxcdUZFRkZcXGZcXG5cXHJcXHRcXHbigItcXHUwMGEwXFx1MTY4MOKAi1xcdTE4MGVcXHUyMDAw4oCLXFx1MjAwMVxcdTIwMDLigItcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA24oCLXFx1MjAwN1xcdTIwMDjigItcXHUyMDA5XFx1MjAwYeKAi1xcdTIwMjhcXHUyMDI54oCLXFx1MjAyZlxcdTIwNWbigItcXHUzMDAwJy5zcGxpdCgnJylcbnZhciByZXNlcnZlZENoYXJhY3RlcnMgPSB3aGl0ZXNhcGNlLmNvbmNhdCgnKCl7fVtdfCZePT48Ky0qJS9cXFxcIUAjXFwnXCJ+Liw/OmAnLnNwbGl0KCcnKSlcbnZhciBib3VuZGFyeSA9IHdoaXRlc2FwY2UuY29uY2F0KFsnKCddKVxudmFyIGJpbmFyeU9wZXJhdG9ycyA9IHtcbiAgJyUnOiA1LFxuICAnLyc6IDUsXG4gICcqJzogNSxcbiAgJy0nOiA2LFxuICAnKyc6IDYsXG4gICc+Pic6IDcsXG4gICc8PCc6IDcsXG4gICc+Pj4nOiA3LFxuICAnPCc6IDgsXG4gICc+JzogOCxcbiAgJzw9JzogOCxcbiAgJz49JzogOCxcbiAgaW5zdGFuY2VvZjogOCxcbiAgaW46IDgsXG4gICchPSc6IDksXG4gICc9PSc6IDksXG4gICchPT0nOiA5LFxuICAnPT09JzogOSxcbiAgJyYnOiAxMCxcbiAgJ3wnOiAxMSxcbiAgJ14nOiAxMixcbiAgJyYmJzogMTMsXG4gICd8fCc6IDE0XG59XG5cbnZhciBzb3J0ZWRCaW5hcnlPcGVyYXRvcnMgPSBPYmplY3Qua2V5cyhiaW5hcnlPcGVyYXRvcnMpLnNvcnQoZnVuY3Rpb24obCwgcikge1xuICByZXR1cm4gbC5sZW5ndGggPCByLmxlbmd0aCA/IDEgOiAtMVxufSlcblxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxuXG5mdW5jdGlvbiBwYXJzZShzdHIpIHtcbiAgcmV0dXJuIHRyaW0oc3RyLCBleHByZXNzaW9uLCAwKVxufVxuXG5mdW5jdGlvbiBleHByZXNzaW9uKHN0ciwgc3RhcnQsIGVuZCkge1xuICBpZighc3RyIHx8ICFzdHJbc3RhcnRdKSByZXR1cm4gbnVsbFxuICBmb3IodmFyIGkgPSAwLCBsID0gdHlwZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgdmFyIG5vZGUgPSB0eXBlc1tpXShzdHIsIHN0YXJ0LCBlbmQpXG4gICAgaWYobm9kZSkgYnJlYWtcbiAgfVxuXG4gIGlmKCFub2RlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ1VuZXhwZWN0ZWQgdG9rZW46ICcgKyBzdHJbc3RhcnRdICsgJyBpbiBcIicgKyBzdHIuc2xpY2Uoc3RhcnQsIDIwKSArICdcIidcbiAgICApXG4gIH1cblxuICB2YXIgY3VyID0gbm9kZS5yYW5nZVsxXVxuICB3aGlsZSh3aGl0ZXNhcGNlLmluZGV4T2Yoc3RyW2N1cl0pICE9PSAtMSkgY3VyID0gY3VyICsgMVxuXG4gIHJldHVybiBlbmQuaW5kZXhPZihzdHJbY3VyXSkgIT09IC0xID8gbm9kZSA6IGNvbnRpbnVlRXhwcmVzc2lvbihzdHIsIG5vZGUsIGVuZClcbn1cblxuZnVuY3Rpb24gY29udGludWVFeHByZXNzaW9uKHN0ciwgbm9kZSwgZW5kKSB7XG4gIHZhciBzdGFydCA9IG5vZGUucmFuZ2VbMV1cbiAgd2hpbGUoc3RyW3N0YXJ0XSAmJiBlbmQuaW5kZXhPZihzdHJbc3RhcnRdKSA9PT0gLTEpIHtcbiAgICBub2RlID0gdHJpbShzdHIsIGZpbmRDb250aW51YXRpb24sIHN0YXJ0LCBlbmQpXG4gICAgc3RhcnQgPSBub2RlLnJhbmdlWzFdXG4gICAgd2hpbGUod2hpdGVzYXBjZS5pbmRleE9mKHN0cltzdGFydF0pICE9PSAtMSkgc3RhcnQgPSBzdGFydCArIDFcbiAgfVxuXG4gIGlmKGVuZC5pbmRleE9mKHN0cltzdGFydF0pID09PSAtMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdFeHBlY3RlZCB0byBmaW5kIHRva2VuOiAnICsgZW5kXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIG5vZGVcblxuICBmdW5jdGlvbiBmaW5kQ29udGludWF0aW9uKHN0ciwgc3RhcnQsIGVuZCkge1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjb250aW51YXRpb25zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgdmFyIGNvbnRpbnVhdGlvbiA9IGNvbnRpbnVhdGlvbnNbaV0obm9kZSwgc3RyLCBzdGFydCwgZW5kKVxuICAgICAgaWYoY29udGludWF0aW9uKSBicmVha1xuICAgIH1cblxuICAgIGlmKCFjb250aW51YXRpb24pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1VuZXhwZWN0ZWQgdG9rZW46ICcgKyBzdHJbc3RhcnRdICsgJyBpbiBcIicgKyBzdHIuc2xpY2Uoc3RhcnQsIHN0YXJ0ICsgMjApICsgJ1wiJ1xuICAgICAgKVxuICAgIH1cblxuICAgIHJldHVybiBjb250aW51YXRpb25cbiAgfVxufVxuXG5mdW5jdGlvbiBrZXl3b3JkKHN0ciwgc3RhcnQpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IGtleXdvcmRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHZhciB3b3JkID0ga2V5d29yZHNbaV1cbiAgICBmb3IodmFyIGogPSAwLCBsMiA9IHdvcmQubGVuZ3RoOyBqIDwgbDI7ICsraikge1xuICAgICAgaWYoc3RyW3N0YXJ0ICsgal0gIT09IHdvcmRbal0pIGJyZWFrXG4gICAgfVxuXG4gICAgaWYoaiA9PT0gbDIpIGJyZWFrXG4gIH1cblxuICBpZihpID09PSBsKSByZXR1cm4gbnVsbFxuXG4gIHJldHVybiBuZXcgTm9kZShcbiAgICAna2V5d29yZCcsXG4gICAgW3N0YXJ0LCBzdGFydCArIHdvcmQubGVuZ3RoXSxcbiAgICBzdHIsXG4gICAgbnVsbCxcbiAgICB0cnVlLFxuICAgIGtleXdvcmRWYWx1ZXNbd29yZF1cbiAgKVxufVxuXG5mdW5jdGlvbiBzdHJpbmcoc3RyLCBzdGFydCkge1xuICB2YXIgb3BlbiA9IHN0cltzdGFydF1cbiAgaWYob3BlbiAhPT0gJ1wiJyAmJiBvcGVuICE9PSAnXFwnJykgcmV0dXJuIG51bGxcbiAgdmFyIGN1ciA9IHN0YXJ0ICsgMVxuICB2YXIgY2hyXG4gIHdoaWxlKChjaHIgPSBzdHJbY3VyXSkgJiYgY2hyICE9PSBvcGVuKSB7XG4gICAgaWYoc3RyID09PSAnXFxcXCcpICsrY3VyXG4gICAgY3VyID0gY3VyICsgMVxuICB9XG5cbiAgaWYoc3RyW2N1cisrXSAhPT0gb3BlbikgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBzdHJpbmcgdG8gYmUgY2xvc2VkJylcbiAgcmV0dXJuIG5ldyBOb2RlKFxuICAgICdzdHJpbmcnLFxuICAgIFtzdGFydCwgY3VyXSxcbiAgICBzdHIsXG4gICAgbnVsbCxcbiAgICB0cnVlLFxuICAgIHN0ci5zbGljZShzdGFydCArIDEsIGN1ciAtIDEpXG4gIClcbn1cblxuZnVuY3Rpb24gbnVtYmVyKHN0ciwgc3RhcnQpIHtcbiAgdmFyIGRlY2ltYWwgPSBmYWxzZVxuICB2YXIgY3VyID0gc3RhcnRcbiAgdmFyIGNoclxuICB3aGlsZShjaHIgPSBzdHJbY3VyXSkge1xuICAgIGlmKGNociA9PT0gJy4nKSB7XG4gICAgICBpZihkZWNpbWFsKSBicmVha1xuICAgICAgZGVjaW1hbCA9IHRydWVcbiAgICAgIGN1ciA9IGN1ciArIDFcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmKGNociA8ICcwJyB8fCBjaHIgPiAnOScpIGJyZWFrXG4gICAgY3VyID0gY3VyICsgMVxuICB9XG5cbiAgcmV0dXJuIGN1ciAtIHN0YXJ0ID8gbmV3IE5vZGUoXG4gICAgJ251bWJlcicsXG4gICAgW3N0YXJ0LCBjdXJdLFxuICAgIHN0cixcbiAgICBudWxsLFxuICAgIHRydWUsXG4gICAgcGFyc2VJbnQoc3RyLnNsaWNlKHN0YXJ0LCBjdXIpLCAxMClcbiAgKSA6IG51bGxcbn1cblxuZnVuY3Rpb24gbGFiZWwoc3RyLCBzdGFydCkge1xuICB2YXIgY2hyID0gc3RyW3N0YXJ0XVxuICBpZihjaHIgPCAwIHx8IGNociA+IDkgfHwgcmVzZXJ2ZWRDaGFyYWN0ZXJzLmluZGV4T2YoY2hyKSAhPT0gLTEpIHJldHVybiBudWxsXG4gIHZhciBjdXIgPSBzdGFydCArIDFcblxuICB3aGlsZShjaHIgPSBzdHJbY3VyXSkge1xuICAgIGlmKHJlc2VydmVkQ2hhcmFjdGVycy5pbmRleE9mKGNocikgIT09IC0xKSBicmVha1xuICAgIGN1ciA9IGN1ciArIDFcbiAgfVxuXG4gIHJldHVybiBuZXcgTm9kZSgnbGFiZWwnLCBbc3RhcnQsIGN1cl0sIHN0ciwgbnVsbClcbn1cblxuZnVuY3Rpb24gYXJyYXkoc3RyLCBzdGFydCkge1xuICBpZihzdHJbc3RhcnRdICE9PSAnWycpIHJldHVybiBudWxsXG4gIHZhciBjdXIgPSBzdGFydCArIDFcbiAgdmFyIGNoaWxkcmVuID0gW11cbiAgdmFyIG5leHRcbiAgdmFyIGVuZHMgPSBbJywnLCAnXSddXG4gIHdoaWxlKG5leHQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgY3VyLCBlbmRzKSkge1xuICAgIGNoaWxkcmVuLnB1c2gobmV4dClcbiAgICBjdXIgPSBuZXh0LnJhbmdlWzFdXG4gICAgd2hpbGUoZW5kcy5pbmRleE9mKHN0cltjdXJdKSA9PT0gLTEpIGN1ciA9IGN1ciArIDFcbiAgICBpZihzdHJbY3VyXSA9PT0gJ10nKSBicmVha1xuICAgIGN1ciA9IGN1ciArIDFcbiAgfVxuXG4gIHJldHVybiBuZXcgTm9kZSgnYXJyYXknLCBbc3RhcnQsIGN1ciArIDFdLCBzdHIsIHtcbiAgICBjaGlsZHJlbjogY2hpbGRyZW4sXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGdyb3VwKHN0ciwgc3RhcnQpIHtcbiAgaWYoc3RyW3N0YXJ0XSAhPT0gJygnKSByZXR1cm4gbnVsbFxuXG4gIHZhciBub2RlID0gdHJpbShzdHIsIGV4cHJlc3Npb24sIHN0YXJ0ICsgMSwgWycpJ10pXG4gIHZhciBlbmQgPSBub2RlLnJhbmdlWzFdXG4gIHdoaWxlKHdoaXRlc2FwY2UuaW5kZXhPZihzdHJbZW5kXSkgIT09IC0xKSBlbmQgPSBlbmQgKyAxXG4gIHJldHVybiBuZXcgTm9kZSgnZ3JvdXAnLCBbc3RhcnQsIGVuZCArIDFdLCBzdHIsIHtcbiAgICBleHByZXNzaW9uOiBub2RlXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGhlbHBlcihsZWZ0LCBzdHIsIHN0YXJ0LCBlbmQpIHtcbiAgaWYobGVmdC50eXBlICE9PSAnbGFiZWwnIHx8IHN0cltzdGFydF0gIT09ICcoJykgcmV0dXJuXG4gIHZhciBjdXIgPSBzdGFydCArIDFcbiAgdmFyIGNoaWxkcmVuID0gW11cbiAgdmFyIG5leHRcbiAgdmFyIGVuZHMgPSBbJywnLCAnKSddXG4gIHdoaWxlKG5leHQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgY3VyLCBlbmRzKSkge1xuICAgIGNoaWxkcmVuLnB1c2gobmV4dClcbiAgICBjdXIgPSBuZXh0LnJhbmdlWzFdXG4gICAgd2hpbGUoZW5kcy5pbmRleE9mKHN0cltjdXJdKSA9PT0gLTEpIGN1ciA9IGN1ciArIDFcbiAgICBpZihzdHJbY3VyXSA9PT0gJyknKSBicmVha1xuICAgIGN1ciA9IGN1ciArIDFcbiAgfVxuXG4gIGN1ciA9IGN1ciArIDFcblxuICByZXR1cm4gbmV3IE5vZGUoJ2hlbHBlcicsIFtsZWZ0LnJhbmdlWzBdLCBjdXJdLCBzdHIsIHtcbiAgICBsZWZ0OiBsZWZ0LFxuICAgIGNoaWxkcmVuOiBjaGlsZHJlbixcbiAgfSlcbn1cblxuZnVuY3Rpb24gbWVtYmVyKGxlZnQsIHN0ciwgc3RhcnQpIHtcbiAgaWYoc3RyW3N0YXJ0XSAhPT0gJy4nKSByZXR1cm4gbnVsbFxuICB2YXIgbm9kZSA9IGxhYmVsKHN0ciwgc3RhcnQgKyAxKVxuXG4gIGlmKCFub2RlKSB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIExhYmVsJylcbiAgcmV0dXJuIG5ldyBOb2RlKCdtZW1iZXInLCBbbGVmdC5yYW5nZVswXSwgbm9kZS5yYW5nZVsxXV0sIHN0ciwge1xuICAgIGxlZnQ6IGxlZnQsXG4gICAgcmlnaHQ6IG5vZGUsXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGluZGV4KGxlZnQsIHN0ciwgc3RhcnQpIHtcbiAgaWYoc3RyW3N0YXJ0XSAhPT0gJ1snKSByZXR1cm4gbnVsbFxuICB2YXIgbm9kZSA9IHRyaW0oc3RyLCBleHByZXNzaW9uLCBzdGFydCArIDEsIFsnXSddKVxuICB2YXIgZW5kID0gbm9kZS5yYW5nZVsxXSArIDFcbiAgd2hpbGUod2hpdGVzYXBjZS5pbmRleE9mKHN0cltlbmRdKSAhPT0gLTEpIGVuZCA9IGVuZCArIDFcbiAgcmV0dXJuIG5ldyBOb2RlKCdpbmRleCcsIFtsZWZ0LnJhbmdlWzBdLCBlbmRdLCBzdHIsIHtcbiAgICBsZWZ0OiBsZWZ0LFxuICAgIHJpZ2h0OiBub2RlLFxuICB9KVxufVxuXG5mdW5jdGlvbiB1bmFyeShzdHIsIHN0YXJ0LCBlbmQpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHVuYXJ5T3BlcmF0b3JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHZhciBvcCA9IHVuYXJ5T3BlcmF0b3JzW2ldXG4gICAgZm9yKHZhciBqID0gMCwgbDIgPSBvcC5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICBpZihzdHJbc3RhcnQgKyBqXSAhPT0gb3Bbal0pIGJyZWFrXG4gICAgfVxuXG4gICAgaWYoaiA9PT0gbDIpIGJyZWFrXG4gIH1cblxuICBpZihpID09PSBsKSByZXR1cm4gbnVsbFxuICB2YXIgbGVuID0gb3AubGVuZ3RoXG4gIHZhciBuZXh0ID0gc3RyW3N0YXJ0ICsgbGVuXVxuICBpZihsZW4gPiAxICYmIGJvdW5kYXJ5LmluZGV4T2YobmV4dCkgPT09ICctMScpIHJldHVybiBudWxsXG4gIHZhciBjaGlsZCA9IHRyaW0oc3RyLCBleHByZXNzaW9uLCBzdGFydCArIGxlbiwgZW5kKVxuICB2YXIgbm9kZSA9IG5ldyBOb2RlKCd1bmFyeScsIFtzdGFydCwgY2hpbGQucmFuZ2VbMV1dLCBzdHIsIHtcbiAgICBvcDogb3AsXG4gICAgcmlnaHQ6IGNoaWxkLFxuICAgIHByZXNpZGVuY2U6IDRcbiAgfSlcblxuICBpZihjaGlsZC5wcmVzaWRlbmNlICYmIGNoaWxkLnByZXNpZGVuY2UgPiA0KSB7XG4gICAgbm9kZS5yaWdodCA9IGNoaWxkLmxlZnRcbiAgICBjaGlsZC5sZWZ0ID0gbm9kZVxuICAgIHJldHVybiBjaGlsZFxuICB9XG5cbiAgcmV0dXJuIG5vZGVcbn1cblxuZnVuY3Rpb24gYmluYXJ5KGxlZnQsIHN0ciwgc3RhcnQsIGVuZCkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gc29ydGVkQmluYXJ5T3BlcmF0b3JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHZhciBvcCA9IHNvcnRlZEJpbmFyeU9wZXJhdG9yc1tpXVxuICAgIGZvcih2YXIgaiA9IDAsIGwyID0gb3AubGVuZ3RoOyBqIDwgbDI7ICsraikge1xuICAgICAgaWYoc3RyW3N0YXJ0ICsgal0gIT09IG9wW2pdKSBicmVha1xuICAgIH1cblxuICAgIGlmKGogPT09IGwyKSBicmVha1xuICB9XG5cbiAgaWYoaSA9PT0gbCkgcmV0dXJuIG51bGxcbiAgaWYob3AgPT09ICdpbicgfHwgb3AgPT09ICdpbnN0YW5jZW9mJykge1xuICAgIHZhciBuZXh0ID0gc3RyW3N0YXJ0ICsgb3AubGVuZ3RoXVxuICAgIGlmKGJvdW5kYXJ5LmluZGV4T2YobmV4dCkgPT09IC0xKSByZXR1cm4gbnVsbFxuICB9XG5cbiAgdmFyIHByZXNpZGVuY2UgPSBiaW5hcnlPcGVyYXRvcnNbb3BdXG4gIHZhciByaWdodCA9IHRyaW0oc3RyLCBleHByZXNzaW9uLCBzdGFydCArIG9wLmxlbmd0aCwgZW5kKVxuICB2YXIgbm9kZSA9IG5ldyBOb2RlKCdiaW5hcnknLCBbbGVmdC5yYW5nZVswXSwgcmlnaHQucmFuZ2VbMV1dLCBzdHIsIHtcbiAgICBvcDogb3AsXG4gICAgbGVmdDogbGVmdCxcbiAgICByaWdodDogcmlnaHQsXG4gICAgcHJlc2lkZW5jZTogcHJlc2lkZW5jZVxuICB9KVxuXG4gIGlmKHJpZ2h0LnByZXNpZGVuY2UgJiYgcmlnaHQucHJlc2lkZW5jZSA+PSBwcmVzaWRlbmNlKSB7XG4gICAgbm9kZS5yaWdodCA9IHJpZ2h0LmxlZnRcbiAgICByaWdodC5sZWZ0ID0gbm9kZVxuICAgIHJldHVybiByaWdodFxuICB9XG5cbiAgcmV0dXJuIG5vZGVcbn1cblxuZnVuY3Rpb24gdGVybmFyeShjb25kaXRpb24sIHN0ciwgc3RhcnQsIGVuZCkge1xuICBpZihzdHJbc3RhcnRdICE9PSAnPycpIHJldHVybiBudWxsXG4gIHZhciBvayA9IHRyaW0oc3RyLCBleHByZXNzaW9uLCBzdGFydCArIDEsIFsnOiddKVxuICBpZighb2spIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgdG9rZW46IFwiOlwiJylcbiAgdmFyIG5leHQgPSBvay5yYW5nZVsxXSArIDFcbiAgd2hpbGUod2hpdGVzYXBjZS5pbmRleE9mKHN0cltuZXh0XSkgIT09IC0xKSBuZXh0ID0gbmV4dCArIDFcbiAgdmFyIG5vdCA9IHRyaW0oc3RyLCBleHByZXNzaW9uLCBuZXh0ICsgMSwgZW5kKVxuXG4gIHJldHVybiBuZXcgTm9kZSgndGVybmFyeScsIFtjb25kaXRpb24ucmFuZ2VbMF0sIG5vdC5yYW5nZVsxXV0sIHN0ciwge1xuICAgIGxlZnQ6IGNvbmRpdGlvbixcbiAgICBtaWRkbGU6IG9rLFxuICAgIHJpZ2h0OiBub3QsXG4gICAgcHJlc2lkZW5jZTogMTVcbiAgfSlcbn1cblxuZnVuY3Rpb24gdHJpbShzdHIsIHBhcnNlLCBzdGFydCwgZW5kKSB7XG4gIHdoaWxlKGNociA9IHN0cltzdGFydF0pIHtcbiAgICBpZih3aGl0ZXNhcGNlLmluZGV4T2YoY2hyKSA9PT0gLTEpIGJyZWFrXG4gICAgc3RhcnQgPSBzdGFydCArIDFcbiAgfVxuXG4gIHJldHVybiBwYXJzZShzdHIsIHN0YXJ0LCBlbmQgfHwgW3VuZGVmaW5lZF0pXG59XG5cbmZ1bmN0aW9uIE5vZGUodHlwZSwgcmFuZ2UsIHN0ciwgZGF0YSwgbGl0dGVyYWwsIHZhbCkge1xuICB0aGlzLnR5cGUgPSB0eXBlXG4gIHRoaXMucmFuZ2UgPSByYW5nZVxuICB0aGlzLnZhbHVlID0gc3RyLnNsaWNlKHJhbmdlWzBdLCByYW5nZVsxXSlcbiAgdGhpcy5kYXRhID0gZGF0YVxuICB0aGlzLmxpdHRlcmFsID0gISFsaXR0ZXJhbFxuICB0aGlzLnJhd1ZhbHVlID0gdmFsXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlbW92ZVxuXG5mdW5jdGlvbiByZW1vdmUoX2xvb2t1cCwgaGFuZGxlcikge1xuICBpZighdGhpcy53YXRjaC5zZWVuW19sb29rdXBdKSByZXR1cm5cbiAgdmFyIGxvb2t1cCA9IHRoaXMud2F0Y2guc2VlbltfbG9va3VwXS52YWx1ZVxuICB2YXIgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzW2xvb2t1cF1cblxuICBpZighaGFuZGxlcnMpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBpbmRleFxuICBpZigoaW5kZXggPSBoYW5kbGVycy51cGRhdGUuaW5kZXhPZihoYW5kbGVyKSkgIT09IC0xKSB7XG4gICAgaGFuZGxlcnMudXBkYXRlLnNwbGljZShpbmRleCwgMSlcbiAgfVxuXG4gIGlmKChpbmRleCA9IGhhbmRsZXJzLmFsd2F5cy5pbmRleE9mKGhhbmRsZXIpKSAhPT0gLTEpIHtcbiAgICBoYW5kbGVycy5hbHdheXMuc3BsaWNlKGluZGV4LCAxKVxuICB9XG5cbiAgaWYoaGFuZGxlcnMuYWx3YXlzLmxlbmd0aCB8fCBoYW5kbGVycy51cGRhdGUubGVuZ3RoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBkZWxldGUgdGhpcy5oYW5kbGVyc1tsb29rdXBdXG4gIHJlbW92ZUV4cHJlc3Npb24odGhpcywgdGhpcy5leHByZXNzaW9ucy5tYXBbbG9va3VwXSlcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXhwcmVzc2lvbihzZWxmLCBleHByZXNzaW9uKSB7XG4gIGlmKGV4cHJlc3Npb24uZGVwZW5kZW50cy5sZW5ndGggfHwgIWV4cHJlc3Npb24ucmVtb3ZhYmxlKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuXG4gIGRlbGV0ZSBzZWxmLmV4cHJlc3Npb25zLm1hcFtleHByZXNzaW9uLmxvb2t1cF1cblxuICB2YXIgbGlzdCA9IGV4cHJlc3Npb24udHlwZSA9PT0gJ2xhYmVsJyA/IHNlbGYud2F0Y2hlZCA6IHNlbGYuZXhwcmVzc2lvbnMubGlzdFxuICB2YXIgaW5kZXggPSBsaXN0LmluZGV4T2YoZXhwcmVzc2lvbilcblxuICBpZihpbmRleCAhPT0gLTEpIHtcbiAgICBsaXN0LnNwbGljZShpbmRleCwgMSlcbiAgfVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBleHByZXNzaW9uLmRlcHMubGVuZ3RoLCBkZXA7IGkgPCBsOyArK2kpIHtcbiAgICBkZXAgPSBleHByZXNzaW9uLmRlcHNbaV1cbiAgICBkZXAuZGVwZW5kZW50cy5zcGxpY2UoZGVwLmRlcGVuZGVudHMuaW5kZXhPZihleHByZXNzaW9uKSwgMSlcbiAgICBpZighc2VsZi5oYW5kbGVyc1tkZXAubG9va3VwXSkgcmVtb3ZlRXhwcmVzc2lvbihzZWxmLCBkZXApXG4gIH1cbn1cbiIsInZhciBFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJylcbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL3BhcnNlJylcbnZhciBidWlsZCA9IHJlcXVpcmUoJy4vYnVpbGQnKVxuXG52YXIgc2VlbiA9IHt9XG5cbm1vZHVsZS5leHBvcnRzID0gd2F0Y2hcbm1vZHVsZS5leHBvcnRzLnNlZW4gPSBzZWVuXG5cbmZ1bmN0aW9uIHdhdGNoKGxvb2t1cCkge1xuICB2YXIgcGFyc2VkID0gc2Vlbltsb29rdXBdIHx8IChzZWVuW2xvb2t1cF0gPSBQYXJzZXIucGFyc2UobG9va3VwKSlcblxuICByZXR1cm4gd2F0Y2hOb2RlLmNhbGwodGhpcywgcGFyc2VkKVxufVxuXG5mdW5jdGlvbiB3YXRjaE5vZGUobm9kZSwgcGFyZW50KSB7XG4gIHZhciBleHBcblxuICBpZihub2RlLnR5cGUgPT09ICdsYWJlbCcpIHtcbiAgICBleHAgPSBhZGRMYWJlbC5jYWxsKHRoaXMsIG5vZGUpXG4gIH0gZWxzZSBpZihub2RlLnR5cGUgPT09ICdoZWxwZXInKSB7XG4gICAgZXhwID0gYWRkSGVscGVyLmNhbGwodGhpcywgbm9kZSlcbiAgfSBlbHNlIHtcbiAgICBleHAgPSBhZGRFeHByZXNzaW9uLmNhbGwodGhpcywgbm9kZSlcbiAgfVxuXG4gIGlmKHBhcmVudCkge1xuICAgIHBhcmVudC5hZGREZXAoZXhwKVxuICB9XG5cbiAgcmV0dXJuIGV4cFxufVxuXG5mdW5jdGlvbiBhZGRMYWJlbChsYWJlbCwgcGFyZW50KSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIga2V5ID0gbGFiZWwudmFsdWVcbiAgaWYodGhpcy5leHByZXNzaW9ucy5tYXBba2V5XSkge1xuICAgIHJldHVybiB0aGlzLmV4cHJlc3Npb25zLm1hcFtrZXldXG4gIH1cbiAgdmFyIGV4cCA9IG5ldyBFeHByZXNzaW9uKGtleSwgJ2xhYmVsJywgbG9va3VwKVxuICB0aGlzLndhdGNoZWQucHVzaChleHApXG4gIHRoaXMuZXhwcmVzc2lvbnMubWFwW2tleV0gPSBleHBcbiAgZXhwLnVwZGF0ZSgpXG4gIGlmKHBhcmVudCkgcGFyZW50LmFkZERlcChleHApXG4gIGV4cC5jaGFuZ2VkID0gZmFsc2VcblxuICByZXR1cm4gZXhwXG5cbiAgZnVuY3Rpb24gbG9va3VwKCkge1xuICAgIHRoaXMuc2V0VmFsdWUoXG4gICAgICAoc2VsZi5zdGF0ZSA9PT0gbnVsbCkgfHwgKHR5cGVvZiBzZWxmLnN0YXRlID09PSAndW5kZWZpbmVkJykgP1xuICAgICAgdW5kZWZpbmVkIDpcbiAgICAgIHNlbGYuc3RhdGVba2V5XVxuICAgIClcbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRFeHByZXNzaW9uKG5vZGUpIHtcbiAgdmFyIGxvb2t1cCA9IG5vZGUudmFsdWVcbiAgaWYodGhpcy5leHByZXNzaW9ucy5tYXBbbG9va3VwXSkge1xuICAgIHJldHVybiB0aGlzLmV4cHJlc3Npb25zLm1hcFtsb29rdXBdXG4gIH1cblxuICB2YXIgYnVpbHQgPSBidWlsZChub2RlKVxuXG4gIHZhciBleHAgPSBuZXcgRXhwcmVzc2lvbihcbiAgICBsb29rdXAsXG4gICAgJ2V4cHJlc3Npb24nLFxuICAgIHVwZGF0ZUV4cHJlc3Npb24oYnVpbHQuY29tcGlsZWQpXG4gIClcblxuICB0aGlzLmV4cHJlc3Npb25zLm1hcFtsb29rdXBdID0gZXhwXG4gIHRoaXMuZXhwcmVzc2lvbnMubGlzdC5wdXNoKGV4cClcbiAgYWRkRGVwcy5jYWxsKHRoaXMsIGV4cCwgYnVpbHQuZGVwcylcbiAgZXhwLnVwZGF0ZSgpXG4gIGV4cC5jaGFuZ2VkID0gZmFsc2VcblxuICByZXR1cm4gZXhwXG59XG5cbmZ1bmN0aW9uIGFkZERlcHMocGFyZW50LCBkZXBzKSB7XG4gIGZvcih2YXIgaSA9IDAsIGwgPSBkZXBzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGRlcHNbaV0ubGl0dGVyYWwpIHtcbiAgICAgIHBhcmVudC5kZXBWYWx1ZXNbaV0gPSBkZXBzW2ldLnJhd1ZhbHVlXG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIHdhdGNoTm9kZS5jYWxsKHRoaXMsIGRlcHNbaV0sIHBhcmVudClcbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRIZWxwZXIobm9kZSkge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgdmFyIGtleSA9IG5vZGUudmFsdWVcbiAgdmFyIG5hbWUgPSBub2RlLmRhdGEubGVmdC52YWx1ZVxuICBpZih0aGlzLmV4cHJlc3Npb25zLm1hcFtrZXldKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhwcmVzc2lvbnMubWFwW2tleV1cbiAgfVxuICB2YXIgaGVscGVyID0gdGhpcy5oZWxwZXJzW25hbWVdXG4gIGlmKCFoZWxwZXIpIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgaGFuZGxlcjogJyArIG5hbWUpXG4gIHZhciB1cGRhdGUgPSBoZWxwZXIoY2hhbmdlKVxuICB2YXIgZXhwID0gbmV3IEV4cHJlc3Npb24oa2V5LCAnaGVscGVyJywgZnVuY3Rpb24oYXJncykge1xuICAgIHVwZGF0ZS5hcHBseShudWxsLCBhcmdzKVxuICB9KVxuICB0aGlzLmV4cHJlc3Npb25zLm1hcFtrZXldID0gZXhwXG4gIHRoaXMuZXhwcmVzc2lvbnMubGlzdC5wdXNoKGV4cClcbiAgYWRkRGVwcy5jYWxsKHRoaXMsIGV4cCwgbm9kZS5kYXRhLmNoaWxkcmVuKVxuICB1cGRhdGUuYXBwbHkobnVsbCwgZXhwLmRlcFZhbHVlcylcbiAgZXhwLmNoYW5nZWQgPSBmYWxzZVxuXG4gIHJldHVybiBleHBcblxuICBmdW5jdGlvbiBjaGFuZ2UodmFsKSB7XG4gICAgaWYoc2VsZi51cGRhdGluZykgcmV0dXJuIGV4cC5zZXRWYWx1ZSh2YWwpXG4gICAgc2VsZi51cGRhdGluZyA9IHRydWVcbiAgICBleHAuc2V0VmFsdWUodmFsKVxuICAgIHNlbGYudXBkYXRpbmcgPSBmYWxzZVxuICAgIHNlbGYucmVwb3J0KClcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVFeHByZXNzaW9uKHJ1bikge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRWYWx1ZShydW4uYXBwbHkobnVsbCwgdGhpcy5kZXBWYWx1ZXMpKVxuICB9XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgdW5kZWZpbmVkO1xuXG52YXIgaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXHRpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nIHx8IG9iai5ub2RlVHlwZSB8fCBvYmouc2V0SW50ZXJ2YWwpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0dmFyIG9wdGlvbnMsIG5hbWUsIHNyYywgY29weSwgY29weUlzQXJyYXksIGNsb25lLFxuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1swXSxcblx0XHRpID0gMSxcblx0XHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRcdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICh0eXBlb2YgdGFyZ2V0ID09PSBcImJvb2xlYW5cIikge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fSBlbHNlIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB0YXJnZXQgIT09IFwiZnVuY3Rpb25cIiB8fCB0YXJnZXQgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKChvcHRpb25zID0gYXJndW1lbnRzW2ldKSAhPSBudWxsKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKG5hbWUgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbbmFtZV07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zW25hbWVdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKHRhcmdldCA9PT0gY29weSkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmIChkZWVwICYmIGNvcHkgJiYgKGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gQXJyYXkuaXNBcnJheShjb3B5KSkpKSB7XG5cdFx0XHRcdFx0aWYgKGNvcHlJc0FycmF5KSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGV4dGVuZChkZWVwLCBjbG9uZSwgY29weSk7XG5cblx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKGNvcHkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuIl19
