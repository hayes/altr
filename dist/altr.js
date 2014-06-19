(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var template_string = require('./template_string')
  , element_node = require('./element_node')
  , accessors = require('altr-accessors')
  , text_node = require('./text_node')
  , batch = require('./batch')

module.exports = altr
altr.addTag = add_tag
altr.include = include.bind(altr.prototype)
altr.addFilter = add_filter.bind(altr.prototype)

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

  this._update = this.updateNodes(this.rootNodes())

  if(data) {
    this.update(data)
  }
}

altr.prototype.templateString = template_string
altr.prototype.createAccessor = create_accessor
altr.prototype.updateNodes = update_nodes
altr.prototype.addFilter = add_filter
altr.prototype.initNodes = init_nodes
altr.prototype.rootNodes = root_nodes
altr.prototype.toString = outer_html
altr.prototype.include = include
altr.prototype.initNode = init_node
altr.prototype.into = append_to
altr.prototype.update = update

altr.prototype.includes = {}
altr.prototype.tagList = []
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
  return this.root.nodeType === 11 ?
    [].slice.call(this.root.childNodes) :
    [this.root]
}

function add_filter(name, filter) {
  altr.prototype.filters[name] = filter
}

function add_tag(attr, tag) {
  altr.prototype.tags[attr] = tag
  altr.prototype.tagList.push({
      attr: attr
    , constructor: tag
  })
}

function outer_html() {
  return this.rootNodes().map(function(node) {
    return node.outerHTML
  }).join('')
}

