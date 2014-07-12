(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var template_string = require('./template_string')
  , element_node = require('./element_node')
  , accessors = require('altr-accessors')
  , EE = require('events').EventEmitter
  , text_node = require('./text_node')
  , toString = require('./to_string')
  , get_el = require('./get_element')
  , batch = require('batch-queue')
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

  if(!global.window) {
    doc = doc || require(dom_module).document
  }

  EE.call(this)
  this.sync = typeof sync === 'undefined' ? false : sync
  this.root = root
  this.document = doc || global.document || require(dom_module)
  this.filters = Object.create(altr.filters)
  this.includes = Object.create(altr.includes)
  this.accessors = accessors(this.filters, false)
  this.batch = batch((function() {
    this.sync ? this.runBatch() : raf(this.runBatch.bind(this))
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
  this._update(data)

  if(sync) {
    this.batch.run()
  }
}

function update_nodes(nodes) {
  var hooks = this.initNodes(nodes)
    , self = this

  return update

  function update(data) {
    for(var i = 0, l = hooks.length; i < l; ++i) {
      hooks[i].call(self, data)
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
  this.batch.run()
  this.emit('update', this.state)
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./element_node":3,"./get_element":4,"./insert":6,"./raf":7,"./remove":8,"./render":9,"./replace":10,"./template_string":20,"./text_node":21,"./to_string":22,"altr-accessors":23,"batch-queue":33,"events":34}],2:[function(require,module,exports){
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

    if(!name.indexOf('altr-attr-')) {
      name = attr.name.slice('altr-attr-'.length)
      el.removeAttribute(attr.name)
    }

    var attr_hook = altr.templateString(value, altr.batch.add(function(val) {
      el.setAttribute(name, val)
    }))

    if(attr_hook) {
      hooks.push(attr_hook)
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
  return this.batch.add(this.createAccessor(accessor, update.bind(this)))

  function update(val) {
    var nodes = Array.isArray(val) ? val : [val]

    set_children.call(this, el, nodes.filter(is_node))
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
        new_children[i] = (children.splice(index, 1)[0])
        items.splice(index, 1)
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
    update_children(data)
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

function placeholder(el, accessor) {
  var altr = this

  return this.batch.add(this.createAccessor(accessor, update))

  function update(val) {
    if(!val.nodeName) {
      return
    }

    altr.replace(el.parentNode, val, el)
    el._altr_placeholder = val
    el = val
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
  return this.createAccessor(accessor, this.updateNodes(el.childNodes))
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

accessors.prototype.create_part = create_accesor
accessors.prototype.add_filter = add_filter
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
  var part = this.create_part(
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

},{"./lib/arrow":24,"./lib/create":25,"./lib/filter":26,"./lib/lookup":27,"./lib/operators":28,"./lib/parens":29,"./lib/split":30,"./lib/types":31,"just-debounce":32}],24:[function(require,module,exports){
module.exports = add_arrow

function add_arrow(types) {
  types.push(create_arrow)
}

function create_arrow(parts, change) {
  parts = this.split(parts, '->')

  if(parts.length < 2) {
    return
  }

  var right = this.create_part(parts[1], change)
    , left = this.create_part(parts[0], update)

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
    change.call(this, val, typeof ctx === 'undefined' ? ctx : context)
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

  if(!filter) {
    throw new Error('could not find filter: ' + parts[1])
  }

  return filter.call(this, this.split(parts[2], ',', null, null, true), change)
}

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
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

  var not = this.create_part(rest[1], change)
    , ok = this.create_part(rest[0], change)

  return this.create_part(condition, update)

  function update(val, context) {
    return val ? ok(context) : not(context)
  }
}

function create_binary(regex, parts, change) {
  if(!(parts = parts.match(regex))) {
    return
  }

  var check_lhs = this.create_part(parts[1], update.bind(null, false))
    , check_rhs = this.create_part(parts[3], update.bind(null, true))
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

  return this.create_part(parts[2], changed)
}

},{}],29:[function(require,module,exports){
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

  var content =  this.create_part(body.slice(0, i), update)
    , key = 'paren_' + Math.random().toString(16).slice(2)

  var template = this.create_part(key + body.slice(i + 1), change)

  return content

  function update(val, _context) {
    var context = Object.create(typeof _context === 'object' ? _context : null)

    context[key] = val
    template(context, _context)
  }
}

},{}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
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
}

},{}],34:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYWx0ci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9icm93c2VyLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2VsZW1lbnRfbm9kZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9nZXRfZWxlbWVudC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9pbnNlcnQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvcmFmLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3JlbW92ZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9yZW5kZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvcmVwbGFjZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9zZXRfY2hpbGRyZW4uanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9jaGlsZHJlbi5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL2Zvci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL2h0bWwuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pZi5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL2luY2x1ZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9wbGFjZWhvbGRlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3RleHQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy93aXRoLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RlbXBsYXRlX3N0cmluZy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90ZXh0X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdG9fc3RyaW5nLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2luZGV4LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9hcnJvdy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvY3JlYXRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9maWx0ZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2xvb2t1cC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvb3BlcmF0b3JzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9wYXJlbnMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL3NwbGl0LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi90eXBlcy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9ub2RlX21vZHVsZXMvanVzdC1kZWJvdW5jZS9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9iYXRjaC1xdWV1ZS9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgdGVtcGxhdGVfc3RyaW5nID0gcmVxdWlyZSgnLi90ZW1wbGF0ZV9zdHJpbmcnKVxuICAsIGVsZW1lbnRfbm9kZSA9IHJlcXVpcmUoJy4vZWxlbWVudF9ub2RlJylcbiAgLCBhY2Nlc3NvcnMgPSByZXF1aXJlKCdhbHRyLWFjY2Vzc29ycycpXG4gICwgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcbiAgLCB0ZXh0X25vZGUgPSByZXF1aXJlKCcuL3RleHRfbm9kZScpXG4gICwgdG9TdHJpbmcgPSByZXF1aXJlKCcuL3RvX3N0cmluZycpXG4gICwgZ2V0X2VsID0gcmVxdWlyZSgnLi9nZXRfZWxlbWVudCcpXG4gICwgYmF0Y2ggPSByZXF1aXJlKCdiYXRjaC1xdWV1ZScpXG4gICwgcmVwbGFjZSA9IHJlcXVpcmUoJy4vcmVwbGFjZScpXG4gICwgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKVxuICAsIGluc2VydCA9IHJlcXVpcmUoJy4vaW5zZXJ0JylcbiAgLCByZW1vdmUgPSByZXF1aXJlKCcuL3JlbW92ZScpXG4gICwgcmFmID0gcmVxdWlyZSgnLi9yYWYnKVxuXG52YXIgZG9tX21vZHVsZSA9ICdtaWNyby1kb20nXG5cbmFsdHIuZmlsdGVycyA9IHt9XG5hbHRyLmluY2x1ZGVzID0ge31cbmFsdHIucmVuZGVyID0gcmVuZGVyXG5hbHRyLmFkZFRhZyA9IGFkZF90YWdcbmFsdHIuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIuYWRkRmlsdGVyID0gYWRkX2ZpbHRlclxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcblxuZnVuY3Rpb24gYWx0cihyb290LCBkYXRhLCBzeW5jLCBkb2MpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWx0cikpIHtcbiAgICByZXR1cm4gbmV3IGFsdHIocm9vdCwgZGF0YSwgc3luYywgZG9jKVxuICB9XG5cbiAgaWYoIWdsb2JhbC53aW5kb3cpIHtcbiAgICBkb2MgPSBkb2MgfHwgcmVxdWlyZShkb21fbW9kdWxlKS5kb2N1bWVudFxuICB9XG5cbiAgRUUuY2FsbCh0aGlzKVxuICB0aGlzLnN5bmMgPSB0eXBlb2Ygc3luYyA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IHN5bmNcbiAgdGhpcy5yb290ID0gcm9vdFxuICB0aGlzLmRvY3VtZW50ID0gZG9jIHx8IGdsb2JhbC5kb2N1bWVudCB8fCByZXF1aXJlKGRvbV9tb2R1bGUpXG4gIHRoaXMuZmlsdGVycyA9IE9iamVjdC5jcmVhdGUoYWx0ci5maWx0ZXJzKVxuICB0aGlzLmluY2x1ZGVzID0gT2JqZWN0LmNyZWF0ZShhbHRyLmluY2x1ZGVzKVxuICB0aGlzLmFjY2Vzc29ycyA9IGFjY2Vzc29ycyh0aGlzLmZpbHRlcnMsIGZhbHNlKVxuICB0aGlzLmJhdGNoID0gYmF0Y2goKGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3luYyA/IHRoaXMucnVuQmF0Y2goKSA6IHJhZih0aGlzLnJ1bkJhdGNoLmJpbmQodGhpcykpXG4gIH0pLmJpbmQodGhpcykpXG5cbiAgaWYoZ2xvYmFsLkJ1ZmZlciAmJiByb290IGluc3RhbmNlb2YgZ2xvYmFsLkJ1ZmZlcikge1xuICAgIHJvb3QgPSByb290LnRvU3RyaW5nKClcbiAgfVxuXG4gIGlmKHR5cGVvZiByb290ID09PSAnc3RyaW5nJykge1xuICAgIHZhciB0ZW1wID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSByb290XG4gICAgdGhpcy5yb290ID0gdGhpcy5kb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcblxuICAgIHdoaWxlKHRlbXAuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy5yb290LmFwcGVuZENoaWxkKHRlbXAuZmlyc3RDaGlsZClcbiAgICB9XG4gIH1cblxuICB0aGlzLl91cGRhdGUgPSB0aGlzLnVwZGF0ZU5vZGVzKHRoaXMucm9vdE5vZGVzKCkpXG5cbiAgaWYoZGF0YSkge1xuICAgIHRoaXMudXBkYXRlKGRhdGEsIHRydWUpXG4gIH1cbn1cblxuYWx0ci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVFLnByb3RvdHlwZSlcbmFsdHIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gYWx0clxuXG5hbHRyLnByb3RvdHlwZS50ZW1wbGF0ZVN0cmluZyA9IHRlbXBsYXRlX3N0cmluZ1xuYWx0ci5wcm90b3R5cGUuY3JlYXRlQWNjZXNzb3IgPSBjcmVhdGVfYWNjZXNzb3JcbmFsdHIucHJvdG90eXBlLnVwZGF0ZU5vZGVzID0gdXBkYXRlX25vZGVzXG5hbHRyLnByb3RvdHlwZS5pbml0Tm9kZXMgPSBpbml0X25vZGVzXG5hbHRyLnByb3RvdHlwZS5yb290Tm9kZXMgPSByb290X25vZGVzXG5hbHRyLnByb3RvdHlwZS5hZGRGaWx0ZXIgPSBhZGRfZmlsdGVyXG5hbHRyLnByb3RvdHlwZS5ydW5CYXRjaCA9IHJ1bl9iYXRjaFxuYWx0ci5wcm90b3R5cGUuaW5pdE5vZGUgPSBpbml0X25vZGVcbmFsdHIucHJvdG90eXBlLnRvU3RyaW5nID0gdG9TdHJpbmdcbmFsdHIucHJvdG90eXBlLmdldEVsZW1lbnQgPSBnZXRfZWxcbmFsdHIucHJvdG90eXBlLmluY2x1ZGUgPSBpbmNsdWRlXG5hbHRyLnByb3RvdHlwZS5yZXBsYWNlID0gcmVwbGFjZVxuYWx0ci5wcm90b3R5cGUuaW50byA9IGFwcGVuZF90b1xuYWx0ci5wcm90b3R5cGUudXBkYXRlID0gdXBkYXRlXG5hbHRyLnByb3RvdHlwZS5pbnNlcnQgPSBpbnNlcnRcbmFsdHIucHJvdG90eXBlLnJlbW92ZSA9IHJlbW92ZVxuYWx0ci5wcm90b3R5cGUudGFnTGlzdCA9IFtdXG5hbHRyLnByb3RvdHlwZS50YWdzID0ge31cblxudmFyIG5vZGVfaGFuZGxlcnMgPSB7fVxuXG5ub2RlX2hhbmRsZXJzWzFdID0gZWxlbWVudF9ub2RlXG5ub2RlX2hhbmRsZXJzWzNdID0gdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIHVwZGF0ZShkYXRhLCBzeW5jKSB7XG4gIHRoaXMuc3RhdGUgPSBkYXRhXG4gIHRoaXMuX3VwZGF0ZShkYXRhKVxuXG4gIGlmKHN5bmMpIHtcbiAgICB0aGlzLmJhdGNoLnJ1bigpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlX25vZGVzKG5vZGVzKSB7XG4gIHZhciBob29rcyA9IHRoaXMuaW5pdE5vZGVzKG5vZGVzKVxuICAgICwgc2VsZiA9IHRoaXNcblxuICByZXR1cm4gdXBkYXRlXG5cbiAgZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gaG9va3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBob29rc1tpXS5jYWxsKHNlbGYsIGRhdGEpXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRfbm9kZXMobm9kZXMsIGxpc3QpIHtcbiAgdmFyIGhvb2tzID0gW10uc2xpY2UuY2FsbChub2RlcylcbiAgICAubWFwKGluaXRfbm9kZS5iaW5kKHRoaXMpKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAucmVkdWNlKGZsYXR0ZW4sIFtdKVxuXG4gIHJldHVybiBob29rc1xuXG4gIGZ1bmN0aW9uIGZsYXR0ZW4obGhzLCByaHMpIHtcbiAgICByZXR1cm4gbGhzLmNvbmNhdChyaHMpXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdF9ub2RlKGVsKSB7XG4gIHJldHVybiBub2RlX2hhbmRsZXJzW2VsLm5vZGVUeXBlXSA/XG4gICAgbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV0uY2FsbCh0aGlzLCBlbCkgOlxuICAgIGVsLmNoaWxkTm9kZXMgJiYgZWwuY2hpbGROb2Rlcy5sZW5ndGggP1xuICAgIHRoaXMuaW5pdE5vZGVzKGVsLmNoaWxkTm9kZXMpIDpcbiAgICBudWxsXG59XG5cbmZ1bmN0aW9uIHJvb3Rfbm9kZXMoKSB7XG4gIHJldHVybiB0aGlzLnJvb3Qubm9kZVR5cGUgPT09IHRoaXMuZG9jdW1lbnQuRE9DVU1FTlRfRlJBR01FTlRfTk9ERSA/XG4gICAgW10uc2xpY2UuY2FsbCh0aGlzLnJvb3QuY2hpbGROb2RlcykgOlxuICAgIFt0aGlzLnJvb3RdXG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZmlsdGVyKSB7XG4gIGFsdHIuZmlsdGVyc1tuYW1lXSA9IGZpbHRlclxufVxuXG5mdW5jdGlvbiBhZGRfdGFnKGF0dHIsIHRhZykge1xuICBhbHRyLnByb3RvdHlwZS50YWdzW2F0dHJdID0gdGFnXG4gIGFsdHIucHJvdG90eXBlLnRhZ0xpc3QucHVzaCh7XG4gICAgICBhdHRyOiBhdHRyXG4gICAgLCBjb25zdHJ1Y3RvcjogdGFnXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGFwcGVuZF90byhub2RlKSB7XG4gIHZhciByb290X25vZGVzID0gdGhpcy5yb290Tm9kZXMoKVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSByb290X25vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQoZ2V0X2VsKHJvb3Rfbm9kZXNbaV0pKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluY2x1ZGUobmFtZSwgdGVtcGxhdGUpIHtcbiAgcmV0dXJuIHRoaXMuaW5jbHVkZXNbbmFtZV0gPSB0ZW1wbGF0ZVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYWNjZXNzb3IoZGVzY3JpcHRpb24sIGNoYW5nZSkge1xuICByZXR1cm4gdGhpcy5hY2Nlc3NvcnMuY3JlYXRlKGRlc2NyaXB0aW9uLCBjaGFuZ2UsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKG5hbWUsIGZuKSB7XG4gIHJldHVybiB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBydW5fYmF0Y2goKSB7XG4gIHRoaXMuYmF0Y2gucnVuKClcbiAgdGhpcy5lbWl0KCd1cGRhdGUnLCB0aGlzLnN0YXRlKVxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gZ2xvYmFsLmFsdHIgPSByZXF1aXJlKCcuL2luZGV4JylcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZV9lbGVtZW50X25vZGVcblxuZnVuY3Rpb24gY3JlYXRlX2VsZW1lbnRfbm9kZShlbCkge1xuICB2YXIgYWx0cl90YWdzID0ge31cbiAgICAsIGFsdHIgPSB0aGlzXG4gICAgLCBob29rcyA9IFtdXG4gICAgLCBhdHRyXG5cbiAgdmFyIGF0dHJzID0gQXJyYXkucHJvdG90eXBlLmZpbHRlci5jYWxsKGVsLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKGF0dHIpIHtcbiAgICByZXR1cm4gYWx0ci50YWdzW2F0dHIubmFtZV0gP1xuICAgICAgKGFsdHJfdGFnc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZSkgJiYgZmFsc2UgOlxuICAgICAgdHJ1ZVxuICB9KVxuXG4gIGF0dHJzLmZvckVhY2goZnVuY3Rpb24oYXR0cikge1xuICAgIHZhciB2YWx1ZSA9IGF0dHIudmFsdWVcbiAgICAgICwgbmFtZSA9IGF0dHIubmFtZVxuXG4gICAgaWYoIW5hbWUuaW5kZXhPZignYWx0ci1hdHRyLScpKSB7XG4gICAgICBuYW1lID0gYXR0ci5uYW1lLnNsaWNlKCdhbHRyLWF0dHItJy5sZW5ndGgpXG4gICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKVxuICAgIH1cblxuICAgIHZhciBhdHRyX2hvb2sgPSBhbHRyLnRlbXBsYXRlU3RyaW5nKHZhbHVlLCBhbHRyLmJhdGNoLmFkZChmdW5jdGlvbih2YWwpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCB2YWwpXG4gICAgfSkpXG5cbiAgICBpZihhdHRyX2hvb2spIHtcbiAgICAgIGhvb2tzLnB1c2goYXR0cl9ob29rKVxuICAgIH1cbiAgfSlcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYWx0ci50YWdMaXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGF0dHIgPSBhbHRyX3RhZ3NbYWx0ci50YWdMaXN0W2ldLmF0dHJdKSB7XG4gICAgICBob29rcy5wdXNoKGFsdHIudGFnTGlzdFtpXS5jb25zdHJ1Y3Rvci5jYWxsKGFsdHIsIGVsLCBhdHRyKSlcblxuICAgICAgcmV0dXJuIGhvb2tzXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhvb2tzLmNvbmNhdChhbHRyLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzKSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZ2V0X2VsXG5cbmZ1bmN0aW9uIGdldF9lbChlbCkge1xuICB3aGlsZShlbCAmJiBlbC5fYWx0cl9wbGFjZWhvbGRlcikge1xuICAgIGVsID0gZWwuX2FsdHJfcGxhY2Vob2xkZXJcbiAgfVxuXG4gIHJldHVybiBlbFxufVxuIiwidmFyIHBsYWNlaG9sZGVyID0gcmVxdWlyZSgnLi90YWdzL3BsYWNlaG9sZGVyJylcbiAgLCBjaGlsZHJlbl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvY2hpbGRyZW4nKVxuICAsIGluY2x1ZGVfdGFnID0gcmVxdWlyZSgnLi90YWdzL2luY2x1ZGUnKVxuICAsIHRleHRfdGFnID0gcmVxdWlyZSgnLi90YWdzL3RleHQnKVxuICAsIGh0bWxfdGFnID0gcmVxdWlyZSgnLi90YWdzL2h0bWwnKVxuICAsIHdpdGhfdGFnID0gcmVxdWlyZSgnLi90YWdzL3dpdGgnKVxuICAsIGZvcl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvZm9yJylcbiAgLCBpZl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaWYnKVxuICAsIGFsdHIgPSByZXF1aXJlKCcuL2FsdHInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcblxuYWx0ci5hZGRUYWcoJ2FsdHItcGxhY2Vob2xkZXInLCBwbGFjZWhvbGRlcilcbmFsdHIuYWRkVGFnKCdhbHRyLWNoaWxkcmVuJywgY2hpbGRyZW5fdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItaW5jbHVkZScsIGluY2x1ZGVfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItdGV4dCcsIHRleHRfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItaHRtbCcsIGh0bWxfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItd2l0aCcsIHdpdGhfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItZm9yJywgZm9yX3RhZylcbmFsdHIuYWRkVGFnKCdhbHRyLWlmJywgaWZfdGFnKVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRcblxuZnVuY3Rpb24gaW5zZXJ0KHBhcmVudCwgZWwsIGJlZm9yZSkge1xuICB2YXIgaW5zZXJ0ZWQgPSBlbC5wYXJlbnROb2RlICE9PSBwYXJlbnRcblxuICBiZWZvcmUgPSBiZWZvcmUgfHwgbnVsbFxuXG4gIGlmKGluc2VydGVkIHx8IGVsLm5leHRTaWJsaW5nICE9PSBiZWZvcmUpIHtcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGVsLCBiZWZvcmUpXG4gIH1cblxuICBpZihpbnNlcnRlZCkge1xuICAgIHRoaXMuZW1pdCgnaW5zZXJ0JywgZWwsIHBhcmVudClcbiAgfVxufVxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcblxuZnVuY3Rpb24gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG4gIHZhciByYWYgPSBnbG9iYWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB0aW1lb3V0XG5cbiAgcmV0dXJuIHJhZihjYWxsYmFjaylcblxuICBmdW5jdGlvbiB0aW1lb3V0KGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MClcbiAgfVxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlXG5cbmZ1bmN0aW9uIHJlbW92ZShwYXJlbnQsIGVsKSB7XG4gIHBhcmVudC5yZW1vdmVDaGlsZChlbClcbiAgdGhpcy5lbWl0KCdyZW1vdmUnLCBlbCwgcGFyZW50KVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZW5kZXJcblxuZnVuY3Rpb24gcmVuZGVyKHRlbXBsYXRlLCBzdGF0ZSwgZWwpIHtcbiAgaWYodGhpcy5pbmNsdWRlc1t0ZW1wbGF0ZV0pIHtcbiAgICB0ZW1wbGF0ZSA9IHRoaXMuaW5jbHVkZXNbdGVtcGxhdGVdXG4gIH1cblxuICB2YXIgaW5zdGFuY2UgPSB0aGlzKHRlbXBsYXRlKVxuXG4gIGluc3RhbmNlLnVwZGF0ZShzdGF0ZSB8fCB7fSwgdHJ1ZSlcblxuICBpZihlbCkge1xuICAgIGluc3RhbmNlLmludG8oZWwpXG4gIH1cblxuICByZXR1cm4gaW5zdGFuY2Vcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVwbGFjZVxuXG5mdW5jdGlvbiByZXBsYWNlKHBhcmVudCwgZWwsIG9sZCkge1xuICBwYXJlbnQucmVwbGFjZUNoaWxkKGVsLCBvbGQpXG4gIHRoaXMuZW1pdCgncmVwbGFjZScsIGVsLCBvbGQsIHBhcmVudClcbiAgdGhpcy5lbWl0KCdpbnNlcnQnLCBlbCwgcGFyZW50KVxuICB0aGlzLmVtaXQoJ3JlbW92ZScsIG9sZCwgcGFyZW50KVxufVxuIiwidmFyIGdldCA9IHJlcXVpcmUoJy4vZ2V0X2VsZW1lbnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldF9jaGlsZHJlblxuXG5mdW5jdGlvbiBzZXRfY2hpbGRyZW4ocm9vdCwgbm9kZXMpIHtcbiAgdmFyIHByZXYgPSBudWxsXG4gICAgLCBlbFxuXG4gIGZvcih2YXIgaSA9IG5vZGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgZWwgPSBnZXQobm9kZXNbaV0pXG4gICAgdGhpcy5pbnNlcnQocm9vdCwgZWwsIHByZXYpXG4gICAgcHJldiA9IGVsXG4gIH1cblxuICB3aGlsZSgoZWwgPSByb290LmZpcnN0Q2hpbGQpICE9PSBwcmV2KSB7XG4gICAgdGhpcy5yZW1vdmUocm9vdCwgZWwpXG4gIH1cbn1cbiIsInZhciBzZXRfY2hpbGRyZW4gPSByZXF1aXJlKCcuLi9zZXRfY2hpbGRyZW4nKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNoaWxkcmVuXG5cbmZ1bmN0aW9uIGNoaWxkcmVuKGVsLCBhY2Nlc3Nvcikge1xuICByZXR1cm4gdGhpcy5iYXRjaC5hZGQodGhpcy5jcmVhdGVBY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlLmJpbmQodGhpcykpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICB2YXIgbm9kZXMgPSBBcnJheS5pc0FycmF5KHZhbCkgPyB2YWwgOiBbdmFsXVxuXG4gICAgc2V0X2NoaWxkcmVuLmNhbGwodGhpcywgZWwsIG5vZGVzLmZpbHRlcihpc19ub2RlKSlcbiAgfVxufVxuXG5mdW5jdGlvbiBpc19ub2RlKGVsKSB7XG4gIHJldHVybiBlbCAmJiBlbC5ub2RlVHlwZVxufVxuIiwidmFyIHNldF9jaGlsZHJlbiA9IHJlcXVpcmUoJy4uL3NldF9jaGlsZHJlbicpXG4gICwgZm9yX3JlZ2V4cCA9IC9eKC4qPylcXHMraW5cXHMrKC4qJCkvXG5cbm1vZHVsZS5leHBvcnRzID0gZm9yX2hhbmRsZXJcblxuZnVuY3Rpb24gZm9yX2hhbmRsZXIocm9vdCwgYXJncykge1xuICB2YXIgcGFydHMgPSBhcmdzLm1hdGNoKGZvcl9yZWdleHApXG4gICAgLCB0ZW1wbGF0ZSA9IHJvb3QuaW5uZXJIVE1MXG4gICAgLCBkb21fbm9kZXMgPSBbXVxuICAgICwgY2hpbGRyZW4gPSBbXVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGl0ZW1zID0gW11cblxuICBpZighcGFydHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgZm9yIHRhZzogJyArIGFyZ3MpXG4gIH1cblxuICByb290LmlubmVySFRNTCA9ICcnXG5cbiAgdmFyIHVuaXF1ZSA9IHBhcnRzWzFdLnNwbGl0KCc6JylbMV1cbiAgICAsIHByb3AgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzBdXG4gICAgLCBrZXkgPSBwYXJ0c1syXVxuXG4gIHZhciBydW5fdXBkYXRlcyA9IHRoaXMuYmF0Y2guYWRkKHJ1bl9kb21fdXBkYXRlcylcblxuICByZXR1cm4gYWx0ci5jcmVhdGVBY2Nlc3NvcihrZXksIHVwZGF0ZSlcblxuICBmdW5jdGlvbiB1cGRhdGVfY2hpbGRyZW4oZGF0YSkge1xuICAgIHZhciBpdGVtX2RhdGFcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGl0ZW1fZGF0YSA9IE9iamVjdC5jcmVhdGUoZGF0YSlcbiAgICAgIGl0ZW1fZGF0YVtwcm9wXSA9IGl0ZW1zW2ldXG4gICAgICBpdGVtX2RhdGFbJyRpbmRleCddID0gaVxuXG4gICAgICBjaGlsZHJlbltpXS51cGRhdGUgJiYgY2hpbGRyZW5baV0udXBkYXRlKGl0ZW1fZGF0YSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUobmV3X2l0ZW1zLCBkYXRhKSB7XG4gICAgaWYoIUFycmF5LmlzQXJyYXkobmV3X2l0ZW1zKSkge1xuICAgICAgbmV3X2l0ZW1zID0gW11cbiAgICB9XG5cbiAgICB2YXIgbmV3X2NoaWxkcmVuID0gbmV3IEFycmF5KG5ld19pdGVtcy5sZW5ndGgpXG4gICAgICAsIGluZGV4XG5cbiAgICBkb21fbm9kZXMgPSBbXVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5ld19pdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGluZGV4ID0gZmluZF9pbmRleChpdGVtcywgbmV3X2l0ZW1zW2ldLCB1bmlxdWUpXG5cbiAgICAgIGlmKGluZGV4ICE9PSAtMSkge1xuICAgICAgICBuZXdfY2hpbGRyZW5baV0gPSAoY2hpbGRyZW4uc3BsaWNlKGluZGV4LCAxKVswXSlcbiAgICAgICAgaXRlbXMuc3BsaWNlKGluZGV4LCAxKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gbWFrZV9jaGlsZHJlbigpXG4gICAgICB9XG5cbiAgICAgIGRvbV9ub2RlcyA9IGRvbV9ub2Rlcy5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcylcbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG5ld19jaGlsZHJlbi5zbGljZSgpXG4gICAgaXRlbXMgPSBuZXdfaXRlbXMuc2xpY2UoKVxuICAgIHJ1bl91cGRhdGVzLmNhbGwoYWx0cilcbiAgICB1cGRhdGVfY2hpbGRyZW4oZGF0YSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRfaW5kZXgoaXRlbXMsIGQsIHVuaXF1ZSkge1xuICAgIGlmKCF1bmlxdWUpIHtcbiAgICAgIHJldHVybiBpdGVtcy5pbmRleE9mKGQpXG4gICAgfVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGl0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaWYoaXRlbXNbaV1bdW5pcXVlXSA9PT0gZFt1bmlxdWVdKSB7XG4gICAgICAgIHJldHVybiBpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIC0xXG4gIH1cblxuICBmdW5jdGlvbiBtYWtlX2NoaWxkcmVuKCkge1xuICAgIHZhciB0ZW1wID0gYWx0ci5kb2N1bWVudC5jcmVhdGVFbGVtZW50TlMocm9vdC5uYW1lc3BhY2VVUkksICdkaXYnKVxuICAgICAgLCBkb21fbm9kZXNcbiAgICAgICwgdXBkYXRlXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHRlbXBsYXRlXG5cbiAgICBkb21fbm9kZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0ZW1wLmNoaWxkTm9kZXMpXG4gICAgdXBkYXRlID0gYWx0ci51cGRhdGVOb2Rlcyhkb21fbm9kZXMpXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBkb21fbm9kZXM6IGRvbV9ub2Rlc1xuICAgICAgLCB1cGRhdGU6IHVwZGF0ZVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bl9kb21fdXBkYXRlcygpIHtcbiAgICBzZXRfY2hpbGRyZW4uY2FsbCh0aGlzLCByb290LCBkb21fbm9kZXMpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaHRtbFxuXG5mdW5jdGlvbiBodG1sKGVsLCBhY2Nlc3Nvcikge1xuICByZXR1cm4gdGhpcy5iYXRjaC5hZGQodGhpcy5jcmVhdGVBY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuXG4gICAgaWYoZWwuZ2V0QXR0cmlidXRlKCdhbHRyLXJ1bi1zY3JpcHRzJykpIHtcbiAgICAgIFtdLmZvckVhY2guY2FsbChlbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JyksIHJ1bilcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuKHNjcmlwdCkge1xuICB2YXIgZml4ZWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgICwgcGFyZW50ID0gc2NyaXB0LnBhcmVudE5vZGVcbiAgICAsIGF0dHJzID0gc2NyaXB0LmF0dHJpYnV0ZXNcbiAgICAsIHNyY1xuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBmaXhlZC5zZXRBdHRyaWJ1dGUoYXR0cnNbaV0ubmFtZSwgYXR0cnNbaV0udmFsdWUpXG4gIH1cblxuICBmaXhlZC50ZXh0Q29udGVudCA9IHNjcmlwdC50ZXh0Q29udGVudFxuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGZpeGVkLCBzY3JpcHQpXG4gIHBhcmVudC5yZW1vdmVDaGlsZChzY3JpcHQpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlmX3RhZ1xuXG5mdW5jdGlvbiBpZl90YWcoZWwsIGFjY2Vzc29yKSB7XG4gIHZhciBwbGFjZWhvbGRlciA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnYWx0ci1pZi1wbGFjZWhvbGRlcicpXG4gICAgLCB1cGRhdGVfY2hpbGRyZW4gPSB0aGlzLnVwZGF0ZU5vZGVzKGVsLmNoaWxkTm9kZXMpXG4gICAgLCBoaWRkZW4gPSBudWxsXG4gICAgLCBhbHRyID0gdGhpc1xuXG4gIHZhciBoaWRlID0gdGhpcy5iYXRjaC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudE5vZGVcblxuICAgIGlmKCFoaWRkZW4pIHtcbiAgICAgIGFsdHIucmVwbGFjZShlbC5wYXJlbnROb2RlLCBwbGFjZWhvbGRlciwgZWwpXG4gICAgICBlbC5fYWx0cl9wbGFjZWhvbGRlciA9IHBsYWNlaG9sZGVyXG4gICAgICBoaWRkZW4gPSB0cnVlXG4gICAgfVxuICB9KVxuXG4gIHZhciBzaG93ID0gdGhpcy5iYXRjaC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgaWYoaGlkZGVuKSB7XG4gICAgICBhbHRyLnJlcGxhY2UocGxhY2Vob2xkZXIucGFyZW50Tm9kZSwgZWwsIHBsYWNlaG9sZGVyKVxuICAgICAgZGVsZXRlIGVsLl9hbHRyX3BsYWNlaG9sZGVyXG4gICAgICBoaWRkZW4gPSBmYWxzZVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gdGhpcy5jcmVhdGVBY2Nlc3NvcihhY2Nlc3NvciwgdG9nZ2xlKVxuXG4gIGZ1bmN0aW9uIHRvZ2dsZSh2YWwsIGRhdGEpIHtcbiAgICBpZighdmFsKSB7XG4gICAgICByZXR1cm4gaGlkZSgpXG4gICAgfVxuXG4gICAgc2hvdygpXG4gICAgdXBkYXRlX2NoaWxkcmVuKGRhdGEpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaW5jbHVkZVxuXG5mdW5jdGlvbiBpbmNsdWRlKGVsLCBuYW1lKSB7XG4gIGVsLmlubmVySFRNTCA9IHRoaXMuaW5jbHVkZXNbbmFtZV1cblxuICByZXR1cm4gdGhpcy51cGRhdGVOb2RlcyhlbC5jaGlsZE5vZGVzKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBwbGFjZWhvbGRlclxuXG5mdW5jdGlvbiBwbGFjZWhvbGRlcihlbCwgYWNjZXNzb3IpIHtcbiAgdmFyIGFsdHIgPSB0aGlzXG5cbiAgcmV0dXJuIHRoaXMuYmF0Y2guYWRkKHRoaXMuY3JlYXRlQWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGlmKCF2YWwubm9kZU5hbWUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGFsdHIucmVwbGFjZShlbC5wYXJlbnROb2RlLCB2YWwsIGVsKVxuICAgIGVsLl9hbHRyX3BsYWNlaG9sZGVyID0gdmFsXG4gICAgZWwgPSB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZXh0XG5cbmZ1bmN0aW9uIHRleHQoZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZUFjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3aXRoX3RhZ1xuXG5mdW5jdGlvbiB3aXRoX3RhZyhlbCwgYWNjZXNzb3IpIHtcbiAgcmV0dXJuIHRoaXMuY3JlYXRlQWNjZXNzb3IoYWNjZXNzb3IsIHRoaXMudXBkYXRlTm9kZXMoZWwuY2hpbGROb2RlcykpXG59XG4iLCJ2YXIgVEFHID0gL3t7XFxzKiguKj8pXFxzKn19L1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlX3N0cmluZ1xuXG5mdW5jdGlvbiB0ZW1wbGF0ZV9zdHJpbmcodGVtcGxhdGUsIGNoYW5nZSkge1xuICBpZighdGVtcGxhdGUubWF0Y2goVEFHKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRlbXBsYXRlXG4gICAgLCBwYXJ0cyA9IFtdXG4gICAgLCBob29rcyA9IFtdXG4gICAgLCB0aW1lclxuICAgICwgaW5kZXhcbiAgICAsIG5leHRcblxuICB3aGlsZShyZW1haW5pbmcgJiYgKG5leHQgPSByZW1haW5pbmcubWF0Y2goVEFHKSkpIHtcbiAgICBpZihpbmRleCA9IHJlbWFpbmluZy5pbmRleE9mKG5leHRbMF0pKSB7XG4gICAgICBwYXJ0cy5wdXNoKHJlbWFpbmluZy5zbGljZSgwLCBpbmRleCkpXG4gICAgfVxuXG4gICAgcGFydHMucHVzaCgnJylcbiAgICByZW1haW5pbmcgPSByZW1haW5pbmcuc2xpY2UoaW5kZXggKyBuZXh0WzBdLmxlbmd0aClcbiAgICBob29rcy5wdXNoKFxuICAgICAgICB0aGlzLmNyZWF0ZUFjY2Vzc29yKG5leHRbMV0sIHNldF9wYXJ0LmJpbmQodGhpcywgcGFydHMubGVuZ3RoIC0gMSkpXG4gICAgKVxuICB9XG5cbiAgcGFydHMucHVzaChyZW1haW5pbmcpXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHNldF9wYXJ0KGlkeCwgdmFsKSB7XG4gICAgcGFydHNbaWR4XSA9IHZhbFxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICBob29rKGRhdGEpXG4gICAgfSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbml0X3RleHRfbm9kZVxuXG5mdW5jdGlvbiBpbml0X3RleHRfbm9kZShlbCkge1xuICB2YXIgaG9vayA9IHRoaXMudGVtcGxhdGVTdHJpbmcoZWwudGV4dENvbnRlbnQsIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSkpXG5cbiAgcmV0dXJuIGhvb2sgPyBbaG9va10gOiBudWxsXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdG9TdHJpbmdcblxuZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gIHJldHVybiB0aGlzLnJvb3ROb2RlcygpLm1hcChmdW5jdGlvbihub2RlKSB7XG4gICAgc3dpdGNoKG5vZGUubm9kZVR5cGUpIHtcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFOlxuICAgICAgY2FzZSB0aGlzLmRvY3VtZW50LkNPTU1FTlRfTk9ERTogcmV0dXJuIGNsb25lLmNhbGwodGhpcywgbm9kZSlcbiAgICAgIGNhc2UgdGhpcy5kb2N1bWVudC5URVhUX05PREU6IHJldHVybiBub2RlLnRleHRDb250ZW50XG4gICAgICBkZWZhdWx0OiByZXR1cm4gbm9kZS5vdXRlckhUTUxcbiAgICB9XG4gIH0sIHRoaXMpLmpvaW4oJycpXG5cbiAgZnVuY3Rpb24gY2xvbmUobm9kZSkge1xuICAgIHZhciB0ZW1wID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXG4gICAgdGVtcC5hcHBlbmRDaGlsZChub2RlLmNsb25lTm9kZSgpKVxuXG4gICAgcmV0dXJuIHRlbXAuaW5uZXJIVE1MXG4gIH1cbn1cbiIsInZhciBhZGRfb3BlcmF0b3JzID0gcmVxdWlyZSgnLi9saWIvb3BlcmF0b3JzJylcbiAgLCBjcmVhdGVfYWNjZXNvciA9IHJlcXVpcmUoJy4vbGliL2NyZWF0ZScpXG4gICwgYWRkX2ZpbHRlcnMgPSByZXF1aXJlKCcuL2xpYi9maWx0ZXInKVxuICAsIGFkZF9sb29rdXAgPSByZXF1aXJlKCcuL2xpYi9sb29rdXAnKVxuICAsIGFkZF9wYXJlbnMgPSByZXF1aXJlKCcuL2xpYi9wYXJlbnMnKVxuICAsIGRlYm91bmNlID0gcmVxdWlyZSgnanVzdC1kZWJvdW5jZScpXG4gICwgYWRkX3R5cGVzID0gcmVxdWlyZSgnLi9saWIvdHlwZXMnKVxuICAsIGFkZF9hcnJvdyA9IHJlcXVpcmUoJy4vbGliL2Fycm93JylcbiAgLCBzcGxpdCA9IHJlcXVpcmUoJy4vbGliL3NwbGl0JylcbiAgLCB0eXBlcyA9IFtdXG5cbm1vZHVsZS5leHBvcnRzID0gYWNjZXNzb3JzXG5cbi8vIG9yZGVyIGlzIGltcG9ydGFudFxuYWRkX3R5cGVzKHR5cGVzKVxuYWRkX2Fycm93KHR5cGVzKVxuYWRkX2ZpbHRlcnModHlwZXMpXG5hZGRfcGFyZW5zKHR5cGVzKVxuYWRkX29wZXJhdG9ycyh0eXBlcylcbmFkZF9sb29rdXAodHlwZXMpXG5cbmFjY2Vzc29ycy5wcm90b3R5cGUuY3JlYXRlX3BhcnQgPSBjcmVhdGVfYWNjZXNvclxuYWNjZXNzb3JzLnByb3RvdHlwZS5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlclxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGUgPSBjcmVhdGVcbmFjY2Vzc29ycy5wcm90b3R5cGUudHlwZXMgPSB0eXBlc1xuYWNjZXNzb3JzLnByb3RvdHlwZS5zcGxpdCA9IHNwbGl0XG5cbmZ1bmN0aW9uIGFjY2Vzc29ycyhmaWx0ZXJzLCBkZWxheSkge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhY2Nlc3NvcnMpKSB7XG4gICAgcmV0dXJuIG5ldyBhY2Nlc3NvcnMoZmlsdGVycywgZGVsYXkpXG4gIH1cblxuICBpZighZGVsYXkgJiYgZGVsYXkgIT09IGZhbHNlKSB7XG4gICAgZGVsYXkgPSAwXG4gIH1cblxuICB0aGlzLmRlbGF5ID0gZGVsYXlcbiAgdGhpcy5maWx0ZXJzID0gZmlsdGVycyB8fCB7fVxufVxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKG5hbWUsIGZuKSB7XG4gIHRoaXMuZmlsdGVyc1tuYW1lXSA9IGZuXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShzdHIsIGNoYW5nZSwgYWxsKSB7XG4gIHZhciBwYXJ0ID0gdGhpcy5jcmVhdGVfcGFydChcbiAgICAgIHN0clxuICAgICwgdGhpcy5kZWxheSA9PT0gZmFsc2UgPyB1cGRhdGUgOiBkZWJvdW5jZShjaGFuZ2UsIHRoaXMuZGVsYXksIGZhbHNlLCB0cnVlKVxuICApXG5cbiAgdmFyIHN5bmMgPSBmYWxzZVxuICAgICwgcHJldiA9IHt9XG4gICAgLCBvdXRcblxuICByZXR1cm4gd3JpdGVcblxuICBmdW5jdGlvbiB3cml0ZShkYXRhKSB7XG4gICAgdmFyIF9vdXQgPSB7fVxuXG4gICAgc3luYyA9IHRydWVcbiAgICBvdXQgPSBfb3V0XG4gICAgcGFydChkYXRhKVxuICAgIHN5bmMgPSBmYWxzZVxuXG4gICAgaWYob3V0ICE9PSBfb3V0KSB7XG4gICAgICBjaGFuZ2UuYXBwbHkobnVsbCwgb3V0KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGN0eCkge1xuICAgIGlmKCFhbGwgJiYgdHlwZW9mIHZhbCAhPT0gJ29iamVjdCcgJiYgdmFsID09PSBwcmV2KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBvdXQgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICBwcmV2ID0gdmFsXG5cbiAgICBpZighc3luYykge1xuICAgICAgY2hhbmdlLmFwcGx5KG51bGwsIG91dClcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWRkX2Fycm93XG5cbmZ1bmN0aW9uIGFkZF9hcnJvdyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9hcnJvdylcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2Fycm93KHBhcnRzLCBjaGFuZ2UpIHtcbiAgcGFydHMgPSB0aGlzLnNwbGl0KHBhcnRzLCAnLT4nKVxuXG4gIGlmKHBhcnRzLmxlbmd0aCA8IDIpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByaWdodCA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMV0sIGNoYW5nZSlcbiAgICAsIGxlZnQgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzBdLCB1cGRhdGUpXG5cbiAgcmV0dXJuIGxlZnRcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjdHgpIHtcbiAgICByaWdodCh2YWwsIGN0eClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhY2Nlc3NvclxuXG5mdW5jdGlvbiBhY2Nlc3NvcihrZXksIGNoYW5nZSkge1xuICB2YXIgcGFydCA9IGJ1aWxkX3BhcnQuY2FsbCh0aGlzLCBrZXksIGZpbmlzaC5iaW5kKHRoaXMpKVxuICAgICwgY29udGV4dFxuXG4gIHJldHVybiBjYWxsXG5cbiAgZnVuY3Rpb24gY2FsbCh2YWwsIGN0eCkge1xuICAgIHBhcnQodmFsLCBjb250ZXh0ID0gY3R4IHx8IHZhbClcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmlzaCh2YWwsIGN0eCkge1xuICAgIGNoYW5nZS5jYWxsKHRoaXMsIHZhbCwgdHlwZW9mIGN0eCA9PT0gJ3VuZGVmaW5lZCcgPyBjdHggOiBjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkX3BhcnQocGFydCwgY2hhbmdlKSB7XG4gIHZhciBhY2Nlc3NvclxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnR5cGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGFjY2Vzc29yID0gdGhpcy50eXBlc1tpXS5jYWxsKHRoaXMsIHBhcnQsIGNoYW5nZSkpIHtcbiAgICAgIHJldHVybiBhY2Nlc3NvclxuICAgIH1cbiAgfVxufVxuIiwidmFyIGZpbHRlcl9yZWdleHAgPSAvXlxccyooW15cXHMoXSspXFwoKC4qKVxcKVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9maWx0ZXJcblxuZnVuY3Rpb24gYWRkX2ZpbHRlcih0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9maWx0ZXIpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9maWx0ZXIocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goZmlsdGVyX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgZmlsdGVyID0gdGhpcy5maWx0ZXJzW3BhcnRzWzFdXVxuXG4gIGlmKCFmaWx0ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCBmaW5kIGZpbHRlcjogJyArIHBhcnRzWzFdKVxuICB9XG5cbiAgcmV0dXJuIGZpbHRlci5jYWxsKHRoaXMsIHRoaXMuc3BsaXQocGFydHNbMl0sICcsJywgbnVsbCwgbnVsbCwgdHJ1ZSksIGNoYW5nZSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWRkX2xvb2t1cFxuXG5mdW5jdGlvbiBhZGRfbG9va3VwKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2xvb2t1cClcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2xvb2t1cChwYXRoLCBjaGFuZ2UpIHtcbiAgaWYoIXBhdGguaW5kZXhPZignJGRhdGEnKSkge1xuICAgIHBhdGggPSBwYXRoLnNsaWNlKCckZGF0YS4nLmxlbmd0aClcblxuICAgIGlmKCFwYXRoKSB7XG4gICAgICByZXR1cm4gY2hhbmdlXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGxvb2t1cChwYXRoLm1hdGNoKC9cXHMqKC4qW15cXHNdKVxccyovKVsxXSwgY2hhbmdlKVxufVxuXG5mdW5jdGlvbiBsb29rdXAocGF0aCwgZG9uZSkge1xuICB2YXIgcGFydHMgPSBwYXRoID8gcGF0aC5zcGxpdCgnLicpIDogW11cblxuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBjdHgpIHtcbiAgICB2YXIgcmVzdWx0ID0gc2VhcmNoKG9iaiwgcGFydHMpXG5cbiAgICBpZih0eXBlb2YgcmVzdWx0ID09PSAndW5kZWZpbmVkJyAmJiBjdHgpIHtcbiAgICAgIHJlc3VsdCA9IHNlYXJjaChjdHgsIHBhcnRzKVxuICAgIH1cblxuICAgIGRvbmUocmVzdWx0LCBjdHgpXG4gIH1cbn1cblxuZnVuY3Rpb24gc2VhcmNoKG9iaiwgcGFydHMpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgb2JqICYmIGkgPCBsOyArK2kpIHtcbiAgICBvYmogPSBvYmpbcGFydHNbaV1dXG4gIH1cblxuICBpZihpID09PSBsKSB7XG4gICAgcmV0dXJuIG9ialxuICB9XG59XG4iLCJ2YXIgdGVybmFyeV9yZWdleHAgPSAvXlxccyooLis/KVxccypcXD8oLiopXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX29wZXJhdG9yc1xuXG5mdW5jdGlvbiBhZGRfb3BlcmF0b3JzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3Rlcm5hcnkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfFxcXFx8J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ3wnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnXiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJz09PScsICchPT0nLCAnPT0nLCAnIT0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPj0nLCAnPD0nLCAnPicsICc8JywgJyBpbiAnLCAnIGluc3RhbmNlb2YgJ10pKVxuICAvLyB0eXBlcy5wdXNoKGJpbmFyeShbJzw8JywgJz4+JywgJz4+PiddKSkgLy9jb25mbGljcyB3aXRoIDwgYW5kID5cbiAgdHlwZXMucHVzaChiaW5hcnkoWycrJywgJy0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnKicsICcvJywgJyUnXSkpXG4gIHR5cGVzLnB1c2godW5hcnkoWychJywgJysnLCAnLScsICd+J10pKVxufVxuXG5mdW5jdGlvbiBiaW5hcnkobGlzdCkge1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFxuICAgICAgJ15cXFxccyooLis/KVxcXFxzXFwqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV9iaW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1bmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKihcXFxcJyArXG4gICAgICBsaXN0LmpvaW4oJ3xcXFxcJykgK1xuICAgICAgJylcXFxccyooLis/KVxcXFxzKiQnXG4gIClcblxuICByZXR1cm4gZnVuY3Rpb24ocGFydHMsIGNoYW5nZSkge1xuICAgIHJldHVybiBjcmVhdGVfdW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdGVybmFyeShwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaCh0ZXJuYXJ5X3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY29uZGl0aW9uID0gcGFydHNbMV1cbiAgICAsIHJlc3QgPSBwYXJ0c1syXVxuICAgICwgY291bnQgPSAxXG5cbiAgcmVzdCA9IHRoaXMuc3BsaXQocmVzdCwgJzonLCBbWyc/JywgJzonXSwgWycoJywgJyknXV0pXG5cbiAgaWYocmVzdC5sZW5ndGggIT09IDIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCB0ZXJuYXJ5OiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgbm90ID0gdGhpcy5jcmVhdGVfcGFydChyZXN0WzFdLCBjaGFuZ2UpXG4gICAgLCBvayA9IHRoaXMuY3JlYXRlX3BhcnQocmVzdFswXSwgY2hhbmdlKVxuXG4gIHJldHVybiB0aGlzLmNyZWF0ZV9wYXJ0KGNvbmRpdGlvbiwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdmFsID8gb2soY29udGV4dCkgOiBub3QoY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYmluYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hlY2tfbGhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1sxXSwgdXBkYXRlLmJpbmQobnVsbCwgZmFsc2UpKVxuICAgICwgY2hlY2tfcmhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1szXSwgdXBkYXRlLmJpbmQobnVsbCwgdHJ1ZSkpXG4gICAgLCB1bnNldCA9IHt9XG5cbiAgdmFyIGxocyA9IHVuc2V0XG4gICAgLCByaHMgPSB1bnNldFxuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCBsaHMsIHJocydcbiAgICAsICdyZXR1cm4gY2hhbmdlKGxocyAnICsgcGFydHNbMl0gKyAnIHJocyknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIG9uX2RhdGFcblxuICBmdW5jdGlvbiBvbl9kYXRhKGRhdGEsIGN0eCkge1xuICAgIGNoZWNrX2xocyhkYXRhLCBjdHgpXG4gICAgY2hlY2tfcmhzKGRhdGEsIGN0eClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShpc19yaHMsIHZhbCkge1xuICAgIGlzX3JocyA/IHJocyA9IHZhbCA6IGxocyA9IHZhbFxuXG4gICAgaWYobGhzID09PSB1bnNldCB8fCByaHMgPT09IHVuc2V0KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjaGFuZ2VkKGxocywgcmhzKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV91bmFyeShyZWdleCwgcGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gocmVnZXgpKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGNoYW5nZWQgPSBGdW5jdGlvbihcbiAgICAgICdjaGFuZ2UsIHZhbCdcbiAgICAsICdyZXR1cm4gY2hhbmdlKCcgKyBwYXJ0c1sxXSArICd2YWwpJ1xuICApLmJpbmQobnVsbCwgY2hhbmdlKVxuXG4gIHJldHVybiB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzJdLCBjaGFuZ2VkKVxufVxuIiwidmFyIHBhcmVuc19yZWdleHAgPSAvXlxccypcXCgoLiopJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfcGFyZW5zXG5cbmZ1bmN0aW9uIGFkZF9wYXJlbnModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfcGFyZW5zKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfcGFyZW5zKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHBhcmVuc19yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGJvZHkgPSBwYXJ0c1sxXVxuICAgICwgY291bnQgPSAxXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGJvZHkubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYm9keVtpXSA9PT0gJyknKSB7XG4gICAgICAtLWNvdW50XG4gICAgfSBlbHNlIGlmKGJvZHlbaV0gPT09ICcoJykge1xuICAgICAgKytjb3VudFxuICAgIH1cblxuICAgIGlmKCFjb3VudCkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZighaSB8fCBpID09PSBsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgcGFyZW5zOiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgY29udGVudCA9ICB0aGlzLmNyZWF0ZV9wYXJ0KGJvZHkuc2xpY2UoMCwgaSksIHVwZGF0ZSlcbiAgICAsIGtleSA9ICdwYXJlbl8nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMilcblxuICB2YXIgdGVtcGxhdGUgPSB0aGlzLmNyZWF0ZV9wYXJ0KGtleSArIGJvZHkuc2xpY2UoaSArIDEpLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIGNvbnRlbnRcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBfY29udGV4dCkge1xuICAgIHZhciBjb250ZXh0ID0gT2JqZWN0LmNyZWF0ZSh0eXBlb2YgX2NvbnRleHQgPT09ICdvYmplY3QnID8gX2NvbnRleHQgOiBudWxsKVxuXG4gICAgY29udGV4dFtrZXldID0gdmFsXG4gICAgdGVtcGxhdGUoY29udGV4dCwgX2NvbnRleHQpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gc3BsaXRcblxuZnVuY3Rpb24gc3BsaXQocGFydHMsIGtleSwgX3BhaXJzLCBhbGwpIHtcbiAgdmFyIHBhaXJzID0gW1snKCcsICcpJ11dXG4gICAgLCBsYXllcnMgPSBbXVxuXG4gIHBhaXJzID0gX3BhaXJzIHx8IHBhaXJzXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKCFsYXllcnMubGVuZ3RoKSB7XG4gICAgICBmb3IodmFyIGogPSAwLCBsMiA9IGtleS5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICAgIGlmKHBhcnRzW2kgKyBqXSAhPT0ga2V5W2pdKSB7XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZihqID09PSBrZXkubGVuZ3RoKSB7XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYobGF5ZXJzLmxlbmd0aCAmJiBsYXllcnNbbGF5ZXJzLmxlbmd0aCAtIDFdID09PSBwYXJ0c1tpXSkge1xuICAgICAgbGF5ZXJzLnBvcCgpXG5cbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgZm9yKHZhciBqID0gMCwgbDIgPSBwYWlycy5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICBpZihwYXJ0c1tpXSA9PT0gcGFpcnNbal1bMF0pIHtcbiAgICAgICAgbGF5ZXJzLnB1c2gocGFpcnNbal1bMV0pXG5cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZihsYXllcnMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ1VubWF0Y2hlZCBwYWlyIGluICcgKyBwYXJ0cyArICcuIGV4cGVjdGluZzogJyArIGxheWVycy5wb3AoKVxuICAgIClcbiAgfVxuXG4gIGlmKGkgPT09IHBhcnRzLmxlbmd0aCkge1xuICAgIHJldHVybiBbcGFydHNdXG4gIH1cblxuICB2YXIgcmlnaHQgPSBwYXJ0cy5zbGljZShpICsga2V5Lmxlbmd0aClcbiAgICAsIGxlZnQgPSBwYXJ0cy5zbGljZSgwLCBpKVxuXG4gIGlmKCFhbGwpIHtcbiAgICByZXR1cm4gW2xlZnQsIHJpZ2h0XVxuICB9XG5cbiAgcmV0dXJuIFtsZWZ0XS5jb25jYXQoc3BsaXQocmlnaHQsIGtleSwgcGFpcnMsIGFsbCkpXG59XG4iLCJ2YXIgc3RyaW5nX3JlZ2V4cCA9IC9eXFxzKig/OicoKD86W14nXFxcXF18KD86XFxcXC4pKSopJ3xcIigoPzpbXlwiXFxcXF18KD86XFxcXC4pKSopXCIpXFxzKiQvXG4gICwgbnVtYmVyX3JlZ2V4cCA9IC9eXFxzKihcXGQqKD86XFwuXFxkKyk/KVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF90eXBlc1xuXG5mdW5jdGlvbiBhZGRfdHlwZXModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKVxuICB0eXBlcy5wdXNoKGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9zdHJpbmdfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goc3RyaW5nX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgdmFsID0gcGFydHNbMV0gfHwgcGFydHNbMl0gfHwgJydcblxuICByZXR1cm4gZnVuY3Rpb24oaWdub3JlLCBjb250ZXh0KSB7XG4gICAgY2hhbmdlKHZhbCwgY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKG51bWJlcl9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHZhbCA9ICtwYXJ0c1sxXVxuXG4gIHJldHVybiBmdW5jdGlvbihpZ25vcmUsIGNvbnRleHQpIHtcbiAgICBjaGFuZ2UodmFsLCBjb250ZXh0KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlXG5cbmZ1bmN0aW9uIGRlYm91bmNlKGZuLCBkZWxheSwgYXRfc3RhcnQsIGd1YXJhbnRlZSkge1xuICB2YXIgdGltZW91dFxuICAgICwgYXJnc1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG5cbiAgICBpZih0aW1lb3V0ICYmIChhdF9zdGFydCB8fCBndWFyYW50ZWUpKSB7XG4gICAgICByZXR1cm5cbiAgICB9IGVsc2UgaWYoIWF0X3N0YXJ0KSB7XG4gICAgICBjbGVhcigpXG5cbiAgICAgIHJldHVybiB0aW1lb3V0ID0gc2V0VGltZW91dChydW4sIGRlbGF5KVxuICAgIH1cblxuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFyLCBkZWxheSlcbiAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuXG4gICAgZnVuY3Rpb24gcnVuKCkge1xuICAgICAgY2xlYXIoKVxuICAgICAgZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KVxuICAgICAgdGltZW91dCA9IG51bGxcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQmF0Y2hcblxuZnVuY3Rpb24gQmF0Y2gocmVhZHksIGFsbCkge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCYXRjaCkpIHtcbiAgICByZXR1cm4gbmV3IEJhdGNoKHJlYWR5LCBhbGwpXG4gIH1cblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLmFsbCA9IGFsbFxuICB0aGlzLnJlYWR5ID0gcmVhZHlcbiAgdGhpcy5xdWV1ZCA9IGZhbHNlXG4gIHRoaXMucnVuID0gdGhpcy5ydW4uYmluZCh0aGlzKVxufVxuXG5CYXRjaC5wcm90b3R5cGUucXVldWUgPSBxdWV1ZVxuQmF0Y2gucHJvdG90eXBlLmFkZCA9IGFkZFxuQmF0Y2gucHJvdG90eXBlLnJ1biA9IHJ1blxuXG5mdW5jdGlvbiBhZGQoZm4pIHtcbiAgdmFyIHF1ZXVlZCA9IGZhbHNlXG4gICAgLCBiYXRjaCA9IHRoaXNcbiAgICAsIHNlbGZcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gcXVldWVcblxuICBmdW5jdGlvbiBxdWV1ZSgpIHtcbiAgICBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgc2VsZiA9IHRoaXNcblxuICAgIGlmKHF1ZXVlZCkge1xuICAgICAgcmV0dXJuIGJhdGNoLmFsbCAmJiBiYXRjaC5yZWFkeSgpXG4gICAgfVxuXG4gICAgcXVldWVkID0gdHJ1ZVxuICAgIGJhdGNoLnF1ZXVlKHJ1bilcbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICBxdWV1ZWQgPSBmYWxzZVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVldWUoZm4pIHtcbiAgdGhpcy5qb2JzLnB1c2goZm4pXG5cbiAgaWYodGhpcy5hbGwgfHwgIXRoaXMucXVldWVkKSB7XG4gICAgdGhpcy5xdWV1ZWQgPSB0cnVlXG4gICAgdGhpcy5yZWFkeSh0aGlzKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNcblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLnF1ZXVlZCA9IGZhbHNlXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGpvYnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgam9ic1tpXSgpXG4gIH1cbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
