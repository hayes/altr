(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var template_string = require('./template_string')
  , element_node = require('./element_node')
  , accessors = require('altr-accessors')
  , text_node = require('./text_node')

module.exports = altr
altr.add_tag = add_tag
altr.include = include.bind(altr.prototype)
altr.add_filter = add_filter.bind(altr.prototype)

function altr(root, data, debounce, doc) {
  if(!(this instanceof altr)) {
    return new altr(root, data, debounce, doc)
  }

  this.root = root
  this.document = doc || global.document
  this.filters = Object.create(this.filters)
  this.includes = Object.create(this.includes)
  this.debounce = debounce === false ? false : debounce || 0
  this.accessors = accessors(this.filters, debounce)

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
  return this.accessors.create(description, change, this.debounce)
}

function add_filter(name, fn) {
  return this.filters[name] = fn
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./element_node":3,"./template_string":12,"./text_node":13,"altr-accessors":14}],2:[function(require,module,exports){
(function (global){
module.exports = global.altr = require('./index')

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./index":5}],3:[function(require,module,exports){
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
      node.hooks.push(attr_hook)
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

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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

},{"./altr":1,"./filters/add":4,"./tags/for":6,"./tags/html":7,"./tags/if":8,"./tags/include":9,"./tags/text":10,"./tags/with":11}],6:[function(require,module,exports){
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

  node.hooks.push(altr.create_accessor(key, update))

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

},{}],7:[function(require,module,exports){
module.exports = html

function html(node, accessor) {
  node.hooks.push(this.create_accessor(accessor, update))

  function update(val) {
    node.el.innerHTML = typeof val === 'undefined' ? '' : val
  }
}

},{}],8:[function(require,module,exports){
module.exports = if_tag

function if_tag(node, accessor) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , parent = node.el.parentNode
    , hidden = null

  parent.insertBefore(placeholder, node.el.nextSibling)
  node.hooks.push(this.create_accessor(accessor, toggle))

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

},{}],9:[function(require,module,exports){
module.exports = include

function include(node, name) {
  node.el.innerHTML = this.includes[name]
}

},{}],10:[function(require,module,exports){
module.exports = text

function text(node, accessor) {
  node.hooks.push(this.create_accessor(accessor, update))

  function update(val) {
    node.el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],11:[function(require,module,exports){
module.exports = with_tag

function with_tag(node, accessor) {
  node.update_children = this.create_accessor(
      accessor
    , node.update_children.bind(node)
  )
}

},{}],12:[function(require,module,exports){
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

    if(this.debounce === false) {
      return change(parts.join(''))
    }

    clearTimeout(timer)

    timer = setTimeout(function() {
      change(parts.join(''))
    }, this.debounce)
  }

  function update(data) {
    hooks.forEach(function(hook) {
      hook(data)
    })
  }
}

},{}],13:[function(require,module,exports){
module.exports = create_text_node

function create_text_node(el) {
  var hook = this.template_string(el.textContent, update)

  if(!hook) {
    return
  }

  return {
      el: el
    , text: el.textContent
    , hooks: [hook]
  }

  function update(val) {
    el.textContent = val
  }
}

},{}],14:[function(require,module,exports){
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
add_parens(types)
add_types(types)
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
    , this.delay === false ? change : debounce(change, this.delay)
  )
}

},{"./lib/create":15,"./lib/filter":16,"./lib/lookup":17,"./lib/operators":18,"./lib/parens":19,"./lib/types":20,"just-debounce":21}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
module.exports = debounce

function debounce(fn, delay, at_start) {
  var timeout

  if(typeof delay === 'undefined') {
    delay = 0
  }

  return function() {
    var args = Array.prototype.slice.call(arguments)
      , self = this

    if(timeout && at_start) {
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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZmlsdGVycy9hZGQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvdGV4dC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3dpdGguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGVtcGxhdGVfc3RyaW5nLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RleHRfbm9kZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvY3JlYXRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9maWx0ZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2xvb2t1cC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvb3BlcmF0b3JzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9wYXJlbnMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL3R5cGVzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL25vZGVfbW9kdWxlcy9qdXN0LWRlYm91bmNlL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEpBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgdGVtcGxhdGVfc3RyaW5nID0gcmVxdWlyZSgnLi90ZW1wbGF0ZV9zdHJpbmcnKVxuICAsIGVsZW1lbnRfbm9kZSA9IHJlcXVpcmUoJy4vZWxlbWVudF9ub2RlJylcbiAgLCBhY2Nlc3NvcnMgPSByZXF1aXJlKCdhbHRyLWFjY2Vzc29ycycpXG4gICwgdGV4dF9ub2RlID0gcmVxdWlyZSgnLi90ZXh0X25vZGUnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcbmFsdHIuYWRkX3RhZyA9IGFkZF90YWdcbmFsdHIuaW5jbHVkZSA9IGluY2x1ZGUuYmluZChhbHRyLnByb3RvdHlwZSlcbmFsdHIuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXIuYmluZChhbHRyLnByb3RvdHlwZSlcblxuZnVuY3Rpb24gYWx0cihyb290LCBkYXRhLCBkZWJvdW5jZSwgZG9jKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIGFsdHIpKSB7XG4gICAgcmV0dXJuIG5ldyBhbHRyKHJvb3QsIGRhdGEsIGRlYm91bmNlLCBkb2MpXG4gIH1cblxuICB0aGlzLnJvb3QgPSByb290XG4gIHRoaXMuZG9jdW1lbnQgPSBkb2MgfHwgZ2xvYmFsLmRvY3VtZW50XG4gIHRoaXMuZmlsdGVycyA9IE9iamVjdC5jcmVhdGUodGhpcy5maWx0ZXJzKVxuICB0aGlzLmluY2x1ZGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLmluY2x1ZGVzKVxuICB0aGlzLmRlYm91bmNlID0gZGVib3VuY2UgPT09IGZhbHNlID8gZmFsc2UgOiBkZWJvdW5jZSB8fCAwXG4gIHRoaXMuYWNjZXNzb3JzID0gYWNjZXNzb3JzKHRoaXMuZmlsdGVycywgZGVib3VuY2UpXG5cbiAgaWYoZ2xvYmFsLkJ1ZmZlciAmJiByb290IGluc3RhbmNlb2YgZ2xvYmFsLkJ1ZmZlcikge1xuICAgIHJvb3QgPSByb290LnRvU3RyaW5nKClcbiAgfVxuXG4gIGlmKHR5cGVvZiByb290ID09PSAnc3RyaW5nJykge1xuICAgIHZhciB0ZW1wID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSByb290XG4gICAgdGhpcy5yb290ID0gdGhpcy5kb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcblxuICAgIHdoaWxlKHRlbXAuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy5yb290LmFwcGVuZENoaWxkKHRlbXAuZmlyc3RDaGlsZClcbiAgICB9XG4gIH1cblxuICB0aGlzLnJvb3Rfbm9kZXMgPSB0aGlzLnJvb3Qubm9kZVR5cGUgPT09IDExID9cbiAgICBbXS5zbGljZS5jYWxsKHRoaXMucm9vdC5jaGlsZE5vZGVzKSA6IFt0aGlzLnJvb3RdXG5cbiAgdGhpcy50cmVlID0gdGhpcy5jcmVhdGVfbm9kZSh7Y2hpbGROb2RlczogdGhpcy5yb290X25vZGVzfSlcblxuICBpZihkYXRhKSB7XG4gICAgdGhpcy51cGRhdGUoZGF0YSlcbiAgfVxufVxuXG5hbHRyLnByb3RvdHlwZS50ZW1wbGF0ZV9zdHJpbmcgPSB0ZW1wbGF0ZV9zdHJpbmdcbmFsdHIucHJvdG90eXBlLmNyZWF0ZV9hY2Nlc3NvciA9IGNyZWF0ZV9hY2Nlc3NvclxuYWx0ci5wcm90b3R5cGUudXBkYXRlX2NoaWxkcmVuID0gdXBkYXRlX2NoaWxkcmVuXG5hbHRyLnByb3RvdHlwZS5jcmVhdGVfbm9kZSA9IGNyZWF0ZV9ub2RlXG5hbHRyLnByb3RvdHlwZS5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlclxuYWx0ci5wcm90b3R5cGUudG9TdHJpbmcgPSBvdXRlcl9odG1sXG5hbHRyLnByb3RvdHlwZS5pbmNsdWRlID0gaW5jbHVkZVxuYWx0ci5wcm90b3R5cGUuaW50byA9IGFwcGVuZF90b1xuYWx0ci5wcm90b3R5cGUudXBkYXRlID0gdXBkYXRlXG5cbmFsdHIucHJvdG90eXBlLmluY2x1ZGVzID0ge31cbmFsdHIucHJvdG90eXBlLnRhZ19saXN0ID0gW11cbmFsdHIucHJvdG90eXBlLmZpbHRlcnMgPSB7fVxuYWx0ci5wcm90b3R5cGUudGFncyA9IHt9XG5cbnZhciBub2RlX2hhbmxlcnMgPSB7fVxuXG5ub2RlX2hhbmxlcnNbMV0gPSBlbGVtZW50X25vZGVcbm5vZGVfaGFubGVyc1szXSA9IHRleHRfbm9kZVxuXG5mdW5jdGlvbiB1cGRhdGUoZGF0YSwgcm9vdCkge1xuICByb290ID0gcm9vdCB8fCB0aGlzLnRyZWVcblxuICBpZihyb290Lmhvb2tzKSB7XG4gICAgcm9vdC5ob29rcy5mb3JFYWNoKGZ1bmN0aW9uKHVwZGF0ZSkge1xuICAgICAgdXBkYXRlKGRhdGEpXG4gICAgfSlcbiAgfVxuXG4gIGlmKHJvb3QudXBkYXRlX2NoaWxkcmVuKSB7XG4gICAgcm9vdC51cGRhdGVfY2hpbGRyZW4oZGF0YSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVfY2hpbGRyZW4oZGF0YSkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB1cGRhdGUoZGF0YSwgdGhpcy5jaGlsZHJlbltpXSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbm9kZShub2RlKSB7XG4gIHJldHVybiBub2RlX2hhbmxlcnNbbm9kZS5ub2RlVHlwZV0gP1xuICAgIG5vZGVfaGFubGVyc1tub2RlLm5vZGVUeXBlXS5jYWxsKHRoaXMsIG5vZGUpIDpcbiAgICBkZWZhdWx0X25vZGUuY2FsbCh0aGlzLCBub2RlKVxufVxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKG5hbWUsIGZpbHRlcikge1xuICBhbHRyLnByb3RvdHlwZS5maWx0ZXJzW25hbWVdID0gZmlsdGVyXG59XG5cbmZ1bmN0aW9uIGFkZF90YWcoYXR0ciwgdGFnKSB7XG4gIGFsdHIucHJvdG90eXBlLnRhZ3NbYXR0cl0gPSB0YWdcbiAgYWx0ci5wcm90b3R5cGUudGFnX2xpc3QucHVzaCh7XG4gICAgICBhdHRyOiBhdHRyXG4gICAgLCBjb25zdHJ1Y3RvcjogdGFnXG4gIH0pXG59XG5cbmZ1bmN0aW9uIG91dGVyX2h0bWwoKSB7XG4gIHJldHVybiB0aGlzLnJvb3Qub3V0ZXJIVE1MXG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRfbm9kZShlbCkge1xuICByZXR1cm4ge1xuICAgICAgZWw6IGVsXG4gICAgLCB1cGRhdGVfY2hpbGRyZW46IHRoaXMudXBkYXRlX2NoaWxkcmVuXG4gICAgLCBob29rczogW11cbiAgICAsIGNoaWxkcmVuOiBhZGRfY2hpbGRyZW4uY2FsbCh0aGlzKVxuICB9XG5cbiAgZnVuY3Rpb24gYWRkX2NoaWxkcmVuKCkge1xuICAgIHJldHVybiBbXS5tYXAuY2FsbChcbiAgICAgICAgZWwuY2hpbGROb2RlcyB8fCBbXVxuICAgICAgLCB0aGlzLmNyZWF0ZV9ub2RlLmJpbmQodGhpcylcbiAgICApLmZpbHRlcihCb29sZWFuKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZF90byhub2RlKSB7XG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnJvb3Rfbm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgbm9kZS5hcHBlbmRDaGlsZCh0aGlzLnJvb3Rfbm9kZXNbaV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5jbHVkZShuYW1lLCB0ZW1wbGF0ZSkge1xuICByZXR1cm4gdGhpcy5pbmNsdWRlc1tuYW1lXSA9IHRlbXBsYXRlXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9hY2Nlc3NvcihkZXNjcmlwdGlvbiwgY2hhbmdlKSB7XG4gIHJldHVybiB0aGlzLmFjY2Vzc29ycy5jcmVhdGUoZGVzY3JpcHRpb24sIGNoYW5nZSwgdGhpcy5kZWJvdW5jZSlcbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmbikge1xuICByZXR1cm4gdGhpcy5maWx0ZXJzW25hbWVdID0gZm5cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5hbHRyID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfZWxlbWVudF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV9lbGVtZW50X25vZGUoZWwpIHtcbiAgdmFyIGFsdHJfdGFncyA9IHt9XG4gICAgLCBhbHRyID0gdGhpc1xuICAgICwgYXR0clxuXG4gIHZhciBub2RlID0ge1xuICAgICAgZWw6IGVsXG4gICAgLCB1cGRhdGVfY2hpbGRyZW46IHRoaXMudXBkYXRlX2NoaWxkcmVuXG4gICAgLCBob29rczogW11cbiAgfVxuXG4gIHZhciBhdHRycyA9IEFycmF5LnByb3RvdHlwZS5maWx0ZXIuY2FsbChlbC5hdHRyaWJ1dGVzLCBmdW5jdGlvbihhdHRyKSB7XG4gICAgcmV0dXJuIGFsdHIudGFnc1thdHRyLm5hbWVdID9cbiAgICAgIChhbHRyX3RhZ3NbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWUpICYmIGZhbHNlIDpcbiAgICAgIHRydWVcbiAgfSlcblxuICBhdHRycy5mb3JFYWNoKGZ1bmN0aW9uKGF0dHIpIHtcbiAgICB2YXIgYXR0cl9ob29rID0gYWx0ci50ZW1wbGF0ZV9zdHJpbmcoYXR0ci52YWx1ZSwgZnVuY3Rpb24odmFsKSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoYXR0ci5uYW1lLCB2YWwpXG4gICAgfSlcblxuICAgIGlmKGF0dHJfaG9vaykge1xuICAgICAgbm9kZS5ob29rcy5wdXNoKGF0dHJfaG9vaylcbiAgICB9XG4gIH0pXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGFsdHIudGFnX2xpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgYXR0ciA9IGFsdHJfdGFnc1thbHRyLnRhZ19saXN0W2ldLmF0dHJdXG5cbiAgICBpZihhdHRyKSB7XG4gICAgICBhbHRyLnRhZ19saXN0W2ldLmNvbnN0cnVjdG9yLmNhbGwoYWx0ciwgbm9kZSwgYXR0cilcbiAgICB9XG4gIH1cblxuICBub2RlLmNoaWxkcmVuID0gW10ubWFwLmNhbGwoXG4gICAgICBlbC5jaGlsZE5vZGVzXG4gICAgLCBhbHRyLmNyZWF0ZV9ub2RlLmJpbmQoYWx0cilcbiAgKS5maWx0ZXIoQm9vbGVhbilcblxuICBpZihub2RlLmNoaWxkcmVuLmxlbmd0aCB8fCBub2RlLmhvb2tzLmxlbmd0aCkge1xuICAgIHJldHVybiBub2RlXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYWNjZXNzb3IsIGNoYW5nZSkge1xuICB2YXIgdmFsLCBudW1cblxuICB2YXIgY2hlY2tfbnVtID0gdGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIGZ1bmN0aW9uKG5ld19udW0pIHtcbiAgICBjaGFuZ2UoKG51bSA9ICtuZXdfbnVtKSArICh2YWwgfHwgMCkpXG4gIH0pXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGFkZChuZXdfdmFsLCBjb250ZXh0KSB7XG4gICAgdmFsID0gK25ld192YWxcbiAgICBjaGVja19udW0oY29udGV4dClcbiAgfVxufVxuIiwidmFyIGluY2x1ZGVfdGFnID0gcmVxdWlyZSgnLi90YWdzL2luY2x1ZGUnKVxuICAsIGFkZF9maWx0ZXIgPSByZXF1aXJlKCcuL2ZpbHRlcnMvYWRkJylcbiAgLCB0ZXh0X3RhZyA9IHJlcXVpcmUoJy4vdGFncy90ZXh0JylcbiAgLCBodG1sX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9odG1sJylcbiAgLCB3aXRoX3RhZyA9IHJlcXVpcmUoJy4vdGFncy93aXRoJylcbiAgLCBmb3JfdGFnID0gcmVxdWlyZSgnLi90YWdzL2ZvcicpXG4gICwgaWZfdGFnID0gcmVxdWlyZSgnLi90YWdzL2lmJylcbiAgLCBhbHRyID0gcmVxdWlyZSgnLi9hbHRyJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuYWRkX3RhZygnYWx0ci1pbmNsdWRlJywgaW5jbHVkZV90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItdGV4dCcsIHRleHRfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWh0bWwnLCBodG1sX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci13aXRoJywgd2l0aF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItZm9yJywgZm9yX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1pZicsIGlmX3RhZylcblxuYWx0ci5hZGRfZmlsdGVyKCdhZGQnLCBhZGRfZmlsdGVyKVxuIiwidmFyIGZvcl9yZWdleHAgPSAvXiguKj8pXFxzK2luXFxzKyguKiQpL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZvcl9oYW5kbGVyXG5cbmZ1bmN0aW9uIGZvcl9oYW5kbGVyKG5vZGUsIGFyZ3MpIHtcbiAgdmFyIHBhcnRzID0gYXJncy5tYXRjaChmb3JfcmVnZXhwKVxuICAgICwgdGVtcGxhdGUgPSBub2RlLmVsLmlubmVySFRNTFxuICAgICwgY2hpbGRyZW4gPSBbXVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGl0ZW1zID0gW11cblxuICBpZighcGFydHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgZm9yIHRhZzogJyArIGFyZ3MpXG4gIH1cblxuICBub2RlLmVsLmlubmVySFRNTCA9ICcnXG5cbiAgdmFyIHByb3AgPSBwYXJ0c1sxXVxuICAgICwga2V5ID0gcGFydHNbMl1cblxuICBub2RlLmhvb2tzLnB1c2goYWx0ci5jcmVhdGVfYWNjZXNzb3Ioa2V5LCB1cGRhdGUpKVxuXG4gIG5vZGUudXBkYXRlX2NoaWxkcmVuID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHZhciBpdGVtX2RhdGFcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaXRlbV9kYXRhID0gT2JqZWN0LmNyZWF0ZShkYXRhKVxuICAgICAgaXRlbV9kYXRhW3Byb3BdID0gZGF0YVtrZXldW2ldXG4gICAgICBpdGVtX2RhdGFbJyRpbmRleCddID0gaVxuICAgICAgYWx0ci51cGRhdGUoaXRlbV9kYXRhLCBub2RlLmNoaWxkcmVuW2ldKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShuZXdfaXRlbXMpIHtcbiAgICBpZighQXJyYXkuaXNBcnJheShuZXdfaXRlbXMpKSB7XG4gICAgICBuZXdfaXRlbXMgPSBbXVxuICAgIH1cblxuICAgIHZhciBuZXdfY2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3X2l0ZW1zLmxlbmd0aClcbiAgICAgICwgcHJldiA9IG5vZGUuZWwuZmlyc3RDaGlsZFxuICAgICAgLCBvZmZzZXQgPSAwXG4gICAgICAsIGluZGV4XG4gICAgICAsIG5vZGVzXG5cbiAgICBub2RlLmNoaWxkcmVuID0gW11cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBuZXdfaXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpbmRleCA9IGl0ZW1zLmluZGV4T2YobmV3X2l0ZW1zW2ldKVxuXG4gICAgICBpZihpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gKGNoaWxkcmVuLnNwbGljZShpbmRleCwgMSlbMF0pXG4gICAgICAgIGl0ZW1zLnNwbGljZShpbmRleCwgMSlcblxuICAgICAgICBpZihpbmRleCArIG9mZnNldCAhPT0gaSkge1xuICAgICAgICAgIHBsYWNlKG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICAgIH1cblxuICAgICAgICArK29mZnNldFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gbWFrZV9jaGlsZHJlbigpXG4gICAgICAgIHBsYWNlKG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICAgICsrb2Zmc2V0XG4gICAgICB9XG5cbiAgICAgIG5vZGVzID0gbmV3X2NoaWxkcmVuW2ldLmRvbV9ub2Rlc1xuICAgICAgcHJldiA9IG5vZGVzLmxlbmd0aCA/IG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdLm5leHRTaWJsaW5nIDogbnVsbFxuICAgICAgbm9kZXMgPSBub2Rlcy5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcylcbiAgICAgIG5vZGUuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLmNvbmNhdChuZXdfY2hpbGRyZW5baV0uYWx0cl9ub2RlcylcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBjaGlsZHJlbltpXS5kb21fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG5ld19jaGlsZHJlbi5zbGljZSgpXG4gICAgaXRlbXMgPSBuZXdfaXRlbXMuc2xpY2UoKVxuXG4gICAgZnVuY3Rpb24gcGxhY2Uobm9kZXMpIHtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgbm9kZS5lbC5pbnNlcnRCZWZvcmUobm9kZXNbaV0sIHByZXYpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZV9jaGlsZHJlbigpIHtcbiAgICB2YXIgdGVtcCA9IGFsdHIuZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5vZGUuZWwubmFtZXNwYWNlVVJJLCAnZGl2JylcbiAgICAgICwgYWx0cl9ub2Rlc1xuICAgICAgLCBkb21fbm9kZXNcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gdGVtcGxhdGVcblxuICAgIGRvbV9ub2RlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRlbXAuY2hpbGROb2RlcylcbiAgICBhbHRyX25vZGVzID0gZG9tX25vZGVzLm1hcChhbHRyLmNyZWF0ZV9ub2RlLmJpbmQoYWx0cikpLmZpbHRlcihCb29sZWFuKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZG9tX25vZGVzOiBkb21fbm9kZXNcbiAgICAgICwgYWx0cl9ub2RlczogYWx0cl9ub2Rlc1xuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBodG1sXG5cbmZ1bmN0aW9uIGh0bWwobm9kZSwgYWNjZXNzb3IpIHtcbiAgbm9kZS5ob29rcy5wdXNoKHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBub2RlLmVsLmlubmVySFRNTCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpZl90YWdcblxuZnVuY3Rpb24gaWZfdGFnKG5vZGUsIGFjY2Vzc29yKSB7XG4gIHZhciBwbGFjZWhvbGRlciA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnYWx0ci1pZi1wbGFjZWhvbGRlcicpXG4gICAgLCBwYXJlbnQgPSBub2RlLmVsLnBhcmVudE5vZGVcbiAgICAsIGhpZGRlbiA9IG51bGxcblxuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCBub2RlLmVsLm5leHRTaWJsaW5nKVxuICBub2RlLmhvb2tzLnB1c2godGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHRvZ2dsZSkpXG5cbiAgZnVuY3Rpb24gaGlkZSgpIHtcbiAgICBpZighaGlkZGVuKSB7XG4gICAgICBoaWRkZW4gPSBub2RlLmNoaWxkcmVuIHx8IFtdXG4gICAgICBub2RlLmNoaWxkcmVuID0gW11cbiAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChub2RlLmVsKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3coKSB7XG4gICAgaWYoaGlkZGVuKSB7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUuZWwsIHBsYWNlaG9sZGVyKVxuICAgICAgbm9kZS5jaGlsZHJlbiA9IGhpZGRlblxuICAgICAgaGlkZGVuID0gbnVsbFxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRvZ2dsZSh2YWwpIHtcbiAgICB2YWwgPyBzaG93KCkgOiBoaWRlKClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmNsdWRlXG5cbmZ1bmN0aW9uIGluY2x1ZGUobm9kZSwgbmFtZSkge1xuICBub2RlLmVsLmlubmVySFRNTCA9IHRoaXMuaW5jbHVkZXNbbmFtZV1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdGV4dFxuXG5mdW5jdGlvbiB0ZXh0KG5vZGUsIGFjY2Vzc29yKSB7XG4gIG5vZGUuaG9va3MucHVzaCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgbm9kZS5lbC50ZXh0Q29udGVudCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3aXRoX3RhZ1xuXG5mdW5jdGlvbiB3aXRoX3RhZyhub2RlLCBhY2Nlc3Nvcikge1xuICBub2RlLnVwZGF0ZV9jaGlsZHJlbiA9IHRoaXMuY3JlYXRlX2FjY2Vzc29yKFxuICAgICAgYWNjZXNzb3JcbiAgICAsIG5vZGUudXBkYXRlX2NoaWxkcmVuLmJpbmQobm9kZSlcbiAgKVxufVxuIiwidmFyIFRBRyA9IC97e1xccyooLio/KVxccyp9fS9cblxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZV9zdHJpbmdcblxuZnVuY3Rpb24gdGVtcGxhdGVfc3RyaW5nKHRlbXBsYXRlLCBjaGFuZ2UpIHtcbiAgaWYoIXRlbXBsYXRlLm1hdGNoKFRBRykpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0ZW1wbGF0ZVxuICAgICwgcGFydHMgPSBbXVxuICAgICwgaG9va3MgPSBbXVxuICAgICwgdGltZXJcbiAgICAsIGluZGV4XG4gICAgLCBuZXh0XG5cbiAgd2hpbGUocmVtYWluaW5nICYmIChuZXh0ID0gcmVtYWluaW5nLm1hdGNoKFRBRykpKSB7XG4gICAgaWYoaW5kZXggPSByZW1haW5pbmcuaW5kZXhPZihuZXh0WzBdKSkge1xuICAgICAgcGFydHMucHVzaChyZW1haW5pbmcuc2xpY2UoMCwgaW5kZXgpKVxuICAgIH1cblxuICAgIHBhcnRzLnB1c2goJycpXG4gICAgcmVtYWluaW5nID0gcmVtYWluaW5nLnNsaWNlKGluZGV4ICsgbmV4dFswXS5sZW5ndGgpXG4gICAgaG9va3MucHVzaChcbiAgICAgICAgdGhpcy5jcmVhdGVfYWNjZXNzb3IobmV4dFsxXSwgc2V0X3BhcnQuYmluZCh0aGlzLCBwYXJ0cy5sZW5ndGggLSAxKSlcbiAgICApXG4gIH1cblxuICByZXR1cm4gdXBkYXRlXG5cbiAgZnVuY3Rpb24gc2V0X3BhcnQoaWR4LCB2YWwpIHtcbiAgICBwYXJ0c1tpZHhdID0gdmFsXG5cbiAgICBpZih0aGlzLmRlYm91bmNlID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgICB9XG5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpXG5cbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBjaGFuZ2UocGFydHMuam9pbignJykpXG4gICAgfSwgdGhpcy5kZWJvdW5jZSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICBob29rKGRhdGEpXG4gICAgfSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXh0X25vZGUoZWwpIHtcbiAgdmFyIGhvb2sgPSB0aGlzLnRlbXBsYXRlX3N0cmluZyhlbC50ZXh0Q29udGVudCwgdXBkYXRlKVxuXG4gIGlmKCFob29rKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4ge1xuICAgICAgZWw6IGVsXG4gICAgLCB0ZXh0OiBlbC50ZXh0Q29udGVudFxuICAgICwgaG9va3M6IFtob29rXVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsXG4gIH1cbn1cbiIsInZhciBhZGRfb3BlcmF0b3JzID0gcmVxdWlyZSgnLi9saWIvb3BlcmF0b3JzJylcbiAgLCBjcmVhdGVfYWNjZXNvciA9IHJlcXVpcmUoJy4vbGliL2NyZWF0ZScpXG4gICwgYWRkX2xvb2t1cCA9IHJlcXVpcmUoJy4vbGliL2xvb2t1cCcpXG4gICwgYWRkX2ZpbHRlciA9IHJlcXVpcmUoJy4vbGliL2ZpbHRlcicpXG4gICwgYWRkX3BhcmVucyA9IHJlcXVpcmUoJy4vbGliL3BhcmVucycpXG4gICwgZGVib3VuY2UgPSByZXF1aXJlKCdqdXN0LWRlYm91bmNlJylcbiAgLCBhZGRfdHlwZXMgPSByZXF1aXJlKCcuL2xpYi90eXBlcycpXG4gICwgdHlwZXMgPSBbXVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yc1xuXG4vLyBvcmRlciBpcyBpbXBvcnRhbnRcbmFkZF9wYXJlbnModHlwZXMpXG5hZGRfdHlwZXModHlwZXMpXG5hZGRfb3BlcmF0b3JzKHR5cGVzKVxuYWRkX2ZpbHRlcih0eXBlcylcbmFkZF9sb29rdXAodHlwZXMpXG5cbmFjY2Vzc29ycy5wcm90b3R5cGUuY3JlYXRlX3BhcnQgPSBjcmVhdGVfYWNjZXNvclxuYWNjZXNzb3JzLnByb3RvdHlwZS5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlclxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGUgPSBjcmVhdGVcbmFjY2Vzc29ycy5wcm90b3R5cGUudHlwZXMgPSB0eXBlc1xuXG5mdW5jdGlvbiBhY2Nlc3NvcnMoZmlsdGVycywgZGVsYXkpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWNjZXNzb3JzKSkge1xuICAgIHJldHVybiBuZXcgYWNjZXNzb3JzKGZpbHRlcnMsIGRlbGF5KVxuICB9XG5cbiAgaWYoIWRlbGF5ICYmIGRlbGF5ICE9PSBmYWxzZSkge1xuICAgIGRlbGF5ID0gMFxuICB9XG5cbiAgdGhpcy5kZWxheSA9IGRlbGF5XG4gIHRoaXMuZmlsdGVycyA9IGZpbHRlcnMgfHwge31cbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmbikge1xuICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBjcmVhdGUoc3RyLCBjaGFuZ2UpIHtcbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQoXG4gICAgICBzdHJcbiAgICAsIHRoaXMuZGVsYXkgPT09IGZhbHNlID8gY2hhbmdlIDogZGVib3VuY2UoY2hhbmdlLCB0aGlzLmRlbGF5KVxuICApXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yXG5cbmZ1bmN0aW9uIGFjY2Vzc29yKGtleSwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0cyA9IGtleS5zcGxpdCgnLT4nKVxuICAgICwgY29udGV4dFxuICAgICwgbmV4dFxuICAgICwgcHJldlxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBwYXJ0c1tpXSA9IGJ1aWxkX3BhcnQuY2FsbCh0aGlzLCBwYXJ0c1tpXSwgY2FsbF9uZXh0LmJpbmQodGhpcywgaSArIDEpKVxuICB9XG5cbiAgcmV0dXJuIGNhbGxfbmV4dC5iaW5kKHRoaXMsIDApXG5cbiAgZnVuY3Rpb24gY2FsbF9uZXh0KGksIHZhbCwgY3R4KSB7XG4gICAgaWYoIWkpIHtcbiAgICAgIGNvbnRleHQgPSBjdHggfHwgdmFsXG4gICAgfVxuXG4gICAgaWYoaSA9PT0gcGFydHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gY2hhbmdlLmNhbGwodGhpcywgdmFsLCBjb250ZXh0KVxuICAgIH1cblxuICAgIHBhcnRzW2ldKHZhbCwgY29udGV4dClcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmlzaCh2YWwsIGNvbnRleHQpIHtcbiAgICBpZih2YWwgPT09IHByZXYpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHByZXYgPSB2YWxcbiAgICBjaGFuZ2UuY2FsbCh0aGlzLCB2YWwsIGNvbnRleHQpXG4gIH1cbn1cblxuZnVuY3Rpb24gYnVpbGRfcGFydChwYXJ0LCBjaGFuZ2UpIHtcbiAgdmFyIGFjY2Vzc29yXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMudHlwZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYWNjZXNzb3IgPSB0aGlzLnR5cGVzW2ldLmNhbGwodGhpcywgcGFydCwgY2hhbmdlKSkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgZmlsdGVyX3JlZ2V4cCA9IC9eXFxzKihbXlxccyhdKylcXCgoLiopXFwpXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX2ZpbHRlclxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2ZpbHRlcilcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2ZpbHRlcihwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChmaWx0ZXJfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBmaWx0ZXIgPSB0aGlzLmZpbHRlcnNbcGFydHNbMV1dXG5cbiAgaWYoIWZpbHRlcikge1xuICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgZmlsdGVyOiAnICsgcGFydHNbMV0pXG4gIH1cblxuICByZXR1cm4gZmlsdGVyLmNhbGwodGhpcywgcGFydHNbMl0sIGNoYW5nZSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWRkX2xvb2t1cFxuXG5mdW5jdGlvbiBhZGRfbG9va3VwKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2xvb2t1cClcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2xvb2t1cChwYXRoLCBjaGFuZ2UpIHtcbiAgaWYoIXBhdGguaW5kZXhPZignJGRhdGEnKSkge1xuICAgIHBhdGggPSBwYXRoLnNsaWNlKCckZGF0YS4nLmxlbmd0aClcbiAgfVxuXG4gIHJldHVybiBsb29rdXAocGF0aC5tYXRjaCgvXFxzKiguKlteXFxzXSlcXHMqLylbMV0sIGNoYW5nZSlcbn1cblxuZnVuY3Rpb24gbG9va3VwKHBhdGgsIGRvbmUpIHtcbiAgdmFyIHBhcnRzID0gcGF0aCA/IHBhdGguc3BsaXQoJy4nKSA6IFtdXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IG9iaiAmJiBpIDwgbDsgKytpKSB7XG4gICAgICBvYmogPSBvYmpbcGFydHNbaV1dXG4gICAgfVxuXG4gICAgaWYoaSA9PT0gbCkge1xuICAgICAgcmV0dXJuIGRvbmUob2JqKVxuICAgIH1cblxuICAgIGRvbmUoKVxuICB9XG59XG4iLCJ2YXIgdGVybmFyeV9yZWdleHAgPSAvXlxccyooLis/KVxccypcXD8oLiopXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX29wZXJhdG9yc1xuXG5mdW5jdGlvbiBhZGRfb3BlcmF0b3JzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3Rlcm5hcnkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfFxcXFx8J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ3wnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnXiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJz09PScsICchPT0nLCAnPT0nLCAnIT0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPj0nLCAnPD0nLCAnPicsICc8JywgJyBpbiAnLCAnIGluc3RhbmNlb2YgJ10pKVxuICAvLyB0eXBlcy5wdXNoKGJpbmFyeShbJzw8JywgJz4+JywgJz4+PiddKSkgLy9jb25mbGljcyB3aXRoIDwgYW5kID5cbiAgdHlwZXMucHVzaChiaW5hcnkoWycrJywgJy0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnKicsICcvJywgJyUnXSkpXG4gIHR5cGVzLnB1c2godW5hcnkoWychJywgJysnLCAnLScsICd+J10pKVxufVxuXG5mdW5jdGlvbiBiaW5hcnkobGlzdCkge1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFxuICAgICAgJ15cXFxccyooLis/KVxcXFxzXFwqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV9iaW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1bmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKihcXFxcJyArXG4gICAgICBsaXN0LmpvaW4oJ3xcXFxcJykgK1xuICAgICAgJylcXFxccyooLis/KVxcXFxzKiQnXG4gIClcblxuICByZXR1cm4gZnVuY3Rpb24ocGFydHMsIGNoYW5nZSkge1xuICAgIHJldHVybiBjcmVhdGVfdW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdGVybmFyeShwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaCh0ZXJuYXJ5X3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY29uZGl0aW9uID0gcGFydHNbMV1cbiAgICAsIHJlc3QgPSBwYXJ0c1syXVxuICAgICwgY291bnQgPSAxXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHJlc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYocmVzdFtpXSA9PT0gJzonKSB7XG4gICAgICAtLWNvdW50XG4gICAgfSBlbHNlIGlmKHJlc3RbaV0gPT09ICc/Jykge1xuICAgICAgKytjb3VudFxuICAgIH1cblxuICAgIGlmKCFjb3VudCkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZighaSB8fCBpID09PSByZXN0Lmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIHRlcm5hcnk6ICcgKyBwYXJ0c1swXSlcbiAgfVxuXG4gIHZhciBub3QgPSB0aGlzLmNyZWF0ZV9wYXJ0KHJlc3Quc2xpY2UoaSArIDEpLCBjaGFuZ2UpXG4gICAgLCBvayA9IHRoaXMuY3JlYXRlX3BhcnQocmVzdC5zbGljZSgwLCBpKSwgY2hhbmdlKVxuXG4gIHJldHVybiB0aGlzLmNyZWF0ZV9wYXJ0KGNvbmRpdGlvbiwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdmFsID8gb2soY29udGV4dCkgOiBub3QoY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYmluYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hlY2tfbGhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1sxXSwgdXBkYXRlLmJpbmQobnVsbCwgZmFsc2UpKVxuICAgICwgY2hlY2tfcmhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1szXSwgdXBkYXRlLmJpbmQobnVsbCwgdHJ1ZSkpXG4gICAgLCBsaHNcbiAgICAsIHJoc1xuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCBsaHMsIHJocydcbiAgICAsICdyZXR1cm4gY2hhbmdlKGxocyAnICsgcGFydHNbMl0gKyAnIHJocyknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIG9uX2RhdGFcblxuICBmdW5jdGlvbiBvbl9kYXRhKGRhdGEpIHtcbiAgICBjaGVja19saHMoZGF0YSlcbiAgICBjaGVja19yaHMoZGF0YSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShpc19yaHMsIHZhbCkge1xuICAgIGlzX3JocyA/IHJocyA9IHZhbCA6IGxocyA9IHZhbFxuICAgIGNoYW5nZWQobGhzLCByaHMpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3VuYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hhbmdlZCA9IEZ1bmN0aW9uKFxuICAgICAgJ2NoYW5nZSwgdmFsJ1xuICAgICwgJ3JldHVybiBjaGFuZ2UoJyArIHBhcnRzWzFdICsgJ3ZhbCknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMl0sIGNoYW5nZWQpXG59XG4iLCJ2YXIgcGFyZW5zX3JlZ2V4cCA9IC9eXFxzKlxcKCguKikkL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9wYXJlbnNcblxuZnVuY3Rpb24gYWRkX3BhcmVucyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9wYXJlbnMpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9wYXJlbnMocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gocGFyZW5zX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgYm9keSA9IHBhcnRzWzFdXG4gICAgLCBjb3VudCA9IDFcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYm9keS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihib2R5W2ldID09PSAnKScpIHtcbiAgICAgIC0tY291bnRcbiAgICB9IGVsc2UgaWYoYm9keVtpXSA9PT0gJygnKSB7XG4gICAgICArK2NvdW50XG4gICAgfVxuXG4gICAgaWYoIWNvdW50KSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmKCFpIHx8IGkgPT09IGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCB0ZXJuYXJ5OiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgY29udGVudCA9ICB0aGlzLmNyZWF0ZV9wYXJ0KGJvZHkuc2xpY2UoMCwgaSksIHVwZGF0ZSlcbiAgICAsIGtleSA9ICdwYXJlbl8nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMilcblxuICB2YXIgdGVtcGxhdGUgPSB0aGlzLmNyZWF0ZV9wYXJ0KGtleSArIGJvZHkuc2xpY2UoaSArIDEpLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIGNvbnRlbnRcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjb250ZXh0KSB7XG4gICAgY29udGV4dCA9IE9iamVjdC5jcmVhdGUoY29udGV4dClcbiAgICBjb250ZXh0W2tleV0gPSB2YWxcbiAgICB0ZW1wbGF0ZShjb250ZXh0KVxuICB9XG59XG4iLCJ2YXIgc3RyaW5nX3JlZ2V4cCA9IC9eXFxzKig/OicoKD86W14nXFxcXF18KD86XFxcXC4pKSopJ3xcIigoPzpbXlwiXFxcXF18KD86XFxcXC4pKSopXCIpXFxzKiQvXG4gICwgbnVtYmVyX3JlZ2V4cCA9IC9eXFxzKihcXGQqKD86XFwuXFxkKyk/KVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF90eXBlc1xuXG5mdW5jdGlvbiBhZGRfdHlwZXModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKVxuICB0eXBlcy5wdXNoKGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9zdHJpbmdfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goc3RyaW5nX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKHBhcnRzWzFdIHx8IHBhcnRzWzJdKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gobnVtYmVyX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKCtwYXJ0c1sxXSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZVxuXG5mdW5jdGlvbiBkZWJvdW5jZShmbiwgZGVsYXksIGF0X3N0YXJ0KSB7XG4gIHZhciB0aW1lb3V0XG5cbiAgaWYodHlwZW9mIGRlbGF5ID09PSAndW5kZWZpbmVkJykge1xuICAgIGRlbGF5ID0gMFxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgICAgLCBzZWxmID0gdGhpc1xuXG4gICAgaWYodGltZW91dCAmJiBhdF9zdGFydCkge1xuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIGlmKCFhdF9zdGFydCkge1xuICAgICAgY2xlYXIoKVxuICAgICAgcmV0dXJuIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHJ1biwgZGVsYXkpXG4gICAgfVxuXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYXIsIGRlbGF5KVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG5cbiAgICBmdW5jdGlvbiBydW4oKSB7XG4gICAgICBjbGVhcigpXG4gICAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpXG4gICAgICB0aW1lb3V0ID0gbnVsbFxuICAgIH1cbiAgfVxufVxuIl19