function append_to(node) {
  var root_nodes = this.rootNodes()

  for(var i = 0, l = root_nodes.length; i < l; ++i) {
    node.appendChild(root_nodes[i])
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

},{}],5:[function(require,module,exports){
var placeholder = require('./tags/placeholder')
  , include_tag = require('./tags/include')
  , text_tag = require('./tags/text')
  , html_tag = require('./tags/html')
  , with_tag = require('./tags/with')
  , for_tag = require('./tags/for')
  , if_tag = require('./tags/if')
  , altr = require('./altr')

module.exports = altr

altr.addTag('altr-placeholder', placeholder)
altr.addTag('altr-include', include_tag)
altr.addTag('altr-text', text_tag)
altr.addTag('altr-html', html_tag)
altr.addTag('altr-with', with_tag)
altr.addTag('altr-for', for_tag)
altr.addTag('altr-if', if_tag)

},{"./altr":1,"./tags/for":6,"./tags/html":7,"./tags/if":8,"./tags/include":9,"./tags/placeholder":10,"./tags/text":11,"./tags/with":12}],6:[function(require,module,exports){
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
    update = altr.updateNodes(dom_nodes)

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

},{}],8:[function(require,module,exports){
module.exports = if_tag

function if_tag(el, accessor) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , update_children = this.updateNodes(el.childNodes)
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

  return this.createAccessor(accessor, toggle)

  function toggle(val, data) {
    if(!val) {
      return hide()
    }

    show()
    update_children(data)
  }
}

},{}],9:[function(require,module,exports){
module.exports = include

function include(el, name) {
  el.innerHTML = this.includes[name]

  return this.updateNodes(el.childNodes)
}

},{}],10:[function(require,module,exports){
module.exports = placeholder

function placeholder(el, accessor) {
  var parent = el.parentNode

  return this.batch.add(this.createAccessor(accessor, update))

  function update(val) {
    if(!val.nodeName) {
      return
    }

    parent.insertBefore(val, el)
    parent.removeChild(el)
    el = val
  }
}

},{}],11:[function(require,module,exports){
module.exports = text

function text(el, accessor) {
  return this.batch.add(this.createAccessor(accessor, update))

  function update(val) {
    el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],12:[function(require,module,exports){
module.exports = with_tag

function with_tag(el, accessor) {
  return this.createAccessor(accessor, this.updateNodes(el.childNodes))
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

},{}],14:[function(require,module,exports){
module.exports = create_text_node

function create_text_node(el) {
  var hook = this.templateString(el.textContent, this.batch.add(update))

  return hook ? [hook] : null

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

},{"./lib/arrow":16,"./lib/create":17,"./lib/filter":18,"./lib/lookup":19,"./lib/operators":20,"./lib/parens":21,"./lib/split":22,"./lib/types":23,"just-debounce":24}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

  return filter.call(this, this.split(parts[2], ',', null, null, true), change)
}

},{}],19:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYmF0Y2guanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvcGxhY2Vob2xkZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy90ZXh0LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3Mvd2l0aC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90ZW1wbGF0ZV9zdHJpbmcuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGV4dF9ub2RlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2luZGV4LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9hcnJvdy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvY3JlYXRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9maWx0ZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2xvb2t1cC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvb3BlcmF0b3JzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9wYXJlbnMuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL3NwbGl0LmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi90eXBlcy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9ub2RlX21vZHVsZXMvanVzdC1kZWJvdW5jZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciB0ZW1wbGF0ZV9zdHJpbmcgPSByZXF1aXJlKCcuL3RlbXBsYXRlX3N0cmluZycpXG4gICwgZWxlbWVudF9ub2RlID0gcmVxdWlyZSgnLi9lbGVtZW50X25vZGUnKVxuICAsIGFjY2Vzc29ycyA9IHJlcXVpcmUoJ2FsdHItYWNjZXNzb3JzJylcbiAgLCB0ZXh0X25vZGUgPSByZXF1aXJlKCcuL3RleHRfbm9kZScpXG4gICwgYmF0Y2ggPSByZXF1aXJlKCcuL2JhdGNoJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5hbHRyLmFkZFRhZyA9IGFkZF90YWdcbmFsdHIuaW5jbHVkZSA9IGluY2x1ZGUuYmluZChhbHRyLnByb3RvdHlwZSlcbmFsdHIuYWRkRmlsdGVyID0gYWRkX2ZpbHRlci5iaW5kKGFsdHIucHJvdG90eXBlKVxuXG5mdW5jdGlvbiBhbHRyKHJvb3QsIGRhdGEsIHN5bmMsIGRvYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBzeW5jLCBkb2MpXG4gIH1cblxuICB0aGlzLnJvb3QgPSByb290XG4gIHRoaXMuc3luYyA9IHN5bmNcbiAgdGhpcy5iYXRjaCA9IGJhdGNoKHN5bmMpXG4gIHRoaXMuZG9jdW1lbnQgPSBkb2MgfHwgZ2xvYmFsLmRvY3VtZW50XG4gIHRoaXMuZmlsdGVycyA9IE9iamVjdC5jcmVhdGUodGhpcy5maWx0ZXJzKVxuICB0aGlzLmluY2x1ZGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLmluY2x1ZGVzKVxuICB0aGlzLmFjY2Vzc29ycyA9IGFjY2Vzc29ycyh0aGlzLmZpbHRlcnMsIGZhbHNlKVxuXG4gIGlmKGdsb2JhbC5CdWZmZXIgJiYgcm9vdCBpbnN0YW5jZW9mIGdsb2JhbC5CdWZmZXIpIHtcbiAgICByb290ID0gcm9vdC50b1N0cmluZygpXG4gIH1cblxuICBpZih0eXBlb2Ygcm9vdCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgdGVtcCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gcm9vdFxuICAgIHRoaXMucm9vdCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG5cbiAgICB3aGlsZSh0ZW1wLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMucm9vdC5hcHBlbmRDaGlsZCh0ZW1wLmZpcnN0Q2hpbGQpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5fdXBkYXRlID0gdGhpcy51cGRhdGVOb2Rlcyh0aGlzLnJvb3ROb2RlcygpKVxuXG4gIGlmKGRhdGEpIHtcbiAgICB0aGlzLnVwZGF0ZShkYXRhKVxuICB9XG59XG5cbmFsdHIucHJvdG90eXBlLnRlbXBsYXRlU3RyaW5nID0gdGVtcGxhdGVfc3RyaW5nXG5hbHRyLnByb3RvdHlwZS5jcmVhdGVBY2Nlc3NvciA9IGNyZWF0ZV9hY2Nlc3NvclxuYWx0ci5wcm90b3R5cGUudXBkYXRlTm9kZXMgPSB1cGRhdGVfbm9kZXNcbmFsdHIucHJvdG90eXBlLmFkZEZpbHRlciA9IGFkZF9maWx0ZXJcbmFsdHIucHJvdG90eXBlLmluaXROb2RlcyA9IGluaXRfbm9kZXNcbmFsdHIucHJvdG90eXBlLnJvb3ROb2RlcyA9IHJvb3Rfbm9kZXNcbmFsdHIucHJvdG90eXBlLnRvU3RyaW5nID0gb3V0ZXJfaHRtbFxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIucHJvdG90eXBlLmluaXROb2RlID0gaW5pdF9ub2RlXG5hbHRyLnByb3RvdHlwZS5pbnRvID0gYXBwZW5kX3RvXG5hbHRyLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcblxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZXMgPSB7fVxuYWx0ci5wcm90b3R5cGUudGFnTGlzdCA9IFtdXG5hbHRyLnByb3RvdHlwZS5maWx0ZXJzID0ge31cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG52YXIgbm9kZV9oYW5kbGVycyA9IHt9XG5cbm5vZGVfaGFuZGxlcnNbMV0gPSBlbGVtZW50X25vZGVcbm5vZGVfaGFuZGxlcnNbM10gPSB0ZXh0X25vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgdGhpcy5fdXBkYXRlKGRhdGEpXG5cbiAgaWYodGhpcy5zeW5jKSB7XG4gICAgdGhpcy5iYXRjaC5ydW4oKVxuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZV9ub2Rlcyhub2Rlcykge1xuICB2YXIgaG9va3MgPSB0aGlzLmluaXROb2Rlcyhub2RlcylcbiAgICAsIHNlbGYgPSB0aGlzXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGhvb2tzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaG9va3NbaV0uY2FsbChzZWxmLCBkYXRhKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0X25vZGVzKG5vZGVzLCBsaXN0KSB7XG4gIHZhciBob29rcyA9IFtdLnNsaWNlLmNhbGwobm9kZXMpXG4gICAgLm1hcChpbml0X25vZGUuYmluZCh0aGlzKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLnJlZHVjZShmbGF0dGVuLCBbXSlcblxuICByZXR1cm4gaG9va3NcblxuICBmdW5jdGlvbiBmbGF0dGVuKGxocywgcmhzKSB7XG4gICAgcmV0dXJuIGxocy5jb25jYXQocmhzKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRfbm9kZShlbCkge1xuICByZXR1cm4gbm9kZV9oYW5kbGVyc1tlbC5ub2RlVHlwZV0gP1xuICAgIG5vZGVfaGFuZGxlcnNbZWwubm9kZVR5cGVdLmNhbGwodGhpcywgZWwpIDpcbiAgICBlbC5jaGlsZE5vZGVzICYmIGVsLmNoaWxkTm9kZXMubGVuZ3RoID9cbiAgICB0aGlzLmluaXROb2RlcyhlbC5jaGlsZE5vZGVzKSA6XG4gICAgbnVsbFxufVxuXG5mdW5jdGlvbiByb290X25vZGVzKCkge1xuICByZXR1cm4gdGhpcy5yb290Lm5vZGVUeXBlID09PSAxMSA/XG4gICAgW10uc2xpY2UuY2FsbCh0aGlzLnJvb3QuY2hpbGROb2RlcykgOlxuICAgIFt0aGlzLnJvb3RdXG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZmlsdGVyKSB7XG4gIGFsdHIucHJvdG90eXBlLmZpbHRlcnNbbmFtZV0gPSBmaWx0ZXJcbn1cblxuZnVuY3Rpb24gYWRkX3RhZyhhdHRyLCB0YWcpIHtcbiAgYWx0ci5wcm90b3R5cGUudGFnc1thdHRyXSA9IHRhZ1xuICBhbHRyLnByb3RvdHlwZS50YWdMaXN0LnB1c2goe1xuICAgICAgYXR0cjogYXR0clxuICAgICwgY29uc3RydWN0b3I6IHRhZ1xuICB9KVxufVxuXG5mdW5jdGlvbiBvdXRlcl9odG1sKCkge1xuICByZXR1cm4gdGhpcy5yb290Tm9kZXMoKS5tYXAoZnVuY3Rpb24obm9kZSkge1xuICAgIHJldHVybiBub2RlLm91dGVySFRNTFxuICB9KS5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBhcHBlbmRfdG8obm9kZSkge1xuICB2YXIgcm9vdF9ub2RlcyA9IHRoaXMucm9vdE5vZGVzKClcblxuICBmb3IodmFyIGkgPSAwLCBsID0gcm9vdF9ub2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBub2RlLmFwcGVuZENoaWxkKHJvb3Rfbm9kZXNbaV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5jbHVkZShuYW1lLCB0ZW1wbGF0ZSkge1xuICByZXR1cm4gdGhpcy5pbmNsdWRlc1tuYW1lXSA9IHRlbXBsYXRlXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9hY2Nlc3NvcihkZXNjcmlwdGlvbiwgY2hhbmdlKSB7XG4gIHJldHVybiB0aGlzLmFjY2Vzc29ycy5jcmVhdGUoZGVzY3JpcHRpb24sIGNoYW5nZSwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZm4pIHtcbiAgcmV0dXJuIHRoaXMuZmlsdGVyc1tuYW1lXSA9IGZuXG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSBCYXRjaFxuXG5mdW5jdGlvbiBCYXRjaChzeW5jKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIEJhdGNoKSkge1xuICAgIHJldHVybiBuZXcgQmF0Y2goc3luYylcbiAgfVxuXG4gIHRoaXMuam9icyA9IFtdXG4gIHRoaXMuc3luYyA9IHN5bmNcbiAgdGhpcy5mcmFtZSA9IG51bGxcbiAgdGhpcy5ydW4gPSB0aGlzLnJ1bi5iaW5kKHRoaXMpXG59XG5cbkJhdGNoLnByb3RvdHlwZS5yZXF1ZXN0X2ZyYW1lID0gcmVxdWVzdF9mcmFtZVxuQmF0Y2gucHJvdG90eXBlLnF1ZXVlID0gcXVldWVcbkJhdGNoLnByb3RvdHlwZS5hZGQgPSBhZGRcbkJhdGNoLnByb3RvdHlwZS5ydW4gPSBydW5cblxuZnVuY3Rpb24gYWRkKGZuKSB7XG4gIHZhciBxdWV1ZWQgPSBmYWxzZVxuICAgICwgYmF0Y2ggPSB0aGlzXG4gICAgLCBzZWxmXG4gICAgLCBhcmdzXG5cbiAgcmV0dXJuIHF1ZXVlXG5cbiAgZnVuY3Rpb24gcXVldWUoKSB7XG4gICAgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHNlbGYgPSB0aGlzXG5cbiAgICBpZighcXVldWVkKSB7XG4gICAgICBxdWV1ZWQgPSB0cnVlXG4gICAgICBiYXRjaC5xdWV1ZShydW4pXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcnVuKCkge1xuICAgIHF1ZXVlZCA9IGZhbHNlXG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWV1ZShmbikge1xuICB0aGlzLmpvYnMucHVzaChmbilcblxuICBpZighdGhpcy5zeW5jKSB7XG4gICAgdGhpcy5yZXF1ZXN0X2ZyYW1lKClcbiAgfVxufVxuXG5mdW5jdGlvbiBydW4oKSB7XG4gIHZhciBqb2JzID0gdGhpcy5qb2JzXG5cbiAgdGhpcy5qb2JzID0gW11cbiAgdGhpcy5mcmFtZSA9IG51bGxcblxuICBmb3IodmFyIGkgPSAwLCBsID0gam9icy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBqb2JzW2ldKClcbiAgfVxufVxuXG5mdW5jdGlvbiByZXF1ZXN0X2ZyYW1lKCkge1xuICBpZih0aGlzLmZyYW1lKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLmZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMucnVuKVxufVxuXG5mdW5jdGlvbiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgdmFyIHJhZiA9IGdsb2JhbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIHRpbWVvdXRcblxuICByZXR1cm4gcmFmKGNhbGxiYWNrKVxuXG4gIGZ1bmN0aW9uIHRpbWVvdXQoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKVxuICB9XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwuYWx0ciA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX2VsZW1lbnRfbm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVfZWxlbWVudF9ub2RlKGVsKSB7XG4gIHZhciBhbHRyX3RhZ3MgPSB7fVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGhvb2tzID0gW11cbiAgICAsIGF0dHJcblxuICB2YXIgYXR0cnMgPSBBcnJheS5wcm90b3R5cGUuZmlsdGVyLmNhbGwoZWwuYXR0cmlidXRlcywgZnVuY3Rpb24oYXR0cikge1xuICAgIHJldHVybiBhbHRyLnRhZ3NbYXR0ci5uYW1lXSA/XG4gICAgICAoYWx0cl90YWdzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlKSAmJiBmYWxzZSA6XG4gICAgICB0cnVlXG4gIH0pXG5cbiAgYXR0cnMuZm9yRWFjaChmdW5jdGlvbihhdHRyKSB7XG4gICAgdmFyIHZhbHVlID0gYXR0ci52YWx1ZVxuICAgICAgLCBuYW1lID0gYXR0ci5uYW1lXG5cbiAgICBpZighbmFtZS5pbmRleE9mKCdhbHRyLWF0dHItJykpIHtcbiAgICAgIG5hbWUgPSBhdHRyLm5hbWUuc2xpY2UoJ2FsdHItYXR0ci0nLmxlbmd0aClcbiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyLm5hbWUpXG4gICAgfVxuXG4gICAgdmFyIGF0dHJfaG9vayA9IGFsdHIudGVtcGxhdGVTdHJpbmcodmFsdWUsIGFsdHIuYmF0Y2guYWRkKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbClcbiAgICB9KSlcblxuICAgIGlmKGF0dHJfaG9vaykge1xuICAgICAgaG9va3MucHVzaChhdHRyX2hvb2spXG4gICAgfVxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhbHRyLnRhZ0xpc3QubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYXR0ciA9IGFsdHJfdGFnc1thbHRyLnRhZ0xpc3RbaV0uYXR0cl0pIHtcbiAgICAgIGhvb2tzLnB1c2goYWx0ci50YWdMaXN0W2ldLmNvbnN0cnVjdG9yLmNhbGwoYWx0ciwgZWwsIGF0dHIpKVxuXG4gICAgICByZXR1cm4gaG9va3NcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaG9va3MuY29uY2F0KGFsdHIuaW5pdE5vZGVzKGVsLmNoaWxkTm9kZXMpKVxufVxuIiwidmFyIHBsYWNlaG9sZGVyID0gcmVxdWlyZSgnLi90YWdzL3BsYWNlaG9sZGVyJylcbiAgLCBpbmNsdWRlX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9pbmNsdWRlJylcbiAgLCB0ZXh0X3RhZyA9IHJlcXVpcmUoJy4vdGFncy90ZXh0JylcbiAgLCBodG1sX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9odG1sJylcbiAgLCB3aXRoX3RhZyA9IHJlcXVpcmUoJy4vdGFncy93aXRoJylcbiAgLCBmb3JfdGFnID0gcmVxdWlyZSgnLi90YWdzL2ZvcicpXG4gICwgaWZfdGFnID0gcmVxdWlyZSgnLi90YWdzL2lmJylcbiAgLCBhbHRyID0gcmVxdWlyZSgnLi9hbHRyJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5cbmFsdHIuYWRkVGFnKCdhbHRyLXBsYWNlaG9sZGVyJywgcGxhY2Vob2xkZXIpXG5hbHRyLmFkZFRhZygnYWx0ci1pbmNsdWRlJywgaW5jbHVkZV90YWcpXG5hbHRyLmFkZFRhZygnYWx0ci10ZXh0JywgdGV4dF90YWcpXG5hbHRyLmFkZFRhZygnYWx0ci1odG1sJywgaHRtbF90YWcpXG5hbHRyLmFkZFRhZygnYWx0ci13aXRoJywgd2l0aF90YWcpXG5hbHRyLmFkZFRhZygnYWx0ci1mb3InLCBmb3JfdGFnKVxuYWx0ci5hZGRUYWcoJ2FsdHItaWYnLCBpZl90YWcpXG4iLCJ2YXIgZm9yX3JlZ2V4cCA9IC9eKC4qPylcXHMraW5cXHMrKC4qJCkvXG5cbm1vZHVsZS5leHBvcnRzID0gZm9yX2hhbmRsZXJcblxuZnVuY3Rpb24gZm9yX2hhbmRsZXIocm9vdCwgYXJncykge1xuICB2YXIgcGFydHMgPSBhcmdzLm1hdGNoKGZvcl9yZWdleHApXG4gICAgLCB0ZW1wbGF0ZSA9IHJvb3QuaW5uZXJIVE1MXG4gICAgLCBkb21fdXBkYXRlcyA9IFtdXG4gICAgLCBjaGlsZHJlbiA9IFtdXG4gICAgLCBhbHRyID0gdGhpc1xuICAgICwgaXRlbXMgPSBbXVxuXG4gIGlmKCFwYXJ0cykge1xuICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBmb3IgdGFnOiAnICsgYXJncylcbiAgfVxuXG4gIHJvb3QuaW5uZXJIVE1MID0gJydcblxuICB2YXIgdW5pcXVlID0gcGFydHNbMV0uc3BsaXQoJzonKVsxXVxuICAgICwgcHJvcCA9IHBhcnRzWzFdLnNwbGl0KCc6JylbMF1cbiAgICAsIGtleSA9IHBhcnRzWzJdXG5cbiAgdmFyIHJ1bl91cGRhdGVzID0gdGhpcy5iYXRjaC5hZGQocnVuX2RvbV91cGRhdGVzKVxuXG4gIHJldHVybiBhbHRyLmNyZWF0ZUFjY2Vzc29yKGtleSwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZV9jaGlsZHJlbihkYXRhKSB7XG4gICAgdmFyIGl0ZW1fZGF0YVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaXRlbV9kYXRhID0gT2JqZWN0LmNyZWF0ZShkYXRhKVxuICAgICAgaXRlbV9kYXRhW3Byb3BdID0gaXRlbXNbaV1cbiAgICAgIGl0ZW1fZGF0YVsnJGluZGV4J10gPSBpXG5cbiAgICAgIGNoaWxkcmVuW2ldLnVwZGF0ZSAmJiBjaGlsZHJlbltpXS51cGRhdGUoaXRlbV9kYXRhKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShuZXdfaXRlbXMsIGRhdGEpIHtcbiAgICBpZighQXJyYXkuaXNBcnJheShuZXdfaXRlbXMpKSB7XG4gICAgICBuZXdfaXRlbXMgPSBbXVxuICAgIH1cblxuICAgIHZhciBuZXdfY2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3X2l0ZW1zLmxlbmd0aClcbiAgICAgICwgcHJldiA9IHJvb3QuZmlyc3RDaGlsZFxuICAgICAgLCBvZmZzZXQgPSAwXG4gICAgICAsIGluZGV4XG4gICAgICAsIG5vZGVzXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbmV3X2l0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaW5kZXggPSBmaW5kX2luZGV4KGl0ZW1zLCBuZXdfaXRlbXNbaV0sIHVuaXF1ZSlcblxuICAgICAgaWYoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IChjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpWzBdKVxuICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXgsIDEpXG5cbiAgICAgICAgaWYoaW5kZXggKyBvZmZzZXQgIT09IGkpIHtcbiAgICAgICAgICBwbGFjZShuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzLCBwcmV2KVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdfY2hpbGRyZW5baV0gPSBtYWtlX2NoaWxkcmVuKClcbiAgICAgICAgcGxhY2UobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcywgcHJldilcbiAgICAgIH1cblxuICAgICAgKytvZmZzZXRcbiAgICAgIG5vZGVzID0gbmV3X2NoaWxkcmVuW2ldLmRvbV9ub2Rlc1xuICAgICAgcHJldiA9IG5vZGVzLmxlbmd0aCA/IG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdLm5leHRTaWJsaW5nIDogbnVsbFxuICAgICAgbm9kZXMgPSBub2Rlcy5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcylcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBkb21fdXBkYXRlcy5wdXNoKHtyZW1vdmU6IGNoaWxkcmVuW2ldLmRvbV9ub2Rlc30pXG4gICAgfVxuXG4gICAgY2hpbGRyZW4gPSBuZXdfY2hpbGRyZW4uc2xpY2UoKVxuICAgIGl0ZW1zID0gbmV3X2l0ZW1zLnNsaWNlKClcbiAgICBydW5fdXBkYXRlcygpXG4gICAgdXBkYXRlX2NoaWxkcmVuKGRhdGEpXG5cbiAgICBmdW5jdGlvbiBwbGFjZShub2RlcywgcHJldikge1xuICAgICAgZG9tX3VwZGF0ZXMucHVzaCh7XG4gICAgICAgICAgaW5zZXJ0OiBub2Rlc1xuICAgICAgICAsIGJlZm9yZTogcHJldlxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kX2luZGV4KGl0ZW1zLCBkLCB1bmlxdWUpIHtcbiAgICBpZighdW5pcXVlKSB7XG4gICAgICByZXR1cm4gaXRlbXMuaW5kZXhPZihkKVxuICAgIH1cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGlmKGl0ZW1zW2ldW3VuaXF1ZV0gPT09IGRbdW5pcXVlXSkge1xuICAgICAgICByZXR1cm4gaVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZV9jaGlsZHJlbigpIHtcbiAgICB2YXIgdGVtcCA9IGFsdHIuZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHJvb3QubmFtZXNwYWNlVVJJLCAnZGl2JylcbiAgICAgICwgZG9tX25vZGVzXG4gICAgICAsIHVwZGF0ZVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSB0ZW1wbGF0ZVxuXG4gICAgZG9tX25vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGVtcC5jaGlsZE5vZGVzKVxuICAgIHVwZGF0ZSA9IGFsdHIudXBkYXRlTm9kZXMoZG9tX25vZGVzKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZG9tX25vZGVzOiBkb21fbm9kZXNcbiAgICAgICwgdXBkYXRlOiB1cGRhdGVcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBydW5fZG9tX3VwZGF0ZXMoKSB7XG4gICAgdmFyIHVwZGF0ZVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGRvbV91cGRhdGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgdXBkYXRlID0gZG9tX3VwZGF0ZXNbaV1cblxuICAgICAgaWYodXBkYXRlLnJlbW92ZSkge1xuICAgICAgICBmb3IodmFyIGogPSAwLCBsMiA9IHVwZGF0ZS5yZW1vdmUubGVuZ3RoOyBqIDwgbDI7ICsraikge1xuICAgICAgICAgIHJvb3QucmVtb3ZlQ2hpbGQodXBkYXRlLnJlbW92ZVtqXSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZih1cGRhdGUuaW5zZXJ0KSB7XG4gICAgICAgIGZvcih2YXIgaiA9IDAsIGwyID0gdXBkYXRlLmluc2VydC5sZW5ndGg7IGogPCBsMjsgKytqKSB7XG4gICAgICAgICAgcm9vdC5pbnNlcnRCZWZvcmUodXBkYXRlLmluc2VydFtqXSwgdXBkYXRlLmJlZm9yZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGRvbV91cGRhdGVzID0gW11cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBodG1sXG5cbmZ1bmN0aW9uIGh0bWwoZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZUFjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC5pbm5lckhUTUwgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG5cbiAgICBpZihlbC5nZXRBdHRyaWJ1dGUoJ2FsdHItcnVuLXNjcmlwdHMnKSkge1xuICAgICAgW10uZm9yRWFjaC5jYWxsKGVsLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgcnVuKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBydW4oc2NyaXB0KSB7XG4gIHZhciBmaXhlZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgLCBwYXJlbnQgPSBzY3JpcHQucGFyZW50Tm9kZVxuICAgICwgYXR0cnMgPSBzY3JpcHQuYXR0cmlidXRlc1xuICAgICwgc3JjXG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IGF0dHJzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGZpeGVkLnNldEF0dHJpYnV0ZShhdHRyc1tpXS5uYW1lLCBhdHRyc1tpXS52YWx1ZSlcbiAgfVxuXG4gIGZpeGVkLnRleHRDb250ZW50ID0gc2NyaXB0LnRleHRDb250ZW50XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoZml4ZWQsIHNjcmlwdClcbiAgcGFyZW50LnJlbW92ZUNoaWxkKHNjcmlwdClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaWZfdGFnXG5cbmZ1bmN0aW9uIGlmX3RhZyhlbCwgYWNjZXNzb3IpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgICAsIHVwZGF0ZV9jaGlsZHJlbiA9IHRoaXMudXBkYXRlTm9kZXMoZWwuY2hpbGROb2RlcylcbiAgICAsIHBhcmVudCA9IGVsLnBhcmVudE5vZGVcbiAgICAsIGhpZGRlbiA9IG51bGxcblxuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCBlbC5uZXh0U2libGluZylcblxuICB2YXIgaGlkZSA9IHRoaXMuYmF0Y2guYWRkKGZ1bmN0aW9uKCkge1xuICAgIGlmKCFoaWRkZW4pIHtcbiAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChlbClcbiAgICAgIGhpZGRlbiA9IHRydWVcbiAgICB9XG4gIH0pXG5cbiAgdmFyIHNob3cgPSB0aGlzLmJhdGNoLmFkZChmdW5jdGlvbigpIHtcbiAgICBpZihoaWRkZW4pIHtcbiAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoZWwsIHBsYWNlaG9sZGVyKVxuICAgICAgaGlkZGVuID0gZmFsc2VcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlQWNjZXNzb3IoYWNjZXNzb3IsIHRvZ2dsZSlcblxuICBmdW5jdGlvbiB0b2dnbGUodmFsLCBkYXRhKSB7XG4gICAgaWYoIXZhbCkge1xuICAgICAgcmV0dXJuIGhpZGUoKVxuICAgIH1cblxuICAgIHNob3coKVxuICAgIHVwZGF0ZV9jaGlsZHJlbihkYXRhKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluY2x1ZGVcblxuZnVuY3Rpb24gaW5jbHVkZShlbCwgbmFtZSkge1xuICBlbC5pbm5lckhUTUwgPSB0aGlzLmluY2x1ZGVzW25hbWVdXG5cbiAgcmV0dXJuIHRoaXMudXBkYXRlTm9kZXMoZWwuY2hpbGROb2Rlcylcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcGxhY2Vob2xkZXJcblxuZnVuY3Rpb24gcGxhY2Vob2xkZXIoZWwsIGFjY2Vzc29yKSB7XG4gIHZhciBwYXJlbnQgPSBlbC5wYXJlbnROb2RlXG5cbiAgcmV0dXJuIHRoaXMuYmF0Y2guYWRkKHRoaXMuY3JlYXRlQWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGlmKCF2YWwubm9kZU5hbWUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHBhcmVudC5pbnNlcnRCZWZvcmUodmFsLCBlbClcbiAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpXG4gICAgZWwgPSB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZXh0XG5cbmZ1bmN0aW9uIHRleHQoZWwsIGFjY2Vzc29yKSB7XG4gIHJldHVybiB0aGlzLmJhdGNoLmFkZCh0aGlzLmNyZWF0ZUFjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3aXRoX3RhZ1xuXG5mdW5jdGlvbiB3aXRoX3RhZyhlbCwgYWNjZXNzb3IpIHtcbiAgcmV0dXJuIHRoaXMuY3JlYXRlQWNjZXNzb3IoYWNjZXNzb3IsIHRoaXMudXBkYXRlTm9kZXMoZWwuY2hpbGROb2RlcykpXG59XG4iLCJ2YXIgVEFHID0gL3t7XFxzKiguKj8pXFxzKn19L1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlX3N0cmluZ1xuXG5mdW5jdGlvbiB0ZW1wbGF0ZV9zdHJpbmcodGVtcGxhdGUsIGNoYW5nZSkge1xuICBpZighdGVtcGxhdGUubWF0Y2goVEFHKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRlbXBsYXRlXG4gICAgLCBwYXJ0cyA9IFtdXG4gICAgLCBob29rcyA9IFtdXG4gICAgLCB0aW1lclxuICAgICwgaW5kZXhcbiAgICAsIG5leHRcblxuICB3aGlsZShyZW1haW5pbmcgJiYgKG5leHQgPSByZW1haW5pbmcubWF0Y2goVEFHKSkpIHtcbiAgICBpZihpbmRleCA9IHJlbWFpbmluZy5pbmRleE9mKG5leHRbMF0pKSB7XG4gICAgICBwYXJ0cy5wdXNoKHJlbWFpbmluZy5zbGljZSgwLCBpbmRleCkpXG4gICAgfVxuXG4gICAgcGFydHMucHVzaCgnJylcbiAgICByZW1haW5pbmcgPSByZW1haW5pbmcuc2xpY2UoaW5kZXggKyBuZXh0WzBdLmxlbmd0aClcbiAgICBob29rcy5wdXNoKFxuICAgICAgICB0aGlzLmNyZWF0ZUFjY2Vzc29yKG5leHRbMV0sIHNldF9wYXJ0LmJpbmQodGhpcywgcGFydHMubGVuZ3RoIC0gMSkpXG4gICAgKVxuICB9XG5cbiAgcGFydHMucHVzaChyZW1haW5pbmcpXG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHNldF9wYXJ0KGlkeCwgdmFsKSB7XG4gICAgcGFydHNbaWR4XSA9IHZhbFxuICAgIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICBob29rKGRhdGEpXG4gICAgfSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXh0X25vZGUoZWwpIHtcbiAgdmFyIGhvb2sgPSB0aGlzLnRlbXBsYXRlU3RyaW5nKGVsLnRleHRDb250ZW50LCB0aGlzLmJhdGNoLmFkZCh1cGRhdGUpKVxuXG4gIHJldHVybiBob29rID8gW2hvb2tdIDogbnVsbFxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHZhbFxuICB9XG59XG4iLCJ2YXIgYWRkX29wZXJhdG9ycyA9IHJlcXVpcmUoJy4vbGliL29wZXJhdG9ycycpXG4gICwgY3JlYXRlX2FjY2Vzb3IgPSByZXF1aXJlKCcuL2xpYi9jcmVhdGUnKVxuICAsIGFkZF9sb29rdXAgPSByZXF1aXJlKCcuL2xpYi9sb29rdXAnKVxuICAsIGFkZF9maWx0ZXIgPSByZXF1aXJlKCcuL2xpYi9maWx0ZXInKVxuICAsIGFkZF9wYXJlbnMgPSByZXF1aXJlKCcuL2xpYi9wYXJlbnMnKVxuICAsIGRlYm91bmNlID0gcmVxdWlyZSgnanVzdC1kZWJvdW5jZScpXG4gICwgYWRkX3R5cGVzID0gcmVxdWlyZSgnLi9saWIvdHlwZXMnKVxuICAsIGFkZF9hcnJvdyA9IHJlcXVpcmUoJy4vbGliL2Fycm93JylcbiAgLCBzcGxpdCA9IHJlcXVpcmUoJy4vbGliL3NwbGl0JylcbiAgLCB0eXBlcyA9IFtdXG5cbm1vZHVsZS5leHBvcnRzID0gYWNjZXNzb3JzXG5cbi8vIG9yZGVyIGlzIGltcG9ydGFudFxuYWRkX3R5cGVzKHR5cGVzKVxuYWRkX2Fycm93KHR5cGVzKVxuYWRkX2ZpbHRlcih0eXBlcylcbmFkZF9wYXJlbnModHlwZXMpXG5hZGRfb3BlcmF0b3JzKHR5cGVzKVxuYWRkX2xvb2t1cCh0eXBlcylcblxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGVfcGFydCA9IGNyZWF0ZV9hY2Nlc29yXG5hY2Nlc3NvcnMucHJvdG90eXBlLmFkZF9maWx0ZXIgPSBhZGRfZmlsdGVyXG5hY2Nlc3NvcnMucHJvdG90eXBlLmNyZWF0ZSA9IGNyZWF0ZVxuYWNjZXNzb3JzLnByb3RvdHlwZS50eXBlcyA9IHR5cGVzXG5hY2Nlc3NvcnMucHJvdG90eXBlLnNwbGl0ID0gc3BsaXRcblxuZnVuY3Rpb24gYWNjZXNzb3JzKGZpbHRlcnMsIGRlbGF5KSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIGFjY2Vzc29ycykpIHtcbiAgICByZXR1cm4gbmV3IGFjY2Vzc29ycyhmaWx0ZXJzLCBkZWxheSlcbiAgfVxuXG4gIGlmKCFkZWxheSAmJiBkZWxheSAhPT0gZmFsc2UpIHtcbiAgICBkZWxheSA9IDBcbiAgfVxuXG4gIHRoaXMuZGVsYXkgPSBkZWxheVxuICB0aGlzLmZpbHRlcnMgPSBmaWx0ZXJzIHx8IHt9XG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZm4pIHtcbiAgdGhpcy5maWx0ZXJzW25hbWVdID0gZm5cbn1cblxuZnVuY3Rpb24gY3JlYXRlKHN0ciwgY2hhbmdlLCBhbGwpIHtcbiAgdmFyIHBhcnQgPSB0aGlzLmNyZWF0ZV9wYXJ0KFxuICAgICAgc3RyXG4gICAgLCB0aGlzLmRlbGF5ID09PSBmYWxzZSA/IHVwZGF0ZSA6IGRlYm91bmNlKGNoYW5nZSwgdGhpcy5kZWxheSwgZmFsc2UsIHRydWUpXG4gIClcblxuICB2YXIgc3luYyA9IGZhbHNlXG4gICAgLCBwcmV2ID0ge31cbiAgICAsIG91dFxuXG4gIHJldHVybiB3cml0ZVxuXG4gIGZ1bmN0aW9uIHdyaXRlKGRhdGEpIHtcbiAgICBzeW5jID0gdHJ1ZVxuICAgIG91dCA9IG51bGxcbiAgICBwYXJ0KGRhdGEpXG4gICAgc3luYyA9IGZhbHNlXG5cbiAgICBpZihvdXQpIHtcbiAgICAgIGNoYW5nZS5hcHBseShudWxsLCBvdXQpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgY3R4KSB7XG4gICAgaWYoIWFsbCAmJiB0eXBlb2YgdmFsICE9PSAnb2JqZWN0JyAmJiB2YWwgPT09IHByZXYpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIG91dCA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHByZXYgPSB2YWxcblxuICAgIGlmKCFzeW5jKSB7XG4gICAgICBjaGFuZ2UuYXBwbHkobnVsbCwgb3V0KVxuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhZGRfYXJyb3dcblxuZnVuY3Rpb24gYWRkX2Fycm93KHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX2Fycm93KVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYXJyb3cocGFydHMsIGNoYW5nZSkge1xuICBwYXJ0cyA9IHRoaXMuc3BsaXQocGFydHMsICctPicpXG5cbiAgaWYocGFydHMubGVuZ3RoIDwgMikge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJpZ2h0ID0gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1sxXSwgY2hhbmdlKVxuICAgICwgbGVmdCA9IHRoaXMuY3JlYXRlX3BhcnQocGFydHNbMF0sIHVwZGF0ZSlcblxuICByZXR1cm4gbGVmdFxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGN0eCkge1xuICAgIHJpZ2h0KHZhbCwgY3R4KVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yXG5cbmZ1bmN0aW9uIGFjY2Vzc29yKGtleSwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0ID0gYnVpbGRfcGFydC5jYWxsKHRoaXMsIGtleSwgZmluaXNoKVxuICAgICwgY29udGV4dFxuXG4gIHJldHVybiBjYWxsLmJpbmQodGhpcylcblxuICBmdW5jdGlvbiBjYWxsKHZhbCwgY3R4KSB7XG4gICAgcGFydCh2YWwsIGNvbnRleHQgPSBjdHggfHwgdmFsKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluaXNoKHZhbCkge1xuICAgIGNoYW5nZS5jYWxsKHRoaXMsIHZhbCwgY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZF9wYXJ0KHBhcnQsIGNoYW5nZSkge1xuICB2YXIgYWNjZXNzb3JcblxuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy50eXBlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihhY2Nlc3NvciA9IHRoaXMudHlwZXNbaV0uY2FsbCh0aGlzLCBwYXJ0LCBjaGFuZ2UpKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3JcbiAgICB9XG4gIH1cbn1cbiIsInZhciBmaWx0ZXJfcmVnZXhwID0gL15cXHMqKFteXFxzKF0rKVxcKCguKilcXClcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfZmlsdGVyXG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIodHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfZmlsdGVyKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfZmlsdGVyKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKGZpbHRlcl9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGZpbHRlciA9IHRoaXMuZmlsdGVyc1twYXJ0c1sxXV1cblxuICBpZighZmlsdGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgZmluZCBmaWx0ZXI6ICcgKyBwYXJ0c1sxXSlcbiAgfVxuXG4gIHJldHVybiBmaWx0ZXIuY2FsbCh0aGlzLCB0aGlzLnNwbGl0KHBhcnRzWzJdLCAnLCcsIG51bGwsIG51bGwsIHRydWUpLCBjaGFuZ2UpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFkZF9sb29rdXBcblxuZnVuY3Rpb24gYWRkX2xvb2t1cCh0eXBlcykge1xuICB0eXBlcy5wdXNoKGNyZWF0ZV9sb29rdXApXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9sb29rdXAocGF0aCwgY2hhbmdlKSB7XG4gIGlmKCFwYXRoLmluZGV4T2YoJyRkYXRhJykpIHtcbiAgICBwYXRoID0gcGF0aC5zbGljZSgnJGRhdGEuJy5sZW5ndGgpXG5cbiAgICBpZighcGF0aCkge1xuICAgICAgcmV0dXJuIGNoYW5nZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBsb29rdXAocGF0aC5tYXRjaCgvXFxzKiguKlteXFxzXSlcXHMqLylbMV0sIGNoYW5nZSlcbn1cblxuZnVuY3Rpb24gbG9va3VwKHBhdGgsIGRvbmUpIHtcbiAgdmFyIHBhcnRzID0gcGF0aCA/IHBhdGguc3BsaXQoJy4nKSA6IFtdXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHNlYXJjaChvYmosIGN0eCkge1xuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IG9iaiAmJiBpIDwgbDsgKytpKSB7XG4gICAgICBvYmogPSBvYmpbcGFydHNbaV1dXG4gICAgfVxuXG4gICAgaWYodHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcgJiYgY3R4KSB7XG4gICAgICByZXR1cm4gc2VhcmNoKGN0eClcbiAgICB9XG5cbiAgICBpZihpID09PSBsKSB7XG4gICAgICByZXR1cm4gZG9uZShvYmopXG4gICAgfVxuXG4gICAgZG9uZSgpXG4gIH1cbn1cbiIsInZhciB0ZXJuYXJ5X3JlZ2V4cCA9IC9eXFxzKiguKz8pXFxzKlxcPyguKilcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfb3BlcmF0b3JzXG5cbmZ1bmN0aW9uIGFkZF9vcGVyYXRvcnModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfdGVybmFyeSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyd8XFxcXHwnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnJiYnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfCddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWydeJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPT09JywgJyE9PScsICc9PScsICchPSddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyc+PScsICc8PScsICc+JywgJzwnLCAnIGluICcsICcgaW5zdGFuY2VvZiAnXSkpXG4gIC8vIHR5cGVzLnB1c2goYmluYXJ5KFsnPDwnLCAnPj4nLCAnPj4+J10pKSAvL2NvbmZsaWNzIHdpdGggPCBhbmQgPlxuICB0eXBlcy5wdXNoKGJpbmFyeShbJysnLCAnLSddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycqJywgJy8nLCAnJSddKSlcbiAgdHlwZXMucHVzaCh1bmFyeShbJyEnLCAnKycsICctJywgJ34nXSkpXG59XG5cbmZ1bmN0aW9uIGJpbmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKiguKz8pXFxcXHNcXCooXFxcXCcgK1xuICAgICAgbGlzdC5qb2luKCd8XFxcXCcpICtcbiAgICAgICcpXFxcXHMqKC4rPylcXFxccyokJ1xuICApXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHBhcnRzLCBjaGFuZ2UpIHtcbiAgICByZXR1cm4gY3JlYXRlX2JpbmFyeS5jYWxsKHRoaXMsIHJlZ2V4LCBwYXJ0cywgY2hhbmdlKVxuICB9XG59XG5cbmZ1bmN0aW9uIHVuYXJ5KGxpc3QpIHtcbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgICAgICdeXFxcXHMqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV91bmFyeS5jYWxsKHRoaXMsIHJlZ2V4LCBwYXJ0cywgY2hhbmdlKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXJuYXJ5KHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHRlcm5hcnlfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjb25kaXRpb24gPSBwYXJ0c1sxXVxuICAgICwgcmVzdCA9IHBhcnRzWzJdXG4gICAgLCBjb3VudCA9IDFcblxuICByZXN0ID0gdGhpcy5zcGxpdChyZXN0LCAnOicsIFsnPyddLCBbJzonXSlcblxuICBpZihyZXN0Lmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIHRlcm5hcnk6ICcgKyBwYXJ0c1swXSlcbiAgfVxuXG4gIHZhciBub3QgPSB0aGlzLmNyZWF0ZV9wYXJ0KHJlc3RbMV0sIGNoYW5nZSlcbiAgICAsIG9rID0gdGhpcy5jcmVhdGVfcGFydChyZXN0WzBdLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIHRoaXMuY3JlYXRlX3BhcnQoY29uZGl0aW9uLCB1cGRhdGUpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgY29udGV4dCkge1xuICAgIHJldHVybiB2YWwgPyBvayhjb250ZXh0KSA6IG5vdChjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9iaW5hcnkocmVnZXgsIHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHJlZ2V4KSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjaGVja19saHMgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzFdLCB1cGRhdGUuYmluZChudWxsLCBmYWxzZSkpXG4gICAgLCBjaGVja19yaHMgPSB0aGlzLmNyZWF0ZV9wYXJ0KHBhcnRzWzNdLCB1cGRhdGUuYmluZChudWxsLCB0cnVlKSlcbiAgICAsIGxoc1xuICAgICwgcmhzXG5cbiAgdmFyIGNoYW5nZWQgPSBGdW5jdGlvbihcbiAgICAgICdjaGFuZ2UsIGxocywgcmhzJ1xuICAgICwgJ3JldHVybiBjaGFuZ2UobGhzICcgKyBwYXJ0c1syXSArICcgcmhzKSdcbiAgKS5iaW5kKG51bGwsIGNoYW5nZSlcblxuICByZXR1cm4gb25fZGF0YVxuXG4gIGZ1bmN0aW9uIG9uX2RhdGEoZGF0YSwgY3R4KSB7XG4gICAgY2hlY2tfbGhzKGRhdGEsIGN0eClcbiAgICBjaGVja19yaHMoZGF0YSwgY3R4KVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGlzX3JocywgdmFsKSB7XG4gICAgaXNfcmhzID8gcmhzID0gdmFsIDogbGhzID0gdmFsXG4gICAgY2hhbmdlZChsaHMsIHJocylcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfdW5hcnkocmVnZXgsIHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHJlZ2V4KSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCB2YWwnXG4gICAgLCAncmV0dXJuIGNoYW5nZSgnICsgcGFydHNbMV0gKyAndmFsKSdcbiAgKS5iaW5kKG51bGwsIGNoYW5nZSlcblxuICByZXR1cm4gdGhpcy5jcmVhdGVfcGFydChwYXJ0c1syXSwgY2hhbmdlZClcbn1cbiIsInZhciBwYXJlbnNfcmVnZXhwID0gL15cXHMqXFwoKC4qKSQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWRkX3BhcmVuc1xuXG5mdW5jdGlvbiBhZGRfcGFyZW5zKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3BhcmVucylcbn1cblxuZnVuY3Rpb24gY3JlYXRlX3BhcmVucyhwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChwYXJlbnNfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBib2R5ID0gcGFydHNbMV1cbiAgICAsIGNvdW50ID0gMVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBib2R5Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmKGJvZHlbaV0gPT09ICcpJykge1xuICAgICAgLS1jb3VudFxuICAgIH0gZWxzZSBpZihib2R5W2ldID09PSAnKCcpIHtcbiAgICAgICsrY291bnRcbiAgICB9XG5cbiAgICBpZighY291bnQpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYoIWkgfHwgaSA9PT0gbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5tYXRjaGVkIHRlcm5hcnk6ICcgKyBwYXJ0c1swXSlcbiAgfVxuXG4gIHZhciBjb250ZW50ID0gIHRoaXMuY3JlYXRlX3BhcnQoYm9keS5zbGljZSgwLCBpKSwgdXBkYXRlKVxuICAgICwga2V5ID0gJ3BhcmVuXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyKVxuXG4gIHZhciB0ZW1wbGF0ZSA9IHRoaXMuY3JlYXRlX3BhcnQoa2V5ICsgYm9keS5zbGljZShpICsgMSksIGNoYW5nZSlcblxuICByZXR1cm4gY29udGVudFxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICBjb250ZXh0ID0gT2JqZWN0LmNyZWF0ZShjb250ZXh0KVxuICAgIGNvbnRleHRba2V5XSA9IHZhbFxuICAgIHRlbXBsYXRlKGNvbnRleHQpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gc3BsaXRcblxuZnVuY3Rpb24gc3BsaXQocGFydHMsIGtleSwgb3BlbnMsIGNsb3NlcywgYWxsKSB7XG4gIHZhciBhbGxfY2xvc2VzID0gWycpJywgJ30nLCAnXSddXG4gICAgLCBhbGxfb3BlbnMgPSBbJygnLCAneycsICdbJ11cbiAgICAsIHN1bSA9IDBcbiAgICAsIHNwbGl0X3BvaW50XG4gICAgLCBpbmRleFxuXG4gIGlmKG9wZW5zKSB7XG4gICAgYWxsX29wZW5zID0gYWxsX29wZW5zLmNvbmNhdChvcGVucylcbiAgfVxuXG4gIGlmKGNsb3Nlcykge1xuICAgIGFsbF9jbG9zZXMgPSBhbGxfY2xvc2VzLmNvbmNhdChjbG9zZXMpXG4gIH1cblxuICB2YXIgY291bnRzID0gYWxsX29wZW5zLm1hcChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMFxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZighc3VtICYmIChzcGxpdF9wb2ludCA9IHBhcnRzLnNsaWNlKGkpLmluZGV4T2Yoa2V5KSkgPT09IC0xKSB7XG4gICAgICByZXR1cm4gW3BhcnRzXVxuICAgIH1cblxuICAgIGlmKCFzdW0gJiYgIXNwbGl0X3BvaW50KSB7XG4gICAgICBicmVha1xuICAgIH1cblxuICAgIGlmKChpbmRleCA9IGFsbF9vcGVucy5pbmRleE9mKHBhcnRzW2ldKSkgIT09IC0xKSB7XG4gICAgICArK2NvdW50c1tpbmRleF1cbiAgICAgICsrc3VtXG4gICAgfSBlbHNlIGlmKChpbmRleCA9IGFsbF9jbG9zZXMuaW5kZXhPZihwYXJ0c1tpXSkpICE9PSAtMSkge1xuICAgICAgLS1jb3VudHNbaW5kZXhdXG4gICAgICAtLXN1bVxuICAgIH1cblxuICAgIGZvcih2YXIgaiA9IDA7IGogPCBjb3VudHMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmKGNvdW50c1tqXSA8IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgXCInICsgYWxsX29wZW5zW2pdICsgJ1wiXCIgaW4gJyArIHBhcnRzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKHN1bSB8fCBpID09PSBwYXJ0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gW3BhcnRzXVxuICB9XG5cbiAgdmFyIHJpZ2h0ID0gcGFydHMuc2xpY2UoaSArIGtleS5sZW5ndGgpXG4gICAgLCBsZWZ0ID0gcGFydHMuc2xpY2UoMCwgaSlcblxuICBpZighYWxsKSB7XG4gICAgcmV0dXJuIFtsZWZ0LCByaWdodF1cbiAgfVxuXG4gIHJldHVybiBbbGVmdF0uY29uY2F0KHNwbGl0KHJpZ2h0LCBrZXksIG9wZW5zLCBjbG9zZXMsIGFsbCkpXG59XG4iLCJ2YXIgc3RyaW5nX3JlZ2V4cCA9IC9eXFxzKig/OicoKD86W14nXFxcXF18KD86XFxcXC4pKSopJ3xcIigoPzpbXlwiXFxcXF18KD86XFxcXC4pKSopXCIpXFxzKiQvXG4gICwgbnVtYmVyX3JlZ2V4cCA9IC9eXFxzKihcXGQqKD86XFwuXFxkKyk/KVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZF90eXBlc1xuXG5mdW5jdGlvbiBhZGRfdHlwZXModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKVxuICB0eXBlcy5wdXNoKGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9zdHJpbmdfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2goc3RyaW5nX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKHBhcnRzWzFdIHx8IHBhcnRzWzJdKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IocGFydHMsIGNoYW5nZSkge1xuICBpZighKHBhcnRzID0gcGFydHMubWF0Y2gobnVtYmVyX3JlZ2V4cCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2hhbmdlKCtwYXJ0c1sxXSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZVxuXG5mdW5jdGlvbiBkZWJvdW5jZShmbiwgZGVsYXksIGF0X3N0YXJ0LCBndWFyYW50ZWUpIHtcbiAgdmFyIHRpbWVvdXRcbiAgICAsIGFyZ3NcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuXG4gICAgaWYodGltZW91dCAmJiAoYXRfc3RhcnQgfHwgZ3VhcmFudGVlKSkge1xuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIGlmKCFhdF9zdGFydCkge1xuICAgICAgY2xlYXIoKVxuXG4gICAgICByZXR1cm4gdGltZW91dCA9IHNldFRpbWVvdXQocnVuLCBkZWxheSlcbiAgICB9XG5cbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhciwgZGVsYXkpXG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncylcblxuICAgIGZ1bmN0aW9uIHJ1bigpIHtcbiAgICAgIGNsZWFyKClcbiAgICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dClcbiAgICAgIHRpbWVvdXQgPSBudWxsXG4gICAgfVxuICB9XG59XG4iXX0=
