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
  , add_types = require('./lib/types')
  , debounce = require('debounce')
  , types = []

module.exports = accessors

// order is important
add_operators(types)
add_filter(types)
add_types(types)
add_lookup(types)

accessors.prototype._create = create_accesor
accessors.prototype.add_filter = add_filter
accessors.prototype.create = create
accessors.prototype.types = types

function accessors(filters, debounce) {
  if(!(this instanceof accessors)) {
    return new accessors(filters, debounce)
  }

  if(!debounce && debounce !== false) {
    debounce = 0
  }

  this.debounce = debounce
  this.filters = filters || {}
}

function add_filter(name, fn) {
  this.filters[name] = fn
}

function create(str, change) {
  return this._create(
      str
    , this.debounce === false ? change : debounce(change, this.debounce)
  )
}

},{"./lib/create":15,"./lib/filter":16,"./lib/lookup":17,"./lib/operators":18,"./lib/types":19,"debounce":20}],15:[function(require,module,exports){
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
var filter_regexp = /^\s*([^(]+)\((.*)\)\s*$/

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

  var not = this._create(rest.slice(i + 1), change)
    , ok = this._create(rest.slice(0, i), change)

  return this._create(condition, update)

  function update(val, context) {
    return val ? ok(context) : not(context)
  }
}

function create_binary(regex, parts, change) {
  if(!(parts = parts.match(regex))) {
    return
  }

  var check_lhs = this._create(parts[1], update.bind(null, false))
    , check_rhs = this._create(parts[3], update.bind(null, true))
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

  return this._create(parts[2], changed)
}

},{}],19:[function(require,module,exports){
var string_regexp = /^\s*(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")\s*/
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

},{}],20:[function(require,module,exports){
/**
 * Debounces a function by the given threshold.
 *
 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
 * @param {Function} function to wrap
 * @param {Number} timeout in ms (`100`)
 * @param {Boolean} whether to execute at the beginning (`false`)
 * @api public
 */

module.exports = function debounce(func, threshold, execAsap){
  var timeout;

  return function debounced(){
    var obj = this, args = arguments;

    function delayed () {
      if (!execAsap) {
        func.apply(obj, args);
      }
      timeout = null;
    }

    if (timeout) {
      clearTimeout(timeout);
    } else if (execAsap) {
      func.apply(obj, args);
    }

    timeout = setTimeout(delayed, threshold || 100);
  };
};

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZmlsdGVycy9hZGQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9mb3IuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9odG1sLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaWYuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy9pbmNsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvdGV4dC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3dpdGguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGVtcGxhdGVfc3RyaW5nLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RleHRfbm9kZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9pbmRleC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvY3JlYXRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi9maWx0ZXIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYWx0ci1hY2Nlc3NvcnMvbGliL2xvb2t1cC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9hbHRyLWFjY2Vzc29ycy9saWIvb3BlcmF0b3JzLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbm9kZV9tb2R1bGVzL2FsdHItYWNjZXNzb3JzL2xpYi90eXBlcy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL25vZGVfbW9kdWxlcy9kZWJvdW5jZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIHRlbXBsYXRlX3N0cmluZyA9IHJlcXVpcmUoJy4vdGVtcGxhdGVfc3RyaW5nJylcbiAgLCBlbGVtZW50X25vZGUgPSByZXF1aXJlKCcuL2VsZW1lbnRfbm9kZScpXG4gICwgYWNjZXNzb3JzID0gcmVxdWlyZSgnYWx0ci1hY2Nlc3NvcnMnKVxuICAsIHRleHRfbm9kZSA9IHJlcXVpcmUoJy4vdGV4dF9ub2RlJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHRyXG5hbHRyLmFkZF90YWcgPSBhZGRfdGFnXG5hbHRyLmluY2x1ZGUgPSBpbmNsdWRlLmJpbmQoYWx0ci5wcm90b3R5cGUpXG5hbHRyLmFkZF9maWx0ZXIgPSBhZGRfZmlsdGVyLmJpbmQoYWx0ci5wcm90b3R5cGUpXG5cbmZ1bmN0aW9uIGFsdHIocm9vdCwgZGF0YSwgZGVib3VuY2UsIGRvYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBkZWJvdW5jZSwgZG9jKVxuICB9XG5cbiAgdGhpcy5yb290ID0gcm9vdFxuICB0aGlzLmRvY3VtZW50ID0gZG9jIHx8IGdsb2JhbC5kb2N1bWVudFxuICB0aGlzLmZpbHRlcnMgPSBPYmplY3QuY3JlYXRlKHRoaXMuZmlsdGVycylcbiAgdGhpcy5pbmNsdWRlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5pbmNsdWRlcylcbiAgdGhpcy5kZWJvdW5jZSA9IGRlYm91bmNlID09PSBmYWxzZSA/IGZhbHNlIDogZGVib3VuY2UgfHwgMFxuICB0aGlzLmFjY2Vzc29ycyA9IGFjY2Vzc29ycyh0aGlzLmZpbHRlcnMsIGRlYm91bmNlKVxuXG4gIGlmKGdsb2JhbC5CdWZmZXIgJiYgcm9vdCBpbnN0YW5jZW9mIGdsb2JhbC5CdWZmZXIpIHtcbiAgICByb290ID0gcm9vdC50b1N0cmluZygpXG4gIH1cblxuICBpZih0eXBlb2Ygcm9vdCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgdGVtcCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gcm9vdFxuICAgIHRoaXMucm9vdCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG5cbiAgICB3aGlsZSh0ZW1wLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMucm9vdC5hcHBlbmRDaGlsZCh0ZW1wLmZpcnN0Q2hpbGQpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5yb290X25vZGVzID0gdGhpcy5yb290Lm5vZGVUeXBlID09PSAxMSA/XG4gICAgW10uc2xpY2UuY2FsbCh0aGlzLnJvb3QuY2hpbGROb2RlcykgOiBbdGhpcy5yb290XVxuXG4gIHRoaXMudHJlZSA9IHRoaXMuY3JlYXRlX25vZGUoe2NoaWxkTm9kZXM6IHRoaXMucm9vdF9ub2Rlc30pXG5cbiAgaWYoZGF0YSkge1xuICAgIHRoaXMudXBkYXRlKGRhdGEpXG4gIH1cbn1cblxuYWx0ci5wcm90b3R5cGUudGVtcGxhdGVfc3RyaW5nID0gdGVtcGxhdGVfc3RyaW5nXG5hbHRyLnByb3RvdHlwZS5jcmVhdGVfYWNjZXNzb3IgPSBjcmVhdGVfYWNjZXNzb3JcbmFsdHIucHJvdG90eXBlLnVwZGF0ZV9jaGlsZHJlbiA9IHVwZGF0ZV9jaGlsZHJlblxuYWx0ci5wcm90b3R5cGUuY3JlYXRlX25vZGUgPSBjcmVhdGVfbm9kZVxuYWx0ci5wcm90b3R5cGUuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXJcbmFsdHIucHJvdG90eXBlLnRvU3RyaW5nID0gb3V0ZXJfaHRtbFxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIucHJvdG90eXBlLmludG8gPSBhcHBlbmRfdG9cbmFsdHIucHJvdG90eXBlLnVwZGF0ZSA9IHVwZGF0ZVxuXG5hbHRyLnByb3RvdHlwZS5pbmNsdWRlcyA9IHt9XG5hbHRyLnByb3RvdHlwZS50YWdfbGlzdCA9IFtdXG5hbHRyLnByb3RvdHlwZS5maWx0ZXJzID0ge31cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG52YXIgbm9kZV9oYW5sZXJzID0ge31cblxubm9kZV9oYW5sZXJzWzFdID0gZWxlbWVudF9ub2RlXG5ub2RlX2hhbmxlcnNbM10gPSB0ZXh0X25vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEsIHJvb3QpIHtcbiAgcm9vdCA9IHJvb3QgfHwgdGhpcy50cmVlXG5cbiAgaWYocm9vdC5ob29rcykge1xuICAgIHJvb3QuaG9va3MuZm9yRWFjaChmdW5jdGlvbih1cGRhdGUpIHtcbiAgICAgIHVwZGF0ZShkYXRhKVxuICAgIH0pXG4gIH1cblxuICBpZihyb290LnVwZGF0ZV9jaGlsZHJlbikge1xuICAgIHJvb3QudXBkYXRlX2NoaWxkcmVuKGRhdGEpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlX2NoaWxkcmVuKGRhdGEpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgdXBkYXRlKGRhdGEsIHRoaXMuY2hpbGRyZW5baV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX25vZGUobm9kZSkge1xuICByZXR1cm4gbm9kZV9oYW5sZXJzW25vZGUubm9kZVR5cGVdID9cbiAgICBub2RlX2hhbmxlcnNbbm9kZS5ub2RlVHlwZV0uY2FsbCh0aGlzLCBub2RlKSA6XG4gICAgZGVmYXVsdF9ub2RlLmNhbGwodGhpcywgbm9kZSlcbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmaWx0ZXIpIHtcbiAgYWx0ci5wcm90b3R5cGUuZmlsdGVyc1tuYW1lXSA9IGZpbHRlclxufVxuXG5mdW5jdGlvbiBhZGRfdGFnKGF0dHIsIHRhZykge1xuICBhbHRyLnByb3RvdHlwZS50YWdzW2F0dHJdID0gdGFnXG4gIGFsdHIucHJvdG90eXBlLnRhZ19saXN0LnB1c2goe1xuICAgICAgYXR0cjogYXR0clxuICAgICwgY29uc3RydWN0b3I6IHRhZ1xuICB9KVxufVxuXG5mdW5jdGlvbiBvdXRlcl9odG1sKCkge1xuICByZXR1cm4gdGhpcy5yb290Lm91dGVySFRNTFxufVxuXG5mdW5jdGlvbiBkZWZhdWx0X25vZGUoZWwpIHtcbiAgcmV0dXJuIHtcbiAgICAgIGVsOiBlbFxuICAgICwgdXBkYXRlX2NoaWxkcmVuOiB0aGlzLnVwZGF0ZV9jaGlsZHJlblxuICAgICwgaG9va3M6IFtdXG4gICAgLCBjaGlsZHJlbjogYWRkX2NoaWxkcmVuLmNhbGwodGhpcylcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZF9jaGlsZHJlbigpIHtcbiAgICByZXR1cm4gW10ubWFwLmNhbGwoXG4gICAgICAgIGVsLmNoaWxkTm9kZXMgfHwgW11cbiAgICAgICwgdGhpcy5jcmVhdGVfbm9kZS5iaW5kKHRoaXMpXG4gICAgKS5maWx0ZXIoQm9vbGVhbilcbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBlbmRfdG8obm9kZSkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5yb290X25vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQodGhpcy5yb290X25vZGVzW2ldKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluY2x1ZGUobmFtZSwgdGVtcGxhdGUpIHtcbiAgcmV0dXJuIHRoaXMuaW5jbHVkZXNbbmFtZV0gPSB0ZW1wbGF0ZVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfYWNjZXNzb3IoZGVzY3JpcHRpb24sIGNoYW5nZSkge1xuICByZXR1cm4gdGhpcy5hY2Nlc3NvcnMuY3JlYXRlKGRlc2NyaXB0aW9uLCBjaGFuZ2UsIHRoaXMuZGVib3VuY2UpXG59XG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIobmFtZSwgZm4pIHtcbiAgcmV0dXJuIHRoaXMuZmlsdGVyc1tuYW1lXSA9IGZuXG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwuYWx0ciA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX2VsZW1lbnRfbm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVfZWxlbWVudF9ub2RlKGVsKSB7XG4gIHZhciBhbHRyX3RhZ3MgPSB7fVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGF0dHJcblxuICB2YXIgbm9kZSA9IHtcbiAgICAgIGVsOiBlbFxuICAgICwgdXBkYXRlX2NoaWxkcmVuOiB0aGlzLnVwZGF0ZV9jaGlsZHJlblxuICAgICwgaG9va3M6IFtdXG4gIH1cblxuICB2YXIgYXR0cnMgPSBBcnJheS5wcm90b3R5cGUuZmlsdGVyLmNhbGwoZWwuYXR0cmlidXRlcywgZnVuY3Rpb24oYXR0cikge1xuICAgIHJldHVybiBhbHRyLnRhZ3NbYXR0ci5uYW1lXSA/XG4gICAgICAoYWx0cl90YWdzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlKSAmJiBmYWxzZSA6XG4gICAgICB0cnVlXG4gIH0pXG5cbiAgYXR0cnMuZm9yRWFjaChmdW5jdGlvbihhdHRyKSB7XG4gICAgdmFyIGF0dHJfaG9vayA9IGFsdHIudGVtcGxhdGVfc3RyaW5nKGF0dHIudmFsdWUsIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKGF0dHIubmFtZSwgdmFsKVxuICAgIH0pXG5cbiAgICBpZihhdHRyX2hvb2spIHtcbiAgICAgIG5vZGUuaG9va3MucHVzaChhdHRyX2hvb2spXG4gICAgfVxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhbHRyLnRhZ19saXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGF0dHIgPSBhbHRyX3RhZ3NbYWx0ci50YWdfbGlzdFtpXS5hdHRyXVxuXG4gICAgaWYoYXR0cikge1xuICAgICAgYWx0ci50YWdfbGlzdFtpXS5jb25zdHJ1Y3Rvci5jYWxsKGFsdHIsIG5vZGUsIGF0dHIpXG4gICAgfVxuICB9XG5cbiAgbm9kZS5jaGlsZHJlbiA9IFtdLm1hcC5jYWxsKFxuICAgICAgZWwuY2hpbGROb2Rlc1xuICAgICwgYWx0ci5jcmVhdGVfbm9kZS5iaW5kKGFsdHIpXG4gICkuZmlsdGVyKEJvb2xlYW4pXG5cbiAgaWYobm9kZS5jaGlsZHJlbi5sZW5ndGggfHwgbm9kZS5ob29rcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gbm9kZVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFjY2Vzc29yLCBjaGFuZ2UpIHtcbiAgdmFyIHZhbCwgbnVtXG5cbiAgdmFyIGNoZWNrX251bSA9IHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCBmdW5jdGlvbihuZXdfbnVtKSB7XG4gICAgY2hhbmdlKChudW0gPSArbmV3X251bSkgKyAodmFsIHx8IDApKVxuICB9KVxuXG4gIHJldHVybiBmdW5jdGlvbiBhZGQobmV3X3ZhbCwgY29udGV4dCkge1xuICAgIHZhbCA9ICtuZXdfdmFsXG4gICAgY2hlY2tfbnVtKGNvbnRleHQpXG4gIH1cbn1cbiIsInZhciBpbmNsdWRlX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9pbmNsdWRlJylcbiAgLCBhZGRfZmlsdGVyID0gcmVxdWlyZSgnLi9maWx0ZXJzL2FkZCcpXG4gICwgdGV4dF90YWcgPSByZXF1aXJlKCcuL3RhZ3MvdGV4dCcpXG4gICwgaHRtbF90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaHRtbCcpXG4gICwgd2l0aF90YWcgPSByZXF1aXJlKCcuL3RhZ3Mvd2l0aCcpXG4gICwgZm9yX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9mb3InKVxuICAsIGlmX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9pZicpXG4gICwgYWx0ciA9IHJlcXVpcmUoJy4vYWx0cicpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuXG5hbHRyLmFkZF90YWcoJ2FsdHItaW5jbHVkZScsIGluY2x1ZGVfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLXRleHQnLCB0ZXh0X3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1odG1sJywgaHRtbF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItd2l0aCcsIHdpdGhfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWZvcicsIGZvcl90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItaWYnLCBpZl90YWcpXG5cbmFsdHIuYWRkX2ZpbHRlcignYWRkJywgYWRkX2ZpbHRlcilcbiIsInZhciBmb3JfcmVnZXhwID0gL14oLio/KVxccytpblxccysoLiokKS9cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JfaGFuZGxlclxuXG5mdW5jdGlvbiBmb3JfaGFuZGxlcihub2RlLCBhcmdzKSB7XG4gIHZhciBwYXJ0cyA9IGFyZ3MubWF0Y2goZm9yX3JlZ2V4cClcbiAgICAsIHRlbXBsYXRlID0gbm9kZS5lbC5pbm5lckhUTUxcbiAgICAsIGNoaWxkcmVuID0gW11cbiAgICAsIGFsdHIgPSB0aGlzXG4gICAgLCBpdGVtcyA9IFtdXG5cbiAgaWYoIXBhcnRzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGZvciB0YWc6ICcgKyBhcmdzKVxuICB9XG5cbiAgbm9kZS5lbC5pbm5lckhUTUwgPSAnJ1xuXG4gIHZhciBwcm9wID0gcGFydHNbMV1cbiAgICAsIGtleSA9IHBhcnRzWzJdXG5cbiAgbm9kZS5ob29rcy5wdXNoKGFsdHIuY3JlYXRlX2FjY2Vzc29yKGtleSwgdXBkYXRlKSlcblxuICBub2RlLnVwZGF0ZV9jaGlsZHJlbiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgaXRlbV9kYXRhXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGl0ZW1fZGF0YSA9IE9iamVjdC5jcmVhdGUoZGF0YSlcbiAgICAgIGl0ZW1fZGF0YVtwcm9wXSA9IGRhdGFba2V5XVtpXVxuICAgICAgaXRlbV9kYXRhWyckaW5kZXgnXSA9IGlcbiAgICAgIGFsdHIudXBkYXRlKGl0ZW1fZGF0YSwgbm9kZS5jaGlsZHJlbltpXSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUobmV3X2l0ZW1zKSB7XG4gICAgaWYoIUFycmF5LmlzQXJyYXkobmV3X2l0ZW1zKSkge1xuICAgICAgbmV3X2l0ZW1zID0gW11cbiAgICB9XG5cbiAgICB2YXIgbmV3X2NoaWxkcmVuID0gbmV3IEFycmF5KG5ld19pdGVtcy5sZW5ndGgpXG4gICAgICAsIHByZXYgPSBub2RlLmVsLmZpcnN0Q2hpbGRcbiAgICAgICwgb2Zmc2V0ID0gMFxuICAgICAgLCBpbmRleFxuICAgICAgLCBub2Rlc1xuXG4gICAgbm9kZS5jaGlsZHJlbiA9IFtdXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbmV3X2l0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaW5kZXggPSBpdGVtcy5pbmRleE9mKG5ld19pdGVtc1tpXSlcblxuICAgICAgaWYoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IChjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpWzBdKVxuICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXgsIDEpXG5cbiAgICAgICAgaWYoaW5kZXggKyBvZmZzZXQgIT09IGkpIHtcbiAgICAgICAgICBwbGFjZShuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzKVxuICAgICAgICB9XG5cbiAgICAgICAgKytvZmZzZXRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IG1ha2VfY2hpbGRyZW4oKVxuICAgICAgICBwbGFjZShuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzKVxuICAgICAgICArK29mZnNldFxuICAgICAgfVxuXG4gICAgICBub2RlcyA9IG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXNcbiAgICAgIHByZXYgPSBub2Rlcy5sZW5ndGggPyBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXS5uZXh0U2libGluZyA6IG51bGxcbiAgICAgIG5vZGVzID0gbm9kZXMuY29uY2F0KG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICBub2RlLmNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbi5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmFsdHJfbm9kZXMpXG4gICAgfVxuXG4gICAgZm9yKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgY2hpbGRyZW5baV0uZG9tX25vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuICAgICAgICBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgY2hpbGRyZW4gPSBuZXdfY2hpbGRyZW4uc2xpY2UoKVxuICAgIGl0ZW1zID0gbmV3X2l0ZW1zLnNsaWNlKClcblxuICAgIGZ1bmN0aW9uIHBsYWNlKG5vZGVzKSB7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgIG5vZGUuZWwuaW5zZXJ0QmVmb3JlKG5vZGVzW2ldLCBwcmV2KVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VfY2hpbGRyZW4oKSB7XG4gICAgdmFyIHRlbXAgPSBhbHRyLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhub2RlLmVsLm5hbWVzcGFjZVVSSSwgJ2RpdicpXG4gICAgICAsIGFsdHJfbm9kZXNcbiAgICAgICwgZG9tX25vZGVzXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHRlbXBsYXRlXG5cbiAgICBkb21fbm9kZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0ZW1wLmNoaWxkTm9kZXMpXG4gICAgYWx0cl9ub2RlcyA9IGRvbV9ub2Rlcy5tYXAoYWx0ci5jcmVhdGVfbm9kZS5iaW5kKGFsdHIpKS5maWx0ZXIoQm9vbGVhbilcblxuICAgIHJldHVybiB7XG4gICAgICAgIGRvbV9ub2RlczogZG9tX25vZGVzXG4gICAgICAsIGFsdHJfbm9kZXM6IGFsdHJfbm9kZXNcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaHRtbFxuXG5mdW5jdGlvbiBodG1sKG5vZGUsIGFjY2Vzc29yKSB7XG4gIG5vZGUuaG9va3MucHVzaCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgbm9kZS5lbC5pbm5lckhUTUwgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaWZfdGFnXG5cbmZ1bmN0aW9uIGlmX3RhZyhub2RlLCBhY2Nlc3Nvcikge1xuICB2YXIgcGxhY2Vob2xkZXIgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ2FsdHItaWYtcGxhY2Vob2xkZXInKVxuICAgICwgcGFyZW50ID0gbm9kZS5lbC5wYXJlbnROb2RlXG4gICAgLCBoaWRkZW4gPSBudWxsXG5cbiAgcGFyZW50Lmluc2VydEJlZm9yZShwbGFjZWhvbGRlciwgbm9kZS5lbC5uZXh0U2libGluZylcbiAgbm9kZS5ob29rcy5wdXNoKHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB0b2dnbGUpKVxuXG4gIGZ1bmN0aW9uIGhpZGUoKSB7XG4gICAgaWYoIWhpZGRlbikge1xuICAgICAgaGlkZGVuID0gbm9kZS5jaGlsZHJlbiB8fCBbXVxuICAgICAgbm9kZS5jaGlsZHJlbiA9IFtdXG4gICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQobm9kZS5lbClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzaG93KCkge1xuICAgIGlmKGhpZGRlbikge1xuICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShub2RlLmVsLCBwbGFjZWhvbGRlcilcbiAgICAgIG5vZGUuY2hpbGRyZW4gPSBoaWRkZW5cbiAgICAgIGhpZGRlbiA9IG51bGxcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB0b2dnbGUodmFsKSB7XG4gICAgdmFsID8gc2hvdygpIDogaGlkZSgpXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaW5jbHVkZVxuXG5mdW5jdGlvbiBpbmNsdWRlKG5vZGUsIG5hbWUpIHtcbiAgbm9kZS5lbC5pbm5lckhUTUwgPSB0aGlzLmluY2x1ZGVzW25hbWVdXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRleHRcblxuZnVuY3Rpb24gdGV4dChub2RlLCBhY2Nlc3Nvcikge1xuICBub2RlLmhvb2tzLnB1c2godGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIG5vZGUuZWwudGV4dENvbnRlbnQgPSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJyA/ICcnIDogdmFsXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gd2l0aF90YWdcblxuZnVuY3Rpb24gd2l0aF90YWcobm9kZSwgYWNjZXNzb3IpIHtcbiAgbm9kZS51cGRhdGVfY2hpbGRyZW4gPSB0aGlzLmNyZWF0ZV9hY2Nlc3NvcihcbiAgICAgIGFjY2Vzc29yXG4gICAgLCBub2RlLnVwZGF0ZV9jaGlsZHJlbi5iaW5kKG5vZGUpXG4gIClcbn1cbiIsInZhciBUQUcgPSAve3tcXHMqKC4qPylcXHMqfX0vXG5cbm1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVfc3RyaW5nXG5cbmZ1bmN0aW9uIHRlbXBsYXRlX3N0cmluZyh0ZW1wbGF0ZSwgY2hhbmdlKSB7XG4gIGlmKCF0ZW1wbGF0ZS5tYXRjaChUQUcpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGVtcGxhdGVcbiAgICAsIHBhcnRzID0gW11cbiAgICAsIGhvb2tzID0gW11cbiAgICAsIHRpbWVyXG4gICAgLCBpbmRleFxuICAgICwgbmV4dFxuXG4gIHdoaWxlKHJlbWFpbmluZyAmJiAobmV4dCA9IHJlbWFpbmluZy5tYXRjaChUQUcpKSkge1xuICAgIGlmKGluZGV4ID0gcmVtYWluaW5nLmluZGV4T2YobmV4dFswXSkpIHtcbiAgICAgIHBhcnRzLnB1c2gocmVtYWluaW5nLnNsaWNlKDAsIGluZGV4KSlcbiAgICB9XG5cbiAgICBwYXJ0cy5wdXNoKCcnKVxuICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZy5zbGljZShpbmRleCArIG5leHRbMF0ubGVuZ3RoKVxuICAgIGhvb2tzLnB1c2goXG4gICAgICAgIHRoaXMuY3JlYXRlX2FjY2Vzc29yKG5leHRbMV0sIHNldF9wYXJ0LmJpbmQodGhpcywgcGFydHMubGVuZ3RoIC0gMSkpXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIHVwZGF0ZVxuXG4gIGZ1bmN0aW9uIHNldF9wYXJ0KGlkeCwgdmFsKSB7XG4gICAgcGFydHNbaWR4XSA9IHZhbFxuXG4gICAgaWYodGhpcy5kZWJvdW5jZSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBjaGFuZ2UocGFydHMuam9pbignJykpXG4gICAgfVxuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuXG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgY2hhbmdlKHBhcnRzLmpvaW4oJycpKVxuICAgIH0sIHRoaXMuZGVib3VuY2UpXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgIGhvb2tzLmZvckVhY2goZnVuY3Rpb24oaG9vaykge1xuICAgICAgaG9vayhkYXRhKVxuICAgIH0pXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX3RleHRfbm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVfdGV4dF9ub2RlKGVsKSB7XG4gIHZhciBob29rID0gdGhpcy50ZW1wbGF0ZV9zdHJpbmcoZWwudGV4dENvbnRlbnQsIHVwZGF0ZSlcblxuICBpZighaG9vaykge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAgIGVsOiBlbFxuICAgICwgdGV4dDogZWwudGV4dENvbnRlbnRcbiAgICAsIGhvb2tzOiBbaG9va11cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHZhbFxuICB9XG59XG4iLCJ2YXIgYWRkX29wZXJhdG9ycyA9IHJlcXVpcmUoJy4vbGliL29wZXJhdG9ycycpXG4gICwgY3JlYXRlX2FjY2Vzb3IgPSByZXF1aXJlKCcuL2xpYi9jcmVhdGUnKVxuICAsIGFkZF9sb29rdXAgPSByZXF1aXJlKCcuL2xpYi9sb29rdXAnKVxuICAsIGFkZF9maWx0ZXIgPSByZXF1aXJlKCcuL2xpYi9maWx0ZXInKVxuICAsIGFkZF90eXBlcyA9IHJlcXVpcmUoJy4vbGliL3R5cGVzJylcbiAgLCBkZWJvdW5jZSA9IHJlcXVpcmUoJ2RlYm91bmNlJylcbiAgLCB0eXBlcyA9IFtdXG5cbm1vZHVsZS5leHBvcnRzID0gYWNjZXNzb3JzXG5cbi8vIG9yZGVyIGlzIGltcG9ydGFudFxuYWRkX29wZXJhdG9ycyh0eXBlcylcbmFkZF9maWx0ZXIodHlwZXMpXG5hZGRfdHlwZXModHlwZXMpXG5hZGRfbG9va3VwKHR5cGVzKVxuXG5hY2Nlc3NvcnMucHJvdG90eXBlLl9jcmVhdGUgPSBjcmVhdGVfYWNjZXNvclxuYWNjZXNzb3JzLnByb3RvdHlwZS5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlclxuYWNjZXNzb3JzLnByb3RvdHlwZS5jcmVhdGUgPSBjcmVhdGVcbmFjY2Vzc29ycy5wcm90b3R5cGUudHlwZXMgPSB0eXBlc1xuXG5mdW5jdGlvbiBhY2Nlc3NvcnMoZmlsdGVycywgZGVib3VuY2UpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWNjZXNzb3JzKSkge1xuICAgIHJldHVybiBuZXcgYWNjZXNzb3JzKGZpbHRlcnMsIGRlYm91bmNlKVxuICB9XG5cbiAgaWYoIWRlYm91bmNlICYmIGRlYm91bmNlICE9PSBmYWxzZSkge1xuICAgIGRlYm91bmNlID0gMFxuICB9XG5cbiAgdGhpcy5kZWJvdW5jZSA9IGRlYm91bmNlXG4gIHRoaXMuZmlsdGVycyA9IGZpbHRlcnMgfHwge31cbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmbikge1xuICB0aGlzLmZpbHRlcnNbbmFtZV0gPSBmblxufVxuXG5mdW5jdGlvbiBjcmVhdGUoc3RyLCBjaGFuZ2UpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZShcbiAgICAgIHN0clxuICAgICwgdGhpcy5kZWJvdW5jZSA9PT0gZmFsc2UgPyBjaGFuZ2UgOiBkZWJvdW5jZShjaGFuZ2UsIHRoaXMuZGVib3VuY2UpXG4gIClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYWNjZXNzb3JcblxuZnVuY3Rpb24gYWNjZXNzb3Ioa2V5LCBjaGFuZ2UpIHtcbiAgdmFyIHBhcnRzID0ga2V5LnNwbGl0KCctPicpXG4gICAgLCBjb250ZXh0XG4gICAgLCBuZXh0XG4gICAgLCBwcmV2XG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHBhcnRzW2ldID0gYnVpbGRfcGFydC5jYWxsKHRoaXMsIHBhcnRzW2ldLCBjYWxsX25leHQuYmluZCh0aGlzLCBpICsgMSkpXG4gIH1cblxuICByZXR1cm4gY2FsbF9uZXh0LmJpbmQodGhpcywgMClcblxuICBmdW5jdGlvbiBjYWxsX25leHQoaSwgdmFsLCBjdHgpIHtcbiAgICBpZighaSkge1xuICAgICAgY29udGV4dCA9IGN0eCB8fCB2YWxcbiAgICB9XG5cbiAgICBpZihpID09PSBwYXJ0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBjaGFuZ2UuY2FsbCh0aGlzLCB2YWwsIGNvbnRleHQpXG4gICAgfVxuXG4gICAgcGFydHNbaV0odmFsLCBjb250ZXh0KVxuICB9XG5cbiAgZnVuY3Rpb24gZmluaXNoKHZhbCwgY29udGV4dCkge1xuICAgIGlmKHZhbCA9PT0gcHJldikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgcHJldiA9IHZhbFxuICAgIGNoYW5nZS5jYWxsKHRoaXMsIHZhbCwgY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZF9wYXJ0KHBhcnQsIGNoYW5nZSkge1xuICB2YXIgYWNjZXNzb3JcblxuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy50eXBlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihhY2Nlc3NvciA9IHRoaXMudHlwZXNbaV0uY2FsbCh0aGlzLCBwYXJ0LCBjaGFuZ2UpKSB7XG4gICAgICByZXR1cm4gYWNjZXNzb3JcbiAgICB9XG4gIH1cbn1cbiIsInZhciBmaWx0ZXJfcmVnZXhwID0gL15cXHMqKFteKF0rKVxcKCguKilcXClcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfZmlsdGVyXG5cbmZ1bmN0aW9uIGFkZF9maWx0ZXIodHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfZmlsdGVyKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfZmlsdGVyKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKGZpbHRlcl9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGZpbHRlciA9IHRoaXMuZmlsdGVyc1twYXJ0c1sxXV1cblxuICBpZighZmlsdGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgZmluZCBmaWx0ZXI6ICcgKyBwYXJ0c1sxXSlcbiAgfVxuXG4gIHJldHVybiBmaWx0ZXIuY2FsbCh0aGlzLCBwYXJ0c1syXSwgY2hhbmdlKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhZGRfbG9va3VwXG5cbmZ1bmN0aW9uIGFkZF9sb29rdXAodHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfbG9va3VwKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbG9va3VwKHBhdGgsIGNoYW5nZSkge1xuICBpZighcGF0aC5pbmRleE9mKCckZGF0YScpKSB7XG4gICAgcGF0aCA9IHBhdGguc2xpY2UoJyRkYXRhLicubGVuZ3RoKVxuICB9XG5cbiAgcmV0dXJuIGxvb2t1cChwYXRoLm1hdGNoKC9cXHMqKC4qW15cXHNdKVxccyovKVsxXSwgY2hhbmdlKVxufVxuXG5mdW5jdGlvbiBsb29rdXAocGF0aCwgZG9uZSkge1xuICB2YXIgcGFydHMgPSBwYXRoID8gcGF0aC5zcGxpdCgnLicpIDogW11cblxuICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgb2JqICYmIGkgPCBsOyArK2kpIHtcbiAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV1cbiAgICB9XG5cbiAgICBpZihpID09PSBsKSB7XG4gICAgICByZXR1cm4gZG9uZShvYmopXG4gICAgfVxuXG4gICAgZG9uZSgpXG4gIH1cbn1cbiIsInZhciB0ZXJuYXJ5X3JlZ2V4cCA9IC9eXFxzKiguKz8pXFxzKlxcPyguKilcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfb3BlcmF0b3JzXG5cbmZ1bmN0aW9uIGFkZF9vcGVyYXRvcnModHlwZXMpIHtcbiAgdHlwZXMucHVzaChjcmVhdGVfdGVybmFyeSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyd8XFxcXHwnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnJiYnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnfCddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWydeJ10pKVxuICB0eXBlcy5wdXNoKGJpbmFyeShbJyYnXSkpXG4gIHR5cGVzLnB1c2goYmluYXJ5KFsnPT09JywgJyE9PScsICc9PScsICchPSddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWyc+PScsICc8PScsICc+JywgJzwnLCAnIGluICcsICcgaW5zdGFuY2VvZiAnXSkpXG4gIC8vIHR5cGVzLnB1c2goYmluYXJ5KFsnPDwnLCAnPj4nLCAnPj4+J10pKSAvL2NvbmZsaWNzIHdpdGggPCBhbmQgPlxuICB0eXBlcy5wdXNoKGJpbmFyeShbJysnLCAnLSddKSlcbiAgdHlwZXMucHVzaChiaW5hcnkoWycqJywgJy8nLCAnJSddKSlcbiAgdHlwZXMucHVzaCh1bmFyeShbJyEnLCAnKycsICctJywgJ34nXSkpXG59XG5cbmZ1bmN0aW9uIGJpbmFyeShsaXN0KSB7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICAnXlxcXFxzKiguKz8pXFxcXHNcXCooXFxcXCcgK1xuICAgICAgbGlzdC5qb2luKCd8XFxcXCcpICtcbiAgICAgICcpXFxcXHMqKC4rPylcXFxccyokJ1xuICApXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHBhcnRzLCBjaGFuZ2UpIHtcbiAgICByZXR1cm4gY3JlYXRlX2JpbmFyeS5jYWxsKHRoaXMsIHJlZ2V4LCBwYXJ0cywgY2hhbmdlKVxuICB9XG59XG5cbmZ1bmN0aW9uIHVuYXJ5KGxpc3QpIHtcbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgICAgICdeXFxcXHMqKFxcXFwnICtcbiAgICAgIGxpc3Quam9pbignfFxcXFwnKSArXG4gICAgICAnKVxcXFxzKiguKz8pXFxcXHMqJCdcbiAgKVxuXG4gIHJldHVybiBmdW5jdGlvbihwYXJ0cywgY2hhbmdlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZV91bmFyeS5jYWxsKHRoaXMsIHJlZ2V4LCBwYXJ0cywgY2hhbmdlKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXJuYXJ5KHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHRlcm5hcnlfcmVnZXhwKSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjb25kaXRpb24gPSBwYXJ0c1sxXVxuICAgICwgcmVzdCA9IHBhcnRzWzJdXG4gICAgLCBjb3VudCA9IDFcblxuICBmb3IodmFyIGkgPSAwLCBsID0gcmVzdC5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZihyZXN0W2ldID09PSAnOicpIHtcbiAgICAgIC0tY291bnRcbiAgICB9IGVsc2UgaWYocmVzdFtpXSA9PT0gJz8nKSB7XG4gICAgICArK2NvdW50XG4gICAgfVxuXG4gICAgaWYoIWNvdW50KSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmKCFpIHx8IGkgPT09IHJlc3QubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hdGNoZWQgdGVybmFyeTogJyArIHBhcnRzWzBdKVxuICB9XG5cbiAgdmFyIG5vdCA9IHRoaXMuX2NyZWF0ZShyZXN0LnNsaWNlKGkgKyAxKSwgY2hhbmdlKVxuICAgICwgb2sgPSB0aGlzLl9jcmVhdGUocmVzdC5zbGljZSgwLCBpKSwgY2hhbmdlKVxuXG4gIHJldHVybiB0aGlzLl9jcmVhdGUoY29uZGl0aW9uLCB1cGRhdGUpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCwgY29udGV4dCkge1xuICAgIHJldHVybiB2YWwgPyBvayhjb250ZXh0KSA6IG5vdChjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9iaW5hcnkocmVnZXgsIHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHJlZ2V4KSkpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBjaGVja19saHMgPSB0aGlzLl9jcmVhdGUocGFydHNbMV0sIHVwZGF0ZS5iaW5kKG51bGwsIGZhbHNlKSlcbiAgICAsIGNoZWNrX3JocyA9IHRoaXMuX2NyZWF0ZShwYXJ0c1szXSwgdXBkYXRlLmJpbmQobnVsbCwgdHJ1ZSkpXG4gICAgLCBsaHNcbiAgICAsIHJoc1xuXG4gIHZhciBjaGFuZ2VkID0gRnVuY3Rpb24oXG4gICAgICAnY2hhbmdlLCBsaHMsIHJocydcbiAgICAsICdyZXR1cm4gY2hhbmdlKGxocyAnICsgcGFydHNbMl0gKyAnIHJocyknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIG9uX2RhdGFcblxuICBmdW5jdGlvbiBvbl9kYXRhKGRhdGEpIHtcbiAgICBjaGVja19saHMoZGF0YSlcbiAgICBjaGVja19yaHMoZGF0YSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShpc19yaHMsIHZhbCkge1xuICAgIGlzX3JocyA/IHJocyA9IHZhbCA6IGxocyA9IHZhbFxuICAgIGNoYW5nZWQobGhzLCByaHMpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3VuYXJ5KHJlZ2V4LCBwYXJ0cywgY2hhbmdlKSB7XG4gIGlmKCEocGFydHMgPSBwYXJ0cy5tYXRjaChyZWdleCkpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgY2hhbmdlZCA9IEZ1bmN0aW9uKFxuICAgICAgJ2NoYW5nZSwgdmFsJ1xuICAgICwgJ3JldHVybiBjaGFuZ2UoJyArIHBhcnRzWzFdICsgJ3ZhbCknXG4gICkuYmluZChudWxsLCBjaGFuZ2UpXG5cbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZShwYXJ0c1syXSwgY2hhbmdlZClcbn1cbiIsInZhciBzdHJpbmdfcmVnZXhwID0gL15cXHMqKD86JygoPzpbXidcXFxcXXwoPzpcXFxcLikpKiknfFwiKCg/OlteXCJcXFxcXXwoPzpcXFxcLikpKilcIilcXHMqL1xuICAsIG51bWJlcl9yZWdleHAgPSAvXlxccyooXFxkKig/OlxcLlxcZCspPylcXHMqJC9cblxubW9kdWxlLmV4cG9ydHMgPSBhZGRfdHlwZXNcblxuZnVuY3Rpb24gYWRkX3R5cGVzKHR5cGVzKSB7XG4gIHR5cGVzLnB1c2goY3JlYXRlX3N0cmluZ19hY2Nlc3NvcilcbiAgdHlwZXMucHVzaChjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKHN0cmluZ19yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZShwYXJ0c1sxXSB8fCBwYXJ0c1syXSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbnVtYmVyX2FjY2Vzc29yKHBhcnRzLCBjaGFuZ2UpIHtcbiAgaWYoIShwYXJ0cyA9IHBhcnRzLm1hdGNoKG51bWJlcl9yZWdleHApKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZSgrcGFydHNbMV0pXG4gIH1cbn1cbiIsIi8qKlxuICogRGVib3VuY2VzIGEgZnVuY3Rpb24gYnkgdGhlIGdpdmVuIHRocmVzaG9sZC5cbiAqXG4gKiBAc2VlIGh0dHA6Ly91bnNjcmlwdGFibGUuY29tLzIwMDkvMDMvMjAvZGVib3VuY2luZy1qYXZhc2NyaXB0LW1ldGhvZHMvXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jdGlvbiB0byB3cmFwXG4gKiBAcGFyYW0ge051bWJlcn0gdGltZW91dCBpbiBtcyAoYDEwMGApXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHdoZXRoZXIgdG8gZXhlY3V0ZSBhdCB0aGUgYmVnaW5uaW5nIChgZmFsc2VgKVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHRocmVzaG9sZCwgZXhlY0FzYXApe1xuICB2YXIgdGltZW91dDtcblxuICByZXR1cm4gZnVuY3Rpb24gZGVib3VuY2VkKCl7XG4gICAgdmFyIG9iaiA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICBmdW5jdGlvbiBkZWxheWVkICgpIHtcbiAgICAgIGlmICghZXhlY0FzYXApIHtcbiAgICAgICAgZnVuYy5hcHBseShvYmosIGFyZ3MpO1xuICAgICAgfVxuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB9IGVsc2UgaWYgKGV4ZWNBc2FwKSB7XG4gICAgICBmdW5jLmFwcGx5KG9iaiwgYXJncyk7XG4gICAgfVxuXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoZGVsYXllZCwgdGhyZXNob2xkIHx8IDEwMCk7XG4gIH07XG59O1xuIl19
