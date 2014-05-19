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

  this._update = this.init_nodes(this.root_nodes)

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
altr.prototype.update = update

altr.prototype.includes = {}
altr.prototype.tag_list = []
altr.prototype.filters = {}
altr.prototype.tags = {}

var node_handlers = {}

node_handlers[1] = element_node
node_handlers[3] = text_node

function update(data) {
  this._update(data)

  if(this.sync) {
    this.batch.run()
  }
}

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
  this.jobs.push(fn)

  if(!this.sync) {
    this.request_frame()
  }
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
    var value = attr.value
      , name = attr.name

    if(!name.indexOf('altr-attr-')) {
      name = attr.name.slice('altr-attr-'.length)
      el.removeAttribute(attr.name)
    }

    var attr_hook = altr.template_string(value, altr.batch.add(function(val) {
      el.setAttribute(name, val)
    }))

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

  return this.create_accessor(accessor, toggle)

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
  var part = this.create_part(
      str
    , this.delay === false ? update : debounce(change, this.delay, false, true)
  )

  var sync = false
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
    out = [].slice.call(arguments)

    if(!sync) {
      change.apply(null, out)
    }
  }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYmF0Y2guanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvdGV4dC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3dpdGguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGVtcGxhdGVfc3RyaW5nLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RleHRfbm9kZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvYXJyb3cuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2NyZWF0ZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvZmlsdGVyLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9sb29rdXAuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL29wZXJhdG9ycy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvcGFyZW5zLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9zcGxpdC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvdHlwZXMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbm9kZV9tb2R1bGVzL2p1c3QtZGVib3VuY2UvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIHRlbXBsYXRlX3N0cmluZyA9IHJlcXVpcmUoJy4vdGVtcGxhdGVfc3RyaW5nJylcbiAgLCBlbGVtZW50X25vZGUgPSByZXF1aXJlKCcuL2VsZW1lbnRfbm9kZScpXG4gICwgYWNjZXNzb3JzID0gcmVxdWlyZSgnYWx0ci1hY2Nlc3NvcnMnKVxuICAsIHRleHRfbm9kZSA9IHJlcXVpcmUoJy4vdGV4dF9ub2RlJylcbiAgLCBiYXRjaCA9IHJlcXVpcmUoJy4vYmF0Y2gnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcbmFsdHIuYWRkX3RhZyA9IGFkZF90YWdcbmFsdHIuaW5jbHVkZSA9IGluY2x1ZGUuYmluZChhbHRyLnByb3RvdHlwZSlcbmFsdHIuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXIuYmluZChhbHRyLnByb3RvdHlwZSlcblxuZnVuY3Rpb24gYWx0cihyb290LCBkYXRhLCBzeW5jLCBkb2MpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWx0cikpIHtcbiAgICByZXR1cm4gbmV3IGFsdHIocm9vdCwgZGF0YSwgc3luYywgZG9jKVxuICB9XG5cbiAgdGhpcy5yb290ID0gcm9vdFxuICB0aGlzLnN5bmMgPSBzeW5jXG4gIHRoaXMuYmF0Y2ggPSBiYXRjaChzeW5jKVxuICB0aGlzLmRvY3VtZW50ID0gZG9jIHx8IGdsb2JhbC5kb2N1bWVudFxuICB0aGlzLmZpbHRlcnMgPSBPYmplY3QuY3JlYXRlKHRoaXMuZmlsdGVycylcbiAgdGhpcy5pbmNsdWRlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5pbmNsdWRlcylcbiAgdGhpcy5hY2Nlc3NvcnMgPSBhY2Nlc3NvcnModGhpcy5maWx0ZXJzLCBmYWxzZSlcblxuICBpZihnbG9iYWwuQnVmZmVyICYmIHJvb3QgaW5zdGFuY2VvZiBnbG9iYWwuQnVmZmVyKSB7XG4gICAgcm9vdCA9IHJvb3QudG9TdHJpbmcoKVxuICB9XG5cbiAgaWYodHlwZW9mIHJvb3QgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHJvb3RcbiAgICB0aGlzLnJvb3QgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXG4gICAgd2hpbGUodGVtcC5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGVtcC5maXJzdENoaWxkKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMucm9vdF9ub2RlcyA9IHRoaXMucm9vdC5ub2RlVHlwZSA9PT0gMTEgP1xuICAgIFtdLnNsaWNlLmNhbGwodGhpcy5yb290LmNoaWxkTm9kZXMpIDogW3RoaXMucm9vdF1cblxuICB0aGlzLl91cGRhdGUgPSB0aGlzLmluaXRfbm9kZXModGhpcy5yb290X25vZGVzKVxuXG4gIGlmKGRhdGEpIHtcbiAgICB0aGlzLnVwZGF0ZShkYXRhKVxuICB9XG59XG5cbmFsdHIucHJvdG90eXBlLnRlbXBsYXRlX3N0cmluZyA9IHRlbXBsYXRlX3N0cmluZ1xuYWx0ci5wcm90b3R5cGUuY3JlYXRlX2FjY2Vzc29yID0gY3JlYXRlX2FjY2Vzc29yXG5hbHRyLnByb3RvdHlwZS5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlclxuYWx0ci5wcm90b3R5cGUuaW5pdF9ub2RlcyA9IGluaXRfbm9kZXNcbmFsdHIucHJvdG90eXBlLnRvU3RyaW5nID0gb3V0ZXJfaHRtbFxuYWx0ci5wcm90b3R5cGUuaW5pdF9lbCA9IGluaXRfZWxcbmFsdHIucHJvdG90eXBlLmluY2x1ZGUgPSBpbmNsdWRlXG5hbHRyLnByb3RvdHlwZS5pbnRvID0gYXBwZW5kX3RvXG5hbHRyLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcblxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZXMgPSB7fVxuYWx0ci5wcm90b3R5cGUudGFnX2xpc3QgPSBbXVxuYWx0ci5wcm90b3R5cGUuZmlsdGVycyA9IHt9XG5hbHRyLnByb3RvdHlwZS50YWdzID0ge31cblxudmFyIG5vZGVfaGFuZGxlcnMgPSB7fVxuXG5ub2RlX2hhbmRsZXJzWzFdID0gZWxlbWVudF9ub2RlXG5ub2RlX2hhbmRsZXJzWzNdID0gdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gIHRoaXMuX3VwZGF0ZShkYXRhKVxuXG4gIGlmKHRoaXMuc3luYykge1xuICAgIHRoaXMuYmF0Y2gucnVuKClcbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0X25vZGVzKG5vZGVzKSB7XG4gIHZhciBob29rcyA9IFtdLm1hcC5jYWxsKG5vZGVzLCBpbml0X2VsLmJpbmQodGhpcykpLmZpbHRlcihCb29sZWFuKVxuXG4gIHJldHVybiB1cGRhdGVcblxuICBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBob29rcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGhvb2tzW2ldKGRhdGEpXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRfZWwoZWwpIHtcbiAgcmV0dXJuIG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdID9cbiAgICBub2RlX2hhbmRsZXJzW2VsLm5vZGVUeXBlXS5jYWxsKHRoaXMsIGVsKSA6XG4gICAgZWwuY2hpbGROb2RlcyAmJiBlbC5jaGlsZE5vZGVzLmxlbmd0aCA/XG4gICAgdGhpcy5pbml0X25vZGVzKGVsLmNoaWxkTm9kZXMpIDpcbiAgICBudWxsXG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZmlsdGVyKSB7XG4gIGFsdHIucHJvdG90eXBlLmZpbHRlcnNbbmFtZV0gPSBmaWx0ZXJcbn1cblxuZnVuY3Rpb24gYWRkX3RhZyhhdHRyLCB0YWcpIHtcbiAgYWx0ci5wcm90b3R5cGUudGFnc1thdHRyXSA9IHRhZ1xuICBhbHRyLnByb3RvdHlwZS50YWdfbGlzdC5wdXNoKHtcbiAgICAgIGF0dHI6IGF0dHJcbiAgICAsIGNvbnN0cnVjdG9yOiB0YWdcbiAgfSlcbn1cblxuZnVuY3Rpb24gb3V0ZXJfaHRtbCgpIHtcbiAgcmV0dXJuIHRoaXMucm9vdC5vdXRlckhUTUxcbn1cblxuZnVuY3Rpb24gYXBwZW5kX3RvKG5vZGUpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMucm9vdF9ub2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBub2RlLmFwcGVuZENoaWxkKHRoaXMucm9vdF9ub2Rlc1tpXSlcbiAgfVxufVxuXG5mdW5jdGlvbiBpbmNsdWRlKG5hbWUsIHRlbXBsYXRlKSB7XG4gIHJldHVybiB0aGlzLmluY2x1ZGVzW25hbWVdID0gdGVtcGxhdGVcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2FjY2Vzc29yKGRlc2NyaXB0aW9uLCBjaGFuZ2UpIHtcbiAgcmV0dXJuIHRoaXMuYWNjZXNzb3JzLmNyZWF0ZShkZXNjcmlwdGlvbiwgY2hhbmdlLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmbikge1xuICByZXR1cm4gdGhpcy5maWx0ZXJzW25hbWVdID0gZm5cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IEJhdGNoXG5cbmZ1bmN0aW9uIEJhdGNoKHN5bmMpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgQmF0Y2gpKSB7XG4gICAgcmV0dXJuIG5ldyBCYXRjaChzeW5jKVxuICB9XG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5zeW5jID0gc3luY1xuICB0aGlzLmZyYW1lID0gbnVsbFxuICB0aGlzLnJ1biA9IHRoaXMucnVuLmJpbmQodGhpcylcbn1cblxuQmF0Y2gucHJvdG90eXBlLnJlcXVlc3RfZnJhbWUgPSByZXF1ZXN0X2ZyYW1lXG5CYXRjaC5wcm90b3R5cGUucXVldWUgPSBxdWV1ZVxuQmF0Y2gucHJvdG90eXBlLmFkZCA9IGFkZFxuQmF0Y2gucHJvdG90eXBlLnJ1biA9IHJ1blxuXG5mdW5jdGlvbiBhZGQoZm4pIHtcbiAgdmFyIHF1ZXVlZCA9IGZhbHNlXG4gICAgLCBiYXRjaCA9IHRoaXNcbiAgICAsIHNlbGZcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gcXVldWVcblxuICBmdW5jdGlvbiBxdWV1ZSgpIHtcbiAgICBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgc2VsZiA9IHRoaXNcblxuICAgIGlmKCFxdWV1ZWQpIHtcbiAgICAgIHF1ZXVlZCA9IHRydWVcbiAgICAgIGJhdGNoLnF1ZXVlKHJ1bilcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBydW4oKSB7XG4gICAgcXVldWVkID0gZmFsc2VcbiAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXVlKGZuKSB7XG4gIHRoaXMuam9icy5wdXNoKGZuKVxuXG4gIGlmKCF0aGlzLnN5bmMpIHtcbiAgICB0aGlzLnJlcXVlc3RfZnJhbWUoKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNcblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLmZyYW1lID0gbnVsbFxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBqb2JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGpvYnNbaV0oKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJlcXVlc3RfZnJhbWUoKSB7XG4gIGlmKHRoaXMuZnJhbWUpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHRoaXMuZnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5ydW4pXG59XG5cbmZ1bmN0aW9uIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICB2YXIgcmFmID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgdGltZW91dFxuXG4gIHJldHVybiByYWYoY2FsbGJhY2spXG5cbiAgZnVuY3Rpb24gdGltZW91dChjYWxsYmFjaykge1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApXG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5hbHRyID0gcmVxdWlyZSgnLi9pbmRleCcpXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfZWxlbWVudF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV9lbGVtZW50X25vZGUoZWwpIHtcbiAgdmFyIGFsdHJfdGFncyA9IHt9XG4gICAgLCBhbHRyID0gdGhpc1xuICAgICwgaG9va3MgPSBbXVxuICAgICwgYXR0clxuXG4gIHZhciBhdHRycyA9IEFycmF5LnByb3RvdHlwZS5maWx0ZXIuY2FsbChlbC5hdHRyaWJ1dGVzLCBmdW5jdGlvbihhdHRyKSB7XG4gICAgcmV0dXJuIGFsdHIudGFnc1thdHRyLm5hbWVdID9cbiAgICAgIChhbHRyX3RhZ3NbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWUpICYmIGZhbHNlIDpcbiAgICAgIHRydWVcbiAgfSlcblxuICBhdHRycy5mb3JFYWNoKGZ1bmN0aW9uKGF0dHIpIHtcbiAgICB2YXIgdmFsdWUgPSBhdHRyLnZhbHVlXG4gICAgICAsIG5hbWUgPSBhdHRyLm5hbWVcblxuICAgIGlmKCFuYW1lLmluZGV4T2YoJ2FsdHItYXR0ci0nKSkge1xuICAgICAgbmFtZSA9IGF0dHIubmFtZS5zbGljZSgnYWx0ci1hdHRyLScubGVuZ3RoKVxuICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSlcbiAgICB9XG5cbiAgICB2YXIgYXR0cl9ob29rID0gYWx0ci50ZW1wbGF0ZV9zdHJpbmcodmFsdWUsIGFsdHIuYmF0Y2guYWRkKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbClcbiAgICB9KSlcblxuICAgIGlmKGF0dHJfaG9vaykge1xuICAgICAgaG9va3MucHVzaChhdHRyX2hvb2spXG4gICAgfVxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhbHRyLnRhZ19saXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGF0dHIgPSBhbHRyX3RhZ3NbYWx0ci50YWdfbGlzdFtpXS5hdHRyXSkge1xuICAgICAgaG9va3MucHVzaChhbHRyLnRhZ19saXN0W2ldLmNvbnN0cnVjdG9yLmNhbGwoYWx0ciwgZWwsIGF0dHIpKVxuXG4gICAgICByZXR1cm4gdXBkYXRlXG4gICAgfVxuICB9XG5cbiAgaG9va3MucHVzaChhbHRyLmluaXRfbm9kZXMoZWwuY2hpbGROb2RlcykpXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGhvb2tzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaG9va3NbaV0oZGF0YSlcbiAgICB9XG4gIH1cbn1cbiIsInZhciBpbmNsdWRlX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9pbmNsdWRlJylcbiAgLCB0ZXh0X3RhZyA9IHJlcXVpcmUoJy4vdGFncy90ZXh0JylcbiAgLCBodG1sX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9odG1sJylcbiAgLCB3aXRoX3RhZyA9IHJlcXVpcmUoJy4vdGFncy93aXRoJylcbiAgLCBmb3JfdGFnID0gcmVxdWlyZSgnLi90YWdzL2ZvcicpXG4gICwgaWZfdGFnID0gcmVxdWlyZSgnLi90YWdzL2lmJylcbiAgLCBhbHRyID0gcmVxdWlyZSgnLi9hbHRyJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuYWRkX3RhZygnYWx0ci1pbmNsdWRlJywgaW5jbHVkZV90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItdGV4dCcsIHRleHRfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWh0bWwnLCBodG1sX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci13aXRoJywgd2l0aF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItZm9yJywgZm9yX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1pZicsIGlmX3RhZylcbiIsInZhciBmb3JfcmVnZXhwID0gL14oLio/KVxccytpblxccysoLiokKS9cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JfaGFuZGxlclxuXG5mdW5jdGlvbiBmb3JfaGFuZGxlcihyb290LCBhcmdzKSB7XG4gIHZhciBwYXJ0cyA9IGFyZ3MubWF0Y2goZm9yX3JlZ2V4cClcbiAgICAsIHRlbXBsYXRlID0gcm9vdC5pbm5lckhUTUxcbiAgICAsIGRvbV91cGRhdGVzID0gW11cbiAgICAsIGNoaWxkcmVuID0gW11cbiAgICAsIGFsdHIgPSB0aGlzXG4gICAgLCBpdGVtcyA9IFtdXG5cbiAgaWYoIXBhcnRzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGZvciB0YWc6ICcgKyBhcmdzKVxuICB9XG5cbiAgcm9vdC5pbm5lckhUTUwgPSAnJ1xuXG4gIHZhciB1bmlxdWUgPSBwYXJ0c1sxXS5zcGxpdCgnOicpWzFdXG4gICAgLCBwcm9wID0gcGFydHNbMV0uc3BsaXQoJzonKVswXVxuICAgICwga2V5ID0gcGFydHNbMl1cblxuICB2YXIgcnVuX3VwZGF0ZXMgPSB0aGlzLmJhdGNoLmFkZChydW5fZG9tX3VwZGF0ZXMpXG5cbiAgcmV0dXJuIGFsdHIuY3JlYXRlX2FjY2Vzc29yKGtleSwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZV9jaGlsZHJlbihkYXRhKSB7XG4gICAgdmFyIGl0ZW1fZGF0YVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaXRlbV9kYXRhID0gT2JqZWN0LmNyZWF0ZShkYXRhKVxuICAgICAgaXRlbV9kYXRhW3Byb3BdID0gaXRlbXNbaV1cbiAgICAgIGl0ZW1fZGF0YVsnJGluZGV4J10gPSBpXG5cbiAgICAgIGNoaWxkcmVuW2ldLnVwZGF0ZSAmJiBjaGlsZHJlbltpXS51cGRhdGUoaXRlbV9kYXRhKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShuZXdfaXRlbXMsIGRhdGEpIHtcbiAgICBpZighQXJyYXkuaXNBcnJheShuZXdfaXRlbXMpKSB7XG4gICAgICBuZXdfaXRlbXMgPSBbXVxuICAgIH1cblxuICAgIHZhciBuZXdfY2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3X2l0ZW1zLmxlbmd0aClcbiAgICAgICwgcHJldiA9IHJvb3QuZmlyc3RDaGlsZFxuICAgICAgLCBvZmZzZXQgPSAwXG4gICAgICAsIGluZGV4XG4gICAgICAsIG5vZGVzXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbmV3X2l0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaW5kZXggPSBmaW5kX2luZGV4KGl0ZW1zLCBuZXdfaXRlbXNbaV0sIHVuaXF1ZSlcblxuICAgICAgaWYoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IChjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpWzBdKVxuICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXgsIDEpXG5cbiAgICAgICAgaWYoaW5kZXggKyBvZmZzZXQgIT09IGkpIHtcbiAgICAgICAgICBwbGFjZShuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzLCBwcmV2KVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdfY2hpbGRyZW5baV0gPSBtYWtlX2NoaWxkcmVuKClcbiAgICAgICAgcGxhY2UobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcywgcHJldilcbiAgICAgIH1cblxuICAgICAgKytvZmZzZXRcbiAgICAgIG5vZGVzID0gbmV3X2NoaWxkcmVuW2ldLmRvbV9ub2Rlc1xuICAgICAgcHJldiA9IG5vZGVzLmxlbmd0aCA/IG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdLm5leHRTaWJsaW5nIDogbnVsbFxuICAgICAgbm9kZXMgPSBub2Rlcy5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcylcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBkb21fdXBkYXRlcy5wdXNoKHtyZW1vdmU6IGNoaWxkcmVuW2ldLmRvbV9ub2Rlc30pXG4gICAgfVxuXG4gICAgY2hpbGRyZW4gPSBuZXdfY2hpbGRyZW4uc2xpY2UoKVxuICAgIGl0ZW1zID0gbmV3X2l0ZW1zLnNsaWNlKClcbiAgICBydW5fdXBkYXRlcygpXG4gICAgdXBkYXRlX2NoaWxkcmVuKGRhdGEpXG5cbiAgICBmdW5jdGlvbiBwbGFjZShub2RlcywgcHJldikge1xuICAgICAgZG9tX3VwZGF0ZXMucHVzaCh7XG4gICAgICAgICAgaW5zZXJ0OiBub2Rlc1xuICAgICAgICAsIGJlZm9yZTogcHJldlxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kX2luZGV4KGl0ZW1zLCBkLCB1bmlxdWUpIHtcbiAgICBpZighdW5pcXVlKSB7XG4gICAgICByZXR1cm4gaXRlbXMuaW5kZXhPZihkKVxuICAgIH1cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGlmKGl0ZW1zW2ldW3VuaXF1ZV0gPT09IGRbdW5pcXVlXSkge1xuICAgICAgICByZXR1cm4gaVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZV9jaGlsZHJlbigpIHtcbiAgICB2YXIgdGVtcCA9IGFsdHIuZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHJvb3QubmFtZXNwYWNlVVJJLCAnZGl2JylcbiAgICAgICwgZG9tX25vZGVzXG4gICAgICAsIHVwZGF0ZVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSB0ZW1wbGF0ZVxuXG4gICAgZG9tX25vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGVtcC5jaGlsZE5vZGVzKVxuICAgIHVwZGF0ZSA9IGFsdHIuaW5pdF9ub2Rlcyhkb21fbm9kZXMpXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBkb21fbm9kZXM6IGRvbV9ub2Rlc1xuICAgICAgLCB1cGRhdGU6IHVwZGF0ZVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bl9kb21fdXBkYXRlcygpIHtcbiAgICB2YXIgdXBkYXRlXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gZG9tX3VwZGF0ZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICB1cGRhdGUgPSBkb21fdXBkYXRlc1tpXVxuXG4gICAgICBpZih1cGRhdGUucmVtb3ZlKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IDAsIGwyID0gdXBkYXRlLnJlbW92ZS5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICAgICAgcm9vdC5yZW1vdmVDaGlsZCh1cGRhdGUucmVtb3ZlW2pdKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmKHVwZGF0ZS5pbnNlcnQpIHtcbiAgICAgICAgZm9yKHZhciBqID0gMCwgbDIgPSB1cGRhdGUuaW5zZXJ0Lmxlbmd0aDsgaiA8IGwyOyArK2opIHtcbiAgICAgICAgICByb290Lmluc2VydEJlZm9yZSh1cGRhdGUuaW5zZXJ0W2pdLCB1cGRhdGUuYmVmb3JlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZG9tX3VwZGF0ZXMgPSBbXVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGh0bWxcblxuZnVuY3Rpb24gaHRtbChlbCwgYWNjZXNzb3IpIHtcbiAgcmV0dXJuIHRoaXMuYmF0Y2guYWRkKHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC5pbm5lckhUTUwgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaWZfdGFnXG5cbmZ1bmN0aW9uIGlmX3RhZyhlbCwgYWNjZXNzb3IpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgICAsIHVwZGF0ZV9jaGlsZHJlbiA9IHRoaXMuaW5pdF9ub2RlcyhlbC5jaGlsZE5vZGVzKVxuICAgICwgcGFyZW50ID0gZWwucGFyZW50Tm9kZVxuICAgICwgaGlkZGVuID0gbnVsbFxuXG4gIHBhcmVudC5pbnNlcnRCZWZvcmUocGxhY2Vob2xkZXIsIGVsLm5leHRTaWJsaW5nKVxuXG4gIHZhciBoaWRlID0gdGhpcy5iYXRjaC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgaWYoIWhpZGRlbikge1xuICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKGVsKVxuICAgICAgaGlkZGVuID0gdHJ1ZVxuICAgIH1cbiAgfSlcblxuICB2YXIgc2hvdyA9IHRoaXMuYmF0Y2guYWRkKGZ1bmN0aW9uKCkge1xuICAgIGlmKGhpZGRlbikge1xuICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShlbCwgcGxhY2Vob2xkZXIpXG4gICAgICBoaWRkZW4gPSBmYWxzZVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gdGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHRvZ2dsZSlcblxuICBmdW5jdGlvbiB0b2dnbGUodmFsLCBkYXRhKSB7XG4gICAgdmFsID8gc2hvdygpICYmIHVwZGF0ZV9jaGlsZHJlbihkYXRhKSA6IGhpZGUoKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluY2x1ZGVcblxuZnVuY3Rpb24gaW5jbHVkZShlbCwgbmFtZSkge1xuICBlbC5pbm5lckhUTUwgPSB0aGlzLmluY2x1ZGVzW25hbWVdXG5cbiAgcmV0dXJuIHRoaXMuaW5pdF9ub2RlcyhlbC5jaGlsZE5vZGVzKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZXh0XG5cbmZ1bmN0aW9uIHRleHQoZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gd2l0aF90YWdcblxuZnVuY3Rpb24gd2l0aF90YWcoZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdGhpcy5pbml0X25vZGVzKGVsLmNoaWxkTm9kZXMpKVxufVxuIiwidmFyIFRBRyA9IC97e1xccyooLio/KVxccyp9fS9cblxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZV9zdHJpbmdcblxuZnVuY3Rpb24gdGVtcGxhdGVfc3RyaW5nKHRlbXBsYXRlLCBjaGFuZ2UpIHtcbiAgaWYoIXRlbXBsYXRlLm1hdGNoKFRBRykpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0ZW1wbGF0ZVxuICAgICwgcGFydHMgPSBbXVxuICAgICwgaG9va3MgPSBbXVxuICAgICwgdGltZXJcbiAgICAsIGluZGV4XG4gICAgLCBuZXh0XG5cbiAgd2hpbGUocmVtYWluaW5nICYmIChuZXh0ID0gcmVtYWluaW5nLm1hdGNoKFRBRykpKSB7XG4gICAgaWYoaW5kZXggPSByZW1haW5pbmcuaW5kZXhPZihuZXh0WzBdKSkge1xuICAgICAgcGFydHMucHVzaChyZW1haW5pbmcuc2xpY2UoMCwgaW5kZXgpKVxuICAgIH1cblxuICAgIHBhcnRzLnB1c2goJycpXG4gICAgcmVtYWluaW5nID0gcmVtYWluaW5nLnNsaWNlKGluZGV4ICsgbmV4dFswXS5sZW5ndGgpXG4gICAgaG9va3MucHVzaChcbiAgICAgICAgdGhpcy5jcmVhdGVfYWNjZXNzb3IobmV4dFsxXSwgc2V0X3BhcnQuYmluZCh0aGlzLCBwYXJ0cy5sZW5ndGggLSAxKSlcbiAgICApXG4gIH1cblxuICBwYXJ0cy5wdXNoKHJlbWFpbmluZylcblxuICByZXR1cm4gdXBkYXRlXG5cbiAgZnVuY3Rpb24gc2V0X3BhcnQoaWR4LCB2YWwpIHtcbiAgICBwYXJ0c1tpZHhdID0gdmFsXG4gICAgY2hhbmdlKHBhcnRzLmpvaW4oJycpKVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgICBob29rcy5mb3JFYWNoKGZ1bmN0aW9uKGhvb2spIHtcbiAgICAgIGhvb2soZGF0YSlcbiAgICB9KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZV90ZXh0X25vZGVcblxuZnVuY3Rpb24gY3JlYXRlX3RleHRfbm9kZShlbCkge1xuICByZXR1cm4gdGhpcy50ZW1wbGF0ZV9zdHJpbmcoZWwudGV4dENvbnRlbnQsIHRoaXMuYmF0Y2guYWRkKHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsXG4gIH1cbn1cbiIsInZhciBhZGRfb3BlcmF0b3JzID0gcmVxdWlyZSgnLi9saWIvb3BlcmF0b3JzJylcbiAgLCBjcmVhdGVfYWNjZXNvciA9IHJlcXVpcmUoJy4vbGliL2NyZWF0ZScpXG4gICwgYWRkX2xvb2t1cCA9IHJlcXVpcmUoJy4vbGliL2xvb2t1cCcpXG4gICwgYWRkX2ZpbHRlciA9IHJlcXVpcmUoJy4vbGliL2ZpbHRlcicpXG4gICwgYWRkX3BhcmVucyA9IHJlcXVpcmUoJy4vbGliL3BhcmVucycpXG4gICwgZGVib3VuY2UgPSByZXF1aXJlKCdqdXN0LWRlYm91bmNlJylcbiAgLCBhZGRfdHlwZXMgPSByZXF1aXJlKCcuL2xpYi90eXBlcycpXG4gICwgYWRkX2Fycm93ID0gcmVxdWlyZSgnLi9saWIvYXJyb3cnKVxuICAsIHNwbGl0ID0gcmVxdWlyZSgnLi9saWIvc3BsaXQnKVxuICAsIHR5cGVzID0gW11cblxubW9kdWxlLmV4cG9ydHMgPSBhY2Nlc3NvcnNcblxuLy8gb3JkZXIgaXMgaW1wb3J0YW50XG5hZGRfdHlwZXModHlwZXMpXG5hZGRfYXJyb3codHlwZXMpXG5hZGRfZmlsdGVyKHR5cGVzKVxuYWRkX3BhcmVucyh0eXBlcylcbmFkZF9vcGVyYXRvcnModHlwZXMpXG5hZGRfbG9va3VwKHR5cGVzKVxuXG5hY2Nlc3NvcnMucHJvdG90eXBlLmNyZWF0ZV9wYXJ0ID0gY3JlYXRlX2FjY2Vzb3JcbmFjY2Vzc29ycy5wcm90b3R5cGUuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXJcbmFjY2Vzc29ycy5wcm90b3R5cGUuY3JlYXRlID0gY3JlYXRlXG5hY2Nlc3NvcnMucHJvdG90eXBlLnR5cGVzID0gdHlwZXNcbmFjY2Vzc29ycy5wcm90b3R5cGUuc3BsaXQgPSBzcGxpdFxuXG5mdW5jdGlvbiBhY2Nlc3NvcnMoZmlsdGVycywgZGVsYXkpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWNjZXNzb3JzKSkge1xuICAgIHJldHVybiBuZXcgYWNjZXNzb3JzKGZpbHRlcnMsIGRlbGF5KVxuICB9XG5cbiAgaWYoIWRlbGF5ICYmIGRlbGF5ICE9PSBmYWxzZSkge1xuICAgIGRlbGF5ID0gMFxuICB9XG5cbiAgdGhpcy5kZWxheSA9IGRlbGF5XG4gIHRoaXMuZmlsdGVycyA9IGZpbHRlcnMgfHwge31cbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmbikge1xuICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBjcmVhdGUoc3RyLCBjaGFuZ2UpIHtcbiAgdmFyIHBhcnQgPSB0aGlzLmNyZWF0ZV9wYXJ0KFxuICAgICAgc3RyXG4gICAgLCB0aGlzLmRlbGF5ID09PSBmYWxzZSA/IHVwZGF0ZSA6IGRlYm91bmNlKGNoYW5nZSwgdGhpcy5kZWxheSwgZmFsc2UsIHRydWUpXG4gIClcblxuICB2YXIgc3luYyA9IGZhbHNlXG4gICAgLCBvdXRcblxuICByZXR1cm4gd3JpdGVcblxuICBmdW5jdGlvbiB3cml0ZShkYXRhKSB7XG4gICAgc3luYyA9IHRydWVcbiAgICBvdXQgPSBudWxsXG4gICAgcGFydChkYXRhKVxuICAgIHN5bmMgPSBmYWxzZVxuXG4gICAgaWYob3V0KSB7XG4gICAgICBjaGFuZ2UuYXBwbHkobnVsbCwgb3V0KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGN0eCkge1xuICAgIG91dCA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuXG4gICAgaWYoIXN5bmMpIHtcbiAgICAgIGNoYW5nZS5hcHBseShudWxsLCBvdXQpXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFkZF9hcnJvd1xuXG5mdW5jdGlvbiBhZGRfYXJyb3codHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfYXJyb3cpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9hcnJvdyhwYXJ0cywgY2hhbmdlKSB7XG4gIHBhcnRzID0gdGhpcy5zcGxpdChwYXJ0cywgJy0+JylcblxuICBpZihwYXJ0cy5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgcmlnaHQgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzFdLCBjaGFuZ2UpXG4gICAgLCBsZWZ0ID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1swXSwgdXBkYXRlKVxuXG4gIHJldHVybiBsZWZ0XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgY3R4KSB7XG4gICAgcmlnaHQodmFsLCBjdHgpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWNjZXNzb3JcblxuZnVuY3Rpb24gYWNjZXNzb3Ioa2V5LCBjaGFuZ2UpIHtcbiAgdmFyIHBhcnQgPSBidWlsZF9wYXJ0LmNhbGwodGhpcywga2V5LCBmaW5pc2gpXG4gICAgLCBjb250ZXh0XG4gICAgLCBwcmV2XG5cbiAgcmV0dXJuIGNhbGwuYmluZCh0aGlzKVxuXG4gIGZ1bmN0aW9uIGNhbGwodmFsLCBjdHgpIHtcbiAgICBwYXJ0KHZhbCwgY29udGV4dCA9IGN0eCB8fCB2YWwpXG4gIH1cblxuICBmdW5jdGlvbiBmaW5pc2godmFsKSB7XG4gICAgaWYodHlwZW9mIHZhbCAhPT0gJ29iamVjdCcgJiYgdmFsID09PSBwcmV2KSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBwcmV2ID0gdmFsXG4gICAgY2hhbmdlLmNhbGwodGhpcywgdmFsLCBjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkX3BhcnQocGFydCwgY2hhbmdlKSB7XG4gIHZhciBhY2Nlc3NvclxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnR5cGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGFjY2Vzc29yID0gdGhpcy50eXBlc1tpXS5jYWxsKHRoaXMsIHBhcnQsIGNoYW5nZSkpIHtcbiAgICAgIHJldHVybiBhY2Nlc3NvclxuICAgIH1cbiAgfVxufVxuIiwidmFyIGZpbHRlcl9yZWdleHAgPSAvXlxccyooW15cXHMoXSspXFwoKC4qKVxcKVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9maWx0ZXJcblxuZnVuY3Rpb24gYWRkX2ZpbHRlcih0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9maWx0ZXIpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9maWx0ZXIocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goZmlsdGVyX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgZmlsdGVyID0gdGhpcy5maWx0ZXJzW3BhcnRzWzFdXVxuXG4gIGlmKCFmaWx0ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCBmaW5kIGZpbHRlcjogJyArIHBhcnRzWzFdKVxuICB9XG5cbiAgcmV0dXJuIGZpbHRlci5jYWxsKHRoaXMsIHRoaXMuc3BsaXQocGFydHNbMl0sICcsJywgbnVsbCwgbnVsbCwgdHJ1ZSksIGNoYW5nZSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWRkX2xvb2t1cFxuXG5mdW5jdGlvbiBhZGRfbG9va3VwKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2xvb2t1cClcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2xvb2t1cChwYXRoLCBjaGFuZ2UpIHtcbiAgaWYoIXBhdGguaW5kZXhPZignJGRhdGEnKSkge1xuICAgIHBhdGggPSBwYXRoLnNsaWNlKCckZGF0YS4nLmxlbmd0aClcblxuICAgIGlmKCFwYXRoKSB7XG4gICAgICByZXR1cm4gY2hhbmdlXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGxvb2t1cChwYXRoLm1hdGNoKC9cXHMqKC4qW15cXHNdKVxccyovKVsxXSwgY2hhbmdlKVxufVxuXG5mdW5jdGlvbiBsb29rdXAocGF0aCwgZG9uZSkge1xuICB2YXIgcGFydHMgPSBwYXRoID8gcGF0aC5zcGxpdCgnLicpIDogW11cblxuICByZXR1cm4gZnVuY3Rpb24gc2VhcmNoKG9iaiwgY3R4KSB7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgb2JqICYmIGkgPCBsOyArK2kpIHtcbiAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV1cbiAgICB9XG5cbiAgICBpZih0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJyAmJiBjdHgpIHtcbiAgICAgIHJldHVybiBzZWFyY2goY3R4KVxuICAgIH1cblxuICAgIGlmKGkgPT09IGwpIHtcbiAgICAgIHJldHVybiBkb25lKG9iailcbiAgICB9XG5cbiAgICBkb25lKClcbiAgfVxufVxuIiwidmFyIHRlcm5hcnlfcmVnZXhwID0gL15cXHMqKC4rPylcXHMqXFw/KC4qKVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF9vcGVyYXRvcnNcblxuZnVuY3Rpb24gYWRkX29wZXJhdG9ycyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV90ZXJuYXJ5KVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ3xcXFxcfCddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycmJiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyd8J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJ14nXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnJiddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyc9PT0nLCAnIT09JywgJz09JywgJyE9J10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJz49JywgJzw9JywgJz4nLCAnPCcsICcgaW4gJywgJyBpbnN0YW5jZW9mICddKSlcbiAgLy8gdHlwZXMucHVzaChiaW5hcnkoWyc8PCcsICc+PicsICc+Pj4nXSkpIC8vY29uZmxpY3Mgd2l0aCA8IGFuZCA+XG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnKycsICctJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyonLCAnLycsICclJ10pKVxuICB0eXBlcy5wdXNoKHVuYXJ5KFsnIScsICcrJywgJy0nLCAnfiddKSlcbn1cblxuZnVuY3Rpb24gYmluYXJ5KGxpc3QpIHtcbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgICAgICdeXFxcXHMqKC4rPylcXFxcc1xcKihcXFxcJyArXG4gICAgICBsaXN0LmpvaW4oJ3xcXFxcJykgK1xuICAgICAgJylcXFxccyooLis/KVxcXFxzKiQnXG4gIClcblxuICByZXR1cm4gZnVuY3Rpb24ocGFydHMsIGNoYW5nZSkge1xuICAgIHJldHVybiBjcmVhdGVfYmluYXJ5LmNhbGwodGhpcywgcmVnZXgsIHBhcnRzLCBjaGFuZ2UpXG4gIH1cbn1cblxuZnVuY3Rpb24gdW5hcnkobGlzdCkge1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFxuICAgICAgJ15cXFxccyooXFxcXCcgK1xuICAgICAgbGlzdC5qb2luKCd8XFxcXCcpICtcbiAgICAgICcpXFxcXHMqKC4rPylcXFxccyokJ1xuICApXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHBhcnRzLCBjaGFuZ2UpIHtcbiAgICByZXR1cm4gY3JlYXRlX3VuYXJ5LmNhbGwodGhpcywgcmVnZXgsIHBhcnRzLCBjaGFuZ2UpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3Rlcm5hcnkocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2godGVybmFyeV9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGNvbmRpdGlvbiA9IHBhcnRzWzFdXG4gICAgLCByZXN0ID0gcGFydHNbMl1cbiAgICAsIGNvdW50ID0gMVxuXG4gIHJlc3QgPSB0aGlzLnNwbGl0KHJlc3QsIFsnPyddLCBbJzonXSwgJzonKVxuXG4gIGlmKHJlc3QubGVuZ3RoICE9PSAyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgdGVybmFyeTogJyArIHBhcnRzWzBdKVxuICB9XG5cbiAgdmFyIG5vdCA9IHRoaXMuY3JlYXRlX3BhcnQocmVzdFsxXSwgY2hhbmdlKVxuICAgICwgb2sgPSB0aGlzLmNyZWF0ZV9wYXJ0KHJlc3RbMF0sIGNoYW5nZSlcblxuICByZXR1cm4gdGhpcy5jcmVhdGVfcGFydChjb25kaXRpb24sIHVwZGF0ZSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHZhbCA/IG9rKGNvbnRleHQpIDogbm90KGNvbnRleHQpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX2JpbmFyeShyZWdleCwgcGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gocmVnZXgpKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGNoZWNrX2xocyA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMV0sIHVwZGF0ZS5iaW5kKG51bGwsIGZhbHNlKSlcbiAgICAsIGNoZWNrX3JocyA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbM10sIHVwZGF0ZS5iaW5kKG51bGwsIHRydWUpKVxuICAgICwgbGhzXG4gICAgLCByaHNcblxuICB2YXIgY2hhbmdlZCA9IEZ1bmN0aW9uKFxuICAgICAgJ2NoYW5nZSwgbGhzLCByaHMnXG4gICAgLCAncmV0dXJuIGNoYW5nZShsaHMgJyArIHBhcnRzWzJdICsgJyByaHMpJ1xuICApLmJpbmQobnVsbCwgY2hhbmdlKVxuXG4gIHJldHVybiBvbl9kYXRhXG5cbiAgZnVuY3Rpb24gb25fZGF0YShkYXRhLCBjdHgpIHtcbiAgICBjaGVja19saHMoZGF0YSwgY3R4KVxuICAgIGNoZWNrX3JocyhkYXRhLCBjdHgpXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoaXNfcmhzLCB2YWwpIHtcbiAgICBpc19yaHMgPyByaHMgPSB2YWwgOiBsaHMgPSB2YWxcbiAgICBjaGFuZ2VkKGxocywgcmhzKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV91bmFyeShyZWdleCwgcGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gocmVnZXgpKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGNoYW5nZWQgPSBGdW5jdGlvbihcbiAgICAgICdjaGFuZ2UsIHZhbCdcbiAgICAsICdyZXR1cm4gY2hhbmdlKCcgKyBwYXJ0c1sxXSArICd2YWwpJ1xuICApLmJpbmQobnVsbCwgY2hhbmdlKVxuXG4gIHJldHVybiB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzJdLCBjaGFuZ2VkKVxufVxuIiwidmFyIHBhcmVuc19yZWdleHAgPSAvXlxccypcXCgoLiopJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfcGFyZW5zXG5cbmZ1bmN0aW9uIGFkZF9wYXJlbnModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfcGFyZW5zKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfcGFyZW5zKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHBhcmVuc19yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGJvZHkgPSBwYXJ0c1sxXVxuICAgICwgY291bnQgPSAxXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGJvZHkubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYm9keVtpXSA9PT0gJyknKSB7XG4gICAgICAtLWNvdW50XG4gICAgfSBlbHNlIGlmKGJvZHlbaV0gPT09ICcoJykge1xuICAgICAgKytjb3VudFxuICAgIH1cblxuICAgIGlmKCFjb3VudCkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZighaSB8fCBpID09PSBsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgdGVybmFyeTogJyArIHBhcnRzWzBdKVxuICB9XG5cbiAgdmFyIGNvbnRlbnQgPSAgdGhpcy5jcmVhdGVfcGFydChib2R5LnNsaWNlKDAsIGkpLCB1cGRhdGUpXG4gICAgLCBrZXkgPSAncGFyZW5fJyArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMTYpLnNsaWNlKDIpXG5cbiAgdmFyIHRlbXBsYXRlID0gdGhpcy5jcmVhdGVfcGFydChrZXkgKyBib2R5LnNsaWNlKGkgKyAxKSwgY2hhbmdlKVxuXG4gIHJldHVybiBjb250ZW50XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgY29udGV4dCkge1xuICAgIGNvbnRleHQgPSBPYmplY3QuY3JlYXRlKGNvbnRleHQpXG4gICAgY29udGV4dFtrZXldID0gdmFsXG4gICAgdGVtcGxhdGUoY29udGV4dClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBzcGxpdFxuXG5mdW5jdGlvbiBzcGxpdChwYXJ0cywga2V5LCBvcGVucywgY2xvc2VzLCBhbGwpIHtcbiAgdmFyIGFsbF9jbG9zZXMgPSBbJyknLCAnfScsICddJ11cbiAgICAsIGFsbF9vcGVucyA9IFsnKCcsICd7JywgJ1snXVxuICAgICwgc3VtID0gMFxuICAgICwgc3BsaXRfcG9pbnRcbiAgICAsIGluZGV4XG5cbiAgaWYob3BlbnMpIHtcbiAgICBhbGxfb3BlbnMgPSBhbGxfb3BlbnMuY29uY2F0KG9wZW5zKVxuICB9XG5cbiAgaWYoY2xvc2VzKSB7XG4gICAgYWxsX2Nsb3NlcyA9IGFsbF9jbG9zZXMuY29uY2F0KGNsb3NlcylcbiAgfVxuXG4gIHZhciBjb3VudHMgPSBhbGxfb3BlbnMubWFwKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAwXG4gIH0pXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKCFzdW0gJiYgKHNwbGl0X3BvaW50ID0gcGFydHMuc2xpY2UoaSkuaW5kZXhPZihrZXkpKSA9PT0gLTEpIHtcbiAgICAgIHJldHVybiBbcGFydHNdXG4gICAgfVxuXG4gICAgaWYoIXN1bSAmJiAhc3BsaXRfcG9pbnQpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgaWYoKGluZGV4ID0gYWxsX29wZW5zLmluZGV4T2YocGFydHNbaV0pKSAhPT0gLTEpIHtcbiAgICAgICsrY291bnRzW2luZGV4XVxuICAgICAgKytzdW1cbiAgICB9IGVsc2UgaWYoKGluZGV4ID0gYWxsX2Nsb3Nlcy5pbmRleE9mKHBhcnRzW2ldKSkgIT09IC0xKSB7XG4gICAgICAtLWNvdW50c1tpbmRleF1cbiAgICAgIC0tc3VtXG4gICAgfVxuXG4gICAgZm9yKHZhciBqID0gMDsgaiA8IGNvdW50cy5sZW5ndGg7ICsraikge1xuICAgICAgaWYoY291bnRzW2pdIDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VubWF0Y2hlZCBcIicgKyBhbGxfb3BlbnNbal0gKyAnXCJcIiBpbiAnICsgcGFydHMpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYoc3VtIHx8IGkgPT09IHBhcnRzLmxlbmd0aCkge1xuICAgIHJldHVybiBbcGFydHNdXG4gIH1cblxuICB2YXIgcmlnaHQgPSBwYXJ0cy5zbGljZShpICsga2V5Lmxlbmd0aClcbiAgICAsIGxlZnQgPSBwYXJ0cy5zbGljZSgwLCBpKVxuXG4gIGlmKCFhbGwpIHtcbiAgICByZXR1cm4gW2xlZnQsIHJpZ2h0XVxuICB9XG5cbiAgcmV0dXJuIFtsZWZ0XS5jb25jYXQoc3BsaXQocmlnaHQsIGtleSwgb3BlbnMsIGNsb3NlcywgYWxsKSlcbn1cbiIsInZhciBzdHJpbmdfcmVnZXhwID0gL15cXHMqKD86JygoPzpbXidcXFxcXXwoPzpcXFxcLikpKiknfFwiKCg/OlteXCJcXFxcXXwoPzpcXFxcLikpKilcIilcXHMqJC9cbiAgLCBudW1iZXJfcmVnZXhwID0gL15cXHMqKFxcZCooPzpcXC5cXGQrKT8pXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX3R5cGVzXG5cbmZ1bmN0aW9uIGFkZF90eXBlcyh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9zdHJpbmdfYWNjZXNzb3IpXG4gIHR5cGVzLnB1c2goY3JlYXRlX251bWJlcl9hY2Nlc3Nvcilcbn1cblxuZnVuY3Rpb24gY3JlYXRlX3N0cmluZ19hY2Nlc3NvcihwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChzdHJpbmdfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjaGFuZ2UocGFydHNbMV0gfHwgcGFydHNbMl0pXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX251bWJlcl9hY2Nlc3NvcihwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChudW1iZXJfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjaGFuZ2UoK3BhcnRzWzFdKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlXG5cbmZ1bmN0aW9uIGRlYm91bmNlKGZuLCBkZWxheSwgYXRfc3RhcnQsIGd1YXJhbnRlZSkge1xuICB2YXIgdGltZW91dFxuICAgICwgYXJnc1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG5cbiAgICBpZih0aW1lb3V0ICYmIChhdF9zdGFydCB8fCBndWFyYW50ZWUpKSB7XG4gICAgICByZXR1cm5cbiAgICB9IGVsc2UgaWYoIWF0X3N0YXJ0KSB7XG4gICAgICBjbGVhcigpXG5cbiAgICAgIHJldHVybiB0aW1lb3V0ID0gc2V0VGltZW91dChydW4sIGRlbGF5KVxuICAgIH1cblxuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFyLCBkZWxheSlcbiAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuXG4gICAgZnVuY3Rpb24gcnVuKCkge1xuICAgICAgY2xlYXIoKVxuICAgICAgZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KVxuICAgICAgdGltZW91dCA9IG51bGxcbiAgICB9XG4gIH1cbn1cbiJdfQ==
