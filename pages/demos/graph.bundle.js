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
},{"./batch":2,"./element_node":3,"./template_string":11,"./text_node":12,"altr-accessors":13}],2:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{"./altr":1,"./tags/for":5,"./tags/html":6,"./tags/if":7,"./tags/include":8,"./tags/text":9,"./tags/with":10}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
module.exports = html

function html(el, accessor) {
  return this.batch.add(this.create_accessor(accessor, update))

  function update(val) {
    el.innerHTML = typeof val === 'undefined' ? '' : val
  }
}

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
module.exports = include

function include(el, name) {
  el.innerHTML = this.includes[name]

  return this.init_nodes(el.childNodes)
}

},{}],9:[function(require,module,exports){
module.exports = text

function text(el, accessor) {
  return this.batch.add(this.create_accessor(accessor, update))

  function update(val) {
    el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],10:[function(require,module,exports){
module.exports = with_tag

function with_tag(el, accessor) {
  return this.create_accessor(accessor, this.init_nodes(el.childNodes))
}

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
module.exports = create_text_node

function create_text_node(el) {
  return this.template_string(el.textContent, this.batch.add(update))

  function update(val) {
    el.textContent = val
  }
}

},{}],13:[function(require,module,exports){
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

},{"./lib/arrow":14,"./lib/create":15,"./lib/filter":16,"./lib/lookup":17,"./lib/operators":18,"./lib/parens":19,"./lib/split":20,"./lib/types":21,"just-debounce":22}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

  return filter.call(this, this.split(parts[2], ',', null, null, true), change)
}

},{}],17:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
var ease = require('ease-component')
  , raf = require('raf').polyfill

module.exports = ease_filter

function ease_filter(parts, change) {
  var fn = 'linear'
  , current = {}
  , target = {}
  , ms = 1
  , start
  , wait
  , prev

  var update_ms = this.create_part(parts[0], function(d) {
    ms = +d
    animate()
  })

  var update_fn = this.create_part(parts[1] || 'linear', function(d) {
    fn = d || 'linear'
    animate()
  })

  function animate() {
    if(wait) {
      return
    }

    wait = raf(function() {
      wait = null
      update()
    })
  }

  return function(d, ctx) {
    animate()
    prev = current
    target = JSON.parse(JSON.stringify(d))
    start = new Date
    update_ms(ctx)
    update_fn(ctx)
  }

  function update() {
    var diff = new Date - start
      , p = diff / ms

    if(p >= 1) {
      p = 1
    } else {
      animate()
    }

    p = ease[fn](p)

    current = update_part(prev, target, p)
    change(current)
  }

  function update_part(prev, target, p) {
    var result = target
      , keys

    if(typeof prev !== typeof target) {
      return result
    } else if(Array.isArray(target)) {
      result = Array(target.length)

      for(var i = 0, l = target.length; i < l; ++i) {
        result[i] = update_part(prev[i], target[i], p)
      }
    } else if(typeof target === 'object') {
      keys = Object.keys(target)
      result = {}

      for(var i = 0, l = keys.length; i < l; ++i) {
        result[keys[i]] = update_part(prev[keys[i]], target[keys[i]], p)
      }
    } else if(prev !== target && typeof target === 'number') {
      return prev + (target - prev) * p
    }

    return result
  }
}

},{"ease-component":26,"raf":24}],24:[function(require,module,exports){
module.exports = raf

var EE = require('events').EventEmitter
  , global = typeof window === 'undefined' ? this : window
  , now = global.performance && global.performance.now ? function() {
    return performance.now()
  } : Date.now || function () {
    return +new Date()
  }

var _raf =
  global.requestAnimationFrame ||
  global.webkitRequestAnimationFrame ||
  global.mozRequestAnimationFrame ||
  global.msRequestAnimationFrame ||
  global.oRequestAnimationFrame ||
  (global.setImmediate ? function(fn, el) {
    setImmediate(fn)
  } :
  function(fn, el) {
    setTimeout(fn, 0)
  })

function raf(el, tick) {
  var now = raf.now()
    , ee = new EE
    
  if(typeof el === 'function') {
    tick = el
    el = undefined
  }
  
  ee.pause = function() { ee.paused = true }
  ee.resume = function() { ee.paused = false }

  _raf(iter, el)
  
  if(tick) {
    ee.on('data', function(dt) {
      tick(dt)
    })
  }

  return ee

  function iter(timestamp) {
    var _now = raf.now()
      , dt = _now - now
    
    now = _now

    if(!ee.paused) {
      ee.emit('data', dt)
    }
    
    _raf(iter, el)
  }
}

raf.polyfill = _raf
raf.now = now


},{"events":28}],25:[function(require,module,exports){
module.exports = scale

function scale(parts, change) {
  var ranges = JSON.parse(parts[1])
    , dimensions = []
    , prev = []

  var update_range = this.create_part(parts[0], function(domains, ctx) {
    dimensions = new Array(Math.max(domains.length, ranges.length))

    for(var i = 0, l = dimensions.length; i < l; ++i) {
      dimensions[i] = {
          scale: (ranges[i][1] - ranges[i][0]) / (domains[i][1] - domains[i][0])
        , offset: domains[i][0]
      }
    }

    map(prev)
  })

  return map

  function map(data, ctx) {
    if(ctx) {
      prev = data

      return update_range(data, ctx)
    }

    var out = Array(data.length)

    for(var i = 0, l = data.length; i < l; ++i) {
      out[i] = Array(dimensions)

      for(var j = 0; j < dimensions.length; ++j) {
        out[i][j] = (data[i][j] - dimensions[j].offset) * dimensions[j].scale
      }
    }

    change(out)
  }
}

},{}],26:[function(require,module,exports){

// easing functions from "Tween.js"

exports.linear = function(n){
  return n;
};

exports.inQuad = function(n){
  return n * n;
};

exports.outQuad = function(n){
  return n * (2 - n);
};

exports.inOutQuad = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n;
  return - 0.5 * (--n * (n - 2) - 1);
};

exports.inCube = function(n){
  return n * n * n;
};

exports.outCube = function(n){
  return --n * n * n + 1;
};

exports.inOutCube = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n * n;
  return 0.5 * ((n -= 2 ) * n * n + 2);
};

exports.inQuart = function(n){
  return n * n * n * n;
};

exports.outQuart = function(n){
  return 1 - (--n * n * n * n);
};

exports.inOutQuart = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n * n * n;
  return -0.5 * ((n -= 2) * n * n * n - 2);
};

exports.inQuint = function(n){
  return n * n * n * n * n;
}

exports.outQuint = function(n){
  return --n * n * n * n * n + 1;
}

exports.inOutQuint = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n * n * n * n;
  return 0.5 * ((n -= 2) * n * n * n * n + 2);
};

exports.inSine = function(n){
  return 1 - Math.cos(n * Math.PI / 2 );
};

exports.outSine = function(n){
  return Math.sin(n * Math.PI / 2);
};

exports.inOutSine = function(n){
  return .5 * (1 - Math.cos(Math.PI * n));
};

exports.inExpo = function(n){
  return 0 == n ? 0 : Math.pow(1024, n - 1);
};

exports.outExpo = function(n){
  return 1 == n ? n : 1 - Math.pow(2, -10 * n);
};

exports.inOutExpo = function(n){
  if (0 == n) return 0;
  if (1 == n) return 1;
  if ((n *= 2) < 1) return .5 * Math.pow(1024, n - 1);
  return .5 * (-Math.pow(2, -10 * (n - 1)) + 2);
};

exports.inCirc = function(n){
  return 1 - Math.sqrt(1 - n * n);
};

exports.outCirc = function(n){
  return Math.sqrt(1 - (--n * n));
};

exports.inOutCirc = function(n){
  n *= 2
  if (n < 1) return -0.5 * (Math.sqrt(1 - n * n) - 1);
  return 0.5 * (Math.sqrt(1 - (n -= 2) * n) + 1);
};

exports.inBack = function(n){
  var s = 1.70158;
  return n * n * (( s + 1 ) * n - s);
};

exports.outBack = function(n){
  var s = 1.70158;
  return --n * n * ((s + 1) * n + s) + 1;
};

exports.inOutBack = function(n){
  var s = 1.70158 * 1.525;
  if ( ( n *= 2 ) < 1 ) return 0.5 * ( n * n * ( ( s + 1 ) * n - s ) );
  return 0.5 * ( ( n -= 2 ) * n * ( ( s + 1 ) * n + s ) + 2 );
};

exports.inBounce = function(n){
  return 1 - exports.outBounce(1 - n);
};

exports.outBounce = function(n){
  if ( n < ( 1 / 2.75 ) ) {
    return 7.5625 * n * n;
  } else if ( n < ( 2 / 2.75 ) ) {
    return 7.5625 * ( n -= ( 1.5 / 2.75 ) ) * n + 0.75;
  } else if ( n < ( 2.5 / 2.75 ) ) {
    return 7.5625 * ( n -= ( 2.25 / 2.75 ) ) * n + 0.9375;
  } else {
    return 7.5625 * ( n -= ( 2.625 / 2.75 ) ) * n + 0.984375;
  }
};

exports.inOutBounce = function(n){
  if (n < .5) return exports.inBounce(n * 2) * .5;
  return exports.outBounce(n * 2 - 1) * .5 + .5;
};

// aliases

