(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var template_string = require('./template_string')
  , element_node = require('./element_node')
  , accessors = require('altr-accessors')
  , text_node = require('./text_node')
  , batch = require('./batch')

module.exports = altr
altr.add_tag = add_tag
altr.include = include.bind(altr.prototype)
altr.add_filter = add_filter.bind(altr.prototype)

function altr(root, data, sync, doc) {
  if(!(this instanceof altr)) {
    return new altr(root, data, sync, doc)
  }

  this.root = root
  this.sync = sync
  this.batch = batch(sync)
  this.document = doc || global.document
  this.filters = Object.create(this.filters)
  this.includes = Object.create(this.includes)
  this.accessors = accessors(this.filters, false)

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

  this.root_nodes = this.root.nodeType === 11 ?
    [].slice.call(this.root.childNodes) : [this.root]

  this.tree = this.create_node({childNodes: this.root_nodes})

  if(data) {
    this.update(data)
  }
}

altr.prototype.template_string = template_string
altr.prototype.create_accessor = create_accessor
altr.prototype.update_children = update_children
altr.prototype.create_node = create_node
altr.prototype.add_filter = add_filter
altr.prototype.toString = outer_html
altr.prototype.include = include
altr.prototype.into = append_to
altr.prototype.update = update

altr.prototype.includes = {}
altr.prototype.tag_list = []
altr.prototype.filters = {}
altr.prototype.tags = {}

var node_hanlers = {}

node_hanlers[1] = element_node
node_hanlers[3] = text_node

function update(data, root) {
  root = root || this.tree

  if(root.hooks) {
    root.hooks.forEach(function(update) {
      update(data)
    })
  }

  if(root.update_children) {
    root.update_children(data)
  }
}

function update_children(data) {
  for(var i = 0, l = this.children.length; i < l; ++i) {
    update(data, this.children[i])
  }
}

function create_node(node) {
  return node_hanlers[node.nodeType] ?
    node_hanlers[node.nodeType].call(this, node) :
    default_node.call(this, node)
}

function add_filter(name, filter) {
  altr.prototype.filters[name] = filter
}

function add_tag(attr, tag) {
  altr.prototype.tags[attr] = tag
  altr.prototype.tag_list.push({
      attr: attr
    , constructor: tag
  })
}

function outer_html() {
  return this.root.outerHTML
}

function default_node(el) {
  return {
      el: el
    , update_children: this.update_children
    , hooks: []
    , children: add_children.call(this)
  }

  function add_children() {
    return [].map.call(
        el.childNodes || []
      , this.create_node.bind(this)
    ).filter(Boolean)
  }
}

function append_to(node) {
  for(var i = 0, l = this.root_nodes.length; i < l; ++i) {
    node.appendChild(this.root_nodes[i])
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./batch":2,"./element_node":4,"./template_string":13,"./text_node":14,"altr-accessors":15}],2:[function(require,module,exports){
(function (global){
module.exports = batch

function batch(sync) {
  if(!(this instanceof batch)) {
    return new batch(sync)
  }

  this.jobs = []
  this.sync = sync
  this.frame = null
  this.run = this.run.bind(this)
}

batch.prototype.request_frame = request_frame
batch.prototype.add = add
batch.prototype.run = run

function add(fn) {
  var index = this.jobs.length
    , batch = this
    , self
    , args

  batch.jobs[index] = null

  return function() {
    self = this
    args = Array.prototype.slice.call(arguments)

    if(batch.sync) {
      return fn.apply(self, args)
    }

    batch.jobs[index] = call
    batch.request_frame()
  }

  function call() {
    fn.apply(self, args)
  }
}

function run() {
  this.frame = null

  for(var i = 0, l = this.jobs.length; i < l; ++i) {
    this.jobs[i] && this.jobs[i]()
    this.jobs[i] = null
  }
}

function request_frame() {
  if(this.frame) {
    return
  }

  if(!global.requestAnimationFrame) {
    return this.frame = setTimeout(this.run, 0)
  }

  this.frame = requestAnimationFrame(this.run)
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
(function (global){
module.exports = global.altr = require('./index')

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./index":6}],4:[function(require,module,exports){
module.exports = create_element_node

function create_element_node(el) {
  var altr_tags = {}
    , altr = this
    , attr

  var node = {
      el: el
    , update_children: this.update_children
    , hooks: []
  }

  var attrs = Array.prototype.filter.call(el.attributes, function(attr) {
    return altr.tags[attr.name] ?
      (altr_tags[attr.name] = attr.value) && false :
      true
  })

  attrs.forEach(function(attr) {
    var attr_hook = altr.template_string(attr.value, function(val) {
      el.setAttribute(attr.name, val)
    })

    if(attr_hook) {
      node.hooks.push(altr.batch.add(attr_hook))
    }
  })

  for(var i = 0, l = altr.tag_list.length; i < l; ++i) {
    attr = altr_tags[altr.tag_list[i].attr]

    if(attr) {
      altr.tag_list[i].constructor.call(altr, node, attr)
    }
  }

  node.children = [].map.call(
      Array.prototype.slice.call(el.childNodes)
    , altr.create_node.bind(altr)
  ).filter(Boolean)

  if(node.children.length || node.hooks.length) {
    return node
  }
}

},{}],5:[function(require,module,exports){
module.exports = function(accessor, change) {
  var val, num

  var check_num = this.create_accessor(accessor, function(new_num) {
    change((num = +new_num) + (val || 0))
  })

  return function add(new_val, context) {
    val = +new_val
    check_num(context)
  }
}

},{}],6:[function(require,module,exports){
var include_tag = require('./tags/include')
  , add_filter = require('./filters/add')
  , text_tag = require('./tags/text')
  , html_tag = require('./tags/html')
  , with_tag = require('./tags/with')
  , for_tag = require('./tags/for')
  , if_tag = require('./tags/if')
  , altr = require('./altr')

module.exports = altr

altr.add_tag('altr-include', include_tag)
altr.add_tag('altr-text', text_tag)
altr.add_tag('altr-html', html_tag)
altr.add_tag('altr-with', with_tag)
altr.add_tag('altr-for', for_tag)
altr.add_tag('altr-if', if_tag)

altr.add_filter('add', add_filter)

},{"./altr":1,"./filters/add":5,"./tags/for":7,"./tags/html":8,"./tags/if":9,"./tags/include":10,"./tags/text":11,"./tags/with":12}],7:[function(require,module,exports){
var for_regexp = /^(.*?)\s+in\s+(.*$)/

module.exports = for_handler

function for_handler(node, args) {
  var parts = args.match(for_regexp)
    , template = node.el.innerHTML
    , children = []
    , altr = this
    , items = []

  if(!parts) {
    throw new Error('invalid for tag: ' + args)
  }

  node.el.innerHTML = ''

  var prop = parts[1]
    , key = parts[2]

  node.hooks.push(altr.create_accessor(key, altr.batch.add(update)))

  node.update_children = function(data) {
    var item_data

    for(var i = 0, l = node.children.length; i < l; ++i) {
      item_data = Object.create(data)
      item_data[prop] = data[key][i]
      item_data['$index'] = i
      altr.update(item_data, node.children[i])
    }
  }

  function update(new_items) {
    if(!Array.isArray(new_items)) {
      new_items = []
    }

    var new_children = new Array(new_items.length)
      , prev = node.el.firstChild
      , offset = 0
      , index
      , nodes

    node.children = []

    for(var i = 0, l = new_items.length; i < l; ++i) {
      index = items.indexOf(new_items[i])

      if(index !== -1) {
        new_children[i] = (children.splice(index, 1)[0])
        items.splice(index, 1)

        if(index + offset !== i) {
          place(new_children[i].dom_nodes)
        }

        ++offset
      } else {
        new_children[i] = make_children()
        place(new_children[i].dom_nodes)
        ++offset
      }

      nodes = new_children[i].dom_nodes
      prev = nodes.length ? nodes[nodes.length - 1].nextSibling : null
      nodes = nodes.concat(new_children[i].dom_nodes)
      node.children = node.children.concat(new_children[i].altr_nodes)
    }

    for(var i = 0, l = children.length; i < l; ++i) {
      children[i].dom_nodes.forEach(function(node) {
        node.parentNode.removeChild(node)
      })
    }

    children = new_children.slice()
    items = new_items.slice()

    function place(nodes) {
      for(var i = 0, l = nodes.length; i < l; ++i) {
        node.el.insertBefore(nodes[i], prev)
      }
    }
  }

  function make_children() {
    var temp = altr.document.createElementNS(node.el.namespaceURI, 'div')
      , altr_nodes
      , dom_nodes

    temp.innerHTML = template

    dom_nodes = Array.prototype.slice.call(temp.childNodes)
    altr_nodes = dom_nodes.map(altr.create_node.bind(altr)).filter(Boolean)

    return {
        dom_nodes: dom_nodes
      , altr_nodes: altr_nodes
    }
  }
}

},{}],8:[function(require,module,exports){
module.exports = html

function html(node, accessor) {
  node.hooks.push(this.batch.add(this.create_accessor(accessor, update)))

  function update(val) {
    node.el.innerHTML = typeof val === 'undefined' ? '' : val
  }
}

},{}],9:[function(require,module,exports){
module.exports = if_tag

function if_tag(node, accessor) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , parent = node.el.parentNode
    , hidden = null

  parent.insertBefore(placeholder, node.el.nextSibling)
  node.hooks.push(this.batch.add(this.create_accessor(accessor, toggle)))

  function hide() {
    if(!hidden) {
      hidden = node.children || []
      node.children = []
      parent.removeChild(node.el)
    }
  }

  function show() {
    if(hidden) {
      parent.insertBefore(node.el, placeholder)
      node.children = hidden
      hidden = null
    }
  }

  function toggle(val) {
    val ? show() : hide()
  }
}

},{}],10:[function(require,module,exports){
module.exports = include

function include(node, name) {
  node.el.innerHTML = this.includes[name]
}

},{}],11:[function(require,module,exports){
module.exports = text

function text(node, accessor) {
  node.hooks.push(this.batch.add(this.create_accessor(accessor, update)))

  function update(val) {
    node.el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],12:[function(require,module,exports){
module.exports = with_tag

function with_tag(node, accessor) {
  node.update_children = this.create_accessor(
      accessor
    , node.update_children.bind(node)
  )
}

},{}],13:[function(require,module,exports){
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
        this.create_accessor(next[1], set_part.bind(this, parts.length - 1))
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

},{}],14:[function(require,module,exports){
module.exports = create_text_node

function create_text_node(el) {
  var hook = this.template_string(el.textContent, update)

  if(!hook) {
    return
  }

  hook = this.batch.add(hook)

  return {
      el: el
    , text: el.textContent
    , hooks: [hook]
  }

  function update(val) {
    el.textContent = val
  }
}

},{}],15:[function(require,module,exports){
var add_operators = require('./lib/operators')
  , create_accesor = require('./lib/create')
  , add_lookup = require('./lib/lookup')
  , add_filter = require('./lib/filter')
  , add_parens = require('./lib/parens')
  , debounce = require('just-debounce')
  , add_types = require('./lib/types')
  , add_arrow = require('./lib/arrow')
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

function create(str, change) {
  return this.create_part(
      str
    , this.delay === false ? change : debounce(change, this.delay, false, true)
  )
}

},{"./lib/arrow":16,"./lib/create":17,"./lib/filter":18,"./lib/lookup":19,"./lib/operators":20,"./lib/parens":21,"./lib/types":22,"just-debounce":23}],16:[function(require,module,exports){
module.exports = add_arrow

function add_arrow(types) {
  types.push(create_arrow)
}

function create_arrow(parts, change) {
  var remaining = parts
    , count = 0
    , split

  for(var i = 0, l = parts.length; i < l; ++i) {
    split = parts.slice(i).indexOf('->')

    parts[i] === '(' ?
      ++count : parts[i] === ')' ?
      --count : null

    if(count < 0 || split < 0) {
      return
    }

    if(count) {
      continue
    }

    if(!split) {
      break
    }
  }

  if(count) {
    return
  }

  var right = this.create_part(parts.slice(i + 2), change)
    , left = this.create_part(parts.slice(0, i), update)

  return left

  function update(val, ctx) {
    right(val, ctx)
  }
}

},{}],17:[function(require,module,exports){
module.exports = accessor

function accessor(key, change) {
  var part = build_part.call(this, key, finish)
    , context
    , prev

  return call.bind(this)

  function call(val, ctx) {
    part(val, context = ctx || val)
  }

  function finish(val) {
    if(val === prev) {
      return
    }

    prev = val
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

},{}],18:[function(require,module,exports){
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

  return filter.call(this, parts[2], change)
}

},{}],19:[function(require,module,exports){
module.exports = add_lookup

function add_lookup(types) {
  types.push(create_lookup)
}

function create_lookup(path, change) {
  if(!path.indexOf('$data')) {
    path = path.slice('$data.'.length)
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

},{}],20:[function(require,module,exports){
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

  for(var i = 0, l = rest.length; i < l; ++i) {
    if(rest[i] === ':') {
      --count
    } else if(rest[i] === '?') {
      ++count
    }

    if(!count) {
      break
    }
  }

  if(!i || i === rest.length) {
    throw new Error('Unmatched ternary: ' + parts[0])
  }

  var not = this.create_part(rest.slice(i + 1), change)
    , ok = this.create_part(rest.slice(0, i), change)

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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYmF0Y2guanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZmlsdGVycy9hZGQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvdGV4dC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3dpdGguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGVtcGxhdGVfc3RyaW5nLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RleHRfbm9kZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvYXJyb3cuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2NyZWF0ZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvZmlsdGVyLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9sb29rdXAuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL29wZXJhdG9ycy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvcGFyZW5zLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi90eXBlcy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9qdXN0LWRlYm91bmNlL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIHRlbXBsYXRlX3N0cmluZyA9IHJlcXVpcmUoJy4vdGVtcGxhdGVfc3RyaW5nJylcbiAgLCBlbGVtZW50X25vZGUgPSByZXF1aXJlKCcuL2VsZW1lbnRfbm9kZScpXG4gICwgYWNjZXNzb3JzID0gcmVxdWlyZSgnYWx0ci1hY2Nlc3NvcnMnKVxuICAsIHRleHRfbm9kZSA9IHJlcXVpcmUoJy4vdGV4dF9ub2RlJylcbiAgLCBiYXRjaCA9IHJlcXVpcmUoJy4vYmF0Y2gnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcbmFsdHIuYWRkX3RhZyA9IGFkZF90YWdcbmFsdHIuaW5jbHVkZSA9IGluY2x1ZGUuYmluZChhbHRyLnByb3RvdHlwZSlcbmFsdHIuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXIuYmluZChhbHRyLnByb3RvdHlwZSlcblxuZnVuY3Rpb24gYWx0cihyb290LCBkYXRhLCBzeW5jLCBkb2MpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWx0cikpIHtcbiAgICByZXR1cm4gbmV3IGFsdHIocm9vdCwgZGF0YSwgc3luYywgZG9jKVxuICB9XG5cbiAgdGhpcy5yb290ID0gcm9vdFxuICB0aGlzLnN5bmMgPSBzeW5jXG4gIHRoaXMuYmF0Y2ggPSBiYXRjaChzeW5jKVxuICB0aGlzLmRvY3VtZW50ID0gZG9jIHx8IGdsb2JhbC5kb2N1bWVudFxuICB0aGlzLmZpbHRlcnMgPSBPYmplY3QuY3JlYXRlKHRoaXMuZmlsdGVycylcbiAgdGhpcy5pbmNsdWRlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5pbmNsdWRlcylcbiAgdGhpcy5hY2Nlc3NvcnMgPSBhY2Nlc3NvcnModGhpcy5maWx0ZXJzLCBmYWxzZSlcblxuICBpZihnbG9iYWwuQnVmZmVyICYmIHJvb3QgaW5zdGFuY2VvZiBnbG9iYWwuQnVmZmVyKSB7XG4gICAgcm9vdCA9IHJvb3QudG9TdHJpbmcoKVxuICB9XG5cbiAgaWYodHlwZW9mIHJvb3QgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHJvb3RcbiAgICB0aGlzLnJvb3QgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXG4gICAgd2hpbGUodGVtcC5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGVtcC5maXJzdENoaWxkKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMucm9vdF9ub2RlcyA9IHRoaXMucm9vdC5ub2RlVHlwZSA9PT0gMTEgP1xuICAgIFtdLnNsaWNlLmNhbGwodGhpcy5yb290LmNoaWxkTm9kZXMpIDogW3RoaXMucm9vdF1cblxuICB0aGlzLnRyZWUgPSB0aGlzLmNyZWF0ZV9ub2RlKHtjaGlsZE5vZGVzOiB0aGlzLnJvb3Rfbm9kZXN9KVxuXG4gIGlmKGRhdGEpIHtcbiAgICB0aGlzLnVwZGF0ZShkYXRhKVxuICB9XG59XG5cbmFsdHIucHJvdG90eXBlLnRlbXBsYXRlX3N0cmluZyA9IHRlbXBsYXRlX3N0cmluZ1xuYWx0ci5wcm90b3R5cGUuY3JlYXRlX2FjY2Vzc29yID0gY3JlYXRlX2FjY2Vzc29yXG5hbHRyLnByb3RvdHlwZS51cGRhdGVfY2hpbGRyZW4gPSB1cGRhdGVfY2hpbGRyZW5cbmFsdHIucHJvdG90eXBlLmNyZWF0ZV9ub2RlID0gY3JlYXRlX25vZGVcbmFsdHIucHJvdG90eXBlLmFkZF9maWx0ZXIgPSBhZGRfZmlsdGVyXG5hbHRyLnByb3RvdHlwZS50b1N0cmluZyA9IG91dGVyX2h0bWxcbmFsdHIucHJvdG90eXBlLmluY2x1ZGUgPSBpbmNsdWRlXG5hbHRyLnByb3RvdHlwZS5pbnRvID0gYXBwZW5kX3RvXG5hbHRyLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcblxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZXMgPSB7fVxuYWx0ci5wcm90b3R5cGUudGFnX2xpc3QgPSBbXVxuYWx0ci5wcm90b3R5cGUuZmlsdGVycyA9IHt9XG5hbHRyLnByb3RvdHlwZS50YWdzID0ge31cblxudmFyIG5vZGVfaGFubGVycyA9IHt9XG5cbm5vZGVfaGFubGVyc1sxXSA9IGVsZW1lbnRfbm9kZVxubm9kZV9oYW5sZXJzWzNdID0gdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIHVwZGF0ZShkYXRhLCByb290KSB7XG4gIHJvb3QgPSByb290IHx8IHRoaXMudHJlZVxuXG4gIGlmKHJvb3QuaG9va3MpIHtcbiAgICByb290Lmhvb2tzLmZvckVhY2goZnVuY3Rpb24odXBkYXRlKSB7XG4gICAgICB1cGRhdGUoZGF0YSlcbiAgICB9KVxuICB9XG5cbiAgaWYocm9vdC51cGRhdGVfY2hpbGRyZW4pIHtcbiAgICByb290LnVwZGF0ZV9jaGlsZHJlbihkYXRhKVxuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZV9jaGlsZHJlbihkYXRhKSB7XG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHVwZGF0ZShkYXRhLCB0aGlzLmNoaWxkcmVuW2ldKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9ub2RlKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGVfaGFubGVyc1tub2RlLm5vZGVUeXBlXSA/XG4gICAgbm9kZV9oYW5sZXJzW25vZGUubm9kZVR5cGVdLmNhbGwodGhpcywgbm9kZSkgOlxuICAgIGRlZmF1bHRfbm9kZS5jYWxsKHRoaXMsIG5vZGUpXG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZmlsdGVyKSB7XG4gIGFsdHIucHJvdG90eXBlLmZpbHRlcnNbbmFtZV0gPSBmaWx0ZXJcbn1cblxuZnVuY3Rpb24gYWRkX3RhZyhhdHRyLCB0YWcpIHtcbiAgYWx0ci5wcm90b3R5cGUudGFnc1thdHRyXSA9IHRhZ1xuICBhbHRyLnByb3RvdHlwZS50YWdfbGlzdC5wdXNoKHtcbiAgICAgIGF0dHI6IGF0dHJcbiAgICAsIGNvbnN0cnVjdG9yOiB0YWdcbiAgfSlcbn1cblxuZnVuY3Rpb24gb3V0ZXJfaHRtbCgpIHtcbiAgcmV0dXJuIHRoaXMucm9vdC5vdXRlckhUTUxcbn1cblxuZnVuY3Rpb24gZGVmYXVsdF9ub2RlKGVsKSB7XG4gIHJldHVybiB7XG4gICAgICBlbDogZWxcbiAgICAsIHVwZGF0ZV9jaGlsZHJlbjogdGhpcy51cGRhdGVfY2hpbGRyZW5cbiAgICAsIGhvb2tzOiBbXVxuICAgICwgY2hpbGRyZW46IGFkZF9jaGlsZHJlbi5jYWxsKHRoaXMpXG4gIH1cblxuICBmdW5jdGlvbiBhZGRfY2hpbGRyZW4oKSB7XG4gICAgcmV0dXJuIFtdLm1hcC5jYWxsKFxuICAgICAgICBlbC5jaGlsZE5vZGVzIHx8IFtdXG4gICAgICAsIHRoaXMuY3JlYXRlX25vZGUuYmluZCh0aGlzKVxuICAgICkuZmlsdGVyKEJvb2xlYW4pXG4gIH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kX3RvKG5vZGUpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMucm9vdF9ub2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBub2RlLmFwcGVuZENoaWxkKHRoaXMucm9vdF9ub2Rlc1tpXSlcbiAgfVxufVxuXG5mdW5jdGlvbiBpbmNsdWRlKG5hbWUsIHRlbXBsYXRlKSB7XG4gIHJldHVybiB0aGlzLmluY2x1ZGVzW25hbWVdID0gdGVtcGxhdGVcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2FjY2Vzc29yKGRlc2NyaXB0aW9uLCBjaGFuZ2UpIHtcbiAgcmV0dXJuIHRoaXMuYWNjZXNzb3JzLmNyZWF0ZShkZXNjcmlwdGlvbiwgY2hhbmdlLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmbikge1xuICByZXR1cm4gdGhpcy5maWx0ZXJzW25hbWVdID0gZm5cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IGJhdGNoXG5cbmZ1bmN0aW9uIGJhdGNoKHN5bmMpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYmF0Y2gpKSB7XG4gICAgcmV0dXJuIG5ldyBiYXRjaChzeW5jKVxuICB9XG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5zeW5jID0gc3luY1xuICB0aGlzLmZyYW1lID0gbnVsbFxuICB0aGlzLnJ1biA9IHRoaXMucnVuLmJpbmQodGhpcylcbn1cblxuYmF0Y2gucHJvdG90eXBlLnJlcXVlc3RfZnJhbWUgPSByZXF1ZXN0X2ZyYW1lXG5iYXRjaC5wcm90b3R5cGUuYWRkID0gYWRkXG5iYXRjaC5wcm90b3R5cGUucnVuID0gcnVuXG5cbmZ1bmN0aW9uIGFkZChmbikge1xuICB2YXIgaW5kZXggPSB0aGlzLmpvYnMubGVuZ3RoXG4gICAgLCBiYXRjaCA9IHRoaXNcbiAgICAsIHNlbGZcbiAgICAsIGFyZ3NcblxuICBiYXRjaC5qb2JzW2luZGV4XSA9IG51bGxcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgc2VsZiA9IHRoaXNcbiAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuXG4gICAgaWYoYmF0Y2guc3luYykge1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gICAgfVxuXG4gICAgYmF0Y2guam9ic1tpbmRleF0gPSBjYWxsXG4gICAgYmF0Y2gucmVxdWVzdF9mcmFtZSgpXG4gIH1cblxuICBmdW5jdGlvbiBjYWxsKCkge1xuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuKCkge1xuICB0aGlzLmZyYW1lID0gbnVsbFxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLmpvYnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgdGhpcy5qb2JzW2ldICYmIHRoaXMuam9ic1tpXSgpXG4gICAgdGhpcy5qb2JzW2ldID0gbnVsbFxuICB9XG59XG5cbmZ1bmN0aW9uIHJlcXVlc3RfZnJhbWUoKSB7XG4gIGlmKHRoaXMuZnJhbWUpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmKCFnbG9iYWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJhbWUgPSBzZXRUaW1lb3V0KHRoaXMucnVuLCAwKVxuICB9XG5cbiAgdGhpcy5mcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnJ1bilcbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5hbHRyID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfZWxlbWVudF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV9lbGVtZW50X25vZGUoZWwpIHtcbiAgdmFyIGFsdHJfdGFncyA9IHt9XG4gICAgLCBhbHRyID0gdGhpc1xuICAgICwgYXR0clxuXG4gIHZhciBub2RlID0ge1xuICAgICAgZWw6IGVsXG4gICAgLCB1cGRhdGVfY2hpbGRyZW46IHRoaXMudXBkYXRlX2NoaWxkcmVuXG4gICAgLCBob29rczogW11cbiAgfVxuXG4gIHZhciBhdHRycyA9IEFycmF5LnByb3RvdHlwZS5maWx0ZXIuY2FsbChlbC5hdHRyaWJ1dGVzLCBmdW5jdGlvbihhdHRyKSB7XG4gICAgcmV0dXJuIGFsdHIudGFnc1thdHRyLm5hbWVdID9cbiAgICAgIChhbHRyX3RhZ3NbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWUpICYmIGZhbHNlIDpcbiAgICAgIHRydWVcbiAgfSlcblxuICBhdHRycy5mb3JFYWNoKGZ1bmN0aW9uKGF0dHIpIHtcbiAgICB2YXIgYXR0cl9ob29rID0gYWx0ci50ZW1wbGF0ZV9zdHJpbmcoYXR0ci52YWx1ZSwgZnVuY3Rpb24odmFsKSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoYXR0ci5uYW1lLCB2YWwpXG4gICAgfSlcblxuICAgIGlmKGF0dHJfaG9vaykge1xuICAgICAgbm9kZS5ob29rcy5wdXNoKGFsdHIuYmF0Y2guYWRkKGF0dHJfaG9vaykpXG4gICAgfVxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhbHRyLnRhZ19saXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGF0dHIgPSBhbHRyX3RhZ3NbYWx0ci50YWdfbGlzdFtpXS5hdHRyXVxuXG4gICAgaWYoYXR0cikge1xuICAgICAgYWx0ci50YWdfbGlzdFtpXS5jb25zdHJ1Y3Rvci5jYWxsKGFsdHIsIG5vZGUsIGF0dHIpXG4gICAgfVxuICB9XG5cbiAgbm9kZS5jaGlsZHJlbiA9IFtdLm1hcC5jYWxsKFxuICAgICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwuY2hpbGROb2RlcylcbiAgICAsIGFsdHIuY3JlYXRlX25vZGUuYmluZChhbHRyKVxuICApLmZpbHRlcihCb29sZWFuKVxuXG4gIGlmKG5vZGUuY2hpbGRyZW4ubGVuZ3RoIHx8IG5vZGUuaG9va3MubGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5vZGVcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhY2Nlc3NvciwgY2hhbmdlKSB7XG4gIHZhciB2YWwsIG51bVxuXG4gIHZhciBjaGVja19udW0gPSB0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgZnVuY3Rpb24obmV3X251bSkge1xuICAgIGNoYW5nZSgobnVtID0gK25ld19udW0pICsgKHZhbCB8fCAwKSlcbiAgfSlcblxuICByZXR1cm4gZnVuY3Rpb24gYWRkKG5ld192YWwsIGNvbnRleHQpIHtcbiAgICB2YWwgPSArbmV3X3ZhbFxuICAgIGNoZWNrX251bShjb250ZXh0KVxuICB9XG59XG4iLCJ2YXIgaW5jbHVkZV90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaW5jbHVkZScpXG4gICwgYWRkX2ZpbHRlciA9IHJlcXVpcmUoJy4vZmlsdGVycy9hZGQnKVxuICAsIHRleHRfdGFnID0gcmVxdWlyZSgnLi90YWdzL3RleHQnKVxuICAsIGh0bWxfdGFnID0gcmVxdWlyZSgnLi90YWdzL2h0bWwnKVxuICAsIHdpdGhfdGFnID0gcmVxdWlyZSgnLi90YWdzL3dpdGgnKVxuICAsIGZvcl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvZm9yJylcbiAgLCBpZl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaWYnKVxuICAsIGFsdHIgPSByZXF1aXJlKCcuL2FsdHInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcblxuYWx0ci5hZGRfdGFnKCdhbHRyLWluY2x1ZGUnLCBpbmNsdWRlX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci10ZXh0JywgdGV4dF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItaHRtbCcsIGh0bWxfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLXdpdGgnLCB3aXRoX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1mb3InLCBmb3JfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWlmJywgaWZfdGFnKVxuXG5hbHRyLmFkZF9maWx0ZXIoJ2FkZCcsIGFkZF9maWx0ZXIpXG4iLCJ2YXIgZm9yX3JlZ2V4cCA9IC9eKC4qPylcXHMraW5cXHMrKC4qJCkvXG5cbm1vZHVsZS5leHBvcnRzID0gZm9yX2hhbmRsZXJcblxuZnVuY3Rpb24gZm9yX2hhbmRsZXIobm9kZSwgYXJncykge1xuICB2YXIgcGFydHMgPSBhcmdzLm1hdGNoKGZvcl9yZWdleHApXG4gICAgLCB0ZW1wbGF0ZSA9IG5vZGUuZWwuaW5uZXJIVE1MXG4gICAgLCBjaGlsZHJlbiA9IFtdXG4gICAgLCBhbHRyID0gdGhpc1xuICAgICwgaXRlbXMgPSBbXVxuXG4gIGlmKCFwYXJ0cykge1xuICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBmb3IgdGFnOiAnICsgYXJncylcbiAgfVxuXG4gIG5vZGUuZWwuaW5uZXJIVE1MID0gJydcblxuICB2YXIgcHJvcCA9IHBhcnRzWzFdXG4gICAgLCBrZXkgPSBwYXJ0c1syXVxuXG4gIG5vZGUuaG9va3MucHVzaChhbHRyLmNyZWF0ZV9hY2Nlc3NvcihrZXksIGFsdHIuYmF0Y2guYWRkKHVwZGF0ZSkpKVxuXG4gIG5vZGUudXBkYXRlX2NoaWxkcmVuID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHZhciBpdGVtX2RhdGFcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaXRlbV9kYXRhID0gT2JqZWN0LmNyZWF0ZShkYXRhKVxuICAgICAgaXRlbV9kYXRhW3Byb3BdID0gZGF0YVtrZXldW2ldXG4gICAgICBpdGVtX2RhdGFbJyRpbmRleCddID0gaVxuICAgICAgYWx0ci51cGRhdGUoaXRlbV9kYXRhLCBub2RlLmNoaWxkcmVuW2ldKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShuZXdfaXRlbXMpIHtcbiAgICBpZighQXJyYXkuaXNBcnJheShuZXdfaXRlbXMpKSB7XG4gICAgICBuZXdfaXRlbXMgPSBbXVxuICAgIH1cblxuICAgIHZhciBuZXdfY2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3X2l0ZW1zLmxlbmd0aClcbiAgICAgICwgcHJldiA9IG5vZGUuZWwuZmlyc3RDaGlsZFxuICAgICAgLCBvZmZzZXQgPSAwXG4gICAgICAsIGluZGV4XG4gICAgICAsIG5vZGVzXG5cbiAgICBub2RlLmNoaWxkcmVuID0gW11cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBuZXdfaXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpbmRleCA9IGl0ZW1zLmluZGV4T2YobmV3X2l0ZW1zW2ldKVxuXG4gICAgICBpZihpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gKGNoaWxkcmVuLnNwbGljZShpbmRleCwgMSlbMF0pXG4gICAgICAgIGl0ZW1zLnNwbGljZShpbmRleCwgMSlcblxuICAgICAgICBpZihpbmRleCArIG9mZnNldCAhPT0gaSkge1xuICAgICAgICAgIHBsYWNlKG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICAgIH1cblxuICAgICAgICArK29mZnNldFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gbWFrZV9jaGlsZHJlbigpXG4gICAgICAgIHBsYWNlKG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICAgICsrb2Zmc2V0XG4gICAgICB9XG5cbiAgICAgIG5vZGVzID0gbmV3X2NoaWxkcmVuW2ldLmRvbV9ub2Rlc1xuICAgICAgcHJldiA9IG5vZGVzLmxlbmd0aCA/IG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdLm5leHRTaWJsaW5nIDogbnVsbFxuICAgICAgbm9kZXMgPSBub2Rlcy5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcylcbiAgICAgIG5vZGUuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLmNvbmNhdChuZXdfY2hpbGRyZW5baV0uYWx0cl9ub2RlcylcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBjaGlsZHJlbltpXS5kb21fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG5ld19jaGlsZHJlbi5zbGljZSgpXG4gICAgaXRlbXMgPSBuZXdfaXRlbXMuc2xpY2UoKVxuXG4gICAgZnVuY3Rpb24gcGxhY2Uobm9kZXMpIHtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgbm9kZS5lbC5pbnNlcnRCZWZvcmUobm9kZXNbaV0sIHByZXYpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZV9jaGlsZHJlbigpIHtcbiAgICB2YXIgdGVtcCA9IGFsdHIuZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5vZGUuZWwubmFtZXNwYWNlVVJJLCAnZGl2JylcbiAgICAgICwgYWx0cl9ub2Rlc1xuICAgICAgLCBkb21fbm9kZXNcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gdGVtcGxhdGVcblxuICAgIGRvbV9ub2RlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRlbXAuY2hpbGROb2RlcylcbiAgICBhbHRyX25vZGVzID0gZG9tX25vZGVzLm1hcChhbHRyLmNyZWF0ZV9ub2RlLmJpbmQoYWx0cikpLmZpbHRlcihCb29sZWFuKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZG9tX25vZGVzOiBkb21fbm9kZXNcbiAgICAgICwgYWx0cl9ub2RlczogYWx0cl9ub2Rlc1xuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBodG1sXG5cbmZ1bmN0aW9uIGh0bWwobm9kZSwgYWNjZXNzb3IpIHtcbiAgbm9kZS5ob29rcy5wdXNoKHRoaXMuYmF0Y2guYWRkKHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgbm9kZS5lbC5pbm5lckhUTUwgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaWZfdGFnXG5cbmZ1bmN0aW9uIGlmX3RhZyhub2RlLCBhY2Nlc3Nvcikge1xuICB2YXIgcGxhY2Vob2xkZXIgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ2FsdHItaWYtcGxhY2Vob2xkZXInKVxuICAgICwgcGFyZW50ID0gbm9kZS5lbC5wYXJlbnROb2RlXG4gICAgLCBoaWRkZW4gPSBudWxsXG5cbiAgcGFyZW50Lmluc2VydEJlZm9yZShwbGFjZWhvbGRlciwgbm9kZS5lbC5uZXh0U2libGluZylcbiAgbm9kZS5ob29rcy5wdXNoKHRoaXMuYmF0Y2guYWRkKHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB0b2dnbGUpKSlcblxuICBmdW5jdGlvbiBoaWRlKCkge1xuICAgIGlmKCFoaWRkZW4pIHtcbiAgICAgIGhpZGRlbiA9IG5vZGUuY2hpbGRyZW4gfHwgW11cbiAgICAgIG5vZGUuY2hpbGRyZW4gPSBbXVxuICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKG5vZGUuZWwpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2hvdygpIHtcbiAgICBpZihoaWRkZW4pIHtcbiAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUobm9kZS5lbCwgcGxhY2Vob2xkZXIpXG4gICAgICBub2RlLmNoaWxkcmVuID0gaGlkZGVuXG4gICAgICBoaWRkZW4gPSBudWxsXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdG9nZ2xlKHZhbCkge1xuICAgIHZhbCA/IHNob3coKSA6IGhpZGUoKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluY2x1ZGVcblxuZnVuY3Rpb24gaW5jbHVkZShub2RlLCBuYW1lKSB7XG4gIG5vZGUuZWwuaW5uZXJIVE1MID0gdGhpcy5pbmNsdWRlc1tuYW1lXVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZXh0XG5cbmZ1bmN0aW9uIHRleHQobm9kZSwgYWNjZXNzb3IpIHtcbiAgbm9kZS5ob29rcy5wdXNoKHRoaXMuYmF0Y2guYWRkKHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgbm9kZS5lbC50ZXh0Q29udGVudCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3aXRoX3RhZ1xuXG5mdW5jdGlvbiB3aXRoX3RhZyhub2RlLCBhY2Nlc3Nvcikge1xuICBub2RlLnVwZGF0ZV9jaGlsZHJlbiA9IHRoaXMuY3JlYXRlX2FjY2Vzc29yKFxuICAgICAgYWNjZXNzb3JcbiAgICAsIG5vZGUudXBkYXRlX2NoaWxkcmVuLmJpbmQobm9kZSlcbiAgKVxufVxuIiwidmFyIFRBRyA9IC97e1xccyooLio/KVxccyp9fS9cblxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZV9zdHJpbmdcblxuZnVuY3Rpb24gdGVtcGxhdGVfc3RyaW5nKHRlbXBsYXRlLCBjaGFuZ2UpIHtcbiAgaWYoIXRlbXBsYXRlLm1hdGNoKFRBRykpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0ZW1wbGF0ZVxuICAgICwgcGFydHMgPSBbXVxuICAgICwgaG9va3MgPSBbXVxuICAgICwgdGltZXJcbiAgICAsIGluZGV4XG4gICAgLCBuZXh0XG5cbiAgd2hpbGUocmVtYWluaW5nICYmIChuZXh0ID0gcmVtYWluaW5nLm1hdGNoKFRBRykpKSB7XG4gICAgaWYoaW5kZXggPSByZW1haW5pbmcuaW5kZXhPZihuZXh0WzBdKSkge1xuICAgICAgcGFydHMucHVzaChyZW1haW5pbmcuc2xpY2UoMCwgaW5kZXgpKVxuICAgIH1cblxuICAgIHBhcnRzLnB1c2goJycpXG4gICAgcmVtYWluaW5nID0gcmVtYWluaW5nLnNsaWNlKGluZGV4ICsgbmV4dFswXS5sZW5ndGgpXG4gICAgaG9va3MucHVzaChcbiAgICAgICAgdGhpcy5jcmVhdGVfYWNjZXNzb3IobmV4dFsxXSwgc2V0X3BhcnQuYmluZCh0aGlzLCBwYXJ0cy5sZW5ndGggLSAxKSlcbiAgICApXG4gIH1cblxuICBwYXJ0cy5wdXNoKHJlbWFpbmluZylcblxuICByZXR1cm4gdXBkYXRlXG5cbiAgZnVuY3Rpb24gc2V0X3BhcnQoaWR4LCB2YWwpIHtcbiAgICBwYXJ0c1tpZHhdID0gdmFsXG4gICAgY2hhbmdlKHBhcnRzLmpvaW4oJycpKVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgICBob29rcy5mb3JFYWNoKGZ1bmN0aW9uKGhvb2spIHtcbiAgICAgIGhvb2soZGF0YSlcbiAgICB9KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZV90ZXh0X25vZGVcblxuZnVuY3Rpb24gY3JlYXRlX3RleHRfbm9kZShlbCkge1xuICB2YXIgaG9vayA9IHRoaXMudGVtcGxhdGVfc3RyaW5nKGVsLnRleHRDb250ZW50LCB1cGRhdGUpXG5cbiAgaWYoIWhvb2spIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGhvb2sgPSB0aGlzLmJhdGNoLmFkZChob29rKVxuXG4gIHJldHVybiB7XG4gICAgICBlbDogZWxcbiAgICAsIHRleHQ6IGVsLnRleHRDb250ZW50XG4gICAgLCBob29rczogW2hvb2tdXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB2YWxcbiAgfVxufVxuIiwidmFyIGFkZF9vcGVyYXRvcnMgPSByZXF1aXJlKCcuL2xpYi9vcGVyYXRvcnMnKVxuICAsIGNyZWF0ZV9hY2Nlc29yID0gcmVxdWlyZSgnLi9saWIvY3JlYXRlJylcbiAgLCBhZGRfbG9va3VwID0gcmVxdWlyZSgnLi9saWIvbG9va3VwJylcbiAgLCBhZGRfZmlsdGVyID0gcmVxdWlyZSgnLi9saWIvZmlsdGVyJylcbiAgLCBhZGRfcGFyZW5zID0gcmVxdWlyZSgnLi9saWIvcGFyZW5zJylcbiAgLCBkZWJvdW5jZSA9IHJlcXVpcmUoJ2p1c3QtZGVib3VuY2UnKVxuICAsIGFkZF90eXBlcyA9IHJlcXVpcmUoJy4vbGliL3R5cGVzJylcbiAgLCBhZGRfYXJyb3cgPSByZXF1aXJlKCcuL2xpYi9hcnJvdycpXG4gICwgdHlwZXMgPSBbXVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yc1xuXG4vLyBvcmRlciBpcyBpbXBvcnRhbnRcbmFkZF90eXBlcyh0eXBlcylcbmFkZF9hcnJvdyh0eXBlcylcbmFkZF9maWx0ZXIodHlwZXMpXG5hZGRfcGFyZW5zKHR5cGVzKVxuYWRkX29wZXJhdG9ycyh0eXBlcylcbmFkZF9sb29rdXAodHlwZXMpXG5cbmFjY2Vzc29ycy5wcm90b3R5cGUuY3JlYXRlX3BhcnQgPSBjcmVhdGVfYWNjZXNvclxuYWNjZXNzb3JzLnByb3RvdHlwZS5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlclxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGUgPSBjcmVhdGVcbmFjY2Vzc29ycy5wcm90b3R5cGUudHlwZXMgPSB0eXBlc1xuXG5mdW5jdGlvbiBhY2Nlc3NvcnMoZmlsdGVycywgZGVsYXkpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWNjZXNzb3JzKSkge1xuICAgIHJldHVybiBuZXcgYWNjZXNzb3JzKGZpbHRlcnMsIGRlbGF5KVxuICB9XG5cbiAgaWYoIWRlbGF5ICYmIGRlbGF5ICE9PSBmYWxzZSkge1xuICAgIGRlbGF5ID0gMFxuICB9XG5cbiAgdGhpcy5kZWxheSA9IGRlbGF5XG4gIHRoaXMuZmlsdGVycyA9IGZpbHRlcnMgfHwge31cbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmbikge1xuICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBjcmVhdGUoc3RyLCBjaGFuZ2UpIHtcbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQoXG4gICAgICBzdHJcbiAgICAsIHRoaXMuZGVsYXkgPT09IGZhbHNlID8gY2hhbmdlIDogZGVib3VuY2UoY2hhbmdlLCB0aGlzLmRlbGF5LCBmYWxzZSwgdHJ1ZSlcbiAgKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhZGRfYXJyb3dcblxuZnVuY3Rpb24gYWRkX2Fycm93KHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2Fycm93KVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYXJyb3cocGFydHMsIGNoYW5nZSkge1xuICB2YXIgcmVtYWluaW5nID0gcGFydHNcbiAgICAsIGNvdW50ID0gMFxuICAgICwgc3BsaXRcblxuICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgc3BsaXQgPSBwYXJ0cy5zbGljZShpKS5pbmRleE9mKCctPicpXG5cbiAgICBwYXJ0c1tpXSA9PT0gJygnID9cbiAgICAgICsrY291bnQgOiBwYXJ0c1tpXSA9PT0gJyknID9cbiAgICAgIC0tY291bnQgOiBudWxsXG5cbiAgICBpZihjb3VudCA8IDAgfHwgc3BsaXQgPCAwKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZihjb3VudCkge1xuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICBpZighc3BsaXQpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYoY291bnQpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByaWdodCA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHMuc2xpY2UoaSArIDIpLCBjaGFuZ2UpXG4gICAgLCBsZWZ0ID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0cy5zbGljZSgwLCBpKSwgdXBkYXRlKVxuXG4gIHJldHVybiBsZWZ0XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgY3R4KSB7XG4gICAgcmlnaHQodmFsLCBjdHgpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWNjZXNzb3JcblxuZnVuY3Rpb24gYWNjZXNzb3Ioa2V5LCBjaGFuZ2UpIHtcbiAgdmFyIHBhcnQgPSBidWlsZF9wYXJ0LmNhbGwodGhpcywga2V5LCBmaW5pc2gpXG4gICAgLCBjb250ZXh0XG4gICAgLCBwcmV2XG5cbiAgcmV0dXJuIGNhbGwuYmluZCh0aGlzKVxuXG4gIGZ1bmN0aW9uIGNhbGwodmFsLCBjdHgpIHtcbiAgICBwYXJ0KHZhbCwgY29udGV4dCA9IGN0eCB8fCB2YWwpXG4gIH1cblxuICBmdW5jdGlvbiBmaW5pc2godmFsKSB7XG4gICAgaWYodmFsID09PSBwcmV2KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBwcmV2ID0gdmFsXG4gICAgY2hhbmdlLmNhbGwodGhpcywgdmFsLCBjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkX3BhcnQocGFydCwgY2hhbmdlKSB7XG4gIHZhciBhY2Nlc3NvclxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnR5cGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGFjY2Vzc29yID0gdGhpcy50eXBlc1tpXS5jYWxsKHRoaXMsIHBhcnQsIGNoYW5nZSkpIHtcbiAgICAgIHJldHVybiBhY2Nlc3NvclxuICAgIH1cbiAgfVxufVxuIiwidmFyIGZpbHRlcl9yZWdleHAgPSAvXlxccyooW15cXHMoXSspXFwoKC4qKVxcKVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9maWx0ZXJcblxuZnVuY3Rpb24gYWRkX2ZpbHRlcih0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9maWx0ZXIpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9maWx0ZXIocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goZmlsdGVyX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgZmlsdGVyID0gdGhpcy5maWx0ZXJzW3BhcnRzWzFdXVxuXG4gIGlmKCFmaWx0ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCBmaW5kIGZpbHRlcjogJyArIHBhcnRzWzFdKVxuICB9XG5cbiAgcmV0dXJuIGZpbHRlci5jYWxsKHRoaXMsIHBhcnRzWzJdLCBjaGFuZ2UpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFkZF9sb29rdXBcblxuZnVuY3Rpb24gYWRkX2xvb2t1cCh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9sb29rdXApXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9sb29rdXAocGF0aCwgY2hhbmdlKSB7XG4gIGlmKCFwYXRoLmluZGV4T2YoJyRkYXRhJykpIHtcbiAgICBwYXRoID0gcGF0aC5zbGljZSgnJGRhdGEuJy5sZW5ndGgpXG4gIH1cblxuICByZXR1cm4gbG9va3VwKHBhdGgubWF0Y2goL1xccyooLipbXlxcc10pXFxzKi8pWzFdLCBjaGFuZ2UpXG59XG5cbmZ1bmN0aW9uIGxvb2t1cChwYXRoLCBkb25lKSB7XG4gIHZhciBwYXJ0cyA9IHBhdGggPyBwYXRoLnNwbGl0KCcuJykgOiBbXVxuXG4gIHJldHVybiBmdW5jdGlvbiBzZWFyY2gob2JqLCBjdHgpIHtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBvYmogJiYgaSA8IGw7ICsraSkge1xuICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXVxuICAgIH1cblxuICAgIGlmKHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnICYmIGN0eCkge1xuICAgICAgcmV0dXJuIHNlYXJjaChjdHgpXG4gICAgfVxuXG4gICAgaWYoaSA9PT0gbCkge1xuICAgICAgcmV0dXJuIGRvbmUob2JqKVxuICAgIH1cblxuICAgIGRvbmUoKVxuICB9XG59XG4iLCJ2YXIgdGVybmFyeV9yZWdleHAgPSAvXlxccyooLis/KVxccypcXD8oLiopXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX29wZXJhdG9yc1xuXG5mdW5jdGlvbiBhZGRfb3BlcmF0b3JzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3Rlcm5hcnkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfFxcXFx8J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ3wnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnXiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJz09PScsICchPT0nLCAnPT0nLCAnIT0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPj0nLCAnPD0nLCAnPicsICc8JywgJyBpbiAnLCAnIGluc3RhbmNlb2YgJ10pKVxuICAvLyB0eXBlcy5wdXNoKGJpbmFyeShbJzw8JywgJz4+JywgJz4+PiddKSkgLy9jb25mbGljcyB3aXRoIDwgYW5kID5cbiAgdHlwZXMucHVzaChiaW5hcnkoWycrJywgJy0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnKicsICcvJywgJyUnXSkpXG4gIHR5cGVzLnB1c2godW5hcnkoWychJywgJysnLCAnLScsICd+J10pKVxufVxuXG5mdW5jdGlvbiBiaW5hcnkobGlzdCkge1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFxuICAgICAgJ15cXFxccyooLis/KVxcXFxzXFwqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV9iaW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1bmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKihcXFxcJyArXG4gICAgICBsaXN0LmpvaW4oJ3xcXFxcJykgK1xuICAgICAgJylcXFxccyooLis/KVxcXFxzKiQnXG4gIClcblxuICByZXR1cm4gZnVuY3Rpb24ocGFydHMsIGNoYW5nZSkge1xuICAgIHJldHVybiBjcmVhdGVfdW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdGVybmFyeShwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaCh0ZXJuYXJ5X3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY29uZGl0aW9uID0gcGFydHNbMV1cbiAgICAsIHJlc3QgPSBwYXJ0c1syXVxuICAgICwgY291bnQgPSAxXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHJlc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYocmVzdFtpXSA9PT0gJzonKSB7XG4gICAgICAtLWNvdW50XG4gICAgfSBlbHNlIGlmKHJlc3RbaV0gPT09ICc/Jykge1xuICAgICAgKytjb3VudFxuICAgIH1cblxuICAgIGlmKCFjb3VudCkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZighaSB8fCBpID09PSByZXN0Lmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIHRlcm5hcnk6ICcgKyBwYXJ0c1swXSlcbiAgfVxuXG4gIHZhciBub3QgPSB0aGlzLmNyZWF0ZV9wYXJ0KHJlc3Quc2xpY2UoaSArIDEpLCBjaGFuZ2UpXG4gICAgLCBvayA9IHRoaXMuY3JlYXRlX3BhcnQocmVzdC5zbGljZSgwLCBpKSwgY2hhbmdlKVxuXG4gIHJldHVybiB0aGlzLmNyZWF0ZV9wYXJ0KGNvbmRpdGlvbiwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdmFsID8gb2soY29udGV4dCkgOiBub3QoY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYmluYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hlY2tfbGhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1sxXSwgdXBkYXRlLmJpbmQobnVsbCwgZmFsc2UpKVxuICAgICwgY2hlY2tfcmhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1szXSwgdXBkYXRlLmJpbmQobnVsbCwgdHJ1ZSkpXG4gICAgLCBsaHNcbiAgICAsIHJoc1xuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCBsaHMsIHJocydcbiAgICAsICdyZXR1cm4gY2hhbmdlKGxocyAnICsgcGFydHNbMl0gKyAnIHJocyknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIG9uX2RhdGFcblxuICBmdW5jdGlvbiBvbl9kYXRhKGRhdGEsIGN0eCkge1xuICAgIGNoZWNrX2xocyhkYXRhLCBjdHgpXG4gICAgY2hlY2tfcmhzKGRhdGEsIGN0eClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShpc19yaHMsIHZhbCkge1xuICAgIGlzX3JocyA/IHJocyA9IHZhbCA6IGxocyA9IHZhbFxuICAgIGNoYW5nZWQobGhzLCByaHMpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3VuYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hhbmdlZCA9IEZ1bmN0aW9uKFxuICAgICAgJ2NoYW5nZSwgdmFsJ1xuICAgICwgJ3JldHVybiBjaGFuZ2UoJyArIHBhcnRzWzFdICsgJ3ZhbCknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMl0sIGNoYW5nZWQpXG59XG4iLCJ2YXIgcGFyZW5zX3JlZ2V4cCA9IC9eXFxzKlxcKCguKikkL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9wYXJlbnNcblxuZnVuY3Rpb24gYWRkX3BhcmVucyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9wYXJlbnMpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9wYXJlbnMocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gocGFyZW5zX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgYm9keSA9IHBhcnRzWzFdXG4gICAgLCBjb3VudCA9IDFcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYm9keS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihib2R5W2ldID09PSAnKScpIHtcbiAgICAgIC0tY291bnRcbiAgICB9IGVsc2UgaWYoYm9keVtpXSA9PT0gJygnKSB7XG4gICAgICArK2NvdW50XG4gICAgfVxuXG4gICAgaWYoIWNvdW50KSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmKCFpIHx8IGkgPT09IGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCB0ZXJuYXJ5OiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgY29udGVudCA9ICB0aGlzLmNyZWF0ZV9wYXJ0KGJvZHkuc2xpY2UoMCwgaSksIHVwZGF0ZSlcbiAgICAsIGtleSA9ICdwYXJlbl8nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMilcblxuICB2YXIgdGVtcGxhdGUgPSB0aGlzLmNyZWF0ZV9wYXJ0KGtleSArIGJvZHkuc2xpY2UoaSArIDEpLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIGNvbnRlbnRcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjb250ZXh0KSB7XG4gICAgY29udGV4dCA9IE9iamVjdC5jcmVhdGUoY29udGV4dClcbiAgICBjb250ZXh0W2tleV0gPSB2YWxcbiAgICB0ZW1wbGF0ZShjb250ZXh0KVxuICB9XG59XG4iLCJ2YXIgc3RyaW5nX3JlZ2V4cCA9IC9eXFxzKig/OicoKD86W14nXFxcXF18KD86XFxcXC4pKSopJ3xcIigoPzpbXlwiXFxcXF18KD86XFxcXC4pKSopXCIpXFxzKiQvXG4gICwgbnVtYmVyX3JlZ2V4cCA9IC9eXFxzKihcXGQqKD86XFwuXFxkKyk/KVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF90eXBlc1xuXG5mdW5jdGlvbiBhZGRfdHlwZXModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKVxuICB0eXBlcy5wdXNoKGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9zdHJpbmdfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goc3RyaW5nX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKHBhcnRzWzFdIHx8IHBhcnRzWzJdKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gobnVtYmVyX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKCtwYXJ0c1sxXSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZVxuXG5mdW5jdGlvbiBkZWJvdW5jZShmbiwgZGVsYXksIGF0X3N0YXJ0LCBndWFyYW50ZWUpIHtcbiAgdmFyIHRpbWVvdXRcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuXG4gICAgaWYodGltZW91dCAmJiAoYXRfc3RhcnQgfHwgZ3VhcmFudGVlKSkge1xuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIGlmKCFhdF9zdGFydCkge1xuICAgICAgY2xlYXIoKVxuXG4gICAgICByZXR1cm4gdGltZW91dCA9IHNldFRpbWVvdXQocnVuLCBkZWxheSlcbiAgICB9XG5cbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhciwgZGVsYXkpXG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcblxuICAgIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICAgIGNsZWFyKClcbiAgICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dClcbiAgICAgIHRpbWVvdXQgPSBudWxsXG4gICAgfVxuICB9XG59XG4iXX0=
