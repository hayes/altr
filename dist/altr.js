(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var lookup = require('./lookup')
  , accessor_types = []

var string_regexp = /^\s*(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")\s*/
  , ternary_regexp = /^\s*([^\?]+)\?([^\?:]+):(.*)\s*$/
  , equals_regexp = /^\s*(.+?)((?:!|=)={1,2})(.*)\s*$/
  , and_or_regexp = /^\s*(.+?)\s*(&&|\|\|)\s*(.+)\s*$/
  , filter_regexp = /^\s*([^(]+)\((.*)\)\s*$/
  , number_regexp = /^\s*(\d*(?:\.\d+)?)\s*$/
  , not_regexp = /^\s*!(.+?)\s*$/

module.exports = accessor

add_type(ternary_regexp, create_ternary)
add_type(equals_regexp, create_equals)
add_type(and_or_regexp, create_and_or)
add_type(not_regexp, create_not)
add_type(filter_regexp, create_filter)
add_type(string_regexp, create_string_accessor)
add_type(number_regexp, create_number_accessor)
add_type(/.*/, create_lookup)

function add_type(regexp, fn) {
  accessor_types.push({test: RegExp.prototype.test.bind(regexp), create: fn})
}

function accessor(key, change) {
  var parts = key.split('|')
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
  for(var i = 0, l = accessor_types.length; i < l; ++i) {
    if(accessor_types[i].test(part)) {
      return accessor_types[i].create.call(this, part, change)
    }
  }
}

function create_lookup(path, change) {
  if(!path.indexOf('$data')) {
    path = path.slice('$data.'.length)
  }

  return lookup(path.match(/\s*(.*[^\s])\s*/)[1], change)
}

function create_filter(filter_name, change) {
  var parts = filter_name.match(filter_regexp)
    , filter = this.filters[parts[1]]

  if(!filter) {
    throw new Error('could not find filter: ' + parts[1])
  }

  return filter.call(this, parts[2], change)
}

function create_string_accessor(string, change) {
  var match = string.match(string_regexp)

  string = match[1] || match[2]

  return function() {
    change(string)
  }
}

function create_number_accessor(num, change) {
  var match = num.match(number_regexp)

  num = +match[1]

  return function() {
    change(num)
  }
}

function create_ternary(parts, change) {
  parts = parts.match(ternary_regexp)

  var not = accessor(parts[3], change)
    , ok = accessor(parts[2], change)

  return accessor(parts[1], update)

  function update(val, context) {
    val ? ok(context) : not(context)
  }
}

function create_equals(parts, change) {
  parts = parts.match(equals_regexp)

  var check_lhs = accessor(parts[1], update.bind(null, false))
    , check_rhs = accessor(parts[3], update.bind(null, true))
    , lhs = {}
    , rhs = {}

  return compare

  function compare(data) {
    check_lhs(data)
    check_rhs(data)
  }

  function update(is_rhs, val) {
    is_rhs ? rhs = val : lhs = val
    val = parts[2].length === 2 ? lhs == rhs : lhs === rhs
    change(parts[2][0] === '!' ? !val : val)
  }
}

function create_not(parts, change) {
  return accesor(parts.match(not_regexp)[1], update)

  function update(data) {
    change(!data)
  }
}

function create_and_or(parts, change) {
   parts = parts.match(and_or_regexp)

  var check_lhs = accessor(parts[1], update.bind(null, false))
    , check_rhs = accessor(parts[3], update.bind(null, true))
    , lhs = false
    , rhs = false

  return compare

  function compare(data) {
    check_lhs(data)
    check_rhs(data)
  }

  function update(is_rhs, val) {
    is_rhs ? rhs = val : lhs = val
    change(parts[2] === '&&' ? lhs && rhs : lhs || rhs)
  }
}

},{"./lookup":7}],2:[function(require,module,exports){
(function (global){
var template_string = require('./template_string')
  , element_node = require('./element_node')
  , create_accessor = require('./accessor')
  , text_node = require('./text_node')

module.exports = altr
altr.add_tag = add_tag
altr.add_filter = add_filter

function altr(root, data, doc, sync) {
  if(!(this instanceof altr)) {
    return new altr(root, data, doc, sync)
  }

  this.root = root
  this.sync = sync
  this.document = doc || global.document
  this.includes = Object.create(this.includes)

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
altr.prototype.toString = outer_html
altr.prototype.include = include
altr.prototype.into = append_to
altr.prototype.update = update

altr.prototype.includes = {}
altr.prototype.tag_list = []
altr.prototype.filters = {}
altr.prototype.tags = {}

altr.include = include.bind(altr.prototype)

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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./accessor":1,"./element_node":4,"./template_string":14,"./text_node":15}],3:[function(require,module,exports){
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

},{"./altr":2,"./filters/add":5,"./tags/for":8,"./tags/html":9,"./tags/if":10,"./tags/include":11,"./tags/text":12,"./tags/with":13}],7:[function(require,module,exports){
module.exports = lookup

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

},{}],8:[function(require,module,exports){
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
      prev = nodes[nodes.length - 1].nextSibling
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

},{}],9:[function(require,module,exports){
module.exports = html

function html(node, accessor) {
  node.hooks.push(this.create_accessor(accessor, update))

  function update(val) {
    node.el.innerHTML = typeof val === 'undefined' ? '' : val
  }
}

},{}],10:[function(require,module,exports){
module.exports = if_tag

function if_tag(node, accessor) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , parent = node.el.parentNode
    , hidden = null

  parent.insertBefore(placeholder, node.el)
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

},{}],11:[function(require,module,exports){
module.exports = include

function include(node, name) {
  node.el.innerHTML = this.includes[name]
}

},{}],12:[function(require,module,exports){
module.exports = text

function text(node, accessor) {
  node.hooks.push(this.create_accessor(accessor, update))

  function update(val) {
    node.el.textContent = typeof val === 'undefined' ? '' : val
  }
}

},{}],13:[function(require,module,exports){
module.exports = with_tag

function with_tag(node, accessor) {
  node.update_children = this.create_accessor(
      accessor
    , node.update_children.bind(node)
  )
}

},{}],14:[function(require,module,exports){
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

    if(this.sync) {
      return change(parts.join(''))
    }

    clearTimeout(timer)

    timer = setTimeout(function() {
      change(parts.join(''))
    }, 0)
  }

  function update(data) {
    hooks.forEach(function(hook) {
      hook(data)
    })
  }
}

},{}],15:[function(require,module,exports){
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

},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FjY2Vzc29yLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZmlsdGVycy9hZGQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvbG9va3VwLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvZm9yLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaHRtbC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL2lmLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaW5jbHVkZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3RleHQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy93aXRoLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RlbXBsYXRlX3N0cmluZy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90ZXh0X25vZGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgbG9va3VwID0gcmVxdWlyZSgnLi9sb29rdXAnKVxuICAsIGFjY2Vzc29yX3R5cGVzID0gW11cblxudmFyIHN0cmluZ19yZWdleHAgPSAvXlxccyooPzonKCg/OlteJ1xcXFxdfCg/OlxcXFwuKSkqKSd8XCIoKD86W15cIlxcXFxdfCg/OlxcXFwuKSkqKVwiKVxccyovXG4gICwgdGVybmFyeV9yZWdleHAgPSAvXlxccyooW15cXD9dKylcXD8oW15cXD86XSspOiguKilcXHMqJC9cbiAgLCBlcXVhbHNfcmVnZXhwID0gL15cXHMqKC4rPykoKD86IXw9KT17MSwyfSkoLiopXFxzKiQvXG4gICwgYW5kX29yX3JlZ2V4cCA9IC9eXFxzKiguKz8pXFxzKigmJnxcXHxcXHwpXFxzKiguKylcXHMqJC9cbiAgLCBmaWx0ZXJfcmVnZXhwID0gL15cXHMqKFteKF0rKVxcKCguKilcXClcXHMqJC9cbiAgLCBudW1iZXJfcmVnZXhwID0gL15cXHMqKFxcZCooPzpcXC5cXGQrKT8pXFxzKiQvXG4gICwgbm90X3JlZ2V4cCA9IC9eXFxzKiEoLis/KVxccyokL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFjY2Vzc29yXG5cbmFkZF90eXBlKHRlcm5hcnlfcmVnZXhwLCBjcmVhdGVfdGVybmFyeSlcbmFkZF90eXBlKGVxdWFsc19yZWdleHAsIGNyZWF0ZV9lcXVhbHMpXG5hZGRfdHlwZShhbmRfb3JfcmVnZXhwLCBjcmVhdGVfYW5kX29yKVxuYWRkX3R5cGUobm90X3JlZ2V4cCwgY3JlYXRlX25vdClcbmFkZF90eXBlKGZpbHRlcl9yZWdleHAsIGNyZWF0ZV9maWx0ZXIpXG5hZGRfdHlwZShzdHJpbmdfcmVnZXhwLCBjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKVxuYWRkX3R5cGUobnVtYmVyX3JlZ2V4cCwgY3JlYXRlX251bWJlcl9hY2Nlc3NvcilcbmFkZF90eXBlKC8uKi8sIGNyZWF0ZV9sb29rdXApXG5cbmZ1bmN0aW9uIGFkZF90eXBlKHJlZ2V4cCwgZm4pIHtcbiAgYWNjZXNzb3JfdHlwZXMucHVzaCh7dGVzdDogUmVnRXhwLnByb3RvdHlwZS50ZXN0LmJpbmQocmVnZXhwKSwgY3JlYXRlOiBmbn0pXG59XG5cbmZ1bmN0aW9uIGFjY2Vzc29yKGtleSwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0cyA9IGtleS5zcGxpdCgnfCcpXG4gICAgLCBjb250ZXh0XG4gICAgLCBuZXh0XG4gICAgLCBwcmV2XG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHBhcnRzW2ldID0gYnVpbGRfcGFydC5jYWxsKHRoaXMsIHBhcnRzW2ldLCBjYWxsX25leHQuYmluZCh0aGlzLCBpICsgMSkpXG4gIH1cblxuICByZXR1cm4gY2FsbF9uZXh0LmJpbmQodGhpcywgMClcblxuICBmdW5jdGlvbiBjYWxsX25leHQoaSwgdmFsLCBjdHgpIHtcbiAgICBpZighaSkge1xuICAgICAgY29udGV4dCA9IGN0eCB8fCB2YWxcbiAgICB9XG5cbiAgICBpZihpID09PSBwYXJ0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBjaGFuZ2UuY2FsbCh0aGlzLCB2YWwsIGNvbnRleHQpXG4gICAgfVxuXG4gICAgcGFydHNbaV0odmFsLCBjb250ZXh0KVxuICB9XG5cbiAgZnVuY3Rpb24gZmluaXNoKHZhbCwgY29udGV4dCkge1xuICAgIGlmKHZhbCA9PT0gcHJldikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgcHJldiA9IHZhbFxuICAgIGNoYW5nZS5jYWxsKHRoaXMsIHZhbCwgY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZF9wYXJ0KHBhcnQsIGNoYW5nZSkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gYWNjZXNzb3JfdHlwZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYWNjZXNzb3JfdHlwZXNbaV0udGVzdChwYXJ0KSkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yX3R5cGVzW2ldLmNyZWF0ZS5jYWxsKHRoaXMsIHBhcnQsIGNoYW5nZSlcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX2xvb2t1cChwYXRoLCBjaGFuZ2UpIHtcbiAgaWYoIXBhdGguaW5kZXhPZignJGRhdGEnKSkge1xuICAgIHBhdGggPSBwYXRoLnNsaWNlKCckZGF0YS4nLmxlbmd0aClcbiAgfVxuXG4gIHJldHVybiBsb29rdXAocGF0aC5tYXRjaCgvXFxzKiguKlteXFxzXSlcXHMqLylbMV0sIGNoYW5nZSlcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2ZpbHRlcihmaWx0ZXJfbmFtZSwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0cyA9IGZpbHRlcl9uYW1lLm1hdGNoKGZpbHRlcl9yZWdleHApXG4gICAgLCBmaWx0ZXIgPSB0aGlzLmZpbHRlcnNbcGFydHNbMV1dXG5cbiAgaWYoIWZpbHRlcikge1xuICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgZmlsdGVyOiAnICsgcGFydHNbMV0pXG4gIH1cblxuICByZXR1cm4gZmlsdGVyLmNhbGwodGhpcywgcGFydHNbMl0sIGNoYW5nZSlcbn1cblxuZnVuY3Rpb24gY3JlYXRlX3N0cmluZ19hY2Nlc3NvcihzdHJpbmcsIGNoYW5nZSkge1xuICB2YXIgbWF0Y2ggPSBzdHJpbmcubWF0Y2goc3RyaW5nX3JlZ2V4cClcblxuICBzdHJpbmcgPSBtYXRjaFsxXSB8fCBtYXRjaFsyXVxuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjaGFuZ2Uoc3RyaW5nKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IobnVtLCBjaGFuZ2UpIHtcbiAgdmFyIG1hdGNoID0gbnVtLm1hdGNoKG51bWJlcl9yZWdleHApXG5cbiAgbnVtID0gK21hdGNoWzFdXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZShudW0pXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3Rlcm5hcnkocGFydHMsIGNoYW5nZSkge1xuICBwYXJ0cyA9IHBhcnRzLm1hdGNoKHRlcm5hcnlfcmVnZXhwKVxuXG4gIHZhciBub3QgPSBhY2Nlc3NvcihwYXJ0c1szXSwgY2hhbmdlKVxuICAgICwgb2sgPSBhY2Nlc3NvcihwYXJ0c1syXSwgY2hhbmdlKVxuXG4gIHJldHVybiBhY2Nlc3NvcihwYXJ0c1sxXSwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICB2YWwgPyBvayhjb250ZXh0KSA6IG5vdChjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9lcXVhbHMocGFydHMsIGNoYW5nZSkge1xuICBwYXJ0cyA9IHBhcnRzLm1hdGNoKGVxdWFsc19yZWdleHApXG5cbiAgdmFyIGNoZWNrX2xocyA9IGFjY2Vzc29yKHBhcnRzWzFdLCB1cGRhdGUuYmluZChudWxsLCBmYWxzZSkpXG4gICAgLCBjaGVja19yaHMgPSBhY2Nlc3NvcihwYXJ0c1szXSwgdXBkYXRlLmJpbmQobnVsbCwgdHJ1ZSkpXG4gICAgLCBsaHMgPSB7fVxuICAgICwgcmhzID0ge31cblxuICByZXR1cm4gY29tcGFyZVxuXG4gIGZ1bmN0aW9uIGNvbXBhcmUoZGF0YSkge1xuICAgIGNoZWNrX2xocyhkYXRhKVxuICAgIGNoZWNrX3JocyhkYXRhKVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGlzX3JocywgdmFsKSB7XG4gICAgaXNfcmhzID8gcmhzID0gdmFsIDogbGhzID0gdmFsXG4gICAgdmFsID0gcGFydHNbMl0ubGVuZ3RoID09PSAyID8gbGhzID09IHJocyA6IGxocyA9PT0gcmhzXG4gICAgY2hhbmdlKHBhcnRzWzJdWzBdID09PSAnIScgPyAhdmFsIDogdmFsKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9ub3QocGFydHMsIGNoYW5nZSkge1xuICByZXR1cm4gYWNjZXNvcihwYXJ0cy5tYXRjaChub3RfcmVnZXhwKVsxXSwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgY2hhbmdlKCFkYXRhKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9hbmRfb3IocGFydHMsIGNoYW5nZSkge1xuICAgcGFydHMgPSBwYXJ0cy5tYXRjaChhbmRfb3JfcmVnZXhwKVxuXG4gIHZhciBjaGVja19saHMgPSBhY2Nlc3NvcihwYXJ0c1sxXSwgdXBkYXRlLmJpbmQobnVsbCwgZmFsc2UpKVxuICAgICwgY2hlY2tfcmhzID0gYWNjZXNzb3IocGFydHNbM10sIHVwZGF0ZS5iaW5kKG51bGwsIHRydWUpKVxuICAgICwgbGhzID0gZmFsc2VcbiAgICAsIHJocyA9IGZhbHNlXG5cbiAgcmV0dXJuIGNvbXBhcmVcblxuICBmdW5jdGlvbiBjb21wYXJlKGRhdGEpIHtcbiAgICBjaGVja19saHMoZGF0YSlcbiAgICBjaGVja19yaHMoZGF0YSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShpc19yaHMsIHZhbCkge1xuICAgIGlzX3JocyA/IHJocyA9IHZhbCA6IGxocyA9IHZhbFxuICAgIGNoYW5nZShwYXJ0c1syXSA9PT0gJyYmJyA/IGxocyAmJiByaHMgOiBsaHMgfHwgcmhzKVxuICB9XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgdGVtcGxhdGVfc3RyaW5nID0gcmVxdWlyZSgnLi90ZW1wbGF0ZV9zdHJpbmcnKVxuICAsIGVsZW1lbnRfbm9kZSA9IHJlcXVpcmUoJy4vZWxlbWVudF9ub2RlJylcbiAgLCBjcmVhdGVfYWNjZXNzb3IgPSByZXF1aXJlKCcuL2FjY2Vzc29yJylcbiAgLCB0ZXh0X25vZGUgPSByZXF1aXJlKCcuL3RleHRfbm9kZScpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuYWx0ci5hZGRfdGFnID0gYWRkX3RhZ1xuYWx0ci5hZGRfZmlsdGVyID0gYWRkX2ZpbHRlclxuXG5mdW5jdGlvbiBhbHRyKHJvb3QsIGRhdGEsIGRvYywgc3luYykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBhbHRyKSkge1xuICAgIHJldHVybiBuZXcgYWx0cihyb290LCBkYXRhLCBkb2MsIHN5bmMpXG4gIH1cblxuICB0aGlzLnJvb3QgPSByb290XG4gIHRoaXMuc3luYyA9IHN5bmNcbiAgdGhpcy5kb2N1bWVudCA9IGRvYyB8fCBnbG9iYWwuZG9jdW1lbnRcbiAgdGhpcy5pbmNsdWRlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5pbmNsdWRlcylcblxuICBpZihnbG9iYWwuQnVmZmVyICYmIHJvb3QgaW5zdGFuY2VvZiBnbG9iYWwuQnVmZmVyKSB7XG4gICAgcm9vdCA9IHJvb3QudG9TdHJpbmcoKVxuICB9XG5cbiAgaWYodHlwZW9mIHJvb3QgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHRlbXAgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgICB0ZW1wLmlubmVySFRNTCA9IHJvb3RcbiAgICB0aGlzLnJvb3QgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXG4gICAgd2hpbGUodGVtcC5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGVtcC5maXJzdENoaWxkKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMucm9vdF9ub2RlcyA9IHRoaXMucm9vdC5ub2RlVHlwZSA9PT0gMTEgP1xuICAgIFtdLnNsaWNlLmNhbGwodGhpcy5yb290LmNoaWxkTm9kZXMpIDogW3RoaXMucm9vdF1cblxuICB0aGlzLnRyZWUgPSB0aGlzLmNyZWF0ZV9ub2RlKHtjaGlsZE5vZGVzOiB0aGlzLnJvb3Rfbm9kZXN9KVxuXG4gIGlmKGRhdGEpIHtcbiAgICB0aGlzLnVwZGF0ZShkYXRhKVxuICB9XG59XG5cbmFsdHIucHJvdG90eXBlLnRlbXBsYXRlX3N0cmluZyA9IHRlbXBsYXRlX3N0cmluZ1xuYWx0ci5wcm90b3R5cGUuY3JlYXRlX2FjY2Vzc29yID0gY3JlYXRlX2FjY2Vzc29yXG5hbHRyLnByb3RvdHlwZS51cGRhdGVfY2hpbGRyZW4gPSB1cGRhdGVfY2hpbGRyZW5cbmFsdHIucHJvdG90eXBlLmNyZWF0ZV9ub2RlID0gY3JlYXRlX25vZGVcbmFsdHIucHJvdG90eXBlLnRvU3RyaW5nID0gb3V0ZXJfaHRtbFxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZSA9IGluY2x1ZGVcbmFsdHIucHJvdG90eXBlLmludG8gPSBhcHBlbmRfdG9cbmFsdHIucHJvdG90eXBlLnVwZGF0ZSA9IHVwZGF0ZVxuXG5hbHRyLnByb3RvdHlwZS5pbmNsdWRlcyA9IHt9XG5hbHRyLnByb3RvdHlwZS50YWdfbGlzdCA9IFtdXG5hbHRyLnByb3RvdHlwZS5maWx0ZXJzID0ge31cbmFsdHIucHJvdG90eXBlLnRhZ3MgPSB7fVxuXG5hbHRyLmluY2x1ZGUgPSBpbmNsdWRlLmJpbmQoYWx0ci5wcm90b3R5cGUpXG5cbnZhciBub2RlX2hhbmxlcnMgPSB7fVxuXG5ub2RlX2hhbmxlcnNbMV0gPSBlbGVtZW50X25vZGVcbm5vZGVfaGFubGVyc1szXSA9IHRleHRfbm9kZVxuXG5mdW5jdGlvbiB1cGRhdGUoZGF0YSwgcm9vdCkge1xuICByb290ID0gcm9vdCB8fCB0aGlzLnRyZWVcblxuICBpZihyb290Lmhvb2tzKSB7XG4gICAgcm9vdC5ob29rcy5mb3JFYWNoKGZ1bmN0aW9uKHVwZGF0ZSkge1xuICAgICAgdXBkYXRlKGRhdGEpXG4gICAgfSlcbiAgfVxuXG4gIGlmKHJvb3QudXBkYXRlX2NoaWxkcmVuKSB7XG4gICAgcm9vdC51cGRhdGVfY2hpbGRyZW4oZGF0YSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVfY2hpbGRyZW4oZGF0YSkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICB1cGRhdGUoZGF0YSwgdGhpcy5jaGlsZHJlbltpXSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVfbm9kZShub2RlKSB7XG4gIHJldHVybiBub2RlX2hhbmxlcnNbbm9kZS5ub2RlVHlwZV0gP1xuICAgIG5vZGVfaGFubGVyc1tub2RlLm5vZGVUeXBlXS5jYWxsKHRoaXMsIG5vZGUpIDpcbiAgICBkZWZhdWx0X25vZGUuY2FsbCh0aGlzLCBub2RlKVxufVxuXG5mdW5jdGlvbiBhZGRfZmlsdGVyKG5hbWUsIGZpbHRlcikge1xuICBhbHRyLnByb3RvdHlwZS5maWx0ZXJzW25hbWVdID0gZmlsdGVyXG59XG5cbmZ1bmN0aW9uIGFkZF90YWcoYXR0ciwgdGFnKSB7XG4gIGFsdHIucHJvdG90eXBlLnRhZ3NbYXR0cl0gPSB0YWdcbiAgYWx0ci5wcm90b3R5cGUudGFnX2xpc3QucHVzaCh7XG4gICAgICBhdHRyOiBhdHRyXG4gICAgLCBjb25zdHJ1Y3RvcjogdGFnXG4gIH0pXG59XG5cbmZ1bmN0aW9uIG91dGVyX2h0bWwoKSB7XG4gIHJldHVybiB0aGlzLnJvb3Qub3V0ZXJIVE1MXG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRfbm9kZShlbCkge1xuICByZXR1cm4ge1xuICAgICAgZWw6IGVsXG4gICAgLCB1cGRhdGVfY2hpbGRyZW46IHRoaXMudXBkYXRlX2NoaWxkcmVuXG4gICAgLCBob29rczogW11cbiAgICAsIGNoaWxkcmVuOiBhZGRfY2hpbGRyZW4uY2FsbCh0aGlzKVxuICB9XG5cbiAgZnVuY3Rpb24gYWRkX2NoaWxkcmVuKCkge1xuICAgIHJldHVybiBbXS5tYXAuY2FsbChcbiAgICAgICAgZWwuY2hpbGROb2RlcyB8fCBbXVxuICAgICAgLCB0aGlzLmNyZWF0ZV9ub2RlLmJpbmQodGhpcylcbiAgICApLmZpbHRlcihCb29sZWFuKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZF90byhub2RlKSB7XG4gIGZvcih2YXIgaSA9IDAsIGwgPSB0aGlzLnJvb3Rfbm9kZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgbm9kZS5hcHBlbmRDaGlsZCh0aGlzLnJvb3Rfbm9kZXNbaV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gaW5jbHVkZShuYW1lLCB0ZW1wbGF0ZSkge1xuICByZXR1cm4gdGhpcy5pbmNsdWRlc1tuYW1lXSA9IHRlbXBsYXRlXG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xubW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwuYWx0ciA9IHJlcXVpcmUoJy4vaW5kZXgnKVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX2VsZW1lbnRfbm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVfZWxlbWVudF9ub2RlKGVsKSB7XG4gIHZhciBhbHRyX3RhZ3MgPSB7fVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGF0dHJcblxuICB2YXIgbm9kZSA9IHtcbiAgICAgIGVsOiBlbFxuICAgICwgdXBkYXRlX2NoaWxkcmVuOiB0aGlzLnVwZGF0ZV9jaGlsZHJlblxuICAgICwgaG9va3M6IFtdXG4gIH1cblxuICB2YXIgYXR0cnMgPSBBcnJheS5wcm90b3R5cGUuZmlsdGVyLmNhbGwoZWwuYXR0cmlidXRlcywgZnVuY3Rpb24oYXR0cikge1xuICAgIHJldHVybiBhbHRyLnRhZ3NbYXR0ci5uYW1lXSA/XG4gICAgICAoYWx0cl90YWdzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlKSAmJiBmYWxzZSA6XG4gICAgICB0cnVlXG4gIH0pXG5cbiAgYXR0cnMuZm9yRWFjaChmdW5jdGlvbihhdHRyKSB7XG4gICAgdmFyIGF0dHJfaG9vayA9IGFsdHIudGVtcGxhdGVfc3RyaW5nKGF0dHIudmFsdWUsIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKGF0dHIubmFtZSwgdmFsKVxuICAgIH0pXG5cbiAgICBpZihhdHRyX2hvb2spIHtcbiAgICAgIG5vZGUuaG9va3MucHVzaChhdHRyX2hvb2spXG4gICAgfVxuICB9KVxuXG4gIGZvcih2YXIgaSA9IDAsIGwgPSBhbHRyLnRhZ19saXN0Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGF0dHIgPSBhbHRyX3RhZ3NbYWx0ci50YWdfbGlzdFtpXS5hdHRyXVxuXG4gICAgaWYoYXR0cikge1xuICAgICAgYWx0ci50YWdfbGlzdFtpXS5jb25zdHJ1Y3Rvci5jYWxsKGFsdHIsIG5vZGUsIGF0dHIpXG4gICAgfVxuICB9XG5cbiAgbm9kZS5jaGlsZHJlbiA9IFtdLm1hcC5jYWxsKFxuICAgICAgZWwuY2hpbGROb2Rlc1xuICAgICwgYWx0ci5jcmVhdGVfbm9kZS5iaW5kKGFsdHIpXG4gICkuZmlsdGVyKEJvb2xlYW4pXG5cbiAgaWYobm9kZS5jaGlsZHJlbi5sZW5ndGggfHwgbm9kZS5ob29rcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gbm9kZVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFjY2Vzc29yLCBjaGFuZ2UpIHtcbiAgdmFyIHZhbCwgbnVtXG5cbiAgdmFyIGNoZWNrX251bSA9IHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCBmdW5jdGlvbihuZXdfbnVtKSB7XG4gICAgY2hhbmdlKChudW0gPSArbmV3X251bSkgKyAodmFsIHx8IDApKVxuICB9KVxuXG4gIHJldHVybiBmdW5jdGlvbiBhZGQobmV3X3ZhbCwgY29udGV4dCkge1xuICAgIHZhbCA9ICtuZXdfdmFsXG4gICAgY2hlY2tfbnVtKGNvbnRleHQpXG4gIH1cbn1cbiIsInZhciBpbmNsdWRlX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9pbmNsdWRlJylcbiAgLCBhZGRfZmlsdGVyID0gcmVxdWlyZSgnLi9maWx0ZXJzL2FkZCcpXG4gICwgdGV4dF90YWcgPSByZXF1aXJlKCcuL3RhZ3MvdGV4dCcpXG4gICwgaHRtbF90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaHRtbCcpXG4gICwgd2l0aF90YWcgPSByZXF1aXJlKCcuL3RhZ3Mvd2l0aCcpXG4gICwgZm9yX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9mb3InKVxuICAsIGlmX3RhZyA9IHJlcXVpcmUoJy4vdGFncy9pZicpXG4gICwgYWx0ciA9IHJlcXVpcmUoJy4vYWx0cicpXG5cbm1vZHVsZS5leHBvcnRzID0gYWx0clxuXG5hbHRyLmFkZF90YWcoJ2FsdHItaW5jbHVkZScsIGluY2x1ZGVfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLXRleHQnLCB0ZXh0X3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1odG1sJywgaHRtbF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItd2l0aCcsIHdpdGhfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWZvcicsIGZvcl90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItaWYnLCBpZl90YWcpXG5cbmFsdHIuYWRkX2ZpbHRlcignYWRkJywgYWRkX2ZpbHRlcilcbiIsIm1vZHVsZS5leHBvcnRzID0gbG9va3VwXG5cbmZ1bmN0aW9uIGxvb2t1cChwYXRoLCBkb25lKSB7XG4gIHZhciBwYXJ0cyA9IHBhdGggPyBwYXRoLnNwbGl0KCcuJykgOiBbXVxuXG4gIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBvYmogJiYgaSA8IGw7ICsraSkge1xuICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXVxuICAgIH1cblxuICAgIGlmKGkgPT09IGwpIHtcbiAgICAgIHJldHVybiBkb25lKG9iailcbiAgICB9XG5cbiAgICBkb25lKClcbiAgfVxufVxuIiwidmFyIGZvcl9yZWdleHAgPSAvXiguKj8pXFxzK2luXFxzKyguKiQpL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZvcl9oYW5kbGVyXG5cbmZ1bmN0aW9uIGZvcl9oYW5kbGVyKG5vZGUsIGFyZ3MpIHtcbiAgdmFyIHBhcnRzID0gYXJncy5tYXRjaChmb3JfcmVnZXhwKVxuICAgICwgdGVtcGxhdGUgPSBub2RlLmVsLmlubmVySFRNTFxuICAgICwgY2hpbGRyZW4gPSBbXVxuICAgICwgYWx0ciA9IHRoaXNcbiAgICAsIGl0ZW1zID0gW11cblxuICBpZighcGFydHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgZm9yIHRhZzogJyArIGFyZ3MpXG4gIH1cblxuICBub2RlLmVsLmlubmVySFRNTCA9ICcnXG5cbiAgdmFyIHByb3AgPSBwYXJ0c1sxXVxuICAgICwga2V5ID0gcGFydHNbMl1cblxuICBub2RlLmhvb2tzLnB1c2goYWx0ci5jcmVhdGVfYWNjZXNzb3Ioa2V5LCB1cGRhdGUpKVxuXG4gIG5vZGUudXBkYXRlX2NoaWxkcmVuID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHZhciBpdGVtX2RhdGFcblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaXRlbV9kYXRhID0gT2JqZWN0LmNyZWF0ZShkYXRhKVxuICAgICAgaXRlbV9kYXRhW3Byb3BdID0gZGF0YVtrZXldW2ldXG4gICAgICBpdGVtX2RhdGFbJyRpbmRleCddID0gaVxuICAgICAgYWx0ci51cGRhdGUoaXRlbV9kYXRhLCBub2RlLmNoaWxkcmVuW2ldKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShuZXdfaXRlbXMpIHtcbiAgICBpZighQXJyYXkuaXNBcnJheShuZXdfaXRlbXMpKSB7XG4gICAgICBuZXdfaXRlbXMgPSBbXVxuICAgIH1cblxuICAgIHZhciBuZXdfY2hpbGRyZW4gPSBuZXcgQXJyYXkobmV3X2l0ZW1zLmxlbmd0aClcbiAgICAgICwgcHJldiA9IG5vZGUuZWwuZmlyc3RDaGlsZFxuICAgICAgLCBvZmZzZXQgPSAwXG4gICAgICAsIGluZGV4XG4gICAgICAsIG5vZGVzXG5cbiAgICBub2RlLmNoaWxkcmVuID0gW11cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBuZXdfaXRlbXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBpbmRleCA9IGl0ZW1zLmluZGV4T2YobmV3X2l0ZW1zW2ldKVxuXG4gICAgICBpZihpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gKGNoaWxkcmVuLnNwbGljZShpbmRleCwgMSlbMF0pXG4gICAgICAgIGl0ZW1zLnNwbGljZShpbmRleCwgMSlcblxuICAgICAgICBpZihpbmRleCArIG9mZnNldCAhPT0gaSkge1xuICAgICAgICAgIHBsYWNlKG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICAgIH1cblxuICAgICAgICArK29mZnNldFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3X2NoaWxkcmVuW2ldID0gbWFrZV9jaGlsZHJlbigpXG4gICAgICAgIHBsYWNlKG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXMpXG4gICAgICAgICsrb2Zmc2V0XG4gICAgICB9XG5cbiAgICAgIG5vZGVzID0gbmV3X2NoaWxkcmVuW2ldLmRvbV9ub2Rlc1xuICAgICAgcHJldiA9IG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdLm5leHRTaWJsaW5nXG4gICAgICBub2RlcyA9IG5vZGVzLmNvbmNhdChuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzKVxuICAgICAgbm9kZS5jaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4uY29uY2F0KG5ld19jaGlsZHJlbltpXS5hbHRyX25vZGVzKVxuICAgIH1cblxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGNoaWxkcmVuW2ldLmRvbV9ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpXG4gICAgICB9KVxuICAgIH1cblxuICAgIGNoaWxkcmVuID0gbmV3X2NoaWxkcmVuLnNsaWNlKClcbiAgICBpdGVtcyA9IG5ld19pdGVtcy5zbGljZSgpXG5cbiAgICBmdW5jdGlvbiBwbGFjZShub2Rlcykge1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICBub2RlLmVsLmluc2VydEJlZm9yZShub2Rlc1tpXSwgcHJldilcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtYWtlX2NoaWxkcmVuKCkge1xuICAgIHZhciB0ZW1wID0gYWx0ci5kb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobm9kZS5lbC5uYW1lc3BhY2VVUkksICdkaXYnKVxuICAgICAgLCBhbHRyX25vZGVzXG4gICAgICAsIGRvbV9ub2Rlc1xuXG4gICAgdGVtcC5pbm5lckhUTUwgPSB0ZW1wbGF0ZVxuXG4gICAgZG9tX25vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGVtcC5jaGlsZE5vZGVzKVxuICAgIGFsdHJfbm9kZXMgPSBkb21fbm9kZXMubWFwKGFsdHIuY3JlYXRlX25vZGUuYmluZChhbHRyKSkuZmlsdGVyKEJvb2xlYW4pXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBkb21fbm9kZXM6IGRvbV9ub2Rlc1xuICAgICAgLCBhbHRyX25vZGVzOiBhbHRyX25vZGVzXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGh0bWxcblxuZnVuY3Rpb24gaHRtbChub2RlLCBhY2Nlc3Nvcikge1xuICBub2RlLmhvb2tzLnB1c2godGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHVwZGF0ZSkpXG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIG5vZGUuZWwuaW5uZXJIVE1MID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlmX3RhZ1xuXG5mdW5jdGlvbiBpZl90YWcobm9kZSwgYWNjZXNzb3IpIHtcbiAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5kb2N1bWVudC5jcmVhdGVDb21tZW50KCdhbHRyLWlmLXBsYWNlaG9sZGVyJylcbiAgICAsIHBhcmVudCA9IG5vZGUuZWwucGFyZW50Tm9kZVxuICAgICwgaGlkZGVuID0gbnVsbFxuXG4gIHBhcmVudC5pbnNlcnRCZWZvcmUocGxhY2Vob2xkZXIsIG5vZGUuZWwpXG4gIG5vZGUuaG9va3MucHVzaCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdG9nZ2xlKSlcblxuICBmdW5jdGlvbiBoaWRlKCkge1xuICAgIGlmKCFoaWRkZW4pIHtcbiAgICAgIGhpZGRlbiA9IG5vZGUuY2hpbGRyZW4gfHwgW11cbiAgICAgIG5vZGUuY2hpbGRyZW4gPSBbXVxuICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKG5vZGUuZWwpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2hvdygpIHtcbiAgICBpZihoaWRkZW4pIHtcbiAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUobm9kZS5lbCwgcGxhY2Vob2xkZXIpXG4gICAgICBub2RlLmNoaWxkcmVuID0gaGlkZGVuXG4gICAgICBoaWRkZW4gPSBudWxsXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdG9nZ2xlKHZhbCkge1xuICAgIHZhbCA/IHNob3coKSA6IGhpZGUoKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGluY2x1ZGVcblxuZnVuY3Rpb24gaW5jbHVkZShub2RlLCBuYW1lKSB7XG4gIG5vZGUuZWwuaW5uZXJIVE1MID0gdGhpcy5pbmNsdWRlc1tuYW1lXVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0ZXh0XG5cbmZ1bmN0aW9uIHRleHQobm9kZSwgYWNjZXNzb3IpIHtcbiAgbm9kZS5ob29rcy5wdXNoKHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBub2RlLmVsLnRleHRDb250ZW50ID0gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHZhbFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHdpdGhfdGFnXG5cbmZ1bmN0aW9uIHdpdGhfdGFnKG5vZGUsIGFjY2Vzc29yKSB7XG4gIG5vZGUudXBkYXRlX2NoaWxkcmVuID0gdGhpcy5jcmVhdGVfYWNjZXNzb3IoXG4gICAgICBhY2Nlc3NvclxuICAgICwgbm9kZS51cGRhdGVfY2hpbGRyZW4uYmluZChub2RlKVxuICApXG59XG4iLCJ2YXIgVEFHID0gL3t7XFxzKiguKj8pXFxzKn19L1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlX3N0cmluZ1xuXG5mdW5jdGlvbiB0ZW1wbGF0ZV9zdHJpbmcodGVtcGxhdGUsIGNoYW5nZSkge1xuICBpZighdGVtcGxhdGUubWF0Y2goVEFHKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRlbXBsYXRlXG4gICAgLCBwYXJ0cyA9IFtdXG4gICAgLCBob29rcyA9IFtdXG4gICAgLCB0aW1lclxuICAgICwgaW5kZXhcbiAgICAsIG5leHRcblxuICB3aGlsZShyZW1haW5pbmcgJiYgKG5leHQgPSByZW1haW5pbmcubWF0Y2goVEFHKSkpIHtcbiAgICBpZihpbmRleCA9IHJlbWFpbmluZy5pbmRleE9mKG5leHRbMF0pKSB7XG4gICAgICBwYXJ0cy5wdXNoKHJlbWFpbmluZy5zbGljZSgwLCBpbmRleCkpXG4gICAgfVxuXG4gICAgcGFydHMucHVzaCgnJylcbiAgICByZW1haW5pbmcgPSByZW1haW5pbmcuc2xpY2UoaW5kZXggKyBuZXh0WzBdLmxlbmd0aClcbiAgICBob29rcy5wdXNoKFxuICAgICAgICB0aGlzLmNyZWF0ZV9hY2Nlc3NvcihuZXh0WzFdLCBzZXRfcGFydC5iaW5kKHRoaXMsIHBhcnRzLmxlbmd0aCAtIDEpKVxuICAgIClcbiAgfVxuXG4gIHJldHVybiB1cGRhdGVcblxuICBmdW5jdGlvbiBzZXRfcGFydChpZHgsIHZhbCkge1xuICAgIHBhcnRzW2lkeF0gPSB2YWxcblxuICAgIGlmKHRoaXMuc3luYykge1xuICAgICAgcmV0dXJuIGNoYW5nZShwYXJ0cy5qb2luKCcnKSlcbiAgICB9XG5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpXG5cbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBjaGFuZ2UocGFydHMuam9pbignJykpXG4gICAgfSwgMClcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICBob29rKGRhdGEpXG4gICAgfSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVfdGV4dF9ub2RlXG5cbmZ1bmN0aW9uIGNyZWF0ZV90ZXh0X25vZGUoZWwpIHtcbiAgdmFyIGhvb2sgPSB0aGlzLnRlbXBsYXRlX3N0cmluZyhlbC50ZXh0Q29udGVudCwgdXBkYXRlKVxuXG4gIGlmKCFob29rKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4ge1xuICAgICAgZWw6IGVsXG4gICAgLCB0ZXh0OiBlbC50ZXh0Q29udGVudFxuICAgICwgaG9va3M6IFtob29rXVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKHZhbCkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsXG4gIH1cbn1cbiJdfQ==
