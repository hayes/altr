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
  , add_lookup = require('./lib/lookup')
  , add_filter = require('./lib/filter')
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
add_filter(types)
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
    sync = true
    out = null
    part(data)
    sync = false

    if(out) {
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
  var part = build_part.call(this, key, finish)
    , context

  return call.bind(this)

  function call(val, ctx) {
    part(val, context = ctx || val)
  }

  function finish(val) {
    change.call(this, val, context)
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

  return function search(obj, ctx) {
    for(var i = 0, l = parts.length; obj && i < l; ++i) {
      obj = obj[parts[i]]
    }

    if(typeof obj === 'undefined' && ctx) {
      return search(ctx)
    }

    if(i === l) {
      return done(obj)
    }

    done()
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

  rest = this.split(rest, ':', ['?'], [':'])

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
    , lhs
    , rhs

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
    throw new Error('Unmatched ternary: ' + parts[0])
  }

  var content =  this.create_part(body.slice(0, i), update)
    , key = 'paren_' + Math.random().toString(16).slice(2)

  var template = this.create_part(key + body.slice(i + 1), change)

  return content

  function update(val, context) {
    context = Object.create(context)
    context[key] = val
    template(context)
  }
}

},{}],30:[function(require,module,exports){
module.exports = split

function split(parts, key, opens, closes, all) {
  var all_closes = [')', '}', ']']
    , all_opens = ['(', '{', '[']
    , sum = 0
    , split_point
    , index

  if(opens) {
    all_opens = all_opens.concat(opens)
  }

  if(closes) {
    all_closes = all_closes.concat(closes)
  }

  var counts = all_opens.map(function() {
    return 0
  })

  for(var i = 0, l = parts.length; i < l; ++i) {
    if(!sum && (split_point = parts.slice(i).indexOf(key)) === -1) {
      return [parts]
    }

    if(!sum && !split_point) {
      break
    }

    if((index = all_opens.indexOf(parts[i])) !== -1) {
      ++counts[index]
      ++sum
    } else if((index = all_closes.indexOf(parts[i])) !== -1) {
      --counts[index]
      --sum
    }

    for(var j = 0; j < counts.length; ++j) {
      if(counts[j] < 0) {
        throw new Error('Unmatched "' + all_opens[j] + '"" in ' + parts)
      }
    }
  }

  if(sum || i === parts.length) {
    return [parts]
  }

  var right = parts.slice(i + key.length)
    , left = parts.slice(0, i)

  if(!all) {
    return [left, right]
  }

  return [left].concat(split(right, key, opens, closes, all))
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

  return function() {
    change(parts[1] || parts[2])
  }
}

function create_number_accessor(parts, change) {
  if(!(parts = parts.match(number_regexp))) {
    return
  }

  return function() {
    change(+parts[1])
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZ2V0X2VsZW1lbnQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5zZXJ0LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3JhZi5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9yZW1vdmUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvcmVuZGVyLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3JlcGxhY2UuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvc2V0X2NoaWxkcmVuLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvY2hpbGRyZW4uanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvcGxhY2Vob2xkZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy90ZXh0LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3Mvd2l0aC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90ZW1wbGF0ZV9zdHJpbmcuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGV4dF9ub2RlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RvX3N0cmluZy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvYXJyb3cuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2NyZWF0ZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvZmlsdGVyLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9sb29rdXAuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL29wZXJhdG9ycy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvcGFyZW5zLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9zcGxpdC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvdHlwZXMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbm9kZV9tb2R1bGVzL2p1c3QtZGVib3VuY2UvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYmF0Y2gtcXVldWUvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckxBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciB0ZW1wbGF0ZV9zdHJpbmcgPSByZXF1aXJlKCcuL3RlbXBsYXRlX3N0cmluZycpXG4gICwgZWxlbWVudF9ub2RlID0gcmVxdWlyZSgnLi9lbGVtZW50X25vZGUnKVxuICAsIGFjY2Vzc29ycyA9IHJlcXVpcmUoJ2FsdHItYWNjZXNzb3JzJylcbiAgLCBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlclxuICAsIHRleHRfbm9kZSA9IHJlcXVpcmUoJy4vdGV4dF9ub2RlJylcbiAgLCB0b1N0cmluZyA9IHJlcXVpcmUoJy4vdG9fc3RyaW5nJylcbiAgLCBnZXRfZWwgPSByZXF1aXJlKCcuL2dldF9lbGVtZW50JylcbiAgLCBiYXRjaCA9IHJlcXVpcmUoJ2JhdGNoLXF1ZXVlJylcbiAgLCByZXBsYWNlID0gcmVxdWlyZSgnLi9yZXBsYWNlJylcbiAgLCByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpXG4gICwgaW5zZXJ0ID0gcmVxdWlyZSgnLi9pbnNlcnQnKVxuICAsIHJlbW92ZSA9IHJlcXVpcmUoJy4vcmVtb3ZlJylcbiAgLCByYWYgPSByZXF1aXJlKCcuL3JhZicpXG5cbnZhciBkb21fbW9kdWxlID0gJ21pY3JvLWRvbSdcblxuYWx0ci5maWx0ZXJzID0ge31cbmFsdHIuaW5jbHVkZXMgPSB7fVxuYWx0ci5yZW5kZXIgPSByZW5kZXJcbmFsdHIuYWRkVGFnID0gYWRkX3RhZ1xuYWx0ci5pbmNsdWRlID0gaW5jbHVkZVxuYWx0ci5hZGRGaWx0ZXIgPSBhZGRfZmlsdGVyXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuXG5mdW5jdGlvbiBhbHRyKHJvb3QsIGRhdGEsIHN5bmMsIGRvYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBzeW5jLCBkb2MpXG4gIH1cblxuICBpZighZ2xvYmFsLndpbmRvdykge1xuICAgIGRvYyA9IGRvYyB8fCByZXF1aXJlKGRvbV9tb2R1bGUpLmRvY3VtZW50XG4gIH1cblxuICBFRS5jYWxsKHRoaXMpXG4gIHRoaXMuc3luYyA9IHR5cGVvZiBzeW5jID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogc3luY1xuICB0aGlzLnJvb3QgPSByb290XG4gIHRoaXMuZG9jdW1lbnQgPSBkb2MgfHwgZ2xvYmFsLmRvY3VtZW50IHx8IHJlcXVpcmUoZG9tX21vZHVsZSlcbiAgdGhpcy5maWx0ZXJzID0gT2JqZWN0LmNyZWF0ZShhbHRyLmZpbHRlcnMpXG4gIHRoaXMuaW5jbHVkZXMgPSBPYmplY3QuY3JlYXRlKGFsdHIuaW5jbHVkZXMpXG4gIHRoaXMuYWNjZXNzb3JzID0gYWNjZXNzb3JzKHRoaXMuZmlsdGVycywgZmFsc2UpXG4gIHRoaXMuYmF0Y2ggPSBiYXRjaCgoZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zeW5jID8gdGhpcy5ydW5CYXRjaCgpIDogcmFmKHRoaXMucnVuQmF0Y2guYmluZCh0aGlzKSlcbiAgfSkuYmluZCh0aGlzKSlcblxuICBpZihnbG9iYWwuQnVmZmVyICYmIHJvb3QgaW5zdGFuY2VvZiBnbG9iYWwuQnVmZmVyKSB7XG4gICAgcm9vdCA9IHJvb3QudG9TdHJpbmcoKVxuICB9XG5cbiAgaWYodHlwZW9mIHJvb3QgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHJvb3RcbiAgICB0aGlzLnJvb3QgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXG4gICAgd2hpbGUodGVtcC5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGVtcC5maXJzdENoaWxkKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMuX3VwZGF0ZSA9IHRoaXMudXBkYXRlTm9kZXModGhpcy5yb290Tm9kZXMoKSlcblxuICBpZihkYXRhKSB7XG4gICAgdGhpcy51cGRhdGUoZGF0YSwgdHJ1ZSlcbiAgfVxufVxuXG5hbHRyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRUUucHJvdG90eXBlKVxuYWx0ci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBhbHRyXG5cbmFsdHIucHJvdG90eXBlLnRlbXBsYXRlU3RyaW5nID0gdGVtcGxhdGVfc3RyaW5nXG5hbHRyLnByb3RvdHlwZS5jcmVhdGVBY2Nlc3NvciA9IGNyZWF0ZV9hY2Nlc3NvclxuYWx0ci5wcm90b3R5cGUudXBkYXRlTm9kZXMgPSB1cGRhdGVfbm9kZXNcbmFsdHIucHJvdG90eXBlLmluaXROb2RlcyA9IGluaXRfbm9kZXNcbmFsdHIucHJvdG90eXBlLnJvb3ROb2RlcyA9IHJvb3Rfbm9kZXNcbmFsdHIucHJvdG90eXBlLmFkZEZpbHRlciA9IGFkZF9maWx0ZXJcbmFsdHIucHJvdG90eXBlLnJ1bkJhdGNoID0gcnVuX2JhdGNoXG5hbHRyLnByb3RvdHlwZS5pbml0Tm9kZSA9IGluaXRfbm9kZVxuYWx0ci5wcm90b3R5cGUudG9TdHJpbmcgPSB0b1N0cmluZ1xuYWx0ci5wcm90b3R5cGUuZ2V0RWxlbWVudCA9IGdldF9lbFxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIucHJvdG90eXBlLnJlcGxhY2UgPSByZXBsYWNlXG5hbHRyLnByb3RvdHlwZS5pbnRvID0gYXBwZW5kX3RvXG5hbHRyLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcbmFsdHIucHJvdG90eXBlLmluc2VydCA9IGluc2VydFxuYWx0ci5wcm90b3R5cGUucmVtb3ZlID0gcmVtb3ZlXG5hbHRyLnByb3RvdHlwZS50YWdMaXN0ID0gW11cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG52YXIgbm9kZV9oYW5kbGVycyA9IHt9XG5cbm5vZGVfaGFuZGxlcnNbMV0gPSBlbGVtZW50X25vZGVcbm5vZGVfaGFuZGxlcnNbM10gPSB0ZXh0X25vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEsIHN5bmMpIHtcbiAgdGhpcy5zdGF0ZSA9IGRhdGFcbiAgdGhpcy5fdXBkYXRlKGRhdGEpXG5cbiAgaWYoc3luYykge1xuICAgIHRoaXMuYmF0Y2gucnVuKClcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVfbm9kZXMobm9kZXMpIHtcbiAgdmFyIGhvb2tzID0gdGhpcy5pbml0Tm9kZXMobm9kZXMpXG4gICAgLCBzZWxmID0gdGhpc1xuXG4gIHJldHVybiB1cGRhdGVcblxuICBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBob29rcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGhvb2tzW2ldLmNhbGwoc2VsZiwgZGF0YSlcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdF9ub2Rlcyhub2RlcywgbGlzdCkge1xuICB2YXIgaG9va3MgPSBbXS5zbGljZS5jYWxsKG5vZGVzKVxuICAgIC5tYXAoaW5pdF9ub2RlLmJpbmQodGhpcykpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5yZWR1Y2UoZmxhdHRlbiwgW10pXG5cbiAgcmV0dXJuIGhvb2tzXG5cbiAgZnVuY3Rpb24gZmxhdHRlbihsaHMsIHJocykge1xuICAgIHJldHVybiBsaHMuY29uY2F0KHJocylcbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0X25vZGUoZWwpIHtcbiAgcmV0dXJuIG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdID9cbiAgICBub2RlX2hhbmRsZXJzW2VsLm5vZGVUeXBlXS5jYWxsKHRoaXMsIGVsKSA6XG4gICAgZWwuY2hpbGROb2RlcyAmJiBlbC5jaGlsZE5vZGVzLmxlbmd0aCA/XG4gICAgdGhpcy5pbml0Tm9kZXMoZWwuY2hpbGROb2RlcykgOlxuICAgIG51bGxcbn1cblxuZnVuY3Rpb24gcm9vdF9ub2RlcygpIHtcbiAgcmV0dXJuIHRoaXMucm9vdC5ub2RlVHlwZSA9PT0gdGhpcy5kb2N1bWVudC5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFID9cbiAgICBbXS5zbGljZS5jYWxsKHRoaXMucm9vdC5jaGlsZE5vZGVzKSA6XG4gICAgW3RoaXMucm9vdF1cbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmaWx0ZXIpIHtcbiAgYWx0ci5maWx0ZXJzW25hbWVdID0gZmlsdGVyXG59XG5cbmZ1bmN0aW9uIGFkZF90YWcoYXR0ciwgdGFnKSB7XG4gIGFsdHIucHJvdG90eXBlLnRhZ3NbYXR0cl0gPSB0YWdcbiAgYWx0ci5wcm90b3R5cGUudGFnTGlzdC5wdXNoKHtcbiAgICAgIGF0dHI6IGF0dHJcbiAgICAsIGNvbnN0cnVjdG9yOiB0YWdcbiAgfSlcbn1cblxuZnVuY3Rpb24gYXBwZW5kX3RvKG5vZGUpIHtcbiAgdmFyIHJvb3Rfbm9kZXMgPSB0aGlzLnJvb3ROb2RlcygpXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHJvb3Rfbm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgbm9kZS5hcHBlbmRDaGlsZChnZXRfZWwocm9vdF9ub2Rlc1tpXSkpXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5jbHVkZShuYW1lLCB0ZW1wbGF0ZSkge1xuICByZXR1cm4gdGhpcy5pbmNsdWRlc1tuYW1lXSA9IHRlbXBsYXRlXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9hY2Nlc3NvcihkZXNjcmlwdGlvbiwgY2hhbmdlKSB7XG4gIHJldHVybiB0aGlzLmFjY2Vzc29ycy5jcmVhdGUoZGVzY3JpcHRpb24sIGNoYW5nZSwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZm4pIHtcbiAgcmV0dXJuIHRoaXMuZmlsdGVyc1tuYW1lXSA9IGZuXG59XG5cbmZ1bmN0aW9uIHJ1bl9iYXRjaCgpIHtcbiAgdGhpcy5iYXRjaC5ydW4oKVxuICB0aGlzLmVtaXQoJ3VwZGF0ZScsIHRoaXMuc3RhdGUpXG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwuYWx0ciA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX2VsZW1lbnRfbm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVfZWxlbWVudF9ub2RlKGVsKSB7XG4gIHZhciBhbHRyX3RhZ3MgPSB7fVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGhvb2tzID0gW11cbiAgICAsIGF0dHJcblxuICB2YXIgYXR0cnMgPSBBcnJheS5wcm90b3R5cGUuZmlsdGVyLmNhbGwoZWwuYXR0cmlidXRlcywgZnVuY3Rpb24oYXR0cikge1xuICAgIHJldHVybiBhbHRyLnRhZ3NbYXR0ci5uYW1lXSA/XG4gICAgICAoYWx0cl90YWdzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlKSAmJiBmYWxzZSA6XG4gICAgICB0cnVlXG4gIH0pXG5cbiAgYXR0cnMuZm9yRWFjaChmdW5jdGlvbihhdHRyKSB7XG4gICAgdmFyIHZhbHVlID0gYXR0ci52YWx1ZVxuICAgICAgLCBuYW1lID0gYXR0ci5uYW1lXG5cbiAgICBpZighbmFtZS5pbmRleE9mKCdhbHRyLWF0dHItJykpIHtcbiAgICAgIG5hbWUgPSBhdHRyLm5hbWUuc2xpY2UoJ2FsdHItYXR0ci0nLmxlbmd0aClcbiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyLm5hbWUpXG4gICAgfVxuXG4gICAgdmFyIGF0dHJfaG9vayA9IGFsdHIudGVtcGxhdGVTdHJpbmcodmFsdWUsIGFsdHIuYmF0Y2guYWRkKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbClcbiAgICB9KSlcblxuICAgIGlmKGF0dHJfaG9vaykge1xuICAgICAgaG9va3MucHVzaChhdHRyX2hvb2spXG4gICAgfVxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhbHRyLnRhZ0xpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYXR0ciA9IGFsdHJfdGFnc1thbHRyLnRhZ0xpc3RbaV0uYXR0cl0pIHtcbiAgICAgIGhvb2tzLnB1c2goYWx0ci50YWdMaXN0W2ldLmNvbnN0cnVjdG9yLmNhbGwoYWx0ciwgZWwsIGF0dHIpKVxuXG4gICAgICByZXR1cm4gaG9va3NcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaG9va3MuY29uY2F0KGFsdHIuaW5pdE5vZGVzKGVsLmNoaWxkTm9kZXMpKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBnZXRfZWxcblxuZnVuY3Rpb24gZ2V0X2VsKGVsKSB7XG4gIHdoaWxlKGVsICYmIGVsLl9hbHRyX3BsYWNlaG9sZGVyKSB7XG4gICAgZWwgPSBlbC5fYWx0cl9wbGFjZWhvbGRlclxuICB9XG5cbiAgcmV0dXJuIGVsXG59XG4iLCJ2YXIgcGxhY2Vob2xkZXIgPSByZXF1aXJlKCcuL3RhZ3MvcGxhY2Vob2xkZXInKVxuICAsIGNoaWxkcmVuX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9jaGlsZHJlbicpXG4gICwgaW5jbHVkZV90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaW5jbHVkZScpXG4gICwgdGV4dF90YWcgPSByZXF1aXJlKCcuL3RhZ3MvdGV4dCcpXG4gICwgaHRtbF90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaHRtbCcpXG4gICwgd2l0aF90YWcgPSByZXF1aXJlKCcuL3RhZ3Mvd2l0aCcpXG4gICwgZm9yX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9mb3InKVxuICAsIGlmX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9pZicpXG4gICwgYWx0ciA9IHJlcXVpcmUoJy4vYWx0cicpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuXG5hbHRyLmFkZFRhZygnYWx0ci1wbGFjZWhvbGRlcicsIHBsYWNlaG9sZGVyKVxuYWx0ci5hZGRUYWcoJ2FsdHItY2hpbGRyZW4nLCBjaGlsZHJlbl90YWcpXG5hbHRyLmFkZFRhZygnYWx0ci1pbmNsdWRlJywgaW5jbHVkZV90YWcpXG5hbHRyLmFkZFRhZygnYWx0ci10ZXh0JywgdGV4dF90YWcpXG5hbHRyLmFkZFRhZygnYWx0ci1odG1sJywgaHRtbF90YWcpXG5hbHRyLmFkZFRhZygnYWx0ci13aXRoJywgd2l0aF90YWcpXG5hbHRyLmFkZFRhZygnYWx0ci1mb3InLCBmb3JfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItaWYnLCBpZl90YWcpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluc2VydFxuXG5mdW5jdGlvbiBpbnNlcnQocGFyZW50LCBlbCwgYmVmb3JlKSB7XG4gIHZhciBpbnNlcnRlZCA9IGVsLnBhcmVudE5vZGUgIT09IHBhcmVudFxuXG4gIGJlZm9yZSA9IGJlZm9yZSB8fCBudWxsXG5cbiAgaWYoaW5zZXJ0ZWQgfHwgZWwubmV4dFNpYmxpbmcgIT09IGJlZm9yZSkge1xuICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoZWwsIGJlZm9yZSlcbiAgfVxuXG4gIGlmKGluc2VydGVkKSB7XG4gICAgdGhpcy5lbWl0KCdpbnNlcnQnLCBlbCwgcGFyZW50KVxuICB9XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3RBbmltYXRpb25GcmFtZVxuXG5mdW5jdGlvbiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgdmFyIHJhZiA9IGdsb2JhbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIHRpbWVvdXRcblxuICByZXR1cm4gcmFmKGNhbGxiYWNrKVxuXG4gIGZ1bmN0aW9uIHRpbWVvdXQoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKVxuICB9XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSByZW1vdmVcblxuZnVuY3Rpb24gcmVtb3ZlKHBhcmVudCwgZWwpIHtcbiAgcGFyZW50LnJlbW92ZUNoaWxkKGVsKVxuICB0aGlzLmVtaXQoJ3JlbW92ZScsIGVsLCBwYXJlbnQpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlbmRlclxuXG5mdW5jdGlvbiByZW5kZXIodGVtcGxhdGUsIHN0YXRlLCBlbCkge1xuICBpZih0aGlzLmluY2x1ZGVzW3RlbXBsYXRlXSkge1xuICAgIHRlbXBsYXRlID0gdGhpcy5pbmNsdWRlc1t0ZW1wbGF0ZV1cbiAgfVxuXG4gIHZhciBpbnN0YW5jZSA9IHRoaXModGVtcGxhdGUpXG5cbiAgaW5zdGFuY2UudXBkYXRlKHN0YXRlIHx8IHt9LCB0cnVlKVxuXG4gIGlmKGVsKSB7XG4gICAgaW5zdGFuY2UuaW50byhlbClcbiAgfVxuXG4gIHJldHVybiBpbnN0YW5jZVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXBsYWNlXG5cbmZ1bmN0aW9uIHJlcGxhY2UocGFyZW50LCBlbCwgb2xkKSB7XG4gIHBhcmVudC5yZXBsYWNlQ2hpbGQoZWwsIG9sZClcbiAgdGhpcy5lbWl0KCdyZXBsYWNlJywgZWwsIG9sZCwgcGFyZW50KVxuICB0aGlzLmVtaXQoJ2luc2VydCcsIGVsLCBwYXJlbnQpXG4gIHRoaXMuZW1pdCgncmVtb3ZlJywgb2xkLCBwYXJlbnQpXG59XG4iLCJ2YXIgZ2V0ID0gcmVxdWlyZSgnLi9nZXRfZWxlbWVudCcpXG5cbm1vZHVsZS5leHBvcnRzID0gc2V0X2NoaWxkcmVuXG5cbmZ1bmN0aW9uIHNldF9jaGlsZHJlbihyb290LCBub2Rlcykge1xuICB2YXIgcHJldiA9IG51bGxcbiAgICAsIGVsXG5cbiAgZm9yKHZhciBpID0gbm9kZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICBlbCA9IGdldChub2Rlc1tpXSlcbiAgICB0aGlzLmluc2VydChyb290LCBlbCwgcHJldilcbiAgICBwcmV2ID0gZWxcbiAgfVxuXG4gIHdoaWxlKChlbCA9IHJvb3QuZmlyc3RDaGlsZCkgIT09IHByZXYpIHtcbiAgICB0aGlzLnJlbW92ZShyb290LCBlbClcbiAgfVxufVxuIiwidmFyIHNldF9jaGlsZHJlbiA9IHJlcXVpcmUoJy4uL3NldF9jaGlsZHJlbicpXG5cbm1vZHVsZS5leHBvcnRzID0gY2hpbGRyZW5cblxuZnVuY3Rpb24gY2hpbGRyZW4oZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZUFjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUuYmluZCh0aGlzKSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIHZhciBub2RlcyA9IEFycmF5LmlzQXJyYXkodmFsKSA/IHZhbCA6IFt2YWxdXG5cbiAgICBzZXRfY2hpbGRyZW4uY2FsbCh0aGlzLCBlbCwgbm9kZXMuZmlsdGVyKGlzX25vZGUpKVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzX25vZGUoZWwpIHtcbiAgcmV0dXJuIGVsICYmIGVsLm5vZGVUeXBlXG59XG4iLCJ2YXIgc2V0X2NoaWxkcmVuID0gcmVxdWlyZSgnLi4vc2V0X2NoaWxkcmVuJylcbiAgLCBmb3JfcmVnZXhwID0gL14oLio/KVxccytpblxccysoLiokKS9cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JfaGFuZGxlclxuXG5mdW5jdGlvbiBmb3JfaGFuZGxlcihyb290LCBhcmdzKSB7XG4gIHZhciBwYXJ0cyA9IGFyZ3MubWF0Y2goZm9yX3JlZ2V4cClcbiAgICAsIHRlbXBsYXRlID0gcm9vdC5pbm5lckhUTUxcbiAgICAsIGRvbV9ub2RlcyA9IFtdXG4gICAgLCBjaGlsZHJlbiA9IFtdXG4gICAgLCBhbHRyID0gdGhpc1xuICAgICwgaXRlbXMgPSBbXVxuXG4gIGlmKCFwYXJ0cykge1xuICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBmb3IgdGFnOiAnICsgYXJncylcbiAgfVxuXG4gIHJvb3QuaW5uZXJIVE1MID0gJydcblxuICB2YXIgdW5pcXVlID0gcGFydHNbMV0uc3BsaXQoJzonKVsxXVxuICAgICwgcHJvcCA9IHBhcnRzWzFdLnNwbGl0KCc6JylbMF1cbiAgICAsIGtleSA9IHBhcnRzWzJdXG5cbiAgdmFyIHJ1bl91cGRhdGVzID0gdGhpcy5iYXRjaC5hZGQocnVuX2RvbV91cGRhdGVzKVxuXG4gIHJldHVybiBhbHRyLmNyZWF0ZUFjY2Vzc29yKGtleSwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZV9jaGlsZHJlbihkYXRhKSB7XG4gICAgdmFyIGl0ZW1fZGF0YVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaXRlbV9kYXRhID0gT2JqZWN0LmNyZWF0ZShkYXRhKVxuICAgICAgaXRlbV9kYXRhW3Byb3BdID0gaXRlbXNbaV1cbiAgICAgIGl0ZW1fZGF0YVsnJGluZGV4J10gPSBpXG5cbiAgICAgIGNoaWxkcmVuW2ldLnVwZGF0ZSAmJiBjaGlsZHJlbltpXS51cGRhdGUoaXRlbV9kYXRhKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShuZXdfaXRlbXMsIGRhdGEpIHtcbiAgICBpZighQXJyYXkuaXNBcnJheShuZXdfaXRlbXMpKSB7XG4gICAgICBuZXdfaXRlbXMgPSBbXVxuICAgIH1cblxuICAgIHZhciBuZXdfY2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3X2l0ZW1zLmxlbmd0aClcbiAgICAgICwgaW5kZXhcblxuICAgIGRvbV9ub2RlcyA9IFtdXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbmV3X2l0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaW5kZXggPSBmaW5kX2luZGV4KGl0ZW1zLCBuZXdfaXRlbXNbaV0sIHVuaXF1ZSlcblxuICAgICAgaWYoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IChjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpWzBdKVxuICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdfY2hpbGRyZW5baV0gPSBtYWtlX2NoaWxkcmVuKClcbiAgICAgIH1cblxuICAgICAgZG9tX25vZGVzID0gZG9tX25vZGVzLmNvbmNhdChuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzKVxuICAgIH1cblxuICAgIGNoaWxkcmVuID0gbmV3X2NoaWxkcmVuLnNsaWNlKClcbiAgICBpdGVtcyA9IG5ld19pdGVtcy5zbGljZSgpXG4gICAgcnVuX3VwZGF0ZXMuY2FsbChhbHRyKVxuICAgIHVwZGF0ZV9jaGlsZHJlbihkYXRhKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluZF9pbmRleChpdGVtcywgZCwgdW5pcXVlKSB7XG4gICAgaWYoIXVuaXF1ZSkge1xuICAgICAgcmV0dXJuIGl0ZW1zLmluZGV4T2YoZClcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gaXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpZihpdGVtc1tpXVt1bmlxdWVdID09PSBkW3VuaXF1ZV0pIHtcbiAgICAgICAgcmV0dXJuIGlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gLTFcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VfY2hpbGRyZW4oKSB7XG4gICAgdmFyIHRlbXAgPSBhbHRyLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhyb290Lm5hbWVzcGFjZVVSSSwgJ2RpdicpXG4gICAgICAsIGRvbV9ub2Rlc1xuICAgICAgLCB1cGRhdGVcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gdGVtcGxhdGVcblxuICAgIGRvbV9ub2RlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRlbXAuY2hpbGROb2RlcylcbiAgICB1cGRhdGUgPSBhbHRyLnVwZGF0ZU5vZGVzKGRvbV9ub2RlcylcblxuICAgIHJldHVybiB7XG4gICAgICAgIGRvbV9ub2RlczogZG9tX25vZGVzXG4gICAgICAsIHVwZGF0ZTogdXBkYXRlXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcnVuX2RvbV91cGRhdGVzKCkge1xuICAgIHNldF9jaGlsZHJlbi5jYWxsKHRoaXMsIHJvb3QsIGRvbV9ub2RlcylcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBodG1sXG5cbmZ1bmN0aW9uIGh0bWwoZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZUFjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC5pbm5lckhUTUwgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG5cbiAgICBpZihlbC5nZXRBdHRyaWJ1dGUoJ2FsdHItcnVuLXNjcmlwdHMnKSkge1xuICAgICAgW10uZm9yRWFjaC5jYWxsKGVsLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgcnVuKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBydW4oc2NyaXB0KSB7XG4gIHZhciBmaXhlZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgLCBwYXJlbnQgPSBzY3JpcHQucGFyZW50Tm9kZVxuICAgICwgYXR0cnMgPSBzY3JpcHQuYXR0cmlidXRlc1xuICAgICwgc3JjXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGF0dHJzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGZpeGVkLnNldEF0dHJpYnV0ZShhdHRyc1tpXS5uYW1lLCBhdHRyc1tpXS52YWx1ZSlcbiAgfVxuXG4gIGZpeGVkLnRleHRDb250ZW50ID0gc2NyaXB0LnRleHRDb250ZW50XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoZml4ZWQsIHNjcmlwdClcbiAgcGFyZW50LnJlbW92ZUNoaWxkKHNjcmlwdClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaWZfdGFnXG5cbmZ1bmN0aW9uIGlmX3RhZyhlbCwgYWNjZXNzb3IpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgICAsIHVwZGF0ZV9jaGlsZHJlbiA9IHRoaXMudXBkYXRlTm9kZXMoZWwuY2hpbGROb2RlcylcbiAgICAsIGhpZGRlbiA9IG51bGxcbiAgICAsIGFsdHIgPSB0aGlzXG5cbiAgdmFyIGhpZGUgPSB0aGlzLmJhdGNoLmFkZChmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZVxuXG4gICAgaWYoIWhpZGRlbikge1xuICAgICAgYWx0ci5yZXBsYWNlKGVsLnBhcmVudE5vZGUsIHBsYWNlaG9sZGVyLCBlbClcbiAgICAgIGVsLl9hbHRyX3BsYWNlaG9sZGVyID0gcGxhY2Vob2xkZXJcbiAgICAgIGhpZGRlbiA9IHRydWVcbiAgICB9XG4gIH0pXG5cbiAgdmFyIHNob3cgPSB0aGlzLmJhdGNoLmFkZChmdW5jdGlvbigpIHtcbiAgICBpZihoaWRkZW4pIHtcbiAgICAgIGFsdHIucmVwbGFjZShwbGFjZWhvbGRlci5wYXJlbnROb2RlLCBlbCwgcGxhY2Vob2xkZXIpXG4gICAgICBkZWxldGUgZWwuX2FsdHJfcGxhY2Vob2xkZXJcbiAgICAgIGhpZGRlbiA9IGZhbHNlXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiB0aGlzLmNyZWF0ZUFjY2Vzc29yKGFjY2Vzc29yLCB0b2dnbGUpXG5cbiAgZnVuY3Rpb24gdG9nZ2xlKHZhbCwgZGF0YSkge1xuICAgIGlmKCF2YWwpIHtcbiAgICAgIHJldHVybiBoaWRlKClcbiAgICB9XG5cbiAgICBzaG93KClcbiAgICB1cGRhdGVfY2hpbGRyZW4oZGF0YSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmNsdWRlXG5cbmZ1bmN0aW9uIGluY2x1ZGUoZWwsIG5hbWUpIHtcbiAgZWwuaW5uZXJIVE1MID0gdGhpcy5pbmNsdWRlc1tuYW1lXVxuXG4gIHJldHVybiB0aGlzLnVwZGF0ZU5vZGVzKGVsLmNoaWxkTm9kZXMpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHBsYWNlaG9sZGVyXG5cbmZ1bmN0aW9uIHBsYWNlaG9sZGVyKGVsLCBhY2Nlc3Nvcikge1xuICB2YXIgYWx0ciA9IHRoaXNcblxuICByZXR1cm4gdGhpcy5iYXRjaC5hZGQodGhpcy5jcmVhdGVBY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgaWYoIXZhbC5ub2RlTmFtZSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgYWx0ci5yZXBsYWNlKGVsLnBhcmVudE5vZGUsIHZhbCwgZWwpXG4gICAgZWwuX2FsdHJfcGxhY2Vob2xkZXIgPSB2YWxcbiAgICBlbCA9IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRleHRcblxuZnVuY3Rpb24gdGV4dChlbCwgYWNjZXNzb3IpIHtcbiAgcmV0dXJuIHRoaXMuYmF0Y2guYWRkKHRoaXMuY3JlYXRlQWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHdpdGhfdGFnXG5cbmZ1bmN0aW9uIHdpdGhfdGFnKGVsLCBhY2Nlc3Nvcikge1xuICByZXR1cm4gdGhpcy5jcmVhdGVBY2Nlc3NvcihhY2Nlc3NvciwgdGhpcy51cGRhdGVOb2RlcyhlbC5jaGlsZE5vZGVzKSlcbn1cbiIsInZhciBUQUcgPSAve3tcXHMqKC4qPylcXHMqfX0vXG5cbm1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVfc3RyaW5nXG5cbmZ1bmN0aW9uIHRlbXBsYXRlX3N0cmluZyh0ZW1wbGF0ZSwgY2hhbmdlKSB7XG4gIGlmKCF0ZW1wbGF0ZS5tYXRjaChUQUcpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGVtcGxhdGVcbiAgICAsIHBhcnRzID0gW11cbiAgICAsIGhvb2tzID0gW11cbiAgICAsIHRpbWVyXG4gICAgLCBpbmRleFxuICAgICwgbmV4dFxuXG4gIHdoaWxlKHJlbWFpbmluZyAmJiAobmV4dCA9IHJlbWFpbmluZy5tYXRjaChUQUcpKSkge1xuICAgIGlmKGluZGV4ID0gcmVtYWluaW5nLmluZGV4T2YobmV4dFswXSkpIHtcbiAgICAgIHBhcnRzLnB1c2gocmVtYWluaW5nLnNsaWNlKDAsIGluZGV4KSlcbiAgICB9XG5cbiAgICBwYXJ0cy5wdXNoKCcnKVxuICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZy5zbGljZShpbmRleCArIG5leHRbMF0ubGVuZ3RoKVxuICAgIGhvb2tzLnB1c2goXG4gICAgICAgIHRoaXMuY3JlYXRlQWNjZXNzb3IobmV4dFsxXSwgc2V0X3BhcnQuYmluZCh0aGlzLCBwYXJ0cy5sZW5ndGggLSAxKSlcbiAgICApXG4gIH1cblxuICBwYXJ0cy5wdXNoKHJlbWFpbmluZylcblxuICByZXR1cm4gdXBkYXRlXG5cbiAgZnVuY3Rpb24gc2V0X3BhcnQoaWR4LCB2YWwpIHtcbiAgICBwYXJ0c1tpZHhdID0gdmFsXG4gICAgY2hhbmdlKHBhcnRzLmpvaW4oJycpKVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgICBob29rcy5mb3JFYWNoKGZ1bmN0aW9uKGhvb2spIHtcbiAgICAgIGhvb2soZGF0YSlcbiAgICB9KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluaXRfdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIGluaXRfdGV4dF9ub2RlKGVsKSB7XG4gIHZhciBob29rID0gdGhpcy50ZW1wbGF0ZVN0cmluZyhlbC50ZXh0Q29udGVudCwgdGhpcy5iYXRjaC5hZGQodXBkYXRlKSlcblxuICByZXR1cm4gaG9vayA/IFtob29rXSA6IG51bGxcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0b1N0cmluZ1xuXG5mdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgcmV0dXJuIHRoaXMucm9vdE5vZGVzKCkubWFwKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBzd2l0Y2gobm9kZS5ub2RlVHlwZSkge1xuICAgICAgY2FzZSB0aGlzLmRvY3VtZW50LkRPQ1VNRU5UX0ZSQUdNRU5UX05PREU6XG4gICAgICBjYXNlIHRoaXMuZG9jdW1lbnQuQ09NTUVOVF9OT0RFOiByZXR1cm4gY2xvbmUuY2FsbCh0aGlzLCBub2RlKVxuICAgICAgY2FzZSB0aGlzLmRvY3VtZW50LlRFWFRfTk9ERTogcmV0dXJuIG5vZGUudGV4dENvbnRlbnRcbiAgICAgIGRlZmF1bHQ6IHJldHVybiBub2RlLm91dGVySFRNTFxuICAgIH1cbiAgfSwgdGhpcykuam9pbignJylcblxuICBmdW5jdGlvbiBjbG9uZShub2RlKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmFwcGVuZENoaWxkKG5vZGUuY2xvbmVOb2RlKCkpXG5cbiAgICByZXR1cm4gdGVtcC5pbm5lckhUTUxcbiAgfVxufVxuIiwidmFyIGFkZF9vcGVyYXRvcnMgPSByZXF1aXJlKCcuL2xpYi9vcGVyYXRvcnMnKVxuICAsIGNyZWF0ZV9hY2Nlc29yID0gcmVxdWlyZSgnLi9saWIvY3JlYXRlJylcbiAgLCBhZGRfbG9va3VwID0gcmVxdWlyZSgnLi9saWIvbG9va3VwJylcbiAgLCBhZGRfZmlsdGVyID0gcmVxdWlyZSgnLi9saWIvZmlsdGVyJylcbiAgLCBhZGRfcGFyZW5zID0gcmVxdWlyZSgnLi9saWIvcGFyZW5zJylcbiAgLCBkZWJvdW5jZSA9IHJlcXVpcmUoJ2p1c3QtZGVib3VuY2UnKVxuICAsIGFkZF90eXBlcyA9IHJlcXVpcmUoJy4vbGliL3R5cGVzJylcbiAgLCBhZGRfYXJyb3cgPSByZXF1aXJlKCcuL2xpYi9hcnJvdycpXG4gICwgc3BsaXQgPSByZXF1aXJlKCcuL2xpYi9zcGxpdCcpXG4gICwgdHlwZXMgPSBbXVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yc1xuXG4vLyBvcmRlciBpcyBpbXBvcnRhbnRcbmFkZF90eXBlcyh0eXBlcylcbmFkZF9hcnJvdyh0eXBlcylcbmFkZF9maWx0ZXIodHlwZXMpXG5hZGRfcGFyZW5zKHR5cGVzKVxuYWRkX29wZXJhdG9ycyh0eXBlcylcbmFkZF9sb29rdXAodHlwZXMpXG5cbmFjY2Vzc29ycy5wcm90b3R5cGUuY3JlYXRlX3BhcnQgPSBjcmVhdGVfYWNjZXNvclxuYWNjZXNzb3JzLnByb3RvdHlwZS5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlclxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGUgPSBjcmVhdGVcbmFjY2Vzc29ycy5wcm90b3R5cGUudHlwZXMgPSB0eXBlc1xuYWNjZXNzb3JzLnByb3RvdHlwZS5zcGxpdCA9IHNwbGl0XG5cbmZ1bmN0aW9uIGFjY2Vzc29ycyhmaWx0ZXJzLCBkZWxheSkge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhY2Nlc3NvcnMpKSB7XG4gICAgcmV0dXJuIG5ldyBhY2Nlc3NvcnMoZmlsdGVycywgZGVsYXkpXG4gIH1cblxuICBpZighZGVsYXkgJiYgZGVsYXkgIT09IGZhbHNlKSB7XG4gICAgZGVsYXkgPSAwXG4gIH1cblxuICB0aGlzLmRlbGF5ID0gZGVsYXlcbiAgdGhpcy5maWx0ZXJzID0gZmlsdGVycyB8fCB7fVxufVxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKG5hbWUsIGZuKSB7XG4gIHRoaXMuZmlsdGVyc1tuYW1lXSA9IGZuXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShzdHIsIGNoYW5nZSwgYWxsKSB7XG4gIHZhciBwYXJ0ID0gdGhpcy5jcmVhdGVfcGFydChcbiAgICAgIHN0clxuICAgICwgdGhpcy5kZWxheSA9PT0gZmFsc2UgPyB1cGRhdGUgOiBkZWJvdW5jZShjaGFuZ2UsIHRoaXMuZGVsYXksIGZhbHNlLCB0cnVlKVxuICApXG5cbiAgdmFyIHN5bmMgPSBmYWxzZVxuICAgICwgcHJldiA9IHt9XG4gICAgLCBvdXRcblxuICByZXR1cm4gd3JpdGVcblxuICBmdW5jdGlvbiB3cml0ZShkYXRhKSB7XG4gICAgc3luYyA9IHRydWVcbiAgICBvdXQgPSBudWxsXG4gICAgcGFydChkYXRhKVxuICAgIHN5bmMgPSBmYWxzZVxuXG4gICAgaWYob3V0KSB7XG4gICAgICBjaGFuZ2UuYXBwbHkobnVsbCwgb3V0KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGN0eCkge1xuICAgIGlmKCFhbGwgJiYgdHlwZW9mIHZhbCAhPT0gJ29iamVjdCcgJiYgdmFsID09PSBwcmV2KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBvdXQgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICBwcmV2ID0gdmFsXG5cbiAgICBpZighc3luYykge1xuICAgICAgY2hhbmdlLmFwcGx5KG51bGwsIG91dClcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWRkX2Fycm93XG5cbmZ1bmN0aW9uIGFkZF9hcnJvdyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9hcnJvdylcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2Fycm93KHBhcnRzLCBjaGFuZ2UpIHtcbiAgcGFydHMgPSB0aGlzLnNwbGl0KHBhcnRzLCAnLT4nKVxuXG4gIGlmKHBhcnRzLmxlbmd0aCA8IDIpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByaWdodCA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMV0sIGNoYW5nZSlcbiAgICAsIGxlZnQgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzBdLCB1cGRhdGUpXG5cbiAgcmV0dXJuIGxlZnRcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjdHgpIHtcbiAgICByaWdodCh2YWwsIGN0eClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhY2Nlc3NvclxuXG5mdW5jdGlvbiBhY2Nlc3NvcihrZXksIGNoYW5nZSkge1xuICB2YXIgcGFydCA9IGJ1aWxkX3BhcnQuY2FsbCh0aGlzLCBrZXksIGZpbmlzaClcbiAgICAsIGNvbnRleHRcblxuICByZXR1cm4gY2FsbC5iaW5kKHRoaXMpXG5cbiAgZnVuY3Rpb24gY2FsbCh2YWwsIGN0eCkge1xuICAgIHBhcnQodmFsLCBjb250ZXh0ID0gY3R4IHx8IHZhbClcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmlzaCh2YWwpIHtcbiAgICBjaGFuZ2UuY2FsbCh0aGlzLCB2YWwsIGNvbnRleHQpXG4gIH1cbn1cblxuZnVuY3Rpb24gYnVpbGRfcGFydChwYXJ0LCBjaGFuZ2UpIHtcbiAgdmFyIGFjY2Vzc29yXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMudHlwZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYWNjZXNzb3IgPSB0aGlzLnR5cGVzW2ldLmNhbGwodGhpcywgcGFydCwgY2hhbmdlKSkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgZmlsdGVyX3JlZ2V4cCA9IC9eXFxzKihbXlxccyhdKylcXCgoLiopXFwpXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX2ZpbHRlclxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2ZpbHRlcilcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2ZpbHRlcihwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChmaWx0ZXJfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBmaWx0ZXIgPSB0aGlzLmZpbHRlcnNbcGFydHNbMV1dXG5cbiAgaWYoIWZpbHRlcikge1xuICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgZmlsdGVyOiAnICsgcGFydHNbMV0pXG4gIH1cblxuICByZXR1cm4gZmlsdGVyLmNhbGwodGhpcywgdGhpcy5zcGxpdChwYXJ0c1syXSwgJywnLCBudWxsLCBudWxsLCB0cnVlKSwgY2hhbmdlKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhZGRfbG9va3VwXG5cbmZ1bmN0aW9uIGFkZF9sb29rdXAodHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfbG9va3VwKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbG9va3VwKHBhdGgsIGNoYW5nZSkge1xuICBpZighcGF0aC5pbmRleE9mKCckZGF0YScpKSB7XG4gICAgcGF0aCA9IHBhdGguc2xpY2UoJyRkYXRhLicubGVuZ3RoKVxuXG4gICAgaWYoIXBhdGgpIHtcbiAgICAgIHJldHVybiBjaGFuZ2VcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbG9va3VwKHBhdGgubWF0Y2goL1xccyooLipbXlxcc10pXFxzKi8pWzFdLCBjaGFuZ2UpXG59XG5cbmZ1bmN0aW9uIGxvb2t1cChwYXRoLCBkb25lKSB7XG4gIHZhciBwYXJ0cyA9IHBhdGggPyBwYXRoLnNwbGl0KCcuJykgOiBbXVxuXG4gIHJldHVybiBmdW5jdGlvbiBzZWFyY2gob2JqLCBjdHgpIHtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBvYmogJiYgaSA8IGw7ICsraSkge1xuICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXVxuICAgIH1cblxuICAgIGlmKHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnICYmIGN0eCkge1xuICAgICAgcmV0dXJuIHNlYXJjaChjdHgpXG4gICAgfVxuXG4gICAgaWYoaSA9PT0gbCkge1xuICAgICAgcmV0dXJuIGRvbmUob2JqKVxuICAgIH1cblxuICAgIGRvbmUoKVxuICB9XG59XG4iLCJ2YXIgdGVybmFyeV9yZWdleHAgPSAvXlxccyooLis/KVxccypcXD8oLiopXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX29wZXJhdG9yc1xuXG5mdW5jdGlvbiBhZGRfb3BlcmF0b3JzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3Rlcm5hcnkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfFxcXFx8J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ3wnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnXiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJz09PScsICchPT0nLCAnPT0nLCAnIT0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPj0nLCAnPD0nLCAnPicsICc8JywgJyBpbiAnLCAnIGluc3RhbmNlb2YgJ10pKVxuICAvLyB0eXBlcy5wdXNoKGJpbmFyeShbJzw8JywgJz4+JywgJz4+PiddKSkgLy9jb25mbGljcyB3aXRoIDwgYW5kID5cbiAgdHlwZXMucHVzaChiaW5hcnkoWycrJywgJy0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnKicsICcvJywgJyUnXSkpXG4gIHR5cGVzLnB1c2godW5hcnkoWychJywgJysnLCAnLScsICd+J10pKVxufVxuXG5mdW5jdGlvbiBiaW5hcnkobGlzdCkge1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFxuICAgICAgJ15cXFxccyooLis/KVxcXFxzXFwqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV9iaW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1bmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKihcXFxcJyArXG4gICAgICBsaXN0LmpvaW4oJ3xcXFxcJykgK1xuICAgICAgJylcXFxccyooLis/KVxcXFxzKiQnXG4gIClcblxuICByZXR1cm4gZnVuY3Rpb24ocGFydHMsIGNoYW5nZSkge1xuICAgIHJldHVybiBjcmVhdGVfdW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdGVybmFyeShwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaCh0ZXJuYXJ5X3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY29uZGl0aW9uID0gcGFydHNbMV1cbiAgICAsIHJlc3QgPSBwYXJ0c1syXVxuICAgICwgY291bnQgPSAxXG5cbiAgcmVzdCA9IHRoaXMuc3BsaXQocmVzdCwgJzonLCBbJz8nXSwgWyc6J10pXG5cbiAgaWYocmVzdC5sZW5ndGggIT09IDIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCB0ZXJuYXJ5OiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgbm90ID0gdGhpcy5jcmVhdGVfcGFydChyZXN0WzFdLCBjaGFuZ2UpXG4gICAgLCBvayA9IHRoaXMuY3JlYXRlX3BhcnQocmVzdFswXSwgY2hhbmdlKVxuXG4gIHJldHVybiB0aGlzLmNyZWF0ZV9wYXJ0KGNvbmRpdGlvbiwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdmFsID8gb2soY29udGV4dCkgOiBub3QoY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYmluYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hlY2tfbGhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1sxXSwgdXBkYXRlLmJpbmQobnVsbCwgZmFsc2UpKVxuICAgICwgY2hlY2tfcmhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1szXSwgdXBkYXRlLmJpbmQobnVsbCwgdHJ1ZSkpXG4gICAgLCBsaHNcbiAgICAsIHJoc1xuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCBsaHMsIHJocydcbiAgICAsICdyZXR1cm4gY2hhbmdlKGxocyAnICsgcGFydHNbMl0gKyAnIHJocyknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIG9uX2RhdGFcblxuICBmdW5jdGlvbiBvbl9kYXRhKGRhdGEsIGN0eCkge1xuICAgIGNoZWNrX2xocyhkYXRhLCBjdHgpXG4gICAgY2hlY2tfcmhzKGRhdGEsIGN0eClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShpc19yaHMsIHZhbCkge1xuICAgIGlzX3JocyA/IHJocyA9IHZhbCA6IGxocyA9IHZhbFxuICAgIGNoYW5nZWQobGhzLCByaHMpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3VuYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hhbmdlZCA9IEZ1bmN0aW9uKFxuICAgICAgJ2NoYW5nZSwgdmFsJ1xuICAgICwgJ3JldHVybiBjaGFuZ2UoJyArIHBhcnRzWzFdICsgJ3ZhbCknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMl0sIGNoYW5nZWQpXG59XG4iLCJ2YXIgcGFyZW5zX3JlZ2V4cCA9IC9eXFxzKlxcKCguKikkL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9wYXJlbnNcblxuZnVuY3Rpb24gYWRkX3BhcmVucyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9wYXJlbnMpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9wYXJlbnMocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gocGFyZW5zX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgYm9keSA9IHBhcnRzWzFdXG4gICAgLCBjb3VudCA9IDFcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYm9keS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihib2R5W2ldID09PSAnKScpIHtcbiAgICAgIC0tY291bnRcbiAgICB9IGVsc2UgaWYoYm9keVtpXSA9PT0gJygnKSB7XG4gICAgICArK2NvdW50XG4gICAgfVxuXG4gICAgaWYoIWNvdW50KSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmKCFpIHx8IGkgPT09IGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCB0ZXJuYXJ5OiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgY29udGVudCA9ICB0aGlzLmNyZWF0ZV9wYXJ0KGJvZHkuc2xpY2UoMCwgaSksIHVwZGF0ZSlcbiAgICAsIGtleSA9ICdwYXJlbl8nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMilcblxuICB2YXIgdGVtcGxhdGUgPSB0aGlzLmNyZWF0ZV9wYXJ0KGtleSArIGJvZHkuc2xpY2UoaSArIDEpLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIGNvbnRlbnRcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjb250ZXh0KSB7XG4gICAgY29udGV4dCA9IE9iamVjdC5jcmVhdGUoY29udGV4dClcbiAgICBjb250ZXh0W2tleV0gPSB2YWxcbiAgICB0ZW1wbGF0ZShjb250ZXh0KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHNwbGl0XG5cbmZ1bmN0aW9uIHNwbGl0KHBhcnRzLCBrZXksIG9wZW5zLCBjbG9zZXMsIGFsbCkge1xuICB2YXIgYWxsX2Nsb3NlcyA9IFsnKScsICd9JywgJ10nXVxuICAgICwgYWxsX29wZW5zID0gWycoJywgJ3snLCAnWyddXG4gICAgLCBzdW0gPSAwXG4gICAgLCBzcGxpdF9wb2ludFxuICAgICwgaW5kZXhcblxuICBpZihvcGVucykge1xuICAgIGFsbF9vcGVucyA9IGFsbF9vcGVucy5jb25jYXQob3BlbnMpXG4gIH1cblxuICBpZihjbG9zZXMpIHtcbiAgICBhbGxfY2xvc2VzID0gYWxsX2Nsb3Nlcy5jb25jYXQoY2xvc2VzKVxuICB9XG5cbiAgdmFyIGNvdW50cyA9IGFsbF9vcGVucy5tYXAoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDBcbiAgfSlcblxuICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoIXN1bSAmJiAoc3BsaXRfcG9pbnQgPSBwYXJ0cy5zbGljZShpKS5pbmRleE9mKGtleSkpID09PSAtMSkge1xuICAgICAgcmV0dXJuIFtwYXJ0c11cbiAgICB9XG5cbiAgICBpZighc3VtICYmICFzcGxpdF9wb2ludCkge1xuICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICBpZigoaW5kZXggPSBhbGxfb3BlbnMuaW5kZXhPZihwYXJ0c1tpXSkpICE9PSAtMSkge1xuICAgICAgKytjb3VudHNbaW5kZXhdXG4gICAgICArK3N1bVxuICAgIH0gZWxzZSBpZigoaW5kZXggPSBhbGxfY2xvc2VzLmluZGV4T2YocGFydHNbaV0pKSAhPT0gLTEpIHtcbiAgICAgIC0tY291bnRzW2luZGV4XVxuICAgICAgLS1zdW1cbiAgICB9XG5cbiAgICBmb3IodmFyIGogPSAwOyBqIDwgY291bnRzLmxlbmd0aDsgKytqKSB7XG4gICAgICBpZihjb3VudHNbal0gPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIFwiJyArIGFsbF9vcGVuc1tqXSArICdcIlwiIGluICcgKyBwYXJ0cylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZihzdW0gfHwgaSA9PT0gcGFydHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIFtwYXJ0c11cbiAgfVxuXG4gIHZhciByaWdodCA9IHBhcnRzLnNsaWNlKGkgKyBrZXkubGVuZ3RoKVxuICAgICwgbGVmdCA9IHBhcnRzLnNsaWNlKDAsIGkpXG5cbiAgaWYoIWFsbCkge1xuICAgIHJldHVybiBbbGVmdCwgcmlnaHRdXG4gIH1cblxuICByZXR1cm4gW2xlZnRdLmNvbmNhdChzcGxpdChyaWdodCwga2V5LCBvcGVucywgY2xvc2VzLCBhbGwpKVxufVxuIiwidmFyIHN0cmluZ19yZWdleHAgPSAvXlxccyooPzonKCg/OlteJ1xcXFxdfCg/OlxcXFwuKSkqKSd8XCIoKD86W15cIlxcXFxdfCg/OlxcXFwuKSkqKVwiKVxccyokL1xuICAsIG51bWJlcl9yZWdleHAgPSAvXlxccyooXFxkKig/OlxcLlxcZCspPylcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfdHlwZXNcblxuZnVuY3Rpb24gYWRkX3R5cGVzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3N0cmluZ19hY2Nlc3NvcilcbiAgdHlwZXMucHVzaChjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHN0cmluZ19yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZShwYXJ0c1sxXSB8fCBwYXJ0c1syXSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKG51bWJlcl9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZSgrcGFydHNbMV0pXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2VcblxuZnVuY3Rpb24gZGVib3VuY2UoZm4sIGRlbGF5LCBhdF9zdGFydCwgZ3VhcmFudGVlKSB7XG4gIHZhciB0aW1lb3V0XG4gICAgLCBhcmdzXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcblxuICAgIGlmKHRpbWVvdXQgJiYgKGF0X3N0YXJ0IHx8IGd1YXJhbnRlZSkpIHtcbiAgICAgIHJldHVyblxuICAgIH0gZWxzZSBpZighYXRfc3RhcnQpIHtcbiAgICAgIGNsZWFyKClcblxuICAgICAgcmV0dXJuIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHJ1biwgZGVsYXkpXG4gICAgfVxuXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYXIsIGRlbGF5KVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG5cbiAgICBmdW5jdGlvbiBydW4oKSB7XG4gICAgICBjbGVhcigpXG4gICAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpXG4gICAgICB0aW1lb3V0ID0gbnVsbFxuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBCYXRjaFxuXG5mdW5jdGlvbiBCYXRjaChyZWFkeSwgYWxsKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIEJhdGNoKSkge1xuICAgIHJldHVybiBuZXcgQmF0Y2gocmVhZHksIGFsbClcbiAgfVxuXG4gIHRoaXMuam9icyA9IFtdXG4gIHRoaXMuYWxsID0gYWxsXG4gIHRoaXMucmVhZHkgPSByZWFkeVxuICB0aGlzLnF1ZXVkID0gZmFsc2VcbiAgdGhpcy5ydW4gPSB0aGlzLnJ1bi5iaW5kKHRoaXMpXG59XG5cbkJhdGNoLnByb3RvdHlwZS5xdWV1ZSA9IHF1ZXVlXG5CYXRjaC5wcm90b3R5cGUuYWRkID0gYWRkXG5CYXRjaC5wcm90b3R5cGUucnVuID0gcnVuXG5cbmZ1bmN0aW9uIGFkZChmbikge1xuICB2YXIgcXVldWVkID0gZmFsc2VcbiAgICAsIGJhdGNoID0gdGhpc1xuICAgICwgc2VsZlxuICAgICwgYXJnc1xuXG4gIHJldHVybiBxdWV1ZVxuXG4gIGZ1bmN0aW9uIHF1ZXVlKCkge1xuICAgIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICBzZWxmID0gdGhpc1xuXG4gICAgaWYocXVldWVkKSB7XG4gICAgICByZXR1cm4gYmF0Y2guYWxsICYmIGJhdGNoLnJlYWR5KClcbiAgICB9XG5cbiAgICBxdWV1ZWQgPSB0cnVlXG4gICAgYmF0Y2gucXVldWUocnVuKVxuICB9XG5cbiAgZnVuY3Rpb24gcnVuKCkge1xuICAgIHF1ZXVlZCA9IGZhbHNlXG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWV1ZShmbikge1xuICB0aGlzLmpvYnMucHVzaChmbilcblxuICBpZih0aGlzLmFsbCB8fCAhdGhpcy5xdWV1ZWQpIHtcbiAgICB0aGlzLnF1ZXVlZCA9IHRydWVcbiAgICB0aGlzLnJlYWR5KHRoaXMpXG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuKCkge1xuICB2YXIgam9icyA9IHRoaXMuam9ic1xuXG4gIHRoaXMuam9icyA9IFtdXG4gIHRoaXMucXVldWVkID0gZmFsc2VcblxuICBmb3IodmFyIGkgPSAwLCBsID0gam9icy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBqb2JzW2ldKClcbiAgfVxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIl19
