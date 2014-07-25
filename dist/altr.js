(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var accessors = require('altr-accessors')
  , EE = require('events').EventEmitter
  , batch = require('batch-queue')

var template_string = require('./template_string')
  , element_node = require('./element_node')
  , text_node = require('./text_node')
  , get_el = require('./get_element')
  , toString = require('./to_string')
  , replace = require('./replace')
  , render = require('./render')
  , insert = require('./insert')
  , remove = require('./remove')
  , raf = require('./raf')

var dom_module = 'micro-dom'

altr.filters = {}
altr.includes = {}
altr.render = render
altr.addTag = add_tag
altr.include = include
altr.addFilter = add_filter

module.exports = altr

function altr(root, data, sync, doc) {
  if(!(this instanceof altr)) {
    return new altr(root, data, sync, doc)
  }

  EE.call(this)
  this.sync = !!sync
  this.root = root
  this.document = doc || global.document || require(dom_module).document
  this.filters = Object.create(altr.filters)
  this.includes = Object.create(altr.includes)
  this.accessors = accessors(this.filters, false)
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

  this._update = this.updateNodes(this.rootNodes())

  if(data) {
    this.update(data, true)
  }
}

altr.prototype = Object.create(EE.prototype)
altr.prototype.constructor = altr

altr.prototype.templateString = template_string
altr.prototype.createAccessor = create_accessor
altr.prototype.updateNodes = update_nodes
altr.prototype.initNodes = init_nodes
altr.prototype.rootNodes = root_nodes
altr.prototype.addFilter = add_filter
altr.prototype.runBatch = run_batch
altr.prototype.initNode = init_node
altr.prototype.toString = toString
altr.prototype.getElement = get_el
altr.prototype.include = include
altr.prototype.replace = replace
altr.prototype.into = append_to
altr.prototype.update = update
altr.prototype.insert = insert
altr.prototype.remove = remove
altr.prototype.tagList = []
altr.prototype.tags = {}

var node_handlers = {}

node_handlers[1] = element_node
node_handlers[3] = text_node

function update(data, sync) {
  this.state = data
  this._update && this._update(data)

  if(sync || this.sync) {
    this.runBatch()
  }
}

function update_nodes(nodes) {
  var hooks = this.initNodes(nodes)
    , self = this

  return hooks.length ? update : null

  function update(data, ctx) {
    for(var i = 0, l = hooks.length; i < l; ++i) {
      hooks[i].call(self, data, ctx)
    }
  }
}

function init_nodes(nodes, list) {
  var hooks = [].slice.call(nodes)
    .map(init_node.bind(this))
    .filter(Boolean)
    .reduce(flatten, [])

  return hooks

  function flatten(lhs, rhs) {
    return lhs.concat(rhs)
  }
}

function init_node(el) {
  return node_handlers[el.nodeType] ?
    node_handlers[el.nodeType].call(this, el) :
    el.childNodes && el.childNodes.length ?
    this.initNodes(el.childNodes) :
    null
}

function root_nodes() {
  return this.root.nodeType === this.document.DOCUMENT_FRAGMENT_NODE ?
    [].slice.call(this.root.childNodes) :
    [this.root]
}

function add_filter(name, filter) {
  altr.filters[name] = filter
}

function add_tag(attr, tag) {
  altr.prototype.tags[attr] = tag
  altr.prototype.tagList.push({
      attr: attr
    , constructor: tag
  })
}

function append_to(node) {
  var root_nodes = this.rootNodes()

  for(var i = 0, l = root_nodes.length; i < l; ++i) {
    node.appendChild(get_el(root_nodes[i]))
  }
}

function include(name, template) {
  return this.includes[name] = template
}

function create_accessor(description, change) {
  return this.accessors.create(description, change, false)
}

function add_filter(name, fn) {
  return this.filters[name] = fn
}

function run_batch() {
  this.batch.run() && this.emit('update', this.state)
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./element_node":3,"./get_element":4,"./insert":6,"./raf":7,"./remove":8,"./render":9,"./replace":10,"./template_string":20,"./text_node":21,"./to_string":22,"altr-accessors":23,"batch-queue":34,"events":35}],2:[function(require,module,exports){
(function (global){
module.exports = global.altr = require('./index')

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./index":5}],3:[function(require,module,exports){
module.exports = create_element_node

function create_element_node(el) {
  var altr_tags = {}
    , altr = this
    , hooks = []
    , attr

  var attrs = Array.prototype.filter.call(el.attributes, function(attr) {
    return altr.tags[attr.name] ?
      (altr_tags[attr.name] = attr.value) && false :
      true
  })

  attrs.forEach(function(attr) {
    var value = attr.value
      , name = attr.name
      , attr_hook
      , altr_attr

    if(altr_attr = !name.indexOf('altr-attr-')) {
      name = attr.name.slice('altr-attr-'.length)
      el.removeAttribute(attr.name)
    }

    attr_hook = altr_attr ?
      altr.createAccessor(value, altr.batch.add(update)) :
      altr.templateString(
          value
        , altr.batch.add(el.setAttribute.bind(el, name))
      )

    if(attr_hook) {
      hooks.push(attr_hook)
    }

    function update(val) {
      if(!val && val !== '' && val !== 0) {
        return el.removeAttribute(name)
      }

      if(val === true) {
        return el.setAttribute(name, '')
      }

      el.setAttribute(name, val)
    }
  })

  for(var i = 0, l = altr.tagList.length; i < l; ++i) {
    if(attr = altr_tags[altr.tagList[i].attr]) {
      hooks.push(altr.tagList[i].constructor.call(altr, el, attr))

      return hooks
    }
  }

  return hooks.concat(altr.initNodes(el.childNodes))
}

},{}],4:[function(require,module,exports){
module.exports = get_el

function get_el(el) {
  while(el && el._altr_placeholder) {
    el = el._altr_placeholder
  }

  return el
}

},{}],5:[function(require,module,exports){
var placeholder = require('./tags/placeholder')
  , children_tag = require('./tags/children')
  , include_tag = require('./tags/include')
  , text_tag = require('./tags/text')
  , html_tag = require('./tags/html')
  , with_tag = require('./tags/with')
  , for_tag = require('./tags/for')
  , if_tag = require('./tags/if')
  , altr = require('./altr')

module.exports = altr

altr.addTag('altr-placeholder', placeholder)
altr.addTag('altr-children', children_tag)
altr.addTag('altr-replace', placeholder)
altr.addTag('altr-include', include_tag)
altr.addTag('altr-text', text_tag)
altr.addTag('altr-html', html_tag)
altr.addTag('altr-with', with_tag)
altr.addTag('altr-for', for_tag)
altr.addTag('altr-if', if_tag)

},{"./altr":1,"./tags/children":12,"./tags/for":13,"./tags/html":14,"./tags/if":15,"./tags/include":16,"./tags/placeholder":17,"./tags/text":18,"./tags/with":19}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
module.exports = remove

function remove(parent, el) {
  parent.removeChild(el)
  this.emit('remove', el, parent)
}

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
module.exports = replace

function replace(parent, el, old) {
  parent.replaceChild(el, old)
  this.emit('replace', el, old, parent)
  this.emit('insert', el, parent)
  this.emit('remove', old, parent)
}

},{}],11:[function(require,module,exports){
var get = require('./get_element')

module.exports = set_children

function set_children(root, nodes) {
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

},{"./get_element":4}],12:[function(require,module,exports){
var set_children = require('../set_children')

module.exports = children

function children(el, accessor) {
  var current = []

  el.innerHTML = ''

  return this.batch.add(this.createAccessor(accessor, update.bind(this)))

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
    set_children.call(this, el, current)
  }
}

function is_node(el) {
  return el && el.nodeType
}

},{"../set_children":11}],13:[function(require,module,exports){
var set_children = require('../set_children')
  , for_regexp = /^(.*?)\s+in\s+(.*$)/

module.exports = for_handler

function for_handler(root, args) {
  var parts = args.match(for_regexp)
    , template = root.innerHTML
    , dom_nodes = []
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

  var run_updates = this.batch.add(run_dom_updates)

  return altr.createAccessor(key, update)

  function update_children(data) {
    var item_data

    for(var i = 0, l = children.length; i < l; ++i) {
      item_data = Object.create(data)
      item_data[prop] = items[i]
      item_data['$index'] = i

      children[i].update && children[i].update(item_data)
    }
  }

  function update(new_items, data) {
    if(!Array.isArray(new_items)) {
      new_items = []
    }

    var new_children = new Array(new_items.length)
      , index

    dom_nodes = []

    for(var i = 0, l = new_items.length; i < l; ++i) {
      index = find_index(items, new_items[i], unique)

      if(index !== -1) {
        new_children[i] = children[index]
        items[index] = {}
      } else {
        new_children[i] = make_children()
      }

      dom_nodes = dom_nodes.concat(new_children[i].dom_nodes)
    }

    children = new_children.slice()
    items = new_items.slice()
    run_updates.call(altr)
    update_children(data)
  }

  function find_index(items, d, unique) {
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

  function make_children() {
    var temp = altr.document.createElementNS(root.namespaceURI, 'div')
      , dom_nodes
      , update

    temp.innerHTML = template

    dom_nodes = Array.prototype.slice.call(temp.childNodes)
    update = altr.updateNodes(dom_nodes)

    return {
        dom_nodes: dom_nodes
      , update: update
    }
  }

  function run_dom_updates() {
    set_children.call(this, root, dom_nodes)
  }
}

},{"../set_children":11}],14:[function(require,module,exports){
module.exports = html

function html(el, accessor) {
  return this.batch.add(this.createAccessor(accessor, update))

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

},{}],15:[function(require,module,exports){
module.exports = if_tag

function if_tag(el, accessor) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , update_children = this.updateNodes(el.childNodes)
    , hidden = null
    , altr = this

  var hide = this.batch.add(function() {
    var parent = el.parentNode

    if(!hidden) {
      altr.replace(el.parentNode, placeholder, el)
      el._altr_placeholder = placeholder
      hidden = true
    }
  })

  var show = this.batch.add(function() {
    if(hidden) {
      altr.replace(placeholder.parentNode, el, placeholder)
      delete el._altr_placeholder
      hidden = false
    }
  })

  return this.createAccessor(accessor, toggle)

  function toggle(val, data) {
    if(!val) {
      return hide()
    }

    show()
    update_children && update_children(data)
  }
}

},{}],16:[function(require,module,exports){
module.exports = include

function include(el, name) {
  el.innerHTML = this.includes[name]

  return this.updateNodes(el.childNodes)
}

},{}],17:[function(require,module,exports){
module.exports = placeholder

function placeholder(original, accessor) {
  var current = original
    , altr = this

  return this.batch.add(this.createAccessor(accessor, update))

  function update(val) {
    if(!val || !val.nodeName || val === current) {
      return
    }

    altr.replace(current.parentNode, val, current)
    original._altr_placeholder = val
    current = val
  }
}

},{}],18:[function(require,module,exports){
module.exports = text

function text(el, accessor) {
  return this.batch.add(this.createAccessor(accessor, update))

  function update(val) {
    el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],19:[function(require,module,exports){
module.exports = with_tag

function with_tag(el, accessor) {
  var update = this.updateNodes(el.childNodes)

  return update ? this.createAccessor(accessor, update) : null
}

},{}],20:[function(require,module,exports){
var TAG = /{{\s*(.*?)\s*}}/

module.exports = template_string

function template_string(template, change) {
  if(!template.match(TAG)) {
    return
  }

  var remaining = template
    , parts = []
    , hooks = []
    , timer
    , index
    , next

  while(remaining && (next = remaining.match(TAG))) {
    if(index = remaining.indexOf(next[0])) {
      parts.push(remaining.slice(0, index))
    }

    parts.push('')
    remaining = remaining.slice(index + next[0].length)
    hooks.push(
        this.createAccessor(next[1], set_part.bind(this, parts.length - 1))
    )
  }

  parts.push(remaining)

  return update

  function set_part(idx, val) {
    parts[idx] = val
    change(parts.join(''))
  }

  function update(data) {
    hooks.forEach(function(hook) {
      hook(data)
    })
  }
}

},{}],21:[function(require,module,exports){
module.exports = init_text_node

function init_text_node(el) {
  var hook = this.templateString(el.textContent, this.batch.add(update))

  return hook ? [hook] : null

  function update(val) {
    el.textContent = val
  }
}

},{}],22:[function(require,module,exports){
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

    temp.appendChild(node.cloneNode())

    return temp.innerHTML
  }
}

},{}],23:[function(require,module,exports){
var add_operators = require('./lib/operators')
  , create_accesor = require('./lib/create')
  , add_filters = require('./lib/filter')
  , add_lookup = require('./lib/lookup')
  , add_parens = require('./lib/parens')
  , create_list = require('./lib/list')
  , debounce = require('just-debounce')
  , add_types = require('./lib/types')
  , add_arrow = require('./lib/arrow')
  , split = require('./lib/split')
  , types = []

module.exports = accessors

// order is important
add_types(types)
add_arrow(types)
add_filters(types)
add_parens(types)
add_operators(types)
add_lookup(types)

accessors.prototype.createPart = create_accesor
accessors.prototype.createParts = create_list
accessors.prototype.addFilter = add_filter
accessors.prototype.create = create
accessors.prototype.types = types
accessors.prototype.split = split

function accessors(filters, delay) {
  if(!(this instanceof accessors)) {
    return new accessors(filters, delay)
  }

  if(!delay && delay !== false) {
    delay = 0
  }

  this.delay = delay
  this.filters = filters || {}
}

function add_filter(name, fn) {
  this.filters[name] = fn
}

function create(str, change, all) {
  var part = this.createPart(
      str
    , this.delay === false ? update : debounce(change, this.delay, false, true)
  )

  var sync = false
    , prev = {}
    , out

  return write

  function write(data) {
    var _out = {}

    sync = true
    out = _out
    part(data)
    sync = false

    if(out !== _out) {
      change.apply(null, out)
    }
  }

  function update(val, ctx) {
    if(!all && typeof val !== 'object' && val === prev) {
      return
    }

    out = [].slice.call(arguments)
    prev = val

    if(!sync) {
      change.apply(null, out)
    }
  }
}

},{"./lib/arrow":24,"./lib/create":25,"./lib/filter":26,"./lib/list":27,"./lib/lookup":28,"./lib/operators":29,"./lib/parens":30,"./lib/split":31,"./lib/types":32,"just-debounce":33}],24:[function(require,module,exports){
module.exports = add_arrow

function add_arrow(types) {
  types.push(create_arrow)
}

function create_arrow(parts, change) {
  parts = this.split(parts, '->')

  if(parts.length < 2) {
    return
  }

  var right = this.createPart(parts[1], change)
    , left = this.createPart(parts[0], update)

  return left

  function update(val, ctx) {
    right(val, ctx)
  }
}

},{}],25:[function(require,module,exports){
module.exports = accessor

function accessor(key, change) {
  var part = build_part.call(this, key, finish.bind(this))
    , context

  return call

  function call(val, ctx) {
    part(val, context = ctx || val)
  }

  function finish(val, ctx) {
    change.call(this, val, arguments.length > 1 ? ctx : context)
  }
}

function build_part(part, change) {
  var accessor

  for(var i = 0, l = this.types.length; i < l; ++i) {
    if(accessor = this.types[i].call(this, part, change)) {
      return accessor
    }
  }
}

},{}],26:[function(require,module,exports){
var filter_regexp = /^\s*([^\s(]+)\((.*)\)\s*$/

module.exports = add_filter

function add_filter(types) {
  types.push(create_filter)
}

function create_filter(parts, change) {
  if(!(parts = parts.match(filter_regexp))) {
    return
  }

  var filter = this.filters[parts[1]]
    , context

  if(!filter) {
    throw new Error('could not find filter: ' + parts[1])
  }

  filter = filter.call(this, update)

  return this.createParts(this.split(parts[2], ',', null, null, true), run)

  function run(args, ctx) {
    context = ctx
    filter(args, ctx)
  }

  function update(val, ctx) {
    change(val, arguments.length > 1 ? ctx : context)
  }
}

},{}],27:[function(require,module,exports){
module.exports = create_list

function create_list(parts, change, all) {
  var updating = false
    , changed = false
    , accessors = []
    , state = []

  if(!parts.length) {
    return function(val, ctx) {
      change([], ctx)
    }
  }

  for(var i = 0, l = parts.length; i < l; ++i) {
    accessors.push(this.createPart(parts[i], update.bind(this, i)))
  }

  return function(val, ctx) {
    ctx = arguments.length > 1 ? ctx : val
    changed = false
    updating = true
    get_parts(val, ctx)
    updating = false

    if(!all && changed) {
      change(state, ctx)
    }
  }

  function update(index, val, ctx) {
    state[index] = val
    changed = true

    if(all || !updating) {
      change(state, ctx)
    }
  }

  function get_parts(val, ctx) {
    for(var i = 0, l = accessors.length; i < l; ++i) {
      accessors[i](val, ctx)
    }
  }
}

},{}],28:[function(require,module,exports){
module.exports = add_lookup

function add_lookup(types) {
  types.push(create_lookup)
}

function create_lookup(path, change) {
  if(!path.indexOf('$data')) {
    path = path.slice('$data.'.length)

    if(!path) {
      return change
    }
  }

  return lookup(path.match(/\s*(.*[^\s])\s*/)[1], change)
}

function lookup(path, done) {
  var parts = path ? path.split('.') : []

  return function(obj, ctx) {
    var result = search(obj, parts)

    if(typeof result === 'undefined' && ctx) {
      result = search(ctx, parts)
    }

    done(result, ctx)
  }
}

function search(obj, parts) {
  for(var i = 0, l = parts.length; obj && i < l; ++i) {
    obj = obj[parts[i]]
  }

  if(i === l) {
    return obj
  }
}

},{}],29:[function(require,module,exports){
var ternary_regexp = /^\s*(.+?)\s*\?(.*)\s*$/

module.exports = add_operators

function add_operators(types) {
  types.push(create_ternary)
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
}

function binary(list) {
  var regex = new RegExp(
      '^\\s*(.+?)\\s\*(\\' +
      list.join('|\\') +
      ')\\s*(.+?)\\s*$'
  )

  return function(parts, change) {
    return create_binary.call(this, regex, parts, change)
  }
}

function unary(list) {
  var regex = new RegExp(
      '^\\s*(\\' +
      list.join('|\\') +
      ')\\s*(.+?)\\s*$'
  )

  return function(parts, change) {
    return create_unary.call(this, regex, parts, change)
  }
}

function create_ternary(parts, change) {
  if(!(parts = parts.match(ternary_regexp))) {
    return
  }

  var condition = parts[1]
    , rest = parts[2]
    , count = 1

  rest = this.split(rest, ':', [['?', ':'], ['(', ')']])

  if(rest.length !== 2) {
    throw new Error('Unmatched ternary: ' + parts[0])
  }

  var not = this.createPart(rest[1], change)
    , ok = this.createPart(rest[0], change)

  return this.createPart(condition, update)

  function update(val, context) {
    return val ? ok(context) : not(context)
  }
}

function create_binary(regex, parts, change) {
  if(!(parts = parts.match(regex))) {
    return
  }

  var check_lhs = this.createPart(parts[1], update.bind(null, false))
    , check_rhs = this.createPart(parts[3], update.bind(null, true))
    , unset = {}

  var lhs = unset
    , rhs = unset

  var changed = Function(
      'change, lhs, rhs'
    , 'return change(lhs ' + parts[2] + ' rhs)'
  ).bind(null, change)

  return on_data

  function on_data(data, ctx) {
    check_lhs(data, ctx)
    check_rhs(data, ctx)
  }

  function update(is_rhs, val) {
    is_rhs ? rhs = val : lhs = val

    if(lhs === unset || rhs === unset) {
      return
    }

    changed(lhs, rhs)
  }
}

function create_unary(regex, parts, change) {
  if(!(parts = parts.match(regex))) {
    return
  }

  var changed = Function(
      'change, val'
    , 'return change(' + parts[1] + 'val)'
  ).bind(null, change)

  return this.createPart(parts[2], changed)
}

},{}],30:[function(require,module,exports){
var parens_regexp = /^\s*\((.*)$/

module.exports = add_parens

function add_parens(types) {
  types.push(create_parens)
}

function create_parens(parts, change) {
  if(!(parts = parts.match(parens_regexp))) {
    return
  }

  var body = parts[1]
    , count = 1

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
    throw new Error('Unmatched parens: ' + parts[0])
  }

  var content =  this.createPart(body.slice(0, i), update)
    , key = 'paren_' + Math.random().toString(16).slice(2)

  var template = this.createPart(key + body.slice(i + 1), change)

  return content

  function update(val, _context) {
    var context = Object.create(typeof _context === 'object' ? _context : null)

    context[key] = val
    template(context, _context)
  }
}

},{}],31:[function(require,module,exports){
module.exports = split

function split(parts, key, _pairs, all) {
  var pairs = [['(', ')']]
    , layers = []

  pairs = _pairs || pairs

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
      layers.pop()

      continue
    }

    for(var j = 0, l2 = pairs.length; j < l2; ++j) {
      if(parts[i] === pairs[j][0]) {
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

  return [left].concat(split(right, key, pairs, all))
}

},{}],32:[function(require,module,exports){
var string_regexp = /^\s*(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")\s*$/
  , number_regexp = /^\s*(\d*(?:\.\d+)?)\s*$/

module.exports = add_types

function add_types(types) {
  types.push(create_string_accessor)
  types.push(create_number_accessor)
}

function create_string_accessor(parts, change) {
  if(!(parts = parts.match(string_regexp))) {
    return
  }

  var val = parts[1] || parts[2] || ''

  return function(ignore, context) {
    change(val, context)
  }
}

function create_number_accessor(parts, change) {
  if(!(parts = parts.match(number_regexp))) {
    return
  }

  var val = +parts[1]

  return function(ignore, context) {
    change(val, context)
  }
}

},{}],33:[function(require,module,exports){
module.exports = debounce

function debounce(fn, delay, at_start, guarantee) {
  var timeout
    , args

  return function() {
    var self = this

    args = Array.prototype.slice.call(arguments)

    if(timeout && (at_start || guarantee)) {
      return
    } else if(!at_start) {
      clear()

      return timeout = setTimeout(run, delay)
    }

    timeout = setTimeout(clear, delay)
    fn.apply(self, args)

    function run() {
      clear()
      fn.apply(self, args)
    }

    function clear() {
      clearTimeout(timeout)
      timeout = null
    }
  }
}

},{}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYWx0ci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9icm93c2VyLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2VsZW1lbnRfbm9kZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9nZXRfZWxlbWVudC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9pbnNlcnQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvcmFmLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3JlbW92ZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9yZW5kZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvcmVwbGFjZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9zZXRfY2hpbGRyZW4uanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9jaGlsZHJlbi5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL2Zvci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL2h0bWwuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pZi5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL2luY2x1ZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9wbGFjZWhvbGRlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3RleHQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy93aXRoLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RlbXBsYXRlX3N0cmluZy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90ZXh0X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdG9fc3RyaW5nLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2luZGV4LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9hcnJvdy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvY3JlYXRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9maWx0ZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2xpc3QuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2xvb2t1cC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvb3BlcmF0b3JzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9wYXJlbnMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL3NwbGl0LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi90eXBlcy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9ub2RlX21vZHVsZXMvanVzdC1kZWJvdW5jZS9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9iYXRjaC1xdWV1ZS9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBhY2Nlc3NvcnMgPSByZXF1aXJlKCdhbHRyLWFjY2Vzc29ycycpXG4gICwgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcbiAgLCBiYXRjaCA9IHJlcXVpcmUoJ2JhdGNoLXF1ZXVlJylcblxudmFyIHRlbXBsYXRlX3N0cmluZyA9IHJlcXVpcmUoJy4vdGVtcGxhdGVfc3RyaW5nJylcbiAgLCBlbGVtZW50X25vZGUgPSByZXF1aXJlKCcuL2VsZW1lbnRfbm9kZScpXG4gICwgdGV4dF9ub2RlID0gcmVxdWlyZSgnLi90ZXh0X25vZGUnKVxuICAsIGdldF9lbCA9IHJlcXVpcmUoJy4vZ2V0X2VsZW1lbnQnKVxuICAsIHRvU3RyaW5nID0gcmVxdWlyZSgnLi90b19zdHJpbmcnKVxuICAsIHJlcGxhY2UgPSByZXF1aXJlKCcuL3JlcGxhY2UnKVxuICAsIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJylcbiAgLCBpbnNlcnQgPSByZXF1aXJlKCcuL2luc2VydCcpXG4gICwgcmVtb3ZlID0gcmVxdWlyZSgnLi9yZW1vdmUnKVxuICAsIHJhZiA9IHJlcXVpcmUoJy4vcmFmJylcblxudmFyIGRvbV9tb2R1bGUgPSAnbWljcm8tZG9tJ1xuXG5hbHRyLmZpbHRlcnMgPSB7fVxuYWx0ci5pbmNsdWRlcyA9IHt9XG5hbHRyLnJlbmRlciA9IHJlbmRlclxuYWx0ci5hZGRUYWcgPSBhZGRfdGFnXG5hbHRyLmluY2x1ZGUgPSBpbmNsdWRlXG5hbHRyLmFkZEZpbHRlciA9IGFkZF9maWx0ZXJcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmZ1bmN0aW9uIGFsdHIocm9vdCwgZGF0YSwgc3luYywgZG9jKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIGFsdHIpKSB7XG4gICAgcmV0dXJuIG5ldyBhbHRyKHJvb3QsIGRhdGEsIHN5bmMsIGRvYylcbiAgfVxuXG4gIEVFLmNhbGwodGhpcylcbiAgdGhpcy5zeW5jID0gISFzeW5jXG4gIHRoaXMucm9vdCA9IHJvb3RcbiAgdGhpcy5kb2N1bWVudCA9IGRvYyB8fCBnbG9iYWwuZG9jdW1lbnQgfHwgcmVxdWlyZShkb21fbW9kdWxlKS5kb2N1bWVudFxuICB0aGlzLmZpbHRlcnMgPSBPYmplY3QuY3JlYXRlKGFsdHIuZmlsdGVycylcbiAgdGhpcy5pbmNsdWRlcyA9IE9iamVjdC5jcmVhdGUoYWx0ci5pbmNsdWRlcylcbiAgdGhpcy5hY2Nlc3NvcnMgPSBhY2Nlc3NvcnModGhpcy5maWx0ZXJzLCBmYWxzZSlcbiAgdGhpcy5iYXRjaCA9IGJhdGNoKChmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5zeW5jKSB7XG4gICAgICByYWYodGhpcy5ydW5CYXRjaC5iaW5kKHRoaXMpKVxuICAgIH1cbiAgfSkuYmluZCh0aGlzKSlcblxuICBpZihnbG9iYWwuQnVmZmVyICYmIHJvb3QgaW5zdGFuY2VvZiBnbG9iYWwuQnVmZmVyKSB7XG4gICAgcm9vdCA9IHJvb3QudG9TdHJpbmcoKVxuICB9XG5cbiAgaWYodHlwZW9mIHJvb3QgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHJvb3RcbiAgICB0aGlzLnJvb3QgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXG4gICAgd2hpbGUodGVtcC5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGVtcC5maXJzdENoaWxkKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMuX3VwZGF0ZSA9IHRoaXMudXBkYXRlTm9kZXModGhpcy5yb290Tm9kZXMoKSlcblxuICBpZihkYXRhKSB7XG4gICAgdGhpcy51cGRhdGUoZGF0YSwgdHJ1ZSlcbiAgfVxufVxuXG5hbHRyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRUUucHJvdG90eXBlKVxuYWx0ci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBhbHRyXG5cbmFsdHIucHJvdG90eXBlLnRlbXBsYXRlU3RyaW5nID0gdGVtcGxhdGVfc3RyaW5nXG5hbHRyLnByb3RvdHlwZS5jcmVhdGVBY2Nlc3NvciA9IGNyZWF0ZV9hY2Nlc3NvclxuYWx0ci5wcm90b3R5cGUudXBkYXRlTm9kZXMgPSB1cGRhdGVfbm9kZXNcbmFsdHIucHJvdG90eXBlLmluaXROb2RlcyA9IGluaXRfbm9kZXNcbmFsdHIucHJvdG90eXBlLnJvb3ROb2RlcyA9IHJvb3Rfbm9kZXNcbmFsdHIucHJvdG90eXBlLmFkZEZpbHRlciA9IGFkZF9maWx0ZXJcbmFsdHIucHJvdG90eXBlLnJ1bkJhdGNoID0gcnVuX2JhdGNoXG5hbHRyLnByb3RvdHlwZS5pbml0Tm9kZSA9IGluaXRfbm9kZVxuYWx0ci5wcm90b3R5cGUudG9TdHJpbmcgPSB0b1N0cmluZ1xuYWx0ci5wcm90b3R5cGUuZ2V0RWxlbWVudCA9IGdldF9lbFxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIucHJvdG90eXBlLnJlcGxhY2UgPSByZXBsYWNlXG5hbHRyLnByb3RvdHlwZS5pbnRvID0gYXBwZW5kX3RvXG5hbHRyLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcbmFsdHIucHJvdG90eXBlLmluc2VydCA9IGluc2VydFxuYWx0ci5wcm90b3R5cGUucmVtb3ZlID0gcmVtb3ZlXG5hbHRyLnByb3RvdHlwZS50YWdMaXN0ID0gW11cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG52YXIgbm9kZV9oYW5kbGVycyA9IHt9XG5cbm5vZGVfaGFuZGxlcnNbMV0gPSBlbGVtZW50X25vZGVcbm5vZGVfaGFuZGxlcnNbM10gPSB0ZXh0X25vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEsIHN5bmMpIHtcbiAgdGhpcy5zdGF0ZSA9IGRhdGFcbiAgdGhpcy5fdXBkYXRlICYmIHRoaXMuX3VwZGF0ZShkYXRhKVxuXG4gIGlmKHN5bmMgfHwgdGhpcy5zeW5jKSB7XG4gICAgdGhpcy5ydW5CYXRjaCgpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlX25vZGVzKG5vZGVzKSB7XG4gIHZhciBob29rcyA9IHRoaXMuaW5pdE5vZGVzKG5vZGVzKVxuICAgICwgc2VsZiA9IHRoaXNcblxuICByZXR1cm4gaG9va3MubGVuZ3RoID8gdXBkYXRlIDogbnVsbFxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhLCBjdHgpIHtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gaG9va3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBob29rc1tpXS5jYWxsKHNlbGYsIGRhdGEsIGN0eClcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdF9ub2Rlcyhub2RlcywgbGlzdCkge1xuICB2YXIgaG9va3MgPSBbXS5zbGljZS5jYWxsKG5vZGVzKVxuICAgIC5tYXAoaW5pdF9ub2RlLmJpbmQodGhpcykpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5yZWR1Y2UoZmxhdHRlbiwgW10pXG5cbiAgcmV0dXJuIGhvb2tzXG5cbiAgZnVuY3Rpb24gZmxhdHRlbihsaHMsIHJocykge1xuICAgIHJldHVybiBsaHMuY29uY2F0KHJocylcbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0X25vZGUoZWwpIHtcbiAgcmV0dXJuIG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdID9cbiAgICBub2RlX2hhbmRsZXJzW2VsLm5vZGVUeXBlXS5jYWxsKHRoaXMsIGVsKSA6XG4gICAgZWwuY2hpbGROb2RlcyAmJiBlbC5jaGlsZE5vZGVzLmxlbmd0aCA/XG4gICAgdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcykgOlxuICAgIG51bGxcbn1cblxuZnVuY3Rpb24gcm9vdF9ub2RlcygpIHtcbiAgcmV0dXJuIHRoaXMucm9vdC5ub2RlVHlwZSA9PT0gdGhpcy5kb2N1bWVudC5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFID9cbiAgICBbXS5zbGljZS5jYWxsKHRoaXMucm9vdC5jaGlsZE5vZGVzKSA6XG4gICAgW3RoaXMucm9vdF1cbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmaWx0ZXIpIHtcbiAgYWx0ci5maWx0ZXJzW25hbWVdID0gZmlsdGVyXG59XG5cbmZ1bmN0aW9uIGFkZF90YWcoYXR0ciwgdGFnKSB7XG4gIGFsdHIucHJvdG90eXBlLnRhZ3NbYXR0cl0gPSB0YWdcbiAgYWx0ci5wcm90b3R5cGUudGFnTGlzdC5wdXNoKHtcbiAgICAgIGF0dHI6IGF0dHJcbiAgICAsIGNvbnN0cnVjdG9yOiB0YWdcbiAgfSlcbn1cblxuZnVuY3Rpb24gYXBwZW5kX3RvKG5vZGUpIHtcbiAgdmFyIHJvb3Rfbm9kZXMgPSB0aGlzLnJvb3ROb2RlcygpXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHJvb3Rfbm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgbm9kZS5hcHBlbmRDaGlsZChnZXRfZWwocm9vdF9ub2Rlc1tpXSkpXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5jbHVkZShuYW1lLCB0ZW1wbGF0ZSkge1xuICByZXR1cm4gdGhpcy5pbmNsdWRlc1tuYW1lXSA9IHRlbXBsYXRlXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9hY2Nlc3NvcihkZXNjcmlwdGlvbiwgY2hhbmdlKSB7XG4gIHJldHVybiB0aGlzLmFjY2Vzc29ycy5jcmVhdGUoZGVzY3JpcHRpb24sIGNoYW5nZSwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZm4pIHtcbiAgcmV0dXJuIHRoaXMuZmlsdGVyc1tuYW1lXSA9IGZuXG59XG5cbmZ1bmN0aW9uIHJ1bl9iYXRjaCgpIHtcbiAgdGhpcy5iYXRjaC5ydW4oKSAmJiB0aGlzLmVtaXQoJ3VwZGF0ZScsIHRoaXMuc3RhdGUpXG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwuYWx0ciA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX2VsZW1lbnRfbm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVfZWxlbWVudF9ub2RlKGVsKSB7XG4gIHZhciBhbHRyX3RhZ3MgPSB7fVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGhvb2tzID0gW11cbiAgICAsIGF0dHJcblxuICB2YXIgYXR0cnMgPSBBcnJheS5wcm90b3R5cGUuZmlsdGVyLmNhbGwoZWwuYXR0cmlidXRlcywgZnVuY3Rpb24oYXR0cikge1xuICAgIHJldHVybiBhbHRyLnRhZ3NbYXR0ci5uYW1lXSA/XG4gICAgICAoYWx0cl90YWdzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlKSAmJiBmYWxzZSA6XG4gICAgICB0cnVlXG4gIH0pXG5cbiAgYXR0cnMuZm9yRWFjaChmdW5jdGlvbihhdHRyKSB7XG4gICAgdmFyIHZhbHVlID0gYXR0ci52YWx1ZVxuICAgICAgLCBuYW1lID0gYXR0ci5uYW1lXG4gICAgICAsIGF0dHJfaG9va1xuICAgICAgLCBhbHRyX2F0dHJcblxuICAgIGlmKGFsdHJfYXR0ciA9ICFuYW1lLmluZGV4T2YoJ2FsdHItYXR0ci0nKSkge1xuICAgICAgbmFtZSA9IGF0dHIubmFtZS5zbGljZSgnYWx0ci1hdHRyLScubGVuZ3RoKVxuICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSlcbiAgICB9XG5cbiAgICBhdHRyX2hvb2sgPSBhbHRyX2F0dHIgP1xuICAgICAgYWx0ci5jcmVhdGVBY2Nlc3Nvcih2YWx1ZSwgYWx0ci5iYXRjaC5hZGQodXBkYXRlKSkgOlxuICAgICAgYWx0ci50ZW1wbGF0ZVN0cmluZyhcbiAgICAgICAgICB2YWx1ZVxuICAgICAgICAsIGFsdHIuYmF0Y2guYWRkKGVsLnNldEF0dHJpYnV0ZS5iaW5kKGVsLCBuYW1lKSlcbiAgICAgIClcblxuICAgIGlmKGF0dHJfaG9vaykge1xuICAgICAgaG9va3MucHVzaChhdHRyX2hvb2spXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgICAgaWYoIXZhbCAmJiB2YWwgIT09ICcnICYmIHZhbCAhPT0gMCkge1xuICAgICAgICByZXR1cm4gZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpXG4gICAgICB9XG5cbiAgICAgIGlmKHZhbCA9PT0gdHJ1ZSkge1xuICAgICAgICByZXR1cm4gZWwuc2V0QXR0cmlidXRlKG5hbWUsICcnKVxuICAgICAgfVxuXG4gICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsKVxuICAgIH1cbiAgfSlcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYWx0ci50YWdMaXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGF0dHIgPSBhbHRyX3RhZ3NbYWx0ci50YWdMaXN0W2ldLmF0dHJdKSB7XG4gICAgICBob29rcy5wdXNoKGFsdHIudGFnTGlzdFtpXS5jb25zdHJ1Y3Rvci5jYWxsKGFsdHIsIGVsLCBhdHRyKSlcblxuICAgICAgcmV0dXJuIGhvb2tzXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhvb2tzLmNvbmNhdChhbHRyLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzKSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZ2V0X2VsXG5cbmZ1bmN0aW9uIGdldF9lbChlbCkge1xuICB3aGlsZShlbCAmJiBlbC5fYWx0cl9wbGFjZWhvbGRlcikge1xuICAgIGVsID0gZWwuX2FsdHJfcGxhY2Vob2xkZXJcbiAgfVxuXG4gIHJldHVybiBlbFxufVxuIiwidmFyIHBsYWNlaG9sZGVyID0gcmVxdWlyZSgnLi90YWdzL3BsYWNlaG9sZGVyJylcbiAgLCBjaGlsZHJlbl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvY2hpbGRyZW4nKVxuICAsIGluY2x1ZGVfdGFnID0gcmVxdWlyZSgnLi90YWdzL2luY2x1ZGUnKVxuICAsIHRleHRfdGFnID0gcmVxdWlyZSgnLi90YWdzL3RleHQnKVxuICAsIGh0bWxfdGFnID0gcmVxdWlyZSgnLi90YWdzL2h0bWwnKVxuICAsIHdpdGhfdGFnID0gcmVxdWlyZSgnLi90YWdzL3dpdGgnKVxuICAsIGZvcl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvZm9yJylcbiAgLCBpZl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaWYnKVxuICAsIGFsdHIgPSByZXF1aXJlKCcuL2FsdHInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcblxuYWx0ci5hZGRUYWcoJ2FsdHItcGxhY2Vob2xkZXInLCBwbGFjZWhvbGRlcilcbmFsdHIuYWRkVGFnKCdhbHRyLWNoaWxkcmVuJywgY2hpbGRyZW5fdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItcmVwbGFjZScsIHBsYWNlaG9sZGVyKVxuYWx0ci5hZGRUYWcoJ2FsdHItaW5jbHVkZScsIGluY2x1ZGVfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItdGV4dCcsIHRleHRfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItaHRtbCcsIGh0bWxfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItd2l0aCcsIHdpdGhfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItZm9yJywgZm9yX3RhZylcbmFsdHIuYWRkVGFnKCdhbHRyLWlmJywgaWZfdGFnKVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRcblxuZnVuY3Rpb24gaW5zZXJ0KHBhcmVudCwgZWwsIGJlZm9yZSkge1xuICB2YXIgaW5zZXJ0ZWQgPSBlbC5wYXJlbnROb2RlICE9PSBwYXJlbnRcblxuICBiZWZvcmUgPSBiZWZvcmUgfHwgbnVsbFxuXG4gIGlmKGluc2VydGVkIHx8IGVsLm5leHRTaWJsaW5nICE9PSBiZWZvcmUpIHtcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGVsLCBiZWZvcmUpXG4gIH1cblxuICBpZihpbnNlcnRlZCkge1xuICAgIHRoaXMuZW1pdCgnaW5zZXJ0JywgZWwsIHBhcmVudClcbiAgfVxufVxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcblxuZnVuY3Rpb24gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG4gIHZhciByYWYgPSBnbG9iYWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB0aW1lb3V0XG5cbiAgcmV0dXJuIHJhZihjYWxsYmFjaylcblxuICBmdW5jdGlvbiB0aW1lb3V0KGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MClcbiAgfVxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlXG5cbmZ1bmN0aW9uIHJlbW92ZShwYXJlbnQsIGVsKSB7XG4gIHBhcmVudC5yZW1vdmVDaGlsZChlbClcbiAgdGhpcy5lbWl0KCdyZW1vdmUnLCBlbCwgcGFyZW50KVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZW5kZXJcblxuZnVuY3Rpb24gcmVuZGVyKHRlbXBsYXRlLCBzdGF0ZSwgZWwpIHtcbiAgaWYodGhpcy5pbmNsdWRlc1t0ZW1wbGF0ZV0pIHtcbiAgICB0ZW1wbGF0ZSA9IHRoaXMuaW5jbHVkZXNbdGVtcGxhdGVdXG4gIH1cblxuICB2YXIgaW5zdGFuY2UgPSB0aGlzKHRlbXBsYXRlKVxuXG4gIGluc3RhbmNlLnVwZGF0ZShzdGF0ZSB8fCB7fSwgdHJ1ZSlcblxuICBpZihlbCkge1xuICAgIGluc3RhbmNlLmludG8oZWwpXG4gIH1cblxuICByZXR1cm4gaW5zdGFuY2Vcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVwbGFjZVxuXG5mdW5jdGlvbiByZXBsYWNlKHBhcmVudCwgZWwsIG9sZCkge1xuICBwYXJlbnQucmVwbGFjZUNoaWxkKGVsLCBvbGQpXG4gIHRoaXMuZW1pdCgncmVwbGFjZScsIGVsLCBvbGQsIHBhcmVudClcbiAgdGhpcy5lbWl0KCdpbnNlcnQnLCBlbCwgcGFyZW50KVxuICB0aGlzLmVtaXQoJ3JlbW92ZScsIG9sZCwgcGFyZW50KVxufVxuIiwidmFyIGdldCA9IHJlcXVpcmUoJy4vZ2V0X2VsZW1lbnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldF9jaGlsZHJlblxuXG5mdW5jdGlvbiBzZXRfY2hpbGRyZW4ocm9vdCwgbm9kZXMpIHtcbiAgdmFyIHByZXYgPSBudWxsXG4gICAgLCBlbFxuXG4gIGZvcih2YXIgaSA9IG5vZGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgZWwgPSBnZXQobm9kZXNbaV0pXG4gICAgdGhpcy5pbnNlcnQocm9vdCwgZWwsIHByZXYpXG4gICAgcHJldiA9IGVsXG4gIH1cblxuICB3aGlsZSgoZWwgPSByb290LmZpcnN0Q2hpbGQpICE9PSBwcmV2KSB7XG4gICAgdGhpcy5yZW1vdmUocm9vdCwgZWwpXG4gIH1cbn1cbiIsInZhciBzZXRfY2hpbGRyZW4gPSByZXF1aXJlKCcuLi9zZXRfY2hpbGRyZW4nKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNoaWxkcmVuXG5cbmZ1bmN0aW9uIGNoaWxkcmVuKGVsLCBhY2Nlc3Nvcikge1xuICB2YXIgY3VycmVudCA9IFtdXG5cbiAgZWwuaW5uZXJIVE1MID0gJydcblxuICByZXR1cm4gdGhpcy5iYXRjaC5hZGQodGhpcy5jcmVhdGVBY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlLmJpbmQodGhpcykpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICB2YXIgbm9kZXMgPSAoQXJyYXkuaXNBcnJheSh2YWwpID8gdmFsIDogW3ZhbF0pLmZpbHRlcihpc19ub2RlKVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYobm9kZXNbaV0gIT09IGN1cnJlbnRbaV0pIHtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSBub2Rlcy5sZW5ndGggPT09IGN1cnJlbnQubGVuZ3RoKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjdXJyZW50ID0gbm9kZXNcbiAgICBzZXRfY2hpbGRyZW4uY2FsbCh0aGlzLCBlbCwgY3VycmVudClcbiAgfVxufVxuXG5mdW5jdGlvbiBpc19ub2RlKGVsKSB7XG4gIHJldHVybiBlbCAmJiBlbC5ub2RlVHlwZVxufVxuIiwidmFyIHNldF9jaGlsZHJlbiA9IHJlcXVpcmUoJy4uL3NldF9jaGlsZHJlbicpXG4gICwgZm9yX3JlZ2V4cCA9IC9eKC4qPylcXHMraW5cXHMrKC4qJCkvXG5cbm1vZHVsZS5leHBvcnRzID0gZm9yX2hhbmRsZXJcblxuZnVuY3Rpb24gZm9yX2hhbmRsZXIocm9vdCwgYXJncykge1xuICB2YXIgcGFydHMgPSBhcmdzLm1hdGNoKGZvcl9yZWdleHApXG4gICAgLCB0ZW1wbGF0ZSA9IHJvb3QuaW5uZXJIVE1MXG4gICAgLCBkb21fbm9kZXMgPSBbXVxuICAgICwgY2hpbGRyZW4gPSBbXVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGl0ZW1zID0gW11cblxuICBpZighcGFydHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgZm9yIHRhZzogJyArIGFyZ3MpXG4gIH1cblxuICByb290LmlubmVySFRNTCA9ICcnXG5cbiAgdmFyIHVuaXF1ZSA9IHBhcnRzWzFdLnNwbGl0KCc6JylbMV1cbiAgICAsIHByb3AgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzBdXG4gICAgLCBrZXkgPSBwYXJ0c1syXVxuXG4gIHZhciBydW5fdXBkYXRlcyA9IHRoaXMuYmF0Y2guYWRkKHJ1bl9kb21fdXBkYXRlcylcblxuICByZXR1cm4gYWx0ci5jcmVhdGVBY2Nlc3NvcihrZXksIHVwZGF0ZSlcblxuICBmdW5jdGlvbiB1cGRhdGVfY2hpbGRyZW4oZGF0YSkge1xuICAgIHZhciBpdGVtX2RhdGFcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGl0ZW1fZGF0YSA9IE9iamVjdC5jcmVhdGUoZGF0YSlcbiAgICAgIGl0ZW1fZGF0YVtwcm9wXSA9IGl0ZW1zW2ldXG4gICAgICBpdGVtX2RhdGFbJyRpbmRleCddID0gaVxuXG4gICAgICBjaGlsZHJlbltpXS51cGRhdGUgJiYgY2hpbGRyZW5baV0udXBkYXRlKGl0ZW1fZGF0YSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUobmV3X2l0ZW1zLCBkYXRhKSB7XG4gICAgaWYoIUFycmF5LmlzQXJyYXkobmV3X2l0ZW1zKSkge1xuICAgICAgbmV3X2l0ZW1zID0gW11cbiAgICB9XG5cbiAgICB2YXIgbmV3X2NoaWxkcmVuID0gbmV3IEFycmF5KG5ld19pdGVtcy5sZW5ndGgpXG4gICAgICAsIGluZGV4XG5cbiAgICBkb21fbm9kZXMgPSBbXVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5ld19pdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGluZGV4ID0gZmluZF9pbmRleChpdGVtcywgbmV3X2l0ZW1zW2ldLCB1bmlxdWUpXG5cbiAgICAgIGlmKGluZGV4ICE9PSAtMSkge1xuICAgICAgICBuZXdfY2hpbGRyZW5baV0gPSBjaGlsZHJlbltpbmRleF1cbiAgICAgICAgaXRlbXNbaW5kZXhdID0ge31cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IG1ha2VfY2hpbGRyZW4oKVxuICAgICAgfVxuXG4gICAgICBkb21fbm9kZXMgPSBkb21fbm9kZXMuY29uY2F0KG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgfVxuXG4gICAgY2hpbGRyZW4gPSBuZXdfY2hpbGRyZW4uc2xpY2UoKVxuICAgIGl0ZW1zID0gbmV3X2l0ZW1zLnNsaWNlKClcbiAgICBydW5fdXBkYXRlcy5jYWxsKGFsdHIpXG4gICAgdXBkYXRlX2NoaWxkcmVuKGRhdGEpXG4gIH1cblxuICBmdW5jdGlvbiBmaW5kX2luZGV4KGl0ZW1zLCBkLCB1bmlxdWUpIHtcbiAgICBpZighdW5pcXVlKSB7XG4gICAgICByZXR1cm4gaXRlbXMuaW5kZXhPZihkKVxuICAgIH1cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGlmKGl0ZW1zW2ldW3VuaXF1ZV0gPT09IGRbdW5pcXVlXSkge1xuICAgICAgICByZXR1cm4gaVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZV9jaGlsZHJlbigpIHtcbiAgICB2YXIgdGVtcCA9IGFsdHIuZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHJvb3QubmFtZXNwYWNlVVJJLCAnZGl2JylcbiAgICAgICwgZG9tX25vZGVzXG4gICAgICAsIHVwZGF0ZVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSB0ZW1wbGF0ZVxuXG4gICAgZG9tX25vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGVtcC5jaGlsZE5vZGVzKVxuICAgIHVwZGF0ZSA9IGFsdHIudXBkYXRlTm9kZXMoZG9tX25vZGVzKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZG9tX25vZGVzOiBkb21fbm9kZXNcbiAgICAgICwgdXBkYXRlOiB1cGRhdGVcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBydW5fZG9tX3VwZGF0ZXMoKSB7XG4gICAgc2V0X2NoaWxkcmVuLmNhbGwodGhpcywgcm9vdCwgZG9tX25vZGVzKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGh0bWxcblxuZnVuY3Rpb24gaHRtbChlbCwgYWNjZXNzb3IpIHtcbiAgcmV0dXJuIHRoaXMuYmF0Y2guYWRkKHRoaXMuY3JlYXRlQWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLmlubmVySFRNTCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcblxuICAgIGlmKGVsLmdldEF0dHJpYnV0ZSgnYWx0ci1ydW4tc2NyaXB0cycpKSB7XG4gICAgICBbXS5mb3JFYWNoLmNhbGwoZWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpLCBydW4pXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHJ1bihzY3JpcHQpIHtcbiAgdmFyIGZpeGVkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0JylcbiAgICAsIHBhcmVudCA9IHNjcmlwdC5wYXJlbnROb2RlXG4gICAgLCBhdHRycyA9IHNjcmlwdC5hdHRyaWJ1dGVzXG4gICAgLCBzcmNcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYXR0cnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgZml4ZWQuc2V0QXR0cmlidXRlKGF0dHJzW2ldLm5hbWUsIGF0dHJzW2ldLnZhbHVlKVxuICB9XG5cbiAgZml4ZWQudGV4dENvbnRlbnQgPSBzY3JpcHQudGV4dENvbnRlbnRcbiAgcGFyZW50Lmluc2VydEJlZm9yZShmaXhlZCwgc2NyaXB0KVxuICBwYXJlbnQucmVtb3ZlQ2hpbGQoc2NyaXB0KVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpZl90YWdcblxuZnVuY3Rpb24gaWZfdGFnKGVsLCBhY2Nlc3Nvcikge1xuICB2YXIgcGxhY2Vob2xkZXIgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ2FsdHItaWYtcGxhY2Vob2xkZXInKVxuICAgICwgdXBkYXRlX2NoaWxkcmVuID0gdGhpcy51cGRhdGVOb2RlcyhlbC5jaGlsZE5vZGVzKVxuICAgICwgaGlkZGVuID0gbnVsbFxuICAgICwgYWx0ciA9IHRoaXNcblxuICB2YXIgaGlkZSA9IHRoaXMuYmF0Y2guYWRkKGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXJlbnQgPSBlbC5wYXJlbnROb2RlXG5cbiAgICBpZighaGlkZGVuKSB7XG4gICAgICBhbHRyLnJlcGxhY2UoZWwucGFyZW50Tm9kZSwgcGxhY2Vob2xkZXIsIGVsKVxuICAgICAgZWwuX2FsdHJfcGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlclxuICAgICAgaGlkZGVuID0gdHJ1ZVxuICAgIH1cbiAgfSlcblxuICB2YXIgc2hvdyA9IHRoaXMuYmF0Y2guYWRkKGZ1bmN0aW9uKCkge1xuICAgIGlmKGhpZGRlbikge1xuICAgICAgYWx0ci5yZXBsYWNlKHBsYWNlaG9sZGVyLnBhcmVudE5vZGUsIGVsLCBwbGFjZWhvbGRlcilcbiAgICAgIGRlbGV0ZSBlbC5fYWx0cl9wbGFjZWhvbGRlclxuICAgICAgaGlkZGVuID0gZmFsc2VcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlQWNjZXNzb3IoYWNjZXNzb3IsIHRvZ2dsZSlcblxuICBmdW5jdGlvbiB0b2dnbGUodmFsLCBkYXRhKSB7XG4gICAgaWYoIXZhbCkge1xuICAgICAgcmV0dXJuIGhpZGUoKVxuICAgIH1cblxuICAgIHNob3coKVxuICAgIHVwZGF0ZV9jaGlsZHJlbiAmJiB1cGRhdGVfY2hpbGRyZW4oZGF0YSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmNsdWRlXG5cbmZ1bmN0aW9uIGluY2x1ZGUoZWwsIG5hbWUpIHtcbiAgZWwuaW5uZXJIVE1MID0gdGhpcy5pbmNsdWRlc1tuYW1lXVxuXG4gIHJldHVybiB0aGlzLnVwZGF0ZU5vZGVzKGVsLmNoaWxkTm9kZXMpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHBsYWNlaG9sZGVyXG5cbmZ1bmN0aW9uIHBsYWNlaG9sZGVyKG9yaWdpbmFsLCBhY2Nlc3Nvcikge1xuICB2YXIgY3VycmVudCA9IG9yaWdpbmFsXG4gICAgLCBhbHRyID0gdGhpc1xuXG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZUFjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBpZighdmFsIHx8ICF2YWwubm9kZU5hbWUgfHwgdmFsID09PSBjdXJyZW50KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBhbHRyLnJlcGxhY2UoY3VycmVudC5wYXJlbnROb2RlLCB2YWwsIGN1cnJlbnQpXG4gICAgb3JpZ2luYWwuX2FsdHJfcGxhY2Vob2xkZXIgPSB2YWxcbiAgICBjdXJyZW50ID0gdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdGV4dFxuXG5mdW5jdGlvbiB0ZXh0KGVsLCBhY2Nlc3Nvcikge1xuICByZXR1cm4gdGhpcy5iYXRjaC5hZGQodGhpcy5jcmVhdGVBY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gd2l0aF90YWdcblxuZnVuY3Rpb24gd2l0aF90YWcoZWwsIGFjY2Vzc29yKSB7XG4gIHZhciB1cGRhdGUgPSB0aGlzLnVwZGF0ZU5vZGVzKGVsLmNoaWxkTm9kZXMpXG5cbiAgcmV0dXJuIHVwZGF0ZSA/IHRoaXMuY3JlYXRlQWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkgOiBudWxsXG59XG4iLCJ2YXIgVEFHID0gL3t7XFxzKiguKj8pXFxzKn19L1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlX3N0cmluZ1xuXG5mdW5jdGlvbiB0ZW1wbGF0ZV9zdHJpbmcodGVtcGxhdGUsIGNoYW5nZSkge1xuICBpZighdGVtcGxhdGUubWF0Y2goVEFHKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRlbXBsYXRlXG4gICAgLCBwYXJ0cyA9IFtdXG4gICAgLCBob29rcyA9IFtdXG4gICAgLCB0aW1lclxuICAgICwgaW5kZXhcbiAgICAsIG5leHRcblxuICB3aGlsZShyZW1haW5pbmcgJiYgKG5leHQgPSByZW1haW5pbmcubWF0Y2goVEFHKSkpIHtcbiAgICBpZihpbmRleCA9IHJlbWFpbmluZy5pbmRleE9mKG5leHRbMF0pKSB7XG4gICAgICBwYXJ0cy5wdXNoKHJlbWFpbmluZy5zbGljZSgwLCBpbmRleCkpXG4gICAgfVxuXG4gICAgcGFydHMucHVzaCgnJylcbiAgICByZW1haW5pbmcgPSByZW1haW5pbmcuc2xpY2UoaW5kZXggKyBuZXh0WzBdLmxlbmd0aClcbiAgICBob29rcy5wdXNoKFxuICAgICAgICB0aGlzLmNyZWF0ZUFjY2Vzc29yKG5leHRbMV0sIHNldF9wYXJ0LmJpbmQodGhpcywgcGFydHMubGVuZ3RoIC0gMSkpXG4gICAgKVxuICB9XG5cbiAgcGFydHMucHVzaChyZW1haW5pbmcpXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHNldF9wYXJ0KGlkeCwgdmFsKSB7XG4gICAgcGFydHNbaWR4XSA9IHZhbFxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICBob29rKGRhdGEpXG4gICAgfSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbml0X3RleHRfbm9kZVxuXG5mdW5jdGlvbiBpbml0X3RleHRfbm9kZShlbCkge1xuICB2YXIgaG9vayA9IHRoaXMudGVtcGxhdGVTdHJpbmcoZWwudGV4dENvbnRlbnQsIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSkpXG5cbiAgcmV0dXJuIGhvb2sgPyBbaG9va10gOiBudWxsXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdG9TdHJpbmdcblxuZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gIHJldHVybiB0aGlzLnJvb3ROb2RlcygpLm1hcChmdW5jdGlvbihub2RlKSB7XG4gICAgc3dpdGNoKG5vZGUubm9kZVR5cGUpIHtcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFOlxuICAgICAgY2FzZSB0aGlzLmRvY3VtZW50LkNPTU1FTlRfTk9ERTogcmV0dXJuIGNsb25lLmNhbGwodGhpcywgbm9kZSlcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5URVhUX05PREU6IHJldHVybiBub2RlLnRleHRDb250ZW50XG4gICAgICBkZWZhdWx0OiByZXR1cm4gbm9kZS5vdXRlckhUTUxcbiAgICB9XG4gIH0sIHRoaXMpLmpvaW4oJycpXG5cbiAgZnVuY3Rpb24gY2xvbmUobm9kZSkge1xuICAgIHZhciB0ZW1wID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXG4gICAgdGVtcC5hcHBlbmRDaGlsZChub2RlLmNsb25lTm9kZSgpKVxuXG4gICAgcmV0dXJuIHRlbXAuaW5uZXJIVE1MXG4gIH1cbn1cbiIsInZhciBhZGRfb3BlcmF0b3JzID0gcmVxdWlyZSgnLi9saWIvb3BlcmF0b3JzJylcbiAgLCBjcmVhdGVfYWNjZXNvciA9IHJlcXVpcmUoJy4vbGliL2NyZWF0ZScpXG4gICwgYWRkX2ZpbHRlcnMgPSByZXF1aXJlKCcuL2xpYi9maWx0ZXInKVxuICAsIGFkZF9sb29rdXAgPSByZXF1aXJlKCcuL2xpYi9sb29rdXAnKVxuICAsIGFkZF9wYXJlbnMgPSByZXF1aXJlKCcuL2xpYi9wYXJlbnMnKVxuICAsIGNyZWF0ZV9saXN0ID0gcmVxdWlyZSgnLi9saWIvbGlzdCcpXG4gICwgZGVib3VuY2UgPSByZXF1aXJlKCdqdXN0LWRlYm91bmNlJylcbiAgLCBhZGRfdHlwZXMgPSByZXF1aXJlKCcuL2xpYi90eXBlcycpXG4gICwgYWRkX2Fycm93ID0gcmVxdWlyZSgnLi9saWIvYXJyb3cnKVxuICAsIHNwbGl0ID0gcmVxdWlyZSgnLi9saWIvc3BsaXQnKVxuICAsIHR5cGVzID0gW11cblxubW9kdWxlLmV4cG9ydHMgPSBhY2Nlc3NvcnNcblxuLy8gb3JkZXIgaXMgaW1wb3J0YW50XG5hZGRfdHlwZXModHlwZXMpXG5hZGRfYXJyb3codHlwZXMpXG5hZGRfZmlsdGVycyh0eXBlcylcbmFkZF9wYXJlbnModHlwZXMpXG5hZGRfb3BlcmF0b3JzKHR5cGVzKVxuYWRkX2xvb2t1cCh0eXBlcylcblxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGVQYXJ0ID0gY3JlYXRlX2FjY2Vzb3JcbmFjY2Vzc29ycy5wcm90b3R5cGUuY3JlYXRlUGFydHMgPSBjcmVhdGVfbGlzdFxuYWNjZXNzb3JzLnByb3RvdHlwZS5hZGRGaWx0ZXIgPSBhZGRfZmlsdGVyXG5hY2Nlc3NvcnMucHJvdG90eXBlLmNyZWF0ZSA9IGNyZWF0ZVxuYWNjZXNzb3JzLnByb3RvdHlwZS50eXBlcyA9IHR5cGVzXG5hY2Nlc3NvcnMucHJvdG90eXBlLnNwbGl0ID0gc3BsaXRcblxuZnVuY3Rpb24gYWNjZXNzb3JzKGZpbHRlcnMsIGRlbGF5KSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIGFjY2Vzc29ycykpIHtcbiAgICByZXR1cm4gbmV3IGFjY2Vzc29ycyhmaWx0ZXJzLCBkZWxheSlcbiAgfVxuXG4gIGlmKCFkZWxheSAmJiBkZWxheSAhPT0gZmFsc2UpIHtcbiAgICBkZWxheSA9IDBcbiAgfVxuXG4gIHRoaXMuZGVsYXkgPSBkZWxheVxuICB0aGlzLmZpbHRlcnMgPSBmaWx0ZXJzIHx8IHt9XG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZm4pIHtcbiAgdGhpcy5maWx0ZXJzW25hbWVdID0gZm5cbn1cblxuZnVuY3Rpb24gY3JlYXRlKHN0ciwgY2hhbmdlLCBhbGwpIHtcbiAgdmFyIHBhcnQgPSB0aGlzLmNyZWF0ZVBhcnQoXG4gICAgICBzdHJcbiAgICAsIHRoaXMuZGVsYXkgPT09IGZhbHNlID8gdXBkYXRlIDogZGVib3VuY2UoY2hhbmdlLCB0aGlzLmRlbGF5LCBmYWxzZSwgdHJ1ZSlcbiAgKVxuXG4gIHZhciBzeW5jID0gZmFsc2VcbiAgICAsIHByZXYgPSB7fVxuICAgICwgb3V0XG5cbiAgcmV0dXJuIHdyaXRlXG5cbiAgZnVuY3Rpb24gd3JpdGUoZGF0YSkge1xuICAgIHZhciBfb3V0ID0ge31cblxuICAgIHN5bmMgPSB0cnVlXG4gICAgb3V0ID0gX291dFxuICAgIHBhcnQoZGF0YSlcbiAgICBzeW5jID0gZmFsc2VcblxuICAgIGlmKG91dCAhPT0gX291dCkge1xuICAgICAgY2hhbmdlLmFwcGx5KG51bGwsIG91dClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjdHgpIHtcbiAgICBpZighYWxsICYmIHR5cGVvZiB2YWwgIT09ICdvYmplY3QnICYmIHZhbCA9PT0gcHJldikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgb3V0ID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgcHJldiA9IHZhbFxuXG4gICAgaWYoIXN5bmMpIHtcbiAgICAgIGNoYW5nZS5hcHBseShudWxsLCBvdXQpXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFkZF9hcnJvd1xuXG5mdW5jdGlvbiBhZGRfYXJyb3codHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfYXJyb3cpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9hcnJvdyhwYXJ0cywgY2hhbmdlKSB7XG4gIHBhcnRzID0gdGhpcy5zcGxpdChwYXJ0cywgJy0+JylcblxuICBpZihwYXJ0cy5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgcmlnaHQgPSB0aGlzLmNyZWF0ZVBhcnQocGFydHNbMV0sIGNoYW5nZSlcbiAgICAsIGxlZnQgPSB0aGlzLmNyZWF0ZVBhcnQocGFydHNbMF0sIHVwZGF0ZSlcblxuICByZXR1cm4gbGVmdFxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGN0eCkge1xuICAgIHJpZ2h0KHZhbCwgY3R4KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yXG5cbmZ1bmN0aW9uIGFjY2Vzc29yKGtleSwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0ID0gYnVpbGRfcGFydC5jYWxsKHRoaXMsIGtleSwgZmluaXNoLmJpbmQodGhpcykpXG4gICAgLCBjb250ZXh0XG5cbiAgcmV0dXJuIGNhbGxcblxuICBmdW5jdGlvbiBjYWxsKHZhbCwgY3R4KSB7XG4gICAgcGFydCh2YWwsIGNvbnRleHQgPSBjdHggfHwgdmFsKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluaXNoKHZhbCwgY3R4KSB7XG4gICAgY2hhbmdlLmNhbGwodGhpcywgdmFsLCBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGN0eCA6IGNvbnRleHQpXG4gIH1cbn1cblxuZnVuY3Rpb24gYnVpbGRfcGFydChwYXJ0LCBjaGFuZ2UpIHtcbiAgdmFyIGFjY2Vzc29yXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMudHlwZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYWNjZXNzb3IgPSB0aGlzLnR5cGVzW2ldLmNhbGwodGhpcywgcGFydCwgY2hhbmdlKSkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgZmlsdGVyX3JlZ2V4cCA9IC9eXFxzKihbXlxccyhdKylcXCgoLiopXFwpXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX2ZpbHRlclxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2ZpbHRlcilcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2ZpbHRlcihwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChmaWx0ZXJfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBmaWx0ZXIgPSB0aGlzLmZpbHRlcnNbcGFydHNbMV1dXG4gICAgLCBjb250ZXh0XG5cbiAgaWYoIWZpbHRlcikge1xuICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgZmlsdGVyOiAnICsgcGFydHNbMV0pXG4gIH1cblxuICBmaWx0ZXIgPSBmaWx0ZXIuY2FsbCh0aGlzLCB1cGRhdGUpXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlUGFydHModGhpcy5zcGxpdChwYXJ0c1syXSwgJywnLCBudWxsLCBudWxsLCB0cnVlKSwgcnVuKVxuXG4gIGZ1bmN0aW9uIHJ1bihhcmdzLCBjdHgpIHtcbiAgICBjb250ZXh0ID0gY3R4XG4gICAgZmlsdGVyKGFyZ3MsIGN0eClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGN0eCkge1xuICAgIGNoYW5nZSh2YWwsIGFyZ3VtZW50cy5sZW5ndGggPiAxID8gY3R4IDogY29udGV4dClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfbGlzdFxuXG5mdW5jdGlvbiBjcmVhdGVfbGlzdChwYXJ0cywgY2hhbmdlLCBhbGwpIHtcbiAgdmFyIHVwZGF0aW5nID0gZmFsc2VcbiAgICAsIGNoYW5nZWQgPSBmYWxzZVxuICAgICwgYWNjZXNzb3JzID0gW11cbiAgICAsIHN0YXRlID0gW11cblxuICBpZighcGFydHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZhbCwgY3R4KSB7XG4gICAgICBjaGFuZ2UoW10sIGN0eClcbiAgICB9XG4gIH1cblxuICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgYWNjZXNzb3JzLnB1c2godGhpcy5jcmVhdGVQYXJ0KHBhcnRzW2ldLCB1cGRhdGUuYmluZCh0aGlzLCBpKSkpXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24odmFsLCBjdHgpIHtcbiAgICBjdHggPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGN0eCA6IHZhbFxuICAgIGNoYW5nZWQgPSBmYWxzZVxuICAgIHVwZGF0aW5nID0gdHJ1ZVxuICAgIGdldF9wYXJ0cyh2YWwsIGN0eClcbiAgICB1cGRhdGluZyA9IGZhbHNlXG5cbiAgICBpZighYWxsICYmIGNoYW5nZWQpIHtcbiAgICAgIGNoYW5nZShzdGF0ZSwgY3R4KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShpbmRleCwgdmFsLCBjdHgpIHtcbiAgICBzdGF0ZVtpbmRleF0gPSB2YWxcbiAgICBjaGFuZ2VkID0gdHJ1ZVxuXG4gICAgaWYoYWxsIHx8ICF1cGRhdGluZykge1xuICAgICAgY2hhbmdlKHN0YXRlLCBjdHgpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X3BhcnRzKHZhbCwgY3R4KSB7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGFjY2Vzc29ycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGFjY2Vzc29yc1tpXSh2YWwsIGN0eClcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWRkX2xvb2t1cFxuXG5mdW5jdGlvbiBhZGRfbG9va3VwKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2xvb2t1cClcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2xvb2t1cChwYXRoLCBjaGFuZ2UpIHtcbiAgaWYoIXBhdGguaW5kZXhPZignJGRhdGEnKSkge1xuICAgIHBhdGggPSBwYXRoLnNsaWNlKCckZGF0YS4nLmxlbmd0aClcblxuICAgIGlmKCFwYXRoKSB7XG4gICAgICByZXR1cm4gY2hhbmdlXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGxvb2t1cChwYXRoLm1hdGNoKC9cXHMqKC4qW15cXHNdKVxccyovKVsxXSwgY2hhbmdlKVxufVxuXG5mdW5jdGlvbiBsb29rdXAocGF0aCwgZG9uZSkge1xuICB2YXIgcGFydHMgPSBwYXRoID8gcGF0aC5zcGxpdCgnLicpIDogW11cblxuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBjdHgpIHtcbiAgICB2YXIgcmVzdWx0ID0gc2VhcmNoKG9iaiwgcGFydHMpXG5cbiAgICBpZih0eXBlb2YgcmVzdWx0ID09PSAndW5kZWZpbmVkJyAmJiBjdHgpIHtcbiAgICAgIHJlc3VsdCA9IHNlYXJjaChjdHgsIHBhcnRzKVxuICAgIH1cblxuICAgIGRvbmUocmVzdWx0LCBjdHgpXG4gIH1cbn1cblxuZnVuY3Rpb24gc2VhcmNoKG9iaiwgcGFydHMpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgb2JqICYmIGkgPCBsOyArK2kpIHtcbiAgICBvYmogPSBvYmpbcGFydHNbaV1dXG4gIH1cblxuICBpZihpID09PSBsKSB7XG4gICAgcmV0dXJuIG9ialxuICB9XG59XG4iLCJ2YXIgdGVybmFyeV9yZWdleHAgPSAvXlxccyooLis/KVxccypcXD8oLiopXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX29wZXJhdG9yc1xuXG5mdW5jdGlvbiBhZGRfb3BlcmF0b3JzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3Rlcm5hcnkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfFxcXFx8J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ3wnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnXiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJz09PScsICchPT0nLCAnPT0nLCAnIT0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPj0nLCAnPD0nLCAnPicsICc8JywgJyBpbiAnLCAnIGluc3RhbmNlb2YgJ10pKVxuICAvLyB0eXBlcy5wdXNoKGJpbmFyeShbJzw8JywgJz4+JywgJz4+PiddKSkgLy9jb25mbGljcyB3aXRoIDwgYW5kID5cbiAgdHlwZXMucHVzaChiaW5hcnkoWycrJywgJy0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnKicsICcvJywgJyUnXSkpXG4gIHR5cGVzLnB1c2godW5hcnkoWychJywgJysnLCAnLScsICd+J10pKVxufVxuXG5mdW5jdGlvbiBiaW5hcnkobGlzdCkge1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFxuICAgICAgJ15cXFxccyooLis/KVxcXFxzXFwqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV9iaW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1bmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKihcXFxcJyArXG4gICAgICBsaXN0LmpvaW4oJ3xcXFxcJykgK1xuICAgICAgJylcXFxccyooLis/KVxcXFxzKiQnXG4gIClcblxuICByZXR1cm4gZnVuY3Rpb24ocGFydHMsIGNoYW5nZSkge1xuICAgIHJldHVybiBjcmVhdGVfdW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdGVybmFyeShwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaCh0ZXJuYXJ5X3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY29uZGl0aW9uID0gcGFydHNbMV1cbiAgICAsIHJlc3QgPSBwYXJ0c1syXVxuICAgICwgY291bnQgPSAxXG5cbiAgcmVzdCA9IHRoaXMuc3BsaXQocmVzdCwgJzonLCBbWyc/JywgJzonXSwgWycoJywgJyknXV0pXG5cbiAgaWYocmVzdC5sZW5ndGggIT09IDIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCB0ZXJuYXJ5OiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgbm90ID0gdGhpcy5jcmVhdGVQYXJ0KHJlc3RbMV0sIGNoYW5nZSlcbiAgICAsIG9rID0gdGhpcy5jcmVhdGVQYXJ0KHJlc3RbMF0sIGNoYW5nZSlcblxuICByZXR1cm4gdGhpcy5jcmVhdGVQYXJ0KGNvbmRpdGlvbiwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdmFsID8gb2soY29udGV4dCkgOiBub3QoY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYmluYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hlY2tfbGhzID0gdGhpcy5jcmVhdGVQYXJ0KHBhcnRzWzFdLCB1cGRhdGUuYmluZChudWxsLCBmYWxzZSkpXG4gICAgLCBjaGVja19yaHMgPSB0aGlzLmNyZWF0ZVBhcnQocGFydHNbM10sIHVwZGF0ZS5iaW5kKG51bGwsIHRydWUpKVxuICAgICwgdW5zZXQgPSB7fVxuXG4gIHZhciBsaHMgPSB1bnNldFxuICAgICwgcmhzID0gdW5zZXRcblxuICB2YXIgY2hhbmdlZCA9IEZ1bmN0aW9uKFxuICAgICAgJ2NoYW5nZSwgbGhzLCByaHMnXG4gICAgLCAncmV0dXJuIGNoYW5nZShsaHMgJyArIHBhcnRzWzJdICsgJyByaHMpJ1xuICApLmJpbmQobnVsbCwgY2hhbmdlKVxuXG4gIHJldHVybiBvbl9kYXRhXG5cbiAgZnVuY3Rpb24gb25fZGF0YShkYXRhLCBjdHgpIHtcbiAgICBjaGVja19saHMoZGF0YSwgY3R4KVxuICAgIGNoZWNrX3JocyhkYXRhLCBjdHgpXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoaXNfcmhzLCB2YWwpIHtcbiAgICBpc19yaHMgPyByaHMgPSB2YWwgOiBsaHMgPSB2YWxcblxuICAgIGlmKGxocyA9PT0gdW5zZXQgfHwgcmhzID09PSB1bnNldCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY2hhbmdlZChsaHMsIHJocylcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdW5hcnkocmVnZXgsIHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHJlZ2V4KSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCB2YWwnXG4gICAgLCAncmV0dXJuIGNoYW5nZSgnICsgcGFydHNbMV0gKyAndmFsKSdcbiAgKS5iaW5kKG51bGwsIGNoYW5nZSlcblxuICByZXR1cm4gdGhpcy5jcmVhdGVQYXJ0KHBhcnRzWzJdLCBjaGFuZ2VkKVxufVxuIiwidmFyIHBhcmVuc19yZWdleHAgPSAvXlxccypcXCgoLiopJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfcGFyZW5zXG5cbmZ1bmN0aW9uIGFkZF9wYXJlbnModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfcGFyZW5zKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfcGFyZW5zKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHBhcmVuc19yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGJvZHkgPSBwYXJ0c1sxXVxuICAgICwgY291bnQgPSAxXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGJvZHkubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYm9keVtpXSA9PT0gJyknKSB7XG4gICAgICAtLWNvdW50XG4gICAgfSBlbHNlIGlmKGJvZHlbaV0gPT09ICcoJykge1xuICAgICAgKytjb3VudFxuICAgIH1cblxuICAgIGlmKCFjb3VudCkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZighaSB8fCBpID09PSBsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgcGFyZW5zOiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgY29udGVudCA9ICB0aGlzLmNyZWF0ZVBhcnQoYm9keS5zbGljZSgwLCBpKSwgdXBkYXRlKVxuICAgICwga2V5ID0gJ3BhcmVuXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyKVxuXG4gIHZhciB0ZW1wbGF0ZSA9IHRoaXMuY3JlYXRlUGFydChrZXkgKyBib2R5LnNsaWNlKGkgKyAxKSwgY2hhbmdlKVxuXG4gIHJldHVybiBjb250ZW50XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgX2NvbnRleHQpIHtcbiAgICB2YXIgY29udGV4dCA9IE9iamVjdC5jcmVhdGUodHlwZW9mIF9jb250ZXh0ID09PSAnb2JqZWN0JyA/IF9jb250ZXh0IDogbnVsbClcblxuICAgIGNvbnRleHRba2V5XSA9IHZhbFxuICAgIHRlbXBsYXRlKGNvbnRleHQsIF9jb250ZXh0KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHNwbGl0XG5cbmZ1bmN0aW9uIHNwbGl0KHBhcnRzLCBrZXksIF9wYWlycywgYWxsKSB7XG4gIHZhciBwYWlycyA9IFtbJygnLCAnKSddXVxuICAgICwgbGF5ZXJzID0gW11cblxuICBwYWlycyA9IF9wYWlycyB8fCBwYWlyc1xuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZighbGF5ZXJzLmxlbmd0aCkge1xuICAgICAgZm9yKHZhciBqID0gMCwgbDIgPSBrZXkubGVuZ3RoOyBqIDwgbDI7ICsraikge1xuICAgICAgICBpZihwYXJ0c1tpICsgal0gIT09IGtleVtqXSkge1xuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYoaiA9PT0ga2V5Lmxlbmd0aCkge1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGxheWVycy5sZW5ndGggJiYgbGF5ZXJzW2xheWVycy5sZW5ndGggLSAxXSA9PT0gcGFydHNbaV0pIHtcbiAgICAgIGxheWVycy5wb3AoKVxuXG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGZvcih2YXIgaiA9IDAsIGwyID0gcGFpcnMubGVuZ3RoOyBqIDwgbDI7ICsraikge1xuICAgICAgaWYocGFydHNbaV0gPT09IHBhaXJzW2pdWzBdKSB7XG4gICAgICAgIGxheWVycy5wdXNoKHBhaXJzW2pdWzFdKVxuXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYobGF5ZXJzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdVbm1hdGNoZWQgcGFpciBpbiAnICsgcGFydHMgKyAnLiBleHBlY3Rpbmc6ICcgKyBsYXllcnMucG9wKClcbiAgICApXG4gIH1cblxuICBpZihpID09PSBwYXJ0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gW3BhcnRzXVxuICB9XG5cbiAgdmFyIHJpZ2h0ID0gcGFydHMuc2xpY2UoaSArIGtleS5sZW5ndGgpXG4gICAgLCBsZWZ0ID0gcGFydHMuc2xpY2UoMCwgaSlcblxuICBpZighYWxsKSB7XG4gICAgcmV0dXJuIFtsZWZ0LCByaWdodF1cbiAgfVxuXG4gIHJldHVybiBbbGVmdF0uY29uY2F0KHNwbGl0KHJpZ2h0LCBrZXksIHBhaXJzLCBhbGwpKVxufVxuIiwidmFyIHN0cmluZ19yZWdleHAgPSAvXlxccyooPzonKCg/OlteJ1xcXFxdfCg/OlxcXFwuKSkqKSd8XCIoKD86W15cIlxcXFxdfCg/OlxcXFwuKSkqKVwiKVxccyokL1xuICAsIG51bWJlcl9yZWdleHAgPSAvXlxccyooXFxkKig/OlxcLlxcZCspPylcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfdHlwZXNcblxuZnVuY3Rpb24gYWRkX3R5cGVzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3N0cmluZ19hY2Nlc3NvcilcbiAgdHlwZXMucHVzaChjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHN0cmluZ19yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHZhbCA9IHBhcnRzWzFdIHx8IHBhcnRzWzJdIHx8ICcnXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGlnbm9yZSwgY29udGV4dCkge1xuICAgIGNoYW5nZSh2YWwsIGNvbnRleHQpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX251bWJlcl9hY2Nlc3NvcihwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChudW1iZXJfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciB2YWwgPSArcGFydHNbMV1cblxuICByZXR1cm4gZnVuY3Rpb24oaWdub3JlLCBjb250ZXh0KSB7XG4gICAgY2hhbmdlKHZhbCwgY29udGV4dClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZVxuXG5mdW5jdGlvbiBkZWJvdW5jZShmbiwgZGVsYXksIGF0X3N0YXJ0LCBndWFyYW50ZWUpIHtcbiAgdmFyIHRpbWVvdXRcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuXG4gICAgaWYodGltZW91dCAmJiAoYXRfc3RhcnQgfHwgZ3VhcmFudGVlKSkge1xuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIGlmKCFhdF9zdGFydCkge1xuICAgICAgY2xlYXIoKVxuXG4gICAgICByZXR1cm4gdGltZW91dCA9IHNldFRpbWVvdXQocnVuLCBkZWxheSlcbiAgICB9XG5cbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhciwgZGVsYXkpXG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcblxuICAgIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICAgIGNsZWFyKClcbiAgICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dClcbiAgICAgIHRpbWVvdXQgPSBudWxsXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEJhdGNoXG5cbmZ1bmN0aW9uIEJhdGNoKHJlYWR5LCBhbGwpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgQmF0Y2gpKSB7XG4gICAgcmV0dXJuIG5ldyBCYXRjaChyZWFkeSwgYWxsKVxuICB9XG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5hbGwgPSBhbGxcbiAgdGhpcy5yZWFkeSA9IHJlYWR5XG4gIHRoaXMucXVldWQgPSBmYWxzZVxuICB0aGlzLnJ1biA9IHRoaXMucnVuLmJpbmQodGhpcylcbn1cblxuQmF0Y2gucHJvdG90eXBlLnF1ZXVlID0gcXVldWVcbkJhdGNoLnByb3RvdHlwZS5hZGQgPSBhZGRcbkJhdGNoLnByb3RvdHlwZS5ydW4gPSBydW5cblxuZnVuY3Rpb24gYWRkKGZuKSB7XG4gIHZhciBxdWV1ZWQgPSBmYWxzZVxuICAgICwgYmF0Y2ggPSB0aGlzXG4gICAgLCBzZWxmXG4gICAgLCBhcmdzXG5cbiAgcmV0dXJuIHF1ZXVlXG5cbiAgZnVuY3Rpb24gcXVldWUoKSB7XG4gICAgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHNlbGYgPSB0aGlzXG5cbiAgICBpZihxdWV1ZWQpIHtcbiAgICAgIHJldHVybiBiYXRjaC5hbGwgJiYgYmF0Y2gucmVhZHkoKVxuICAgIH1cblxuICAgIHF1ZXVlZCA9IHRydWVcbiAgICBiYXRjaC5xdWV1ZShydW4pXG4gIH1cblxuICBmdW5jdGlvbiBydW4oKSB7XG4gICAgcXVldWVkID0gZmFsc2VcbiAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXVlKGZuKSB7XG4gIHRoaXMuam9icy5wdXNoKGZuKVxuXG4gIGlmKHRoaXMuYWxsIHx8ICF0aGlzLnF1ZXVlZCkge1xuICAgIHRoaXMucXVldWVkID0gdHJ1ZVxuICAgIHRoaXMucmVhZHkodGhpcylcbiAgfVxufVxuXG5mdW5jdGlvbiBydW4oKSB7XG4gIHZhciBqb2JzID0gdGhpcy5qb2JzXG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5xdWV1ZWQgPSBmYWxzZVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBqb2JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGpvYnNbaV0oKVxuICB9XG5cbiAgcmV0dXJuICEhdGhpcy5qb2JzLmxlbmd0aFxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIl19
