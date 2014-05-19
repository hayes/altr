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
    , dom_updates = []
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

  return altr.create_accessor(key, update)

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
          place(new_children[i].dom_nodes, prev)
        }
      } else {
        new_children[i] = make_children()
        place(new_children[i].dom_nodes, prev)
      }

      ++offset
      nodes = new_children[i].dom_nodes
      prev = nodes.length ? nodes[nodes.length - 1].nextSibling : null
      nodes = nodes.concat(new_children[i].dom_nodes)
    }

    for(var i = 0, l = children.length; i < l; ++i) {
      dom_updates.push({remove: children[i].dom_nodes})
    }

    children = new_children.slice()
    items = new_items.slice()
    run_updates()
    update_children(data)

    function place(nodes, prev) {
      dom_updates.push({
          insert: nodes
        , before: prev
      })
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

  function run_dom_updates() {
    var update

    for(var i = 0, l = dom_updates.length; i < l; ++i) {
      update = dom_updates[i]

      if(update.remove) {
        for(var j = 0, l2 = update.remove.length; j < l2; ++j) {
          root.removeChild(update.remove[j])
        }
      }

      if(update.insert) {
        for(var j = 0, l2 = update.insert.length; j < l2; ++j) {
          root.insertBefore(update.insert[j], update.before)
        }
      }
    }

    dom_updates = []
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYmF0Y2guanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvdGV4dC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3dpdGguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGVtcGxhdGVfc3RyaW5nLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RleHRfbm9kZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvYXJyb3cuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2NyZWF0ZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvZmlsdGVyLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9sb29rdXAuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL29wZXJhdG9ycy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvcGFyZW5zLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9zcGxpdC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvdHlwZXMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbm9kZV9tb2R1bGVzL2p1c3QtZGVib3VuY2UvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIHRlbXBsYXRlX3N0cmluZyA9IHJlcXVpcmUoJy4vdGVtcGxhdGVfc3RyaW5nJylcbiAgLCBlbGVtZW50X25vZGUgPSByZXF1aXJlKCcuL2VsZW1lbnRfbm9kZScpXG4gICwgYWNjZXNzb3JzID0gcmVxdWlyZSgnYWx0ci1hY2Nlc3NvcnMnKVxuICAsIHRleHRfbm9kZSA9IHJlcXVpcmUoJy4vdGV4dF9ub2RlJylcbiAgLCBiYXRjaCA9IHJlcXVpcmUoJy4vYmF0Y2gnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcbmFsdHIuYWRkX3RhZyA9IGFkZF90YWdcbmFsdHIuaW5jbHVkZSA9IGluY2x1ZGUuYmluZChhbHRyLnByb3RvdHlwZSlcbmFsdHIuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXIuYmluZChhbHRyLnByb3RvdHlwZSlcblxuZnVuY3Rpb24gYWx0cihyb290LCBkYXRhLCBzeW5jLCBkb2MpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWx0cikpIHtcbiAgICByZXR1cm4gbmV3IGFsdHIocm9vdCwgZGF0YSwgc3luYywgZG9jKVxuICB9XG5cbiAgdGhpcy5yb290ID0gcm9vdFxuICB0aGlzLnN5bmMgPSBzeW5jXG4gIHRoaXMuYmF0Y2ggPSBiYXRjaChzeW5jKVxuICB0aGlzLmRvY3VtZW50ID0gZG9jIHx8IGdsb2JhbC5kb2N1bWVudFxuICB0aGlzLmZpbHRlcnMgPSBPYmplY3QuY3JlYXRlKHRoaXMuZmlsdGVycylcbiAgdGhpcy5pbmNsdWRlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5pbmNsdWRlcylcbiAgdGhpcy5hY2Nlc3NvcnMgPSBhY2Nlc3NvcnModGhpcy5maWx0ZXJzLCBmYWxzZSlcblxuICBpZihnbG9iYWwuQnVmZmVyICYmIHJvb3QgaW5zdGFuY2VvZiBnbG9iYWwuQnVmZmVyKSB7XG4gICAgcm9vdCA9IHJvb3QudG9TdHJpbmcoKVxuICB9XG5cbiAgaWYodHlwZW9mIHJvb3QgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHJvb3RcbiAgICB0aGlzLnJvb3QgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXG4gICAgd2hpbGUodGVtcC5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGVtcC5maXJzdENoaWxkKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMucm9vdF9ub2RlcyA9IHRoaXMucm9vdC5ub2RlVHlwZSA9PT0gMTEgP1xuICAgIFtdLnNsaWNlLmNhbGwodGhpcy5yb290LmNoaWxkTm9kZXMpIDogW3RoaXMucm9vdF1cblxuICB0aGlzLnVwZGF0ZSA9IHRoaXMuaW5pdF9ub2Rlcyh0aGlzLnJvb3Rfbm9kZXMpXG5cbiAgaWYoZGF0YSkge1xuICAgIHRoaXMudXBkYXRlKGRhdGEpXG4gIH1cbn1cblxuYWx0ci5wcm90b3R5cGUudGVtcGxhdGVfc3RyaW5nID0gdGVtcGxhdGVfc3RyaW5nXG5hbHRyLnByb3RvdHlwZS5jcmVhdGVfYWNjZXNzb3IgPSBjcmVhdGVfYWNjZXNzb3JcbmFsdHIucHJvdG90eXBlLmFkZF9maWx0ZXIgPSBhZGRfZmlsdGVyXG5hbHRyLnByb3RvdHlwZS5pbml0X25vZGVzID0gaW5pdF9ub2Rlc1xuYWx0ci5wcm90b3R5cGUudG9TdHJpbmcgPSBvdXRlcl9odG1sXG5hbHRyLnByb3RvdHlwZS5pbml0X2VsID0gaW5pdF9lbFxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIucHJvdG90eXBlLmludG8gPSBhcHBlbmRfdG9cblxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZXMgPSB7fVxuYWx0ci5wcm90b3R5cGUudGFnX2xpc3QgPSBbXVxuYWx0ci5wcm90b3R5cGUuZmlsdGVycyA9IHt9XG5hbHRyLnByb3RvdHlwZS50YWdzID0ge31cblxudmFyIG5vZGVfaGFuZGxlcnMgPSB7fVxuXG5ub2RlX2hhbmRsZXJzWzFdID0gZWxlbWVudF9ub2RlXG5ub2RlX2hhbmRsZXJzWzNdID0gdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIGluaXRfbm9kZXMobm9kZXMpIHtcbiAgdmFyIGhvb2tzID0gW10ubWFwLmNhbGwobm9kZXMsIGluaXRfZWwuYmluZCh0aGlzKSkuZmlsdGVyKEJvb2xlYW4pXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGhvb2tzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaG9va3NbaV0oZGF0YSlcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdF9lbChlbCkge1xuICByZXR1cm4gbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV0gP1xuICAgIG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdLmNhbGwodGhpcywgZWwpIDpcbiAgICBlbC5jaGlsZE5vZGVzICYmIGVsLmNoaWxkTm9kZXMubGVuZ3RoID9cbiAgICB0aGlzLmluaXRfbm9kZXMoZWwuY2hpbGROb2RlcykgOlxuICAgIG51bGxcbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmaWx0ZXIpIHtcbiAgYWx0ci5wcm90b3R5cGUuZmlsdGVyc1tuYW1lXSA9IGZpbHRlclxufVxuXG5mdW5jdGlvbiBhZGRfdGFnKGF0dHIsIHRhZykge1xuICBhbHRyLnByb3RvdHlwZS50YWdzW2F0dHJdID0gdGFnXG4gIGFsdHIucHJvdG90eXBlLnRhZ19saXN0LnB1c2goe1xuICAgICAgYXR0cjogYXR0clxuICAgICwgY29uc3RydWN0b3I6IHRhZ1xuICB9KVxufVxuXG5mdW5jdGlvbiBvdXRlcl9odG1sKCkge1xuICByZXR1cm4gdGhpcy5yb290Lm91dGVySFRNTFxufVxuXG5mdW5jdGlvbiBhcHBlbmRfdG8obm9kZSkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5yb290X25vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQodGhpcy5yb290X25vZGVzW2ldKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluY2x1ZGUobmFtZSwgdGVtcGxhdGUpIHtcbiAgcmV0dXJuIHRoaXMuaW5jbHVkZXNbbmFtZV0gPSB0ZW1wbGF0ZVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYWNjZXNzb3IoZGVzY3JpcHRpb24sIGNoYW5nZSkge1xuICByZXR1cm4gdGhpcy5hY2Nlc3NvcnMuY3JlYXRlKGRlc2NyaXB0aW9uLCBjaGFuZ2UsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKG5hbWUsIGZuKSB7XG4gIHJldHVybiB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gQmF0Y2hcblxuZnVuY3Rpb24gQmF0Y2goc3luYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCYXRjaCkpIHtcbiAgICByZXR1cm4gbmV3IEJhdGNoKHN5bmMpXG4gIH1cblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLnN5bmMgPSBzeW5jXG4gIHRoaXMuZnJhbWUgPSBudWxsXG4gIHRoaXMucnVuID0gdGhpcy5ydW4uYmluZCh0aGlzKVxufVxuXG5CYXRjaC5wcm90b3R5cGUucmVxdWVzdF9mcmFtZSA9IHJlcXVlc3RfZnJhbWVcbkJhdGNoLnByb3RvdHlwZS5xdWV1ZSA9IHF1ZXVlXG5CYXRjaC5wcm90b3R5cGUuYWRkID0gYWRkXG5CYXRjaC5wcm90b3R5cGUucnVuID0gcnVuXG5cbmZ1bmN0aW9uIGFkZChmbikge1xuICB2YXIgcXVldWVkID0gZmFsc2VcbiAgICAsIGJhdGNoID0gdGhpc1xuICAgICwgc2VsZlxuICAgICwgYXJnc1xuXG4gIHJldHVybiBxdWV1ZVxuXG4gIGZ1bmN0aW9uIHF1ZXVlKCkge1xuICAgIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICBzZWxmID0gdGhpc1xuXG4gICAgaWYoIXF1ZXVlZCkge1xuICAgICAgcXVldWVkID0gdHJ1ZVxuICAgICAgYmF0Y2gucXVldWUocnVuKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICBxdWV1ZWQgPSBmYWxzZVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVldWUoZm4pIHtcbiAgaWYodGhpcy5zeW5jKSB7XG4gICAgcmV0dXJuIGZuKClcbiAgfVxuXG4gIHRoaXMuam9icy5wdXNoKGZuKVxuICB0aGlzLnJlcXVlc3RfZnJhbWUoKVxufVxuXG5mdW5jdGlvbiBydW4oKSB7XG4gIHZhciBqb2JzID0gdGhpcy5qb2JzXG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5mcmFtZSA9IG51bGxcblxuICBmb3IodmFyIGkgPSAwLCBsID0gam9icy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBqb2JzW2ldKClcbiAgfVxufVxuXG5mdW5jdGlvbiByZXF1ZXN0X2ZyYW1lKCkge1xuICBpZih0aGlzLmZyYW1lKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLmZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMucnVuKVxufVxuXG5mdW5jdGlvbiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgdmFyIHJhZiA9IGdsb2JhbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIHRpbWVvdXRcblxuICByZXR1cm4gcmFmKGNhbGxiYWNrKVxuXG4gIGZ1bmN0aW9uIHRpbWVvdXQoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKVxuICB9XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwuYWx0ciA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX2VsZW1lbnRfbm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVfZWxlbWVudF9ub2RlKGVsKSB7XG4gIHZhciBhbHRyX3RhZ3MgPSB7fVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGhvb2tzID0gW11cbiAgICAsIGF0dHJcblxuICB2YXIgYXR0cnMgPSBBcnJheS5wcm90b3R5cGUuZmlsdGVyLmNhbGwoZWwuYXR0cmlidXRlcywgZnVuY3Rpb24oYXR0cikge1xuICAgIHJldHVybiBhbHRyLnRhZ3NbYXR0ci5uYW1lXSA/XG4gICAgICAoYWx0cl90YWdzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlKSAmJiBmYWxzZSA6XG4gICAgICB0cnVlXG4gIH0pXG5cbiAgYXR0cnMuZm9yRWFjaChmdW5jdGlvbihhdHRyKSB7XG4gICAgdmFyIG5hbWUgPSBhdHRyLm5hbWUuaW5kZXhPZignYWx0ci1hdHRyLScpID9cbiAgICAgIGF0dHIubmFtZSA6XG4gICAgICBhdHRyLm5hbWUuc2xpY2UoJ2FsdHItYXR0ci0nLmxlbmd0aClcblxuICAgIHZhciBhdHRyX2hvb2sgPSBhbHRyLnRlbXBsYXRlX3N0cmluZyhcbiAgICAgICAgYXR0ci52YWx1ZVxuICAgICAgLCBhbHRyLmJhdGNoLmFkZChmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsKVxuICAgICAgICB9KVxuICAgIClcblxuICAgIGlmKGF0dHJfaG9vaykge1xuICAgICAgaG9va3MucHVzaChhdHRyX2hvb2spXG4gICAgfVxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhbHRyLnRhZ19saXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGF0dHIgPSBhbHRyX3RhZ3NbYWx0ci50YWdfbGlzdFtpXS5hdHRyXSkge1xuICAgICAgaG9va3MucHVzaChhbHRyLnRhZ19saXN0W2ldLmNvbnN0cnVjdG9yLmNhbGwoYWx0ciwgZWwsIGF0dHIpKVxuXG4gICAgICByZXR1cm4gdXBkYXRlXG4gICAgfVxuICB9XG5cbiAgaG9va3MucHVzaChhbHRyLmluaXRfbm9kZXMoZWwuY2hpbGROb2RlcykpXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGhvb2tzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaG9va3NbaV0oZGF0YSlcbiAgICB9XG4gIH1cbn1cbiIsInZhciBpbmNsdWRlX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9pbmNsdWRlJylcbiAgLCB0ZXh0X3RhZyA9IHJlcXVpcmUoJy4vdGFncy90ZXh0JylcbiAgLCBodG1sX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9odG1sJylcbiAgLCB3aXRoX3RhZyA9IHJlcXVpcmUoJy4vdGFncy93aXRoJylcbiAgLCBmb3JfdGFnID0gcmVxdWlyZSgnLi90YWdzL2ZvcicpXG4gICwgaWZfdGFnID0gcmVxdWlyZSgnLi90YWdzL2lmJylcbiAgLCBhbHRyID0gcmVxdWlyZSgnLi9hbHRyJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuYWRkX3RhZygnYWx0ci1pbmNsdWRlJywgaW5jbHVkZV90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItdGV4dCcsIHRleHRfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWh0bWwnLCBodG1sX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci13aXRoJywgd2l0aF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItZm9yJywgZm9yX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1pZicsIGlmX3RhZylcbiIsInZhciBmb3JfcmVnZXhwID0gL14oLio/KVxccytpblxccysoLiokKS9cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JfaGFuZGxlclxuXG5mdW5jdGlvbiBmb3JfaGFuZGxlcihyb290LCBhcmdzKSB7XG4gIHZhciBwYXJ0cyA9IGFyZ3MubWF0Y2goZm9yX3JlZ2V4cClcbiAgICAsIHRlbXBsYXRlID0gcm9vdC5pbm5lckhUTUxcbiAgICAsIGRvbV91cGRhdGVzID0gW11cbiAgICAsIGNoaWxkcmVuID0gW11cbiAgICAsIGFsdHIgPSB0aGlzXG4gICAgLCBpdGVtcyA9IFtdXG5cbiAgaWYoIXBhcnRzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGZvciB0YWc6ICcgKyBhcmdzKVxuICB9XG5cbiAgcm9vdC5pbm5lckhUTUwgPSAnJ1xuXG4gIHZhciB1bmlxdWUgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzFdXG4gICAgLCBwcm9wID0gcGFydHNbMV0uc3BsaXQoJzonKVswXVxuICAgICwga2V5ID0gcGFydHNbMl1cblxuICB2YXIgcnVuX3VwZGF0ZXMgPSB0aGlzLmJhdGNoLmFkZChydW5fZG9tX3VwZGF0ZXMpXG5cbiAgcmV0dXJuIGFsdHIuY3JlYXRlX2FjY2Vzc29yKGtleSwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZV9jaGlsZHJlbihkYXRhKSB7XG4gICAgdmFyIGl0ZW1fZGF0YVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaXRlbV9kYXRhID0gT2JqZWN0LmNyZWF0ZShkYXRhKVxuICAgICAgaXRlbV9kYXRhW3Byb3BdID0gaXRlbXNbaV1cbiAgICAgIGl0ZW1fZGF0YVsnJGluZGV4J10gPSBpXG5cbiAgICAgIGNoaWxkcmVuW2ldLnVwZGF0ZSAmJiBjaGlsZHJlbltpXS51cGRhdGUoaXRlbV9kYXRhKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShuZXdfaXRlbXMsIGRhdGEpIHtcbiAgICBpZighQXJyYXkuaXNBcnJheShuZXdfaXRlbXMpKSB7XG4gICAgICBuZXdfaXRlbXMgPSBbXVxuICAgIH1cblxuICAgIHZhciBuZXdfY2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3X2l0ZW1zLmxlbmd0aClcbiAgICAgICwgcHJldiA9IHJvb3QuZmlyc3RDaGlsZFxuICAgICAgLCBvZmZzZXQgPSAwXG4gICAgICAsIGluZGV4XG4gICAgICAsIG5vZGVzXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbmV3X2l0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaW5kZXggPSBmaW5kX2luZGV4KGl0ZW1zLCBuZXdfaXRlbXNbaV0sIHVuaXF1ZSlcblxuICAgICAgaWYoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IChjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpWzBdKVxuICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXgsIDEpXG5cbiAgICAgICAgaWYoaW5kZXggKyBvZmZzZXQgIT09IGkpIHtcbiAgICAgICAgICBwbGFjZShuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzLCBwcmV2KVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdfY2hpbGRyZW5baV0gPSBtYWtlX2NoaWxkcmVuKClcbiAgICAgICAgcGxhY2UobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcywgcHJldilcbiAgICAgIH1cblxuICAgICAgKytvZmZzZXRcbiAgICAgIG5vZGVzID0gbmV3X2NoaWxkcmVuW2ldLmRvbV9ub2Rlc1xuICAgICAgcHJldiA9IG5vZGVzLmxlbmd0aCA/IG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdLm5leHRTaWJsaW5nIDogbnVsbFxuICAgICAgbm9kZXMgPSBub2Rlcy5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcylcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBkb21fdXBkYXRlcy5wdXNoKHtyZW1vdmU6IGNoaWxkcmVuW2ldLmRvbV9ub2Rlc30pXG4gICAgfVxuXG4gICAgY2hpbGRyZW4gPSBuZXdfY2hpbGRyZW4uc2xpY2UoKVxuICAgIGl0ZW1zID0gbmV3X2l0ZW1zLnNsaWNlKClcbiAgICBydW5fdXBkYXRlcygpXG4gICAgdXBkYXRlX2NoaWxkcmVuKGRhdGEpXG5cbiAgICBmdW5jdGlvbiBwbGFjZShub2RlcywgcHJldikge1xuICAgICAgZG9tX3VwZGF0ZXMucHVzaCh7XG4gICAgICAgICAgaW5zZXJ0OiBub2Rlc1xuICAgICAgICAsIGJlZm9yZTogcHJldlxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kX2luZGV4KGl0ZW1zLCBkLCB1bmlxdWUpIHtcbiAgICBpZighdW5pcXVlKSB7XG4gICAgICByZXR1cm4gaXRlbXMuaW5kZXhPZihkKVxuICAgIH1cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGlmKGl0ZW1zW2ldW3VuaXF1ZV0gPT09IGRbdW5pcXVlXSkge1xuICAgICAgICByZXR1cm4gaVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZV9jaGlsZHJlbigpIHtcbiAgICB2YXIgdGVtcCA9IGFsdHIuZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHJvb3QubmFtZXNwYWNlVVJJLCAnZGl2JylcbiAgICAgICwgZG9tX25vZGVzXG4gICAgICAsIHVwZGF0ZVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSB0ZW1wbGF0ZVxuXG4gICAgZG9tX25vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGVtcC5jaGlsZE5vZGVzKVxuICAgIHVwZGF0ZSA9IGFsdHIuaW5pdF9ub2Rlcyhkb21fbm9kZXMpXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBkb21fbm9kZXM6IGRvbV9ub2Rlc1xuICAgICAgLCB1cGRhdGU6IHVwZGF0ZVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bl9kb21fdXBkYXRlcygpIHtcbiAgICB2YXIgdXBkYXRlXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gZG9tX3VwZGF0ZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICB1cGRhdGUgPSBkb21fdXBkYXRlc1tpXVxuXG4gICAgICBpZih1cGRhdGUucmVtb3ZlKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IDAsIGwyID0gdXBkYXRlLnJlbW92ZS5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICAgICAgcm9vdC5yZW1vdmVDaGlsZCh1cGRhdGUucmVtb3ZlW2pdKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmKHVwZGF0ZS5pbnNlcnQpIHtcbiAgICAgICAgZm9yKHZhciBqID0gMCwgbDIgPSB1cGRhdGUuaW5zZXJ0Lmxlbmd0aDsgaiA8IGwyOyArK2opIHtcbiAgICAgICAgICByb290Lmluc2VydEJlZm9yZSh1cGRhdGUuaW5zZXJ0W2pdLCB1cGRhdGUuYmVmb3JlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZG9tX3VwZGF0ZXMgPSBbXVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGh0bWxcblxuZnVuY3Rpb24gaHRtbChlbCwgYWNjZXNzb3IpIHtcbiAgcmV0dXJuIHRoaXMuYmF0Y2guYWRkKHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC5pbm5lckhUTUwgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaWZfdGFnXG5cbmZ1bmN0aW9uIGlmX3RhZyhlbCwgYWNjZXNzb3IpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgICAsIHVwZGF0ZV9jaGlsZHJlbiA9IHRoaXMuaW5pdF9ub2RlcyhlbC5jaGlsZE5vZGVzKVxuICAgICwgcGFyZW50ID0gZWwucGFyZW50Tm9kZVxuICAgICwgaGlkZGVuID0gbnVsbFxuXG4gIHBhcmVudC5pbnNlcnRCZWZvcmUocGxhY2Vob2xkZXIsIGVsLm5leHRTaWJsaW5nKVxuXG4gIHZhciBoaWRlID0gdGhpcy5iYXRjaC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgaWYoIWhpZGRlbikge1xuICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKGVsKVxuICAgICAgaGlkZGVuID0gdHJ1ZVxuICAgIH1cbiAgfSlcblxuICB2YXIgc2hvdyA9IHRoaXMuYmF0Y2guYWRkKGZ1bmN0aW9uKCkge1xuICAgIGlmKGhpZGRlbikge1xuICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShlbCwgcGxhY2Vob2xkZXIpXG4gICAgICBoaWRkZW4gPSBmYWxzZVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gdGhpcy5iYXRjaC5hZGQodGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHRvZ2dsZSkpXG5cbiAgZnVuY3Rpb24gdG9nZ2xlKHZhbCwgZGF0YSkge1xuICAgIHZhbCA/IHNob3coKSAmJiB1cGRhdGVfY2hpbGRyZW4oZGF0YSkgOiBoaWRlKClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmNsdWRlXG5cbmZ1bmN0aW9uIGluY2x1ZGUoZWwsIG5hbWUpIHtcbiAgZWwuaW5uZXJIVE1MID0gdGhpcy5pbmNsdWRlc1tuYW1lXVxuXG4gIHJldHVybiB0aGlzLmluaXRfbm9kZXMoZWwuY2hpbGROb2Rlcylcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdGV4dFxuXG5mdW5jdGlvbiB0ZXh0KGVsLCBhY2Nlc3Nvcikge1xuICByZXR1cm4gdGhpcy5iYXRjaC5hZGQodGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHdpdGhfdGFnXG5cbmZ1bmN0aW9uIHdpdGhfdGFnKGVsLCBhY2Nlc3Nvcikge1xuICByZXR1cm4gdGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHRoaXMuaW5pdF9ub2RlcyhlbC5jaGlsZE5vZGVzKSlcbn1cbiIsInZhciBUQUcgPSAve3tcXHMqKC4qPylcXHMqfX0vXG5cbm1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVfc3RyaW5nXG5cbmZ1bmN0aW9uIHRlbXBsYXRlX3N0cmluZyh0ZW1wbGF0ZSwgY2hhbmdlKSB7XG4gIGlmKCF0ZW1wbGF0ZS5tYXRjaChUQUcpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGVtcGxhdGVcbiAgICAsIHBhcnRzID0gW11cbiAgICAsIGhvb2tzID0gW11cbiAgICAsIHRpbWVyXG4gICAgLCBpbmRleFxuICAgICwgbmV4dFxuXG4gIHdoaWxlKHJlbWFpbmluZyAmJiAobmV4dCA9IHJlbWFpbmluZy5tYXRjaChUQUcpKSkge1xuICAgIGlmKGluZGV4ID0gcmVtYWluaW5nLmluZGV4T2YobmV4dFswXSkpIHtcbiAgICAgIHBhcnRzLnB1c2gocmVtYWluaW5nLnNsaWNlKDAsIGluZGV4KSlcbiAgICB9XG5cbiAgICBwYXJ0cy5wdXNoKCcnKVxuICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZy5zbGljZShpbmRleCArIG5leHRbMF0ubGVuZ3RoKVxuICAgIGhvb2tzLnB1c2goXG4gICAgICAgIHRoaXMuY3JlYXRlX2FjY2Vzc29yKG5leHRbMV0sIHNldF9wYXJ0LmJpbmQodGhpcywgcGFydHMubGVuZ3RoIC0gMSkpXG4gICAgKVxuICB9XG5cbiAgcGFydHMucHVzaChyZW1haW5pbmcpXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHNldF9wYXJ0KGlkeCwgdmFsKSB7XG4gICAgcGFydHNbaWR4XSA9IHZhbFxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICBob29rKGRhdGEpXG4gICAgfSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXh0X25vZGUoZWwpIHtcbiAgcmV0dXJuIHRoaXMudGVtcGxhdGVfc3RyaW5nKGVsLnRleHRDb250ZW50LCB0aGlzLmJhdGNoLmFkZCh1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHZhbFxuICB9XG59XG4iLCJ2YXIgYWRkX29wZXJhdG9ycyA9IHJlcXVpcmUoJy4vbGliL29wZXJhdG9ycycpXG4gICwgY3JlYXRlX2FjY2Vzb3IgPSByZXF1aXJlKCcuL2xpYi9jcmVhdGUnKVxuICAsIGFkZF9sb29rdXAgPSByZXF1aXJlKCcuL2xpYi9sb29rdXAnKVxuICAsIGFkZF9maWx0ZXIgPSByZXF1aXJlKCcuL2xpYi9maWx0ZXInKVxuICAsIGFkZF9wYXJlbnMgPSByZXF1aXJlKCcuL2xpYi9wYXJlbnMnKVxuICAsIGRlYm91bmNlID0gcmVxdWlyZSgnanVzdC1kZWJvdW5jZScpXG4gICwgYWRkX3R5cGVzID0gcmVxdWlyZSgnLi9saWIvdHlwZXMnKVxuICAsIGFkZF9hcnJvdyA9IHJlcXVpcmUoJy4vbGliL2Fycm93JylcbiAgLCBzcGxpdCA9IHJlcXVpcmUoJy4vbGliL3NwbGl0JylcbiAgLCB0eXBlcyA9IFtdXG5cbm1vZHVsZS5leHBvcnRzID0gYWNjZXNzb3JzXG5cbi8vIG9yZGVyIGlzIGltcG9ydGFudFxuYWRkX3R5cGVzKHR5cGVzKVxuYWRkX2Fycm93KHR5cGVzKVxuYWRkX2ZpbHRlcih0eXBlcylcbmFkZF9wYXJlbnModHlwZXMpXG5hZGRfb3BlcmF0b3JzKHR5cGVzKVxuYWRkX2xvb2t1cCh0eXBlcylcblxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGVfcGFydCA9IGNyZWF0ZV9hY2Nlc29yXG5hY2Nlc3NvcnMucHJvdG90eXBlLmFkZF9maWx0ZXIgPSBhZGRfZmlsdGVyXG5hY2Nlc3NvcnMucHJvdG90eXBlLmNyZWF0ZSA9IGNyZWF0ZVxuYWNjZXNzb3JzLnByb3RvdHlwZS50eXBlcyA9IHR5cGVzXG5hY2Nlc3NvcnMucHJvdG90eXBlLnNwbGl0ID0gc3BsaXRcblxuZnVuY3Rpb24gYWNjZXNzb3JzKGZpbHRlcnMsIGRlbGF5KSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIGFjY2Vzc29ycykpIHtcbiAgICByZXR1cm4gbmV3IGFjY2Vzc29ycyhmaWx0ZXJzLCBkZWxheSlcbiAgfVxuXG4gIGlmKCFkZWxheSAmJiBkZWxheSAhPT0gZmFsc2UpIHtcbiAgICBkZWxheSA9IDBcbiAgfVxuXG4gIHRoaXMuZGVsYXkgPSBkZWxheVxuICB0aGlzLmZpbHRlcnMgPSBmaWx0ZXJzIHx8IHt9XG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZm4pIHtcbiAgdGhpcy5maWx0ZXJzW25hbWVdID0gZm5cbn1cblxuZnVuY3Rpb24gY3JlYXRlKHN0ciwgY2hhbmdlKSB7XG4gIHJldHVybiB0aGlzLmNyZWF0ZV9wYXJ0KFxuICAgICAgc3RyXG4gICAgLCB0aGlzLmRlbGF5ID09PSBmYWxzZSA/IGNoYW5nZSA6IGRlYm91bmNlKGNoYW5nZSwgdGhpcy5kZWxheSwgZmFsc2UsIHRydWUpXG4gIClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWRkX2Fycm93XG5cbmZ1bmN0aW9uIGFkZF9hcnJvdyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9hcnJvdylcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2Fycm93KHBhcnRzLCBjaGFuZ2UpIHtcbiAgcGFydHMgPSB0aGlzLnNwbGl0KHBhcnRzLCAnLT4nKVxuXG4gIGlmKHBhcnRzLmxlbmd0aCA8IDIpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByaWdodCA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMV0sIGNoYW5nZSlcbiAgICAsIGxlZnQgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzBdLCB1cGRhdGUpXG5cbiAgcmV0dXJuIGxlZnRcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjdHgpIHtcbiAgICByaWdodCh2YWwsIGN0eClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhY2Nlc3NvclxuXG5mdW5jdGlvbiBhY2Nlc3NvcihrZXksIGNoYW5nZSkge1xuICB2YXIgcGFydCA9IGJ1aWxkX3BhcnQuY2FsbCh0aGlzLCBrZXksIGZpbmlzaClcbiAgICAsIGNvbnRleHRcbiAgICAsIHByZXZcblxuICByZXR1cm4gY2FsbC5iaW5kKHRoaXMpXG5cbiAgZnVuY3Rpb24gY2FsbCh2YWwsIGN0eCkge1xuICAgIHBhcnQodmFsLCBjb250ZXh0ID0gY3R4IHx8IHZhbClcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmlzaCh2YWwpIHtcbiAgICBpZih0eXBlb2YgdmFsICE9PSAnb2JqZWN0JyAmJiB2YWwgPT09IHByZXYpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHByZXYgPSB2YWxcbiAgICBjaGFuZ2UuY2FsbCh0aGlzLCB2YWwsIGNvbnRleHQpXG4gIH1cbn1cblxuZnVuY3Rpb24gYnVpbGRfcGFydChwYXJ0LCBjaGFuZ2UpIHtcbiAgdmFyIGFjY2Vzc29yXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMudHlwZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYWNjZXNzb3IgPSB0aGlzLnR5cGVzW2ldLmNhbGwodGhpcywgcGFydCwgY2hhbmdlKSkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgZmlsdGVyX3JlZ2V4cCA9IC9eXFxzKihbXlxccyhdKylcXCgoLiopXFwpXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX2ZpbHRlclxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2ZpbHRlcilcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2ZpbHRlcihwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChmaWx0ZXJfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBmaWx0ZXIgPSB0aGlzLmZpbHRlcnNbcGFydHNbMV1dXG5cbiAgaWYoIWZpbHRlcikge1xuICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgZmlsdGVyOiAnICsgcGFydHNbMV0pXG4gIH1cblxuICByZXR1cm4gZmlsdGVyLmNhbGwodGhpcywgdGhpcy5zcGxpdChwYXJ0c1syXSwgJywnLCBudWxsLCBudWxsLCB0cnVlKSwgY2hhbmdlKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhZGRfbG9va3VwXG5cbmZ1bmN0aW9uIGFkZF9sb29rdXAodHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfbG9va3VwKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbG9va3VwKHBhdGgsIGNoYW5nZSkge1xuICBpZighcGF0aC5pbmRleE9mKCckZGF0YScpKSB7XG4gICAgcGF0aCA9IHBhdGguc2xpY2UoJyRkYXRhLicubGVuZ3RoKVxuXG4gICAgaWYoIXBhdGgpIHtcbiAgICAgIHJldHVybiBjaGFuZ2VcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbG9va3VwKHBhdGgubWF0Y2goL1xccyooLipbXlxcc10pXFxzKi8pWzFdLCBjaGFuZ2UpXG59XG5cbmZ1bmN0aW9uIGxvb2t1cChwYXRoLCBkb25lKSB7XG4gIHZhciBwYXJ0cyA9IHBhdGggPyBwYXRoLnNwbGl0KCcuJykgOiBbXVxuXG4gIHJldHVybiBmdW5jdGlvbiBzZWFyY2gob2JqLCBjdHgpIHtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBvYmogJiYgaSA8IGw7ICsraSkge1xuICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXVxuICAgIH1cblxuICAgIGlmKHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnICYmIGN0eCkge1xuICAgICAgcmV0dXJuIHNlYXJjaChjdHgpXG4gICAgfVxuXG4gICAgaWYoaSA9PT0gbCkge1xuICAgICAgcmV0dXJuIGRvbmUob2JqKVxuICAgIH1cblxuICAgIGRvbmUoKVxuICB9XG59XG4iLCJ2YXIgdGVybmFyeV9yZWdleHAgPSAvXlxccyooLis/KVxccypcXD8oLiopXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX29wZXJhdG9yc1xuXG5mdW5jdGlvbiBhZGRfb3BlcmF0b3JzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3Rlcm5hcnkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfFxcXFx8J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ3wnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnXiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycmJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJz09PScsICchPT0nLCAnPT0nLCAnIT0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPj0nLCAnPD0nLCAnPicsICc8JywgJyBpbiAnLCAnIGluc3RhbmNlb2YgJ10pKVxuICAvLyB0eXBlcy5wdXNoKGJpbmFyeShbJzw8JywgJz4+JywgJz4+PiddKSkgLy9jb25mbGljcyB3aXRoIDwgYW5kID5cbiAgdHlwZXMucHVzaChiaW5hcnkoWycrJywgJy0nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnKicsICcvJywgJyUnXSkpXG4gIHR5cGVzLnB1c2godW5hcnkoWychJywgJysnLCAnLScsICd+J10pKVxufVxuXG5mdW5jdGlvbiBiaW5hcnkobGlzdCkge1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFxuICAgICAgJ15cXFxccyooLis/KVxcXFxzXFwqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV9iaW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1bmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKihcXFxcJyArXG4gICAgICBsaXN0LmpvaW4oJ3xcXFxcJykgK1xuICAgICAgJylcXFxccyooLis/KVxcXFxzKiQnXG4gIClcblxuICByZXR1cm4gZnVuY3Rpb24ocGFydHMsIGNoYW5nZSkge1xuICAgIHJldHVybiBjcmVhdGVfdW5hcnkuY2FsbCh0aGlzLCByZWdleCwgcGFydHMsIGNoYW5nZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdGVybmFyeShwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaCh0ZXJuYXJ5X3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY29uZGl0aW9uID0gcGFydHNbMV1cbiAgICAsIHJlc3QgPSBwYXJ0c1syXVxuICAgICwgY291bnQgPSAxXG5cbiAgcmVzdCA9IHRoaXMuc3BsaXQocmVzdCwgWyc/J10sIFsnOiddLCAnOicpXG5cbiAgaWYocmVzdC5sZW5ndGggIT09IDIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCB0ZXJuYXJ5OiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgbm90ID0gdGhpcy5jcmVhdGVfcGFydChyZXN0WzFdLCBjaGFuZ2UpXG4gICAgLCBvayA9IHRoaXMuY3JlYXRlX3BhcnQocmVzdFswXSwgY2hhbmdlKVxuXG4gIHJldHVybiB0aGlzLmNyZWF0ZV9wYXJ0KGNvbmRpdGlvbiwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdmFsID8gb2soY29udGV4dCkgOiBub3QoY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYmluYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hlY2tfbGhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1sxXSwgdXBkYXRlLmJpbmQobnVsbCwgZmFsc2UpKVxuICAgICwgY2hlY2tfcmhzID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1szXSwgdXBkYXRlLmJpbmQobnVsbCwgdHJ1ZSkpXG4gICAgLCBsaHNcbiAgICAsIHJoc1xuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCBsaHMsIHJocydcbiAgICAsICdyZXR1cm4gY2hhbmdlKGxocyAnICsgcGFydHNbMl0gKyAnIHJocyknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIG9uX2RhdGFcblxuICBmdW5jdGlvbiBvbl9kYXRhKGRhdGEsIGN0eCkge1xuICAgIGNoZWNrX2xocyhkYXRhLCBjdHgpXG4gICAgY2hlY2tfcmhzKGRhdGEsIGN0eClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShpc19yaHMsIHZhbCkge1xuICAgIGlzX3JocyA/IHJocyA9IHZhbCA6IGxocyA9IHZhbFxuICAgIGNoYW5nZWQobGhzLCByaHMpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3VuYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hhbmdlZCA9IEZ1bmN0aW9uKFxuICAgICAgJ2NoYW5nZSwgdmFsJ1xuICAgICwgJ3JldHVybiBjaGFuZ2UoJyArIHBhcnRzWzFdICsgJ3ZhbCknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMl0sIGNoYW5nZWQpXG59XG4iLCJ2YXIgcGFyZW5zX3JlZ2V4cCA9IC9eXFxzKlxcKCguKikkL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9wYXJlbnNcblxuZnVuY3Rpb24gYWRkX3BhcmVucyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9wYXJlbnMpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9wYXJlbnMocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gocGFyZW5zX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgYm9keSA9IHBhcnRzWzFdXG4gICAgLCBjb3VudCA9IDFcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYm9keS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihib2R5W2ldID09PSAnKScpIHtcbiAgICAgIC0tY291bnRcbiAgICB9IGVsc2UgaWYoYm9keVtpXSA9PT0gJygnKSB7XG4gICAgICArK2NvdW50XG4gICAgfVxuXG4gICAgaWYoIWNvdW50KSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmKCFpIHx8IGkgPT09IGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCB0ZXJuYXJ5OiAnICsgcGFydHNbMF0pXG4gIH1cblxuICB2YXIgY29udGVudCA9ICB0aGlzLmNyZWF0ZV9wYXJ0KGJvZHkuc2xpY2UoMCwgaSksIHVwZGF0ZSlcbiAgICAsIGtleSA9ICdwYXJlbl8nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMilcblxuICB2YXIgdGVtcGxhdGUgPSB0aGlzLmNyZWF0ZV9wYXJ0KGtleSArIGJvZHkuc2xpY2UoaSArIDEpLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIGNvbnRlbnRcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjb250ZXh0KSB7XG4gICAgY29udGV4dCA9IE9iamVjdC5jcmVhdGUoY29udGV4dClcbiAgICBjb250ZXh0W2tleV0gPSB2YWxcbiAgICB0ZW1wbGF0ZShjb250ZXh0KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHNwbGl0XG5cbmZ1bmN0aW9uIHNwbGl0KHBhcnRzLCBrZXksIG9wZW5zLCBjbG9zZXMsIGFsbCkge1xuICB2YXIgYWxsX2Nsb3NlcyA9IFsnKScsICd9JywgJ10nXVxuICAgICwgYWxsX29wZW5zID0gWycoJywgJ3snLCAnWyddXG4gICAgLCBzdW0gPSAwXG4gICAgLCBzcGxpdF9wb2ludFxuICAgICwgaW5kZXhcblxuICBpZihvcGVucykge1xuICAgIGFsbF9vcGVucyA9IGFsbF9vcGVucy5jb25jYXQob3BlbnMpXG4gIH1cblxuICBpZihjbG9zZXMpIHtcbiAgICBhbGxfY2xvc2VzID0gYWxsX2Nsb3Nlcy5jb25jYXQoY2xvc2VzKVxuICB9XG5cbiAgdmFyIGNvdW50cyA9IGFsbF9vcGVucy5tYXAoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDBcbiAgfSlcblxuICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoIXN1bSAmJiAoc3BsaXRfcG9pbnQgPSBwYXJ0cy5zbGljZShpKS5pbmRleE9mKGtleSkpID09PSAtMSkge1xuICAgICAgcmV0dXJuIFtwYXJ0c11cbiAgICB9XG5cbiAgICBpZighc3VtICYmICFzcGxpdF9wb2ludCkge1xuICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICBpZigoaW5kZXggPSBhbGxfb3BlbnMuaW5kZXhPZihwYXJ0c1tpXSkpICE9PSAtMSkge1xuICAgICAgKytjb3VudHNbaW5kZXhdXG4gICAgICArK3N1bVxuICAgIH0gZWxzZSBpZigoaW5kZXggPSBhbGxfY2xvc2VzLmluZGV4T2YocGFydHNbaV0pKSAhPT0gLTEpIHtcbiAgICAgIC0tY291bnRzW2luZGV4XVxuICAgICAgLS1zdW1cbiAgICB9XG5cbiAgICBmb3IodmFyIGogPSAwOyBqIDwgY291bnRzLmxlbmd0aDsgKytqKSB7XG4gICAgICBpZihjb3VudHNbal0gPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIFwiJyArIGFsbF9vcGVuc1tqXSArICdcIlwiIGluICcgKyBwYXJ0cylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZihzdW0gfHwgaSA9PT0gcGFydHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIFtwYXJ0c11cbiAgfVxuXG4gIHZhciByaWdodCA9IHBhcnRzLnNsaWNlKGkgKyBrZXkubGVuZ3RoKVxuICAgICwgbGVmdCA9IHBhcnRzLnNsaWNlKDAsIGkpXG5cbiAgaWYoIWFsbCkge1xuICAgIHJldHVybiBbbGVmdCwgcmlnaHRdXG4gIH1cblxuICByZXR1cm4gW2xlZnRdLmNvbmNhdChzcGxpdChyaWdodCwga2V5LCBvcGVucywgY2xvc2VzLCBhbGwpKVxufVxuIiwidmFyIHN0cmluZ19yZWdleHAgPSAvXlxccyooPzonKCg/OlteJ1xcXFxdfCg/OlxcXFwuKSkqKSd8XCIoKD86W15cIlxcXFxdfCg/OlxcXFwuKSkqKVwiKVxccyokL1xuICAsIG51bWJlcl9yZWdleHAgPSAvXlxccyooXFxkKig/OlxcLlxcZCspPylcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfdHlwZXNcblxuZnVuY3Rpb24gYWRkX3R5cGVzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3N0cmluZ19hY2Nlc3NvcilcbiAgdHlwZXMucHVzaChjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHN0cmluZ19yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZShwYXJ0c1sxXSB8fCBwYXJ0c1syXSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKG51bWJlcl9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZSgrcGFydHNbMV0pXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2VcblxuZnVuY3Rpb24gZGVib3VuY2UoZm4sIGRlbGF5LCBhdF9zdGFydCwgZ3VhcmFudGVlKSB7XG4gIHZhciB0aW1lb3V0XG4gICAgLCBhcmdzXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcblxuICAgIGlmKHRpbWVvdXQgJiYgKGF0X3N0YXJ0IHx8IGd1YXJhbnRlZSkpIHtcbiAgICAgIHJldHVyblxuICAgIH0gZWxzZSBpZighYXRfc3RhcnQpIHtcbiAgICAgIGNsZWFyKClcblxuICAgICAgcmV0dXJuIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHJ1biwgZGVsYXkpXG4gICAgfVxuXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYXIsIGRlbGF5KVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG5cbiAgICBmdW5jdGlvbiBydW4oKSB7XG4gICAgICBjbGVhcigpXG4gICAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpXG4gICAgICB0aW1lb3V0ID0gbnVsbFxuICAgIH1cbiAgfVxufVxuIl19
