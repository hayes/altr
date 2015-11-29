(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"extend":38}],2:[function(require,module,exports){
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./altr-extend":1,"./destroy":6,"./element-node":7,"./get-element":8,"./merge-hooks":10,"./raf":11,"./remove":12,"./render":13,"./run-hooks":14,"./template-string":25,"./text-node":26,"./to-string":27,"batch-queue":28,"dirtybit":32,"events":37,"extend":38}],3:[function(require,module,exports){
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./index":9}],5:[function(require,module,exports){
module.exports = decorators

function decorators (el, attrs, lookups) {
  var altr = this
  var hooks = []

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

function destroy(children, el, done) {
  var altr = this

  altr.remove(children, el, function(el) {
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

  for (var i = 0, l = altr.tagList.length; i < l; ++i) {
    if (attr = altr_tags[altr.tagList[i].attr]) {
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

function merge(children) {
  var altr = this

  return {
      insert: each.bind(null, 'insert')
    , destroy: each.bind(null, 'destroy')
    , remove: remove
  }

  function each(type, el) {
    var nodes = children()

    for (var i = 0, l = nodes.length; i < l; i++) {
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
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
    if (children) remove(el, insert)
  }

  function insert() {
    if (children) {
      return
    }

    el.innerHTML = content
    children = altr.initNodes(el.childNodes, null, lookups.state, lookups.scope)
  }

  function remove(el, done) {
    if (!children) {
      return done()
    }

    if (removeListeners.push(done) > 1) {
      return
    }

    altr.destroy(children, el, function() {
      var listener

      if (!children) {
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

},{}],38:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvYWx0ci1leHRlbmQuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvYWx0ci5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9hdHRyaWJ1dGVzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL2Jyb3dzZXIuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvZGVjb3JhdG9ycy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9kZXN0cm95LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL2VsZW1lbnQtbm9kZS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9nZXQtZWxlbWVudC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9tZXJnZS1ob29rcy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9yYWYuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvcmVtb3ZlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3JlbmRlci5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi9ydW4taG9va3MuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvc2V0LWNoaWxkcmVuLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvY2hpbGRyZW4uanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3MvcGxhY2Vob2xkZXIuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy9yYXcuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGFncy90ZXh0LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RhZ3Mvd2l0aC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL2xpYi90ZW1wbGF0ZS1zdHJpbmcuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9saWIvdGV4dC1ub2RlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbGliL3RvLXN0cmluZy5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9iYXRjaC1xdWV1ZS9pbmRleC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvYnVpbGQuanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL2V4cHJlc3Npb24uanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL2hhc2guanMiLCIvVXNlcnMvbWhheWVzL2NvZGUvYWx0ci9ub2RlX21vZHVsZXMvZGlydHliaXQvbGliL2luZGV4LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9saXN0LmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi9wYXJzZS5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9kaXJ0eWJpdC9saWIvcmVtb3ZlLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2RpcnR5Yml0L2xpYi93YXRjaC5qcyIsIi9Vc2Vycy9taGF5ZXMvY29kZS9hbHRyL25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL21oYXllcy9jb2RlL2FsdHIvbm9kZV9tb2R1bGVzL2V4dGVuZC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBleHRlbmQgPSByZXF1aXJlKCdleHRlbmQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJFeHRlbmRcblxuZnVuY3Rpb24gYWx0ckV4dGVuZCAoYmFzZSwgb3B0aW9ucykge1xuICB2YXIgYmFzZU9wdGlvbnMgPSBleHRlbmQodHJ1ZSwgYmFzZSwgb3B0aW9ucylcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgZXh0ZW5zaW9uLnJlbmRlciA9IGFsdHIucmVuZGVyLmJpbmQoYWx0ciwgYmFzZU9wdGlvbnMpXG4gIGV4dGVuc2lvbi5leHRlbmQgPSBhbHRyLmV4dGVuZC5iaW5kKGFsdHIpXG4gIGV4dGVuc2lvbi5hZGRUYWcgPSBhbHRyLmFkZFRhZy5iaW5kKGFsdHIpXG4gIGV4dGVuc2lvbi5pbmNsdWRlID0gYWx0ci5pbmNsdWRlLmJpbmQoYWx0cilcbiAgZXh0ZW5zaW9uLmFkZEhlbHBlciA9IGFsdHIuYWRkSGVscGVyLmJpbmQoYWx0cilcbiAgZXh0ZW5zaW9uLmFkZERlY29yYXRvciA9IGFsdHIuYWRkRGVjb3JhdG9yLmJpbmQoYWx0cilcblxuICByZXR1cm4gZXh0ZW5zaW9uXG5cbiAgZnVuY3Rpb24gZXh0ZW5zaW9uIChyb290LCBzdGF0ZSwgb3B0aW9ucykge1xuICAgIHJldHVybiBhbHRyKHJvb3QsIHN0YXRlLCBleHRlbmQoXG4gICAgICAgIHRydWVcbiAgICAgICwgT2JqZWN0LmNyZWF0ZShiYXNlT3B0aW9ucylcbiAgICAgICwgb3B0aW9ucyB8fCB7fVxuICAgICkpXG4gIH1cbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlclxudmFyIGJhdGNoID0gcmVxdWlyZSgnYmF0Y2gtcXVldWUnKVxudmFyIGRpcnR5Yml0ID0gcmVxdWlyZSgnZGlydHliaXQnKVxudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpXG5cbnZhciB0ZW1wbGF0ZVN0cmluZyA9IHJlcXVpcmUoJy4vdGVtcGxhdGUtc3RyaW5nJylcbnZhciBlbGVtZW50Tm9kZSA9IHJlcXVpcmUoJy4vZWxlbWVudC1ub2RlJylcbnZhciBtZXJnZUhvb2tzID0gcmVxdWlyZSgnLi9tZXJnZS1ob29rcycpXG52YXIgYWx0ckV4dGVuZCA9IHJlcXVpcmUoJy4vYWx0ci1leHRlbmQnKVxudmFyIHRleHROb2RlID0gcmVxdWlyZSgnLi90ZXh0LW5vZGUnKVxudmFyIHRvU3RyaW5nID0gcmVxdWlyZSgnLi90by1zdHJpbmcnKVxudmFyIHJ1bkhvb2tzID0gcmVxdWlyZSgnLi9ydW4taG9va3MnKVxudmFyIGdldEVsID0gcmVxdWlyZSgnLi9nZXQtZWxlbWVudCcpXG52YXIgZGVzdHJveSA9IHJlcXVpcmUoJy4vZGVzdHJveScpXG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKVxudmFyIHJlbW92ZSA9IHJlcXVpcmUoJy4vcmVtb3ZlJylcbnZhciByYWYgPSByZXF1aXJlKCcuL3JhZicpXG5cbi8vIGR5bmFtaWMgcmVxdWlyZSBzbyBpdCBkb2VzIG5vdCBtYWtlIGl0IGludG8gdGhlIGJyb3dzZXJpZnkgYnVuZGxlXG52YXIgZG9tTW9kdWxlID0gJ21pY3JvLWRvbSdcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuaGVscGVycyA9IHt9XG5hbHRyLmRlY29yYXRvcnMgPSB7fVxuXG5hbHRyLnJlbmRlciA9IHJlbmRlclxuYWx0ci5hZGRUYWcgPSBhZGRUYWdcbmFsdHIuZXh0ZW5kID0gYWx0ckV4dGVuZFxuYWx0ci5hZGRIZWxwZXIgPSBhZGRIZWxwZXJcbmFsdHIuYWRkRGVjb3JhdG9yID0gYWRkRGVjb3JhdG9yXG5cbmZ1bmN0aW9uIGFsdHIgKHJvb3QsIGRhdGEsIF9vcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBfb3B0aW9ucykgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuZXctY2FwXG4gIH1cblxuICB2YXIgb3B0aW9ucyA9IF9vcHRpb25zIHx8IHt9XG5cbiAgdGhpcy5oZWxwZXJzID0gZXh0ZW5kKFxuICAgICAgZmFsc2VcbiAgICAsIE9iamVjdC5jcmVhdGUoYWx0ci5oZWxwZXJzKVxuICAgICwgb3B0aW9ucy5oZWxwZXJzIHx8IHt9XG4gIClcblxuICB0aGlzLmRlY29yYXRvcnMgPSBleHRlbmQoXG4gICAgICBmYWxzZVxuICAgICwgT2JqZWN0LmNyZWF0ZShhbHRyLmRlY29yYXRvcnMpXG4gICAgLCBvcHRpb25zLmRlY29yYXRvcnMgfHwge31cbiAgKVxuXG4gIHRoaXMucm9vdCA9IHJvb3RcbiAgdGhpcy5zeW5jID0gISFvcHRpb25zLnN5bmNcbiAgdGhpcy50YWdSZWdFeHAgPSBtYWtlVGFnUmVnRXhwKG9wdGlvbnMuZGVsaW1pdGVycylcbiAgdGhpcy5kb2N1bWVudCA9IG9wdGlvbnMuZG9jIHx8IGdsb2JhbC5kb2N1bWVudCB8fCByZXF1aXJlKGRvbU1vZHVsZSkuZG9jdW1lbnRcbiAgdGhpcy5sb29rdXBzID0gZGlydHliaXQoZGF0YSwge2hlbHBlcnM6IHRoaXMuaGVscGVyc30sIHt9KVxuXG4gIHRoaXMuYmF0Y2ggPSBiYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLnN5bmMpIHtcbiAgICAgIHJhZih0aGlzLnJ1bkJhdGNoLmJpbmQodGhpcykpXG4gICAgfVxuICB9LmJpbmQodGhpcykpXG5cbiAgaWYgKGdsb2JhbC5CdWZmZXIgJiYgcm9vdCBpbnN0YW5jZW9mIGdsb2JhbC5CdWZmZXIpIHtcbiAgICByb290ID0gcm9vdC50b1N0cmluZygpXG4gIH1cblxuICBpZiAodHlwZW9mIHJvb3QgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHJvb3RcbiAgICB0aGlzLnJvb3QgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXG4gICAgd2hpbGUgKHRlbXAuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy5yb290LmFwcGVuZENoaWxkKHRlbXAuZmlyc3RDaGlsZClcbiAgICB9XG4gIH1cblxuICB0aGlzLmNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXModGhpcy5yb290Tm9kZXMoKSwgdGhpcy5sb29rdXBzKVxuICB0aGlzLnJ1bkhvb2tzKHRoaXMuY2hpbGRyZW4uaG9va3MsICdpbnNlcnQnLCBudWxsKVxuICB0aGlzLnJ1bkJhdGNoKClcbn1cblxuYWx0ci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVFLnByb3RvdHlwZSlcbmFsdHIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gYWx0clxuXG5hbHRyLnByb3RvdHlwZS50ZW1wbGF0ZVN0cmluZyA9IHRlbXBsYXRlU3RyaW5nXG5hbHRyLnByb3RvdHlwZS5hZGREZWNvcmF0b3IgPSBhZGREZWNvcmF0b3JcbmFsdHIucHJvdG90eXBlLm1lcmdlSG9va3MgPSBtZXJnZUhvb2tzXG5hbHRyLnByb3RvdHlwZS5pbml0Tm9kZXMgPSBpbml0Tm9kZXNcbmFsdHIucHJvdG90eXBlLnJvb3ROb2RlcyA9IHJvb3ROb2Rlc1xuYWx0ci5wcm90b3R5cGUuYWRkSGVscGVyID0gYWRkSGVscGVyXG5hbHRyLnByb3RvdHlwZS5ydW5CYXRjaCA9IHJ1bkJhdGNoXG5hbHRyLnByb3RvdHlwZS50b1N0cmluZyA9IHRvU3RyaW5nXG5hbHRyLnByb3RvdHlwZS5ydW5Ib29rcyA9IHJ1bkhvb2tzXG5hbHRyLnByb3RvdHlwZS5nZXRFbGVtZW50ID0gZ2V0RWxcbmFsdHIucHJvdG90eXBlLmRlc3Ryb3kgPSBkZXN0cm95XG5hbHRyLnByb3RvdHlwZS5yZW1vdmUgPSByZW1vdmVcbmFsdHIucHJvdG90eXBlLmludG8gPSBhcHBlbmRUb1xuYWx0ci5wcm90b3R5cGUudXBkYXRlID0gdXBkYXRlXG5hbHRyLnByb3RvdHlwZS50YWdMaXN0ID0gW11cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG52YXIgbm9kZV9oYW5kbGVycyA9IHt9XG5cbm5vZGVfaGFuZGxlcnNbMV0gPSBlbGVtZW50Tm9kZVxubm9kZV9oYW5kbGVyc1szXSA9IHRleHROb2RlXG5cbmZ1bmN0aW9uIHVwZGF0ZSAoZGF0YSwgc3luYykge1xuICB0aGlzLnN0YXRlID0gZGF0YVxuICB0aGlzLmxvb2t1cHMudXBkYXRlKGRhdGEpXG5cbiAgaWYgKHN5bmMgfHwgdGhpcy5zeW5jKSB7XG4gICAgdGhpcy5ydW5CYXRjaCgpXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdE5vZGVzIChfbm9kZXMsIF9sb29rdXBzLCBzdGF0ZSwgc2NvcGUpIHtcbiAgdmFyIGFsdHIgPSB0aGlzXG4gIHZhciBsb29rdXBzID0gX2xvb2t1cHMgfHwgZGlydHliaXQoc3RhdGUsIHtoZWxwZXJzOiB0aGlzLmhlbHBlcnN9LCBzY29wZSB8fCB7fSlcbiAgdmFyIG5vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoX25vZGVzKVxuICB2YXIgaG9va3MgPSBub2Rlcy5yZWR1Y2Uoam9pbiwgW10pLmZpbHRlcihCb29sZWFuKVxuXG4gIHJldHVybiB7aG9va3M6IGhvb2tzLCBsb29rdXBzOiBsb29rdXBzLCBub2Rlczogbm9kZXN9XG5cbiAgZnVuY3Rpb24gam9pbiAobGlzdCwgbm9kZSkge1xuICAgIHZhciBob29rcyA9IGluaXROb2RlLmNhbGwoYWx0ciwgbG9va3Vwcywgbm9kZSlcblxuICAgIHJldHVybiBob29rcyA/IGxpc3QuY29uY2F0KGhvb2tzKSA6IGxpc3RcbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0Tm9kZSAobG9va3VwcywgZWwpIHtcbiAgcmV0dXJuIG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdXG4gICAgPyBub2RlX2hhbmRsZXJzW2VsLm5vZGVUeXBlXS5jYWxsKHRoaXMsIGVsLCBsb29rdXBzKVxuICAgIDogZWwuY2hpbGROb2RlcyAmJiBlbC5jaGlsZE5vZGVzLmxlbmd0aFxuICAgID8gdGhpcy5pbml0Tm9kZXMobG9va3VwcywgZWwuY2hpbGROb2RlcylcbiAgICA6IG51bGxcbn1cblxuZnVuY3Rpb24gcm9vdE5vZGVzICgpIHtcbiAgcmV0dXJuIHRoaXMucm9vdC5ub2RlVHlwZSA9PT0gdGhpcy5kb2N1bWVudC5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFXG4gICAgPyBbXS5zbGljZS5jYWxsKHRoaXMucm9vdC5jaGlsZE5vZGVzKVxuICAgIDogW3RoaXMucm9vdF1cbn1cblxuZnVuY3Rpb24gYWRkSGVscGVyIChuYW1lLCBoZWxwZXIpIHtcbiAgdGhpcy5oZWxwZXJzW25hbWVdID0gaGVscGVyXG59XG5cbmZ1bmN0aW9uIGFkZFRhZyAoYXR0ciwgdGFnKSB7XG4gIHRoaXMucHJvdG90eXBlLnRhZ3NbYXR0cl0gPSB0YWdcbiAgdGhpcy5wcm90b3R5cGUudGFnTGlzdC5wdXNoKHtcbiAgICBhdHRyOiBhdHRyLFxuICAgIGNvbnN0cnVjdG9yOiB0YWdcbiAgfSlcbn1cblxuZnVuY3Rpb24gYXBwZW5kVG8gKG5vZGUpIHtcbiAgdmFyIHJvb3ROb2RlcyA9IHRoaXMucm9vdE5vZGVzKClcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHJvb3ROb2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBub2RlLmFwcGVuZENoaWxkKGdldEVsKHJvb3ROb2Rlc1tpXSkpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkRGVjb3JhdG9yIChuYW1lLCBmbikge1xuICB0aGlzLmRlY29yYXRvcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBydW5CYXRjaCAoKSB7XG4gIHRoaXMuYmF0Y2gucnVuKCkgJiYgdGhpcy5lbWl0KCd1cGRhdGUnLCB0aGlzLnN0YXRlKVxufVxuXG5mdW5jdGlvbiBtYWtlVGFnUmVnRXhwIChfZGVsaW1pdGVycykge1xuICB2YXIgZGVsaW1pdGVycyA9IF9kZWxpbWl0ZXJzIHx8IFsne3snLCAnfX0nXVxuXG4gIHJldHVybiBuZXcgUmVnRXhwKGRlbGltaXRlcnNbMF0gKyAnXFxcXHMqKC4qPylcXFxccyonICsgZGVsaW1pdGVyc1sxXSlcbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cy5yYXcgPSByYXdBdHRyaWJ1dGVcbm1vZHVsZS5leHBvcnRzLmFsdHIgPSBhbHRyQXR0cmlidXRlXG5tb2R1bGUuZXhwb3J0cy5wcm9wID0gYWx0clByb3BlcnR5XG5cbmZ1bmN0aW9uIHJhd0F0dHJpYnV0ZSAoZWwsIGF0dHIsIGxvb2t1cHMpIHtcbiAgdGhpcy50ZW1wbGF0ZVN0cmluZyhcbiAgICAgIGF0dHIudmFsdWVcbiAgICAsIHRoaXMuYmF0Y2guYWRkKGVsLnNldEF0dHJpYnV0ZS5iaW5kKGVsLCBhdHRyLm5hbWUpKVxuICAgICwgbG9va3Vwc1xuICApXG59XG5cbmZ1bmN0aW9uIGFsdHJBdHRyaWJ1dGUgKGVsLCBhdHRyLCBsb29rdXBzKSB7XG4gIHZhciBuYW1lID0gYXR0ci5uYW1lLnNsaWNlKCdhbHRyLWF0dHItJy5sZW5ndGgpXG5cbiAgbG9va3Vwcy5vbihhdHRyLnZhbHVlLCB0aGlzLmJhdGNoLmFkZCh1cGRhdGUpKVxuICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSAodmFsKSB7XG4gICAgaWYgKCF2YWwgJiYgdmFsICE9PSAnJyAmJiB2YWwgIT09IDApIHtcbiAgICAgIHJldHVybiBlbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSlcbiAgICB9XG5cbiAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsdHJQcm9wZXJ0eSAoZWwsIGF0dHIsIGxvb2t1cHMpIHtcbiAgdmFyIG5hbWUgPSBhdHRyLm5hbWUuc2xpY2UoJ2FsdHItcHJvcC0nLmxlbmd0aClcblxuICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKVxuICBsb29rdXBzLm9uKGF0dHIudmFsdWUsIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlICh2YWwpIHtcbiAgICBlbFtuYW1lXSA9IHZhbFxuICB9XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5hbHRyID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSBkZWNvcmF0b3JzXG5cbmZ1bmN0aW9uIGRlY29yYXRvcnMgKGVsLCBhdHRycywgbG9va3Vwcykge1xuICB2YXIgYWx0ciA9IHRoaXNcbiAgdmFyIGhvb2tzID0gW11cblxuICByZXR1cm4gYXR0cnMubWFwKGNyZWF0ZURlY29yYXRvcilcblxuICBmdW5jdGlvbiBjcmVhdGVEZWNvcmF0b3IgKGF0dHIpIHtcbiAgICB2YXIgZGVjb3JhdG9yID0gYWx0ci5kZWNvcmF0b3JzW2F0dHIubmFtZV0uY2FsbChhbHRyLCBlbClcbiAgICB2YXIgZXhwcmVzc2lvbiA9ICdbJyArIGF0dHIudmFsdWUgKyAnXSdcblxuICAgIGlmICghZGVjb3JhdG9yKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgaG9va3MgPSB7aW5zZXJ0OiBkZWNvcmF0b3IuaW5zZXJ0LCByZW1vdmU6IGRlY29yYXRvci5yZW1vdmV9XG5cbiAgICBpZiAoZGVjb3JhdG9yLnVwZGF0ZSkge1xuICAgICAgbG9va3Vwcy5vbihleHByZXNzaW9uLCB1cGRhdGUpXG4gICAgfVxuXG4gICAgaG9va3MuZGVzdHJveSA9IGRlc3Ryb3lcblxuICAgIHJldHVybiBob29rc1xuXG4gICAgZnVuY3Rpb24gZGVzdHJveSAoKSB7XG4gICAgICBpZiAoZGVjb3JhdG9yLnVwZGF0ZSkgbG9va3Vwcy5yZW1vdmVMaXN0ZW5lcihleHByZXNzaW9uLCB1cGRhdGUpXG5cbiAgICAgIGlmIChkZWNvcmF0b3IuZGVzdHJveSkge1xuICAgICAgICBkZWNvcmF0b3IuZGVzdHJveSgpXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlIChhcmdzKSB7XG4gICAgICBkZWNvcmF0b3IudXBkYXRlLmFwcGx5KG51bGwsIGFyZ3MpXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGRlc3Ryb3lcblxuZnVuY3Rpb24gZGVzdHJveShjaGlsZHJlbiwgZWwsIGRvbmUpIHtcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgYWx0ci5yZW1vdmUoY2hpbGRyZW4sIGVsLCBmdW5jdGlvbihlbCkge1xuICAgIGFsdHIucnVuSG9va3MoY2hpbGRyZW4sICdkZXN0cm95JywgZWwpXG4gICAgZG9uZSgpXG4gIH0pXG59XG4iLCJ2YXIgY3JlYXRlRGVjb3JhdG9ycyA9IHJlcXVpcmUoJy4vZGVjb3JhdG9ycycpXG52YXIgY3JlYXRlQXR0ciA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcycpXG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlRWxlbWVudE5vZGVcblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudE5vZGUgKGVsLCBsb29rdXBzKSB7XG4gIHZhciBkZWNvcmF0b3JzID0gW11cbiAgdmFyIGFsdHIgPSB0aGlzXG4gIHZhciBhdHRyXG5cbiAgdmFyIGF0dHJzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwuYXR0cmlidXRlcylcbiAgdmFyIGFsdHJfdGFncyA9IHt9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoYWx0ci50YWdzW2F0dHJzW2ldLm5hbWVdKSB7XG4gICAgICBhbHRyX3RhZ3NbYXR0cnNbaV0ubmFtZV0gPSBhdHRyc1tpXS52YWx1ZVxuICAgIH0gZWxzZSBpZiAoYWx0ci5kZWNvcmF0b3JzW2F0dHJzW2ldLm5hbWVdKSB7XG4gICAgICBkZWNvcmF0b3JzLnB1c2goYXR0cnNbaV0pXG4gICAgfSBlbHNlIGlmICghYXR0cnNbaV0ubmFtZS5sYXN0SW5kZXhPZignYWx0ci1hdHRyLScsIDApKSB7XG4gICAgICBjcmVhdGVBdHRyLmFsdHIuY2FsbCh0aGlzLCBlbCwgYXR0cnNbaV0sIGxvb2t1cHMpXG4gICAgfSBlbHNlIGlmICghYXR0cnNbaV0ubmFtZS5sYXN0SW5kZXhPZignYWx0ci1wcm9wLScsIDApKSB7XG4gICAgICBjcmVhdGVBdHRyLnByb3AuY2FsbCh0aGlzLCBlbCwgYXR0cnNbaV0sIGxvb2t1cHMpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNyZWF0ZUF0dHIucmF3LmNhbGwodGhpcywgZWwsIGF0dHJzW2ldLCBsb29rdXBzKVxuICAgIH1cbiAgfVxuXG4gIHZhciBob29rcyA9IGNyZWF0ZURlY29yYXRvcnMuY2FsbChhbHRyLCBlbCwgZGVjb3JhdG9ycywgbG9va3VwcylcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGFsdHIudGFnTGlzdC5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoYXR0ciA9IGFsdHJfdGFnc1thbHRyLnRhZ0xpc3RbaV0uYXR0cl0pIHtcbiAgICAgIHJldHVybiBob29rcy5jb25jYXQoW1xuICAgICAgICAgIGFsdHIudGFnTGlzdFtpXS5jb25zdHJ1Y3Rvci5jYWxsKGFsdHIsIGVsLCBhdHRyLCBsb29rdXBzLCBob29rcykgfHwge31cbiAgICAgIF0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhvb2tzLmNvbmNhdChhbHRyLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzLCBsb29rdXBzKS5ob29rcylcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZ2V0XG5cbmZ1bmN0aW9uIGdldChfZWwpIHtcbiAgdmFyIGVsID0gX2VsXG5cbiAgd2hpbGUoZWwgJiYgZWwuX2FsdHJQbGFjZWhvbGRlcikge1xuICAgIGVsID0gZWwuX2FsdHJQbGFjZWhvbGRlclxuXG4gICAgaWYgKGVsID09PSBfZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncGxhY2Vob2xkZXIgY2lyY3VsYXIgcmVmZmVyZW5jZScpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGVsXG59XG4iLCJ2YXIgcGxhY2Vob2xkZXIgPSByZXF1aXJlKCcuL3RhZ3MvcGxhY2Vob2xkZXInKVxudmFyIGNoaWxkcmVuVGFnID0gcmVxdWlyZSgnLi90YWdzL2NoaWxkcmVuJylcbnZhciBpbmNsdWRlVGFnID0gcmVxdWlyZSgnLi90YWdzL2luY2x1ZGUnKVxudmFyIHRleHRUYWcgPSByZXF1aXJlKCcuL3RhZ3MvdGV4dCcpXG52YXIgaHRtbFRhZyA9IHJlcXVpcmUoJy4vdGFncy9odG1sJylcbnZhciB3aXRoVGFnID0gcmVxdWlyZSgnLi90YWdzL3dpdGgnKVxudmFyIGZvclRhZyA9IHJlcXVpcmUoJy4vdGFncy9mb3InKVxudmFyIHJhd1RhZyA9IHJlcXVpcmUoJy4vdGFncy9yYXcnKVxudmFyIGlmVGFnID0gcmVxdWlyZSgnLi90YWdzL2lmJylcbnZhciBhbHRyID0gcmVxdWlyZSgnLi9hbHRyJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuYWRkVGFnKCdhbHRyLWNoaWxkcmVuJywgY2hpbGRyZW5UYWcpXG5hbHRyLmFkZFRhZygnYWx0ci1yZXBsYWNlJywgcGxhY2Vob2xkZXIpXG5hbHRyLmFkZFRhZygnYWx0ci1pbmNsdWRlJywgaW5jbHVkZVRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLXRleHQnLCB0ZXh0VGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItaHRtbCcsIGh0bWxUYWcpXG5hbHRyLmFkZFRhZygnYWx0ci13aXRoJywgd2l0aFRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLWZvcicsIGZvclRhZylcbmFsdHIuYWRkVGFnKCdhbHRyLXJhdycsIHJhd1RhZylcbmFsdHIuYWRkVGFnKCdhbHRyLWlmJywgaWZUYWcpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IG1lcmdlXG5cbmZ1bmN0aW9uIG1lcmdlKGNoaWxkcmVuKSB7XG4gIHZhciBhbHRyID0gdGhpc1xuXG4gIHJldHVybiB7XG4gICAgICBpbnNlcnQ6IGVhY2guYmluZChudWxsLCAnaW5zZXJ0JylcbiAgICAsIGRlc3Ryb3k6IGVhY2guYmluZChudWxsLCAnZGVzdHJveScpXG4gICAgLCByZW1vdmU6IHJlbW92ZVxuICB9XG5cbiAgZnVuY3Rpb24gZWFjaCh0eXBlLCBlbCkge1xuICAgIHZhciBub2RlcyA9IGNoaWxkcmVuKClcblxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBub2Rlc1tpXVt0eXBlXSAmJiBub2Rlc1tpXVt0eXBlXShlbClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUoZWwsIHJlYWR5KSB7XG4gICAgYWx0ci5yZW1vdmUoY2hpbGRyZW4oKSwgZWwsIHJlYWR5KVxuICB9XG59IiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcblxuZnVuY3Rpb24gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIChjYWxsYmFjaykge1xuICB2YXIgcmFmID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgdGltZW91dFxuXG4gIHJldHVybiByYWYoY2FsbGJhY2spXG5cbiAgZnVuY3Rpb24gdGltZW91dCAoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKVxuICB9XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSByZW1vdmVcblxuZnVuY3Rpb24gcmVtb3ZlIChob29rcywgZWwsIHJlYWR5KSB7XG4gIHZhciByZW1haW5pbmcgPSBob29rcy5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHJlbWFpbmluZzsgaSA8IGw7IGkrKykge1xuICAgIGhvb2tzW2ldLnJlbW92ZSA/IGhvb2tzW2ldLnJlbW92ZShlbCwgZG9uZSkgOiAtLXJlbWFpbmluZ1xuICB9XG5cbiAgaWYgKCFyZW1haW5pbmcpIHtcbiAgICByZWFkeSgpXG4gIH1cblxuICBmdW5jdGlvbiBkb25lICgpIHtcbiAgICBpZiAoIS0tcmVtYWluaW5nKSB7XG4gICAgICByZW1haW5pbmcgPSAtMVxuICAgICAgcmVhZHkoKVxuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZW5kZXJcblxuZnVuY3Rpb24gcmVuZGVyICh0ZW1wbGF0ZSwgc3RhdGUsIGVsKSB7XG4gIGlmICh0aGlzLmluY2x1ZGVzW3RlbXBsYXRlXSkge1xuICAgIHRlbXBsYXRlID0gdGhpcy5pbmNsdWRlc1t0ZW1wbGF0ZV1cbiAgfVxuXG4gIHZhciBpbnN0YW5jZSA9IHRoaXModGVtcGxhdGUpXG5cbiAgaW5zdGFuY2UudXBkYXRlKHN0YXRlIHx8IHt9LCB0cnVlKVxuXG4gIGlmIChlbCkge1xuICAgIGluc3RhbmNlLmludG8oZWwpXG4gIH1cblxuICByZXR1cm4gaW5zdGFuY2Vcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcnVuSG9va3NcblxuZnVuY3Rpb24gcnVuSG9va3MgKGhvb2tzLCB0eXBlLCBlbCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGhvb2tzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGhvb2tzW2ldW3R5cGVdICYmIGhvb2tzW2ldW3R5cGVdKGVsKVxuICB9XG59XG4iLCJ2YXIgZ2V0ID0gcmVxdWlyZSgnLi9nZXQtZWxlbWVudCcpXG5cbm1vZHVsZS5leHBvcnRzID0gc2V0Q2hpbGRyZW5cblxuZnVuY3Rpb24gc2V0Q2hpbGRyZW4gKHJvb3QsIG5vZGVzKSB7XG4gIHZhciBwcmV2ID0gbnVsbFxuICB2YXIgZWxcblxuICBmb3IgKHZhciBpID0gbm9kZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICBlbCA9IGdldChub2Rlc1tpXSlcbiAgICByb290Lmluc2VydEJlZm9yZShlbCwgcHJldilcbiAgICBwcmV2ID0gZWxcbiAgfVxuXG4gIHdoaWxlICgoZWwgPSByb290LmZpcnN0Q2hpbGQpICE9PSBwcmV2KSB7XG4gICAgcm9vdC5yZW1vdmVDaGlsZChlbClcbiAgfVxufVxuIiwidmFyIHNldENoaWxkcmVuID0gcmVxdWlyZSgnLi4vc2V0LWNoaWxkcmVuJylcblxubW9kdWxlLmV4cG9ydHMgPSBjaGlsZHJlblxuXG5mdW5jdGlvbiBjaGlsZHJlbiAoZWwsIGdldHRlciwgbG9va3Vwcykge1xuICB2YXIgY3VycmVudCA9IFtdXG5cbiAgZWwuaW5uZXJIVE1MID0gJydcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihnZXR0ZXIsIHVwZGF0ZS5iaW5kKHRoaXMpKSlcblxuICBmdW5jdGlvbiB1cGRhdGUgKHZhbCkge1xuICAgIHZhciBub2RlcyA9IChBcnJheS5pc0FycmF5KHZhbCkgPyB2YWwgOiBbdmFsXSkuZmlsdGVyKGlzX25vZGUpXG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYgKG5vZGVzW2ldICE9PSBjdXJyZW50W2ldKSB7XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IG5vZGVzLmxlbmd0aCA9PT0gY3VycmVudC5sZW5ndGgpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGN1cnJlbnQgPSBub2Rlc1xuICAgIHNldENoaWxkcmVuLmNhbGwodGhpcywgZWwsIGN1cnJlbnQpXG4gIH1cbn1cblxuZnVuY3Rpb24gaXNfbm9kZSAoZWwpIHtcbiAgcmV0dXJuIGVsICYmIGVsLm5vZGVUeXBlXG59XG4iLCJ2YXIgc2V0Q2hpbGRyZW4gPSByZXF1aXJlKCcuLi9zZXQtY2hpbGRyZW4nKVxudmFyIGZvclJlZ2V4cCA9IC9eKC4qPylcXHMraW5cXHMrKC4qJCkvXG5cbm1vZHVsZS5leHBvcnRzID0gZm9ySGFuZGxlclxuXG5mdW5jdGlvbiBmb3JIYW5kbGVyIChyb290LCBhcmdzLCBsb29rdXBzKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IHJvb3QuY2xvbmVOb2RlKHRydWUpXG4gIHZhciBwYXJ0cyA9IGFyZ3MubWF0Y2goZm9yUmVnZXhwKVxuICB2YXIgZG9tTm9kZXMgPSBbXVxuICB2YXIgY2hpbGRyZW4gPSBbXVxuICB2YXIgYWx0ciA9IHRoaXNcbiAgdmFyIGl0ZW1zID0gW11cblxuICBpZiAoIXBhcnRzKSB7XG4gICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgYGZvcmAgdGFnOiAnICsgYXJncylcbiAgfVxuXG4gIHZhciBydW5VcGRhdGVzID0gYWx0ci5iYXRjaC5hZGQocnVuRG9tVXBkYXRlcylcblxuICByb290LmlubmVySFRNTCA9ICcnXG5cbiAgdmFyIHVuaXF1ZSA9IHBhcnRzWzFdLnNwbGl0KCc6JylbMV1cbiAgdmFyIHByb3AgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzBdXG4gIHZhciBrZXkgPSBwYXJ0c1syXVxuXG4gIGxvb2t1cHMub24oa2V5LCB1cGRhdGUpXG4gIGxvb2t1cHMub24oJ3RoaXMnLCB1cGRhdGVDaGlsZHJlbilcblxuICByZXR1cm4gYWx0ci5tZXJnZUhvb2tzKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmxhdHRlbihjaGlsZHJlbilcbiAgfSlcblxuICBmdW5jdGlvbiB1cGRhdGVDaGlsZHJlbiAoZGF0YSkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICB2YXIgc2NvcGUgPSBjaGlsZHJlbltpXS5sb29rdXBzLnNjb3BlXG4gICAgICBzY29wZVtwcm9wXSA9IGl0ZW1zW2ldXG4gICAgICBzY29wZS4kaW5kZXggPSBpXG4gICAgICBjaGlsZHJlbltpXS5sb29rdXBzLnVwZGF0ZShkYXRhKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSAobmV3SXRlbXMpIHtcbiAgICB2YXIgaSwgbFxuICAgIGlmICghQXJyYXkuaXNBcnJheShuZXdJdGVtcykpIHtcbiAgICAgIG5ld0l0ZW1zID0gW11cbiAgICB9XG5cbiAgICB2YXIgbmV3Q2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3SXRlbXMubGVuZ3RoKVxuICAgIHZhciByZW1vdmVkID0gW11cbiAgICB2YXIgbWF0Y2hlZCA9IHt9XG4gICAgdmFyIGFkZGVkID0gW11cbiAgICB2YXIgaW5kZXhcblxuICAgIGRvbU5vZGVzID0gW11cblxuICAgIGZvciAoaSA9IDAsIGwgPSBuZXdJdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGluZGV4ID0gZmluZEluZGV4KGl0ZW1zLCBuZXdJdGVtc1tpXSwgdW5pcXVlKVxuXG4gICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld0NoaWxkcmVuW2ldID0gY2hpbGRyZW5baW5kZXhdXG4gICAgICAgIGl0ZW1zW2luZGV4XSA9IGNoaWxkcmVuW2luZGV4XSA9IG1hdGNoZWRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFkZGVkLnB1c2gobmV3Q2hpbGRyZW5baV0gPSBtYWtlQ2hpbGQoKSlcbiAgICAgIH1cblxuICAgICAgZG9tTm9kZXMgPSBkb21Ob2Rlcy5jb25jYXQobmV3Q2hpbGRyZW5baV0ubm9kZXMpXG4gICAgfVxuXG4gICAgZm9yIChpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYgKGNoaWxkcmVuW2ldICE9PSBtYXRjaGVkKSB7XG4gICAgICAgIHJlbW92ZWQucHVzaChjaGlsZHJlbltpXSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG5ld0NoaWxkcmVuLnNsaWNlKClcbiAgICBpdGVtcyA9IG5ld0l0ZW1zLnNsaWNlKClcbiAgICB1cGRhdGVDaGlsZHJlbihsb29rdXBzLnN0YXRlKVxuICAgIGFsdHIuZGVzdHJveShmbGF0dGVuKHJlbW92ZWQpLCByb290LCBydW5VcGRhdGVzLmJpbmQoXG4gICAgICAgIGFsdHJcbiAgICAgICwgZG9tTm9kZXNcbiAgICAgICwgZmxhdHRlbihhZGRlZClcbiAgICApKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluZEluZGV4IChpdGVtcywgZCwgdW5pcXVlKSB7XG4gICAgaWYgKCF1bmlxdWUpIHtcbiAgICAgIHJldHVybiBpdGVtcy5pbmRleE9mKGQpXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGlmIChpdGVtc1tpXVt1bmlxdWVdID09PSBkW3VuaXF1ZV0pIHtcbiAgICAgICAgcmV0dXJuIGlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gLTFcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VDaGlsZCAoKSB7XG4gICAgdmFyIHNjb3BlID0gT2JqZWN0LmNyZWF0ZShsb29rdXBzLnNjb3BlKVxuICAgIHNjb3BlLiRpbmRleCA9IHVuZGVmaW5lZFxuICAgIHNjb3BlW3Byb3BdID0gdW5kZWZpbmVkXG4gICAgcmV0dXJuIGFsdHIuaW5pdE5vZGVzKHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKS5jaGlsZE5vZGVzLCBudWxsLCBudWxsLCBzY29wZSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bkRvbVVwZGF0ZXMgKGNoaWxkcmVuLCBhZGRlZCkge1xuICAgIHNldENoaWxkcmVuLmNhbGwodGhpcywgcm9vdCwgY2hpbGRyZW4pXG4gICAgYWx0ci5ydW5Ib29rcyhhZGRlZCwgJ2luc2VydCcsIHJvb3QpXG4gIH1cbn1cblxuZnVuY3Rpb24gZmxhdHRlbiAobGlzdCkge1xuICByZXR1cm4gbGlzdC5yZWR1Y2UoZnVuY3Rpb24gKGFsbCwgcGFydCkge1xuICAgIHJldHVybiBwYXJ0Lmhvb2tzID8gYWxsLmNvbmNhdChwYXJ0Lmhvb2tzKSA6IGFsbFxuICB9LCBbXSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaHRtbFxuXG5mdW5jdGlvbiBodG1sIChlbCwgYWNjZXNzb3IsIGxvb2t1cHMpIHtcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUgKHZhbCkge1xuICAgIGVsLmlubmVySFRNTCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcblxuICAgIGlmIChlbC5nZXRBdHRyaWJ1dGUoJ2FsdHItcnVuLXNjcmlwdHMnKSkge1xuICAgICAgW10uZm9yRWFjaC5jYWxsKGVsLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgcnVuKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBydW4gKHNjcmlwdCkge1xuICB2YXIgZml4ZWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICB2YXIgcGFyZW50ID0gc2NyaXB0LnBhcmVudE5vZGVcbiAgdmFyIGF0dHJzID0gc2NyaXB0LmF0dHJpYnV0ZXNcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGF0dHJzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGZpeGVkLnNldEF0dHJpYnV0ZShhdHRyc1tpXS5uYW1lLCBhdHRyc1tpXS52YWx1ZSlcbiAgfVxuXG4gIGZpeGVkLnRleHRDb250ZW50ID0gc2NyaXB0LnRleHRDb250ZW50XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoZml4ZWQsIHNjcmlwdClcbiAgcGFyZW50LnJlbW92ZUNoaWxkKHNjcmlwdClcbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gaWZUYWdcblxuZnVuY3Rpb24gaWZUYWcgKGVsLCBnZXR0ZXIsIGxvb2t1cHMsIGRlY29yYXRvcnMpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcywgbnVsbCwgbnVsbCwgbG9va3Vwcy5zY29wZSlcbiAgdmFyIGFsbCA9IGNoaWxkcmVuLmhvb2tzLmNvbmNhdChkZWNvcmF0b3JzKVxuICB2YXIgbGFzdFZhbCA9IG51bGxcbiAgdmFyIGhpZGRlbiA9IG51bGxcbiAgdmFyIGZpcnN0ID0gdHJ1ZVxuICB2YXIgYWx0ciA9IHRoaXNcblxuICBnbG9iYWwubG9va3VwcyA9IGNoaWxkcmVuLmxvb2t1cHNcblxuICB2YXIgdXBkYXRlID0gdGhpcy5iYXRjaC5hZGQoZnVuY3Rpb24gKHNob3csIG9yaWdpbikge1xuICAgIGlmICghaGlkZGVuICYmICFzaG93KSB7XG4gICAgICBlbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChwbGFjZWhvbGRlciwgZWwpXG4gICAgICBlbC5fYWx0clBsYWNlaG9sZGVyID0gcGxhY2Vob2xkZXJcbiAgICAgIGhpZGRlbiA9IHRydWVcbiAgICB9IGVsc2UgaWYgKGhpZGRlbiAmJiBzaG93KSB7XG4gICAgICBwbGFjZWhvbGRlci5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChlbCwgcGxhY2Vob2xkZXIpXG4gICAgICBhbHRyLnJ1bkhvb2tzKGFsbCwgJ2luc2VydCcsIG9yaWdpbilcbiAgICAgIGRlbGV0ZSBlbC5fYWx0clBsYWNlaG9sZGVyXG4gICAgICBoaWRkZW4gPSBmYWxzZVxuICAgIH0gZWxzZSBpZiAoZmlyc3QpIHtcbiAgICAgIGZpcnN0ID0gZmFsc2VcbiAgICAgIGFsdHIucnVuSG9va3MoYWxsLCAnaW5zZXJ0Jywgb3JpZ2luKVxuICAgIH1cbiAgfSlcblxuICBsb29rdXBzLm9uKCdbJyArIGdldHRlciArICcsIHRoaXNdJywgdG9nZ2xlKVxuXG4gIHJldHVybiB7XG4gICAgaW5zZXJ0OiBpbnNlcnQsXG4gICAgcmVtb3ZlOiByZW1vdmUsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSAoZWwpIHtcbiAgICBhbHRyLnJ1bkhvb2tzKGNoaWxkcmVuLmhvb2tzLCAnZGVzdHJveScsIGVsKVxuICB9XG5cbiAgZnVuY3Rpb24gdG9nZ2xlIChhcmdzKSB7XG4gICAgbGFzdFZhbCA9ICEhYXJnc1swXVxuXG4gICAgaWYgKGxhc3RWYWwpIHtcbiAgICAgIHVwZGF0ZSh0cnVlLCBlbClcbiAgICAgIGNoaWxkcmVuLmxvb2t1cHMudXBkYXRlKGFyZ3NbMV0pXG4gICAgfSBlbHNlIHtcbiAgICAgIGFsdHIucmVtb3ZlKGFsbCwgZWwsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZShmYWxzZSwgZWwpXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGluc2VydCAoZWwpIHtcbiAgICBpZiAobGFzdFZhbCkge1xuICAgICAgdXBkYXRlKHRydWUsIGVsKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZSAoZWwsIGRvbmUpIHtcbiAgICBpZiAoaGlkZGVuKSB7XG4gICAgICBkb25lKClcblxuICAgICAgcmV0dXJuIHVwZGF0ZShmYWxzZSlcbiAgICB9XG5cbiAgICBhbHRyLnJlbW92ZShjaGlsZHJlbi5ob29rcywgZWwsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHVwZGF0ZShmYWxzZSlcbiAgICAgIGRvbmUoKVxuICAgIH0pXG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IGluY2x1ZGVcblxuZnVuY3Rpb24gaW5jbHVkZShlbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciByZW1vdmVMaXN0ZW5lcnMgPSBbXVxuICB2YXIgY2hpbGRyZW4gPSBudWxsXG4gIHZhciBjb250ZW50ID0gJydcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgbG9va3Vwcy5vbihnZXR0ZXIsIHNldClcbiAgbG9va3Vwcy5vbigndGhpcycsIHVwZGF0ZSlcblxuICByZXR1cm4ge2luc2VydDogaW5zZXJ0LCByZW1vdmU6IHJlbW92ZSwgZGVzdHJveTogZGVzdHJveX1cblxuICBmdW5jdGlvbiBzZXQoZGF0YSkge1xuICAgIGNvbnRlbnQgPSB0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycgPyBkYXRhIDogJydcbiAgICBpZiAoY2hpbGRyZW4pIHJlbW92ZShlbCwgaW5zZXJ0KVxuICB9XG5cbiAgZnVuY3Rpb24gaW5zZXJ0KCkge1xuICAgIGlmIChjaGlsZHJlbikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgZWwuaW5uZXJIVE1MID0gY29udGVudFxuICAgIGNoaWxkcmVuID0gYWx0ci5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcywgbnVsbCwgbG9va3Vwcy5zdGF0ZSwgbG9va3Vwcy5zY29wZSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShlbCwgZG9uZSkge1xuICAgIGlmICghY2hpbGRyZW4pIHtcbiAgICAgIHJldHVybiBkb25lKClcbiAgICB9XG5cbiAgICBpZiAocmVtb3ZlTGlzdGVuZXJzLnB1c2goZG9uZSkgPiAxKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBhbHRyLmRlc3Ryb3koY2hpbGRyZW4sIGVsLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsaXN0ZW5lclxuXG4gICAgICBpZiAoIWNoaWxkcmVuKSB7XG4gICAgICAgIGVsLmlubmVySFRNTCA9ICcnXG4gICAgICB9XG5cbiAgICAgIHdoaWxlKGxpc3RlbmVyID0gcmVtb3ZlTGlzdGVuZXJzLnBvcCgpKSB7XG4gICAgICAgIGxpc3RlbmVyKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgY2hpbGRyZW4gPSBudWxsXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoc3RhdGUpIHtcbiAgICBjaGlsZHJlbiAmJiBjaGlsZHJlbi5sb29rdXBzLnVwZGF0ZShzdGF0ZSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgbG9va3Vwcy5yZW1vdmVMaXN0ZW5lcigndGhpcycsIHVwZGF0ZSlcbiAgICBsb29rdXBzLnJlbW92ZUxpc3RlbmVyKGdldHRlciwgc2V0KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHBsYWNlaG9sZGVyXG5cbmZ1bmN0aW9uIHBsYWNlaG9sZGVyIChvcmlnaW5hbCwgZ2V0dGVyLCBsb29rdXBzKSB7XG4gIHZhciBjdXJyZW50ID0gb3JpZ2luYWxcblxuICB0aGlzLmJhdGNoLmFkZChsb29rdXBzLm9uKGdldHRlciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUgKHZhbCkge1xuICAgIGlmICghdmFsIHx8ICF2YWwubm9kZU5hbWUgfHwgdmFsID09PSBjdXJyZW50KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjdXJyZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHZhbCwgY3VycmVudClcbiAgICBvcmlnaW5hbC5fYWx0clBsYWNlaG9sZGVyID0gdmFsXG4gICAgY3VycmVudCA9IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJhdyAoKSB7fVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZXh0XG5cbmZ1bmN0aW9uIHRleHQgKGVsLCBnZXR0ZXIsIGxvb2t1cHMpIHtcbiAgdGhpcy5iYXRjaC5hZGQobG9va3Vwcy5vbihnZXR0ZXIsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlICh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3aXRoVGFnXG5cbmZ1bmN0aW9uIHdpdGhUYWcgKGVsLCBnZXR0ZXIsIGxvb2t1cHMpIHtcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcylcbiAgdmFyIHBhcnRzID0gZ2V0dGVyLnNwbGl0KCcgYXMgJylcblxuICBsb29rdXBzLm9uKHBhcnRzWzBdLCB1cGRhdGUpXG5cbiAgcmV0dXJuIGNoaWxkcmVuLmhvb2tzXG5cbiAgZnVuY3Rpb24gdXBkYXRlIChfdmFsKSB7XG4gICAgdmFyIHZhbCA9IE9iamVjdC5jcmVhdGUobG9va3Vwcy5zdGF0ZSlcblxuICAgIHZhbFtwYXJ0c1sxXV0gPSBfdmFsXG4gICAgY2hpbGRyZW4ubG9va3Vwcy51cGRhdGUodmFsKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRTdHJpbmdcblxuZnVuY3Rpb24gdGVtcGxhdFN0cmluZyAodGVtcGxhdGUsIGNoYW5nZSwgbG9va3Vwcykge1xuICBpZiAoIXRlbXBsYXRlLm1hdGNoKHRoaXMudGFnUmVnRXhwKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRlbXBsYXRlXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBpbmRleFxuICB2YXIgbmV4dFxuXG4gIHdoaWxlIChyZW1haW5pbmcgJiYgKG5leHQgPSByZW1haW5pbmcubWF0Y2godGhpcy50YWdSZWdFeHApKSkge1xuICAgIGlmICgoaW5kZXggPSByZW1haW5pbmcuaW5kZXhPZihuZXh0WzBdKSkpIHtcbiAgICAgIHBhcnRzLnB1c2gocmVtYWluaW5nLnNsaWNlKDAsIGluZGV4KSlcbiAgICB9XG5cbiAgICBwYXJ0cy5wdXNoKCcnKVxuICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZy5zbGljZShpbmRleCArIG5leHRbMF0ubGVuZ3RoKVxuICAgIGxvb2t1cHMub24obmV4dFsxXSwgc2V0UGFydC5iaW5kKHRoaXMsIHBhcnRzLmxlbmd0aCAtIDEpKVxuICB9XG5cbiAgaWYgKHJlbWFpbmluZykge1xuICAgIHNldFBhcnQocGFydHMubGVuZ3RoLCByZW1haW5pbmcpXG4gIH1cblxuICBmdW5jdGlvbiBzZXRQYXJ0IChpZHgsIHZhbCkge1xuICAgIHBhcnRzW2lkeF0gPSB2YWxcblxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbml0VGV4dE5vZGVcblxuZnVuY3Rpb24gaW5pdFRleHROb2RlIChlbCwgbG9va3Vwcykge1xuICB0aGlzLnRlbXBsYXRlU3RyaW5nKFxuICAgIGVsLnRleHRDb250ZW50LFxuICAgIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSksXG4gICAgbG9va3Vwc1xuICApXG5cbiAgZnVuY3Rpb24gdXBkYXRlICh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvU3RyaW5nXG5cbmZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgcmV0dXJuIHRoaXMucm9vdE5vZGVzKCkubWFwKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgc3dpdGNoIChub2RlLm5vZGVUeXBlKSB7XG4gICAgICBjYXNlIHRoaXMuZG9jdW1lbnQuRE9DVU1FTlRfRlJBR01FTlRfTk9ERTpcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5DT01NRU5UX05PREU6IHJldHVybiBjbG9uZS5jYWxsKHRoaXMsIG5vZGUpXG4gICAgICBjYXNlIHRoaXMuZG9jdW1lbnQuVEVYVF9OT0RFOiByZXR1cm4gbm9kZS50ZXh0Q29udGVudFxuICAgICAgZGVmYXVsdDogcmV0dXJuIG5vZGUub3V0ZXJIVE1MXG4gICAgfVxuICB9LCB0aGlzKS5qb2luKCcnKVxuXG4gIGZ1bmN0aW9uIGNsb25lIChub2RlKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmFwcGVuZENoaWxkKG5vZGUuY2xvbmVOb2RlKHRydWUpKVxuXG4gICAgcmV0dXJuIHRlbXAuaW5uZXJIVE1MXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQmF0Y2hcblxuZnVuY3Rpb24gQmF0Y2gocmVhZHksIGFsbCkge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCYXRjaCkpIHtcbiAgICByZXR1cm4gbmV3IEJhdGNoKHJlYWR5LCBhbGwpXG4gIH1cblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLmFsbCA9IGFsbFxuICB0aGlzLnJlYWR5ID0gcmVhZHlcbiAgdGhpcy5xdWV1ZCA9IGZhbHNlXG4gIHRoaXMucnVuID0gdGhpcy5ydW4uYmluZCh0aGlzKVxufVxuXG5CYXRjaC5wcm90b3R5cGUucXVldWUgPSBxdWV1ZVxuQmF0Y2gucHJvdG90eXBlLmFkZCA9IGFkZFxuQmF0Y2gucHJvdG90eXBlLnJ1biA9IHJ1blxuXG5mdW5jdGlvbiBhZGQoZm4pIHtcbiAgdmFyIHF1ZXVlZCA9IGZhbHNlXG4gICAgLCBiYXRjaCA9IHRoaXNcbiAgICAsIHNlbGZcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gcXVldWVcblxuICBmdW5jdGlvbiBxdWV1ZSgpIHtcbiAgICBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgc2VsZiA9IHRoaXNcblxuICAgIGlmKHF1ZXVlZCkge1xuICAgICAgcmV0dXJuIGJhdGNoLmFsbCAmJiBiYXRjaC5yZWFkeSgpXG4gICAgfVxuXG4gICAgcXVldWVkID0gdHJ1ZVxuICAgIGJhdGNoLnF1ZXVlKHJ1bilcbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICBxdWV1ZWQgPSBmYWxzZVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVldWUoZm4pIHtcbiAgdGhpcy5qb2JzLnB1c2goZm4pXG5cbiAgaWYodGhpcy5hbGwgfHwgIXRoaXMucXVldWVkKSB7XG4gICAgdGhpcy5xdWV1ZWQgPSB0cnVlXG4gICAgdGhpcy5yZWFkeSh0aGlzKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNcblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLnF1ZXVlZCA9IGZhbHNlXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGpvYnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgam9ic1tpXSgpXG4gIH1cblxuICByZXR1cm4gISFqb2JzLmxlbmd0aFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocm9vdCwgc2NvcGUpIHtcbiAgdmFyIGRlcHMgPSB7XG4gICAgaWQ6IDAsXG4gICAgaGVscGVyczoge30sXG4gICAgbGFiZWxzOiB7fSxcbiAgICB2YXJzOiBbXSxcbiAgICBzY29wZTogZmFsc2UsXG4gICAgZGF0YTogZmFsc2VcbiAgfVxuXG4gIHZhciBidWlsdCA9IGJ1aWxkKHJvb3QsIGRlcHMsIHNjb3BlIHx8IHt9KVxuICB2YXIgaGVscGVyTmFtZXMgPSBPYmplY3Qua2V5cyhkZXBzLmhlbHBlcnMpXG4gIHZhciBoZWxwZXJzID0gbmV3IEFycmF5KGhlbHBlck5hbWVzLmxlbmd0aClcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gaGVscGVyTmFtZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBoZWxwZXJzW2ldID0gZGVwcy5oZWxwZXJzW2hlbHBlck5hbWVzW2ldXVxuICB9XG5cbiAgZGVwcy5oZWxwZXJzID0gaGVscGVyc1xuXG4gIHJldHVybiB7XG4gICAgZGVwczogZGVwcyxcbiAgICByYXc6IHJvb3QudmFsdWUsXG4gICAgYm9keTogYnVpbHQsXG4gICAgY29tcGlsZWQ6IGNvbXBpbGUoYnVpbHQsIGRlcHMpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMuaGVscGVyID0gZnVuY3Rpb24gYnVpbGRIZWxwZXIgKGxlbikge1xuICBpZiAoIWxlbikgcmV0dXJuIG5ldyBGdW5jdGlvbigndXBkYXRlJywgJ3VwZGF0ZSgpJylcbiAgdmFyIGJvZHkgPSAndXBkYXRlKCdcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbiAtIDE7ICsraSkge1xuICAgIGJvZHkgKz0gJ2RlcHNbJyArIGkgKyAnXS52YWx1ZSwgJ1xuICB9XG5cbiAgYm9keSArPSAnZGVwc1snICsgaSArICddLnZhbHVlKSdcblxuICByZXR1cm4gbmV3IEZ1bmN0aW9uKCd1cGRhdGUsIGRlcHMnLCBib2R5KVxufVxuXG5mdW5jdGlvbiBidWlsZCAobm9kZSwgZGVwcywgc2NvcGUpIHtcbiAgaWYgKG5vZGUudHlwZSA9PT0gJ2dyb3VwJykge1xuICAgIHJldHVybiAnKCcgKyBidWlsZChub2RlLmRhdGEuZXhwcmVzc2lvbiwgZGVwcywgc2NvcGUpICsgJyknXG4gIH1cblxuICBpZiAobm9kZS50eXBlID09PSAnbnVtYmVyJyB8fCBub2RlLnR5cGUgPT09ICdzdHJpbmcnIHx8IG5vZGUudHlwZSA9PT0gJ2tleXdvcmQnKSB7XG4gICAgcmV0dXJuIG5vZGUudmFsdWVcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICd1bmFyeScpIHtcbiAgICByZXR1cm4gbm9kZS5kYXRhLm9wICsgJygnICsgYnVpbGQobm9kZS5kYXRhLnJpZ2h0LCBkZXBzLCBzY29wZSkgKyAnKSdcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICdoZWxwZXInKSB7XG4gICAgZGVwcy5oZWxwZXJzW25vZGUudmFsdWVdID0gbm9kZVxuICAgIHJldHVybiAnaGVscGVyc1tcIicgKyBub2RlLmlkICsgJ1wiXS52YWx1ZSdcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICdsYWJlbCcpIHtcbiAgICB2YXIgdHlwZSA9IG5vZGUudmFsdWUgaW4gc2NvcGUgPyAnc2NvcGUnIDogJ2RhdGEnXG4gICAgZGVwc1t0eXBlXSA9IHRydWVcbiAgICBpZiAobm9kZS52YWx1ZSA9PT0gJ3RoaXMnKSByZXR1cm4gJ2RhdGEnXG4gICAgaWYgKGRlcHMubGFiZWxzW25vZGUudmFsdWVdKSByZXR1cm4gZGVwcy5sYWJlbHNbbm9kZS52YWx1ZV1cbiAgICB2YXIgaWQgPSBkZXBzLmxhYmVsc1tub2RlLnZhbHVlXSA9IGxvb2t1cCh0eXBlLCAnXCInICsgbm9kZS52YWx1ZSArICdcIicpXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICBpZiAobm9kZS50eXBlID09PSAnbWVtYmVyJykge1xuICAgIHJldHVybiBsb29rdXAobWFrZVZhcihub2RlLmRhdGEubGVmdCksICdcIicgKyBub2RlLmRhdGEucmlnaHQudmFsdWUgKyAnXCInKVxuICB9XG5cbiAgaWYgKG5vZGUudHlwZSA9PT0gJ2luZGV4Jykge1xuICAgIHJldHVybiBsb29rdXAobWFrZVZhcihub2RlLmRhdGEubGVmdCksIG1ha2VWYXIobm9kZS5kYXRhLnJpZ2h0KSlcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICdiaW5hcnknKSB7XG4gICAgcmV0dXJuIGJ1aWxkKG5vZGUuZGF0YS5sZWZ0LCBkZXBzLCBzY29wZSkgKyAnICcgK1xuICAgICAgbm9kZS5kYXRhLm9wICsgJyAnICsgYnVpbGQobm9kZS5kYXRhLnJpZ2h0LCBkZXBzLCBzY29wZSlcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICd0ZXJuYXJ5Jykge1xuICAgIHJldHVybiBidWlsZChub2RlLmRhdGEubGVmdCwgZGVwcywgc2NvcGUpICsgJyA/ICcgK1xuICAgICAgYnVpbGQobm9kZS5kYXRhLm1pZGRsZSwgZGVwcywgc2NvcGUpICsgJyA6ICcgK1xuICAgICAgYnVpbGQobm9kZS5kYXRhLnJpZ2h0LCBzY29wZSlcbiAgfVxuXG4gIGlmIChub2RlLnR5cGUgPT09ICdhcnJheScpIHtcbiAgICB2YXIgYXJyID0gJ1snXG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGUuZGF0YS5jaGlsZHJlbi5sZW5ndGggLSAxOyBpIDwgbDsgKytpKSB7XG4gICAgICBhcnIgPSBhcnIgKyBidWlsZChub2RlLmRhdGEuY2hpbGRyZW5baV0sIGRlcHMsIHNjb3BlKSArICcsICdcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyICsgYnVpbGQobm9kZS5kYXRhLmNoaWxkcmVuW2ldLCBkZXBzLCBzY29wZSkgKyAnXSdcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VWYXIgKG5vZGUpIHtcbiAgICBpZiAobm9kZS50eXBlID09PSAnbWVtYmVyJyB8fCBub2RlLnR5cGUgPT09ICdpbmRleCcgfHwgbm9kZS50eXBlID09PSAnbGFiZWwnKSB7XG4gICAgICByZXR1cm4gYnVpbGQobm9kZSwgZGVwcywgc2NvcGUpXG4gICAgfVxuXG4gICAgdmFyIGlkID0gJ18nICsgZGVwcy5pZCsrXG4gICAgZGVwcy52YXJzLnB1c2goJ3ZhciAnICsgaWQgKyAnID0gJyArIGJ1aWxkKG5vZGUsIGRlcHMsIHNjb3BlKSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvb2t1cCAobGVmdCwgcmlnaHQpIHtcbiAgICB2YXIgaWQgPSAnXycgKyBkZXBzLmlkKytcbiAgICB2YXIgc3RhdGVtZW50ID0gJ3ZhciAnICsgaWQgKyAnID0gJyArIGxlZnQgKyAnIT09bnVsbCAmJiAnICsgbGVmdCArXG4gICAgICAnICE9PSB1bmRlZmluZWQgPyAnICsgbGVmdCArICdbJyArIHJpZ2h0ICsgJ10gOiB1bmRlZmluZWQnXG5cbiAgICBkZXBzLnZhcnMucHVzaChzdGF0ZW1lbnQpXG4gICAgcmV0dXJuIGlkXG4gIH1cbn1cblxuZnVuY3Rpb24gY29tcGlsZSAocmF3LCBkZXBzKSB7XG4gIHZhciBib2R5ID0gJydcblxuICBpZiAoZGVwcy5oZWxwZXJzLmxlbmd0aCkge1xuICAgIGJvZHkgPSAnICB2YXIgaGVscGVycyA9IHRoaXMuZGV0ZWN0b3IuaGVscGVyc1xcbicgKyBib2R5XG4gIH1cblxuICBpZiAoZGVwcy5kYXRhKSB7XG4gICAgYm9keSA9ICcgIHZhciBkYXRhID0gdGhpcy5kZXRlY3Rvci5zdGF0ZVxcbicgKyBib2R5XG4gIH1cblxuICBpZiAoZGVwcy5zY29wZSkge1xuICAgIGJvZHkgPSAnICB2YXIgc2NvcGUgPSB0aGlzLmRldGVjdG9yLnNjb3BlXFxuJyArIGJvZHlcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBkZXBzLnZhcnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBib2R5ICs9ICcgICcgKyBkZXBzLnZhcnNbaV0gKyAnXFxuJ1xuICB9XG5cbiAgYm9keSArPSAnICB0aGlzLnNldFZhbHVlKCcgKyByYXcgKyAnKSdcblxuICByZXR1cm4gbmV3IEZ1bmN0aW9uKCcnLCBib2R5KVxufVxuIiwidmFyIExpc3QgPSByZXF1aXJlKCcuL2xpc3QnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEV4cHJlc3Npb25cblxuZnVuY3Rpb24gRXhwcmVzc2lvbiAoZGV0ZWN0b3IsIGNoZWNrLCBub2RlLCBkZXBzKSB7XG4gIHRoaXMuZGVwZW5kZW50cyA9IG5ldyBMaXN0KClcbiAgdGhpcy5kZXRlY3RvciA9IGRldGVjdG9yXG4gIHRoaXMuY2hlY2sgPSBjaGVjayB8fCBwYXNzVGhyb3VnaFxuICB0aGlzLnZhbHVlID0gdm9pZCAwXG4gIHRoaXMuc2hvdWxkVXBkYXRlID0gZmFsc2VcbiAgdGhpcy5ub2RlID0gbm9kZVxuICB0aGlzLmRlcExpc3RJdGVtcyA9IG5ldyBBcnJheShkZXBzLmxlbmd0aClcbiAgdGhpcy5kZXBzID0gZGVwc1xuICB0aGlzLmhhbmRsZXJzID0gW11cblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gZGVwcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIHRoaXMuZGVwTGlzdEl0ZW1zW2ldID0gZGVwc1tpXS5kZXBlbmRlbnRzLmFkZCh0aGlzKVxuICB9XG59XG5cbkV4cHJlc3Npb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSAob25seU9uY2UpIHtcbiAgaWYgKG9ubHlPbmNlICYmICF0aGlzLnNob3VsZFVwZGF0ZSkgcmV0dXJuXG4gIHRoaXMuc2hvdWxkVXBkYXRlID0gZmFsc2VcbiAgdGhpcy5jaGVjaygpXG59XG5cbkV4cHJlc3Npb24ucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gc2V0VmFsdWUgKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gdGhpcy52YWx1ZSAmJiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5yZXBvcnQoKVxuXG4gIGlmICghdGhpcy5kZXBlbmRlbnRzLmhlYWQpIHJldHVyblxuXG4gIHZhciBjdXJyZW50ID0gdGhpcy5kZXBlbmRlbnRzLmhlYWRcbiAgd2hpbGUgKGN1cnJlbnQpIHtcbiAgICB2YXIgZXhwcmVzc2lvbiA9IGN1cnJlbnQudmFsdWVcbiAgICBpZiAoIXRoaXMuZGV0ZWN0b3IudXBkYXRpbmcpIHtcbiAgICAgIGV4cHJlc3Npb24udXBkYXRlKGZhbHNlKVxuICAgIH0gZWxzZSB7XG4gICAgICBleHByZXNzaW9uLnNob3VsZFVwZGF0ZSA9IHRydWVcbiAgICAgIHRoaXMuZGV0ZWN0b3IucXVldWUucHVzaChleHByZXNzaW9uKVxuICAgIH1cblxuICAgIGN1cnJlbnQgPSBjdXJyZW50Lm5leHRcbiAgfVxufVxuXG5FeHByZXNzaW9uLnByb3RvdHlwZS5yZXBvcnQgPSBmdW5jdGlvbiByZXBvcnQgKCkge1xuICB2YXIgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzXG4gIHZhciBsZW4gPSB0aGlzLmhhbmRsZXJzLmxlbmd0aFxuICB2YXIgdmFsID0gdGhpcy52YWx1ZVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBoYW5kbGVyc1tpXSh2YWwpXG4gIH1cbn1cblxuRXhwcmVzc2lvbi5wcm90b3R5cGUubG9va3VwID0gZnVuY3Rpb24gbG9va3VwIChvYmosIGtleSkge1xuICByZXR1cm4gb2JqID09PSBudWxsIHx8IG9iaiA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogb2JqW2tleV1cbn1cblxuRXhwcmVzc2lvbi5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gY2hlY2tSZW1vdmUgKGhhbmRsZXIpIHtcbiAgdmFyIGlkeFxuICBpZiAoaGFuZGxlciAmJiAoaWR4ID0gdGhpcy5oYW5kbGVycy5pbmRleE9mKGhhbmRsZXIpKSAhPT0gLTEpIHtcbiAgICB0aGlzLmhhbmRsZXJzLnNwbGljZShpZHgsIDEpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5oYW5kbGVycyA9IFtdXG4gIH1cblxuICB0aGlzLmNoZWNrUmVtb3ZlKClcbn1cblxuRXhwcmVzc2lvbi5wcm90b3R5cGUuY2hlY2tSZW1vdmUgPSBmdW5jdGlvbiBjaGVja1JlbW92ZSAoKSB7XG4gIGlmICh0aGlzLmhhbmRsZXJzLmxlbmd0aCB8fCB0aGlzLmRlcGVuZGVudHMuaGVhZCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgZGVsZXRlIHRoaXMuZGV0ZWN0b3IuZXhwcmVzc2lvbnNbdGhpcy5ub2RlLnZhbHVlXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZGVwTGlzdEl0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHRoaXMuZGVwTGlzdEl0ZW1zW2ldLnJlbW92ZSgpXG4gICAgdGhpcy5kZXBzW2ldLmNoZWNrUmVtb3ZlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXNzVGhyb3VnaCAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGhhc2hcblxuZnVuY3Rpb24gaGFzaCAoc3RyKSB7XG4gIHZhciBpLCBjaHIsIGxlblxuICB2YXIgaGFzaCA9IDBcbiAgaWYgKHN0ci5sZW5ndGggPT09IDApIHJldHVybiBoYXNoXG4gIGZvciAoaSA9IDAsIGxlbiA9IHN0ci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNociA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGFzaCA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpICsgY2hyXG4gICAgaGFzaCB8PSAwXG4gIH1cblxuICByZXR1cm4gaGFzaFxufVxuIiwidmFyIExpc3QgPSByZXF1aXJlKCcuL2xpc3QuanMnKVxudmFyIHdhdGNoID0gcmVxdWlyZSgnLi93YXRjaCcpXG52YXIgcmVtb3ZlID0gcmVxdWlyZSgnLi9yZW1vdmUnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENoYW5nZURldGVjdG9yXG5cbmZ1bmN0aW9uIENoYW5nZURldGVjdG9yIChzdGF0ZSwgb3B0aW9ucywgc2NvcGUpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIENoYW5nZURldGVjdG9yKSkge1xuICAgIHJldHVybiBuZXcgQ2hhbmdlRGV0ZWN0b3Ioc3RhdGUsIG9wdGlvbnMsIHNjb3BlKVxuICB9XG5cbiAgdGhpcy5leHByZXNzaW9ucyA9IG5ldyBMaXN0KClcbiAgdGhpcy51cGRhdGluZyA9IGZhbHNlXG4gIHRoaXMuZXhwcmVzc2lvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gIHRoaXMuaGVscGVycyA9IE9iamVjdC5jcmVhdGUobnVsbClcbiAgdGhpcy5zY29wZSA9IHNjb3BlIHx8IE9iamVjdC5jcmVhdGUobnVsbClcbiAgdGhpcy5zdGF0ZSA9IHN0YXRlXG4gIHRoaXMucXVldWUgPSBbXVxuICB0aGlzLmhlbHBlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gIHRoaXMucm9vdCA9IHRoaXMub24oJ3RoaXMnLCBmdW5jdGlvbiAoKSB7fSlcbn1cblxuQ2hhbmdlRGV0ZWN0b3IucHJvdG90eXBlLm9uID0gd2F0Y2hcbkNoYW5nZURldGVjdG9yLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IHJlbW92ZVxuXG5DaGFuZ2VEZXRlY3Rvci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlICh2YWx1ZSkge1xuICB0aGlzLnN0YXRlID0gdmFsdWVcbiAgdGhpcy51cGRhdGluZyA9IHRydWVcbiAgdGhpcy5yb290LnNldFZhbHVlKHZhbHVlKVxuICB0aGlzLnVwZGF0aW5nID0gZmFsc2VcbiAgdGhpcy5wcm9jZXNzUXVldWUoKVxufVxuXG5DaGFuZ2VEZXRlY3Rvci5wcm90b3R5cGUucHJvY2Vzc1F1ZXVlID0gZnVuY3Rpb24gcHJvY2Vzc1F1ZXVlICgpIHtcbiAgaWYgKHRoaXMudXBkYXRpbmcpIHJldHVyblxuICB0aGlzLnVwZGF0aW5nID0gdHJ1ZVxuICB3aGlsZSAodGhpcy5xdWV1ZS5sZW5ndGgpIHtcbiAgICB2YXIgcXVldWUgPSB0aGlzLnF1ZXVlXG4gICAgdGhpcy5xdWV1ZSA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHF1ZXVlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBxdWV1ZVtpXS51cGRhdGUodHJ1ZSlcbiAgICB9XG4gIH1cblxuICB0aGlzLnVwZGF0aW5nID0gZmFsc2Vcbn1cblxuQ2hhbmdlRGV0ZWN0b3IucHJvdG90eXBlLmFkZEhlbHBlciA9IGZ1bmN0aW9uIGFkZEhlbHBlciAobmFtZSwgZm4pIHtcbiAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdIZWxwZXIgbmFtZSBtdXN0IGJlIGEgc3RyaW5nJylcbiAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdIZWxwZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJylcbiAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm5cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gTGlzdFxuXG5mdW5jdGlvbiBMaXN0ICgpIHtcbiAgdGhpcy5oZWFkID0gbnVsbFxuICB0aGlzLnRhaWwgPSBudWxsXG59XG5cbkxpc3QucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCAodmFsdWUpIHtcbiAgaWYgKHRoaXMudGFpbCkge1xuICAgIHRoaXMudGFpbCA9IHRoaXMudGFpbC5uZXh0ID0gbmV3IExpc3RJdGVtKHRoaXMsIHZhbHVlLCB0aGlzLnRhaWwpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5oZWFkID0gdGhpcy50YWlsID0gbmV3IExpc3RJdGVtKHRoaXMsIHZhbHVlLCBudWxsKVxuICB9XG5cbiAgcmV0dXJuIHRoaXMudGFpbFxufVxuXG5mdW5jdGlvbiBMaXN0SXRlbSAobGlzdCwgdmFsdWUsIHByZXYpIHtcbiAgdGhpcy5saXN0ID0gbGlzdFxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5wcmV2ID0gcHJldlxuICB0aGlzLm5leHQgPSBudWxsXG59XG5cbkxpc3RJdGVtLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzID09PSB0aGlzLmxpc3QuaGVhZCkgdGhpcy5saXN0LmhlYWQgPSB0aGlzLm5leHRcbiAgaWYgKHRoaXMgPT09IHRoaXMubGlzdC50YWlsKSB0aGlzLmxpc3QudGFpbCA9IHRoaXMucHJldlxuICBpZiAodGhpcy5wcmV2KSB0aGlzLnByZXYubmV4dCA9IHRoaXMubmV4dFxuICBpZiAodGhpcy5uZXh0KSB0aGlzLm5leHQucHJldiA9IHRoaXMucHJldlxufVxuIiwidmFyIGhhc2ggPSByZXF1aXJlKCcuL2hhc2gnKVxuXG52YXIgdHlwZXMgPSBbZ3JvdXAsIGFycmF5LCBrZXl3b3JkLCBudW1iZXIsIHN0cmluZywgbGFiZWwsIHVuYXJ5XVxudmFyIGNvbnRpbnVhdGlvbnMgPSBbaGVscGVyLCBtZW1iZXIsIGluZGV4LCBiaW5hcnksIHRlcm5hcnldXG52YXIga2V5d29yZHMgPSBbJ3RydWUnLCAnZmFsc2UnLCAnbnVsbCcsICd1bmRlZmluZWQnXVxudmFyIGtleXdvcmRWYWx1ZXMgPSBbdHJ1ZSwgZmFsc2UsIG51bGwsIHVuZGVmaW5lZF1cbnZhciB1bmFyeU9wZXJhdG9ycyA9IFsnIScsICcrJywgJy0nLCAnficsICd2b2lkJywgJ2luc3RhbmNlb2YnXVxudmFyIHdoaXRlc2FwY2UgPSAnIFxceEEwXFx1RkVGRlxcZlxcblxcclxcdFxcduKAi1xcdTAwYTBcXHUxNjgw4oCLXFx1MTgwZVxcdTIwMDDigItcXHUyMDAxXFx1MjAwMuKAi1xcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDbigItcXHUyMDA3XFx1MjAwOOKAi1xcdTIwMDlcXHUyMDBh4oCLXFx1MjAyOFxcdTIwMjnigItcXHUyMDJmXFx1MjA1ZuKAi1xcdTMwMDAnLnNwbGl0KCcnKVxudmFyIHJlc2VydmVkQ2hhcmFjdGVycyA9IHdoaXRlc2FwY2UuY29uY2F0KCcoKXt9W118Jl49PjwrLSolL1xcXFwhQCNcXCdcIn4uLD86YCcuc3BsaXQoJycpKVxudmFyIGJvdW5kYXJ5ID0gd2hpdGVzYXBjZS5jb25jYXQoWycoJ10pXG52YXIgYmluYXJ5T3BlcmF0b3JzID0ge1xuICAnJSc6IDUsXG4gICcvJzogNSxcbiAgJyonOiA1LFxuICAnLSc6IDYsXG4gICcrJzogNixcbiAgJz4+JzogNyxcbiAgJzw8JzogNyxcbiAgJz4+Pic6IDcsXG4gICc8JzogOCxcbiAgJz4nOiA4LFxuICAnPD0nOiA4LFxuICAnPj0nOiA4LFxuICBpbnN0YW5jZW9mOiA4LFxuICBpbjogOCxcbiAgJyE9JzogOSxcbiAgJz09JzogOSxcbiAgJyE9PSc6IDksXG4gICc9PT0nOiA5LFxuICAnJic6IDEwLFxuICAnfCc6IDExLFxuICAnXic6IDEyLFxuICAnJiYnOiAxMyxcbiAgJ3x8JzogMTRcbn1cblxudmFyIHNvcnRlZEJpbmFyeU9wZXJhdG9ycyA9IE9iamVjdC5rZXlzKGJpbmFyeU9wZXJhdG9ycykuc29ydChmdW5jdGlvbiAobCwgcikge1xuICByZXR1cm4gbC5sZW5ndGggPCByLmxlbmd0aCA/IDEgOiAtMVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZVxuXG52YXIgY2FjaGUgPSBtb2R1bGUuZXhwb3J0cy5jYWNoZSA9IHt9XG5cbmZ1bmN0aW9uIHBhcnNlIChzdHIpIHtcbiAgcmV0dXJuIGNhY2hlW3N0cl0gfHwgKGNhY2hlW3N0cl0gPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgMCkpXG59XG5cbmZ1bmN0aW9uIGV4cHJlc3Npb24gKHN0ciwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0ciB8fCAhc3RyW3N0YXJ0XSkgcmV0dXJuIG51bGxcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0eXBlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB2YXIgbm9kZSA9IHR5cGVzW2ldKHN0ciwgc3RhcnQsIGVuZClcbiAgICBpZiAobm9kZSkgYnJlYWtcbiAgfVxuXG4gIGlmICghbm9kZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdVbmV4cGVjdGVkIHRva2VuOiAnICsgc3RyW3N0YXJ0XSArICcgaW4gXCInICsgc3RyLnNsaWNlKHN0YXJ0LCAyMCkgKyAnXCInXG4gICAgKVxuICB9XG5cbiAgdmFyIGN1ciA9IG5vZGUucmFuZ2VbMV1cbiAgd2hpbGUgKHdoaXRlc2FwY2UuaW5kZXhPZihzdHJbY3VyXSkgIT09IC0xKSBjdXIgPSBjdXIgKyAxXG5cbiAgcmV0dXJuIGVuZC5pbmRleE9mKHN0cltjdXJdKSAhPT0gLTEgPyBub2RlIDogY29udGludWVFeHByZXNzaW9uKHN0ciwgbm9kZSwgZW5kKVxufVxuXG5mdW5jdGlvbiBjb250aW51ZUV4cHJlc3Npb24gKHN0ciwgbm9kZSwgZW5kKSB7XG4gIHZhciBzdGFydCA9IG5vZGUucmFuZ2VbMV1cbiAgd2hpbGUgKHN0cltzdGFydF0gJiYgZW5kLmluZGV4T2Yoc3RyW3N0YXJ0XSkgPT09IC0xKSB7XG4gICAgbm9kZSA9IHRyaW0oc3RyLCBmaW5kQ29udGludWF0aW9uLCBzdGFydCwgZW5kKVxuICAgIHN0YXJ0ID0gbm9kZS5yYW5nZVsxXVxuICAgIHdoaWxlICh3aGl0ZXNhcGNlLmluZGV4T2Yoc3RyW3N0YXJ0XSkgIT09IC0xKSBzdGFydCA9IHN0YXJ0ICsgMVxuICB9XG5cbiAgaWYgKGVuZC5pbmRleE9mKHN0cltzdGFydF0pID09PSAtMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdFeHBlY3RlZCB0byBmaW5kIHRva2VuOiAnICsgZW5kXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIG5vZGVcblxuICBmdW5jdGlvbiBmaW5kQ29udGludWF0aW9uIChzdHIsIHN0YXJ0LCBlbmQpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvbnRpbnVhdGlvbnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICB2YXIgY29udGludWF0aW9uID0gY29udGludWF0aW9uc1tpXShub2RlLCBzdHIsIHN0YXJ0LCBlbmQpXG4gICAgICBpZiAoY29udGludWF0aW9uKSBicmVha1xuICAgIH1cblxuICAgIGlmICghY29udGludWF0aW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdVbmV4cGVjdGVkIHRva2VuOiAnICsgc3RyW3N0YXJ0XSArICcgaW4gXCInICsgc3RyLnNsaWNlKHN0YXJ0LCBzdGFydCArIDIwKSArICdcIidcbiAgICAgIClcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGludWF0aW9uXG4gIH1cbn1cblxuZnVuY3Rpb24ga2V5d29yZCAoc3RyLCBzdGFydCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGtleXdvcmRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHZhciB3b3JkID0ga2V5d29yZHNbaV1cbiAgICBmb3IgKHZhciBqID0gMCwgbDIgPSB3b3JkLmxlbmd0aDsgaiA8IGwyOyArK2opIHtcbiAgICAgIGlmIChzdHJbc3RhcnQgKyBqXSAhPT0gd29yZFtqXSkgYnJlYWtcbiAgICB9XG5cbiAgICBpZiAoaiA9PT0gbDIpIGJyZWFrXG4gIH1cblxuICBpZiAoaSA9PT0gbCkgcmV0dXJuIG51bGxcblxuICByZXR1cm4gbmV3IE5vZGUoXG4gICAgJ2tleXdvcmQnLFxuICAgIFtzdGFydCwgc3RhcnQgKyB3b3JkLmxlbmd0aF0sXG4gICAgc3RyLFxuICAgIG51bGwsXG4gICAgdHJ1ZSxcbiAgICBrZXl3b3JkVmFsdWVzW3dvcmRdXG4gIClcbn1cblxuZnVuY3Rpb24gc3RyaW5nIChzdHIsIHN0YXJ0KSB7XG4gIHZhciBvcGVuID0gc3RyW3N0YXJ0XVxuICBpZiAob3BlbiAhPT0gJ1wiJyAmJiBvcGVuICE9PSAnXFwnJykgcmV0dXJuIG51bGxcbiAgdmFyIGN1ciA9IHN0YXJ0ICsgMVxuICB2YXIgY2hyID0gc3RyW2N1cl1cbiAgd2hpbGUgKChjaHIpICYmIGNociAhPT0gb3Blbikge1xuICAgIGlmIChzdHIgPT09ICdcXFxcJykgKytjdXJcbiAgICBjdXIgPSBjdXIgKyAxXG4gICAgY2hyID0gc3RyW2N1cl1cbiAgfVxuXG4gIGlmIChzdHJbY3VyKytdICE9PSBvcGVuKSB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHN0cmluZyB0byBiZSBjbG9zZWQnKVxuICByZXR1cm4gbmV3IE5vZGUoXG4gICAgJ3N0cmluZycsXG4gICAgW3N0YXJ0LCBjdXJdLFxuICAgIHN0cixcbiAgICBudWxsLFxuICAgIHRydWUsXG4gICAgc3RyLnNsaWNlKHN0YXJ0ICsgMSwgY3VyIC0gMSlcbiAgKVxufVxuXG5mdW5jdGlvbiBudW1iZXIgKHN0ciwgc3RhcnQpIHtcbiAgdmFyIGRlY2ltYWwgPSBmYWxzZVxuICB2YXIgY3VyID0gc3RhcnRcbiAgdmFyIGNociA9IHN0cltjdXJdXG4gIHdoaWxlIChjaHIpIHtcbiAgICBpZiAoY2hyID09PSAnLicpIHtcbiAgICAgIGlmIChkZWNpbWFsKSBicmVha1xuICAgICAgZGVjaW1hbCA9IHRydWVcbiAgICB9IGVsc2UgaWYgKGNociA8ICcwJyB8fCBjaHIgPiAnOScpIGJyZWFrXG4gICAgY3VyID0gY3VyICsgMVxuICAgIGNociA9IHN0cltjdXJdXG4gIH1cblxuICByZXR1cm4gY3VyIC0gc3RhcnQgPyBuZXcgTm9kZShcbiAgICAnbnVtYmVyJyxcbiAgICBbc3RhcnQsIGN1cl0sXG4gICAgc3RyLFxuICAgIG51bGwsXG4gICAgdHJ1ZSxcbiAgICBwYXJzZUludChzdHIuc2xpY2Uoc3RhcnQsIGN1ciksIDEwKVxuICApIDogbnVsbFxufVxuXG5mdW5jdGlvbiBsYWJlbCAoc3RyLCBzdGFydCkge1xuICB2YXIgY2hyID0gc3RyW3N0YXJ0XVxuICBpZiAoY2hyIDwgMCB8fCBjaHIgPiA5IHx8IHJlc2VydmVkQ2hhcmFjdGVycy5pbmRleE9mKGNocikgIT09IC0xKSByZXR1cm4gbnVsbFxuICB2YXIgY3VyID0gc3RhcnQgKyAxXG4gIGNociA9IHN0cltjdXJdXG5cbiAgd2hpbGUgKGNocikge1xuICAgIGlmIChyZXNlcnZlZENoYXJhY3RlcnMuaW5kZXhPZihjaHIpICE9PSAtMSkgYnJlYWtcbiAgICBjdXIgPSBjdXIgKyAxXG4gICAgY2hyID0gc3RyW2N1cl1cbiAgfVxuXG4gIHJldHVybiBuZXcgTm9kZSgnbGFiZWwnLCBbc3RhcnQsIGN1cl0sIHN0ciwgbnVsbClcbn1cblxuZnVuY3Rpb24gYXJyYXkgKHN0ciwgc3RhcnQpIHtcbiAgaWYgKHN0cltzdGFydF0gIT09ICdbJykgcmV0dXJuIG51bGxcbiAgdmFyIGN1ciA9IHN0YXJ0ICsgMVxuICB2YXIgY2hpbGRyZW4gPSBbXVxuICB2YXIgZW5kcyA9IFsnLCcsICddJ11cbiAgdmFyIG5leHQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgY3VyLCBlbmRzKVxuICB3aGlsZSAobmV4dCkge1xuICAgIGNoaWxkcmVuLnB1c2gobmV4dClcbiAgICBjdXIgPSBuZXh0LnJhbmdlWzFdXG4gICAgd2hpbGUgKGVuZHMuaW5kZXhPZihzdHJbY3VyXSkgPT09IC0xKSBjdXIgPSBjdXIgKyAxXG4gICAgaWYgKHN0cltjdXJdID09PSAnXScpIGJyZWFrXG4gICAgY3VyID0gY3VyICsgMVxuICAgIG5leHQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgY3VyLCBlbmRzKVxuICB9XG5cbiAgcmV0dXJuIG5ldyBOb2RlKCdhcnJheScsIFtzdGFydCwgY3VyICsgMV0sIHN0ciwge1xuICAgIGNoaWxkcmVuOiBjaGlsZHJlblxuICB9KVxufVxuXG5mdW5jdGlvbiBncm91cCAoc3RyLCBzdGFydCkge1xuICBpZiAoc3RyW3N0YXJ0XSAhPT0gJygnKSByZXR1cm4gbnVsbFxuXG4gIHZhciBub2RlID0gdHJpbShzdHIsIGV4cHJlc3Npb24sIHN0YXJ0ICsgMSwgWycpJ10pXG4gIHZhciBlbmQgPSBub2RlLnJhbmdlWzFdXG4gIHdoaWxlICh3aGl0ZXNhcGNlLmluZGV4T2Yoc3RyW2VuZF0pICE9PSAtMSkgZW5kID0gZW5kICsgMVxuICByZXR1cm4gbmV3IE5vZGUoJ2dyb3VwJywgW3N0YXJ0LCBlbmQgKyAxXSwgc3RyLCB7XG4gICAgZXhwcmVzc2lvbjogbm9kZVxuICB9KVxufVxuXG5mdW5jdGlvbiBoZWxwZXIgKGxlZnQsIHN0ciwgc3RhcnQsIGVuZCkge1xuICBpZiAobGVmdC50eXBlICE9PSAnbGFiZWwnIHx8IHN0cltzdGFydF0gIT09ICcoJykgcmV0dXJuXG4gIHZhciBjdXIgPSBzdGFydCArIDFcbiAgdmFyIGNoaWxkcmVuID0gW11cbiAgdmFyIGVuZHMgPSBbJywnLCAnKSddXG4gIHZhciBuZXh0ID0gdHJpbShzdHIsIGV4cHJlc3Npb24sIGN1ciwgZW5kcylcbiAgd2hpbGUgKG5leHQpIHtcbiAgICBjaGlsZHJlbi5wdXNoKG5leHQpXG4gICAgY3VyID0gbmV4dC5yYW5nZVsxXVxuICAgIHdoaWxlIChlbmRzLmluZGV4T2Yoc3RyW2N1cl0pID09PSAtMSkgY3VyID0gY3VyICsgMVxuICAgIGlmIChzdHJbY3VyXSA9PT0gJyknKSBicmVha1xuICAgIGN1ciA9IGN1ciArIDFcbiAgICBuZXh0ID0gdHJpbShzdHIsIGV4cHJlc3Npb24sIGN1ciwgZW5kcylcbiAgfVxuXG4gIGN1ciA9IGN1ciArIDFcblxuICByZXR1cm4gbmV3IE5vZGUoJ2hlbHBlcicsIFtsZWZ0LnJhbmdlWzBdLCBjdXJdLCBzdHIsIHtcbiAgICBsZWZ0OiBsZWZ0LFxuICAgIGNoaWxkcmVuOiBjaGlsZHJlblxuICB9KVxufVxuXG5mdW5jdGlvbiBtZW1iZXIgKGxlZnQsIHN0ciwgc3RhcnQpIHtcbiAgaWYgKHN0cltzdGFydF0gIT09ICcuJykgcmV0dXJuIG51bGxcbiAgdmFyIG5vZGUgPSBsYWJlbChzdHIsIHN0YXJ0ICsgMSlcblxuICBpZiAoIW5vZGUpIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgTGFiZWwnKVxuICByZXR1cm4gbmV3IE5vZGUoJ21lbWJlcicsIFtsZWZ0LnJhbmdlWzBdLCBub2RlLnJhbmdlWzFdXSwgc3RyLCB7XG4gICAgbGVmdDogbGVmdCxcbiAgICByaWdodDogbm9kZVxuICB9KVxufVxuXG5mdW5jdGlvbiBpbmRleCAobGVmdCwgc3RyLCBzdGFydCkge1xuICBpZiAoc3RyW3N0YXJ0XSAhPT0gJ1snKSByZXR1cm4gbnVsbFxuICB2YXIgbm9kZSA9IHRyaW0oc3RyLCBleHByZXNzaW9uLCBzdGFydCArIDEsIFsnXSddKVxuICB2YXIgZW5kID0gbm9kZS5yYW5nZVsxXSArIDFcbiAgd2hpbGUgKHdoaXRlc2FwY2UuaW5kZXhPZihzdHJbZW5kXSkgIT09IC0xKSBlbmQgPSBlbmQgKyAxXG4gIHJldHVybiBuZXcgTm9kZSgnaW5kZXgnLCBbbGVmdC5yYW5nZVswXSwgZW5kXSwgc3RyLCB7XG4gICAgbGVmdDogbGVmdCxcbiAgICByaWdodDogbm9kZVxuICB9KVxufVxuXG5mdW5jdGlvbiB1bmFyeSAoc3RyLCBzdGFydCwgZW5kKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdW5hcnlPcGVyYXRvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgdmFyIG9wID0gdW5hcnlPcGVyYXRvcnNbaV1cbiAgICBmb3IgKHZhciBqID0gMCwgbDIgPSBvcC5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICBpZiAoc3RyW3N0YXJ0ICsgal0gIT09IG9wW2pdKSBicmVha1xuICAgIH1cblxuICAgIGlmIChqID09PSBsMikgYnJlYWtcbiAgfVxuXG4gIGlmIChpID09PSBsKSByZXR1cm4gbnVsbFxuICB2YXIgbGVuID0gb3AubGVuZ3RoXG4gIHZhciBuZXh0ID0gc3RyW3N0YXJ0ICsgbGVuXVxuICBpZiAobGVuID4gMSAmJiBib3VuZGFyeS5pbmRleE9mKG5leHQpID09PSAnLTEnKSByZXR1cm4gbnVsbFxuICB2YXIgY2hpbGQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgc3RhcnQgKyBsZW4sIGVuZClcbiAgdmFyIG5vZGUgPSBuZXcgTm9kZSgndW5hcnknLCBbc3RhcnQsIGNoaWxkLnJhbmdlWzFdXSwgc3RyLCB7XG4gICAgb3A6IG9wLFxuICAgIHJpZ2h0OiBjaGlsZCxcbiAgICBwcmVzaWRlbmNlOiA0XG4gIH0pXG5cbiAgaWYgKGNoaWxkLnByZXNpZGVuY2UgJiYgY2hpbGQucHJlc2lkZW5jZSA+IDQpIHtcbiAgICBub2RlLnJpZ2h0ID0gY2hpbGQubGVmdFxuICAgIGNoaWxkLmxlZnQgPSBub2RlXG4gICAgcmV0dXJuIGNoaWxkXG4gIH1cblxuICByZXR1cm4gbm9kZVxufVxuXG5mdW5jdGlvbiBiaW5hcnkgKGxlZnQsIHN0ciwgc3RhcnQsIGVuZCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHNvcnRlZEJpbmFyeU9wZXJhdG9ycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB2YXIgb3AgPSBzb3J0ZWRCaW5hcnlPcGVyYXRvcnNbaV1cbiAgICBmb3IgKHZhciBqID0gMCwgbDIgPSBvcC5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICBpZiAoc3RyW3N0YXJ0ICsgal0gIT09IG9wW2pdKSBicmVha1xuICAgIH1cblxuICAgIGlmIChqID09PSBsMikgYnJlYWtcbiAgfVxuXG4gIGlmIChpID09PSBsKSByZXR1cm4gbnVsbFxuICBpZiAob3AgPT09ICdpbicgfHwgb3AgPT09ICdpbnN0YW5jZW9mJykge1xuICAgIHZhciBuZXh0ID0gc3RyW3N0YXJ0ICsgb3AubGVuZ3RoXVxuICAgIGlmIChib3VuZGFyeS5pbmRleE9mKG5leHQpID09PSAtMSkgcmV0dXJuIG51bGxcbiAgfVxuXG4gIHZhciBwcmVzaWRlbmNlID0gYmluYXJ5T3BlcmF0b3JzW29wXVxuICB2YXIgcmlnaHQgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgc3RhcnQgKyBvcC5sZW5ndGgsIGVuZClcbiAgdmFyIG5vZGUgPSBuZXcgTm9kZSgnYmluYXJ5JywgW2xlZnQucmFuZ2VbMF0sIHJpZ2h0LnJhbmdlWzFdXSwgc3RyLCB7XG4gICAgb3A6IG9wLFxuICAgIGxlZnQ6IGxlZnQsXG4gICAgcmlnaHQ6IHJpZ2h0LFxuICAgIHByZXNpZGVuY2U6IHByZXNpZGVuY2VcbiAgfSlcblxuICBpZiAocmlnaHQucHJlc2lkZW5jZSAmJiByaWdodC5wcmVzaWRlbmNlID49IHByZXNpZGVuY2UpIHtcbiAgICBub2RlLnJpZ2h0ID0gcmlnaHQubGVmdFxuICAgIHJpZ2h0LmxlZnQgPSBub2RlXG4gICAgcmV0dXJuIHJpZ2h0XG4gIH1cblxuICByZXR1cm4gbm9kZVxufVxuXG5mdW5jdGlvbiB0ZXJuYXJ5IChjb25kaXRpb24sIHN0ciwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RyW3N0YXJ0XSAhPT0gJz8nKSByZXR1cm4gbnVsbFxuICB2YXIgb2sgPSB0cmltKHN0ciwgZXhwcmVzc2lvbiwgc3RhcnQgKyAxLCBbJzonXSlcbiAgaWYgKCFvaykgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCB0b2tlbjogXCI6XCInKVxuICB2YXIgbmV4dCA9IG9rLnJhbmdlWzFdICsgMVxuICB3aGlsZSAod2hpdGVzYXBjZS5pbmRleE9mKHN0cltuZXh0XSkgIT09IC0xKSBuZXh0ID0gbmV4dCArIDFcbiAgdmFyIG5vdCA9IHRyaW0oc3RyLCBleHByZXNzaW9uLCBuZXh0ICsgMSwgZW5kKVxuXG4gIHJldHVybiBuZXcgTm9kZSgndGVybmFyeScsIFtjb25kaXRpb24ucmFuZ2VbMF0sIG5vdC5yYW5nZVsxXV0sIHN0ciwge1xuICAgIGxlZnQ6IGNvbmRpdGlvbixcbiAgICBtaWRkbGU6IG9rLFxuICAgIHJpZ2h0OiBub3QsXG4gICAgcHJlc2lkZW5jZTogMTVcbiAgfSlcbn1cblxuZnVuY3Rpb24gdHJpbSAoc3RyLCBwYXJzZSwgc3RhcnQsIGVuZCkge1xuICB2YXIgY2hyID0gc3RyW3N0YXJ0XVxuICB3aGlsZSAoY2hyKSB7XG4gICAgaWYgKHdoaXRlc2FwY2UuaW5kZXhPZihjaHIpID09PSAtMSkgYnJlYWtcbiAgICBzdGFydCA9IHN0YXJ0ICsgMVxuICAgIGNociA9IHN0cltzdGFydF1cbiAgfVxuXG4gIHJldHVybiBwYXJzZShzdHIsIHN0YXJ0LCBlbmQgfHwgW3VuZGVmaW5lZF0pXG59XG5cbmZ1bmN0aW9uIE5vZGUgKHR5cGUsIHJhbmdlLCBzdHIsIGRhdGEsIGxpdHRlcmFsLCB2YWwpIHtcbiAgdGhpcy50eXBlID0gdHlwZVxuICB0aGlzLnJhbmdlID0gcmFuZ2VcbiAgdGhpcy52YWx1ZSA9IHN0ci5zbGljZShyYW5nZVswXSwgcmFuZ2VbMV0pXG4gIHRoaXMuaWQgPSAnXycgKyBoYXNoKHRoaXMudmFsdWUpXG4gIHRoaXMuZGF0YSA9IGRhdGFcbiAgdGhpcy5saXR0ZXJhbCA9ICEhbGl0dGVyYWxcbiAgdGhpcy5yYXdWYWx1ZSA9IHZhbFxufVxuIiwidmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpXG5cbm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlXG5cbmZ1bmN0aW9uIHJlbW92ZSAoZXhwcmVzc2lvbiwgaGFuZGxlcikge1xuICB2YXIgbm9kZSA9IHBhcnNlKGV4cHJlc3Npb24pXG4gIHZhciBleHBcblxuICBpZiAoIW5vZGUgfHwgIShleHAgPSB0aGlzLmV4cHJlc3Npb25zW25vZGUudmFsdWVdKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgZXhwLnJlbW92ZShoYW5kbGVyKVxufVxuIiwidmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpXG52YXIgYnVpbGQgPSByZXF1aXJlKCcuL2J1aWxkJylcbnZhciBFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJylcblxubW9kdWxlLmV4cG9ydHMgPSB3YXRjaFxuXG5mdW5jdGlvbiB3YXRjaCAoZXhwcmVzc2lvbiwgaGFuZGxlcikge1xuICB2YXIgZXhwID0gdGhpcy5leHByZXNzaW9uc1tleHByZXNzaW9uXVxuXG4gIGlmICghZXhwKSB7XG4gICAgZXhwID0gd2F0Y2hOb2RlKHRoaXMsIHBhcnNlKGV4cHJlc3Npb24pLCBoYW5kbGVyKVxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICBoYW5kbGVyKGV4cC52YWx1ZSlcbiAgICB9XG4gIH0gZWxzZSBpZiAoZXhwLmhhbmRsZXJzLmluZGV4T2YoaGFuZGxlcikgPT09IC0xKSB7XG4gICAgZXhwLmhhbmRsZXJzLnB1c2goaGFuZGxlcilcbiAgICBoYW5kbGVyKGV4cC52YWx1ZSlcbiAgfVxuXG4gIHJldHVybiBleHBcbn1cblxuZnVuY3Rpb24gd2F0Y2hOb2RlIChkZXRlY3Rvciwgbm9kZSwgaGFuZGxlcikge1xuICB2YXIgZXhwcmVzc2lvblxuXG4gIGlmIChkZXRlY3Rvci5leHByZXNzaW9uc1tub2RlLnZhbHVlXSkgcmV0dXJuIGRldGVjdG9yLmV4cHJlc3Npb25zW25vZGUudmFsdWVdXG4gIGlmIChub2RlLnR5cGUgPT09ICdoZWxwZXInKSB7XG4gICAgZXhwcmVzc2lvbiA9IHdhdGNoSGVscGVyKGRldGVjdG9yLCBub2RlLCBoYW5kbGVyKVxuICB9IGVsc2Uge1xuICAgIGV4cHJlc3Npb24gPSB3YXRjaEV4cHJlc3Npb24oZGV0ZWN0b3IsIG5vZGUpXG4gIH1cblxuICBleHByZXNzaW9uLnVwZGF0ZShmYWxzZSlcblxuICBpZiAoaGFuZGxlcikge1xuICAgIGV4cHJlc3Npb24uaGFuZGxlcnMucHVzaChoYW5kbGVyKVxuICB9XG5cbiAgcmV0dXJuIGV4cHJlc3Npb25cbn1cblxuZnVuY3Rpb24gd2F0Y2hFeHByZXNzaW9uIChkZXRlY3Rvciwgbm9kZSkge1xuICB2YXIgYnVpbHQgPSBidWlsZChub2RlLCBkZXRlY3Rvci5zY29wZSlcbiAgdmFyIGhlbHBlcnMgPSBidWlsdC5kZXBzLmhlbHBlcnNcbiAgdmFyIGxlbiA9IGhlbHBlcnMubGVuZ3RoXG4gIHZhciBkZXBzID0gbmV3IEFycmF5KGxlbilcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgZGVwc1tpXSA9IHdhdGNoTm9kZShkZXRlY3RvciwgYnVpbHQuZGVwcy5oZWxwZXJzW2ldKVxuICB9XG5cbiAgaWYgKChidWlsdC5kZXBzLmRhdGEgfHwgYnVpbHQuZGVwcy5zY29wZSkgJiYgZGV0ZWN0b3Iucm9vdCkge1xuICAgIGRlcHMucHVzaChkZXRlY3Rvci5yb290KVxuICB9XG5cbiAgdmFyIGV4cHJlc3Npb24gPSBuZXcgRXhwcmVzc2lvbihkZXRlY3RvciwgYnVpbHQuY29tcGlsZWQsIG5vZGUsIGRlcHMpXG5cbiAgZGV0ZWN0b3IuZXhwcmVzc2lvbnNbbm9kZS52YWx1ZV0gPSBleHByZXNzaW9uXG5cbiAgcmV0dXJuIGV4cHJlc3Npb25cbn1cblxuZnVuY3Rpb24gd2F0Y2hIZWxwZXIgKGRldGVjdG9yLCBub2RlKSB7XG4gIHZhciBuYW1lID0gbm9kZS5kYXRhLmxlZnQudmFsdWVcbiAgdmFyIGNvbnN0cnVjdG9yID0gZGV0ZWN0b3IuaGVscGVyc1tuYW1lXVxuICBpZiAoIWNvbnN0cnVjdG9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGhlbHBlcjogJyArIG5hbWUpXG4gIH1cblxuICB2YXIgY2hpbGRyZW4gPSBub2RlLmRhdGEuY2hpbGRyZW5cbiAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICB2YXIgZGVwcyA9IG5ldyBBcnJheShsZW4pXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGRlcHNbaV0gPSB3YXRjaE5vZGUoZGV0ZWN0b3IsIGNoaWxkcmVuW2ldKVxuICB9XG5cbiAgdmFyIGhlbHBlciA9IGNvbnN0cnVjdG9yKGNoYW5nZSlcblxuICBpZiAodHlwZW9mIGhlbHBlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBFcnJvcignaGVscGVyICcgKyBuYW1lICsgJyBkaWQgbm90IHJldHVybiBhIGZ1bmN0aW9uJylcbiAgfVxuXG4gIHZhciBidWlsdCA9IGJ1aWxkLmhlbHBlcihkZXBzLmxlbmd0aClcbiAgdmFyIGV4cHJlc3Npb24gPSBuZXcgRXhwcmVzc2lvbihkZXRlY3RvciwgY2hlY2ssIG5vZGUsIGRlcHMpXG5cbiAgZGV0ZWN0b3IuZXhwcmVzc2lvbnNbbm9kZS52YWx1ZV0gPSBleHByZXNzaW9uXG4gIGRldGVjdG9yLmhlbHBlcnNbbm9kZS5pZF0gPSBleHByZXNzaW9uXG5cbiAgcmV0dXJuIGV4cHJlc3Npb25cblxuICBmdW5jdGlvbiBjaGFuZ2UgKHZhbHVlKSB7XG4gICAgcmV0dXJuIGV4cHJlc3Npb24uc2V0VmFsdWUodmFsdWUpXG4gIH1cblxuICBmdW5jdGlvbiBjaGVjayAoKSB7XG4gICAgcmV0dXJuIGJ1aWx0KGhlbHBlciwgZGVwcylcbiAgfVxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0aWYgKCFvYmogfHwgdG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJyB8fCBvYmoubm9kZVR5cGUgfHwgb2JqLnNldEludGVydmFsKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGhhc19vd25fY29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCA9IG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IucHJvdG90eXBlICYmIGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzX293bl9jb25zdHJ1Y3RvciAmJiAhaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIE93biBwcm9wZXJ0aWVzIGFyZSBlbnVtZXJhdGVkIGZpcnN0bHksIHNvIHRvIHNwZWVkIHVwLFxuXHQvLyBpZiBsYXN0IG9uZSBpcyBvd24sIHRoZW4gYWxsIHByb3BlcnRpZXMgYXJlIG93bi5cblx0dmFyIGtleTtcblx0Zm9yIChrZXkgaW4gb2JqKSB7fVxuXG5cdHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCB8fCBoYXNPd24uY2FsbChvYmosIGtleSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gXCJib29sZWFuXCIpIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH0gZWxzZSBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdGFyZ2V0ICE9PSBcImZ1bmN0aW9uXCIgfHwgdGFyZ2V0ID09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHRmb3IgKDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmICgob3B0aW9ucyA9IGFyZ3VtZW50c1tpXSkgIT0gbnVsbCkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yIChuYW1lIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0W25hbWVdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1tuYW1lXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICh0YXJnZXQgPT09IGNvcHkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoZGVlcCAmJiBjb3B5ICYmIChpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpKSkge1xuXHRcdFx0XHRcdGlmIChjb3B5SXNBcnJheSkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmIChjb3B5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbiJdfQ==
