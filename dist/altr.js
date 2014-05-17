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

  this.update = this.init_nodes(this.root_nodes)

  if(data) {
    this.update(data)
  }
}

altr.prototype.template_string = template_string
altr.prototype.create_accessor = create_accessor
altr.prototype.add_filter = add_filter
altr.prototype.init_nodes = init_nodes
altr.prototype.toString = outer_html
altr.prototype.init_el = init_el
altr.prototype.include = include
altr.prototype.into = append_to

altr.prototype.includes = {}
altr.prototype.tag_list = []
altr.prototype.filters = {}
altr.prototype.tags = {}

var node_handlers = {}

node_handlers[1] = element_node
node_handlers[3] = text_node

function init_nodes(nodes) {
  var hooks = [].map.call(nodes, init_el.bind(this)).filter(Boolean)

  return update

  function update(data) {
    for(var i = 0, l = hooks.length; i < l; ++i) {
      hooks[i](data)
    }
  }
}

function init_el(el) {
  return node_handlers[el.nodeType] ?
    node_handlers[el.nodeType].call(this, el) :
    el.childNodes && el.childNodes.length ?
    this.init_nodes(el.childNodes) :
    null
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
},{"./batch":2,"./element_node":4,"./template_string":12,"./text_node":13,"altr-accessors":14}],2:[function(require,module,exports){
(function (global){
module.exports = Batch

function Batch(sync) {
  if(!(this instanceof Batch)) {
    return new Batch(sync)
  }

  this.jobs = []
  this.sync = sync
  this.frame = null
  this.run = this.run.bind(this)
}

Batch.prototype.request_frame = request_frame
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

    if(!queued) {
      queued = true
      batch.queue(run)
    }
  }

  function run() {
    queued = false
    fn.apply(self, args)
  }
}

function queue(fn) {
  if(this.sync) {
    return fn()
  }

  this.jobs.push(fn)
  this.request_frame()
}

function run() {
  var jobs = this.jobs

  this.jobs = []
  this.frame = null

  for(var i = 0, l = jobs.length; i < l; ++i) {
    jobs[i]()
  }
}

function request_frame() {
  if(this.frame) {
    return
  }

  this.frame = requestAnimationFrame(this.run)
}

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
},{}],3:[function(require,module,exports){
(function (global){
module.exports = global.altr = require('./index')

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./index":5}],4:[function(require,module,exports){
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
    var name = attr.name.indexOf('altr-attr-') ?
      attr.name :
      attr.name.slice('altr-attr-'.length)

    var attr_hook = altr.template_string(
        attr.value
      , altr.batch.add(function(val) {
          el.setAttribute(name, val)
        })
    )

    if(attr_hook) {
      hooks.push(attr_hook)
    }
  })

  for(var i = 0, l = altr.tag_list.length; i < l; ++i) {
    if(attr = altr_tags[altr.tag_list[i].attr]) {
      hooks.push(altr.tag_list[i].constructor.call(altr, el, attr))

      return update
    }
  }

  hooks.push(altr.init_nodes(el.childNodes))

  return update

  function update(data) {
    for(var i = 0, l = hooks.length; i < l; ++i) {
      hooks[i](data)
    }
  }
}

},{}],5:[function(require,module,exports){
var include_tag = require('./tags/include')
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

},{"./altr":1,"./tags/for":6,"./tags/html":7,"./tags/if":8,"./tags/include":9,"./tags/text":10,"./tags/with":11}],6:[function(require,module,exports){
var for_regexp = /^(.*?)\s+in\s+(.*$)/

module.exports = for_handler

function for_handler(root, args) {
  var parts = args.match(for_regexp)
    , template = root.innerHTML
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

  return altr.create_accessor(key, altr.batch.add(update))

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
      , prev = root.firstChild
      , offset = 0
      , index
      , nodes

    for(var i = 0, l = new_items.length; i < l; ++i) {
      index = find_index(items, new_items[i], unique)

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
    }

    for(var i = 0, l = children.length; i < l; ++i) {
      children[i].dom_nodes.forEach(function(node) {
        node.parentNode.removeChild(node)
      })
    }

    children = new_children.slice()
    items = new_items.slice()
    update_children(data)

    function place(nodes) {
      for(var i = 0, l = nodes.length; i < l; ++i) {
        root.insertBefore(nodes[i], prev)
      }
    }
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
    update = altr.init_nodes(dom_nodes)

    return {
        dom_nodes: dom_nodes
      , update: update
    }
  }
}

},{}],7:[function(require,module,exports){
module.exports = html

function html(el, accessor) {
  return this.batch.add(this.create_accessor(accessor, update))

  function update(val) {
    el.innerHTML = typeof val === 'undefined' ? '' : val
  }
}

},{}],8:[function(require,module,exports){
module.exports = if_tag

function if_tag(el, accessor) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , update_children = this.init_nodes(el.childNodes)
    , parent = el.parentNode
    , hidden = null

  parent.insertBefore(placeholder, el.nextSibling)

  var hide = this.batch.add(function() {
    if(!hidden) {
      parent.removeChild(el)
      hidden = true
    }
  })

  var show = this.batch.add(function() {
    if(hidden) {
      parent.insertBefore(el, placeholder)
      hidden = false
    }
  })

  return this.batch.add(this.create_accessor(accessor, toggle))

  function toggle(val, data) {
    val ? show() && update_children(data) : hide()
  }
}

},{}],9:[function(require,module,exports){
module.exports = include

function include(el, name) {
  el.innerHTML = this.includes[name]

  return this.init_nodes(el.childNodes)
}

},{}],10:[function(require,module,exports){
module.exports = text

function text(el, accessor) {
  return this.batch.add(this.create_accessor(accessor, update))

  function update(val) {
    el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],11:[function(require,module,exports){
module.exports = with_tag

function with_tag(el, accessor) {
  return this.create_accessor(accessor, this.init_nodes(el.childNodes))
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

},{}],13:[function(require,module,exports){
module.exports = create_text_node

function create_text_node(el) {
  return this.template_string(el.textContent, this.batch.add(update))

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

function create(str, change) {
  return this.create_part(
      str
    , this.delay === false ? change : debounce(change, this.delay, false, true)
  )
}

},{"./lib/arrow":15,"./lib/create":16,"./lib/filter":17,"./lib/lookup":18,"./lib/operators":19,"./lib/parens":20,"./lib/split":21,"./lib/types":22,"just-debounce":23}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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
    if(typeof val !== 'object' && val === prev) {
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

  return filter.call(this, this.split(parts[2], ',', null, null, true), change)
}

},{}],18:[function(require,module,exports){
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

  rest = this.split(rest, ['?'], [':'], ':')

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYmF0Y2guanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvdGV4dC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3dpdGguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGVtcGxhdGVfc3RyaW5nLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RleHRfbm9kZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvYXJyb3cuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2NyZWF0ZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvZmlsdGVyLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9sb29rdXAuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL29wZXJhdG9ycy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvcGFyZW5zLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9zcGxpdC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvdHlwZXMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbm9kZV9tb2R1bGVzL2p1c3QtZGVib3VuY2UvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgdGVtcGxhdGVfc3RyaW5nID0gcmVxdWlyZSgnLi90ZW1wbGF0ZV9zdHJpbmcnKVxuICAsIGVsZW1lbnRfbm9kZSA9IHJlcXVpcmUoJy4vZWxlbWVudF9ub2RlJylcbiAgLCBhY2Nlc3NvcnMgPSByZXF1aXJlKCdhbHRyLWFjY2Vzc29ycycpXG4gICwgdGV4dF9ub2RlID0gcmVxdWlyZSgnLi90ZXh0X25vZGUnKVxuICAsIGJhdGNoID0gcmVxdWlyZSgnLi9iYXRjaCcpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuYWx0ci5hZGRfdGFnID0gYWRkX3RhZ1xuYWx0ci5pbmNsdWRlID0gaW5jbHVkZS5iaW5kKGFsdHIucHJvdG90eXBlKVxuYWx0ci5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlci5iaW5kKGFsdHIucHJvdG90eXBlKVxuXG5mdW5jdGlvbiBhbHRyKHJvb3QsIGRhdGEsIHN5bmMsIGRvYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBzeW5jLCBkb2MpXG4gIH1cblxuICB0aGlzLnJvb3QgPSByb290XG4gIHRoaXMuc3luYyA9IHN5bmNcbiAgdGhpcy5iYXRjaCA9IGJhdGNoKHN5bmMpXG4gIHRoaXMuZG9jdW1lbnQgPSBkb2MgfHwgZ2xvYmFsLmRvY3VtZW50XG4gIHRoaXMuZmlsdGVycyA9IE9iamVjdC5jcmVhdGUodGhpcy5maWx0ZXJzKVxuICB0aGlzLmluY2x1ZGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLmluY2x1ZGVzKVxuICB0aGlzLmFjY2Vzc29ycyA9IGFjY2Vzc29ycyh0aGlzLmZpbHRlcnMsIGZhbHNlKVxuXG4gIGlmKGdsb2JhbC5CdWZmZXIgJiYgcm9vdCBpbnN0YW5jZW9mIGdsb2JhbC5CdWZmZXIpIHtcbiAgICByb290ID0gcm9vdC50b1N0cmluZygpXG4gIH1cblxuICBpZih0eXBlb2Ygcm9vdCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgdGVtcCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gcm9vdFxuICAgIHRoaXMucm9vdCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG5cbiAgICB3aGlsZSh0ZW1wLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMucm9vdC5hcHBlbmRDaGlsZCh0ZW1wLmZpcnN0Q2hpbGQpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5yb290X25vZGVzID0gdGhpcy5yb290Lm5vZGVUeXBlID09PSAxMSA/XG4gICAgW10uc2xpY2UuY2FsbCh0aGlzLnJvb3QuY2hpbGROb2RlcykgOiBbdGhpcy5yb290XVxuXG4gIHRoaXMudXBkYXRlID0gdGhpcy5pbml0X25vZGVzKHRoaXMucm9vdF9ub2RlcylcblxuICBpZihkYXRhKSB7XG4gICAgdGhpcy51cGRhdGUoZGF0YSlcbiAgfVxufVxuXG5hbHRyLnByb3RvdHlwZS50ZW1wbGF0ZV9zdHJpbmcgPSB0ZW1wbGF0ZV9zdHJpbmdcbmFsdHIucHJvdG90eXBlLmNyZWF0ZV9hY2Nlc3NvciA9IGNyZWF0ZV9hY2Nlc3NvclxuYWx0ci5wcm90b3R5cGUuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXJcbmFsdHIucHJvdG90eXBlLmluaXRfbm9kZXMgPSBpbml0X25vZGVzXG5hbHRyLnByb3RvdHlwZS50b1N0cmluZyA9IG91dGVyX2h0bWxcbmFsdHIucHJvdG90eXBlLmluaXRfZWwgPSBpbml0X2VsXG5hbHRyLnByb3RvdHlwZS5pbmNsdWRlID0gaW5jbHVkZVxuYWx0ci5wcm90b3R5cGUuaW50byA9IGFwcGVuZF90b1xuXG5hbHRyLnByb3RvdHlwZS5pbmNsdWRlcyA9IHt9XG5hbHRyLnByb3RvdHlwZS50YWdfbGlzdCA9IFtdXG5hbHRyLnByb3RvdHlwZS5maWx0ZXJzID0ge31cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG52YXIgbm9kZV9oYW5kbGVycyA9IHt9XG5cbm5vZGVfaGFuZGxlcnNbMV0gPSBlbGVtZW50X25vZGVcbm5vZGVfaGFuZGxlcnNbM10gPSB0ZXh0X25vZGVcblxuZnVuY3Rpb24gaW5pdF9ub2Rlcyhub2Rlcykge1xuICB2YXIgaG9va3MgPSBbXS5tYXAuY2FsbChub2RlcywgaW5pdF9lbC5iaW5kKHRoaXMpKS5maWx0ZXIoQm9vbGVhbilcblxuICByZXR1cm4gdXBkYXRlXG5cbiAgZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gaG9va3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBob29rc1tpXShkYXRhKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0X2VsKGVsKSB7XG4gIHJldHVybiBub2RlX2hhbmRsZXJzW2VsLm5vZGVUeXBlXSA/XG4gICAgbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV0uY2FsbCh0aGlzLCBlbCkgOlxuICAgIGVsLmNoaWxkTm9kZXMgJiYgZWwuY2hpbGROb2Rlcy5sZW5ndGggP1xuICAgIHRoaXMuaW5pdF9ub2RlcyhlbC5jaGlsZE5vZGVzKSA6XG4gICAgbnVsbFxufVxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKG5hbWUsIGZpbHRlcikge1xuICBhbHRyLnByb3RvdHlwZS5maWx0ZXJzW25hbWVdID0gZmlsdGVyXG59XG5cbmZ1bmN0aW9uIGFkZF90YWcoYXR0ciwgdGFnKSB7XG4gIGFsdHIucHJvdG90eXBlLnRhZ3NbYXR0cl0gPSB0YWdcbiAgYWx0ci5wcm90b3R5cGUudGFnX2xpc3QucHVzaCh7XG4gICAgICBhdHRyOiBhdHRyXG4gICAgLCBjb25zdHJ1Y3RvcjogdGFnXG4gIH0pXG59XG5cbmZ1bmN0aW9uIG91dGVyX2h0bWwoKSB7XG4gIHJldHVybiB0aGlzLnJvb3Qub3V0ZXJIVE1MXG59XG5cbmZ1bmN0aW9uIGFwcGVuZF90byhub2RlKSB7XG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnJvb3Rfbm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgbm9kZS5hcHBlbmRDaGlsZCh0aGlzLnJvb3Rfbm9kZXNbaV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5jbHVkZShuYW1lLCB0ZW1wbGF0ZSkge1xuICByZXR1cm4gdGhpcy5pbmNsdWRlc1tuYW1lXSA9IHRlbXBsYXRlXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9hY2Nlc3NvcihkZXNjcmlwdGlvbiwgY2hhbmdlKSB7XG4gIHJldHVybiB0aGlzLmFjY2Vzc29ycy5jcmVhdGUoZGVzY3JpcHRpb24sIGNoYW5nZSwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZm4pIHtcbiAgcmV0dXJuIHRoaXMuZmlsdGVyc1tuYW1lXSA9IGZuXG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSBCYXRjaFxuXG5mdW5jdGlvbiBCYXRjaChzeW5jKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIEJhdGNoKSkge1xuICAgIHJldHVybiBuZXcgQmF0Y2goc3luYylcbiAgfVxuXG4gIHRoaXMuam9icyA9IFtdXG4gIHRoaXMuc3luYyA9IHN5bmNcbiAgdGhpcy5mcmFtZSA9IG51bGxcbiAgdGhpcy5ydW4gPSB0aGlzLnJ1bi5iaW5kKHRoaXMpXG59XG5cbkJhdGNoLnByb3RvdHlwZS5yZXF1ZXN0X2ZyYW1lID0gcmVxdWVzdF9mcmFtZVxuQmF0Y2gucHJvdG90eXBlLnF1ZXVlID0gcXVldWVcbkJhdGNoLnByb3RvdHlwZS5hZGQgPSBhZGRcbkJhdGNoLnByb3RvdHlwZS5ydW4gPSBydW5cblxuZnVuY3Rpb24gYWRkKGZuKSB7XG4gIHZhciBxdWV1ZWQgPSBmYWxzZVxuICAgICwgYmF0Y2ggPSB0aGlzXG4gICAgLCBzZWxmXG4gICAgLCBhcmdzXG5cbiAgcmV0dXJuIHF1ZXVlXG5cbiAgZnVuY3Rpb24gcXVldWUoKSB7XG4gICAgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHNlbGYgPSB0aGlzXG5cbiAgICBpZighcXVldWVkKSB7XG4gICAgICBxdWV1ZWQgPSB0cnVlXG4gICAgICBiYXRjaC5xdWV1ZShydW4pXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcnVuKCkge1xuICAgIHF1ZXVlZCA9IGZhbHNlXG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWV1ZShmbikge1xuICBpZih0aGlzLnN5bmMpIHtcbiAgICByZXR1cm4gZm4oKVxuICB9XG5cbiAgdGhpcy5qb2JzLnB1c2goZm4pXG4gIHRoaXMucmVxdWVzdF9mcmFtZSgpXG59XG5cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNcblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLmZyYW1lID0gbnVsbFxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBqb2JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGpvYnNbaV0oKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJlcXVlc3RfZnJhbWUoKSB7XG4gIGlmKHRoaXMuZnJhbWUpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHRoaXMuZnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5ydW4pXG59XG5cbmZ1bmN0aW9uIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICB2YXIgcmFmID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgdGltZW91dFxuXG4gIHJldHVybiByYWYoY2FsbGJhY2spXG5cbiAgZnVuY3Rpb24gdGltZW91dChjYWxsYmFjaykge1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApXG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5hbHRyID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfZWxlbWVudF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV9lbGVtZW50X25vZGUoZWwpIHtcbiAgdmFyIGFsdHJfdGFncyA9IHt9XG4gICAgLCBhbHRyID0gdGhpc1xuICAgICwgaG9va3MgPSBbXVxuICAgICwgYXR0clxuXG4gIHZhciBhdHRycyA9IEFycmF5LnByb3RvdHlwZS5maWx0ZXIuY2FsbChlbC5hdHRyaWJ1dGVzLCBmdW5jdGlvbihhdHRyKSB7XG4gICAgcmV0dXJuIGFsdHIudGFnc1thdHRyLm5hbWVdID9cbiAgICAgIChhbHRyX3RhZ3NbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWUpICYmIGZhbHNlIDpcbiAgICAgIHRydWVcbiAgfSlcblxuICBhdHRycy5mb3JFYWNoKGZ1bmN0aW9uKGF0dHIpIHtcbiAgICB2YXIgbmFtZSA9IGF0dHIubmFtZS5pbmRleE9mKCdhbHRyLWF0dHItJykgP1xuICAgICAgYXR0ci5uYW1lIDpcbiAgICAgIGF0dHIubmFtZS5zbGljZSgnYWx0ci1hdHRyLScubGVuZ3RoKVxuXG4gICAgdmFyIGF0dHJfaG9vayA9IGFsdHIudGVtcGxhdGVfc3RyaW5nKFxuICAgICAgICBhdHRyLnZhbHVlXG4gICAgICAsIGFsdHIuYmF0Y2guYWRkKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCB2YWwpXG4gICAgICAgIH0pXG4gICAgKVxuXG4gICAgaWYoYXR0cl9ob29rKSB7XG4gICAgICBob29rcy5wdXNoKGF0dHJfaG9vaylcbiAgICB9XG4gIH0pXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGFsdHIudGFnX2xpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYXR0ciA9IGFsdHJfdGFnc1thbHRyLnRhZ19saXN0W2ldLmF0dHJdKSB7XG4gICAgICBob29rcy5wdXNoKGFsdHIudGFnX2xpc3RbaV0uY29uc3RydWN0b3IuY2FsbChhbHRyLCBlbCwgYXR0cikpXG5cbiAgICAgIHJldHVybiB1cGRhdGVcbiAgICB9XG4gIH1cblxuICBob29rcy5wdXNoKGFsdHIuaW5pdF9ub2RlcyhlbC5jaGlsZE5vZGVzKSlcblxuICByZXR1cm4gdXBkYXRlXG5cbiAgZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gaG9va3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBob29rc1tpXShkYXRhKVxuICAgIH1cbiAgfVxufVxuIiwidmFyIGluY2x1ZGVfdGFnID0gcmVxdWlyZSgnLi90YWdzL2luY2x1ZGUnKVxuICAsIHRleHRfdGFnID0gcmVxdWlyZSgnLi90YWdzL3RleHQnKVxuICAsIGh0bWxfdGFnID0gcmVxdWlyZSgnLi90YWdzL2h0bWwnKVxuICAsIHdpdGhfdGFnID0gcmVxdWlyZSgnLi90YWdzL3dpdGgnKVxuICAsIGZvcl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvZm9yJylcbiAgLCBpZl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaWYnKVxuICAsIGFsdHIgPSByZXF1aXJlKCcuL2FsdHInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcblxuYWx0ci5hZGRfdGFnKCdhbHRyLWluY2x1ZGUnLCBpbmNsdWRlX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci10ZXh0JywgdGV4dF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItaHRtbCcsIGh0bWxfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLXdpdGgnLCB3aXRoX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1mb3InLCBmb3JfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWlmJywgaWZfdGFnKVxuIiwidmFyIGZvcl9yZWdleHAgPSAvXiguKj8pXFxzK2luXFxzKyguKiQpL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZvcl9oYW5kbGVyXG5cbmZ1bmN0aW9uIGZvcl9oYW5kbGVyKHJvb3QsIGFyZ3MpIHtcbiAgdmFyIHBhcnRzID0gYXJncy5tYXRjaChmb3JfcmVnZXhwKVxuICAgICwgdGVtcGxhdGUgPSByb290LmlubmVySFRNTFxuICAgICwgY2hpbGRyZW4gPSBbXVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGl0ZW1zID0gW11cblxuICBpZighcGFydHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgZm9yIHRhZzogJyArIGFyZ3MpXG4gIH1cblxuICByb290LmlubmVySFRNTCA9ICcnXG5cbiAgdmFyIHVuaXF1ZSA9IHBhcnRzWzFdLnNwbGl0KCc6JylbMV1cbiAgICAsIHByb3AgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzBdXG4gICAgLCBrZXkgPSBwYXJ0c1syXVxuXG4gIHJldHVybiBhbHRyLmNyZWF0ZV9hY2Nlc3NvcihrZXksIGFsdHIuYmF0Y2guYWRkKHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlX2NoaWxkcmVuKGRhdGEpIHtcbiAgICB2YXIgaXRlbV9kYXRhXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpdGVtX2RhdGEgPSBPYmplY3QuY3JlYXRlKGRhdGEpXG4gICAgICBpdGVtX2RhdGFbcHJvcF0gPSBpdGVtc1tpXVxuICAgICAgaXRlbV9kYXRhWyckaW5kZXgnXSA9IGlcblxuICAgICAgY2hpbGRyZW5baV0udXBkYXRlICYmIGNoaWxkcmVuW2ldLnVwZGF0ZShpdGVtX2RhdGEpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKG5ld19pdGVtcywgZGF0YSkge1xuICAgIGlmKCFBcnJheS5pc0FycmF5KG5ld19pdGVtcykpIHtcbiAgICAgIG5ld19pdGVtcyA9IFtdXG4gICAgfVxuXG4gICAgdmFyIG5ld19jaGlsZHJlbiA9IG5ldyBBcnJheShuZXdfaXRlbXMubGVuZ3RoKVxuICAgICAgLCBwcmV2ID0gcm9vdC5maXJzdENoaWxkXG4gICAgICAsIG9mZnNldCA9IDBcbiAgICAgICwgaW5kZXhcbiAgICAgICwgbm9kZXNcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBuZXdfaXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpbmRleCA9IGZpbmRfaW5kZXgoaXRlbXMsIG5ld19pdGVtc1tpXSwgdW5pcXVlKVxuXG4gICAgICBpZihpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gKGNoaWxkcmVuLnNwbGljZShpbmRleCwgMSlbMF0pXG4gICAgICAgIGl0ZW1zLnNwbGljZShpbmRleCwgMSlcblxuICAgICAgICBpZihpbmRleCArIG9mZnNldCAhPT0gaSkge1xuICAgICAgICAgIHBsYWNlKG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICAgIH1cblxuICAgICAgICArK29mZnNldFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gbWFrZV9jaGlsZHJlbigpXG4gICAgICAgIHBsYWNlKG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICAgICsrb2Zmc2V0XG4gICAgICB9XG5cbiAgICAgIG5vZGVzID0gbmV3X2NoaWxkcmVuW2ldLmRvbV9ub2Rlc1xuICAgICAgcHJldiA9IG5vZGVzLmxlbmd0aCA/IG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdLm5leHRTaWJsaW5nIDogbnVsbFxuICAgICAgbm9kZXMgPSBub2Rlcy5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcylcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBjaGlsZHJlbltpXS5kb21fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG5ld19jaGlsZHJlbi5zbGljZSgpXG4gICAgaXRlbXMgPSBuZXdfaXRlbXMuc2xpY2UoKVxuICAgIHVwZGF0ZV9jaGlsZHJlbihkYXRhKVxuXG4gICAgZnVuY3Rpb24gcGxhY2Uobm9kZXMpIHtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgcm9vdC5pbnNlcnRCZWZvcmUobm9kZXNbaV0sIHByZXYpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZmluZF9pbmRleChpdGVtcywgZCwgdW5pcXVlKSB7XG4gICAgaWYoIXVuaXF1ZSkge1xuICAgICAgcmV0dXJuIGl0ZW1zLmluZGV4T2YoZClcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gaXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpZihpdGVtc1tpXVt1bmlxdWVdID09PSBkW3VuaXF1ZV0pIHtcbiAgICAgICAgcmV0dXJuIGlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gLTFcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VfY2hpbGRyZW4oKSB7XG4gICAgdmFyIHRlbXAgPSBhbHRyLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhyb290Lm5hbWVzcGFjZVVSSSwgJ2RpdicpXG4gICAgICAsIGRvbV9ub2Rlc1xuICAgICAgLCB1cGRhdGVcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gdGVtcGxhdGVcblxuICAgIGRvbV9ub2RlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRlbXAuY2hpbGROb2RlcylcbiAgICB1cGRhdGUgPSBhbHRyLmluaXRfbm9kZXMoZG9tX25vZGVzKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZG9tX25vZGVzOiBkb21fbm9kZXNcbiAgICAgICwgdXBkYXRlOiB1cGRhdGVcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaHRtbFxuXG5mdW5jdGlvbiBodG1sKGVsLCBhY2Nlc3Nvcikge1xuICByZXR1cm4gdGhpcy5iYXRjaC5hZGQodGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLmlubmVySFRNTCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpZl90YWdcblxuZnVuY3Rpb24gaWZfdGFnKGVsLCBhY2Nlc3Nvcikge1xuICB2YXIgcGxhY2Vob2xkZXIgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ2FsdHItaWYtcGxhY2Vob2xkZXInKVxuICAgICwgdXBkYXRlX2NoaWxkcmVuID0gdGhpcy5pbml0X25vZGVzKGVsLmNoaWxkTm9kZXMpXG4gICAgLCBwYXJlbnQgPSBlbC5wYXJlbnROb2RlXG4gICAgLCBoaWRkZW4gPSBudWxsXG5cbiAgcGFyZW50Lmluc2VydEJlZm9yZShwbGFjZWhvbGRlciwgZWwubmV4dFNpYmxpbmcpXG5cbiAgdmFyIGhpZGUgPSB0aGlzLmJhdGNoLmFkZChmdW5jdGlvbigpIHtcbiAgICBpZighaGlkZGVuKSB7XG4gICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpXG4gICAgICBoaWRkZW4gPSB0cnVlXG4gICAgfVxuICB9KVxuXG4gIHZhciBzaG93ID0gdGhpcy5iYXRjaC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgaWYoaGlkZGVuKSB7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGVsLCBwbGFjZWhvbGRlcilcbiAgICAgIGhpZGRlbiA9IGZhbHNlXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdG9nZ2xlKSlcblxuICBmdW5jdGlvbiB0b2dnbGUodmFsLCBkYXRhKSB7XG4gICAgdmFsID8gc2hvdygpICYmIHVwZGF0ZV9jaGlsZHJlbihkYXRhKSA6IGhpZGUoKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluY2x1ZGVcblxuZnVuY3Rpb24gaW5jbHVkZShlbCwgbmFtZSkge1xuICBlbC5pbm5lckhUTUwgPSB0aGlzLmluY2x1ZGVzW25hbWVdXG5cbiAgcmV0dXJuIHRoaXMuaW5pdF9ub2RlcyhlbC5jaGlsZE5vZGVzKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZXh0XG5cbmZ1bmN0aW9uIHRleHQoZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gd2l0aF90YWdcblxuZnVuY3Rpb24gd2l0aF90YWcoZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdGhpcy5pbml0X25vZGVzKGVsLmNoaWxkTm9kZXMpKVxufVxuIiwidmFyIFRBRyA9IC97e1xccyooLio/KVxccyp9fS9cblxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZV9zdHJpbmdcblxuZnVuY3Rpb24gdGVtcGxhdGVfc3RyaW5nKHRlbXBsYXRlLCBjaGFuZ2UpIHtcbiAgaWYoIXRlbXBsYXRlLm1hdGNoKFRBRykpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0ZW1wbGF0ZVxuICAgICwgcGFydHMgPSBbXVxuICAgICwgaG9va3MgPSBbXVxuICAgICwgdGltZXJcbiAgICAsIGluZGV4XG4gICAgLCBuZXh0XG5cbiAgd2hpbGUocmVtYWluaW5nICYmIChuZXh0ID0gcmVtYWluaW5nLm1hdGNoKFRBRykpKSB7XG4gICAgaWYoaW5kZXggPSByZW1haW5pbmcuaW5kZXhPZihuZXh0WzBdKSkge1xuICAgICAgcGFydHMucHVzaChyZW1haW5pbmcuc2xpY2UoMCwgaW5kZXgpKVxuICAgIH1cblxuICAgIHBhcnRzLnB1c2goJycpXG4gICAgcmVtYWluaW5nID0gcmVtYWluaW5nLnNsaWNlKGluZGV4ICsgbmV4dFswXS5sZW5ndGgpXG4gICAgaG9va3MucHVzaChcbiAgICAgICAgdGhpcy5jcmVhdGVfYWNjZXNzb3IobmV4dFsxXSwgc2V0X3BhcnQuYmluZCh0aGlzLCBwYXJ0cy5sZW5ndGggLSAxKSlcbiAgICApXG4gIH1cblxuICBwYXJ0cy5wdXNoKHJlbWFpbmluZylcblxuICByZXR1cm4gdXBkYXRlXG5cbiAgZnVuY3Rpb24gc2V0X3BhcnQoaWR4LCB2YWwpIHtcbiAgICBwYXJ0c1tpZHhdID0gdmFsXG4gICAgY2hhbmdlKHBhcnRzLmpvaW4oJycpKVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgICBob29rcy5mb3JFYWNoKGZ1bmN0aW9uKGhvb2spIHtcbiAgICAgIGhvb2soZGF0YSlcbiAgICB9KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZV90ZXh0X25vZGVcblxuZnVuY3Rpb24gY3JlYXRlX3RleHRfbm9kZShlbCkge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZV9zdHJpbmcoZWwudGV4dENvbnRlbnQsIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsXG4gIH1cbn1cbiIsInZhciBhZGRfb3BlcmF0b3JzID0gcmVxdWlyZSgnLi9saWIvb3BlcmF0b3JzJylcbiAgLCBjcmVhdGVfYWNjZXNvciA9IHJlcXVpcmUoJy4vbGliL2NyZWF0ZScpXG4gICwgYWRkX2xvb2t1cCA9IHJlcXVpcmUoJy4vbGliL2xvb2t1cCcpXG4gICwgYWRkX2ZpbHRlciA9IHJlcXVpcmUoJy4vbGliL2ZpbHRlcicpXG4gICwgYWRkX3BhcmVucyA9IHJlcXVpcmUoJy4vbGliL3BhcmVucycpXG4gICwgZGVib3VuY2UgPSByZXF1aXJlKCdqdXN0LWRlYm91bmNlJylcbiAgLCBhZGRfdHlwZXMgPSByZXF1aXJlKCcuL2xpYi90eXBlcycpXG4gICwgYWRkX2Fycm93ID0gcmVxdWlyZSgnLi9saWIvYXJyb3cnKVxuICAsIHNwbGl0ID0gcmVxdWlyZSgnLi9saWIvc3BsaXQnKVxuICAsIHR5cGVzID0gW11cblxubW9kdWxlLmV4cG9ydHMgPSBhY2Nlc3NvcnNcblxuLy8gb3JkZXIgaXMgaW1wb3J0YW50XG5hZGRfdHlwZXModHlwZXMpXG5hZGRfYXJyb3codHlwZXMpXG5hZGRfZmlsdGVyKHR5cGVzKVxuYWRkX3BhcmVucyh0eXBlcylcbmFkZF9vcGVyYXRvcnModHlwZXMpXG5hZGRfbG9va3VwKHR5cGVzKVxuXG5hY2Nlc3NvcnMucHJvdG90eXBlLmNyZWF0ZV9wYXJ0ID0gY3JlYXRlX2FjY2Vzb3JcbmFjY2Vzc29ycy5wcm90b3R5cGUuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXJcbmFjY2Vzc29ycy5wcm90b3R5cGUuY3JlYXRlID0gY3JlYXRlXG5hY2Nlc3NvcnMucHJvdG90eXBlLnR5cGVzID0gdHlwZXNcbmFjY2Vzc29ycy5wcm90b3R5cGUuc3BsaXQgPSBzcGxpdFxuXG5mdW5jdGlvbiBhY2Nlc3NvcnMoZmlsdGVycywgZGVsYXkpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWNjZXNzb3JzKSkge1xuICAgIHJldHVybiBuZXcgYWNjZXNzb3JzKGZpbHRlcnMsIGRlbGF5KVxuICB9XG5cbiAgaWYoIWRlbGF5ICYmIGRlbGF5ICE9PSBmYWxzZSkge1xuICAgIGRlbGF5ID0gMFxuICB9XG5cbiAgdGhpcy5kZWxheSA9IGRlbGF5XG4gIHRoaXMuZmlsdGVycyA9IGZpbHRlcnMgfHwge31cbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmbikge1xuICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBjcmVhdGUoc3RyLCBjaGFuZ2UpIHtcbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQoXG4gICAgICBzdHJcbiAgICAsIHRoaXMuZGVsYXkgPT09IGZhbHNlID8gY2hhbmdlIDogZGVib3VuY2UoY2hhbmdlLCB0aGlzLmRlbGF5LCBmYWxzZSwgdHJ1ZSlcbiAgKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhZGRfYXJyb3dcblxuZnVuY3Rpb24gYWRkX2Fycm93KHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2Fycm93KVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYXJyb3cocGFydHMsIGNoYW5nZSkge1xuICBwYXJ0cyA9IHRoaXMuc3BsaXQocGFydHMsICctPicpXG5cbiAgaWYocGFydHMubGVuZ3RoIDwgMikge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJpZ2h0ID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1sxXSwgY2hhbmdlKVxuICAgICwgbGVmdCA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMF0sIHVwZGF0ZSlcblxuICByZXR1cm4gbGVmdFxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGN0eCkge1xuICAgIHJpZ2h0KHZhbCwgY3R4KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yXG5cbmZ1bmN0aW9uIGFjY2Vzc29yKGtleSwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0ID0gYnVpbGRfcGFydC5jYWxsKHRoaXMsIGtleSwgZmluaXNoKVxuICAgICwgY29udGV4dFxuICAgICwgcHJldlxuXG4gIHJldHVybiBjYWxsLmJpbmQodGhpcylcblxuICBmdW5jdGlvbiBjYWxsKHZhbCwgY3R4KSB7XG4gICAgcGFydCh2YWwsIGNvbnRleHQgPSBjdHggfHwgdmFsKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluaXNoKHZhbCkge1xuICAgIGlmKHR5cGVvZiB2YWwgIT09ICdvYmplY3QnICYmIHZhbCA9PT0gcHJldikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgcHJldiA9IHZhbFxuICAgIGNoYW5nZS5jYWxsKHRoaXMsIHZhbCwgY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZF9wYXJ0KHBhcnQsIGNoYW5nZSkge1xuICB2YXIgYWNjZXNzb3JcblxuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy50eXBlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihhY2Nlc3NvciA9IHRoaXMudHlwZXNbaV0uY2FsbCh0aGlzLCBwYXJ0LCBjaGFuZ2UpKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3JcbiAgICB9XG4gIH1cbn1cbiIsInZhciBmaWx0ZXJfcmVnZXhwID0gL15cXHMqKFteXFxzKF0rKVxcKCguKilcXClcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfZmlsdGVyXG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIodHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfZmlsdGVyKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfZmlsdGVyKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKGZpbHRlcl9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGZpbHRlciA9IHRoaXMuZmlsdGVyc1twYXJ0c1sxXV1cblxuICBpZighZmlsdGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgZmluZCBmaWx0ZXI6ICcgKyBwYXJ0c1sxXSlcbiAgfVxuXG4gIHJldHVybiBmaWx0ZXIuY2FsbCh0aGlzLCB0aGlzLnNwbGl0KHBhcnRzWzJdLCAnLCcsIG51bGwsIG51bGwsIHRydWUpLCBjaGFuZ2UpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFkZF9sb29rdXBcblxuZnVuY3Rpb24gYWRkX2xvb2t1cCh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9sb29rdXApXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9sb29rdXAocGF0aCwgY2hhbmdlKSB7XG4gIGlmKCFwYXRoLmluZGV4T2YoJyRkYXRhJykpIHtcbiAgICBwYXRoID0gcGF0aC5zbGljZSgnJGRhdGEuJy5sZW5ndGgpXG5cbiAgICBpZighcGF0aCkge1xuICAgICAgcmV0dXJuIGNoYW5nZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBsb29rdXAocGF0aC5tYXRjaCgvXFxzKiguKlteXFxzXSlcXHMqLylbMV0sIGNoYW5nZSlcbn1cblxuZnVuY3Rpb24gbG9va3VwKHBhdGgsIGRvbmUpIHtcbiAgdmFyIHBhcnRzID0gcGF0aCA/IHBhdGguc3BsaXQoJy4nKSA6IFtdXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHNlYXJjaChvYmosIGN0eCkge1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IG9iaiAmJiBpIDwgbDsgKytpKSB7XG4gICAgICBvYmogPSBvYmpbcGFydHNbaV1dXG4gICAgfVxuXG4gICAgaWYodHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcgJiYgY3R4KSB7XG4gICAgICByZXR1cm4gc2VhcmNoKGN0eClcbiAgICB9XG5cbiAgICBpZihpID09PSBsKSB7XG4gICAgICByZXR1cm4gZG9uZShvYmopXG4gICAgfVxuXG4gICAgZG9uZSgpXG4gIH1cbn1cbiIsInZhciB0ZXJuYXJ5X3JlZ2V4cCA9IC9eXFxzKiguKz8pXFxzKlxcPyguKilcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfb3BlcmF0b3JzXG5cbmZ1bmN0aW9uIGFkZF9vcGVyYXRvcnModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfdGVybmFyeSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyd8XFxcXHwnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnJiYnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfCddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWydeJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPT09JywgJyE9PScsICc9PScsICchPSddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyc+PScsICc8PScsICc+JywgJzwnLCAnIGluICcsICcgaW5zdGFuY2VvZiAnXSkpXG4gIC8vIHR5cGVzLnB1c2goYmluYXJ5KFsnPDwnLCAnPj4nLCAnPj4+J10pKSAvL2NvbmZsaWNzIHdpdGggPCBhbmQgPlxuICB0eXBlcy5wdXNoKGJpbmFyeShbJysnLCAnLSddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycqJywgJy8nLCAnJSddKSlcbiAgdHlwZXMucHVzaCh1bmFyeShbJyEnLCAnKycsICctJywgJ34nXSkpXG59XG5cbmZ1bmN0aW9uIGJpbmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKiguKz8pXFxcXHNcXCooXFxcXCcgK1xuICAgICAgbGlzdC5qb2luKCd8XFxcXCcpICtcbiAgICAgICcpXFxcXHMqKC4rPylcXFxccyokJ1xuICApXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHBhcnRzLCBjaGFuZ2UpIHtcbiAgICByZXR1cm4gY3JlYXRlX2JpbmFyeS5jYWxsKHRoaXMsIHJlZ2V4LCBwYXJ0cywgY2hhbmdlKVxuICB9XG59XG5cbmZ1bmN0aW9uIHVuYXJ5KGxpc3QpIHtcbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgICAgICdeXFxcXHMqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV91bmFyeS5jYWxsKHRoaXMsIHJlZ2V4LCBwYXJ0cywgY2hhbmdlKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXJuYXJ5KHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHRlcm5hcnlfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjb25kaXRpb24gPSBwYXJ0c1sxXVxuICAgICwgcmVzdCA9IHBhcnRzWzJdXG4gICAgLCBjb3VudCA9IDFcblxuICByZXN0ID0gdGhpcy5zcGxpdChyZXN0LCBbJz8nXSwgWyc6J10sICc6JylcblxuICBpZihyZXN0Lmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIHRlcm5hcnk6ICcgKyBwYXJ0c1swXSlcbiAgfVxuXG4gIHZhciBub3QgPSB0aGlzLmNyZWF0ZV9wYXJ0KHJlc3RbMV0sIGNoYW5nZSlcbiAgICAsIG9rID0gdGhpcy5jcmVhdGVfcGFydChyZXN0WzBdLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQoY29uZGl0aW9uLCB1cGRhdGUpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgY29udGV4dCkge1xuICAgIHJldHVybiB2YWwgPyBvayhjb250ZXh0KSA6IG5vdChjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9iaW5hcnkocmVnZXgsIHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHJlZ2V4KSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjaGVja19saHMgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzFdLCB1cGRhdGUuYmluZChudWxsLCBmYWxzZSkpXG4gICAgLCBjaGVja19yaHMgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzNdLCB1cGRhdGUuYmluZChudWxsLCB0cnVlKSlcbiAgICAsIGxoc1xuICAgICwgcmhzXG5cbiAgdmFyIGNoYW5nZWQgPSBGdW5jdGlvbihcbiAgICAgICdjaGFuZ2UsIGxocywgcmhzJ1xuICAgICwgJ3JldHVybiBjaGFuZ2UobGhzICcgKyBwYXJ0c1syXSArICcgcmhzKSdcbiAgKS5iaW5kKG51bGwsIGNoYW5nZSlcblxuICByZXR1cm4gb25fZGF0YVxuXG4gIGZ1bmN0aW9uIG9uX2RhdGEoZGF0YSwgY3R4KSB7XG4gICAgY2hlY2tfbGhzKGRhdGEsIGN0eClcbiAgICBjaGVja19yaHMoZGF0YSwgY3R4KVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGlzX3JocywgdmFsKSB7XG4gICAgaXNfcmhzID8gcmhzID0gdmFsIDogbGhzID0gdmFsXG4gICAgY2hhbmdlZChsaHMsIHJocylcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdW5hcnkocmVnZXgsIHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHJlZ2V4KSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCB2YWwnXG4gICAgLCAncmV0dXJuIGNoYW5nZSgnICsgcGFydHNbMV0gKyAndmFsKSdcbiAgKS5iaW5kKG51bGwsIGNoYW5nZSlcblxuICByZXR1cm4gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1syXSwgY2hhbmdlZClcbn1cbiIsInZhciBwYXJlbnNfcmVnZXhwID0gL15cXHMqXFwoKC4qKSQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX3BhcmVuc1xuXG5mdW5jdGlvbiBhZGRfcGFyZW5zKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3BhcmVucylcbn1cblxuZnVuY3Rpb24gY3JlYXRlX3BhcmVucyhwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChwYXJlbnNfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBib2R5ID0gcGFydHNbMV1cbiAgICAsIGNvdW50ID0gMVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBib2R5Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGJvZHlbaV0gPT09ICcpJykge1xuICAgICAgLS1jb3VudFxuICAgIH0gZWxzZSBpZihib2R5W2ldID09PSAnKCcpIHtcbiAgICAgICsrY291bnRcbiAgICB9XG5cbiAgICBpZighY291bnQpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYoIWkgfHwgaSA9PT0gbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIHRlcm5hcnk6ICcgKyBwYXJ0c1swXSlcbiAgfVxuXG4gIHZhciBjb250ZW50ID0gIHRoaXMuY3JlYXRlX3BhcnQoYm9keS5zbGljZSgwLCBpKSwgdXBkYXRlKVxuICAgICwga2V5ID0gJ3BhcmVuXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyKVxuXG4gIHZhciB0ZW1wbGF0ZSA9IHRoaXMuY3JlYXRlX3BhcnQoa2V5ICsgYm9keS5zbGljZShpICsgMSksIGNoYW5nZSlcblxuICByZXR1cm4gY29udGVudFxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICBjb250ZXh0ID0gT2JqZWN0LmNyZWF0ZShjb250ZXh0KVxuICAgIGNvbnRleHRba2V5XSA9IHZhbFxuICAgIHRlbXBsYXRlKGNvbnRleHQpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gc3BsaXRcblxuZnVuY3Rpb24gc3BsaXQocGFydHMsIGtleSwgb3BlbnMsIGNsb3NlcywgYWxsKSB7XG4gIHZhciBhbGxfY2xvc2VzID0gWycpJywgJ30nLCAnXSddXG4gICAgLCBhbGxfb3BlbnMgPSBbJygnLCAneycsICdbJ11cbiAgICAsIHN1bSA9IDBcbiAgICAsIHNwbGl0X3BvaW50XG4gICAgLCBpbmRleFxuXG4gIGlmKG9wZW5zKSB7XG4gICAgYWxsX29wZW5zID0gYWxsX29wZW5zLmNvbmNhdChvcGVucylcbiAgfVxuXG4gIGlmKGNsb3Nlcykge1xuICAgIGFsbF9jbG9zZXMgPSBhbGxfY2xvc2VzLmNvbmNhdChjbG9zZXMpXG4gIH1cblxuICB2YXIgY291bnRzID0gYWxsX29wZW5zLm1hcChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMFxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZighc3VtICYmIChzcGxpdF9wb2ludCA9IHBhcnRzLnNsaWNlKGkpLmluZGV4T2Yoa2V5KSkgPT09IC0xKSB7XG4gICAgICByZXR1cm4gW3BhcnRzXVxuICAgIH1cblxuICAgIGlmKCFzdW0gJiYgIXNwbGl0X3BvaW50KSB7XG4gICAgICBicmVha1xuICAgIH1cblxuICAgIGlmKChpbmRleCA9IGFsbF9vcGVucy5pbmRleE9mKHBhcnRzW2ldKSkgIT09IC0xKSB7XG4gICAgICArK2NvdW50c1tpbmRleF1cbiAgICAgICsrc3VtXG4gICAgfSBlbHNlIGlmKChpbmRleCA9IGFsbF9jbG9zZXMuaW5kZXhPZihwYXJ0c1tpXSkpICE9PSAtMSkge1xuICAgICAgLS1jb3VudHNbaW5kZXhdXG4gICAgICAtLXN1bVxuICAgIH1cblxuICAgIGZvcih2YXIgaiA9IDA7IGogPCBjb3VudHMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmKGNvdW50c1tqXSA8IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgXCInICsgYWxsX29wZW5zW2pdICsgJ1wiXCIgaW4gJyArIHBhcnRzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKHN1bSB8fCBpID09PSBwYXJ0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gW3BhcnRzXVxuICB9XG5cbiAgdmFyIHJpZ2h0ID0gcGFydHMuc2xpY2UoaSArIGtleS5sZW5ndGgpXG4gICAgLCBsZWZ0ID0gcGFydHMuc2xpY2UoMCwgaSlcblxuICBpZighYWxsKSB7XG4gICAgcmV0dXJuIFtsZWZ0LCByaWdodF1cbiAgfVxuXG4gIHJldHVybiBbbGVmdF0uY29uY2F0KHNwbGl0KHJpZ2h0LCBrZXksIG9wZW5zLCBjbG9zZXMsIGFsbCkpXG59XG4iLCJ2YXIgc3RyaW5nX3JlZ2V4cCA9IC9eXFxzKig/OicoKD86W14nXFxcXF18KD86XFxcXC4pKSopJ3xcIigoPzpbXlwiXFxcXF18KD86XFxcXC4pKSopXCIpXFxzKiQvXG4gICwgbnVtYmVyX3JlZ2V4cCA9IC9eXFxzKihcXGQqKD86XFwuXFxkKyk/KVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF90eXBlc1xuXG5mdW5jdGlvbiBhZGRfdHlwZXModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKVxuICB0eXBlcy5wdXNoKGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9zdHJpbmdfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goc3RyaW5nX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKHBhcnRzWzFdIHx8IHBhcnRzWzJdKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gobnVtYmVyX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKCtwYXJ0c1sxXSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZVxuXG5mdW5jdGlvbiBkZWJvdW5jZShmbiwgZGVsYXksIGF0X3N0YXJ0LCBndWFyYW50ZWUpIHtcbiAgdmFyIHRpbWVvdXRcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuXG4gICAgaWYodGltZW91dCAmJiAoYXRfc3RhcnQgfHwgZ3VhcmFudGVlKSkge1xuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIGlmKCFhdF9zdGFydCkge1xuICAgICAgY2xlYXIoKVxuXG4gICAgICByZXR1cm4gdGltZW91dCA9IHNldFRpbWVvdXQocnVuLCBkZWxheSlcbiAgICB9XG5cbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhciwgZGVsYXkpXG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcblxuICAgIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICAgIGNsZWFyKClcbiAgICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dClcbiAgICAgIHRpbWVvdXQgPSBudWxsXG4gICAgfVxuICB9XG59XG4iXX0=