exports['in-quad'] = exports.inQuad;
exports['out-quad'] = exports.outQuad;
exports['in-out-quad'] = exports.inOutQuad;
exports['in-cube'] = exports.inCube;
exports['out-cube'] = exports.outCube;
exports['in-out-cube'] = exports.inOutCube;
exports['in-quart'] = exports.inQuart;
exports['out-quart'] = exports.outQuart;
exports['in-out-quart'] = exports.inOutQuart;
exports['in-quint'] = exports.inQuint;
exports['out-quint'] = exports.outQuint;
exports['in-out-quint'] = exports.inOutQuint;
exports['in-sine'] = exports.inSine;
exports['out-sine'] = exports.outSine;
exports['in-out-sine'] = exports.inOutSine;
exports['in-expo'] = exports.inExpo;
exports['out-expo'] = exports.outExpo;
exports['in-out-expo'] = exports.inOutExpo;
exports['in-circ'] = exports.inCirc;
exports['out-circ'] = exports.outCirc;
exports['in-out-circ'] = exports.inOutCirc;
exports['in-back'] = exports.inBack;
exports['out-back'] = exports.outBack;
exports['in-out-back'] = exports.inOutBack;
exports['in-bounce'] = exports.inBounce;
exports['out-bounce'] = exports.outBounce;
exports['in-out-bounce'] = exports.inOutBounce;

},{}],27:[function(require,module,exports){
var altr = require('../../lib/index')
  , scale = require('altr-scale')
  , ease = require('altr-ease')

altr.add_filter('svg_path', svg_path)
altr.add_filter('scale', scale)
altr.add_filter('ease', ease)

var data = {
    points: [[+new Date - 30000, 300]]
  , range: [
        [+new Date, +new Date]
      , [0, 300]
    ]
}

var template = altr(document.getElementById('graph1'), data)

for(var i = 29; i > 0; --i) {
  add_item(new Date - i * 1000)
}

setInterval(add_item, 2000)

function add_item(time) {
  data.points.push([
      time || +new Date
    , ~~(Math.random() * 300)
  ])

  data.points = data.points.slice(-100)
  data.range[0][0] = new Date - 30000
  data.range[0][1] = +new Date
  template.update(data)
}

function svg_path(parts, change) {
  return function(data) {
    var result = parts.slice()
      , data = data.slice()

    result.splice.apply(result, [1, 0].concat(data.map(function(p) {
      return 'L ' + p[0] + ' ' + p[1]
    })))

    change(result.join(' '))
  }
}

},{"../../lib/index":4,"altr-ease":23,"altr-scale":25}],28:[function(require,module,exports){
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
      console.trace();
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

},{}]},{},[27])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYmF0Y2guanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZWxlbWVudF9ub2RlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2luZGV4LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvZm9yLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaHRtbC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL2lmLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaW5jbHVkZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3RleHQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy93aXRoLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RlbXBsYXRlX3N0cmluZy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90ZXh0X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2Fycm93LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9jcmVhdGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2ZpbHRlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvbG9va3VwLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9vcGVyYXRvcnMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL3BhcmVucy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvc3BsaXQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL3R5cGVzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL25vZGVfbW9kdWxlcy9qdXN0LWRlYm91bmNlL2luZGV4LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItZWFzZS9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWVhc2Uvbm9kZV9tb2R1bGVzL3JhZi9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLXNjYWxlL2luZGV4LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2Vhc2UtY29tcG9uZW50L2luZGV4LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvcGFnZXMvZGVtb3MvZ3JhcGguanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgdGVtcGxhdGVfc3RyaW5nID0gcmVxdWlyZSgnLi90ZW1wbGF0ZV9zdHJpbmcnKVxuICAsIGVsZW1lbnRfbm9kZSA9IHJlcXVpcmUoJy4vZWxlbWVudF9ub2RlJylcbiAgLCBhY2Nlc3NvcnMgPSByZXF1aXJlKCdhbHRyLWFjY2Vzc29ycycpXG4gICwgdGV4dF9ub2RlID0gcmVxdWlyZSgnLi90ZXh0X25vZGUnKVxuICAsIGJhdGNoID0gcmVxdWlyZSgnLi9iYXRjaCcpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuYWx0ci5hZGRfdGFnID0gYWRkX3RhZ1xuYWx0ci5pbmNsdWRlID0gaW5jbHVkZS5iaW5kKGFsdHIucHJvdG90eXBlKVxuYWx0ci5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlci5iaW5kKGFsdHIucHJvdG90eXBlKVxuXG5mdW5jdGlvbiBhbHRyKHJvb3QsIGRhdGEsIHN5bmMsIGRvYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBzeW5jLCBkb2MpXG4gIH1cblxuICB0aGlzLnJvb3QgPSByb290XG4gIHRoaXMuc3luYyA9IHN5bmNcbiAgdGhpcy5iYXRjaCA9IGJhdGNoKHN5bmMpXG4gIHRoaXMuZG9jdW1lbnQgPSBkb2MgfHwgZ2xvYmFsLmRvY3VtZW50XG4gIHRoaXMuZmlsdGVycyA9IE9iamVjdC5jcmVhdGUodGhpcy5maWx0ZXJzKVxuICB0aGlzLmluY2x1ZGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLmluY2x1ZGVzKVxuICB0aGlzLmFjY2Vzc29ycyA9IGFjY2Vzc29ycyh0aGlzLmZpbHRlcnMsIGZhbHNlKVxuXG4gIGlmKGdsb2JhbC5CdWZmZXIgJiYgcm9vdCBpbnN0YW5jZW9mIGdsb2JhbC5CdWZmZXIpIHtcbiAgICByb290ID0gcm9vdC50b1N0cmluZygpXG4gIH1cblxuICBpZih0eXBlb2Ygcm9vdCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgdGVtcCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gcm9vdFxuICAgIHRoaXMucm9vdCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG5cbiAgICB3aGlsZSh0ZW1wLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMucm9vdC5hcHBlbmRDaGlsZCh0ZW1wLmZpcnN0Q2hpbGQpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5yb290X25vZGVzID0gdGhpcy5yb290Lm5vZGVUeXBlID09PSAxMSA/XG4gICAgW10uc2xpY2UuY2FsbCh0aGlzLnJvb3QuY2hpbGROb2RlcykgOiBbdGhpcy5yb290XVxuXG4gIHRoaXMuX3VwZGF0ZSA9IHRoaXMuaW5pdF9ub2Rlcyh0aGlzLnJvb3Rfbm9kZXMpXG5cbiAgaWYoZGF0YSkge1xuICAgIHRoaXMudXBkYXRlKGRhdGEpXG4gIH1cbn1cblxuYWx0ci5wcm90b3R5cGUudGVtcGxhdGVfc3RyaW5nID0gdGVtcGxhdGVfc3RyaW5nXG5hbHRyLnByb3RvdHlwZS5jcmVhdGVfYWNjZXNzb3IgPSBjcmVhdGVfYWNjZXNzb3JcbmFsdHIucHJvdG90eXBlLmFkZF9maWx0ZXIgPSBhZGRfZmlsdGVyXG5hbHRyLnByb3RvdHlwZS5pbml0X25vZGVzID0gaW5pdF9ub2Rlc1xuYWx0ci5wcm90b3R5cGUudG9TdHJpbmcgPSBvdXRlcl9odG1sXG5hbHRyLnByb3RvdHlwZS5pbml0X2VsID0gaW5pdF9lbFxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIucHJvdG90eXBlLmludG8gPSBhcHBlbmRfdG9cbmFsdHIucHJvdG90eXBlLnVwZGF0ZSA9IHVwZGF0ZVxuXG5hbHRyLnByb3RvdHlwZS5pbmNsdWRlcyA9IHt9XG5hbHRyLnByb3RvdHlwZS50YWdfbGlzdCA9IFtdXG5hbHRyLnByb3RvdHlwZS5maWx0ZXJzID0ge31cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG52YXIgbm9kZV9oYW5kbGVycyA9IHt9XG5cbm5vZGVfaGFuZGxlcnNbMV0gPSBlbGVtZW50X25vZGVcbm5vZGVfaGFuZGxlcnNbM10gPSB0ZXh0X25vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgdGhpcy5fdXBkYXRlKGRhdGEpXG5cbiAgaWYodGhpcy5zeW5jKSB7XG4gICAgdGhpcy5iYXRjaC5ydW4oKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRfbm9kZXMobm9kZXMpIHtcbiAgdmFyIGhvb2tzID0gW10ubWFwLmNhbGwobm9kZXMsIGluaXRfZWwuYmluZCh0aGlzKSkuZmlsdGVyKEJvb2xlYW4pXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGhvb2tzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaG9va3NbaV0oZGF0YSlcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdF9lbChlbCkge1xuICByZXR1cm4gbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV0gP1xuICAgIG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdLmNhbGwodGhpcywgZWwpIDpcbiAgICBlbC5jaGlsZE5vZGVzICYmIGVsLmNoaWxkTm9kZXMubGVuZ3RoID9cbiAgICB0aGlzLmluaXRfbm9kZXMoZWwuY2hpbGROb2RlcykgOlxuICAgIG51bGxcbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmaWx0ZXIpIHtcbiAgYWx0ci5wcm90b3R5cGUuZmlsdGVyc1tuYW1lXSA9IGZpbHRlclxufVxuXG5mdW5jdGlvbiBhZGRfdGFnKGF0dHIsIHRhZykge1xuICBhbHRyLnByb3RvdHlwZS50YWdzW2F0dHJdID0gdGFnXG4gIGFsdHIucHJvdG90eXBlLnRhZ19saXN0LnB1c2goe1xuICAgICAgYXR0cjogYXR0clxuICAgICwgY29uc3RydWN0b3I6IHRhZ1xuICB9KVxufVxuXG5mdW5jdGlvbiBvdXRlcl9odG1sKCkge1xuICByZXR1cm4gdGhpcy5yb290Lm91dGVySFRNTFxufVxuXG5mdW5jdGlvbiBhcHBlbmRfdG8obm9kZSkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5yb290X25vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQodGhpcy5yb290X25vZGVzW2ldKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluY2x1ZGUobmFtZSwgdGVtcGxhdGUpIHtcbiAgcmV0dXJuIHRoaXMuaW5jbHVkZXNbbmFtZV0gPSB0ZW1wbGF0ZVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYWNjZXNzb3IoZGVzY3JpcHRpb24sIGNoYW5nZSkge1xuICByZXR1cm4gdGhpcy5hY2Nlc3NvcnMuY3JlYXRlKGRlc2NyaXB0aW9uLCBjaGFuZ2UsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKG5hbWUsIGZuKSB7XG4gIHJldHVybiB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gQmF0Y2hcblxuZnVuY3Rpb24gQmF0Y2goc3luYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCYXRjaCkpIHtcbiAgICByZXR1cm4gbmV3IEJhdGNoKHN5bmMpXG4gIH1cblxuICB0aGlzLmpvYnMgPSBbXVxuICB0aGlzLnN5bmMgPSBzeW5jXG4gIHRoaXMuZnJhbWUgPSBudWxsXG4gIHRoaXMucnVuID0gdGhpcy5ydW4uYmluZCh0aGlzKVxufVxuXG5CYXRjaC5wcm90b3R5cGUucmVxdWVzdF9mcmFtZSA9IHJlcXVlc3RfZnJhbWVcbkJhdGNoLnByb3RvdHlwZS5xdWV1ZSA9IHF1ZXVlXG5CYXRjaC5wcm90b3R5cGUuYWRkID0gYWRkXG5CYXRjaC5wcm90b3R5cGUucnVuID0gcnVuXG5cbmZ1bmN0aW9uIGFkZChmbikge1xuICB2YXIgcXVldWVkID0gZmFsc2VcbiAgICAsIGJhdGNoID0gdGhpc1xuICAgICwgc2VsZlxuICAgICwgYXJnc1xuXG4gIHJldHVybiBxdWV1ZVxuXG4gIGZ1bmN0aW9uIHF1ZXVlKCkge1xuICAgIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICBzZWxmID0gdGhpc1xuXG4gICAgaWYoIXF1ZXVlZCkge1xuICAgICAgcXVldWVkID0gdHJ1ZVxuICAgICAgYmF0Y2gucXVldWUocnVuKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICBxdWV1ZWQgPSBmYWxzZVxuICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVldWUoZm4pIHtcbiAgdGhpcy5qb2JzLnB1c2goZm4pXG5cbiAgaWYoIXRoaXMuc3luYykge1xuICAgIHRoaXMucmVxdWVzdF9mcmFtZSgpXG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuKCkge1xuICB2YXIgam9icyA9IHRoaXMuam9ic1xuXG4gIHRoaXMuam9icyA9IFtdXG4gIHRoaXMuZnJhbWUgPSBudWxsXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGpvYnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgam9ic1tpXSgpXG4gIH1cbn1cblxuZnVuY3Rpb24gcmVxdWVzdF9mcmFtZSgpIHtcbiAgaWYodGhpcy5mcmFtZSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdGhpcy5mcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnJ1bilcbn1cblxuZnVuY3Rpb24gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG4gIHZhciByYWYgPSBnbG9iYWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB0aW1lb3V0XG5cbiAgcmV0dXJuIHJhZihjYWxsYmFjaylcblxuICBmdW5jdGlvbiB0aW1lb3V0KGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MClcbiAgfVxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX2VsZW1lbnRfbm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVfZWxlbWVudF9ub2RlKGVsKSB7XG4gIHZhciBhbHRyX3RhZ3MgPSB7fVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGhvb2tzID0gW11cbiAgICAsIGF0dHJcblxuICB2YXIgYXR0cnMgPSBBcnJheS5wcm90b3R5cGUuZmlsdGVyLmNhbGwoZWwuYXR0cmlidXRlcywgZnVuY3Rpb24oYXR0cikge1xuICAgIHJldHVybiBhbHRyLnRhZ3NbYXR0ci5uYW1lXSA/XG4gICAgICAoYWx0cl90YWdzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlKSAmJiBmYWxzZSA6XG4gICAgICB0cnVlXG4gIH0pXG5cbiAgYXR0cnMuZm9yRWFjaChmdW5jdGlvbihhdHRyKSB7XG4gICAgdmFyIHZhbHVlID0gYXR0ci52YWx1ZVxuICAgICAgLCBuYW1lID0gYXR0ci5uYW1lXG5cbiAgICBpZighbmFtZS5pbmRleE9mKCdhbHRyLWF0dHItJykpIHtcbiAgICAgIG5hbWUgPSBhdHRyLm5hbWUuc2xpY2UoJ2FsdHItYXR0ci0nLmxlbmd0aClcbiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyLm5hbWUpXG4gICAgfVxuXG4gICAgdmFyIGF0dHJfaG9vayA9IGFsdHIudGVtcGxhdGVfc3RyaW5nKHZhbHVlLCBhbHRyLmJhdGNoLmFkZChmdW5jdGlvbih2YWwpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCB2YWwpXG4gICAgfSkpXG5cbiAgICBpZihhdHRyX2hvb2spIHtcbiAgICAgIGhvb2tzLnB1c2goYXR0cl9ob29rKVxuICAgIH1cbiAgfSlcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYWx0ci50YWdfbGlzdC5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihhdHRyID0gYWx0cl90YWdzW2FsdHIudGFnX2xpc3RbaV0uYXR0cl0pIHtcbiAgICAgIGhvb2tzLnB1c2goYWx0ci50YWdfbGlzdFtpXS5jb25zdHJ1Y3Rvci5jYWxsKGFsdHIsIGVsLCBhdHRyKSlcblxuICAgICAgcmV0dXJuIHVwZGF0ZVxuICAgIH1cbiAgfVxuXG4gIGhvb2tzLnB1c2goYWx0ci5pbml0X25vZGVzKGVsLmNoaWxkTm9kZXMpKVxuXG4gIHJldHVybiB1cGRhdGVcblxuICBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBob29rcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGhvb2tzW2ldKGRhdGEpXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgaW5jbHVkZV90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaW5jbHVkZScpXG4gICwgdGV4dF90YWcgPSByZXF1aXJlKCcuL3RhZ3MvdGV4dCcpXG4gICwgaHRtbF90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaHRtbCcpXG4gICwgd2l0aF90YWcgPSByZXF1aXJlKCcuL3RhZ3Mvd2l0aCcpXG4gICwgZm9yX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9mb3InKVxuICAsIGlmX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9pZicpXG4gICwgYWx0ciA9IHJlcXVpcmUoJy4vYWx0cicpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuXG5hbHRyLmFkZF90YWcoJ2FsdHItaW5jbHVkZScsIGluY2x1ZGVfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLXRleHQnLCB0ZXh0X3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1odG1sJywgaHRtbF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItd2l0aCcsIHdpdGhfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWZvcicsIGZvcl90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItaWYnLCBpZl90YWcpXG4iLCJ2YXIgZm9yX3JlZ2V4cCA9IC9eKC4qPylcXHMraW5cXHMrKC4qJCkvXG5cbm1vZHVsZS5leHBvcnRzID0gZm9yX2hhbmRsZXJcblxuZnVuY3Rpb24gZm9yX2hhbmRsZXIocm9vdCwgYXJncykge1xuICB2YXIgcGFydHMgPSBhcmdzLm1hdGNoKGZvcl9yZWdleHApXG4gICAgLCB0ZW1wbGF0ZSA9IHJvb3QuaW5uZXJIVE1MXG4gICAgLCBkb21fdXBkYXRlcyA9IFtdXG4gICAgLCBjaGlsZHJlbiA9IFtdXG4gICAgLCBhbHRyID0gdGhpc1xuICAgICwgaXRlbXMgPSBbXVxuXG4gIGlmKCFwYXJ0cykge1xuICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBmb3IgdGFnOiAnICsgYXJncylcbiAgfVxuXG4gIHJvb3QuaW5uZXJIVE1MID0gJydcblxuICB2YXIgdW5pcXVlID0gcGFydHNbMV0uc3BsaXQoJzonKVsxXVxuICAgICwgcHJvcCA9IHBhcnRzWzFdLnNwbGl0KCc6JylbMF1cbiAgICAsIGtleSA9IHBhcnRzWzJdXG5cbiAgdmFyIHJ1bl91cGRhdGVzID0gdGhpcy5iYXRjaC5hZGQocnVuX2RvbV91cGRhdGVzKVxuXG4gIHJldHVybiBhbHRyLmNyZWF0ZV9hY2Nlc3NvcihrZXksIHVwZGF0ZSlcblxuICBmdW5jdGlvbiB1cGRhdGVfY2hpbGRyZW4oZGF0YSkge1xuICAgIHZhciBpdGVtX2RhdGFcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGl0ZW1fZGF0YSA9IE9iamVjdC5jcmVhdGUoZGF0YSlcbiAgICAgIGl0ZW1fZGF0YVtwcm9wXSA9IGl0ZW1zW2ldXG4gICAgICBpdGVtX2RhdGFbJyRpbmRleCddID0gaVxuXG4gICAgICBjaGlsZHJlbltpXS51cGRhdGUgJiYgY2hpbGRyZW5baV0udXBkYXRlKGl0ZW1fZGF0YSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUobmV3X2l0ZW1zLCBkYXRhKSB7XG4gICAgaWYoIUFycmF5LmlzQXJyYXkobmV3X2l0ZW1zKSkge1xuICAgICAgbmV3X2l0ZW1zID0gW11cbiAgICB9XG5cbiAgICB2YXIgbmV3X2NoaWxkcmVuID0gbmV3IEFycmF5KG5ld19pdGVtcy5sZW5ndGgpXG4gICAgICAsIHByZXYgPSByb290LmZpcnN0Q2hpbGRcbiAgICAgICwgb2Zmc2V0ID0gMFxuICAgICAgLCBpbmRleFxuICAgICAgLCBub2Rlc1xuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IG5ld19pdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGluZGV4ID0gZmluZF9pbmRleChpdGVtcywgbmV3X2l0ZW1zW2ldLCB1bmlxdWUpXG5cbiAgICAgIGlmKGluZGV4ICE9PSAtMSkge1xuICAgICAgICBuZXdfY2hpbGRyZW5baV0gPSAoY2hpbGRyZW4uc3BsaWNlKGluZGV4LCAxKVswXSlcbiAgICAgICAgaXRlbXMuc3BsaWNlKGluZGV4LCAxKVxuXG4gICAgICAgIGlmKGluZGV4ICsgb2Zmc2V0ICE9PSBpKSB7XG4gICAgICAgICAgcGxhY2UobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcywgcHJldilcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gbWFrZV9jaGlsZHJlbigpXG4gICAgICAgIHBsYWNlKG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMsIHByZXYpXG4gICAgICB9XG5cbiAgICAgICsrb2Zmc2V0XG4gICAgICBub2RlcyA9IG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXNcbiAgICAgIHByZXYgPSBub2Rlcy5sZW5ndGggPyBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXS5uZXh0U2libGluZyA6IG51bGxcbiAgICAgIG5vZGVzID0gbm9kZXMuY29uY2F0KG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgfVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgZG9tX3VwZGF0ZXMucHVzaCh7cmVtb3ZlOiBjaGlsZHJlbltpXS5kb21fbm9kZXN9KVxuICAgIH1cblxuICAgIGNoaWxkcmVuID0gbmV3X2NoaWxkcmVuLnNsaWNlKClcbiAgICBpdGVtcyA9IG5ld19pdGVtcy5zbGljZSgpXG4gICAgcnVuX3VwZGF0ZXMoKVxuICAgIHVwZGF0ZV9jaGlsZHJlbihkYXRhKVxuXG4gICAgZnVuY3Rpb24gcGxhY2Uobm9kZXMsIHByZXYpIHtcbiAgICAgIGRvbV91cGRhdGVzLnB1c2goe1xuICAgICAgICAgIGluc2VydDogbm9kZXNcbiAgICAgICAgLCBiZWZvcmU6IHByZXZcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZmluZF9pbmRleChpdGVtcywgZCwgdW5pcXVlKSB7XG4gICAgaWYoIXVuaXF1ZSkge1xuICAgICAgcmV0dXJuIGl0ZW1zLmluZGV4T2YoZClcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gaXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpZihpdGVtc1tpXVt1bmlxdWVdID09PSBkW3VuaXF1ZV0pIHtcbiAgICAgICAgcmV0dXJuIGlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gLTFcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VfY2hpbGRyZW4oKSB7XG4gICAgdmFyIHRlbXAgPSBhbHRyLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhyb290Lm5hbWVzcGFjZVVSSSwgJ2RpdicpXG4gICAgICAsIGRvbV9ub2Rlc1xuICAgICAgLCB1cGRhdGVcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gdGVtcGxhdGVcblxuICAgIGRvbV9ub2RlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRlbXAuY2hpbGROb2RlcylcbiAgICB1cGRhdGUgPSBhbHRyLmluaXRfbm9kZXMoZG9tX25vZGVzKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZG9tX25vZGVzOiBkb21fbm9kZXNcbiAgICAgICwgdXBkYXRlOiB1cGRhdGVcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBydW5fZG9tX3VwZGF0ZXMoKSB7XG4gICAgdmFyIHVwZGF0ZVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGRvbV91cGRhdGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgdXBkYXRlID0gZG9tX3VwZGF0ZXNbaV1cblxuICAgICAgaWYodXBkYXRlLnJlbW92ZSkge1xuICAgICAgICBmb3IodmFyIGogPSAwLCBsMiA9IHVwZGF0ZS5yZW1vdmUubGVuZ3RoOyBqIDwgbDI7ICsraikge1xuICAgICAgICAgIHJvb3QucmVtb3ZlQ2hpbGQodXBkYXRlLnJlbW92ZVtqXSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZih1cGRhdGUuaW5zZXJ0KSB7XG4gICAgICAgIGZvcih2YXIgaiA9IDAsIGwyID0gdXBkYXRlLmluc2VydC5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICAgICAgcm9vdC5pbnNlcnRCZWZvcmUodXBkYXRlLmluc2VydFtqXSwgdXBkYXRlLmJlZm9yZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGRvbV91cGRhdGVzID0gW11cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBodG1sXG5cbmZ1bmN0aW9uIGh0bWwoZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlmX3RhZ1xuXG5mdW5jdGlvbiBpZl90YWcoZWwsIGFjY2Vzc29yKSB7XG4gIHZhciBwbGFjZWhvbGRlciA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnYWx0ci1pZi1wbGFjZWhvbGRlcicpXG4gICAgLCB1cGRhdGVfY2hpbGRyZW4gPSB0aGlzLmluaXRfbm9kZXMoZWwuY2hpbGROb2RlcylcbiAgICAsIHBhcmVudCA9IGVsLnBhcmVudE5vZGVcbiAgICAsIGhpZGRlbiA9IG51bGxcblxuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCBlbC5uZXh0U2libGluZylcblxuICB2YXIgaGlkZSA9IHRoaXMuYmF0Y2guYWRkKGZ1bmN0aW9uKCkge1xuICAgIGlmKCFoaWRkZW4pIHtcbiAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChlbClcbiAgICAgIGhpZGRlbiA9IHRydWVcbiAgICB9XG4gIH0pXG5cbiAgdmFyIHNob3cgPSB0aGlzLmJhdGNoLmFkZChmdW5jdGlvbigpIHtcbiAgICBpZihoaWRkZW4pIHtcbiAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoZWwsIHBsYWNlaG9sZGVyKVxuICAgICAgaGlkZGVuID0gZmFsc2VcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB0b2dnbGUpXG5cbiAgZnVuY3Rpb24gdG9nZ2xlKHZhbCwgZGF0YSkge1xuICAgIHZhbCA/IHNob3coKSAmJiB1cGRhdGVfY2hpbGRyZW4oZGF0YSkgOiBoaWRlKClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmNsdWRlXG5cbmZ1bmN0aW9uIGluY2x1ZGUoZWwsIG5hbWUpIHtcbiAgZWwuaW5uZXJIVE1MID0gdGhpcy5pbmNsdWRlc1tuYW1lXVxuXG4gIHJldHVybiB0aGlzLmluaXRfbm9kZXMoZWwuY2hpbGROb2Rlcylcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdGV4dFxuXG5mdW5jdGlvbiB0ZXh0KGVsLCBhY2Nlc3Nvcikge1xuICByZXR1cm4gdGhpcy5iYXRjaC5hZGQodGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHdpdGhfdGFnXG5cbmZ1bmN0aW9uIHdpdGhfdGFnKGVsLCBhY2Nlc3Nvcikge1xuICByZXR1cm4gdGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHRoaXMuaW5pdF9ub2RlcyhlbC5jaGlsZE5vZGVzKSlcbn1cbiIsInZhciBUQUcgPSAve3tcXHMqKC4qPylcXHMqfX0vXG5cbm1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVfc3RyaW5nXG5cbmZ1bmN0aW9uIHRlbXBsYXRlX3N0cmluZyh0ZW1wbGF0ZSwgY2hhbmdlKSB7XG4gIGlmKCF0ZW1wbGF0ZS5tYXRjaChUQUcpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGVtcGxhdGVcbiAgICAsIHBhcnRzID0gW11cbiAgICAsIGhvb2tzID0gW11cbiAgICAsIHRpbWVyXG4gICAgLCBpbmRleFxuICAgICwgbmV4dFxuXG4gIHdoaWxlKHJlbWFpbmluZyAmJiAobmV4dCA9IHJlbWFpbmluZy5tYXRjaChUQUcpKSkge1xuICAgIGlmKGluZGV4ID0gcmVtYWluaW5nLmluZGV4T2YobmV4dFswXSkpIHtcbiAgICAgIHBhcnRzLnB1c2gocmVtYWluaW5nLnNsaWNlKDAsIGluZGV4KSlcbiAgICB9XG5cbiAgICBwYXJ0cy5wdXNoKCcnKVxuICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZy5zbGljZShpbmRleCArIG5leHRbMF0ubGVuZ3RoKVxuICAgIGhvb2tzLnB1c2goXG4gICAgICAgIHRoaXMuY3JlYXRlX2FjY2Vzc29yKG5leHRbMV0sIHNldF9wYXJ0LmJpbmQodGhpcywgcGFydHMubGVuZ3RoIC0gMSkpXG4gICAgKVxuICB9XG5cbiAgcGFydHMucHVzaChyZW1haW5pbmcpXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHNldF9wYXJ0KGlkeCwgdmFsKSB7XG4gICAgcGFydHNbaWR4XSA9IHZhbFxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICBob29rKGRhdGEpXG4gICAgfSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXh0X25vZGUoZWwpIHtcbiAgcmV0dXJuIHRoaXMudGVtcGxhdGVfc3RyaW5nKGVsLnRleHRDb250ZW50LCB0aGlzLmJhdGNoLmFkZCh1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHZhbFxuICB9XG59XG4iLCJ2YXIgYWRkX29wZXJhdG9ycyA9IHJlcXVpcmUoJy4vbGliL29wZXJhdG9ycycpXG4gICwgY3JlYXRlX2FjY2Vzb3IgPSByZXF1aXJlKCcuL2xpYi9jcmVhdGUnKVxuICAsIGFkZF9sb29rdXAgPSByZXF1aXJlKCcuL2xpYi9sb29rdXAnKVxuICAsIGFkZF9maWx0ZXIgPSByZXF1aXJlKCcuL2xpYi9maWx0ZXInKVxuICAsIGFkZF9wYXJlbnMgPSByZXF1aXJlKCcuL2xpYi9wYXJlbnMnKVxuICAsIGRlYm91bmNlID0gcmVxdWlyZSgnanVzdC1kZWJvdW5jZScpXG4gICwgYWRkX3R5cGVzID0gcmVxdWlyZSgnLi9saWIvdHlwZXMnKVxuICAsIGFkZF9hcnJvdyA9IHJlcXVpcmUoJy4vbGliL2Fycm93JylcbiAgLCBzcGxpdCA9IHJlcXVpcmUoJy4vbGliL3NwbGl0JylcbiAgLCB0eXBlcyA9IFtdXG5cbm1vZHVsZS5leHBvcnRzID0gYWNjZXNzb3JzXG5cbi8vIG9yZGVyIGlzIGltcG9ydGFudFxuYWRkX3R5cGVzKHR5cGVzKVxuYWRkX2Fycm93KHR5cGVzKVxuYWRkX2ZpbHRlcih0eXBlcylcbmFkZF9wYXJlbnModHlwZXMpXG5hZGRfb3BlcmF0b3JzKHR5cGVzKVxuYWRkX2xvb2t1cCh0eXBlcylcblxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGVfcGFydCA9IGNyZWF0ZV9hY2Nlc29yXG5hY2Nlc3NvcnMucHJvdG90eXBlLmFkZF9maWx0ZXIgPSBhZGRfZmlsdGVyXG5hY2Nlc3NvcnMucHJvdG90eXBlLmNyZWF0ZSA9IGNyZWF0ZVxuYWNjZXNzb3JzLnByb3RvdHlwZS50eXBlcyA9IHR5cGVzXG5hY2Nlc3NvcnMucHJvdG90eXBlLnNwbGl0ID0gc3BsaXRcblxuZnVuY3Rpb24gYWNjZXNzb3JzKGZpbHRlcnMsIGRlbGF5KSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIGFjY2Vzc29ycykpIHtcbiAgICByZXR1cm4gbmV3IGFjY2Vzc29ycyhmaWx0ZXJzLCBkZWxheSlcbiAgfVxuXG4gIGlmKCFkZWxheSAmJiBkZWxheSAhPT0gZmFsc2UpIHtcbiAgICBkZWxheSA9IDBcbiAgfVxuXG4gIHRoaXMuZGVsYXkgPSBkZWxheVxuICB0aGlzLmZpbHRlcnMgPSBmaWx0ZXJzIHx8IHt9XG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZm4pIHtcbiAgdGhpcy5maWx0ZXJzW25hbWVdID0gZm5cbn1cblxuZnVuY3Rpb24gY3JlYXRlKHN0ciwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0ID0gdGhpcy5jcmVhdGVfcGFydChcbiAgICAgIHN0clxuICAgICwgdGhpcy5kZWxheSA9PT0gZmFsc2UgPyB1cGRhdGUgOiBkZWJvdW5jZShjaGFuZ2UsIHRoaXMuZGVsYXksIGZhbHNlLCB0cnVlKVxuICApXG5cbiAgdmFyIHN5bmMgPSBmYWxzZVxuICAgICwgb3V0XG5cbiAgcmV0dXJuIHdyaXRlXG5cbiAgZnVuY3Rpb24gd3JpdGUoZGF0YSkge1xuICAgIHN5bmMgPSB0cnVlXG4gICAgb3V0ID0gbnVsbFxuICAgIHBhcnQoZGF0YSlcbiAgICBzeW5jID0gZmFsc2VcblxuICAgIGlmKG91dCkge1xuICAgICAgY2hhbmdlLmFwcGx5KG51bGwsIG91dClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUodmFsLCBjdHgpIHtcbiAgICBvdXQgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcblxuICAgIGlmKCFzeW5jKSB7XG4gICAgICBjaGFuZ2UuYXBwbHkobnVsbCwgb3V0KVxuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhZGRfYXJyb3dcblxuZnVuY3Rpb24gYWRkX2Fycm93KHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2Fycm93KVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYXJyb3cocGFydHMsIGNoYW5nZSkge1xuICBwYXJ0cyA9IHRoaXMuc3BsaXQocGFydHMsICctPicpXG5cbiAgaWYocGFydHMubGVuZ3RoIDwgMikge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJpZ2h0ID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1sxXSwgY2hhbmdlKVxuICAgICwgbGVmdCA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMF0sIHVwZGF0ZSlcblxuICByZXR1cm4gbGVmdFxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGN0eCkge1xuICAgIHJpZ2h0KHZhbCwgY3R4KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yXG5cbmZ1bmN0aW9uIGFjY2Vzc29yKGtleSwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0ID0gYnVpbGRfcGFydC5jYWxsKHRoaXMsIGtleSwgZmluaXNoKVxuICAgICwgY29udGV4dFxuICAgICwgcHJldlxuXG4gIHJldHVybiBjYWxsLmJpbmQodGhpcylcblxuICBmdW5jdGlvbiBjYWxsKHZhbCwgY3R4KSB7XG4gICAgcGFydCh2YWwsIGNvbnRleHQgPSBjdHggfHwgdmFsKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluaXNoKHZhbCkge1xuICAgIGlmKHR5cGVvZiB2YWwgIT09ICdvYmplY3QnICYmIHZhbCA9PT0gcHJldikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgcHJldiA9IHZhbFxuICAgIGNoYW5nZS5jYWxsKHRoaXMsIHZhbCwgY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZF9wYXJ0KHBhcnQsIGNoYW5nZSkge1xuICB2YXIgYWNjZXNzb3JcblxuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy50eXBlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihhY2Nlc3NvciA9IHRoaXMudHlwZXNbaV0uY2FsbCh0aGlzLCBwYXJ0LCBjaGFuZ2UpKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3JcbiAgICB9XG4gIH1cbn1cbiIsInZhciBmaWx0ZXJfcmVnZXhwID0gL15cXHMqKFteXFxzKF0rKVxcKCguKilcXClcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfZmlsdGVyXG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIodHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfZmlsdGVyKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfZmlsdGVyKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKGZpbHRlcl9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGZpbHRlciA9IHRoaXMuZmlsdGVyc1twYXJ0c1sxXV1cblxuICBpZighZmlsdGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgZmluZCBmaWx0ZXI6ICcgKyBwYXJ0c1sxXSlcbiAgfVxuXG4gIHJldHVybiBmaWx0ZXIuY2FsbCh0aGlzLCB0aGlzLnNwbGl0KHBhcnRzWzJdLCAnLCcsIG51bGwsIG51bGwsIHRydWUpLCBjaGFuZ2UpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFkZF9sb29rdXBcblxuZnVuY3Rpb24gYWRkX2xvb2t1cCh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9sb29rdXApXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9sb29rdXAocGF0aCwgY2hhbmdlKSB7XG4gIGlmKCFwYXRoLmluZGV4T2YoJyRkYXRhJykpIHtcbiAgICBwYXRoID0gcGF0aC5zbGljZSgnJGRhdGEuJy5sZW5ndGgpXG5cbiAgICBpZighcGF0aCkge1xuICAgICAgcmV0dXJuIGNoYW5nZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBsb29rdXAocGF0aC5tYXRjaCgvXFxzKiguKlteXFxzXSlcXHMqLylbMV0sIGNoYW5nZSlcbn1cblxuZnVuY3Rpb24gbG9va3VwKHBhdGgsIGRvbmUpIHtcbiAgdmFyIHBhcnRzID0gcGF0aCA/IHBhdGguc3BsaXQoJy4nKSA6IFtdXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHNlYXJjaChvYmosIGN0eCkge1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IG9iaiAmJiBpIDwgbDsgKytpKSB7XG4gICAgICBvYmogPSBvYmpbcGFydHNbaV1dXG4gICAgfVxuXG4gICAgaWYodHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcgJiYgY3R4KSB7XG4gICAgICByZXR1cm4gc2VhcmNoKGN0eClcbiAgICB9XG5cbiAgICBpZihpID09PSBsKSB7XG4gICAgICByZXR1cm4gZG9uZShvYmopXG4gICAgfVxuXG4gICAgZG9uZSgpXG4gIH1cbn1cbiIsInZhciB0ZXJuYXJ5X3JlZ2V4cCA9IC9eXFxzKiguKz8pXFxzKlxcPyguKilcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfb3BlcmF0b3JzXG5cbmZ1bmN0aW9uIGFkZF9vcGVyYXRvcnModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfdGVybmFyeSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyd8XFxcXHwnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnJiYnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfCddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWydeJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPT09JywgJyE9PScsICc9PScsICchPSddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyc+PScsICc8PScsICc+JywgJzwnLCAnIGluICcsICcgaW5zdGFuY2VvZiAnXSkpXG4gIC8vIHR5cGVzLnB1c2goYmluYXJ5KFsnPDwnLCAnPj4nLCAnPj4+J10pKSAvL2NvbmZsaWNzIHdpdGggPCBhbmQgPlxuICB0eXBlcy5wdXNoKGJpbmFyeShbJysnLCAnLSddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycqJywgJy8nLCAnJSddKSlcbiAgdHlwZXMucHVzaCh1bmFyeShbJyEnLCAnKycsICctJywgJ34nXSkpXG59XG5cbmZ1bmN0aW9uIGJpbmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKiguKz8pXFxcXHNcXCooXFxcXCcgK1xuICAgICAgbGlzdC5qb2luKCd8XFxcXCcpICtcbiAgICAgICcpXFxcXHMqKC4rPylcXFxccyokJ1xuICApXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHBhcnRzLCBjaGFuZ2UpIHtcbiAgICByZXR1cm4gY3JlYXRlX2JpbmFyeS5jYWxsKHRoaXMsIHJlZ2V4LCBwYXJ0cywgY2hhbmdlKVxuICB9XG59XG5cbmZ1bmN0aW9uIHVuYXJ5KGxpc3QpIHtcbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgICAgICdeXFxcXHMqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV91bmFyeS5jYWxsKHRoaXMsIHJlZ2V4LCBwYXJ0cywgY2hhbmdlKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXJuYXJ5KHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHRlcm5hcnlfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjb25kaXRpb24gPSBwYXJ0c1sxXVxuICAgICwgcmVzdCA9IHBhcnRzWzJdXG4gICAgLCBjb3VudCA9IDFcblxuICByZXN0ID0gdGhpcy5zcGxpdChyZXN0LCBbJz8nXSwgWyc6J10sICc6JylcblxuICBpZihyZXN0Lmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIHRlcm5hcnk6ICcgKyBwYXJ0c1swXSlcbiAgfVxuXG4gIHZhciBub3QgPSB0aGlzLmNyZWF0ZV9wYXJ0KHJlc3RbMV0sIGNoYW5nZSlcbiAgICAsIG9rID0gdGhpcy5jcmVhdGVfcGFydChyZXN0WzBdLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQoY29uZGl0aW9uLCB1cGRhdGUpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgY29udGV4dCkge1xuICAgIHJldHVybiB2YWwgPyBvayhjb250ZXh0KSA6IG5vdChjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9iaW5hcnkocmVnZXgsIHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHJlZ2V4KSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjaGVja19saHMgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzFdLCB1cGRhdGUuYmluZChudWxsLCBmYWxzZSkpXG4gICAgLCBjaGVja19yaHMgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzNdLCB1cGRhdGUuYmluZChudWxsLCB0cnVlKSlcbiAgICAsIGxoc1xuICAgICwgcmhzXG5cbiAgdmFyIGNoYW5nZWQgPSBGdW5jdGlvbihcbiAgICAgICdjaGFuZ2UsIGxocywgcmhzJ1xuICAgICwgJ3JldHVybiBjaGFuZ2UobGhzICcgKyBwYXJ0c1syXSArICcgcmhzKSdcbiAgKS5iaW5kKG51bGwsIGNoYW5nZSlcblxuICByZXR1cm4gb25fZGF0YVxuXG4gIGZ1bmN0aW9uIG9uX2RhdGEoZGF0YSwgY3R4KSB7XG4gICAgY2hlY2tfbGhzKGRhdGEsIGN0eClcbiAgICBjaGVja19yaHMoZGF0YSwgY3R4KVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGlzX3JocywgdmFsKSB7XG4gICAgaXNfcmhzID8gcmhzID0gdmFsIDogbGhzID0gdmFsXG4gICAgY2hhbmdlZChsaHMsIHJocylcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdW5hcnkocmVnZXgsIHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHJlZ2V4KSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCB2YWwnXG4gICAgLCAncmV0dXJuIGNoYW5nZSgnICsgcGFydHNbMV0gKyAndmFsKSdcbiAgKS5iaW5kKG51bGwsIGNoYW5nZSlcblxuICByZXR1cm4gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1syXSwgY2hhbmdlZClcbn1cbiIsInZhciBwYXJlbnNfcmVnZXhwID0gL15cXHMqXFwoKC4qKSQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX3BhcmVuc1xuXG5mdW5jdGlvbiBhZGRfcGFyZW5zKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3BhcmVucylcbn1cblxuZnVuY3Rpb24gY3JlYXRlX3BhcmVucyhwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChwYXJlbnNfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBib2R5ID0gcGFydHNbMV1cbiAgICAsIGNvdW50ID0gMVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBib2R5Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGJvZHlbaV0gPT09ICcpJykge1xuICAgICAgLS1jb3VudFxuICAgIH0gZWxzZSBpZihib2R5W2ldID09PSAnKCcpIHtcbiAgICAgICsrY291bnRcbiAgICB9XG5cbiAgICBpZighY291bnQpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYoIWkgfHwgaSA9PT0gbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIHRlcm5hcnk6ICcgKyBwYXJ0c1swXSlcbiAgfVxuXG4gIHZhciBjb250ZW50ID0gIHRoaXMuY3JlYXRlX3BhcnQoYm9keS5zbGljZSgwLCBpKSwgdXBkYXRlKVxuICAgICwga2V5ID0gJ3BhcmVuXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyKVxuXG4gIHZhciB0ZW1wbGF0ZSA9IHRoaXMuY3JlYXRlX3BhcnQoa2V5ICsgYm9keS5zbGljZShpICsgMSksIGNoYW5nZSlcblxuICByZXR1cm4gY29udGVudFxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICBjb250ZXh0ID0gT2JqZWN0LmNyZWF0ZShjb250ZXh0KVxuICAgIGNvbnRleHRba2V5XSA9IHZhbFxuICAgIHRlbXBsYXRlKGNvbnRleHQpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gc3BsaXRcblxuZnVuY3Rpb24gc3BsaXQocGFydHMsIGtleSwgb3BlbnMsIGNsb3NlcywgYWxsKSB7XG4gIHZhciBhbGxfY2xvc2VzID0gWycpJywgJ30nLCAnXSddXG4gICAgLCBhbGxfb3BlbnMgPSBbJygnLCAneycsICdbJ11cbiAgICAsIHN1bSA9IDBcbiAgICAsIHNwbGl0X3BvaW50XG4gICAgLCBpbmRleFxuXG4gIGlmKG9wZW5zKSB7XG4gICAgYWxsX29wZW5zID0gYWxsX29wZW5zLmNvbmNhdChvcGVucylcbiAgfVxuXG4gIGlmKGNsb3Nlcykge1xuICAgIGFsbF9jbG9zZXMgPSBhbGxfY2xvc2VzLmNvbmNhdChjbG9zZXMpXG4gIH1cblxuICB2YXIgY291bnRzID0gYWxsX29wZW5zLm1hcChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMFxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZighc3VtICYmIChzcGxpdF9wb2ludCA9IHBhcnRzLnNsaWNlKGkpLmluZGV4T2Yoa2V5KSkgPT09IC0xKSB7XG4gICAgICByZXR1cm4gW3BhcnRzXVxuICAgIH1cblxuICAgIGlmKCFzdW0gJiYgIXNwbGl0X3BvaW50KSB7XG4gICAgICBicmVha1xuICAgIH1cblxuICAgIGlmKChpbmRleCA9IGFsbF9vcGVucy5pbmRleE9mKHBhcnRzW2ldKSkgIT09IC0xKSB7XG4gICAgICArK2NvdW50c1tpbmRleF1cbiAgICAgICsrc3VtXG4gICAgfSBlbHNlIGlmKChpbmRleCA9IGFsbF9jbG9zZXMuaW5kZXhPZihwYXJ0c1tpXSkpICE9PSAtMSkge1xuICAgICAgLS1jb3VudHNbaW5kZXhdXG4gICAgICAtLXN1bVxuICAgIH1cblxuICAgIGZvcih2YXIgaiA9IDA7IGogPCBjb3VudHMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmKGNvdW50c1tqXSA8IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgXCInICsgYWxsX29wZW5zW2pdICsgJ1wiXCIgaW4gJyArIHBhcnRzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKHN1bSB8fCBpID09PSBwYXJ0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gW3BhcnRzXVxuICB9XG5cbiAgdmFyIHJpZ2h0ID0gcGFydHMuc2xpY2UoaSArIGtleS5sZW5ndGgpXG4gICAgLCBsZWZ0ID0gcGFydHMuc2xpY2UoMCwgaSlcblxuICBpZighYWxsKSB7XG4gICAgcmV0dXJuIFtsZWZ0LCByaWdodF1cbiAgfVxuXG4gIHJldHVybiBbbGVmdF0uY29uY2F0KHNwbGl0KHJpZ2h0LCBrZXksIG9wZW5zLCBjbG9zZXMsIGFsbCkpXG59XG4iLCJ2YXIgc3RyaW5nX3JlZ2V4cCA9IC9eXFxzKig/OicoKD86W14nXFxcXF18KD86XFxcXC4pKSopJ3xcIigoPzpbXlwiXFxcXF18KD86XFxcXC4pKSopXCIpXFxzKiQvXG4gICwgbnVtYmVyX3JlZ2V4cCA9IC9eXFxzKihcXGQqKD86XFwuXFxkKyk/KVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF90eXBlc1xuXG5mdW5jdGlvbiBhZGRfdHlwZXModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKVxuICB0eXBlcy5wdXNoKGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9zdHJpbmdfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goc3RyaW5nX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKHBhcnRzWzFdIHx8IHBhcnRzWzJdKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gobnVtYmVyX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKCtwYXJ0c1sxXSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZVxuXG5mdW5jdGlvbiBkZWJvdW5jZShmbiwgZGVsYXksIGF0X3N0YXJ0LCBndWFyYW50ZWUpIHtcbiAgdmFyIHRpbWVvdXRcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuXG4gICAgaWYodGltZW91dCAmJiAoYXRfc3RhcnQgfHwgZ3VhcmFudGVlKSkge1xuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIGlmKCFhdF9zdGFydCkge1xuICAgICAgY2xlYXIoKVxuXG4gICAgICByZXR1cm4gdGltZW91dCA9IHNldFRpbWVvdXQocnVuLCBkZWxheSlcbiAgICB9XG5cbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhciwgZGVsYXkpXG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcblxuICAgIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICAgIGNsZWFyKClcbiAgICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dClcbiAgICAgIHRpbWVvdXQgPSBudWxsXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgZWFzZSA9IHJlcXVpcmUoJ2Vhc2UtY29tcG9uZW50JylcbiAgLCByYWYgPSByZXF1aXJlKCdyYWYnKS5wb2x5ZmlsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IGVhc2VfZmlsdGVyXG5cbmZ1bmN0aW9uIGVhc2VfZmlsdGVyKHBhcnRzLCBjaGFuZ2UpIHtcbiAgdmFyIGZuID0gJ2xpbmVhcidcbiAgLCBjdXJyZW50ID0ge31cbiAgLCB0YXJnZXQgPSB7fVxuICAsIG1zID0gMVxuICAsIHN0YXJ0XG4gICwgd2FpdFxuICAsIHByZXZcblxuICB2YXIgdXBkYXRlX21zID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1swXSwgZnVuY3Rpb24oZCkge1xuICAgIG1zID0gK2RcbiAgICBhbmltYXRlKClcbiAgfSlcblxuICB2YXIgdXBkYXRlX2ZuID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1sxXSB8fCAnbGluZWFyJywgZnVuY3Rpb24oZCkge1xuICAgIGZuID0gZCB8fCAnbGluZWFyJ1xuICAgIGFuaW1hdGUoKVxuICB9KVxuXG4gIGZ1bmN0aW9uIGFuaW1hdGUoKSB7XG4gICAgaWYod2FpdCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgd2FpdCA9IHJhZihmdW5jdGlvbigpIHtcbiAgICAgIHdhaXQgPSBudWxsXG4gICAgICB1cGRhdGUoKVxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oZCwgY3R4KSB7XG4gICAgYW5pbWF0ZSgpXG4gICAgcHJldiA9IGN1cnJlbnRcbiAgICB0YXJnZXQgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGQpKVxuICAgIHN0YXJ0ID0gbmV3IERhdGVcbiAgICB1cGRhdGVfbXMoY3R4KVxuICAgIHVwZGF0ZV9mbihjdHgpXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIGRpZmYgPSBuZXcgRGF0ZSAtIHN0YXJ0XG4gICAgICAsIHAgPSBkaWZmIC8gbXNcblxuICAgIGlmKHAgPj0gMSkge1xuICAgICAgcCA9IDFcbiAgICB9IGVsc2Uge1xuICAgICAgYW5pbWF0ZSgpXG4gICAgfVxuXG4gICAgcCA9IGVhc2VbZm5dKHApXG5cbiAgICBjdXJyZW50ID0gdXBkYXRlX3BhcnQocHJldiwgdGFyZ2V0LCBwKVxuICAgIGNoYW5nZShjdXJyZW50KVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlX3BhcnQocHJldiwgdGFyZ2V0LCBwKSB7XG4gICAgdmFyIHJlc3VsdCA9IHRhcmdldFxuICAgICAgLCBrZXlzXG5cbiAgICBpZih0eXBlb2YgcHJldiAhPT0gdHlwZW9mIHRhcmdldCkge1xuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH0gZWxzZSBpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgIHJlc3VsdCA9IEFycmF5KHRhcmdldC5sZW5ndGgpXG5cbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSB0YXJnZXQubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgIHJlc3VsdFtpXSA9IHVwZGF0ZV9wYXJ0KHByZXZbaV0sIHRhcmdldFtpXSwgcClcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYodHlwZW9mIHRhcmdldCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGtleXMgPSBPYmplY3Qua2V5cyh0YXJnZXQpXG4gICAgICByZXN1bHQgPSB7fVxuXG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgcmVzdWx0W2tleXNbaV1dID0gdXBkYXRlX3BhcnQocHJldltrZXlzW2ldXSwgdGFyZ2V0W2tleXNbaV1dLCBwKVxuICAgICAgfVxuICAgIH0gZWxzZSBpZihwcmV2ICE9PSB0YXJnZXQgJiYgdHlwZW9mIHRhcmdldCA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgKHRhcmdldCAtIHByZXYpICogcFxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByYWZcblxudmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG4gICwgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzIDogd2luZG93XG4gICwgbm93ID0gZ2xvYmFsLnBlcmZvcm1hbmNlICYmIGdsb2JhbC5wZXJmb3JtYW5jZS5ub3cgPyBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KClcbiAgfSA6IERhdGUubm93IHx8IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gK25ldyBEYXRlKClcbiAgfVxuXG52YXIgX3JhZiA9XG4gIGdsb2JhbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAoZ2xvYmFsLnNldEltbWVkaWF0ZSA/IGZ1bmN0aW9uKGZuLCBlbCkge1xuICAgIHNldEltbWVkaWF0ZShmbilcbiAgfSA6XG4gIGZ1bmN0aW9uKGZuLCBlbCkge1xuICAgIHNldFRpbWVvdXQoZm4sIDApXG4gIH0pXG5cbmZ1bmN0aW9uIHJhZihlbCwgdGljaykge1xuICB2YXIgbm93ID0gcmFmLm5vdygpXG4gICAgLCBlZSA9IG5ldyBFRVxuICAgIFxuICBpZih0eXBlb2YgZWwgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0aWNrID0gZWxcbiAgICBlbCA9IHVuZGVmaW5lZFxuICB9XG4gIFxuICBlZS5wYXVzZSA9IGZ1bmN0aW9uKCkgeyBlZS5wYXVzZWQgPSB0cnVlIH1cbiAgZWUucmVzdW1lID0gZnVuY3Rpb24oKSB7IGVlLnBhdXNlZCA9IGZhbHNlIH1cblxuICBfcmFmKGl0ZXIsIGVsKVxuICBcbiAgaWYodGljaykge1xuICAgIGVlLm9uKCdkYXRhJywgZnVuY3Rpb24oZHQpIHtcbiAgICAgIHRpY2soZHQpXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiBlZVxuXG4gIGZ1bmN0aW9uIGl0ZXIodGltZXN0YW1wKSB7XG4gICAgdmFyIF9ub3cgPSByYWYubm93KClcbiAgICAgICwgZHQgPSBfbm93IC0gbm93XG4gICAgXG4gICAgbm93ID0gX25vd1xuXG4gICAgaWYoIWVlLnBhdXNlZCkge1xuICAgICAgZWUuZW1pdCgnZGF0YScsIGR0KVxuICAgIH1cbiAgICBcbiAgICBfcmFmKGl0ZXIsIGVsKVxuICB9XG59XG5cbnJhZi5wb2x5ZmlsbCA9IF9yYWZcbnJhZi5ub3cgPSBub3dcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBzY2FsZVxuXG5mdW5jdGlvbiBzY2FsZShwYXJ0cywgY2hhbmdlKSB7XG4gIHZhciByYW5nZXMgPSBKU09OLnBhcnNlKHBhcnRzWzFdKVxuICAgICwgZGltZW5zaW9ucyA9IFtdXG4gICAgLCBwcmV2ID0gW11cblxuICB2YXIgdXBkYXRlX3JhbmdlID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1swXSwgZnVuY3Rpb24oZG9tYWlucywgY3R4KSB7XG4gICAgZGltZW5zaW9ucyA9IG5ldyBBcnJheShNYXRoLm1heChkb21haW5zLmxlbmd0aCwgcmFuZ2VzLmxlbmd0aCkpXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gZGltZW5zaW9ucy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGRpbWVuc2lvbnNbaV0gPSB7XG4gICAgICAgICAgc2NhbGU6IChyYW5nZXNbaV1bMV0gLSByYW5nZXNbaV1bMF0pIC8gKGRvbWFpbnNbaV1bMV0gLSBkb21haW5zW2ldWzBdKVxuICAgICAgICAsIG9mZnNldDogZG9tYWluc1tpXVswXVxuICAgICAgfVxuICAgIH1cblxuICAgIG1hcChwcmV2KVxuICB9KVxuXG4gIHJldHVybiBtYXBcblxuICBmdW5jdGlvbiBtYXAoZGF0YSwgY3R4KSB7XG4gICAgaWYoY3R4KSB7XG4gICAgICBwcmV2ID0gZGF0YVxuXG4gICAgICByZXR1cm4gdXBkYXRlX3JhbmdlKGRhdGEsIGN0eClcbiAgICB9XG5cbiAgICB2YXIgb3V0ID0gQXJyYXkoZGF0YS5sZW5ndGgpXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIG91dFtpXSA9IEFycmF5KGRpbWVuc2lvbnMpXG5cbiAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBkaW1lbnNpb25zLmxlbmd0aDsgKytqKSB7XG4gICAgICAgIG91dFtpXVtqXSA9IChkYXRhW2ldW2pdIC0gZGltZW5zaW9uc1tqXS5vZmZzZXQpICogZGltZW5zaW9uc1tqXS5zY2FsZVxuICAgICAgfVxuICAgIH1cblxuICAgIGNoYW5nZShvdXQpXG4gIH1cbn1cbiIsIlxuLy8gZWFzaW5nIGZ1bmN0aW9ucyBmcm9tIFwiVHdlZW4uanNcIlxuXG5leHBvcnRzLmxpbmVhciA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gbjtcbn07XG5cbmV4cG9ydHMuaW5RdWFkID0gZnVuY3Rpb24obil7XG4gIHJldHVybiBuICogbjtcbn07XG5cbmV4cG9ydHMub3V0UXVhZCA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gbiAqICgyIC0gbik7XG59O1xuXG5leHBvcnRzLmluT3V0UXVhZCA9IGZ1bmN0aW9uKG4pe1xuICBuICo9IDI7XG4gIGlmIChuIDwgMSkgcmV0dXJuIDAuNSAqIG4gKiBuO1xuICByZXR1cm4gLSAwLjUgKiAoLS1uICogKG4gLSAyKSAtIDEpO1xufTtcblxuZXhwb3J0cy5pbkN1YmUgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIG4gKiBuICogbjtcbn07XG5cbmV4cG9ydHMub3V0Q3ViZSA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gLS1uICogbiAqIG4gKyAxO1xufTtcblxuZXhwb3J0cy5pbk91dEN1YmUgPSBmdW5jdGlvbihuKXtcbiAgbiAqPSAyO1xuICBpZiAobiA8IDEpIHJldHVybiAwLjUgKiBuICogbiAqIG47XG4gIHJldHVybiAwLjUgKiAoKG4gLT0gMiApICogbiAqIG4gKyAyKTtcbn07XG5cbmV4cG9ydHMuaW5RdWFydCA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gbiAqIG4gKiBuICogbjtcbn07XG5cbmV4cG9ydHMub3V0UXVhcnQgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDEgLSAoLS1uICogbiAqIG4gKiBuKTtcbn07XG5cbmV4cG9ydHMuaW5PdXRRdWFydCA9IGZ1bmN0aW9uKG4pe1xuICBuICo9IDI7XG4gIGlmIChuIDwgMSkgcmV0dXJuIDAuNSAqIG4gKiBuICogbiAqIG47XG4gIHJldHVybiAtMC41ICogKChuIC09IDIpICogbiAqIG4gKiBuIC0gMik7XG59O1xuXG5leHBvcnRzLmluUXVpbnQgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIG4gKiBuICogbiAqIG4gKiBuO1xufVxuXG5leHBvcnRzLm91dFF1aW50ID0gZnVuY3Rpb24obil7XG4gIHJldHVybiAtLW4gKiBuICogbiAqIG4gKiBuICsgMTtcbn1cblxuZXhwb3J0cy5pbk91dFF1aW50ID0gZnVuY3Rpb24obil7XG4gIG4gKj0gMjtcbiAgaWYgKG4gPCAxKSByZXR1cm4gMC41ICogbiAqIG4gKiBuICogbiAqIG47XG4gIHJldHVybiAwLjUgKiAoKG4gLT0gMikgKiBuICogbiAqIG4gKiBuICsgMik7XG59O1xuXG5leHBvcnRzLmluU2luZSA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gMSAtIE1hdGguY29zKG4gKiBNYXRoLlBJIC8gMiApO1xufTtcblxuZXhwb3J0cy5vdXRTaW5lID0gZnVuY3Rpb24obil7XG4gIHJldHVybiBNYXRoLnNpbihuICogTWF0aC5QSSAvIDIpO1xufTtcblxuZXhwb3J0cy5pbk91dFNpbmUgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogbikpO1xufTtcblxuZXhwb3J0cy5pbkV4cG8gPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDAgPT0gbiA/IDAgOiBNYXRoLnBvdygxMDI0LCBuIC0gMSk7XG59O1xuXG5leHBvcnRzLm91dEV4cG8gPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDEgPT0gbiA/IG4gOiAxIC0gTWF0aC5wb3coMiwgLTEwICogbik7XG59O1xuXG5leHBvcnRzLmluT3V0RXhwbyA9IGZ1bmN0aW9uKG4pe1xuICBpZiAoMCA9PSBuKSByZXR1cm4gMDtcbiAgaWYgKDEgPT0gbikgcmV0dXJuIDE7XG4gIGlmICgobiAqPSAyKSA8IDEpIHJldHVybiAuNSAqIE1hdGgucG93KDEwMjQsIG4gLSAxKTtcbiAgcmV0dXJuIC41ICogKC1NYXRoLnBvdygyLCAtMTAgKiAobiAtIDEpKSArIDIpO1xufTtcblxuZXhwb3J0cy5pbkNpcmMgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDEgLSBNYXRoLnNxcnQoMSAtIG4gKiBuKTtcbn07XG5cbmV4cG9ydHMub3V0Q2lyYyA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gTWF0aC5zcXJ0KDEgLSAoLS1uICogbikpO1xufTtcblxuZXhwb3J0cy5pbk91dENpcmMgPSBmdW5jdGlvbihuKXtcbiAgbiAqPSAyXG4gIGlmIChuIDwgMSkgcmV0dXJuIC0wLjUgKiAoTWF0aC5zcXJ0KDEgLSBuICogbikgLSAxKTtcbiAgcmV0dXJuIDAuNSAqIChNYXRoLnNxcnQoMSAtIChuIC09IDIpICogbikgKyAxKTtcbn07XG5cbmV4cG9ydHMuaW5CYWNrID0gZnVuY3Rpb24obil7XG4gIHZhciBzID0gMS43MDE1ODtcbiAgcmV0dXJuIG4gKiBuICogKCggcyArIDEgKSAqIG4gLSBzKTtcbn07XG5cbmV4cG9ydHMub3V0QmFjayA9IGZ1bmN0aW9uKG4pe1xuICB2YXIgcyA9IDEuNzAxNTg7XG4gIHJldHVybiAtLW4gKiBuICogKChzICsgMSkgKiBuICsgcykgKyAxO1xufTtcblxuZXhwb3J0cy5pbk91dEJhY2sgPSBmdW5jdGlvbihuKXtcbiAgdmFyIHMgPSAxLjcwMTU4ICogMS41MjU7XG4gIGlmICggKCBuICo9IDIgKSA8IDEgKSByZXR1cm4gMC41ICogKCBuICogbiAqICggKCBzICsgMSApICogbiAtIHMgKSApO1xuICByZXR1cm4gMC41ICogKCAoIG4gLT0gMiApICogbiAqICggKCBzICsgMSApICogbiArIHMgKSArIDIgKTtcbn07XG5cbmV4cG9ydHMuaW5Cb3VuY2UgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDEgLSBleHBvcnRzLm91dEJvdW5jZSgxIC0gbik7XG59O1xuXG5leHBvcnRzLm91dEJvdW5jZSA9IGZ1bmN0aW9uKG4pe1xuICBpZiAoIG4gPCAoIDEgLyAyLjc1ICkgKSB7XG4gICAgcmV0dXJuIDcuNTYyNSAqIG4gKiBuO1xuICB9IGVsc2UgaWYgKCBuIDwgKCAyIC8gMi43NSApICkge1xuICAgIHJldHVybiA3LjU2MjUgKiAoIG4gLT0gKCAxLjUgLyAyLjc1ICkgKSAqIG4gKyAwLjc1O1xuICB9IGVsc2UgaWYgKCBuIDwgKCAyLjUgLyAyLjc1ICkgKSB7XG4gICAgcmV0dXJuIDcuNTYyNSAqICggbiAtPSAoIDIuMjUgLyAyLjc1ICkgKSAqIG4gKyAwLjkzNzU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIDcuNTYyNSAqICggbiAtPSAoIDIuNjI1IC8gMi43NSApICkgKiBuICsgMC45ODQzNzU7XG4gIH1cbn07XG5cbmV4cG9ydHMuaW5PdXRCb3VuY2UgPSBmdW5jdGlvbihuKXtcbiAgaWYgKG4gPCAuNSkgcmV0dXJuIGV4cG9ydHMuaW5Cb3VuY2UobiAqIDIpICogLjU7XG4gIHJldHVybiBleHBvcnRzLm91dEJvdW5jZShuICogMiAtIDEpICogLjUgKyAuNTtcbn07XG5cbi8vIGFsaWFzZXNcblxuZXhwb3J0c1snaW4tcXVhZCddID0gZXhwb3J0cy5pblF1YWQ7XG5leHBvcnRzWydvdXQtcXVhZCddID0gZXhwb3J0cy5vdXRRdWFkO1xuZXhwb3J0c1snaW4tb3V0LXF1YWQnXSA9IGV4cG9ydHMuaW5PdXRRdWFkO1xuZXhwb3J0c1snaW4tY3ViZSddID0gZXhwb3J0cy5pbkN1YmU7XG5leHBvcnRzWydvdXQtY3ViZSddID0gZXhwb3J0cy5vdXRDdWJlO1xuZXhwb3J0c1snaW4tb3V0LWN1YmUnXSA9IGV4cG9ydHMuaW5PdXRDdWJlO1xuZXhwb3J0c1snaW4tcXVhcnQnXSA9IGV4cG9ydHMuaW5RdWFydDtcbmV4cG9ydHNbJ291dC1xdWFydCddID0gZXhwb3J0cy5vdXRRdWFydDtcbmV4cG9ydHNbJ2luLW91dC1xdWFydCddID0gZXhwb3J0cy5pbk91dFF1YXJ0O1xuZXhwb3J0c1snaW4tcXVpbnQnXSA9IGV4cG9ydHMuaW5RdWludDtcbmV4cG9ydHNbJ291dC1xdWludCddID0gZXhwb3J0cy5vdXRRdWludDtcbmV4cG9ydHNbJ2luLW91dC1xdWludCddID0gZXhwb3J0cy5pbk91dFF1aW50O1xuZXhwb3J0c1snaW4tc2luZSddID0gZXhwb3J0cy5pblNpbmU7XG5leHBvcnRzWydvdXQtc2luZSddID0gZXhwb3J0cy5vdXRTaW5lO1xuZXhwb3J0c1snaW4tb3V0LXNpbmUnXSA9IGV4cG9ydHMuaW5PdXRTaW5lO1xuZXhwb3J0c1snaW4tZXhwbyddID0gZXhwb3J0cy5pbkV4cG87XG5leHBvcnRzWydvdXQtZXhwbyddID0gZXhwb3J0cy5vdXRFeHBvO1xuZXhwb3J0c1snaW4tb3V0LWV4cG8nXSA9IGV4cG9ydHMuaW5PdXRFeHBvO1xuZXhwb3J0c1snaW4tY2lyYyddID0gZXhwb3J0cy5pbkNpcmM7XG5leHBvcnRzWydvdXQtY2lyYyddID0gZXhwb3J0cy5vdXRDaXJjO1xuZXhwb3J0c1snaW4tb3V0LWNpcmMnXSA9IGV4cG9ydHMuaW5PdXRDaXJjO1xuZXhwb3J0c1snaW4tYmFjayddID0gZXhwb3J0cy5pbkJhY2s7XG5leHBvcnRzWydvdXQtYmFjayddID0gZXhwb3J0cy5vdXRCYWNrO1xuZXhwb3J0c1snaW4tb3V0LWJhY2snXSA9IGV4cG9ydHMuaW5PdXRCYWNrO1xuZXhwb3J0c1snaW4tYm91bmNlJ10gPSBleHBvcnRzLmluQm91bmNlO1xuZXhwb3J0c1snb3V0LWJvdW5jZSddID0gZXhwb3J0cy5vdXRCb3VuY2U7XG5leHBvcnRzWydpbi1vdXQtYm91bmNlJ10gPSBleHBvcnRzLmluT3V0Qm91bmNlO1xuIiwidmFyIGFsdHIgPSByZXF1aXJlKCcuLi8uLi9saWIvaW5kZXgnKVxuICAsIHNjYWxlID0gcmVxdWlyZSgnYWx0ci1zY2FsZScpXG4gICwgZWFzZSA9IHJlcXVpcmUoJ2FsdHItZWFzZScpXG5cbmFsdHIuYWRkX2ZpbHRlcignc3ZnX3BhdGgnLCBzdmdfcGF0aClcbmFsdHIuYWRkX2ZpbHRlcignc2NhbGUnLCBzY2FsZSlcbmFsdHIuYWRkX2ZpbHRlcignZWFzZScsIGVhc2UpXG5cbnZhciBkYXRhID0ge1xuICAgIHBvaW50czogW1srbmV3IERhdGUgLSAzMDAwMCwgMzAwXV1cbiAgLCByYW5nZTogW1xuICAgICAgICBbK25ldyBEYXRlLCArbmV3IERhdGVdXG4gICAgICAsIFswLCAzMDBdXG4gICAgXVxufVxuXG52YXIgdGVtcGxhdGUgPSBhbHRyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdncmFwaDEnKSwgZGF0YSlcblxuZm9yKHZhciBpID0gMjk7IGkgPiAwOyAtLWkpIHtcbiAgYWRkX2l0ZW0obmV3IERhdGUgLSBpICogMTAwMClcbn1cblxuc2V0SW50ZXJ2YWwoYWRkX2l0ZW0sIDIwMDApXG5cbmZ1bmN0aW9uIGFkZF9pdGVtKHRpbWUpIHtcbiAgZGF0YS5wb2ludHMucHVzaChbXG4gICAgICB0aW1lIHx8ICtuZXcgRGF0ZVxuICAgICwgfn4oTWF0aC5yYW5kb20oKSAqIDMwMClcbiAgXSlcblxuICBkYXRhLnBvaW50cyA9IGRhdGEucG9pbnRzLnNsaWNlKC0xMDApXG4gIGRhdGEucmFuZ2VbMF1bMF0gPSBuZXcgRGF0ZSAtIDMwMDAwXG4gIGRhdGEucmFuZ2VbMF1bMV0gPSArbmV3IERhdGVcbiAgdGVtcGxhdGUudXBkYXRlKGRhdGEpXG59XG5cbmZ1bmN0aW9uIHN2Z19wYXRoKHBhcnRzLCBjaGFuZ2UpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0gcGFydHMuc2xpY2UoKVxuICAgICAgLCBkYXRhID0gZGF0YS5zbGljZSgpXG5cbiAgICByZXN1bHQuc3BsaWNlLmFwcGx5KHJlc3VsdCwgWzEsIDBdLmNvbmNhdChkYXRhLm1hcChmdW5jdGlvbihwKSB7XG4gICAgICByZXR1cm4gJ0wgJyArIHBbMF0gKyAnICcgKyBwWzFdXG4gICAgfSkpKVxuXG4gICAgY2hhbmdlKHJlc3VsdC5qb2luKCcgJykpXG4gIH1cbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
