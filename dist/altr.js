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
      el.childNodes
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
  , types = []

module.exports = accessors

// order is important
add_types(types)
add_parens(types)
add_operators(types)
add_filter(types)
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

},{"./lib/create":16,"./lib/filter":17,"./lib/lookup":18,"./lib/operators":19,"./lib/parens":20,"./lib/types":21,"just-debounce":22}],16:[function(require,module,exports){
module.exports = accessor

function accessor(key, change) {
  var parts = key.split('->')
    , context
    , next
    , prev

  for(var i = 0, l = parts.length; i < l; ++i) {
    parts[i] = build_part.call(this, parts[i], call_next.bind(this, i + 1))
  }

  return call_next.bind(this, 0)

  function call_next(i, val, ctx) {
    if(!i) {
      context = ctx || val
    }

    if(i === parts.length) {
      return change.call(this, val, context)
    }

    parts[i](val, context)
  }

  function finish(val, context) {
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

  return function(obj) {
    for(var i = 0, l = parts.length; obj && i < l; ++i) {
      obj = obj[parts[i]]
    }

    if(i === l) {
      return done(obj)
    }

    done()
  }
}

},{}],19:[function(require,module,exports){
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

  function on_data(data) {
    check_lhs(data)
    check_rhs(data)
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYmF0Y2guanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZmlsdGVycy9hZGQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvdGV4dC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3dpdGguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGVtcGxhdGVfc3RyaW5nLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RleHRfbm9kZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvY3JlYXRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9maWx0ZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2xvb2t1cC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvb3BlcmF0b3JzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9wYXJlbnMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL3R5cGVzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL25vZGVfbW9kdWxlcy9qdXN0LWRlYm91bmNlL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgdGVtcGxhdGVfc3RyaW5nID0gcmVxdWlyZSgnLi90ZW1wbGF0ZV9zdHJpbmcnKVxuICAsIGVsZW1lbnRfbm9kZSA9IHJlcXVpcmUoJy4vZWxlbWVudF9ub2RlJylcbiAgLCBhY2Nlc3NvcnMgPSByZXF1aXJlKCdhbHRyLWFjY2Vzc29ycycpXG4gICwgdGV4dF9ub2RlID0gcmVxdWlyZSgnLi90ZXh0X25vZGUnKVxuICAsIGJhdGNoID0gcmVxdWlyZSgnLi9iYXRjaCcpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuYWx0ci5hZGRfdGFnID0gYWRkX3RhZ1xuYWx0ci5pbmNsdWRlID0gaW5jbHVkZS5iaW5kKGFsdHIucHJvdG90eXBlKVxuYWx0ci5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlci5iaW5kKGFsdHIucHJvdG90eXBlKVxuXG5mdW5jdGlvbiBhbHRyKHJvb3QsIGRhdGEsIHN5bmMsIGRvYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBzeW5jLCBkb2MpXG4gIH1cblxuICB0aGlzLnJvb3QgPSByb290XG4gIHRoaXMuc3luYyA9IHN5bmNcbiAgdGhpcy5iYXRjaCA9IGJhdGNoKHN5bmMpXG4gIHRoaXMuZG9jdW1lbnQgPSBkb2MgfHwgZ2xvYmFsLmRvY3VtZW50XG4gIHRoaXMuZmlsdGVycyA9IE9iamVjdC5jcmVhdGUodGhpcy5maWx0ZXJzKVxuICB0aGlzLmluY2x1ZGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLmluY2x1ZGVzKVxuICB0aGlzLmFjY2Vzc29ycyA9IGFjY2Vzc29ycyh0aGlzLmZpbHRlcnMsIGZhbHNlKVxuXG4gIGlmKGdsb2JhbC5CdWZmZXIgJiYgcm9vdCBpbnN0YW5jZW9mIGdsb2JhbC5CdWZmZXIpIHtcbiAgICByb290ID0gcm9vdC50b1N0cmluZygpXG4gIH1cblxuICBpZih0eXBlb2Ygcm9vdCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgdGVtcCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gcm9vdFxuICAgIHRoaXMucm9vdCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG5cbiAgICB3aGlsZSh0ZW1wLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMucm9vdC5hcHBlbmRDaGlsZCh0ZW1wLmZpcnN0Q2hpbGQpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5yb290X25vZGVzID0gdGhpcy5yb290Lm5vZGVUeXBlID09PSAxMSA/XG4gICAgW10uc2xpY2UuY2FsbCh0aGlzLnJvb3QuY2hpbGROb2RlcykgOiBbdGhpcy5yb290XVxuXG4gIHRoaXMudHJlZSA9IHRoaXMuY3JlYXRlX25vZGUoe2NoaWxkTm9kZXM6IHRoaXMucm9vdF9ub2Rlc30pXG5cbiAgaWYoZGF0YSkge1xuICAgIHRoaXMudXBkYXRlKGRhdGEpXG4gIH1cbn1cblxuYWx0ci5wcm90b3R5cGUudGVtcGxhdGVfc3RyaW5nID0gdGVtcGxhdGVfc3RyaW5nXG5hbHRyLnByb3RvdHlwZS5jcmVhdGVfYWNjZXNzb3IgPSBjcmVhdGVfYWNjZXNzb3JcbmFsdHIucHJvdG90eXBlLnVwZGF0ZV9jaGlsZHJlbiA9IHVwZGF0ZV9jaGlsZHJlblxuYWx0ci5wcm90b3R5cGUuY3JlYXRlX25vZGUgPSBjcmVhdGVfbm9kZVxuYWx0ci5wcm90b3R5cGUuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXJcbmFsdHIucHJvdG90eXBlLnRvU3RyaW5nID0gb3V0ZXJfaHRtbFxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIucHJvdG90eXBlLmludG8gPSBhcHBlbmRfdG9cbmFsdHIucHJvdG90eXBlLnVwZGF0ZSA9IHVwZGF0ZVxuXG5hbHRyLnByb3RvdHlwZS5pbmNsdWRlcyA9IHt9XG5hbHRyLnByb3RvdHlwZS50YWdfbGlzdCA9IFtdXG5hbHRyLnByb3RvdHlwZS5maWx0ZXJzID0ge31cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG52YXIgbm9kZV9oYW5sZXJzID0ge31cblxubm9kZV9oYW5sZXJzWzFdID0gZWxlbWVudF9ub2RlXG5ub2RlX2hhbmxlcnNbM10gPSB0ZXh0X25vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEsIHJvb3QpIHtcbiAgcm9vdCA9IHJvb3QgfHwgdGhpcy50cmVlXG5cbiAgaWYocm9vdC5ob29rcykge1xuICAgIHJvb3QuaG9va3MuZm9yRWFjaChmdW5jdGlvbih1cGRhdGUpIHtcbiAgICAgIHVwZGF0ZShkYXRhKVxuICAgIH0pXG4gIH1cblxuICBpZihyb290LnVwZGF0ZV9jaGlsZHJlbikge1xuICAgIHJvb3QudXBkYXRlX2NoaWxkcmVuKGRhdGEpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlX2NoaWxkcmVuKGRhdGEpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgdXBkYXRlKGRhdGEsIHRoaXMuY2hpbGRyZW5baV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX25vZGUobm9kZSkge1xuICByZXR1cm4gbm9kZV9oYW5sZXJzW25vZGUubm9kZVR5cGVdID9cbiAgICBub2RlX2hhbmxlcnNbbm9kZS5ub2RlVHlwZV0uY2FsbCh0aGlzLCBub2RlKSA6XG4gICAgZGVmYXVsdF9ub2RlLmNhbGwodGhpcywgbm9kZSlcbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmaWx0ZXIpIHtcbiAgYWx0ci5wcm90b3R5cGUuZmlsdGVyc1tuYW1lXSA9IGZpbHRlclxufVxuXG5mdW5jdGlvbiBhZGRfdGFnKGF0dHIsIHRhZykge1xuICBhbHRyLnByb3RvdHlwZS50YWdzW2F0dHJdID0gdGFnXG4gIGFsdHIucHJvdG90eXBlLnRhZ19saXN0LnB1c2goe1xuICAgICAgYXR0cjogYXR0clxuICAgICwgY29uc3RydWN0b3I6IHRhZ1xuICB9KVxufVxuXG5mdW5jdGlvbiBvdXRlcl9odG1sKCkge1xuICByZXR1cm4gdGhpcy5yb290Lm91dGVySFRNTFxufVxuXG5mdW5jdGlvbiBkZWZhdWx0X25vZGUoZWwpIHtcbiAgcmV0dXJuIHtcbiAgICAgIGVsOiBlbFxuICAgICwgdXBkYXRlX2NoaWxkcmVuOiB0aGlzLnVwZGF0ZV9jaGlsZHJlblxuICAgICwgaG9va3M6IFtdXG4gICAgLCBjaGlsZHJlbjogYWRkX2NoaWxkcmVuLmNhbGwodGhpcylcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZF9jaGlsZHJlbigpIHtcbiAgICByZXR1cm4gW10ubWFwLmNhbGwoXG4gICAgICAgIGVsLmNoaWxkTm9kZXMgfHwgW11cbiAgICAgICwgdGhpcy5jcmVhdGVfbm9kZS5iaW5kKHRoaXMpXG4gICAgKS5maWx0ZXIoQm9vbGVhbilcbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBlbmRfdG8obm9kZSkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5yb290X25vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQodGhpcy5yb290X25vZGVzW2ldKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluY2x1ZGUobmFtZSwgdGVtcGxhdGUpIHtcbiAgcmV0dXJuIHRoaXMuaW5jbHVkZXNbbmFtZV0gPSB0ZW1wbGF0ZVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYWNjZXNzb3IoZGVzY3JpcHRpb24sIGNoYW5nZSkge1xuICByZXR1cm4gdGhpcy5hY2Nlc3NvcnMuY3JlYXRlKGRlc2NyaXB0aW9uLCBjaGFuZ2UsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKG5hbWUsIGZuKSB7XG4gIHJldHVybiB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gYmF0Y2hcblxuZnVuY3Rpb24gYmF0Y2goc3luYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBiYXRjaCkpIHtcbiAgICByZXR1cm4gbmV3IGJhdGNoKHN5bmMpXG4gIH1cblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLnN5bmMgPSBzeW5jXG4gIHRoaXMuZnJhbWUgPSBudWxsXG4gIHRoaXMucnVuID0gdGhpcy5ydW4uYmluZCh0aGlzKVxufVxuXG5iYXRjaC5wcm90b3R5cGUucmVxdWVzdF9mcmFtZSA9IHJlcXVlc3RfZnJhbWVcbmJhdGNoLnByb3RvdHlwZS5hZGQgPSBhZGRcbmJhdGNoLnByb3RvdHlwZS5ydW4gPSBydW5cblxuZnVuY3Rpb24gYWRkKGZuKSB7XG4gIHZhciBpbmRleCA9IHRoaXMuam9icy5sZW5ndGhcbiAgICAsIGJhdGNoID0gdGhpc1xuICAgICwgc2VsZlxuICAgICwgYXJnc1xuXG4gIGJhdGNoLmpvYnNbaW5kZXhdID0gbnVsbFxuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBzZWxmID0gdGhpc1xuICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG5cbiAgICBpZihiYXRjaC5zeW5jKSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgICB9XG5cbiAgICBiYXRjaC5qb2JzW2luZGV4XSA9IGNhbGxcbiAgICBiYXRjaC5yZXF1ZXN0X2ZyYW1lKClcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGwoKSB7XG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgfVxufVxuXG5mdW5jdGlvbiBydW4oKSB7XG4gIHRoaXMuZnJhbWUgPSBudWxsXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuam9icy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB0aGlzLmpvYnNbaV0gJiYgdGhpcy5qb2JzW2ldKClcbiAgICB0aGlzLmpvYnNbaV0gPSBudWxsXG4gIH1cbn1cblxuZnVuY3Rpb24gcmVxdWVzdF9mcmFtZSgpIHtcbiAgaWYodGhpcy5mcmFtZSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgaWYoIWdsb2JhbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcbiAgICByZXR1cm4gdGhpcy5mcmFtZSA9IHNldFRpbWVvdXQodGhpcy5ydW4sIDApXG4gIH1cblxuICB0aGlzLmZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMucnVuKVxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gZ2xvYmFsLmFsdHIgPSByZXF1aXJlKCcuL2luZGV4JylcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZV9lbGVtZW50X25vZGVcblxuZnVuY3Rpb24gY3JlYXRlX2VsZW1lbnRfbm9kZShlbCkge1xuICB2YXIgYWx0cl90YWdzID0ge31cbiAgICAsIGFsdHIgPSB0aGlzXG4gICAgLCBhdHRyXG5cbiAgdmFyIG5vZGUgPSB7XG4gICAgICBlbDogZWxcbiAgICAsIHVwZGF0ZV9jaGlsZHJlbjogdGhpcy51cGRhdGVfY2hpbGRyZW5cbiAgICAsIGhvb2tzOiBbXVxuICB9XG5cbiAgdmFyIGF0dHJzID0gQXJyYXkucHJvdG90eXBlLmZpbHRlci5jYWxsKGVsLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKGF0dHIpIHtcbiAgICByZXR1cm4gYWx0ci50YWdzW2F0dHIubmFtZV0gP1xuICAgICAgKGFsdHJfdGFnc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZSkgJiYgZmFsc2UgOlxuICAgICAgdHJ1ZVxuICB9KVxuXG4gIGF0dHJzLmZvckVhY2goZnVuY3Rpb24oYXR0cikge1xuICAgIHZhciBhdHRyX2hvb2sgPSBhbHRyLnRlbXBsYXRlX3N0cmluZyhhdHRyLnZhbHVlLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZShhdHRyLm5hbWUsIHZhbClcbiAgICB9KVxuXG4gICAgaWYoYXR0cl9ob29rKSB7XG4gICAgICBub2RlLmhvb2tzLnB1c2goYWx0ci5iYXRjaC5hZGQoYXR0cl9ob29rKSlcbiAgICB9XG4gIH0pXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGFsdHIudGFnX2xpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgYXR0ciA9IGFsdHJfdGFnc1thbHRyLnRhZ19saXN0W2ldLmF0dHJdXG5cbiAgICBpZihhdHRyKSB7XG4gICAgICBhbHRyLnRhZ19saXN0W2ldLmNvbnN0cnVjdG9yLmNhbGwoYWx0ciwgbm9kZSwgYXR0cilcbiAgICB9XG4gIH1cblxuICBub2RlLmNoaWxkcmVuID0gW10ubWFwLmNhbGwoXG4gICAgICBlbC5jaGlsZE5vZGVzXG4gICAgLCBhbHRyLmNyZWF0ZV9ub2RlLmJpbmQoYWx0cilcbiAgKS5maWx0ZXIoQm9vbGVhbilcblxuICBpZihub2RlLmNoaWxkcmVuLmxlbmd0aCB8fCBub2RlLmhvb2tzLmxlbmd0aCkge1xuICAgIHJldHVybiBub2RlXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYWNjZXNzb3IsIGNoYW5nZSkge1xuICB2YXIgdmFsLCBudW1cblxuICB2YXIgY2hlY2tfbnVtID0gdGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIGZ1bmN0aW9uKG5ld19udW0pIHtcbiAgICBjaGFuZ2UoKG51bSA9ICtuZXdfbnVtKSArICh2YWwgfHwgMCkpXG4gIH0pXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGFkZChuZXdfdmFsLCBjb250ZXh0KSB7XG4gICAgdmFsID0gK25ld192YWxcbiAgICBjaGVja19udW0oY29udGV4dClcbiAgfVxufVxuIiwidmFyIGluY2x1ZGVfdGFnID0gcmVxdWlyZSgnLi90YWdzL2luY2x1ZGUnKVxuICAsIGFkZF9maWx0ZXIgPSByZXF1aXJlKCcuL2ZpbHRlcnMvYWRkJylcbiAgLCB0ZXh0X3RhZyA9IHJlcXVpcmUoJy4vdGFncy90ZXh0JylcbiAgLCBodG1sX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9odG1sJylcbiAgLCB3aXRoX3RhZyA9IHJlcXVpcmUoJy4vdGFncy93aXRoJylcbiAgLCBmb3JfdGFnID0gcmVxdWlyZSgnLi90YWdzL2ZvcicpXG4gICwgaWZfdGFnID0gcmVxdWlyZSgnLi90YWdzL2lmJylcbiAgLCBhbHRyID0gcmVxdWlyZSgnLi9hbHRyJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuYWRkX3RhZygnYWx0ci1pbmNsdWRlJywgaW5jbHVkZV90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItdGV4dCcsIHRleHRfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWh0bWwnLCBodG1sX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci13aXRoJywgd2l0aF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItZm9yJywgZm9yX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1pZicsIGlmX3RhZylcblxuYWx0ci5hZGRfZmlsdGVyKCdhZGQnLCBhZGRfZmlsdGVyKVxuIiwidmFyIGZvcl9yZWdleHAgPSAvXiguKj8pXFxzK2luXFxzKyguKiQpL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZvcl9oYW5kbGVyXG5cbmZ1bmN0aW9uIGZvcl9oYW5kbGVyKG5vZGUsIGFyZ3MpIHtcbiAgdmFyIHBhcnRzID0gYXJncy5tYXRjaChmb3JfcmVnZXhwKVxuICAgICwgdGVtcGxhdGUgPSBub2RlLmVsLmlubmVySFRNTFxuICAgICwgY2hpbGRyZW4gPSBbXVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGl0ZW1zID0gW11cblxuICBpZighcGFydHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgZm9yIHRhZzogJyArIGFyZ3MpXG4gIH1cblxuICBub2RlLmVsLmlubmVySFRNTCA9ICcnXG5cbiAgdmFyIHByb3AgPSBwYXJ0c1sxXVxuICAgICwga2V5ID0gcGFydHNbMl1cblxuICBub2RlLmhvb2tzLnB1c2goYWx0ci5jcmVhdGVfYWNjZXNzb3Ioa2V5LCBhbHRyLmJhdGNoLmFkZCh1cGRhdGUpKSlcblxuICBub2RlLnVwZGF0ZV9jaGlsZHJlbiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgaXRlbV9kYXRhXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGl0ZW1fZGF0YSA9IE9iamVjdC5jcmVhdGUoZGF0YSlcbiAgICAgIGl0ZW1fZGF0YVtwcm9wXSA9IGRhdGFba2V5XVtpXVxuICAgICAgaXRlbV9kYXRhWyckaW5kZXgnXSA9IGlcbiAgICAgIGFsdHIudXBkYXRlKGl0ZW1fZGF0YSwgbm9kZS5jaGlsZHJlbltpXSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUobmV3X2l0ZW1zKSB7XG4gICAgaWYoIUFycmF5LmlzQXJyYXkobmV3X2l0ZW1zKSkge1xuICAgICAgbmV3X2l0ZW1zID0gW11cbiAgICB9XG5cbiAgICB2YXIgbmV3X2NoaWxkcmVuID0gbmV3IEFycmF5KG5ld19pdGVtcy5sZW5ndGgpXG4gICAgICAsIHByZXYgPSBub2RlLmVsLmZpcnN0Q2hpbGRcbiAgICAgICwgb2Zmc2V0ID0gMFxuICAgICAgLCBpbmRleFxuICAgICAgLCBub2Rlc1xuXG4gICAgbm9kZS5jaGlsZHJlbiA9IFtdXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbmV3X2l0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaW5kZXggPSBpdGVtcy5pbmRleE9mKG5ld19pdGVtc1tpXSlcblxuICAgICAgaWYoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IChjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpWzBdKVxuICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXgsIDEpXG5cbiAgICAgICAgaWYoaW5kZXggKyBvZmZzZXQgIT09IGkpIHtcbiAgICAgICAgICBwbGFjZShuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzKVxuICAgICAgICB9XG5cbiAgICAgICAgKytvZmZzZXRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IG1ha2VfY2hpbGRyZW4oKVxuICAgICAgICBwbGFjZShuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzKVxuICAgICAgICArK29mZnNldFxuICAgICAgfVxuXG4gICAgICBub2RlcyA9IG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXNcbiAgICAgIHByZXYgPSBub2Rlcy5sZW5ndGggPyBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXS5uZXh0U2libGluZyA6IG51bGxcbiAgICAgIG5vZGVzID0gbm9kZXMuY29uY2F0KG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICBub2RlLmNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbi5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmFsdHJfbm9kZXMpXG4gICAgfVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgY2hpbGRyZW5baV0uZG9tX25vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuICAgICAgICBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgY2hpbGRyZW4gPSBuZXdfY2hpbGRyZW4uc2xpY2UoKVxuICAgIGl0ZW1zID0gbmV3X2l0ZW1zLnNsaWNlKClcblxuICAgIGZ1bmN0aW9uIHBsYWNlKG5vZGVzKSB7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgIG5vZGUuZWwuaW5zZXJ0QmVmb3JlKG5vZGVzW2ldLCBwcmV2KVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VfY2hpbGRyZW4oKSB7XG4gICAgdmFyIHRlbXAgPSBhbHRyLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhub2RlLmVsLm5hbWVzcGFjZVVSSSwgJ2RpdicpXG4gICAgICAsIGFsdHJfbm9kZXNcbiAgICAgICwgZG9tX25vZGVzXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHRlbXBsYXRlXG5cbiAgICBkb21fbm9kZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0ZW1wLmNoaWxkTm9kZXMpXG4gICAgYWx0cl9ub2RlcyA9IGRvbV9ub2Rlcy5tYXAoYWx0ci5jcmVhdGVfbm9kZS5iaW5kKGFsdHIpKS5maWx0ZXIoQm9vbGVhbilcblxuICAgIHJldHVybiB7XG4gICAgICAgIGRvbV9ub2RlczogZG9tX25vZGVzXG4gICAgICAsIGFsdHJfbm9kZXM6IGFsdHJfbm9kZXNcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaHRtbFxuXG5mdW5jdGlvbiBodG1sKG5vZGUsIGFjY2Vzc29yKSB7XG4gIG5vZGUuaG9va3MucHVzaCh0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIG5vZGUuZWwuaW5uZXJIVE1MID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlmX3RhZ1xuXG5mdW5jdGlvbiBpZl90YWcobm9kZSwgYWNjZXNzb3IpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgICAsIHBhcmVudCA9IG5vZGUuZWwucGFyZW50Tm9kZVxuICAgICwgaGlkZGVuID0gbnVsbFxuXG4gIHBhcmVudC5pbnNlcnRCZWZvcmUocGxhY2Vob2xkZXIsIG5vZGUuZWwubmV4dFNpYmxpbmcpXG4gIG5vZGUuaG9va3MucHVzaCh0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdG9nZ2xlKSkpXG5cbiAgZnVuY3Rpb24gaGlkZSgpIHtcbiAgICBpZighaGlkZGVuKSB7XG4gICAgICBoaWRkZW4gPSBub2RlLmNoaWxkcmVuIHx8IFtdXG4gICAgICBub2RlLmNoaWxkcmVuID0gW11cbiAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChub2RlLmVsKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3coKSB7XG4gICAgaWYoaGlkZGVuKSB7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUuZWwsIHBsYWNlaG9sZGVyKVxuICAgICAgbm9kZS5jaGlsZHJlbiA9IGhpZGRlblxuICAgICAgaGlkZGVuID0gbnVsbFxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRvZ2dsZSh2YWwpIHtcbiAgICB2YWwgPyBzaG93KCkgOiBoaWRlKClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmNsdWRlXG5cbmZ1bmN0aW9uIGluY2x1ZGUobm9kZSwgbmFtZSkge1xuICBub2RlLmVsLmlubmVySFRNTCA9IHRoaXMuaW5jbHVkZXNbbmFtZV1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdGV4dFxuXG5mdW5jdGlvbiB0ZXh0KG5vZGUsIGFjY2Vzc29yKSB7XG4gIG5vZGUuaG9va3MucHVzaCh0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIG5vZGUuZWwudGV4dENvbnRlbnQgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gd2l0aF90YWdcblxuZnVuY3Rpb24gd2l0aF90YWcobm9kZSwgYWNjZXNzb3IpIHtcbiAgbm9kZS51cGRhdGVfY2hpbGRyZW4gPSB0aGlzLmNyZWF0ZV9hY2Nlc3NvcihcbiAgICAgIGFjY2Vzc29yXG4gICAgLCBub2RlLnVwZGF0ZV9jaGlsZHJlbi5iaW5kKG5vZGUpXG4gIClcbn1cbiIsInZhciBUQUcgPSAve3tcXHMqKC4qPylcXHMqfX0vXG5cbm1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVfc3RyaW5nXG5cbmZ1bmN0aW9uIHRlbXBsYXRlX3N0cmluZyh0ZW1wbGF0ZSwgY2hhbmdlKSB7XG4gIGlmKCF0ZW1wbGF0ZS5tYXRjaChUQUcpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGVtcGxhdGVcbiAgICAsIHBhcnRzID0gW11cbiAgICAsIGhvb2tzID0gW11cbiAgICAsIHRpbWVyXG4gICAgLCBpbmRleFxuICAgICwgbmV4dFxuXG4gIHdoaWxlKHJlbWFpbmluZyAmJiAobmV4dCA9IHJlbWFpbmluZy5tYXRjaChUQUcpKSkge1xuICAgIGlmKGluZGV4ID0gcmVtYWluaW5nLmluZGV4T2YobmV4dFswXSkpIHtcbiAgICAgIHBhcnRzLnB1c2gocmVtYWluaW5nLnNsaWNlKDAsIGluZGV4KSlcbiAgICB9XG5cbiAgICBwYXJ0cy5wdXNoKCcnKVxuICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZy5zbGljZShpbmRleCArIG5leHRbMF0ubGVuZ3RoKVxuICAgIGhvb2tzLnB1c2goXG4gICAgICAgIHRoaXMuY3JlYXRlX2FjY2Vzc29yKG5leHRbMV0sIHNldF9wYXJ0LmJpbmQodGhpcywgcGFydHMubGVuZ3RoIC0gMSkpXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHNldF9wYXJ0KGlkeCwgdmFsKSB7XG4gICAgcGFydHNbaWR4XSA9IHZhbFxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICBob29rKGRhdGEpXG4gICAgfSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXh0X25vZGUoZWwpIHtcbiAgdmFyIGhvb2sgPSB0aGlzLnRlbXBsYXRlX3N0cmluZyhlbC50ZXh0Q29udGVudCwgdXBkYXRlKVxuXG4gIGlmKCFob29rKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBob29rID0gdGhpcy5iYXRjaC5hZGQoaG9vaylcblxuICByZXR1cm4ge1xuICAgICAgZWw6IGVsXG4gICAgLCB0ZXh0OiBlbC50ZXh0Q29udGVudFxuICAgICwgaG9va3M6IFtob29rXVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsXG4gIH1cbn1cbiIsInZhciBhZGRfb3BlcmF0b3JzID0gcmVxdWlyZSgnLi9saWIvb3BlcmF0b3JzJylcbiAgLCBjcmVhdGVfYWNjZXNvciA9IHJlcXVpcmUoJy4vbGliL2NyZWF0ZScpXG4gICwgYWRkX2xvb2t1cCA9IHJlcXVpcmUoJy4vbGliL2xvb2t1cCcpXG4gICwgYWRkX2ZpbHRlciA9IHJlcXVpcmUoJy4vbGliL2ZpbHRlcicpXG4gICwgYWRkX3BhcmVucyA9IHJlcXVpcmUoJy4vbGliL3BhcmVucycpXG4gICwgZGVib3VuY2UgPSByZXF1aXJlKCdqdXN0LWRlYm91bmNlJylcbiAgLCBhZGRfdHlwZXMgPSByZXF1aXJlKCcuL2xpYi90eXBlcycpXG4gICwgdHlwZXMgPSBbXVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yc1xuXG4vLyBvcmRlciBpcyBpbXBvcnRhbnRcbmFkZF90eXBlcyh0eXBlcylcbmFkZF9wYXJlbnModHlwZXMpXG5hZGRfb3BlcmF0b3JzKHR5cGVzKVxuYWRkX2ZpbHRlcih0eXBlcylcbmFkZF9sb29rdXAodHlwZXMpXG5cbmFjY2Vzc29ycy5wcm90b3R5cGUuY3JlYXRlX3BhcnQgPSBjcmVhdGVfYWNjZXNvclxuYWNjZXNzb3JzLnByb3RvdHlwZS5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlclxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGUgPSBjcmVhdGVcbmFjY2Vzc29ycy5wcm90b3R5cGUudHlwZXMgPSB0eXBlc1xuXG5mdW5jdGlvbiBhY2Nlc3NvcnMoZmlsdGVycywgZGVsYXkpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWNjZXNzb3JzKSkge1xuICAgIHJldHVybiBuZXcgYWNjZXNzb3JzKGZpbHRlcnMsIGRlbGF5KVxuICB9XG5cbiAgaWYoIWRlbGF5ICYmIGRlbGF5ICE9PSBmYWxzZSkge1xuICAgIGRlbGF5ID0gMFxuICB9XG5cbiAgdGhpcy5kZWxheSA9IGRlbGF5XG4gIHRoaXMuZmlsdGVycyA9IGZpbHRlcnMgfHwge31cbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmbikge1xuICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBjcmVhdGUoc3RyLCBjaGFuZ2UpIHtcbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQoXG4gICAgICBzdHJcbiAgICAsIHRoaXMuZGVsYXkgPT09IGZhbHNlID8gY2hhbmdlIDogZGVib3VuY2UoY2hhbmdlLCB0aGlzLmRlbGF5LCBmYWxzZSwgdHJ1ZSlcbiAgKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhY2Nlc3NvclxuXG5mdW5jdGlvbiBhY2Nlc3NvcihrZXksIGNoYW5nZSkge1xuICB2YXIgcGFydHMgPSBrZXkuc3BsaXQoJy0+JylcbiAgICAsIGNvbnRleHRcbiAgICAsIG5leHRcbiAgICAsIHByZXZcblxuICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgcGFydHNbaV0gPSBidWlsZF9wYXJ0LmNhbGwodGhpcywgcGFydHNbaV0sIGNhbGxfbmV4dC5iaW5kKHRoaXMsIGkgKyAxKSlcbiAgfVxuXG4gIHJldHVybiBjYWxsX25leHQuYmluZCh0aGlzLCAwKVxuXG4gIGZ1bmN0aW9uIGNhbGxfbmV4dChpLCB2YWwsIGN0eCkge1xuICAgIGlmKCFpKSB7XG4gICAgICBjb250ZXh0ID0gY3R4IHx8IHZhbFxuICAgIH1cblxuICAgIGlmKGkgPT09IHBhcnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGNoYW5nZS5jYWxsKHRoaXMsIHZhbCwgY29udGV4dClcbiAgICB9XG5cbiAgICBwYXJ0c1tpXSh2YWwsIGNvbnRleHQpXG4gIH1cblxuICBmdW5jdGlvbiBmaW5pc2godmFsLCBjb250ZXh0KSB7XG4gICAgaWYodmFsID09PSBwcmV2KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBwcmV2ID0gdmFsXG4gICAgY2hhbmdlLmNhbGwodGhpcywgdmFsLCBjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkX3BhcnQocGFydCwgY2hhbmdlKSB7XG4gIHZhciBhY2Nlc3NvclxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnR5cGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGFjY2Vzc29yID0gdGhpcy50eXBlc1tpXS5jYWxsKHRoaXMsIHBhcnQsIGNoYW5nZSkpIHtcbiAgICAgIHJldHVybiBhY2Nlc3NvclxuICAgIH1cbiAgfVxufVxuIiwidmFyIGZpbHRlcl9yZWdleHAgPSAvXlxccyooW15cXHMoXSspXFwoKC4qKVxcKVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9maWx0ZXJcblxuZnVuY3Rpb24gYWRkX2ZpbHRlcih0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9maWx0ZXIpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9maWx0ZXIocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goZmlsdGVyX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgZmlsdGVyID0gdGhpcy5maWx0ZXJzW3BhcnRzWzFdXVxuXG4gIGlmKCFmaWx0ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCBmaW5kIGZpbHRlcjogJyArIHBhcnRzWzFdKVxuICB9XG5cbiAgcmV0dXJuIGZpbHRlci5jYWxsKHRoaXMsIHBhcnRzWzJdLCBjaGFuZ2UpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFkZF9sb29rdXBcblxuZnVuY3Rpb24gYWRkX2xvb2t1cCh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9sb29rdXApXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9sb29rdXAocGF0aCwgY2hhbmdlKSB7XG4gIGlmKCFwYXRoLmluZGV4T2YoJyRkYXRhJykpIHtcbiAgICBwYXRoID0gcGF0aC5zbGljZSgnJGRhdGEuJy5sZW5ndGgpXG4gIH1cblxuICByZXR1cm4gbG9va3VwKHBhdGgubWF0Y2goL1xccyooLipbXlxcc10pXFxzKi8pWzFdLCBjaGFuZ2UpXG59XG5cbmZ1bmN0aW9uIGxvb2t1cChwYXRoLCBkb25lKSB7XG4gIHZhciBwYXJ0cyA9IHBhdGggPyBwYXRoLnNwbGl0KCcuJykgOiBbXVxuXG4gIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBvYmogJiYgaSA8IGw7ICsraSkge1xuICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXVxuICAgIH1cblxuICAgIGlmKGkgPT09IGwpIHtcbiAgICAgIHJldHVybiBkb25lKG9iailcbiAgICB9XG5cbiAgICBkb25lKClcbiAgfVxufVxuIiwidmFyIHRlcm5hcnlfcmVnZXhwID0gL15cXHMqKC4rPylcXHMqXFw/KC4qKVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9vcGVyYXRvcnNcblxuZnVuY3Rpb24gYWRkX29wZXJhdG9ycyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV90ZXJuYXJ5KVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ3xcXFxcfCddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycmJiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyd8J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ14nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnJiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyc9PT0nLCAnIT09JywgJz09JywgJyE9J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJz49JywgJzw9JywgJz4nLCAnPCcsICcgaW4gJywgJyBpbnN0YW5jZW9mICddKSlcbiAgLy8gdHlwZXMucHVzaChiaW5hcnkoWyc8PCcsICc+PicsICc+Pj4nXSkpIC8vY29uZmxpY3Mgd2l0aCA8IGFuZCA+XG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnKycsICctJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyonLCAnLycsICclJ10pKVxuICB0eXBlcy5wdXNoKHVuYXJ5KFsnIScsICcrJywgJy0nLCAnfiddKSlcbn1cblxuZnVuY3Rpb24gYmluYXJ5KGxpc3QpIHtcbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgICAgICdeXFxcXHMqKC4rPylcXFxcc1xcKihcXFxcJyArXG4gICAgICBsaXN0LmpvaW4oJ3xcXFxcJykgK1xuICAgICAgJylcXFxccyooLis/KVxcXFxzKiQnXG4gIClcblxuICByZXR1cm4gZnVuY3Rpb24ocGFydHMsIGNoYW5nZSkge1xuICAgIHJldHVybiBjcmVhdGVfYmluYXJ5LmNhbGwodGhpcywgcmVnZXgsIHBhcnRzLCBjaGFuZ2UpXG4gIH1cbn1cblxuZnVuY3Rpb24gdW5hcnkobGlzdCkge1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFxuICAgICAgJ15cXFxccyooXFxcXCcgK1xuICAgICAgbGlzdC5qb2luKCd8XFxcXCcpICtcbiAgICAgICcpXFxcXHMqKC4rPylcXFxccyokJ1xuICApXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHBhcnRzLCBjaGFuZ2UpIHtcbiAgICByZXR1cm4gY3JlYXRlX3VuYXJ5LmNhbGwodGhpcywgcmVnZXgsIHBhcnRzLCBjaGFuZ2UpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3Rlcm5hcnkocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2godGVybmFyeV9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGNvbmRpdGlvbiA9IHBhcnRzWzFdXG4gICAgLCByZXN0ID0gcGFydHNbMl1cbiAgICAsIGNvdW50ID0gMVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSByZXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKHJlc3RbaV0gPT09ICc6Jykge1xuICAgICAgLS1jb3VudFxuICAgIH0gZWxzZSBpZihyZXN0W2ldID09PSAnPycpIHtcbiAgICAgICsrY291bnRcbiAgICB9XG5cbiAgICBpZighY291bnQpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYoIWkgfHwgaSA9PT0gcmVzdC5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCB0ZXJuYXJ5OiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgbm90ID0gdGhpcy5jcmVhdGVfcGFydChyZXN0LnNsaWNlKGkgKyAxKSwgY2hhbmdlKVxuICAgICwgb2sgPSB0aGlzLmNyZWF0ZV9wYXJ0KHJlc3Quc2xpY2UoMCwgaSksIGNoYW5nZSlcblxuICByZXR1cm4gdGhpcy5jcmVhdGVfcGFydChjb25kaXRpb24sIHVwZGF0ZSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHZhbCA/IG9rKGNvbnRleHQpIDogbm90KGNvbnRleHQpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX2JpbmFyeShyZWdleCwgcGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gocmVnZXgpKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGNoZWNrX2xocyA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMV0sIHVwZGF0ZS5iaW5kKG51bGwsIGZhbHNlKSlcbiAgICAsIGNoZWNrX3JocyA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbM10sIHVwZGF0ZS5iaW5kKG51bGwsIHRydWUpKVxuICAgICwgbGhzXG4gICAgLCByaHNcblxuICB2YXIgY2hhbmdlZCA9IEZ1bmN0aW9uKFxuICAgICAgJ2NoYW5nZSwgbGhzLCByaHMnXG4gICAgLCAncmV0dXJuIGNoYW5nZShsaHMgJyArIHBhcnRzWzJdICsgJyByaHMpJ1xuICApLmJpbmQobnVsbCwgY2hhbmdlKVxuXG4gIHJldHVybiBvbl9kYXRhXG5cbiAgZnVuY3Rpb24gb25fZGF0YShkYXRhKSB7XG4gICAgY2hlY2tfbGhzKGRhdGEpXG4gICAgY2hlY2tfcmhzKGRhdGEpXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoaXNfcmhzLCB2YWwpIHtcbiAgICBpc19yaHMgPyByaHMgPSB2YWwgOiBsaHMgPSB2YWxcbiAgICBjaGFuZ2VkKGxocywgcmhzKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV91bmFyeShyZWdleCwgcGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gocmVnZXgpKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGNoYW5nZWQgPSBGdW5jdGlvbihcbiAgICAgICdjaGFuZ2UsIHZhbCdcbiAgICAsICdyZXR1cm4gY2hhbmdlKCcgKyBwYXJ0c1sxXSArICd2YWwpJ1xuICApLmJpbmQobnVsbCwgY2hhbmdlKVxuXG4gIHJldHVybiB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzJdLCBjaGFuZ2VkKVxufVxuIiwidmFyIHBhcmVuc19yZWdleHAgPSAvXlxccypcXCgoLiopJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfcGFyZW5zXG5cbmZ1bmN0aW9uIGFkZF9wYXJlbnModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfcGFyZW5zKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfcGFyZW5zKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHBhcmVuc19yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGJvZHkgPSBwYXJ0c1sxXVxuICAgICwgY291bnQgPSAxXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGJvZHkubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYm9keVtpXSA9PT0gJyknKSB7XG4gICAgICAtLWNvdW50XG4gICAgfSBlbHNlIGlmKGJvZHlbaV0gPT09ICcoJykge1xuICAgICAgKytjb3VudFxuICAgIH1cblxuICAgIGlmKCFjb3VudCkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZighaSB8fCBpID09PSBsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgdGVybmFyeTogJyArIHBhcnRzWzBdKVxuICB9XG5cbiAgdmFyIGNvbnRlbnQgPSAgdGhpcy5jcmVhdGVfcGFydChib2R5LnNsaWNlKDAsIGkpLCB1cGRhdGUpXG4gICAgLCBrZXkgPSAncGFyZW5fJyArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMTYpLnNsaWNlKDIpXG5cbiAgdmFyIHRlbXBsYXRlID0gdGhpcy5jcmVhdGVfcGFydChrZXkgKyBib2R5LnNsaWNlKGkgKyAxKSwgY2hhbmdlKVxuXG4gIHJldHVybiBjb250ZW50XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgY29udGV4dCkge1xuICAgIGNvbnRleHQgPSBPYmplY3QuY3JlYXRlKGNvbnRleHQpXG4gICAgY29udGV4dFtrZXldID0gdmFsXG4gICAgdGVtcGxhdGUoY29udGV4dClcbiAgfVxufVxuIiwidmFyIHN0cmluZ19yZWdleHAgPSAvXlxccyooPzonKCg/OlteJ1xcXFxdfCg/OlxcXFwuKSkqKSd8XCIoKD86W15cIlxcXFxdfCg/OlxcXFwuKSkqKVwiKVxccyokL1xuICAsIG51bWJlcl9yZWdleHAgPSAvXlxccyooXFxkKig/OlxcLlxcZCspPylcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfdHlwZXNcblxuZnVuY3Rpb24gYWRkX3R5cGVzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3N0cmluZ19hY2Nlc3NvcilcbiAgdHlwZXMucHVzaChjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHN0cmluZ19yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZShwYXJ0c1sxXSB8fCBwYXJ0c1syXSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKG51bWJlcl9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZSgrcGFydHNbMV0pXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2VcblxuZnVuY3Rpb24gZGVib3VuY2UoZm4sIGRlbGF5LCBhdF9zdGFydCwgZ3VhcmFudGVlKSB7XG4gIHZhciB0aW1lb3V0XG4gICAgLCBhcmdzXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcblxuICAgIGlmKHRpbWVvdXQgJiYgKGF0X3N0YXJ0IHx8IGd1YXJhbnRlZSkpIHtcbiAgICAgIHJldHVyblxuICAgIH0gZWxzZSBpZighYXRfc3RhcnQpIHtcbiAgICAgIGNsZWFyKClcblxuICAgICAgcmV0dXJuIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHJ1biwgZGVsYXkpXG4gICAgfVxuXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYXIsIGRlbGF5KVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG5cbiAgICBmdW5jdGlvbiBydW4oKSB7XG4gICAgICBjbGVhcigpXG4gICAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpXG4gICAgICB0aW1lb3V0ID0gbnVsbFxuICAgIH1cbiAgfVxufVxuIl19
