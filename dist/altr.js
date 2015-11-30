(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var extend = require('extend')

module.exports = altrExtend

function altrExtend (base, options) {
  var baseOptions = extend(true, base, options)
  var altr = this

  extension.render = altr.render.bind(altr, baseOptions)
  extension.extend = altr.extend.bind(altr)
  extension.addTag = altr.addTag.bind(altr)
  extension.include = altr.include.bind(altr)
  extension.addHelper = altr.addHelper.bind(altr)
  extension.addDecorator = altr.addDecorator.bind(altr)

  return extension

  function extension (root, state, options) {
    return altr(root, state, extend(
        true
      , Object.create(baseOptions)
      , options || {}
    ))
  }
}

},{"extend":37}],2:[function(require,module,exports){
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

function altr (root, data, _options) {
  if (!(this instanceof altr)) {
    return new altr(root, data, _options) // eslint-disable-line new-cap
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
  this.lookups = dirtybit(data, {helpers: this.helpers}, {})

  this.batch = batch(function () {
    if (!this.sync) {
      raf(this.runBatch.bind(this))
    }
  }.bind(this))

  if (global.Buffer && root instanceof global.Buffer) {
    root = root.toString()
  }

  if (typeof root === 'string') {
    var temp = this.document.createElement('div')

    temp.innerHTML = root
    this.root = this.document.createDocumentFragment()

    while (temp.firstChild) {
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

function update (data, sync) {
  this.state = data
  this.lookups.update(data)

  if (sync || this.sync) {
    this.runBatch()
  }
}

function initNodes (_nodes, _lookups, state, scope) {
  var altr = this
  var lookups = _lookups || dirtybit(state, {helpers: this.helpers}, scope || {})
  var nodes = Array.prototype.slice.call(_nodes)
  var hooks = nodes.reduce(join, []).filter(Boolean)

  return {hooks: hooks, lookups: lookups, nodes: nodes}

  function join (list, node) {
    var hooks = initNode.call(altr, lookups, node)

    return hooks ? list.concat(hooks) : list
  }
}

function initNode (lookups, el) {
  return node_handlers[el.nodeType]
    ? node_handlers[el.nodeType].call(this, el, lookups)
    : el.childNodes && el.childNodes.length
    ? this.initNodes(lookups, el.childNodes)
    : null
}

function rootNodes () {
  return this.root.nodeType === this.document.DOCUMENT_FRAGMENT_NODE
    ? [].slice.call(this.root.childNodes)
    : [this.root]
}

function addHelper (name, helper) {
  this.helpers[name] = helper
}

function addTag (attr, tag) {
  this.prototype.tags[attr] = tag
  this.prototype.tagList.push({
    attr: attr,
    constructor: tag
  })
}

function appendTo (node) {
  var rootNodes = this.rootNodes()

  for (var i = 0, l = rootNodes.length; i < l; ++i) {
    node.appendChild(getEl(rootNodes[i]))
  }
}

function addDecorator (name, fn) {
  this.decorators[name] = fn
}

function runBatch () {
  this.batch.run() && this.emit('update', this.state)
}

function makeTagRegExp (_delimiters) {
  var delimiters = _delimiters || ['{{', '}}']

  return new RegExp(delimiters[0] + '\\s*(.*?)\\s*' + delimiters[1])
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./altr-extend":1,"./destroy":6,"./element-node":7,"./get-element":8,"./merge-hooks":10,"./raf":11,"./remove":12,"./render":13,"./run-hooks":14,"./template-string":25,"./text-node":26,"./to-string":27,"batch-queue":28,"dirtybit":32,"events":38,"extend":37}],3:[function(require,module,exports){
module.exports.raw = rawAttribute
module.exports.altr = altrAttribute
module.exports.prop = altrProperty

function rawAttribute (el, attr, lookups) {
  this.templateString(
      attr.value
    , this.batch.add(el.setAttribute.bind(el, attr.name))
    , lookups
  )
}

function altrAttribute (el, attr, lookups) {
  var name = attr.name.slice('altr-attr-'.length)

  lookups.on(attr.value, this.batch.add(update))
  el.removeAttribute(attr.name)

  function update (val) {
    if (!val && val !== '' && val !== 0) {
      return el.removeAttribute(name)
    }

    el.setAttribute(name, val)
  }
}

function altrProperty (el, attr, lookups) {
  var name = attr.name.slice('altr-prop-'.length)

  el.removeAttribute(attr.name)
  lookups.on(attr.value, this.batch.add(update))

  function update (val) {
    el[name] = val
  }
}

},{}],4:[function(require,module,exports){
(function (global){
module.exports = global.altr = require('./index')

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./index":9}],5:[function(require,module,exports){
module.exports = decorators

function decorators (el, attrs, lookups) {
  var altr = this

  return attrs.map(createDecorator)

  function createDecorator (attr) {
    var decorator = altr.decorators[attr.name].call(altr, el)
    var expression = '[' + attr.value + ']'

    if (!decorator) {
      return
    }

    var hooks = {insert: decorator.insert, remove: decorator.remove}

    if (decorator.update) {
      lookups.on(expression, update)
    }

    hooks.destroy = destroy

    return hooks

    function destroy () {
      if (decorator.update) lookups.removeListener(expression, update)

      if (decorator.destroy) {
        decorator.destroy()
      }
    }

    function update (args) {
      decorator.update.apply(null, args)
    }
  }
}

},{}],6:[function(require,module,exports){
module.exports = destroy

function destroy (children, el, done) {
  var altr = this

  altr.remove(children, el, function (el) {
    altr.runHooks(children, 'destroy', el)
    done()
  })
}

},{}],7:[function(require,module,exports){
var createDecorators = require('./decorators')
var createAttr = require('./attributes')

module.exports = createElementNode

function createElementNode (el, lookups) {
  var decorators = []
  var altr = this
  var attr

  var attrs = Array.prototype.slice.call(el.attributes)
  var altr_tags = {}

  for (var i = 0, l = attrs.length; i < l; ++i) {
    if (altr.tags[attrs[i].name]) {
      altr_tags[attrs[i].name] = attrs[i].value
    } else if (altr.decorators[attrs[i].name]) {
      decorators.push(attrs[i])
    } else if (!attrs[i].name.lastIndexOf('altr-attr-', 0)) {
      createAttr.altr.call(this, el, attrs[i], lookups)
    } else if (!attrs[i].name.lastIndexOf('altr-prop-', 0)) {
      createAttr.prop.call(this, el, attrs[i], lookups)
    } else {
      createAttr.raw.call(this, el, attrs[i], lookups)
    }
  }

  var hooks = createDecorators.call(altr, el, decorators, lookups)

  for (i = 0, l = altr.tagList.length; i < l; ++i) {
    if ((attr = altr_tags[altr.tagList[i].attr])) {
      return hooks.concat([
        altr.tagList[i].constructor.call(altr, el, attr, lookups, hooks) || {}
      ])
    }
  }

  return hooks.concat(altr.initNodes(el.childNodes, lookups).hooks)
}

},{"./attributes":3,"./decorators":5}],8:[function(require,module,exports){
module.exports = get

function get (_el) {
  var el = _el

  while (el && el._altrPlaceholder) {
    el = el._altrPlaceholder

    if (el === _el) {
      throw new Error('placeholder circular refference')
    }
  }

  return el
}

},{}],9:[function(require,module,exports){
var placeholder = require('./tags/placeholder')
var childrenTag = require('./tags/children')
var includeTag = require('./tags/include')
var textTag = require('./tags/text')
var htmlTag = require('./tags/html')
var withTag = require('./tags/with')
var forTag = require('./tags/for')
var rawTag = require('./tags/raw')
var ifTag = require('./tags/if')
var altr = require('./altr')

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

function merge (children) {
  var altr = this

  return {
    insert: each.bind(null, 'insert'),
    destroy: each.bind(null, 'destroy'),
    remove: remove
  }

  function each (type, el) {
    var nodes = children()

    for (var i = 0, l = nodes.length; i < l; i++) {
      nodes[i][type] && nodes[i][type](el)
    }
  }

  function remove (el, ready) {
    altr.remove(children(), el, ready)
  }
}

},{}],11:[function(require,module,exports){
(function (global){
module.exports = requestAnimationFrame

function requestAnimationFrame (callback) {
  var raf = global.requestAnimationFrame ||
    global.webkitRequestAnimationFrame ||
    global.mozRequestAnimationFrame ||
    timeout

  return raf(callback)

  function timeout (callback) {
    return setTimeout(callback, 1000 / 60)
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],12:[function(require,module,exports){
module.exports = remove

function remove (hooks, el, ready) {
  var remaining = hooks.length

  for (var i = 0, l = remaining; i < l; i++) {
    hooks[i].remove ? hooks[i].remove(el, done) : --remaining
  }

  if (!remaining) {
    ready()
  }

  function done () {
    if (!--remaining) {
      remaining = -1
      ready()
    }
  }
}

},{}],13:[function(require,module,exports){
module.exports = render

function render (template, state, el) {
  if (this.includes[template]) {
    template = this.includes[template]
  }

  var instance = this(template)

  instance.update(state || {}, true)

  if (el) {
    instance.into(el)
  }

  return instance
}

},{}],14:[function(require,module,exports){
module.exports = runHooks

function runHooks (hooks, type, el) {
  for (var i = 0, l = hooks.length; i < l; i++) {
    hooks[i][type] && hooks[i][type](el)
  }
}

},{}],15:[function(require,module,exports){
var get = require('./get-element')

module.exports = setChildren

function setChildren (root, nodes) {
  var prev = null
  var el

  for (var i = nodes.length - 1; i >= 0; --i) {
    el = get(nodes[i])
    root.insertBefore(el, prev)
    prev = el
  }

  while ((el = root.firstChild) !== prev) {
    root.removeChild(el)
  }
}

},{"./get-element":8}],16:[function(require,module,exports){
var setChildren = require('../set-children')

module.exports = children

function children (el, getter, lookups) {
  var current = []

  el.innerHTML = ''
  this.batch.add(lookups.on(getter, update.bind(this)))

  function update (val) {
    var nodes = (Array.isArray(val) ? val : [val]).filter(is_node)

    for (var i = 0, l = nodes.length; i < l; ++i) {
      if (nodes[i] !== current[i]) {
        break
      }
    }

    if (i === nodes.length === current.length) {
      return
    }

    current = nodes
    setChildren.call(this, el, current)
  }
}

function is_node (el) {
  return el && el.nodeType
}

},{"../set-children":15}],17:[function(require,module,exports){
var setChildren = require('../set-children')
var forRegexp = /^(.*?)\s+in\s+(.*$)/

module.exports = forHandler

function forHandler (root, args, lookups) {
  var template = root.cloneNode(true)
  var parts = args.match(forRegexp)
  var domNodes = []
  var children = []
  var altr = this
  var items = []

  if (!parts) {
    return console.error('invalid `for` tag: ' + args)
  }

  var runUpdates = altr.batch.add(runDomUpdates)

  root.innerHTML = ''

  var unique = parts[1].split(':')[1]
  var prop = parts[1].split(':')[0]
  var key = parts[2]

  lookups.on(key, update)
  lookups.on('this', updateChildren)

  return altr.mergeHooks(function () {
    return flatten(children)
  })

  function updateChildren (data) {
    for (var i = 0, l = children.length; i < l; ++i) {
      var scope = children[i].lookups.scope
      scope[prop] = items[i]
      scope.$index = i
      children[i].lookups.update(data)
    }
  }

  function update (newItems) {
    var i, l
    if (!Array.isArray(newItems)) {
      newItems = []
    }

    var newChildren = new Array(newItems.length)
    var removed = []
    var matched = {}
    var added = []
    var index

    domNodes = []

    for (i = 0, l = newItems.length; i < l; ++i) {
      index = findIndex(items, newItems[i], unique)

      if (index !== -1) {
        newChildren[i] = children[index]
        items[index] = children[index] = matched
      } else {
        added.push(newChildren[i] = makeChild())
      }

      domNodes = domNodes.concat(newChildren[i].nodes)
    }

    for (i = 0, l = children.length; i < l; ++i) {
      if (children[i] !== matched) {
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

  function findIndex (items, d, unique) {
    if (!unique) {
      return items.indexOf(d)
    }

    for (var i = 0, l = items.length; i < l; ++i) {
      if (items[i][unique] === d[unique]) {
        return i
      }
    }

    return -1
  }

  function makeChild () {
    var scope = Object.create(lookups.scope)
    scope.$index = undefined
    scope[prop] = undefined
    return altr.initNodes(template.cloneNode(true).childNodes, null, null, scope)
  }

  function runDomUpdates (children, added) {
    setChildren.call(this, root, children)
    altr.runHooks(added, 'insert', root)
  }
}

function flatten (list) {
  return list.reduce(function (all, part) {
    return part.hooks ? all.concat(part.hooks) : all
  }, [])
}

},{"../set-children":15}],18:[function(require,module,exports){
module.exports = html

function html (el, accessor, lookups) {
  this.batch.add(lookups.on(accessor, update))

  function update (val) {
    el.innerHTML = typeof val === 'undefined' ? '' : val

    if (el.getAttribute('altr-run-scripts')) {
      [].forEach.call(el.getElementsByTagName('script'), run)
    }
  }
}

function run (script) {
  var fixed = document.createElement('script')
  var parent = script.parentNode
  var attrs = script.attributes

  for (var i = 0, l = attrs.length; i < l; ++i) {
    fixed.setAttribute(attrs[i].name, attrs[i].value)
  }

  fixed.textContent = script.textContent
  parent.insertBefore(fixed, script)
  parent.removeChild(script)
}

},{}],19:[function(require,module,exports){
(function (global){
module.exports = ifTag

function ifTag (el, getter, lookups, decorators) {
  var placeholder = this.document.createComment('altr-if-placeholder')
  var children = this.initNodes(el.childNodes, null, null, lookups.scope)
  var all = children.hooks.concat(decorators)
  var lastVal = null
  var hidden = null
  var first = true
  var altr = this

  global.lookups = children.lookups

  var update = this.batch.add(function (show, origin) {
    if (!hidden && !show) {
      el.parentNode.replaceChild(placeholder, el)
      el._altrPlaceholder = placeholder
      hidden = true
    } else if (hidden && show) {
      placeholder.parentNode.replaceChild(el, placeholder)
      altr.runHooks(all, 'insert', origin)
      delete el._altrPlaceholder
      hidden = false
    } else if (first) {
      first = false
      altr.runHooks(all, 'insert', origin)
    }
  })

  lookups.on('[' + getter + ', this]', toggle)

  return {
    insert: insert,
    remove: remove,
    destroy: destroy
  }

  function destroy (el) {
    altr.runHooks(children.hooks, 'destroy', el)
  }

  function toggle (args) {
    lastVal = !!args[0]

    if (lastVal) {
      update(true, el)
      children.lookups.update(args[1])
    } else {
      altr.remove(all, el, function () {
        return update(false, el)
      })
    }
  }

  function insert (el) {
    if (lastVal) {
      update(true, el)
    }
  }

  function remove (el, done) {
    if (hidden) {
      done()

      return update(false)
    }

    altr.remove(children.hooks, el, function () {
      update(false)
      done()
    })
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],20:[function(require,module,exports){
module.exports = include

function include (el, getter, lookups) {
  var removeListeners = []
  var children = null
  var content = ''
  var altr = this

  lookups.on(getter, set)
  lookups.on('this', update)

  return {insert: insert, remove: remove, destroy: destroy}

  function set (data) {
    content = typeof data === 'string' ? data : ''
    if (children) remove(el, insert)
  }

  function insert () {
    if (children) {
      return
    }

    el.innerHTML = content
    children = altr.initNodes(el.childNodes, null, lookups.state, lookups.scope)
  }

  function remove (el, done) {
    if (!children) {
      return done()
    }

    if (removeListeners.push(done) > 1) {
      return
    }

    altr.destroy(children, el, function () {
      var listener

      if (!children) {
        el.innerHTML = ''
      }

      while ((listener = removeListeners.pop())) {
        listener()
      }
    })

    children = null
  }

  function update (state) {
    children && children.lookups.update(state)
  }

  function destroy () {
    lookups.removeListener('this', update)
    lookups.removeListener(getter, set)
  }
}

},{}],21:[function(require,module,exports){
module.exports = placeholder

function placeholder (original, getter, lookups) {
  var current = original

  this.batch.add(lookups.on(getter, update))

  function update (val) {
    if (!val || !val.nodeName || val === current) {
      return
    }

    current.parentNode.replaceChild(val, current)
    original._altrPlaceholder = val
    current = val
  }
}

},{}],22:[function(require,module,exports){
module.exports = function raw () {}

},{}],23:[function(require,module,exports){
module.exports = text

function text (el, getter, lookups) {
  this.batch.add(lookups.on(getter, update))

  function update (val) {
    el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],24:[function(require,module,exports){
module.exports = withTag

function withTag (el, getter, lookups) {
  var children = this.initNodes(el.childNodes)
  var parts = getter.split(' as ')

  lookups.on(parts[0], update)

  return children.hooks

  function update (_val) {
    var val = Object.create(lookups.state)

    val[parts[1]] = _val
    children.lookups.update(val)
  }
}

},{}],25:[function(require,module,exports){
module.exports = templatString

function templatString (template, change, lookups) {
  if (!template.match(this.tagRegExp)) {
    return
  }

  var remaining = template
  var parts = []
  var index
  var next

  while (remaining && (next = remaining.match(this.tagRegExp))) {
    if ((index = remaining.indexOf(next[0]))) {
      parts.push(remaining.slice(0, index))
    }

    parts.push('')
    remaining = remaining.slice(index + next[0].length)
    lookups.on(next[1], setPart.bind(this, parts.length - 1))
  }

  if (remaining) {
    setPart(parts.length, remaining)
  }

  function setPart (idx, val) {
    parts[idx] = val

    change(parts.join(''))
  }
}

},{}],26:[function(require,module,exports){
module.exports = initTextNode

function initTextNode (el, lookups) {
  this.templateString(
    el.textContent,
    this.batch.add(update),
    lookups
  )

  function update (val) {
    el.textContent = val
  }
}

},{}],27:[function(require,module,exports){
module.exports = toString

function toString () {
  return this.rootNodes().map(function (node) {
    switch (node.nodeType) {
      case this.document.DOCUMENT_FRAGMENT_NODE:
      case this.document.COMMENT_NODE: return clone.call(this, node)
      case this.document.TEXT_NODE: return node.textContent
      default: return node.outerHTML
    }
  }, this).join('')

  function clone (node) {
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
module.exports = function (root, scope) {
  var deps = {
    id: 0,
    helpers: {},
    labels: {},
    vars: [],
    scope: false,
    data: false
  }

  var built = build(root, deps, scope || {})
  var helperNames = Object.keys(deps.helpers)
  var helpers = new Array(helperNames.length)

  for (var i = 0, len = helperNames.length; i < len; ++i) {
    helpers[i] = deps.helpers[helperNames[i]]
  }

  deps.helpers = helpers

  return {
    deps: deps,
    raw: root.value,
    body: built,
    compiled: compile(built, deps)
  }
}

module.exports.helper = function buildHelper (len) {
  if (!len) return new Function('update', 'update()')
  var body = 'update('

  for (var i = 0; i < len - 1; ++i) {
    body += 'deps[' + i + '].value, '
  }

  body += 'deps[' + i + '].value)'

  return new Function('update, deps', body)
}

function build (node, deps, scope) {
  if (node.type === 'group') {
    return '(' + build(node.data.expression, deps, scope) + ')'
  }

  if (node.type === 'number' || node.type === 'string' || node.type === 'keyword') {
    return node.value
  }

  if (node.type === 'unary') {
    return node.data.op + '(' + build(node.data.right, deps, scope) + ')'
  }

  if (node.type === 'helper') {
    deps.helpers[node.value] = node
    return 'helpers["' + node.id + '"].value'
  }

  if (node.type === 'label') {
    var type = node.value in scope ? 'scope' : 'data'
    deps[type] = true
    if (node.value === 'this') return 'data'
    if (deps.labels[node.value]) return deps.labels[node.value]
    var id = deps.labels[node.value] = lookup(type, '"' + node.value + '"')
    return id
  }

  if (node.type === 'member') {
    return lookup(makeVar(node.data.left), '"' + node.data.right.value + '"')
  }

  if (node.type === 'index') {
    return lookup(makeVar(node.data.left), makeVar(node.data.right))
  }

  if (node.type === 'binary') {
    return build(node.data.left, deps, scope) + ' ' +
      node.data.op + ' ' + build(node.data.right, deps, scope)
  }

  if (node.type === 'ternary') {
    return build(node.data.left, deps, scope) + ' ? ' +
      build(node.data.middle, deps, scope) + ' : ' +
      build(node.data.right, scope)
  }

  if (node.type === 'array') {
    var arr = '['

    for (var i = 0, l = node.data.children.length - 1; i < l; ++i) {
      arr = arr + build(node.data.children[i], deps, scope) + ', '
    }

    return arr + build(node.data.children[i], deps, scope) + ']'
  }

  function makeVar (node) {
    if (node.type === 'member' || node.type === 'index' || node.type === 'label') {
      return build(node, deps, scope)
    }

    var id = '_' + deps.id++
    deps.vars.push('var ' + id + ' = ' + build(node, deps, scope))
    return id
  }

  function lookup (left, right) {
    var id = '_' + deps.id++
    var statement = 'var ' + id + ' = ' + left + '!==null && ' + left +
      ' !== undefined ? ' + left + '[' + right + '] : undefined'

    deps.vars.push(statement)
    return id
  }
}

function compile (raw, deps) {
  var body = ''

  if (deps.helpers.length) {
    body = '  var helpers = this.detector.helpers\n' + body
  }

  if (deps.data) {
    body = '  var data = this.detector.state\n' + body
  }

  if (deps.scope) {
    body = '  var scope = this.detector.scope\n' + body
  }

  for (var i = 0, len = deps.vars.length; i < len; ++i) {
    body += '  ' + deps.vars[i] + '\n'
  }

  body += '  this.setValue(' + raw + ')'

  return new Function('', body)
}

},{}],30:[function(require,module,exports){
var List = require('./list')

module.exports = Expression

function Expression (detector, check, node, deps) {
  this.dependents = new List()
  this.detector = detector
  this.check = check || passThrough
  this.value = void 0
  this.shouldUpdate = false
  this.node = node
  this.depListItems = new Array(deps.length)
  this.deps = deps
  this.handlers = []

  for (var i = 0, len = deps.length; i < len; ++i) {
    this.depListItems[i] = deps[i].dependents.add(this)
  }
}

Expression.prototype.update = function update (onlyOnce) {
  if (onlyOnce && !this.shouldUpdate) return
  this.shouldUpdate = false
  this.check()
}

Expression.prototype.setValue = function setValue (value) {
  if (value === this.value && (!value || typeof value !== 'object')) {
    return
  }

  this.value = value
  this.report()

  if (!this.dependents.head) return

  var current = this.dependents.head
  while (current) {
    var expression = current.value
    if (!this.detector.updating) {
      expression.update(false)
    } else {
      expression.shouldUpdate = true
      this.detector.queue.push(expression)
    }

    current = current.next
  }
}

Expression.prototype.report = function report () {
  var handlers = this.handlers
  var len = this.handlers.length
  var val = this.value

  for (var i = 0; i < len; ++i) {
    handlers[i](val)
  }
}

Expression.prototype.lookup = function lookup (obj, key) {
  return obj === null || obj === undefined ? undefined : obj[key]
}

Expression.prototype.remove = function checkRemove (handler) {
  var idx
  if (handler && (idx = this.handlers.indexOf(handler)) !== -1) {
    this.handlers.splice(idx, 1)
  } else {
    this.handlers = []
  }

  this.checkRemove()
}

Expression.prototype.checkRemove = function checkRemove () {
  if (this.handlers.length || this.dependents.head) {
    return
  }

  delete this.detector.expressions[this.node.value]
  for (var i = 0, l = this.depListItems.length; i < l; ++i) {
    this.depListItems[i].remove()
    this.deps[i].checkRemove()
  }
}

function passThrough (value) {
  return value
}

},{"./list":33}],31:[function(require,module,exports){
module.exports = hash

function hash (str) {
  var i, chr, len
  var hash = 0
  if (str.length === 0) return hash
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }

  return hash
}

},{}],32:[function(require,module,exports){
var List = require('./list.js')
var watch = require('./watch')
var remove = require('./remove')

module.exports = ChangeDetector

function ChangeDetector (state, options, scope) {
  if (!(this instanceof ChangeDetector)) {
    return new ChangeDetector(state, options, scope)
  }

  this.expressions = new List()
  this.updating = false
  this.expressions = Object.create(null)
  this.helpers = Object.create(null)
  this.scope = scope || Object.create(null)
  this.state = state
  this.queue = []
  this.helpers = Object.create(null)
  this.root = this.on('this', function () {})
}

ChangeDetector.prototype.on = watch
ChangeDetector.prototype.removeListener = remove

ChangeDetector.prototype.update = function update (value) {
  this.state = value
  this.updating = true
  this.root.setValue(value)
  this.updating = false
  this.processQueue()
}

ChangeDetector.prototype.processQueue = function processQueue () {
  if (this.updating) return
  this.updating = true
  while (this.queue.length) {
    var queue = this.queue
    this.queue = []
    for (var i = 0, len = queue.length; i < len; ++i) {
      queue[i].update(true)
    }
  }

  this.updating = false
}

ChangeDetector.prototype.addHelper = function addHelper (name, fn) {
  if (typeof name !== 'string') throw new Error('Helper name must be a string')
  if (typeof fn !== 'function') throw new Error('Helper must be a function')
  this.helpers[name] = fn
}

},{"./list.js":33,"./remove":35,"./watch":36}],33:[function(require,module,exports){
module.exports = List

function List () {
  this.head = null
  this.tail = null
}

List.prototype.add = function add (value) {
  if (this.tail) {
    this.tail = this.tail.next = new ListItem(this, value, this.tail)
  } else {
    this.head = this.tail = new ListItem(this, value, null)
  }

  return this.tail
}

function ListItem (list, value, prev) {
  this.list = list
  this.value = value
  this.prev = prev
  this.next = null
}

ListItem.prototype.remove = function () {
  if (this === this.list.head) this.list.head = this.next
  if (this === this.list.tail) this.list.tail = this.prev
  if (this.prev) this.prev.next = this.next
  if (this.next) this.next.prev = this.prev
}

},{}],34:[function(require,module,exports){
var hash = require('./hash')

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

var sortedBinaryOperators = Object.keys(binaryOperators).sort(function (l, r) {
  return l.length < r.length ? 1 : -1
})

module.exports = parse

var cache = module.exports.cache = {}

function parse (str) {
  return cache[str] || (cache[str] = trim(str, expression, 0))
}

function expression (str, start, end) {
  if (!str || !str[start]) return null
  for (var i = 0, l = types.length; i < l; ++i) {
    var node = types[i](str, start, end)
    if (node) break
  }

  if (!node) {
    throw new Error(
      'Unexpected token: ' + str[start] + ' in "' + str.slice(start, 20) + '"'
    )
  }

  var cur = node.range[1]
  while (whitesapce.indexOf(str[cur]) !== -1) cur = cur + 1

  return end.indexOf(str[cur]) !== -1 ? node : continueExpression(str, node, end)
}

function continueExpression (str, node, end) {
  var start = node.range[1]
  while (str[start] && end.indexOf(str[start]) === -1) {
    node = trim(str, findContinuation, start, end)
    start = node.range[1]
    while (whitesapce.indexOf(str[start]) !== -1) start = start + 1
  }

  if (end.indexOf(str[start]) === -1) {
    throw new Error(
      'Expected to find token: ' + end
    )
  }

  return node

  function findContinuation (str, start, end) {
    for (var i = 0, l = continuations.length; i < l; ++i) {
      var continuation = continuations[i](node, str, start, end)
      if (continuation) break
    }

    if (!continuation) {
      throw new Error(
        'Unexpected token: ' + str[start] + ' in "' + str.slice(start, start + 20) + '"'
      )
    }

    return continuation
  }
}

function keyword (str, start) {
  for (var i = 0, l = keywords.length; i < l; ++i) {
    var word = keywords[i]
    for (var j = 0, l2 = word.length; j < l2; ++j) {
      if (str[start + j] !== word[j]) break
    }

    if (j === l2) break
  }

  if (i === l) return null

  return new Node(
    'keyword',
    [start, start + word.length],
    str,
    null,
    true,
    keywordValues[word]
  )
}

function string (str, start) {
  var open = str[start]
  if (open !== '"' && open !== '\'') return null
  var cur = start + 1
  var chr = str[cur]
  while ((chr) && chr !== open) {
    if (str === '\\') ++cur
    cur = cur + 1
    chr = str[cur]
  }

  if (str[cur++] !== open) throw new Error('Expected string to be closed')
  return new Node(
    'string',
    [start, cur],
    str,
    null,
    true,
    str.slice(start + 1, cur - 1)
  )
}

function number (str, start) {
  var decimal = false
  var cur = start
  var chr = str[cur]
  while (chr) {
    if (chr === '.') {
      if (decimal) break
      decimal = true
    } else if (chr < '0' || chr > '9') break
    cur = cur + 1
    chr = str[cur]
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

function label (str, start) {
  var chr = str[start]
  if (chr < 0 || chr > 9 || reservedCharacters.indexOf(chr) !== -1) return null
  var cur = start + 1
  chr = str[cur]

  while (chr) {
    if (reservedCharacters.indexOf(chr) !== -1) break
    cur = cur + 1
    chr = str[cur]
  }

  return new Node('label', [start, cur], str, null)
}

function array (str, start) {
  if (str[start] !== '[') return null
  var cur = start + 1
  var children = []
  var ends = [',', ']']
  var next = trim(str, expression, cur, ends)
  while (next) {
    children.push(next)
    cur = next.range[1]
    while (ends.indexOf(str[cur]) === -1) cur = cur + 1
    if (str[cur] === ']') break
    cur = cur + 1
    next = trim(str, expression, cur, ends)
  }

  return new Node('array', [start, cur + 1], str, {
    children: children
  })
}

function group (str, start) {
  if (str[start] !== '(') return null

  var node = trim(str, expression, start + 1, [')'])
  var end = node.range[1]
  while (whitesapce.indexOf(str[end]) !== -1) end = end + 1
  return new Node('group', [start, end + 1], str, {
    expression: node
  })
}

function helper (left, str, start, end) {
  if (left.type !== 'label' || str[start] !== '(') return
  var cur = start + 1
  var children = []
  var ends = [',', ')']
  var next = trim(str, expression, cur, ends)
  while (next) {
    children.push(next)
    cur = next.range[1]
    while (ends.indexOf(str[cur]) === -1) cur = cur + 1
    if (str[cur] === ')') break
    cur = cur + 1
    next = trim(str, expression, cur, ends)
  }

  cur = cur + 1

  return new Node('helper', [left.range[0], cur], str, {
    left: left,
    children: children
  })
}

function member (left, str, start) {
  if (str[start] !== '.') return null
  var node = label(str, start + 1)

  if (!node) throw new Error('Expected Label')
  return new Node('member', [left.range[0], node.range[1]], str, {
    left: left,
    right: node
  })
}

function index (left, str, start) {
  if (str[start] !== '[') return null
  var node = trim(str, expression, start + 1, [']'])
  var end = node.range[1] + 1
  while (whitesapce.indexOf(str[end]) !== -1) end = end + 1
  return new Node('index', [left.range[0], end], str, {
    left: left,
    right: node
  })
}

function unary (str, start, end) {
  for (var i = 0, l = unaryOperators.length; i < l; ++i) {
    var op = unaryOperators[i]
    for (var j = 0, l2 = op.length; j < l2; ++j) {
      if (str[start + j] !== op[j]) break
    }

    if (j === l2) break
  }

  if (i === l) return null
  var len = op.length
  var next = str[start + len]
  if (len > 1 && boundary.indexOf(next) === '-1') return null
  var child = trim(str, expression, start + len, end)
  var node = new Node('unary', [start, child.range[1]], str, {
    op: op,
    right: child,
    presidence: 4
  })

  if (child.presidence && child.presidence > 4) {
    node.right = child.left
    child.left = node
    return child
  }

  return node
}

function binary (left, str, start, end) {
  for (var i = 0, l = sortedBinaryOperators.length; i < l; ++i) {
    var op = sortedBinaryOperators[i]
    for (var j = 0, l2 = op.length; j < l2; ++j) {
      if (str[start + j] !== op[j]) break
    }

    if (j === l2) break
  }

  if (i === l) return null
  if (op === 'in' || op === 'instanceof') {
    var next = str[start + op.length]
    if (boundary.indexOf(next) === -1) return null
  }

  var presidence = binaryOperators[op]
  var right = trim(str, expression, start + op.length, end)
  var node = new Node('binary', [left.range[0], right.range[1]], str, {
    op: op,
    left: left,
    right: right,
    presidence: presidence
  })

  if (right.presidence && right.presidence >= presidence) {
    node.right = right.left
    right.left = node
    return right
  }

  return node
}

function ternary (condition, str, start, end) {
  if (str[start] !== '?') return null
  var ok = trim(str, expression, start + 1, [':'])
  if (!ok) throw new Error('Expected token: ":"')
  var next = ok.range[1] + 1
  while (whitesapce.indexOf(str[next]) !== -1) next = next + 1
  var not = trim(str, expression, next + 1, end)

  return new Node('ternary', [condition.range[0], not.range[1]], str, {
    left: condition,
    middle: ok,
    right: not,
    presidence: 15
  })
}

function trim (str, parse, start, end) {
  var chr = str[start]
  while (chr) {
    if (whitesapce.indexOf(chr) === -1) break
    start = start + 1
    chr = str[start]
  }

  return parse(str, start, end || [undefined])
}

function Node (type, range, str, data, litteral, val) {
  this.type = type
  this.range = range
  this.value = str.slice(range[0], range[1])
  this.id = '_' + hash(this.value)
  this.data = data
  this.litteral = !!litteral
  this.rawValue = val
}

},{"./hash":31}],35:[function(require,module,exports){
var parse = require('./parse')

module.exports = remove

function remove (expression, handler) {
  var node = parse(expression)
  var exp

  if (!node || !(exp = this.expressions[node.value])) {
    return
  }

  exp.remove(handler)
}

},{"./parse":34}],36:[function(require,module,exports){
var parse = require('./parse')
var build = require('./build')
var Expression = require('./expression')

module.exports = watch

function watch (expression, handler) {
  var exp = this.expressions[expression]

  if (!exp) {
    exp = watchNode(this, parse(expression), handler)
    if (handler) {
      handler(exp.value)
    }
  } else if (exp.handlers.indexOf(handler) === -1) {
    exp.handlers.push(handler)
    handler(exp.value)
  }

  return exp
}

function watchNode (detector, node, handler) {
  var expression

  if (detector.expressions[node.value]) return detector.expressions[node.value]
  if (node.type === 'helper') {
    expression = watchHelper(detector, node, handler)
  } else {
    expression = watchExpression(detector, node)
  }

  expression.update(false)

  if (handler) {
    expression.handlers.push(handler)
  }

  return expression
}

function watchExpression (detector, node) {
  var built = build(node, detector.scope)
  var helpers = built.deps.helpers
  var len = helpers.length
  var deps = new Array(len)

  for (var i = 0; i < len; ++i) {
    deps[i] = watchNode(detector, built.deps.helpers[i])
  }

  if ((built.deps.data || built.deps.scope) && detector.root) {
    deps.push(detector.root)
  }

  var expression = new Expression(detector, built.compiled, node, deps)

  detector.expressions[node.value] = expression

  return expression
}

function watchHelper (detector, node) {
  var name = node.data.left.value
  var constructor = detector.helpers[name]
  if (!constructor) {
    throw new Error('Unknown helper: ' + name)
  }

  var children = node.data.children
  var len = children.length
  var deps = new Array(len)

  for (var i = 0; i < len; ++i) {
    deps[i] = watchNode(detector, children[i])
  }

  var helper = constructor(change)

  if (typeof helper !== 'function') {
    throw new Error('helper ' + name + ' did not return a function')
  }

  var built = build.helper(deps.length)
  var expression = new Expression(detector, check, node, deps)

  detector.expressions[node.value] = expression
  detector.helpers[node.id] = expression

  return expression

  function change (value) {
    return expression.setValue(value)
  }

  function check () {
    return built(helper, deps)
  }
}

},{"./build":29,"./expression":30,"./parse":34}],37:[function(require,module,exports){
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


},{}],38:[function(require,module,exports){
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

},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9hbHRyLWV4dGVuZC5qcyIsImxpYi9hbHRyLmpzIiwibGliL2F0dHJpYnV0ZXMuanMiLCJsaWIvYnJvd3Nlci5qcyIsImxpYi9kZWNvcmF0b3JzLmpzIiwibGliL2Rlc3Ryb3kuanMiLCJsaWIvZWxlbWVudC1ub2RlLmpzIiwibGliL2dldC1lbGVtZW50LmpzIiwibGliL2luZGV4LmpzIiwibGliL21lcmdlLWhvb2tzLmpzIiwibGliL3JhZi5qcyIsImxpYi9yZW1vdmUuanMiLCJsaWIvcmVuZGVyLmpzIiwibGliL3J1bi1ob29rcy5qcyIsImxpYi9zZXQtY2hpbGRyZW4uanMiLCJsaWIvdGFncy9jaGlsZHJlbi5qcyIsImxpYi90YWdzL2Zvci5qcyIsImxpYi90YWdzL2h0bWwuanMiLCJsaWIvdGFncy9pZi5qcyIsImxpYi90YWdzL2luY2x1ZGUuanMiLCJsaWIvdGFncy9wbGFjZWhvbGRlci5qcyIsImxpYi90YWdzL3Jhdy5qcyIsImxpYi90YWdzL3RleHQuanMiLCJsaWIvdGFncy93aXRoLmpzIiwibGliL3RlbXBsYXRlLXN0cmluZy5qcyIsImxpYi90ZXh0LW5vZGUuanMiLCJsaWIvdG8tc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL2JhdGNoLXF1ZXVlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9idWlsZC5qcyIsIm5vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvZXhwcmVzc2lvbi5qcyIsIm5vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvaGFzaC5qcyIsIm5vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGlydHliaXQvbGliL2xpc3QuanMiLCJub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3BhcnNlLmpzIiwibm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9yZW1vdmUuanMiLCJub2RlX21vZHVsZXMvZGlydHliaXQvbGliL3dhdGNoLmpzIiwibm9kZV9tb2R1bGVzL2V4dGVuZC9pbmRleC5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3JDQTtBQUNBOzs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0ckV4dGVuZFxuXG5mdW5jdGlvbiBhbHRyRXh0ZW5kIChiYXNlLCBvcHRpb25zKSB7XG4gIHZhciBiYXNlT3B0aW9ucyA9IGV4dGVuZCh0cnVlLCBiYXNlLCBvcHRpb25zKVxuICB2YXIgYWx0ciA9IHRoaXNcblxuICBleHRlbnNpb24ucmVuZGVyID0gYWx0ci5yZW5kZXIuYmluZChhbHRyLCBiYXNlT3B0aW9ucylcbiAgZXh0ZW5zaW9uLmV4dGVuZCA9IGFsdHIuZXh0ZW5kLmJpbmQoYWx0cilcbiAgZXh0ZW5zaW9uLmFkZFRhZyA9IGFsdHIuYWRkVGFnLmJpbmQoYWx0cilcbiAgZXh0ZW5zaW9uLmluY2x1ZGUgPSBhbHRyLmluY2x1ZGUuYmluZChhbHRyKVxuICBleHRlbnNpb24uYWRkSGVscGVyID0gYWx0ci5hZGRIZWxwZXIuYmluZChhbHRyKVxuICBleHRlbnNpb24uYWRkRGVjb3JhdG9yID0gYWx0ci5hZGREZWNvcmF0b3IuYmluZChhbHRyKVxuXG4gIHJldHVybiBleHRlbnNpb25cblxuICBmdW5jdGlvbiBleHRlbnNpb24gKHJvb3QsIHN0YXRlLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGFsdHIocm9vdCwgc3RhdGUsIGV4dGVuZChcbiAgICAgICAgdHJ1ZVxuICAgICAgLCBPYmplY3QuY3JlYXRlKGJhc2VPcHRpb25zKVxuICAgICAgLCBvcHRpb25zIHx8IHt9XG4gICAgKSlcbiAgfVxufVxuIiwidmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG52YXIgYmF0Y2ggPSByZXF1aXJlKCdiYXRjaC1xdWV1ZScpXG52YXIgZGlydHliaXQgPSByZXF1aXJlKCdkaXJ0eWJpdCcpXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJylcblxudmFyIHRlbXBsYXRlU3RyaW5nID0gcmVxdWlyZSgnLi90ZW1wbGF0ZS1zdHJpbmcnKVxudmFyIGVsZW1lbnROb2RlID0gcmVxdWlyZSgnLi9lbGVtZW50LW5vZGUnKVxudmFyIG1lcmdlSG9va3MgPSByZXF1aXJlKCcuL21lcmdlLWhvb2tzJylcbnZhciBhbHRyRXh0ZW5kID0gcmVxdWlyZSgnLi9hbHRyLWV4dGVuZCcpXG52YXIgdGV4dE5vZGUgPSByZXF1aXJlKCcuL3RleHQtbm9kZScpXG52YXIgdG9TdHJpbmcgPSByZXF1aXJlKCcuL3RvLXN0cmluZycpXG52YXIgcnVuSG9va3MgPSByZXF1aXJlKCcuL3J1bi1ob29rcycpXG52YXIgZ2V0RWwgPSByZXF1aXJlKCcuL2dldC1lbGVtZW50JylcbnZhciBkZXN0cm95ID0gcmVxdWlyZSgnLi9kZXN0cm95JylcbnZhciByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpXG52YXIgcmVtb3ZlID0gcmVxdWlyZSgnLi9yZW1vdmUnKVxudmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJylcblxuLy8gZHluYW1pYyByZXF1aXJlIHNvIGl0IGRvZXMgbm90IG1ha2UgaXQgaW50byB0aGUgYnJvd3NlcmlmeSBidW5kbGVcbnZhciBkb21Nb2R1bGUgPSAnbWljcm8tZG9tJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcblxuYWx0ci5oZWxwZXJzID0ge31cbmFsdHIuZGVjb3JhdG9ycyA9IHt9XG5cbmFsdHIucmVuZGVyID0gcmVuZGVyXG5hbHRyLmFkZFRhZyA9IGFkZFRhZ1xuYWx0ci5leHRlbmQgPSBhbHRyRXh0ZW5kXG5hbHRyLmFkZEhlbHBlciA9IGFkZEhlbHBlclxuYWx0ci5hZGREZWNvcmF0b3IgPSBhZGREZWNvcmF0b3JcblxuZnVuY3Rpb24gYWx0ciAocm9vdCwgZGF0YSwgX29wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIGFsdHIpKSB7XG4gICAgcmV0dXJuIG5ldyBhbHRyKHJvb3QsIGRhdGEsIF9vcHRpb25zKSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5ldy1jYXBcbiAgfVxuXG4gIHZhciBvcHRpb25zID0gX29wdGlvbnMgfHwge31cblxuICB0aGlzLmhlbHBlcnMgPSBleHRlbmQoXG4gICAgICBmYWxzZVxuICAgICwgT2JqZWN0LmNyZWF0ZShhbHRyLmhlbHBlcnMpXG4gICAgLCBvcHRpb25zLmhlbHBlcnMgfHwge31cbiAgKVxuXG4gIHRoaXMuZGVjb3JhdG9ycyA9IGV4dGVuZChcbiAgICAgIGZhbHNlXG4gICAgLCBPYmplY3QuY3JlYXRlKGFsdHIuZGVjb3JhdG9ycylcbiAgICAsIG9wdGlvbnMuZGVjb3JhdG9ycyB8fCB7fVxuICApXG5cbiAgdGhpcy5yb290ID0gcm9vdFxuICB0aGlzLnN5bmMgPSAhIW9wdGlvbnMuc3luY1xuICB0aGlzLnRhZ1JlZ0V4cCA9IG1ha2VUYWdSZWdFeHAob3B0aW9ucy5kZWxpbWl0ZXJzKVxuICB0aGlzLmRvY3VtZW50ID0gb3B0aW9ucy5kb2MgfHwgZ2xvYmFsLmRvY3VtZW50IHx8IHJlcXVpcmUoZG9tTW9kdWxlKS5kb2N1bWVudFxuICB0aGlzLmxvb2t1cHMgPSBkaXJ0eWJpdChkYXRhLCB7aGVscGVyczogdGhpcy5oZWxwZXJzfSwge30pXG5cbiAgdGhpcy5iYXRjaCA9IGJhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuc3luYykge1xuICAgICAgcmFmKHRoaXMucnVuQmF0Y2guYmluZCh0aGlzKSlcbiAgICB9XG4gIH0uYmluZCh0aGlzKSlcblxuICBpZiAoZ2xvYmFsLkJ1ZmZlciAmJiByb290IGluc3RhbmNlb2YgZ2xvYmFsLkJ1ZmZlcikge1xuICAgIHJvb3QgPSByb290LnRvU3RyaW5nKClcbiAgfVxuXG4gIGlmICh0eXBlb2Ygcm9vdCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgdGVtcCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gcm9vdFxuICAgIHRoaXMucm9vdCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG5cbiAgICB3aGlsZSAodGVtcC5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGVtcC5maXJzdENoaWxkKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMuY2hpbGRyZW4gPSB0aGlzLmluaXROb2Rlcyh0aGlzLnJvb3ROb2RlcygpLCB0aGlzLmxvb2t1cHMpXG4gIHRoaXMucnVuSG9va3ModGhpcy5jaGlsZHJlbi5ob29rcywgJ2luc2VydCcsIG51bGwpXG4gIHRoaXMucnVuQmF0Y2goKVxufVxuXG5hbHRyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRUUucHJvdG90eXBlKVxuYWx0ci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBhbHRyXG5cbmFsdHIucHJvdG90eXBlLnRlbXBsYXRlU3RyaW5nID0gdGVtcGxhdGVTdHJpbmdcbmFsdHIucHJvdG90eXBlLmFkZERlY29yYXRvciA9IGFkZERlY29yYXRvclxuYWx0ci5wcm90b3R5cGUubWVyZ2VIb29rcyA9IG1lcmdlSG9va3NcbmFsdHIucHJvdG90eXBlLmluaXROb2RlcyA9IGluaXROb2Rlc1xuYWx0ci5wcm90b3R5cGUucm9vdE5vZGVzID0gcm9vdE5vZGVzXG5hbHRyLnByb3RvdHlwZS5hZGRIZWxwZXIgPSBhZGRIZWxwZXJcbmFsdHIucHJvdG90eXBlLnJ1bkJhdGNoID0gcnVuQmF0Y2hcbmFsdHIucHJvdG90eXBlLnRvU3RyaW5nID0gdG9TdHJpbmdcbmFsdHIucHJvdG90eXBlLnJ1bkhvb2tzID0gcnVuSG9va3NcbmFsdHIucHJvdG90eXBlLmdldEVsZW1lbnQgPSBnZXRFbFxuYWx0ci5wcm90b3R5cGUuZGVzdHJveSA9IGRlc3Ryb3lcbmFsdHIucHJvdG90eXBlLnJlbW92ZSA9IHJlbW92ZVxuYWx0ci5wcm90b3R5cGUuaW50byA9IGFwcGVuZFRvXG5hbHRyLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcbmFsdHIucHJvdG90eXBlLnRhZ0xpc3QgPSBbXVxuYWx0ci5wcm90b3R5cGUudGFncyA9IHt9XG5cbnZhciBub2RlX2hhbmRsZXJzID0ge31cblxubm9kZV9oYW5kbGVyc1sxXSA9IGVsZW1lbnROb2RlXG5ub2RlX2hhbmRsZXJzWzNdID0gdGV4dE5vZGVcblxuZnVuY3Rpb24gdXBkYXRlIChkYXRhLCBzeW5jKSB7XG4gIHRoaXMuc3RhdGUgPSBkYXRhXG4gIHRoaXMubG9va3Vwcy51cGRhdGUoZGF0YSlcblxuICBpZiAoc3luYyB8fCB0aGlzLnN5bmMpIHtcbiAgICB0aGlzLnJ1bkJhdGNoKClcbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0Tm9kZXMgKF9ub2RlcywgX2xvb2t1cHMsIHN0YXRlLCBzY29wZSkge1xuICB2YXIgYWx0ciA9IHRoaXNcbiAgdmFyIGxvb2t1cHMgPSBfbG9va3VwcyB8fCBkaXJ0eWJpdChzdGF0ZSwge2hlbHBlcnM6IHRoaXMuaGVscGVyc30sIHNjb3BlIHx8IHt9KVxuICB2YXIgbm9kZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChfbm9kZXMpXG4gIHZhciBob29rcyA9IG5vZGVzLnJlZHVjZShqb2luLCBbXSkuZmlsdGVyKEJvb2xlYW4pXG5cbiAgcmV0dXJuIHtob29rczogaG9va3MsIGxvb2t1cHM6IGxvb2t1cHMsIG5vZGVzOiBub2Rlc31cblxuICBmdW5jdGlvbiBqb2luIChsaXN0LCBub2RlKSB7XG4gICAgdmFyIGhvb2tzID0gaW5pdE5vZGUuY2FsbChhbHRyLCBsb29rdXBzLCBub2RlKVxuXG4gICAgcmV0dXJuIGhvb2tzID8gbGlzdC5jb25jYXQoaG9va3MpIDogbGlzdFxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXROb2RlIChsb29rdXBzLCBlbCkge1xuICByZXR1cm4gbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV1cbiAgICA/IG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdLmNhbGwodGhpcywgZWwsIGxvb2t1cHMpXG4gICAgOiBlbC5jaGlsZE5vZGVzICYmIGVsLmNoaWxkTm9kZXMubGVuZ3RoXG4gICAgPyB0aGlzLmluaXROb2Rlcyhsb29rdXBzLCBlbC5jaGlsZE5vZGVzKVxuICAgIDogbnVsbFxufVxuXG5mdW5jdGlvbiByb290Tm9kZXMgKCkge1xuICByZXR1cm4gdGhpcy5yb290Lm5vZGVUeXBlID09PSB0aGlzLmRvY3VtZW50LkRPQ1VNRU5UX0ZSQUdNRU5UX05PREVcbiAgICA/IFtdLnNsaWNlLmNhbGwodGhpcy5yb290LmNoaWxkTm9kZXMpXG4gICAgOiBbdGhpcy5yb290XVxufVxuXG5mdW5jdGlvbiBhZGRIZWxwZXIgKG5hbWUsIGhlbHBlcikge1xuICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBoZWxwZXJcbn1cblxuZnVuY3Rpb24gYWRkVGFnIChhdHRyLCB0YWcpIHtcbiAgdGhpcy5wcm90b3R5cGUudGFnc1thdHRyXSA9IHRhZ1xuICB0aGlzLnByb3RvdHlwZS50YWdMaXN0LnB1c2goe1xuICAgIGF0dHI6IGF0dHIsXG4gICAgY29uc3RydWN0b3I6IHRhZ1xuICB9KVxufVxuXG5mdW5jdGlvbiBhcHBlbmRUbyAobm9kZSkge1xuICB2YXIgcm9vdE5vZGVzID0gdGhpcy5yb290Tm9kZXMoKVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gcm9vdE5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQoZ2V0RWwocm9vdE5vZGVzW2ldKSlcbiAgfVxufVxuXG5mdW5jdGlvbiBhZGREZWNvcmF0b3IgKG5hbWUsIGZuKSB7XG4gIHRoaXMuZGVjb3JhdG9yc1tuYW1lXSA9IGZuXG59XG5cbmZ1bmN0aW9uIHJ1bkJhdGNoICgpIHtcbiAgdGhpcy5iYXRjaC5ydW4oKSAmJiB0aGlzLmVtaXQoJ3VwZGF0ZScsIHRoaXMuc3RhdGUpXG59XG5cbmZ1bmN0aW9uIG1ha2VUYWdSZWdFeHAgKF9kZWxpbWl0ZXJzKSB7XG4gIHZhciBkZWxpbWl0ZXJzID0gX2RlbGltaXRlcnMgfHwgWyd7eycsICd9fSddXG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAoZGVsaW1pdGVyc1swXSArICdcXFxccyooLio/KVxcXFxzKicgKyBkZWxpbWl0ZXJzWzFdKVxufVxuIiwibW9kdWxlLmV4cG9ydHMucmF3ID0gcmF3QXR0cmlidXRlXG5tb2R1bGUuZXhwb3J0cy5hbHRyID0gYWx0ckF0dHJpYnV0ZVxubW9kdWxlLmV4cG9ydHMucHJvcCA9IGFsdHJQcm9wZXJ0eVxuXG5mdW5jdGlvbiByYXdBdHRyaWJ1dGUgKGVsLCBhdHRyLCBsb29rdXBzKSB7XG4gIHRoaXMudGVtcGxhdGVTdHJpbmcoXG4gICAgICBhdHRyLnZhbHVlXG4gICAgLCB0aGlzLmJhdGNoLmFkZChlbC5zZXRBdHRyaWJ1dGUuYmluZChlbCwgYXR0ci5uYW1lKSlcbiAgICAsIGxvb2t1cHNcbiAgKVxufVxuXG5mdW5jdGlvbiBhbHRyQXR0cmlidXRlIChlbCwgYXR0ciwgbG9va3Vwcykge1xuICB2YXIgbmFtZSA9IGF0dHIubmFtZS5zbGljZSgnYWx0ci1hdHRyLScubGVuZ3RoKVxuXG4gIGxvb2t1cHMub24oYXR0ci52YWx1ZSwgdGhpcy5iYXRjaC5hZGQodXBkYXRlKSlcbiAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSlcblxuICBmdW5jdGlvbiB1cGRhdGUgKHZhbCkge1xuICAgIGlmICghdmFsICYmIHZhbCAhPT0gJycgJiYgdmFsICE9PSAwKSB7XG4gICAgICByZXR1cm4gZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpXG4gICAgfVxuXG4gICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbClcbiAgfVxufVxuXG5mdW5jdGlvbiBhbHRyUHJvcGVydHkgKGVsLCBhdHRyLCBsb29rdXBzKSB7XG4gIHZhciBuYW1lID0gYXR0ci5uYW1lLnNsaWNlKCdhbHRyLXByb3AtJy5sZW5ndGgpXG5cbiAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSlcbiAgbG9va3Vwcy5vbihhdHRyLnZhbHVlLCB0aGlzLmJhdGNoLmFkZCh1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSAodmFsKSB7XG4gICAgZWxbbmFtZV0gPSB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwuYWx0ciA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuIiwibW9kdWxlLmV4cG9ydHMgPSBkZWNvcmF0b3JzXG5cbmZ1bmN0aW9uIGRlY29yYXRvcnMgKGVsLCBhdHRycywgbG9va3Vwcykge1xuICB2YXIgYWx0ciA9IHRoaXNcblxuICByZXR1cm4gYXR0cnMubWFwKGNyZWF0ZURlY29yYXRvcilcblxuICBmdW5jdGlvbiBjcmVhdGVEZWNvcmF0b3IgKGF0dHIpIHtcbiAgICB2YXIgZGVjb3JhdG9yID0gYWx0ci5kZWNvcmF0b3JzW2F0dHIubmFtZV0uY2FsbChhbHRyLCBlbClcbiAgICB2YXIgZXhwcmVzc2lvbiA9ICdbJyArIGF0dHIudmFsdWUgKyAnXSdcblxuICAgIGlmICghZGVjb3JhdG9yKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgaG9va3MgPSB7aW5zZXJ0OiBkZWNvcmF0b3IuaW5zZXJ0LCByZW1vdmU6IGRlY29yYXRvci5yZW1vdmV9XG5cbiAgICBpZiAoZGVjb3JhdG9yLnVwZGF0ZSkge1xuICAgICAgbG9va3Vwcy5vbihleHByZXNzaW9uLCB1cGRhdGUpXG4gICAgfVxuXG4gICAgaG9va3MuZGVzdHJveSA9IGRlc3Ryb3lcblxuICAgIHJldHVybiBob29rc1xuXG4gICAgZnVuY3Rpb24gZGVzdHJveSAoKSB7XG4gICAgICBpZiAoZGVjb3JhdG9yLnVwZGF0ZSkgbG9va3Vwcy5yZW1vdmVMaXN0ZW5lcihleHByZXNzaW9uLCB1cGRhdGUpXG5cbiAgICAgIGlmIChkZWNvcmF0b3IuZGVzdHJveSkge1xuICAgICAgICBkZWNvcmF0b3IuZGVzdHJveSgpXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlIChhcmdzKSB7XG4gICAgICBkZWNvcmF0b3IudXBkYXRlLmFwcGx5KG51bGwsIGFyZ3MpXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGRlc3Ryb3lcblxuZnVuY3Rpb24gZGVzdHJveSAoY2hpbGRyZW4sIGVsLCBkb25lKSB7XG4gIHZhciBhbHRyID0gdGhpc1xuXG4gIGFsdHIucmVtb3ZlKGNoaWxkcmVuLCBlbCwgZnVuY3Rpb24gKGVsKSB7XG4gICAgYWx0ci5ydW5Ib29rcyhjaGlsZHJlbiwgJ2Rlc3Ryb3knLCBlbClcbiAgICBkb25lKClcbiAgfSlcbn1cbiIsInZhciBjcmVhdGVEZWNvcmF0b3JzID0gcmVxdWlyZSgnLi9kZWNvcmF0b3JzJylcbnZhciBjcmVhdGVBdHRyID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzJylcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50Tm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50Tm9kZSAoZWwsIGxvb2t1cHMpIHtcbiAgdmFyIGRlY29yYXRvcnMgPSBbXVxuICB2YXIgYWx0ciA9IHRoaXNcbiAgdmFyIGF0dHJcblxuICB2YXIgYXR0cnMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5hdHRyaWJ1dGVzKVxuICB2YXIgYWx0cl90YWdzID0ge31cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGF0dHJzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChhbHRyLnRhZ3NbYXR0cnNbaV0ubmFtZV0pIHtcbiAgICAgIGFsdHJfdGFnc1thdHRyc1tpXS5uYW1lXSA9IGF0dHJzW2ldLnZhbHVlXG4gICAgfSBlbHNlIGlmIChhbHRyLmRlY29yYXRvcnNbYXR0cnNbaV0ubmFtZV0pIHtcbiAgICAgIGRlY29yYXRvcnMucHVzaChhdHRyc1tpXSlcbiAgICB9IGVsc2UgaWYgKCFhdHRyc1tpXS5uYW1lLmxhc3RJbmRleE9mKCdhbHRyLWF0dHItJywgMCkpIHtcbiAgICAgIGNyZWF0ZUF0dHIuYWx0ci5jYWxsKHRoaXMsIGVsLCBhdHRyc1tpXSwgbG9va3VwcylcbiAgICB9IGVsc2UgaWYgKCFhdHRyc1tpXS5uYW1lLmxhc3RJbmRleE9mKCdhbHRyLXByb3AtJywgMCkpIHtcbiAgICAgIGNyZWF0ZUF0dHIucHJvcC5jYWxsKHRoaXMsIGVsLCBhdHRyc1tpXSwgbG9va3VwcylcbiAgICB9IGVsc2Uge1xuICAgICAgY3JlYXRlQXR0ci5yYXcuY2FsbCh0aGlzLCBlbCwgYXR0cnNbaV0sIGxvb2t1cHMpXG4gICAgfVxuICB9XG5cbiAgdmFyIGhvb2tzID0gY3JlYXRlRGVjb3JhdG9ycy5jYWxsKGFsdHIsIGVsLCBkZWNvcmF0b3JzLCBsb29rdXBzKVxuXG4gIGZvciAoaSA9IDAsIGwgPSBhbHRyLnRhZ0xpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKChhdHRyID0gYWx0cl90YWdzW2FsdHIudGFnTGlzdFtpXS5hdHRyXSkpIHtcbiAgICAgIHJldHVybiBob29rcy5jb25jYXQoW1xuICAgICAgICBhbHRyLnRhZ0xpc3RbaV0uY29uc3RydWN0b3IuY2FsbChhbHRyLCBlbCwgYXR0ciwgbG9va3VwcywgaG9va3MpIHx8IHt9XG4gICAgICBdKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBob29rcy5jb25jYXQoYWx0ci5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcywgbG9va3VwcykuaG9va3MpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGdldFxuXG5mdW5jdGlvbiBnZXQgKF9lbCkge1xuICB2YXIgZWwgPSBfZWxcblxuICB3aGlsZSAoZWwgJiYgZWwuX2FsdHJQbGFjZWhvbGRlcikge1xuICAgIGVsID0gZWwuX2FsdHJQbGFjZWhvbGRlclxuXG4gICAgaWYgKGVsID09PSBfZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncGxhY2Vob2xkZXIgY2lyY3VsYXIgcmVmZmVyZW5jZScpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGVsXG59XG4iLCJ2YXIgcGxhY2Vob2xkZXIgPSByZXF1aXJlKCcuL3RhZ3MvcGxhY2Vob2xkZXInKVxudmFyIGNoaWxkcmVuVGFnID0gcmVxdWlyZSgnLi90YWdzL2NoaWxkcmVuJylcbnZhciBpbmNsdWRlVGFnID0gcmVxdWlyZSgnLi90YWdzL2luY2x1ZGUnKVxudmFyIHRleHRUYWcgPSByZXF1aXJlKCcuL3RhZ3MvdGV4dCcpXG52YXIgaHRtbFRhZyA9IHJlcXVpcmUoJy4vdGFncy9odG1sJylcbnZhciB3aXRoVGFnID0gcmVxdWlyZSgnLi90YWdzL3dpdGgnKVxudmFyIGZvclRhZyA9IHJlcXVpcmUoJy4vdGFncy9mb3InKVxudmFyIHJhd1RhZyA9IHJlcXVpcmUoJy4vdGFncy9yYXcnKVxudmFyIGlmVGFnID0gcmVxdWlyZSgnLi90YWdzL2lmJylcbnZhciBhbHRyID0gcmVxdWlyZSgnLi9hbHRyJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuYWRkVGFnKCdhbHRyLWNoaWxkcmVuJywgY2hpbGRyZW5UYWcpXG5hbHRyLmFkZFRhZygnYWx0ci1yZXBsYWNlJywgcGxhY2Vob2xkZXIpXG5hbHRyLmFkZFRhZygnYWx0ci1pbmNsdWRlJywgaW5jbHVkZVRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLXRleHQnLCB0ZXh0VGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItaHRtbCcsIGh0bWxUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci13aXRoJywgd2l0aFRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLWZvcicsIGZvclRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLXJhdycsIHJhd1RhZylcbmFsdHIuYWRkVGFnKCdhbHRyLWlmJywgaWZUYWcpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IG1lcmdlXG5cbmZ1bmN0aW9uIG1lcmdlIChjaGlsZHJlbikge1xuICB2YXIgYWx0ciA9IHRoaXNcblxuICByZXR1cm4ge1xuICAgIGluc2VydDogZWFjaC5iaW5kKG51bGwsICdpbnNlcnQnKSxcbiAgICBkZXN0cm95OiBlYWNoLmJpbmQobnVsbCwgJ2Rlc3Ryb3knKSxcbiAgICByZW1vdmU6IHJlbW92ZVxuICB9XG5cbiAgZnVuY3Rpb24gZWFjaCAodHlwZSwgZWwpIHtcbiAgICB2YXIgbm9kZXMgPSBjaGlsZHJlbigpXG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbm9kZXNbaV1bdHlwZV0gJiYgbm9kZXNbaV1bdHlwZV0oZWwpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlIChlbCwgcmVhZHkpIHtcbiAgICBhbHRyLnJlbW92ZShjaGlsZHJlbigpLCBlbCwgcmVhZHkpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG5cbmZ1bmN0aW9uIHJlcXVlc3RBbmltYXRpb25GcmFtZSAoY2FsbGJhY2spIHtcbiAgdmFyIHJhZiA9IGdsb2JhbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIHRpbWVvdXRcblxuICByZXR1cm4gcmFmKGNhbGxiYWNrKVxuXG4gIGZ1bmN0aW9uIHRpbWVvdXQgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZW1vdmVcblxuZnVuY3Rpb24gcmVtb3ZlIChob29rcywgZWwsIHJlYWR5KSB7XG4gIHZhciByZW1haW5pbmcgPSBob29rcy5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHJlbWFpbmluZzsgaSA8IGw7IGkrKykge1xuICAgIGhvb2tzW2ldLnJlbW92ZSA/IGhvb2tzW2ldLnJlbW92ZShlbCwgZG9uZSkgOiAtLXJlbWFpbmluZ1xuICB9XG5cbiAgaWYgKCFyZW1haW5pbmcpIHtcbiAgICByZWFkeSgpXG4gIH1cblxuICBmdW5jdGlvbiBkb25lICgpIHtcbiAgICBpZiAoIS0tcmVtYWluaW5nKSB7XG4gICAgICByZW1haW5pbmcgPSAtMVxuICAgICAgcmVhZHkoKVxuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZW5kZXJcblxuZnVuY3Rpb24gcmVuZGVyICh0ZW1wbGF0ZSwgc3RhdGUsIGVsKSB7XG4gIGlmICh0aGlzLmluY2x1ZGVzW3RlbXBsYXRlXSkge1xuICAgIHRlbXBsYXRlID0gdGhpcy5pbmNsdWRlc1t0ZW1wbGF0ZV1cbiAgfVxuXG4gIHZhciBpbnN0YW5jZSA9IHRoaXModGVtcGxhdGUpXG5cbiAgaW5zdGFuY2UudXBkYXRlKHN0YXRlIHx8IHt9LCB0cnVlKVxuXG4gIGlmIChlbCkge1xuICAgIGluc3RhbmNlLmludG8oZWwpXG4gIH1cblxuICByZXR1cm4gaW5zdGFuY2Vcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcnVuSG9va3NcblxuZnVuY3Rpb24gcnVuSG9va3MgKGhvb2tzLCB0eXBlLCBlbCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGhvb2tzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGhvb2tzW2ldW3R5cGVdICYmIGhvb2tzW2ldW3R5cGVdKGVsKVxuICB9XG59XG4iLCJ2YXIgZ2V0ID0gcmVxdWlyZSgnLi9nZXQtZWxlbWVudCcpXG5cbm1vZHVsZS5leHBvcnRzID0gc2V0Q2hpbGRyZW5cblxuZnVuY3Rpb24gc2V0Q2hpbGRyZW4gKHJvb3QsIG5vZGVzKSB7XG4gIHZhciBwcmV2ID0gbnVsbFxuICB2YXIgZWxcblxuICBmb3IgKHZhciBpID0gbm9kZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICBlbCA9IGdldChub2Rlc1tpXSlcbiAgICByb290Lmluc2VydEJlZm9yZShlbCwgcHJldilcbiAgICBwcmV2ID0gZWxcbiAgfVxuXG4gIHdoaWxlICgoZWwgPSByb290LmZpcnN0Q2hpbGQpICE9PSBwcmV2KSB7XG4gICAgcm9vdC5yZW1vdmVDaGlsZChlbClcbiAgfVxufVxuIiwidmFyIHNldENoaWxkcmVuID0gcmVxdWlyZSgnLi4vc2V0LWNoaWxkcmVuJylcblxubW9kdWxlLmV4cG9ydHMgPSBjaGlsZHJlblxuXG5mdW5jdGlvbiBjaGlsZHJlbiAoZWwsIGdldHRlciwgbG9va3Vwcykge1xuICB2YXIgY3VycmVudCA9IFtdXG5cbiAgZWwuaW5uZXJIVE1MID0gJydcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihnZXR0ZXIsIHVwZGF0ZS5iaW5kKHRoaXMpKSlcblxuICBmdW5jdGlvbiB1cGRhdGUgKHZhbCkge1xuICAgIHZhciBub2RlcyA9IChBcnJheS5pc0FycmF5KHZhbCkgPyB2YWwgOiBbdmFsXSkuZmlsdGVyKGlzX25vZGUpXG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYgKG5vZGVzW2ldICE9PSBjdXJyZW50W2ldKSB7XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IG5vZGVzLmxlbmd0aCA9PT0gY3VycmVudC5sZW5ndGgpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGN1cnJlbnQgPSBub2Rlc1xuICAgIHNldENoaWxkcmVuLmNhbGwodGhpcywgZWwsIGN1cnJlbnQpXG4gIH1cbn1cblxuZnVuY3Rpb24gaXNfbm9kZSAoZWwpIHtcbiAgcmV0dXJuIGVsICYmIGVsLm5vZGVUeXBlXG59XG4iLCJ2YXIgc2V0Q2hpbGRyZW4gPSByZXF1aXJlKCcuLi9zZXQtY2hpbGRyZW4nKVxudmFyIGZvclJlZ2V4cCA9IC9eKC4qPylcXHMraW5cXHMrKC4qJCkvXG5cbm1vZHVsZS5leHBvcnRzID0gZm9ySGFuZGxlclxuXG5mdW5jdGlvbiBmb3JIYW5kbGVyIChyb290LCBhcmdzLCBsb29rdXBzKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IHJvb3QuY2xvbmVOb2RlKHRydWUpXG4gIHZhciBwYXJ0cyA9IGFyZ3MubWF0Y2goZm9yUmVnZXhwKVxuICB2YXIgZG9tTm9kZXMgPSBbXVxuICB2YXIgY2hpbGRyZW4gPSBbXVxuICB2YXIgYWx0ciA9IHRoaXNcbiAgdmFyIGl0ZW1zID0gW11cblxuICBpZiAoIXBhcnRzKSB7XG4gICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgYGZvcmAgdGFnOiAnICsgYXJncylcbiAgfVxuXG4gIHZhciBydW5VcGRhdGVzID0gYWx0ci5iYXRjaC5hZGQocnVuRG9tVXBkYXRlcylcblxuICByb290LmlubmVySFRNTCA9ICcnXG5cbiAgdmFyIHVuaXF1ZSA9IHBhcnRzWzFdLnNwbGl0KCc6JylbMV1cbiAgdmFyIHByb3AgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzBdXG4gIHZhciBrZXkgPSBwYXJ0c1syXVxuXG4gIGxvb2t1cHMub24oa2V5LCB1cGRhdGUpXG4gIGxvb2t1cHMub24oJ3RoaXMnLCB1cGRhdGVDaGlsZHJlbilcblxuICByZXR1cm4gYWx0ci5tZXJnZUhvb2tzKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmxhdHRlbihjaGlsZHJlbilcbiAgfSlcblxuICBmdW5jdGlvbiB1cGRhdGVDaGlsZHJlbiAoZGF0YSkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICB2YXIgc2NvcGUgPSBjaGlsZHJlbltpXS5sb29rdXBzLnNjb3BlXG4gICAgICBzY29wZVtwcm9wXSA9IGl0ZW1zW2ldXG4gICAgICBzY29wZS4kaW5kZXggPSBpXG4gICAgICBjaGlsZHJlbltpXS5sb29rdXBzLnVwZGF0ZShkYXRhKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSAobmV3SXRlbXMpIHtcbiAgICB2YXIgaSwgbFxuICAgIGlmICghQXJyYXkuaXNBcnJheShuZXdJdGVtcykpIHtcbiAgICAgIG5ld0l0ZW1zID0gW11cbiAgICB9XG5cbiAgICB2YXIgbmV3Q2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3SXRlbXMubGVuZ3RoKVxuICAgIHZhciByZW1vdmVkID0gW11cbiAgICB2YXIgbWF0Y2hlZCA9IHt9XG4gICAgdmFyIGFkZGVkID0gW11cbiAgICB2YXIgaW5kZXhcblxuICAgIGRvbU5vZGVzID0gW11cblxuICAgIGZvciAoaSA9IDAsIGwgPSBuZXdJdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGluZGV4ID0gZmluZEluZGV4KGl0ZW1zLCBuZXdJdGVtc1tpXSwgdW5pcXVlKVxuXG4gICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld0NoaWxkcmVuW2ldID0gY2hpbGRyZW5baW5kZXhdXG4gICAgICAgIGl0ZW1zW2luZGV4XSA9IGNoaWxkcmVuW2luZGV4XSA9IG1hdGNoZWRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFkZGVkLnB1c2gobmV3Q2hpbGRyZW5baV0gPSBtYWtlQ2hpbGQoKSlcbiAgICAgIH1cblxuICAgICAgZG9tTm9kZXMgPSBkb21Ob2Rlcy5jb25jYXQobmV3Q2hpbGRyZW5baV0ubm9kZXMpXG4gICAgfVxuXG4gICAgZm9yIChpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYgKGNoaWxkcmVuW2ldICE9PSBtYXRjaGVkKSB7XG4gICAgICAgIHJlbW92ZWQucHVzaChjaGlsZHJlbltpXSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG5ld0NoaWxkcmVuLnNsaWNlKClcbiAgICBpdGVtcyA9IG5ld0l0ZW1zLnNsaWNlKClcbiAgICB1cGRhdGVDaGlsZHJlbihsb29rdXBzLnN0YXRlKVxuICAgIGFsdHIuZGVzdHJveShmbGF0dGVuKHJlbW92ZWQpLCByb290LCBydW5VcGRhdGVzLmJpbmQoXG4gICAgICAgIGFsdHJcbiAgICAgICwgZG9tTm9kZXNcbiAgICAgICwgZmxhdHRlbihhZGRlZClcbiAgICApKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluZEluZGV4IChpdGVtcywgZCwgdW5pcXVlKSB7XG4gICAgaWYgKCF1bmlxdWUpIHtcbiAgICAgIHJldHVybiBpdGVtcy5pbmRleE9mKGQpXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGlmIChpdGVtc1tpXVt1bmlxdWVdID09PSBkW3VuaXF1ZV0pIHtcbiAgICAgICAgcmV0dXJuIGlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gLTFcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VDaGlsZCAoKSB7XG4gICAgdmFyIHNjb3BlID0gT2JqZWN0LmNyZWF0ZShsb29rdXBzLnNjb3BlKVxuICAgIHNjb3BlLiRpbmRleCA9IHVuZGVmaW5lZFxuICAgIHNjb3BlW3Byb3BdID0gdW5kZWZpbmVkXG4gICAgcmV0dXJuIGFsdHIuaW5pdE5vZGVzKHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKS5jaGlsZE5vZGVzLCBudWxsLCBudWxsLCBzY29wZSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bkRvbVVwZGF0ZXMgKGNoaWxkcmVuLCBhZGRlZCkge1xuICAgIHNldENoaWxkcmVuLmNhbGwodGhpcywgcm9vdCwgY2hpbGRyZW4pXG4gICAgYWx0ci5ydW5Ib29rcyhhZGRlZCwgJ2luc2VydCcsIHJvb3QpXG4gIH1cbn1cblxuZnVuY3Rpb24gZmxhdHRlbiAobGlzdCkge1xuICByZXR1cm4gbGlzdC5yZWR1Y2UoZnVuY3Rpb24gKGFsbCwgcGFydCkge1xuICAgIHJldHVybiBwYXJ0Lmhvb2tzID8gYWxsLmNvbmNhdChwYXJ0Lmhvb2tzKSA6IGFsbFxuICB9LCBbXSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaHRtbFxuXG5mdW5jdGlvbiBodG1sIChlbCwgYWNjZXNzb3IsIGxvb2t1cHMpIHtcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUgKHZhbCkge1xuICAgIGVsLmlubmVySFRNTCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcblxuICAgIGlmIChlbC5nZXRBdHRyaWJ1dGUoJ2FsdHItcnVuLXNjcmlwdHMnKSkge1xuICAgICAgW10uZm9yRWFjaC5jYWxsKGVsLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgcnVuKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBydW4gKHNjcmlwdCkge1xuICB2YXIgZml4ZWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICB2YXIgcGFyZW50ID0gc2NyaXB0LnBhcmVudE5vZGVcbiAgdmFyIGF0dHJzID0gc2NyaXB0LmF0dHJpYnV0ZXNcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGF0dHJzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGZpeGVkLnNldEF0dHJpYnV0ZShhdHRyc1tpXS5uYW1lLCBhdHRyc1tpXS52YWx1ZSlcbiAgfVxuXG4gIGZpeGVkLnRleHRDb250ZW50ID0gc2NyaXB0LnRleHRDb250ZW50XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoZml4ZWQsIHNjcmlwdClcbiAgcGFyZW50LnJlbW92ZUNoaWxkKHNjcmlwdClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaWZUYWdcblxuZnVuY3Rpb24gaWZUYWcgKGVsLCBnZXR0ZXIsIGxvb2t1cHMsIGRlY29yYXRvcnMpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcywgbnVsbCwgbnVsbCwgbG9va3Vwcy5zY29wZSlcbiAgdmFyIGFsbCA9IGNoaWxkcmVuLmhvb2tzLmNvbmNhdChkZWNvcmF0b3JzKVxuICB2YXIgbGFzdFZhbCA9IG51bGxcbiAgdmFyIGhpZGRlbiA9IG51bGxcbiAgdmFyIGZpcnN0ID0gdHJ1ZVxuICB2YXIgYWx0ciA9IHRoaXNcblxuICBnbG9iYWwubG9va3VwcyA9IGNoaWxkcmVuLmxvb2t1cHNcblxuICB2YXIgdXBkYXRlID0gdGhpcy5iYXRjaC5hZGQoZnVuY3Rpb24gKHNob3csIG9yaWdpbikge1xuICAgIGlmICghaGlkZGVuICYmICFzaG93KSB7XG4gICAgICBlbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChwbGFjZWhvbGRlciwgZWwpXG4gICAgICBlbC5fYWx0clBsYWNlaG9sZGVyID0gcGxhY2Vob2xkZXJcbiAgICAgIGhpZGRlbiA9IHRydWVcbiAgICB9IGVsc2UgaWYgKGhpZGRlbiAmJiBzaG93KSB7XG4gICAgICBwbGFjZWhvbGRlci5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChlbCwgcGxhY2Vob2xkZXIpXG4gICAgICBhbHRyLnJ1bkhvb2tzKGFsbCwgJ2luc2VydCcsIG9yaWdpbilcbiAgICAgIGRlbGV0ZSBlbC5fYWx0clBsYWNlaG9sZGVyXG4gICAgICBoaWRkZW4gPSBmYWxzZVxuICAgIH0gZWxzZSBpZiAoZmlyc3QpIHtcbiAgICAgIGZpcnN0ID0gZmFsc2VcbiAgICAgIGFsdHIucnVuSG9va3MoYWxsLCAnaW5zZXJ0Jywgb3JpZ2luKVxuICAgIH1cbiAgfSlcblxuICBsb29rdXBzLm9uKCdbJyArIGdldHRlciArICcsIHRoaXNdJywgdG9nZ2xlKVxuXG4gIHJldHVybiB7XG4gICAgaW5zZXJ0OiBpbnNlcnQsXG4gICAgcmVtb3ZlOiByZW1vdmUsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSAoZWwpIHtcbiAgICBhbHRyLnJ1bkhvb2tzKGNoaWxkcmVuLmhvb2tzLCAnZGVzdHJveScsIGVsKVxuICB9XG5cbiAgZnVuY3Rpb24gdG9nZ2xlIChhcmdzKSB7XG4gICAgbGFzdFZhbCA9ICEhYXJnc1swXVxuXG4gICAgaWYgKGxhc3RWYWwpIHtcbiAgICAgIHVwZGF0ZSh0cnVlLCBlbClcbiAgICAgIGNoaWxkcmVuLmxvb2t1cHMudXBkYXRlKGFyZ3NbMV0pXG4gICAgfSBlbHNlIHtcbiAgICAgIGFsdHIucmVtb3ZlKGFsbCwgZWwsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZShmYWxzZSwgZWwpXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGluc2VydCAoZWwpIHtcbiAgICBpZiAobGFzdFZhbCkge1xuICAgICAgdXBkYXRlKHRydWUsIGVsKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZSAoZWwsIGRvbmUpIHtcbiAgICBpZiAoaGlkZGVuKSB7XG4gICAgICBkb25lKClcblxuICAgICAgcmV0dXJuIHVwZGF0ZShmYWxzZSlcbiAgICB9XG5cbiAgICBhbHRyLnJlbW92ZShjaGlsZHJlbi5ob29rcywgZWwsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHVwZGF0ZShmYWxzZSlcbiAgICAgIGRvbmUoKVxuICAgIH0pXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaW5jbHVkZVxuXG5mdW5jdGlvbiBpbmNsdWRlIChlbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciByZW1vdmVMaXN0ZW5lcnMgPSBbXVxuICB2YXIgY2hpbGRyZW4gPSBudWxsXG4gIHZhciBjb250ZW50ID0gJydcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgbG9va3Vwcy5vbihnZXR0ZXIsIHNldClcbiAgbG9va3Vwcy5vbigndGhpcycsIHVwZGF0ZSlcblxuICByZXR1cm4ge2luc2VydDogaW5zZXJ0LCByZW1vdmU6IHJlbW92ZSwgZGVzdHJveTogZGVzdHJveX1cblxuICBmdW5jdGlvbiBzZXQgKGRhdGEpIHtcbiAgICBjb250ZW50ID0gdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnID8gZGF0YSA6ICcnXG4gICAgaWYgKGNoaWxkcmVuKSByZW1vdmUoZWwsIGluc2VydClcbiAgfVxuXG4gIGZ1bmN0aW9uIGluc2VydCAoKSB7XG4gICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBlbC5pbm5lckhUTUwgPSBjb250ZW50XG4gICAgY2hpbGRyZW4gPSBhbHRyLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzLCBudWxsLCBsb29rdXBzLnN0YXRlLCBsb29rdXBzLnNjb3BlKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlIChlbCwgZG9uZSkge1xuICAgIGlmICghY2hpbGRyZW4pIHtcbiAgICAgIHJldHVybiBkb25lKClcbiAgICB9XG5cbiAgICBpZiAocmVtb3ZlTGlzdGVuZXJzLnB1c2goZG9uZSkgPiAxKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBhbHRyLmRlc3Ryb3koY2hpbGRyZW4sIGVsLCBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbGlzdGVuZXJcblxuICAgICAgaWYgKCFjaGlsZHJlbikge1xuICAgICAgICBlbC5pbm5lckhUTUwgPSAnJ1xuICAgICAgfVxuXG4gICAgICB3aGlsZSAoKGxpc3RlbmVyID0gcmVtb3ZlTGlzdGVuZXJzLnBvcCgpKSkge1xuICAgICAgICBsaXN0ZW5lcigpXG4gICAgICB9XG4gICAgfSlcblxuICAgIGNoaWxkcmVuID0gbnVsbFxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlIChzdGF0ZSkge1xuICAgIGNoaWxkcmVuICYmIGNoaWxkcmVuLmxvb2t1cHMudXBkYXRlKHN0YXRlKVxuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSAoKSB7XG4gICAgbG9va3Vwcy5yZW1vdmVMaXN0ZW5lcigndGhpcycsIHVwZGF0ZSlcbiAgICBsb29rdXBzLnJlbW92ZUxpc3RlbmVyKGdldHRlciwgc2V0KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHBsYWNlaG9sZGVyXG5cbmZ1bmN0aW9uIHBsYWNlaG9sZGVyIChvcmlnaW5hbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciBjdXJyZW50ID0gb3JpZ2luYWxcblxuICB0aGlzLmJhdGNoLmFkZChsb29rdXBzLm9uKGdldHRlciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUgKHZhbCkge1xuICAgIGlmICghdmFsIHx8ICF2YWwubm9kZU5hbWUgfHwgdmFsID09PSBjdXJyZW50KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjdXJyZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHZhbCwgY3VycmVudClcbiAgICBvcmlnaW5hbC5fYWx0clBsYWNlaG9sZGVyID0gdmFsXG4gICAgY3VycmVudCA9IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJhdyAoKSB7fVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZXh0XG5cbmZ1bmN0aW9uIHRleHQgKGVsLCBnZXR0ZXIsIGxvb2t1cHMpIHtcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihnZXR0ZXIsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlICh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3aXRoVGFnXG5cbmZ1bmN0aW9uIHdpdGhUYWcgKGVsLCBnZXR0ZXIsIGxvb2t1cHMpIHtcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcylcbiAgdmFyIHBhcnRzID0gZ2V0dGVyLnNwbGl0KCcgYXMgJylcblxuICBsb29rdXBzLm9uKHBhcnRzWzBdLCB1cGRhdGUpXG5cbiAgcmV0dXJuIGNoaWxkcmVuLmhvb2tzXG5cbiAgZnVuY3Rpb24gdXBkYXRlIChfdmFsKSB7XG4gICAgdmFyIHZhbCA9IE9iamVjdC5jcmVhdGUobG9va3Vwcy5zdGF0ZSlcblxuICAgIHZhbFtwYXJ0c1sxXV0gPSBfdmFsXG4gICAgY2hpbGRyZW4ubG9va3Vwcy51cGRhdGUodmFsKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRTdHJpbmdcblxuZnVuY3Rpb24gdGVtcGxhdFN0cmluZyAodGVtcGxhdGUsIGNoYW5nZSwgbG9va3Vwcykge1xuICBpZiAoIXRlbXBsYXRlLm1hdGNoKHRoaXMudGFnUmVnRXhwKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRlbXBsYXRlXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBpbmRleFxuICB2YXIgbmV4dFxuXG4gIHdoaWxlIChyZW1haW5pbmcgJiYgKG5leHQgPSByZW1haW5pbmcubWF0Y2godGhpcy50YWdSZWdFeHApKSkge1xuICAgIGlmICgoaW5kZXggPSByZW1haW5pbmcuaW5kZXhPZihuZXh0WzBdKSkpIHtcbiAgICAgIHBhcnRzLnB1c2gocmVtYWluaW5nLnNsaWNlKDAsIGluZGV4KSlcbiAgICB9XG5cbiAgICBwYXJ0cy5wdXNoKCcnKVxuICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZy5zbGljZShpbmRleCArIG5leHRbMF0ubGVuZ3RoKVxuICAgIGxvb2t1cHMub24obmV4dFsxXSwgc2V0UGFydC5iaW5kKHRoaXMsIHBhcnRzLmxlbmd0aCAtIDEpKVxuICB9XG5cbiAgaWYgKHJlbWFpbmluZykge1xuICAgIHNldFBhcnQocGFydHMubGVuZ3RoLCByZW1haW5pbmcpXG4gIH1cblxuICBmdW5jdGlvbiBzZXRQYXJ0IChpZHgsIHZhbCkge1xuICAgIHBhcnRzW2lkeF0gPSB2YWxcblxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbml0VGV4dE5vZGVcblxuZnVuY3Rpb24gaW5pdFRleHROb2RlIChlbCwgbG9va3Vwcykge1xuICB0aGlzLnRlbXBsYXRlU3RyaW5nKFxuICAgIGVsLnRleHRDb250ZW50LFxuICAgIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSksXG4gICAgbG9va3Vwc1xuICApXG5cbiAgZnVuY3Rpb24gdXBkYXRlICh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvU3RyaW5nXG5cbmZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgcmV0dXJuIHRoaXMucm9vdE5vZGVzKCkubWFwKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgc3dpdGNoIChub2RlLm5vZGVUeXBlKSB7XG4gICAgICBjYXNlIHRoaXMuZG9jdW1lbnQuRE9DVU1FTlRfRlJBR01FTlRfTk9ERTpcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5DT01NRU5UX05PREU6IHJldHVybiBjbG9uZS5jYWxsKHRoaXMsIG5vZGUpXG4gICAgICBjYXNlIHRoaXMuZG9jdW1lbnQuVEVYVF9OT0RFOiByZXR1cm4gbm9kZS50ZXh0Q29udGVudFxuICAgICAgZGVmYXVsdDogcmV0dXJuIG5vZGUub3V0ZXJIVE1MXG4gICAgfVxuICB9LCB0aGlzKS5qb2luKCcnKVxuXG4gIGZ1bmN0aW9uIGNsb25lIChub2RlKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmFwcGVuZENoaWxkKG5vZGUuY2xvbmVOb2RlKHRydWUpKVxuXG4gICAgcmV0dXJuIHRlbXAuaW5uZXJIVE1MXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQmF0Y2hcblxuZnVuY3Rpb24gQmF0Y2gocmVhZHksIGFsbCkge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCYXRjaCkpIHtcbiAgICByZXR1cm4gbmV3IEJhdGNoKHJlYWR5LCBhbGwpXG4gIH1cblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLmFsbCA9IGFsbFxuICB0aGlzLnJlYWR5ID0gcmVhZHlcbiAgdGhpcy5xdWV1ZCA9IGZhbHNlXG4gIHRoaXMucnVuID0gdGhpcy5ydW4uYmluZCh0aGlzKVxufVxuXG5CYXRjaC5wcm90b3R5cGUucXVldWUgPSBxdWV1ZVxuQmF0Y2gucHJvdG90eXBlLmFkZCA9IGFkZFxuQmF0Y2gucHJvdG90eXBlLnJ1biA9IHJ1blxuXG5mdW5jdGlvbiBhZGQoZm4pIHtcbiAgdmFyIHF1ZXVlZCA9IGZhbHNlXG4gICAgLCBiYXRjaCA9IHRoaXNcbiAgICAsIHNlbGZcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gcXVldWVcblxuICBmdW5jdGlvbiBxdWV1ZSgpIHtcbiAgICBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgc2VsZiA9IHRoaXNcblxuICAgIGlmKHF1ZXVlZCkge1xuICAgICAgcmV0dXJuIGJhdGNoLmFsbCAmJiBiYXRjaC5yZWFkeSgpXG4gICAgfVxuXG4gICAgcXVldWVkID0gdHJ1ZVxuICAgIGJhdGNoLnF1ZXVlKHJ1bilcbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICBxdWV1ZWQgPSBmYWxzZVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVldWUoZm4pIHtcbiAgdGhpcy5qb2JzLnB1c2goZm4pXG5cbiAgaWYodGhpcy5hbGwgfHwgIXRoaXMucXVldWVkKSB7XG4gICAgdGhpcy5xdWV1ZWQgPSB0cnVlXG4gICAgdGhpcy5yZWFkeSh0aGlzKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNcblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLnF1ZXVlZCA9IGZhbHNlXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGpvYnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgam9ic1tpXSgpXG4gIH1cblxuICByZXR1cm4gISFqb2JzLmxlbmd0aFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocm9vdCwgc2NvcGUpIHtcbiAgdmFyIGRlcHMgPSB7XG4gICAgaWQ6IDAsXG4gICAgaGVscGVyczoge30sXG4gICAgbGFiZWxzOiB7fSxcbiAgICB2YXJzOiBbXSxcbiAgICBzY29wZTogZmFsc2UsXG4gICAgZGF0YTogZmFsc2VcbiAgfVxuXG4gIHZhciBidWlsdCA9IGJ1aWxkKHJvb3QsIGRlcHMsIHNjb3BlIHx8IHt9KVxuICB2YXIgaGVscGVyTmFtZXMgPSBPYmplY3Qua2V5cyhkZXBzLmhlbHBlcnMpXG4gIHZhciBoZWxwZXJzID0gbmV3IEFycmF5KGhlbHBlck5hbWVzLmxlbmd0aClcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gaGVscGVyTmFtZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBoZWxwZXJzW2ldID0gZGVwcy5oZWxwZXJzW2hlbHBlck5hbWVzW2ldXVxuICB9XG5cbiAgZGVwcy5oZWxwZXJzID0gaGVscGVyc1xuXG4gIHJldHVybiB7XG4gICAgZGVwczogZGVwcyxcbiAgICByYXc6IHJvb3QudmFsdWUsXG4gICAgYm9keTogYnVpbHQsXG4gICAgY29tcGlsZWQ6IGNvbXBpbGUoYnVpbHQsIGRlcHMpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMuaGVscGVyID0gZnVuY3Rpb24gYnVpbGRIZWxwZXIgKGxlbikge1xuICBpZiAoIWxlbikgcmV0dXJuIG5ldyBGdW5jdGlvbigndXBkYXRlJywgJ3VwZGF0ZSgpJylcbiAgdmFyIGJvZHkgPSAndXBkYXRlKCdcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbiAtIDE7ICsraSkge1xuICAgIGJvZHkgKz0gJ2RlcHNbJyArIGkgKyAnXS52YWx1ZSwgJ1xuICB9XG5cbiAgYm9keSArPSAnZGVwc1snICsgaSArICddLnZhbHVlKSdcblxuICByZXR1cm4gbmV3IEZ1bmN0aW9uKCd1cGRhdGUsIGRlcHMnLCBib2R5KVxufVxuXG5mdW5jdGlvbiBidWlsZCAobm9kZSwgZGVwcywgc2NvcGUpIHtcbiAgaWYgKG5vZGUudHlwZSA9PT0gJ2dyb3VwJykge1xuICAgIHJldHVybiAnKCcgKyBidWlsZChub2RlLmRhdGEuZXhwcmVzc2lvbiwgZGVwcywgc2NvcGUpICsgJyknXG4gIH1cblxuICBpZiAobm9kZS50eXBlID09PSAnbnVtYmVyJyB8fCBub2RlLnR5cGUgPT09ICdzdHJpbmcnIHx8IG5vZGUudHlwZSA9PT0gJ2tleXdvcmQnKSB7XG4gICAgcmV0dXJuIG5vZGUudmFsdWVcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICd1bmFyeScpIHtcbiAgICByZXR1cm4gbm9kZS5kYXRhLm9wICsgJygnICsgYnVpbGQobm9kZS5kYXRhLnJpZ2h0LCBkZXBzLCBzY29wZSkgKyAnKSdcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICdoZWxwZXInKSB7XG4gICAgZGVwcy5oZWxwZXJzW25vZGUudmFsdWVdID0gbm9kZVxuICAgIHJldHVybiAnaGVscGVyc1tcIicgKyBub2RlLmlkICsgJ1wiXS52YWx1ZSdcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICdsYWJlbCcpIHtcbiAgICB2YXIgdHlwZSA9IG5vZGUudmFsdWUgaW4gc2NvcGUgPyAnc2NvcGUnIDogJ2RhdGEnXG4gICAgZGVwc1t0eXBlXSA9IHRydWVcbiAgICBpZiAobm9kZS52YWx1ZSA9PT0gJ3RoaXMnKSByZXR1cm4gJ2RhdGEnXG4gICAgaWYgKGRlcHMubGFiZWxzW25vZGUudmFsdWVdKSByZXR1cm4gZGVwcy5sYWJlbHNbbm9kZS52YWx1ZV1cbiAgICB2YXIgaWQgPSBkZXBzLmxhYmVsc1tub2RlLnZhbHVlXSA9IGxvb2t1cCh0eXBlLCAnXCInICsgbm9kZS52YWx1ZSArICdcIicpXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICBpZiAobm9kZS50eXBlID09PSAnbWVtYmVyJykge1xuICAgIHJldHVybiBsb29rdXAobWFrZVZhcihub2RlLmRhdGEubGVmdCksICdcIicgKyBub2RlLmRhdGEucmlnaHQudmFsdWUgKyAnXCInKVxuICB9XG5cbiAgaWYgKG5vZGUudHlwZSA9PT0gJ2luZGV4Jykge1xuICAgIHJldHVybiBsb29rdXAobWFrZVZhcihub2RlLmRhdGEubGVmdCksIG1ha2VWYXIobm9kZS5kYXRhLnJpZ2h0KSlcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICdiaW5hcnknKSB7XG4gICAgcmV0dXJuIGJ1aWxkKG5vZGUuZGF0YS5sZWZ0LCBkZXBzLCBzY29wZSkgKyAnICcgK1xuICAgICAgbm9kZS5kYXRhLm9wICsgJyAnICsgYnVpbGQobm9kZS5kYXRhLnJpZ2h0LCBkZXBzLCBzY29wZSlcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICd0ZXJuYXJ5Jykge1xuICAgIHJldHVybiBidWlsZChub2RlLmRhdGEubGVmdCwgZGVwcywgc2NvcGUpICsgJyA/ICcgK1xuICAgICAgYnVpbGQobm9kZS5kYXRhLm1pZGRsZSwgZGVwcywgc2NvcGUpICsgJyA6ICcgK1xuICAgICAgYnVpbGQobm9kZS5kYXRhLnJpZ2h0LCBzY29wZSlcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICdhcnJheScpIHtcbiAgICB2YXIgYXJyID0gJ1snXG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGUuZGF0YS5jaGlsZHJlbi5sZW5ndGggLSAxOyBpIDwgbDsgKytpKSB7XG4gICAgICBhcnIgPSBhcnIgKyBidWlsZChub2RlLmRhdGEuY2hpbGRyZW5baV0sIGRlcHMsIHNjb3BlKSArICcsICdcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyICsgYnVpbGQobm9kZS5kYXRhLmNoaWxkcmVuW2ldLCBkZXBzLCBzY29wZSkgKyAnXSdcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VWYXIgKG5vZGUpIHtcbiAgICBpZiAobm9kZS50eXBlID09PSAnbWVtYmVyJyB8fCBub2RlLnR5cGUgPT09ICdpbmRleCcgfHwgbm9kZS50eXBlID09PSAnbGFiZWwnKSB7XG4gICAgICByZXR1cm4gYnVpbGQobm9kZSwgZGVwcywgc2NvcGUpXG4gICAgfVxuXG4gICAgdmFyIGlkID0gJ18nICsgZGVwcy5pZCsrXG4gICAgZGVwcy52YXJzLnB1c2goJ3ZhciAnICsgaWQgKyAnID0gJyArIGJ1aWxkKG5vZGUsIGRlcHMsIHNjb3BlKSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvb2t1cCAobGVmdCwgcmlnaHQpIHtcbiAgICB2YXIgaWQgPSAnXycgKyBkZXBzLmlkKytcbiAgICB2YXIgc3RhdGVtZW50ID0gJ3ZhciAnICsgaWQgKyAnID0gJyArIGxlZnQgKyAnIT09bnVsbCAmJiAnICsgbGVmdCArXG4gICAgICAnICE9PSB1bmRlZmluZWQgPyAnICsgbGVmdCArICdbJyArIHJpZ2h0ICsgJ10gOiB1bmRlZmluZWQnXG5cbiAgICBkZXBzLnZhcnMucHVzaChzdGF0ZW1lbnQpXG4gICAgcmV0dXJuIGlkXG4gIH1cbn1cblxuZnVuY3Rpb24gY29tcGlsZSAocmF3LCBkZXBzKSB7XG4gIHZhciBib2R5ID0gJydcblxuICBpZiAoZGVwcy5oZWxwZXJzLmxlbmd0aCkge1xuICAgIGJvZHkgPSAnICB2YXIgaGVscGVycyA9IHRoaXMuZGV0ZWN0b3IuaGVscGVyc1xcbicgKyBib2R5XG4gIH1cblxuICBpZiAoZGVwcy5kYXRhKSB7XG4gICAgYm9keSA9ICcgIHZhciBkYXRhID0gdGhpcy5kZXRlY3Rvci5zdGF0ZVxcbicgKyBib2R5XG4gIH1cblxuICBpZiAoZGVwcy5zY29wZSkge1xuICAgIGJvZHkgPSAnICB2YXIgc2NvcGUgPSB0aGlzLmRldGVjdG9yLnNjb3BlXFxuJyArIGJvZHlcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBkZXBzLnZhcnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBib2R5ICs9ICcgICcgKyBkZXBzLnZhcnNbaV0gKyAnXFxuJ1xuICB9XG5cbiAgYm9keSArPSAnICB0aGlzLnNldFZhbHVlKCcgKyByYXcgKyAnKSdcblxuICByZXR1cm4gbmV3IEZ1bmN0aW9uKCcnLCBib2R5KVxufVxuIiwidmFyIExpc3QgPSByZXF1aXJlKCcuL2xpc3QnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEV4cHJlc3Npb25cblxuZnVuY3Rpb24gRXhwcmVzc2lvbiAoZGV0ZWN0b3IsIGNoZWNrLCBub2RlLCBkZXBzKSB7XG4gIHRoaXMuZGVwZW5kZW50cyA9IG5ldyBMaXN0KClcbiAgdGhpcy5kZXRlY3RvciA9IGRldGVjdG9yXG4gIHRoaXMuY2hlY2sgPSBjaGVjayB8fCBwYXNzVGhyb3VnaFxuICB0aGlzLnZhbHVlID0gdm9pZCAwXG4gIHRoaXMuc2hvdWxkVXBkYXRlID0gZmFsc2VcbiAgdGhpcy5ub2RlID0gbm9kZVxuICB0aGlzLmRlcExpc3RJdGVtcyA9IG5ldyBBcnJheShkZXBzLmxlbmd0aClcbiAgdGhpcy5kZXBzID0gZGVwc1xuICB0aGlzLmhhbmRsZXJzID0gW11cblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gZGVwcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIHRoaXMuZGVwTGlzdEl0ZW1zW2ldID0gZGVwc1tpXS5kZXBlbmRlbnRzLmFkZCh0aGlzKVxuICB9XG59XG5cbkV4cHJlc3Npb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSAob25seU9uY2UpIHtcbiAgaWYgKG9ubHlPbmNlICYmICF0aGlzLnNob3VsZFVwZGF0ZSkgcmV0dXJuXG4gIHRoaXMuc2hvdWxkVXBkYXRlID0gZmFsc2VcbiAgdGhpcy5jaGVjaygpXG59XG5cbkV4cHJlc3Npb24ucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gc2V0VmFsdWUgKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gdGhpcy52YWx1ZSAmJiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5yZXBvcnQoKVxuXG4gIGlmICghdGhpcy5kZXBlbmRlbnRzLmhlYWQpIHJldHVyblxuXG4gIHZhciBjdXJyZW50ID0gdGhpcy5kZXBlbmRlbnRzLmhlYWRcbiAgd2hpbGUgKGN1cnJlbnQpIHtcbiAgICB2YXIgZXhwcmVzc2lvbiA9IGN1cnJlbnQudmFsdWVcbiAgICBpZiAoIXRoaXMuZGV0ZWN0b3IudXBkYXRpbmcpIHtcbiAgICAgIGV4cHJlc3Npb24udXBkYXRlKGZhbHNlKVxuICAgIH0gZWxzZSB7XG4gICAgICBleHByZXNzaW9uLnNob3VsZFVwZGF0ZSA9IHRydWVcbiAgICAgIHRoaXMuZGV0ZWN0b3IucXVldWUucHVzaChleHByZXNzaW9uKVxuICAgIH1cblxuICAgIGN1cnJlbnQgPSBjdXJyZW50Lm5leHRcbiAgfVxufVxuXG5FeHByZXNzaW9uLnByb3RvdHlwZS5yZXBvcnQgPSBmdW5jdGlvbiByZXBvcnQgKCkge1xuICB2YXIgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzXG4gIHZhciBsZW4gPSB0aGlzLmhhbmRsZXJzLmxlbmd0aFxuICB2YXIgdmFsID0gdGhpcy52YWx1ZVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBoYW5kbGVyc1tpXSh2YWwpXG4gIH1cbn1cblxuRXhwcmVzc2lvbi5wcm90b3R5cGUubG9va3VwID0gZnVuY3Rpb24gbG9va3VwIChvYmosIGtleSkge1xuICByZXR1cm4gb2JqID09PSBudWxsIHx8IG9iaiA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogb2JqW2tleV1cbn1cblxuRXhwcmVzc2lvbi5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gY2hlY2tSZW1vdmUgKGhhbmRsZXIpIHtcbiAgdmFyIGlkeFxuICBpZiAoaGFuZGxlciAmJiAoaWR4ID0gdGhpcy5oYW5kbGVycy5pbmRleE9mKGhhbmRsZXIpKSAhPT0gLTEpIHtcbiAgICB0aGlzLmhhbmRsZXJzLnNwbGljZShpZHgsIDEpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5oYW5kbGVycyA9IFtdXG4gIH1cblxuICB0aGlzLmNoZWNrUmVtb3ZlKClcbn1cblxuRXhwcmVzc2lvbi5wcm90b3R5cGUuY2hlY2tSZW1vdmUgPSBmdW5jdGlvbiBjaGVja1JlbW92ZSAoKSB7XG4gIGlmICh0aGlzLmhhbmRsZXJzLmxlbmd0aCB8fCB0aGlzLmRlcGVuZGVudHMuaGVhZCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgZGVsZXRlIHRoaXMuZGV0ZWN0b3IuZXhwcmVzc2lvbnNbdGhpcy5ub2RlLnZhbHVlXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZGVwTGlzdEl0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHRoaXMuZGVwTGlzdEl0ZW1zW2ldLnJlbW92ZSgpXG4gICAgdGhpcy5kZXBzW2ldLmNoZWNrUmVtb3ZlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXNzVGhyb3VnaCAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGhhc2hcblxuZnVuY3Rpb24gaGFzaCAoc3RyKSB7XG4gIHZhciBpLCBjaHIsIGxlblxuICB2YXIgaGFzaCA9IDBcbiAgaWYgKHN0ci5sZW5ndGggPT09IDApIHJldHVybiBoYXNoXG4gIGZvciAoaSA9IDAsIGxlbiA9IHN0ci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNociA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGFzaCA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpICsgY2hyXG4gICAgaGFzaCB8PSAwXG4gIH1cblxuICByZXR1cm4gaGFzaFxufVxuIiwidmFyIExpc3QgPSByZXF1aXJlKCcuL2xpc3QuanMnKVxudmFyIHdhdGNoID0gcmVxdWlyZSgnLi93YXRjaCcpXG52YXIgcmVtb3ZlID0gcmVxdWlyZSgnLi9yZW1vdmUnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENoYW5nZURldGVjdG9yXG5cbmZ1bmN0aW9uIENoYW5nZURldGVjdG9yIChzdGF0ZSwgb3B0aW9ucywgc2NvcGUpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIENoYW5nZURldGVjdG9yKSkge1xuICAgIHJldHVybiBuZXcgQ2hhbmdlRGV0ZWN0b3Ioc3RhdGUsIG9wdGlvbnMsIHNjb3BlKVxuICB9XG5cbiAgdGhpcy5leHByZXNzaW9ucyA9IG5ldyBMaXN0KClcbiAgdGhpcy51cGRhdGluZyA9IGZhbHNlXG4gIHRoaXMuZXhwcmVzc2lvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gIHRoaXMuaGVscGVycyA9IE9iamVjdC5jcmVhdGUobnVsbClcbiAgdGhpcy5zY29wZSA9IHNjb3BlIHx8IE9iamVjdC5jcmVhdGUobnVsbClcbiAgdGhpcy5zdGF0ZSA9IHN0YXRlXG4gIHRoaXMucXVldWUgPSBbXVxuICB0aGlzLmhlbHBlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gIHRoaXMucm9vdCA9IHRoaXMub24oJ3RoaXMnLCBmdW5jdGlvbiAoKSB7fSlcbn1cblxuQ2hhbmdlRGV0ZWN0b3IucHJvdG90eXBlLm9uID0gd2F0Y2hcbkNoYW5nZURldGVjdG9yLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IHJlbW92ZVxuXG5DaGFuZ2VEZXRlY3Rvci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlICh2YWx1ZSkge1xuICB0aGlzLnN0YXRlID0gdmFsdWVcbiAgdGhpcy51cGRhdGluZyA9IHRydWVcbiAgdGhpcy5yb290LnNldFZhbHVlKHZhbHVlKVxuICB0aGlzLnVwZGF0aW5nID0gZmFsc2VcbiAgdGhpcy5wcm9jZXNzUXVldWUoKVxufVxuXG5DaGFuZ2VEZXRlY3Rvci5wcm90b3R5cGUucHJvY2Vzc1F1ZXVlID0gZnVuY3Rpb24gcHJvY2Vzc1F1ZXVlICgpIHtcbiAgaWYgKHRoaXMudXBkYXRpbmcpIHJldHVyblxuICB0aGlzLnVwZGF0aW5nID0gdHJ1ZVxuICB3aGlsZSAodGhpcy5xdWV1ZS5sZW5ndGgpIHtcbiAgICB2YXIgcXVldWUgPSB0aGlzLnF1ZXVlXG4gICAgdGhpcy5xdWV1ZSA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHF1ZXVlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBxdWV1ZVtpXS51cGRhdGUodHJ1ZSlcbiAgICB9XG4gIH1cblxuICB0aGlzLnVwZGF0aW5nID0gZmFsc2Vcbn1cblxuQ2hhbmdlRGV0ZWN0b3IucHJvdG90eXBlLmFkZEhlbHBlciA9IGZ1bmN0aW9uIGFkZEhlbHBlciAobmFtZSwgZm4pIHtcbiAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdIZWxwZXIgbmFtZSBtdXN0IGJlIGEgc3RyaW5nJylcbiAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdIZWxwZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJylcbiAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm5cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gTGlzdFxuXG5mdW5jdGlvbiBMaXN0ICgpIHtcbiAgdGhpcy5oZWFkID0gbnVsbFxuICB0aGlzLnRhaWwgPSBudWxsXG59XG5cbkxpc3QucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCAodmFsdWUpIHtcbiAgaWYgKHRoaXMudGFpbCkge1xuICAgIHRoaXMudGFpbCA9IHRoaXMudGFpbC5uZXh0ID0gbmV3IExpc3RJdGVtKHRoaXMsIHZhbHVlLCB0aGlzLnRhaWwpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5oZWFkID0gdGhpcy50YWlsID0gbmV3IExpc3RJdGVtKHRoaXMsIHZhbHVlLCBudWxsKVxuICB9XG5cbiAgcmV0dXJuIHRoaXMudGFpbFxufVxuXG5mdW5jdGlvbiBMaXN0SXRlbSAobGlzdCwgdmFsdWUsIHByZXYpIHtcbiAgdGhpcy5saXN0ID0gbGlzdFxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5wcmV2ID0gcHJldlxuICB0aGlzLm5leHQgPSBudWxsXG59XG5cbkxpc3RJdGVtLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzID09PSB0aGlzLmxpc3QuaGVhZCkgdGhpcy5saXN0LmhlYWQgPSB0aGlzLm5leHRcbiAgaWYgKHRoaXMgPT09IHRoaXMubGlzdC50YWlsKSB0aGlzLmxpc3QudGFpbCA9IHRoaXMucHJldlxuICBpZiAodGhpcy5wcmV2KSB0aGlzLnByZXYubmV4dCA9IHRoaXMubmV4dFxuICBpZiAodGhpcy5uZXh0KSB0aGlzLm5leHQucHJldiA9IHRoaXMucHJldlxufVxuIiwidmFyIGhhc2ggPSByZXF1aXJlKCcuL2hhc2gnKVxuXG52YXIgdHlwZXMgPSBbZ3JvdXAsIGFycmF5LCBrZXl3b3JkLCBudW1iZXIsIHN0cmluZywgbGFiZWwsIHVuYXJ5XVxudmFyIGNvbnRpbnVhdGlvbnMgPSBbaGVscGVyLCBtZW1iZXIsIGluZGV4LCBiaW5hcnksIHRlcm5hcnldXG52YXIga2V5d29yZHMgPSBbJ3RydWUnLCAnZmFsc2UnLCAnbnVsbCcsICd1bmRlZmluZWQnXVxudmFyIGtleXdvcmRWYWx1ZXMgPSBbdHJ1ZSwgZmFsc2UsIG51bGwsIHVuZGVmaW5lZF1cbnZhciB1bmFyeU9wZXJhdG9ycyA9IFsnIScsICcrJywgJy0nLCAnficsICd2b2lkJywgJ2luc3RhbmNlb2YnXVxudmFyIHdoaXRlc2FwY2UgPSAnIFxceEEwXFx1RkVGRlxcZlxcblxcclxcdFxcduKAi1xcdTAwYTBcXHUxNjgw4oCLXFx1MTgwZVxcdTIwMDDigItcXHUyMDAxXFx1MjAwMuKAi1xcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDbigItcXHUyMDA3XFx1MjAwOOKAi1xcdTIwMDlcXHUyMDBh4oCLXFx1MjAyOFxcdTIwMjnigItcXHUyMDJmXFx1MjA1ZuKAi1xcdTMwMDAnLnNwbGl0KCcnKVxudmFyIHJlc2VydmVkQ2hhcmFjdGVycyA9IHdoaXRlc2FwY2UuY29uY2F0KCcoKXt9W118Jl49PjwrLSolL1xcXFwhQCNcXCdcIn4uLD86YCcuc3BsaXQoJycpKVxudmFyIGJvdW5kYXJ5ID0gd2hpdGVzYXBjZS5jb25jYXQoWycoJ10pXG52YXIgYmluYXJ5T3BlcmF0b3JzID0ge1xuICAnJSc6IDUsXG4gICcvJzogNSxcbiAgJyonOiA1LFxuICAnLSc6IDYsXG4gICcrJzogNixcbiAgJz4+JzogNyxcbiAgJzw8JzogNyxcbiAgJz4+Pic6IDcsXG4gICc8JzogOCxcbiAgJz4nOiA4LFxuICAnPD0nOiA4LFxuICAnPj0nOiA4LFxuICBpbnN0YW5jZW9mOiA4LFxuICBpbjogOCxcbiAgJyE9JzogOSxcbiAgJz09JzogOSxcbiAgJyE9PSc6IDksXG4gICc9PT0nOiA5LFxuICAnJic6IDEwLFxuICAnfCc6IDExLFxuICAnXic6IDEyLFxuICAnJiYnOiAxMyxcbiAgJ3x8JzogMTRcbn1cblxudmFyIHNvcnRlZEJpbmFyeU9wZXJhdG9ycyA9IE9iamVjdC5rZXlzKGJpbmFyeU9wZXJhdG9ycykuc29ydChmdW5jdGlvbiAobCwgcikge1xuICByZXR1cm4gbC5sZW5ndGggPCByLmxlbmd0aCA/IDEgOiAtMVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZVxuXG52YXIgY2FjaGUgPSBtb2R1bGUuZXhwb3J0cy5jYWNoZSA9IHt9XG5cbmZ1bmN0aW9uIHBhcnNlIChzdHIpIHtcbiAgcmV0dXJuIGNhY2hlW3N0cl0gfHwgKGNhY2hlW3N0cl0gPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgMCkpXG59XG5cbmZ1bmN0aW9uIGV4cHJlc3Npb24gKHN0ciwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0ciB8fCAhc3RyW3N0YXJ0XSkgcmV0dXJuIG51bGxcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0eXBlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB2YXIgbm9kZSA9IHR5cGVzW2ldKHN0ciwgc3RhcnQsIGVuZClcbiAgICBpZiAobm9kZSkgYnJlYWtcbiAgfVxuXG4gIGlmICghbm9kZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdVbmV4cGVjdGVkIHRva2VuOiAnICsgc3RyW3N0YXJ0XSArICcgaW4gXCInICsgc3RyLnNsaWNlKHN0YXJ0LCAyMCkgKyAnXCInXG4gICAgKVxuICB9XG5cbiAgdmFyIGN1ciA9IG5vZGUucmFuZ2VbMV1cbiAgd2hpbGUgKHdoaXRlc2FwY2UuaW5kZXhPZihzdHJbY3VyXSkgIT09IC0xKSBjdXIgPSBjdXIgKyAxXG5cbiAgcmV0dXJuIGVuZC5pbmRleE9mKHN0cltjdXJdKSAhPT0gLTEgPyBub2RlIDogY29udGludWVFeHByZXNzaW9uKHN0ciwgbm9kZSwgZW5kKVxufVxuXG5mdW5jdGlvbiBjb250aW51ZUV4cHJlc3Npb24gKHN0ciwgbm9kZSwgZW5kKSB7XG4gIHZhciBzdGFydCA9IG5vZGUucmFuZ2VbMV1cbiAgd2hpbGUgKHN0cltzdGFydF0gJiYgZW5kLmluZGV4T2Yoc3RyW3N0YXJ0XSkgPT09IC0xKSB7XG4gICAgbm9kZSA9IHRyaW0oc3RyLCBmaW5kQ29udGludWF0aW9uLCBzdGFydCwgZW5kKVxuICAgIHN0YXJ0ID0gbm9kZS5yYW5nZVsxXVxuICAgIHdoaWxlICh3aGl0ZXNhcGNlLmluZGV4T2Yoc3RyW3N0YXJ0XSkgIT09IC0xKSBzdGFydCA9IHN0YXJ0ICsgMVxuICB9XG5cbiAgaWYgKGVuZC5pbmRleE9mKHN0cltzdGFydF0pID09PSAtMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdFeHBlY3RlZCB0byBmaW5kIHRva2VuOiAnICsgZW5kXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIG5vZGVcblxuICBmdW5jdGlvbiBmaW5kQ29udGludWF0aW9uIChzdHIsIHN0YXJ0LCBlbmQpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvbnRpbnVhdGlvbnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICB2YXIgY29udGludWF0aW9uID0gY29udGludWF0aW9uc1tpXShub2RlLCBzdHIsIHN0YXJ0LCBlbmQpXG4gICAgICBpZiAoY29udGludWF0aW9uKSBicmVha1xuICAgIH1cblxuICAgIGlmICghY29udGludWF0aW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdVbmV4cGVjdGVkIHRva2VuOiAnICsgc3RyW3N0YXJ0XSArICcgaW4gXCInICsgc3RyLnNsaWNlKHN0YXJ0LCBzdGFydCArIDIwKSArICdcIidcbiAgICAgIClcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGludWF0aW9uXG4gIH1cbn1cblxuZnVuY3Rpb24ga2V5d29yZCAoc3RyLCBzdGFydCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGtleXdvcmRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHZhciB3b3JkID0ga2V5d29yZHNbaV1cbiAgICBmb3IgKHZhciBqID0gMCwgbDIgPSB3b3JkLmxlbmd0aDsgaiA8IGwyOyArK2opIHtcbiAgICAgIGlmIChzdHJbc3RhcnQgKyBqXSAhPT0gd29yZFtqXSkgYnJlYWtcbiAgICB9XG5cbiAgICBpZiAoaiA9PT0gbDIpIGJyZWFrXG4gIH1cblxuICBpZiAoaSA9PT0gbCkgcmV0dXJuIG51bGxcblxuICByZXR1cm4gbmV3IE5vZGUoXG4gICAgJ2tleXdvcmQnLFxuICAgIFtzdGFydCwgc3RhcnQgKyB3b3JkLmxlbmd0aF0sXG4gICAgc3RyLFxuICAgIG51bGwsXG4gICAgdHJ1ZSxcbiAgICBrZXl3b3JkVmFsdWVzW3dvcmRdXG4gIClcbn1cblxuZnVuY3Rpb24gc3RyaW5nIChzdHIsIHN0YXJ0KSB7XG4gIHZhciBvcGVuID0gc3RyW3N0YXJ0XVxuICBpZiAob3BlbiAhPT0gJ1wiJyAmJiBvcGVuICE9PSAnXFwnJykgcmV0dXJuIG51bGxcbiAgdmFyIGN1ciA9IHN0YXJ0ICsgMVxuICB2YXIgY2hyID0gc3RyW2N1cl1cbiAgd2hpbGUgKChjaHIpICYmIGNociAhPT0gb3Blbikge1xuICAgIGlmIChzdHIgPT09ICdcXFxcJykgKytjdXJcbiAgICBjdXIgPSBjdXIgKyAxXG4gICAgY2hyID0gc3RyW2N1cl1cbiAgfVxuXG4gIGlmIChzdHJbY3VyKytdICE9PSBvcGVuKSB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHN0cmluZyB0byBiZSBjbG9zZWQnKVxuICByZXR1cm4gbmV3IE5vZGUoXG4gICAgJ3N0cmluZycsXG4gICAgW3N0YXJ0LCBjdXJdLFxuICAgIHN0cixcbiAgICBudWxsLFxuICAgIHRydWUsXG4gICAgc3RyLnNsaWNlKHN0YXJ0ICsgMSwgY3VyIC0gMSlcbiAgKVxufVxuXG5mdW5jdGlvbiBudW1iZXIgKHN0ciwgc3RhcnQpIHtcbiAgdmFyIGRlY2ltYWwgPSBmYWxzZVxuICB2YXIgY3VyID0gc3RhcnRcbiAgdmFyIGNociA9IHN0cltjdXJdXG4gIHdoaWxlIChjaHIpIHtcbiAgICBpZiAoY2hyID09PSAnLicpIHtcbiAgICAgIGlmIChkZWNpbWFsKSBicmVha1xuICAgICAgZGVjaW1hbCA9IHRydWVcbiAgICB9IGVsc2UgaWYgKGNociA8ICcwJyB8fCBjaHIgPiAnOScpIGJyZWFrXG4gICAgY3VyID0gY3VyICsgMVxuICAgIGNociA9IHN0cltjdXJdXG4gIH1cblxuICByZXR1cm4gY3VyIC0gc3RhcnQgPyBuZXcgTm9kZShcbiAgICAnbnVtYmVyJyxcbiAgICBbc3RhcnQsIGN1cl0sXG4gICAgc3RyLFxuICAgIG51bGwsXG4gICAgdHJ1ZSxcbiAgICBwYXJzZUludChzdHIuc2xpY2Uoc3RhcnQsIGN1ciksIDEwKVxuICApIDogbnVsbFxufVxuXG5mdW5jdGlvbiBsYWJlbCAoc3RyLCBzdGFydCkge1xuICB2YXIgY2hyID0gc3RyW3N0YXJ0XVxuICBpZiAoY2hyIDwgMCB8fCBjaHIgPiA5IHx8IHJlc2VydmVkQ2hhcmFjdGVycy5pbmRleE9mKGNocikgIT09IC0xKSByZXR1cm4gbnVsbFxuICB2YXIgY3VyID0gc3RhcnQgKyAxXG4gIGNociA9IHN0cltjdXJdXG5cbiAgd2hpbGUgKGNocikge1xuICAgIGlmIChyZXNlcnZlZENoYXJhY3RlcnMuaW5kZXhPZihjaHIpICE9PSAtMSkgYnJlYWtcbiAgICBjdXIgPSBjdXIgKyAxXG4gICAgY2hyID0gc3RyW2N1cl1cbiAgfVxuXG4gIHJldHVybiBuZXcgTm9kZSgnbGFiZWwnLCBbc3RhcnQsIGN1cl0sIHN0ciwgbnVsbClcbn1cblxuZnVuY3Rpb24gYXJyYXkgKHN0ciwgc3RhcnQpIHtcbiAgaWYgKHN0cltzdGFydF0gIT09ICdbJykgcmV0dXJuIG51bGxcbiAgdmFyIGN1ciA9IHN0YXJ0ICsgMVxuICB2YXIgY2hpbGRyZW4gPSBbXVxuICB2YXIgZW5kcyA9IFsnLCcsICddJ11cbiAgdmFyIG5leHQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgY3VyLCBlbmRzKVxuICB3aGlsZSAobmV4dCkge1xuICAgIGNoaWxkcmVuLnB1c2gobmV4dClcbiAgICBjdXIgPSBuZXh0LnJhbmdlWzFdXG4gICAgd2hpbGUgKGVuZHMuaW5kZXhPZihzdHJbY3VyXSkgPT09IC0xKSBjdXIgPSBjdXIgKyAxXG4gICAgaWYgKHN0cltjdXJdID09PSAnXScpIGJyZWFrXG4gICAgY3VyID0gY3VyICsgMVxuICAgIG5leHQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgY3VyLCBlbmRzKVxuICB9XG5cbiAgcmV0dXJuIG5ldyBOb2RlKCdhcnJheScsIFtzdGFydCwgY3VyICsgMV0sIHN0ciwge1xuICAgIGNoaWxkcmVuOiBjaGlsZHJlblxuICB9KVxufVxuXG5mdW5jdGlvbiBncm91cCAoc3RyLCBzdGFydCkge1xuICBpZiAoc3RyW3N0YXJ0XSAhPT0gJygnKSByZXR1cm4gbnVsbFxuXG4gIHZhciBub2RlID0gdHJpbShzdHIsIGV4cHJlc3Npb24sIHN0YXJ0ICsgMSwgWycpJ10pXG4gIHZhciBlbmQgPSBub2RlLnJhbmdlWzFdXG4gIHdoaWxlICh3aGl0ZXNhcGNlLmluZGV4T2Yoc3RyW2VuZF0pICE9PSAtMSkgZW5kID0gZW5kICsgMVxuICByZXR1cm4gbmV3IE5vZGUoJ2dyb3VwJywgW3N0YXJ0LCBlbmQgKyAxXSwgc3RyLCB7XG4gICAgZXhwcmVzc2lvbjogbm9kZVxuICB9KVxufVxuXG5mdW5jdGlvbiBoZWxwZXIgKGxlZnQsIHN0ciwgc3RhcnQsIGVuZCkge1xuICBpZiAobGVmdC50eXBlICE9PSAnbGFiZWwnIHx8IHN0cltzdGFydF0gIT09ICcoJykgcmV0dXJuXG4gIHZhciBjdXIgPSBzdGFydCArIDFcbiAgdmFyIGNoaWxkcmVuID0gW11cbiAgdmFyIGVuZHMgPSBbJywnLCAnKSddXG4gIHZhciBuZXh0ID0gdHJpbShzdHIsIGV4cHJlc3Npb24sIGN1ciwgZW5kcylcbiAgd2hpbGUgKG5leHQpIHtcbiAgICBjaGlsZHJlbi5wdXNoKG5leHQpXG4gICAgY3VyID0gbmV4dC5yYW5nZVsxXVxuICAgIHdoaWxlIChlbmRzLmluZGV4T2Yoc3RyW2N1cl0pID09PSAtMSkgY3VyID0gY3VyICsgMVxuICAgIGlmIChzdHJbY3VyXSA9PT0gJyknKSBicmVha1xuICAgIGN1ciA9IGN1ciArIDFcbiAgICBuZXh0ID0gdHJpbShzdHIsIGV4cHJlc3Npb24sIGN1ciwgZW5kcylcbiAgfVxuXG4gIGN1ciA9IGN1ciArIDFcblxuICByZXR1cm4gbmV3IE5vZGUoJ2hlbHBlcicsIFtsZWZ0LnJhbmdlWzBdLCBjdXJdLCBzdHIsIHtcbiAgICBsZWZ0OiBsZWZ0LFxuICAgIGNoaWxkcmVuOiBjaGlsZHJlblxuICB9KVxufVxuXG5mdW5jdGlvbiBtZW1iZXIgKGxlZnQsIHN0ciwgc3RhcnQpIHtcbiAgaWYgKHN0cltzdGFydF0gIT09ICcuJykgcmV0dXJuIG51bGxcbiAgdmFyIG5vZGUgPSBsYWJlbChzdHIsIHN0YXJ0ICsgMSlcblxuICBpZiAoIW5vZGUpIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgTGFiZWwnKVxuICByZXR1cm4gbmV3IE5vZGUoJ21lbWJlcicsIFtsZWZ0LnJhbmdlWzBdLCBub2RlLnJhbmdlWzFdXSwgc3RyLCB7XG4gICAgbGVmdDogbGVmdCxcbiAgICByaWdodDogbm9kZVxuICB9KVxufVxuXG5mdW5jdGlvbiBpbmRleCAobGVmdCwgc3RyLCBzdGFydCkge1xuICBpZiAoc3RyW3N0YXJ0XSAhPT0gJ1snKSByZXR1cm4gbnVsbFxuICB2YXIgbm9kZSA9IHRyaW0oc3RyLCBleHByZXNzaW9uLCBzdGFydCArIDEsIFsnXSddKVxuICB2YXIgZW5kID0gbm9kZS5yYW5nZVsxXSArIDFcbiAgd2hpbGUgKHdoaXRlc2FwY2UuaW5kZXhPZihzdHJbZW5kXSkgIT09IC0xKSBlbmQgPSBlbmQgKyAxXG4gIHJldHVybiBuZXcgTm9kZSgnaW5kZXgnLCBbbGVmdC5yYW5nZVswXSwgZW5kXSwgc3RyLCB7XG4gICAgbGVmdDogbGVmdCxcbiAgICByaWdodDogbm9kZVxuICB9KVxufVxuXG5mdW5jdGlvbiB1bmFyeSAoc3RyLCBzdGFydCwgZW5kKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdW5hcnlPcGVyYXRvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgdmFyIG9wID0gdW5hcnlPcGVyYXRvcnNbaV1cbiAgICBmb3IgKHZhciBqID0gMCwgbDIgPSBvcC5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICBpZiAoc3RyW3N0YXJ0ICsgal0gIT09IG9wW2pdKSBicmVha1xuICAgIH1cblxuICAgIGlmIChqID09PSBsMikgYnJlYWtcbiAgfVxuXG4gIGlmIChpID09PSBsKSByZXR1cm4gbnVsbFxuICB2YXIgbGVuID0gb3AubGVuZ3RoXG4gIHZhciBuZXh0ID0gc3RyW3N0YXJ0ICsgbGVuXVxuICBpZiAobGVuID4gMSAmJiBib3VuZGFyeS5pbmRleE9mKG5leHQpID09PSAnLTEnKSByZXR1cm4gbnVsbFxuICB2YXIgY2hpbGQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgc3RhcnQgKyBsZW4sIGVuZClcbiAgdmFyIG5vZGUgPSBuZXcgTm9kZSgndW5hcnknLCBbc3RhcnQsIGNoaWxkLnJhbmdlWzFdXSwgc3RyLCB7XG4gICAgb3A6IG9wLFxuICAgIHJpZ2h0OiBjaGlsZCxcbiAgICBwcmVzaWRlbmNlOiA0XG4gIH0pXG5cbiAgaWYgKGNoaWxkLnByZXNpZGVuY2UgJiYgY2hpbGQucHJlc2lkZW5jZSA+IDQpIHtcbiAgICBub2RlLnJpZ2h0ID0gY2hpbGQubGVmdFxuICAgIGNoaWxkLmxlZnQgPSBub2RlXG4gICAgcmV0dXJuIGNoaWxkXG4gIH1cblxuICByZXR1cm4gbm9kZVxufVxuXG5mdW5jdGlvbiBiaW5hcnkgKGxlZnQsIHN0ciwgc3RhcnQsIGVuZCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHNvcnRlZEJpbmFyeU9wZXJhdG9ycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB2YXIgb3AgPSBzb3J0ZWRCaW5hcnlPcGVyYXRvcnNbaV1cbiAgICBmb3IgKHZhciBqID0gMCwgbDIgPSBvcC5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICBpZiAoc3RyW3N0YXJ0ICsgal0gIT09IG9wW2pdKSBicmVha1xuICAgIH1cblxuICAgIGlmIChqID09PSBsMikgYnJlYWtcbiAgfVxuXG4gIGlmIChpID09PSBsKSByZXR1cm4gbnVsbFxuICBpZiAob3AgPT09ICdpbicgfHwgb3AgPT09ICdpbnN0YW5jZW9mJykge1xuICAgIHZhciBuZXh0ID0gc3RyW3N0YXJ0ICsgb3AubGVuZ3RoXVxuICAgIGlmIChib3VuZGFyeS5pbmRleE9mKG5leHQpID09PSAtMSkgcmV0dXJuIG51bGxcbiAgfVxuXG4gIHZhciBwcmVzaWRlbmNlID0gYmluYXJ5T3BlcmF0b3JzW29wXVxuICB2YXIgcmlnaHQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgc3RhcnQgKyBvcC5sZW5ndGgsIGVuZClcbiAgdmFyIG5vZGUgPSBuZXcgTm9kZSgnYmluYXJ5JywgW2xlZnQucmFuZ2VbMF0sIHJpZ2h0LnJhbmdlWzFdXSwgc3RyLCB7XG4gICAgb3A6IG9wLFxuICAgIGxlZnQ6IGxlZnQsXG4gICAgcmlnaHQ6IHJpZ2h0LFxuICAgIHByZXNpZGVuY2U6IHByZXNpZGVuY2VcbiAgfSlcblxuICBpZiAocmlnaHQucHJlc2lkZW5jZSAmJiByaWdodC5wcmVzaWRlbmNlID49IHByZXNpZGVuY2UpIHtcbiAgICBub2RlLnJpZ2h0ID0gcmlnaHQubGVmdFxuICAgIHJpZ2h0LmxlZnQgPSBub2RlXG4gICAgcmV0dXJuIHJpZ2h0XG4gIH1cblxuICByZXR1cm4gbm9kZVxufVxuXG5mdW5jdGlvbiB0ZXJuYXJ5IChjb25kaXRpb24sIHN0ciwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RyW3N0YXJ0XSAhPT0gJz8nKSByZXR1cm4gbnVsbFxuICB2YXIgb2sgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgc3RhcnQgKyAxLCBbJzonXSlcbiAgaWYgKCFvaykgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCB0b2tlbjogXCI6XCInKVxuICB2YXIgbmV4dCA9IG9rLnJhbmdlWzFdICsgMVxuICB3aGlsZSAod2hpdGVzYXBjZS5pbmRleE9mKHN0cltuZXh0XSkgIT09IC0xKSBuZXh0ID0gbmV4dCArIDFcbiAgdmFyIG5vdCA9IHRyaW0oc3RyLCBleHByZXNzaW9uLCBuZXh0ICsgMSwgZW5kKVxuXG4gIHJldHVybiBuZXcgTm9kZSgndGVybmFyeScsIFtjb25kaXRpb24ucmFuZ2VbMF0sIG5vdC5yYW5nZVsxXV0sIHN0ciwge1xuICAgIGxlZnQ6IGNvbmRpdGlvbixcbiAgICBtaWRkbGU6IG9rLFxuICAgIHJpZ2h0OiBub3QsXG4gICAgcHJlc2lkZW5jZTogMTVcbiAgfSlcbn1cblxuZnVuY3Rpb24gdHJpbSAoc3RyLCBwYXJzZSwgc3RhcnQsIGVuZCkge1xuICB2YXIgY2hyID0gc3RyW3N0YXJ0XVxuICB3aGlsZSAoY2hyKSB7XG4gICAgaWYgKHdoaXRlc2FwY2UuaW5kZXhPZihjaHIpID09PSAtMSkgYnJlYWtcbiAgICBzdGFydCA9IHN0YXJ0ICsgMVxuICAgIGNociA9IHN0cltzdGFydF1cbiAgfVxuXG4gIHJldHVybiBwYXJzZShzdHIsIHN0YXJ0LCBlbmQgfHwgW3VuZGVmaW5lZF0pXG59XG5cbmZ1bmN0aW9uIE5vZGUgKHR5cGUsIHJhbmdlLCBzdHIsIGRhdGEsIGxpdHRlcmFsLCB2YWwpIHtcbiAgdGhpcy50eXBlID0gdHlwZVxuICB0aGlzLnJhbmdlID0gcmFuZ2VcbiAgdGhpcy52YWx1ZSA9IHN0ci5zbGljZShyYW5nZVswXSwgcmFuZ2VbMV0pXG4gIHRoaXMuaWQgPSAnXycgKyBoYXNoKHRoaXMudmFsdWUpXG4gIHRoaXMuZGF0YSA9IGRhdGFcbiAgdGhpcy5saXR0ZXJhbCA9ICEhbGl0dGVyYWxcbiAgdGhpcy5yYXdWYWx1ZSA9IHZhbFxufVxuIiwidmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpXG5cbm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlXG5cbmZ1bmN0aW9uIHJlbW92ZSAoZXhwcmVzc2lvbiwgaGFuZGxlcikge1xuICB2YXIgbm9kZSA9IHBhcnNlKGV4cHJlc3Npb24pXG4gIHZhciBleHBcblxuICBpZiAoIW5vZGUgfHwgIShleHAgPSB0aGlzLmV4cHJlc3Npb25zW25vZGUudmFsdWVdKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgZXhwLnJlbW92ZShoYW5kbGVyKVxufVxuIiwidmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpXG52YXIgYnVpbGQgPSByZXF1aXJlKCcuL2J1aWxkJylcbnZhciBFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJylcblxubW9kdWxlLmV4cG9ydHMgPSB3YXRjaFxuXG5mdW5jdGlvbiB3YXRjaCAoZXhwcmVzc2lvbiwgaGFuZGxlcikge1xuICB2YXIgZXhwID0gdGhpcy5leHByZXNzaW9uc1tleHByZXNzaW9uXVxuXG4gIGlmICghZXhwKSB7XG4gICAgZXhwID0gd2F0Y2hOb2RlKHRoaXMsIHBhcnNlKGV4cHJlc3Npb24pLCBoYW5kbGVyKVxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICBoYW5kbGVyKGV4cC52YWx1ZSlcbiAgICB9XG4gIH0gZWxzZSBpZiAoZXhwLmhhbmRsZXJzLmluZGV4T2YoaGFuZGxlcikgPT09IC0xKSB7XG4gICAgZXhwLmhhbmRsZXJzLnB1c2goaGFuZGxlcilcbiAgICBoYW5kbGVyKGV4cC52YWx1ZSlcbiAgfVxuXG4gIHJldHVybiBleHBcbn1cblxuZnVuY3Rpb24gd2F0Y2hOb2RlIChkZXRlY3Rvciwgbm9kZSwgaGFuZGxlcikge1xuICB2YXIgZXhwcmVzc2lvblxuXG4gIGlmIChkZXRlY3Rvci5leHByZXNzaW9uc1tub2RlLnZhbHVlXSkgcmV0dXJuIGRldGVjdG9yLmV4cHJlc3Npb25zW25vZGUudmFsdWVdXG4gIGlmIChub2RlLnR5cGUgPT09ICdoZWxwZXInKSB7XG4gICAgZXhwcmVzc2lvbiA9IHdhdGNoSGVscGVyKGRldGVjdG9yLCBub2RlLCBoYW5kbGVyKVxuICB9IGVsc2Uge1xuICAgIGV4cHJlc3Npb24gPSB3YXRjaEV4cHJlc3Npb24oZGV0ZWN0b3IsIG5vZGUpXG4gIH1cblxuICBleHByZXNzaW9uLnVwZGF0ZShmYWxzZSlcblxuICBpZiAoaGFuZGxlcikge1xuICAgIGV4cHJlc3Npb24uaGFuZGxlcnMucHVzaChoYW5kbGVyKVxuICB9XG5cbiAgcmV0dXJuIGV4cHJlc3Npb25cbn1cblxuZnVuY3Rpb24gd2F0Y2hFeHByZXNzaW9uIChkZXRlY3Rvciwgbm9kZSkge1xuICB2YXIgYnVpbHQgPSBidWlsZChub2RlLCBkZXRlY3Rvci5zY29wZSlcbiAgdmFyIGhlbHBlcnMgPSBidWlsdC5kZXBzLmhlbHBlcnNcbiAgdmFyIGxlbiA9IGhlbHBlcnMubGVuZ3RoXG4gIHZhciBkZXBzID0gbmV3IEFycmF5KGxlbilcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgZGVwc1tpXSA9IHdhdGNoTm9kZShkZXRlY3RvciwgYnVpbHQuZGVwcy5oZWxwZXJzW2ldKVxuICB9XG5cbiAgaWYgKChidWlsdC5kZXBzLmRhdGEgfHwgYnVpbHQuZGVwcy5zY29wZSkgJiYgZGV0ZWN0b3Iucm9vdCkge1xuICAgIGRlcHMucHVzaChkZXRlY3Rvci5yb290KVxuICB9XG5cbiAgdmFyIGV4cHJlc3Npb24gPSBuZXcgRXhwcmVzc2lvbihkZXRlY3RvciwgYnVpbHQuY29tcGlsZWQsIG5vZGUsIGRlcHMpXG5cbiAgZGV0ZWN0b3IuZXhwcmVzc2lvbnNbbm9kZS52YWx1ZV0gPSBleHByZXNzaW9uXG5cbiAgcmV0dXJuIGV4cHJlc3Npb25cbn1cblxuZnVuY3Rpb24gd2F0Y2hIZWxwZXIgKGRldGVjdG9yLCBub2RlKSB7XG4gIHZhciBuYW1lID0gbm9kZS5kYXRhLmxlZnQudmFsdWVcbiAgdmFyIGNvbnN0cnVjdG9yID0gZGV0ZWN0b3IuaGVscGVyc1tuYW1lXVxuICBpZiAoIWNvbnN0cnVjdG9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGhlbHBlcjogJyArIG5hbWUpXG4gIH1cblxuICB2YXIgY2hpbGRyZW4gPSBub2RlLmRhdGEuY2hpbGRyZW5cbiAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICB2YXIgZGVwcyA9IG5ldyBBcnJheShsZW4pXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGRlcHNbaV0gPSB3YXRjaE5vZGUoZGV0ZWN0b3IsIGNoaWxkcmVuW2ldKVxuICB9XG5cbiAgdmFyIGhlbHBlciA9IGNvbnN0cnVjdG9yKGNoYW5nZSlcblxuICBpZiAodHlwZW9mIGhlbHBlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBFcnJvcignaGVscGVyICcgKyBuYW1lICsgJyBkaWQgbm90IHJldHVybiBhIGZ1bmN0aW9uJylcbiAgfVxuXG4gIHZhciBidWlsdCA9IGJ1aWxkLmhlbHBlcihkZXBzLmxlbmd0aClcbiAgdmFyIGV4cHJlc3Npb24gPSBuZXcgRXhwcmVzc2lvbihkZXRlY3RvciwgY2hlY2ssIG5vZGUsIGRlcHMpXG5cbiAgZGV0ZWN0b3IuZXhwcmVzc2lvbnNbbm9kZS52YWx1ZV0gPSBleHByZXNzaW9uXG4gIGRldGVjdG9yLmhlbHBlcnNbbm9kZS5pZF0gPSBleHByZXNzaW9uXG5cbiAgcmV0dXJuIGV4cHJlc3Npb25cblxuICBmdW5jdGlvbiBjaGFuZ2UgKHZhbHVlKSB7XG4gICAgcmV0dXJuIGV4cHJlc3Npb24uc2V0VmFsdWUodmFsdWUpXG4gIH1cblxuICBmdW5jdGlvbiBjaGVjayAoKSB7XG4gICAgcmV0dXJuIGJ1aWx0KGhlbHBlciwgZGVwcylcbiAgfVxufVxuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0aWYgKCFvYmogfHwgdG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJyB8fCBvYmoubm9kZVR5cGUgfHwgb2JqLnNldEludGVydmFsKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGhhc19vd25fY29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCA9IG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IucHJvdG90eXBlICYmIGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzX293bl9jb25zdHJ1Y3RvciAmJiAhaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIE93biBwcm9wZXJ0aWVzIGFyZSBlbnVtZXJhdGVkIGZpcnN0bHksIHNvIHRvIHNwZWVkIHVwLFxuXHQvLyBpZiBsYXN0IG9uZSBpcyBvd24sIHRoZW4gYWxsIHByb3BlcnRpZXMgYXJlIG93bi5cblx0dmFyIGtleTtcblx0Zm9yIChrZXkgaW4gb2JqKSB7fVxuXG5cdHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCB8fCBoYXNPd24uY2FsbChvYmosIGtleSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gXCJib29sZWFuXCIpIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH0gZWxzZSBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdGFyZ2V0ICE9PSBcImZ1bmN0aW9uXCIgfHwgdGFyZ2V0ID09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHRmb3IgKDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmICgob3B0aW9ucyA9IGFyZ3VtZW50c1tpXSkgIT0gbnVsbCkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yIChuYW1lIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0W25hbWVdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1tuYW1lXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICh0YXJnZXQgPT09IGNvcHkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoZGVlcCAmJiBjb3B5ICYmIChpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpKSkge1xuXHRcdFx0XHRcdGlmIChjb3B5SXNBcnJheSkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmIChjb3B5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
