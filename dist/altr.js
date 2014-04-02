(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var lookup = require('./lookup')
  , accessor_types = []

var string_regexp = /^\s*(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")\s*/
  , ternary_regexp = /^\s*([^\?]+)\?([^\?:]+):(.*)\s*$/
  , equals_regexp = /^\s*([^=]+)(={2,3})(.*)\s*$/
  , filter_regexp = /^\s*([^(]+)\((.*)\)\s*$/
  , number_regexp = /^\s*(\d*(?:\.\d+)?)\s*$/

module.exports = accessor

add_type(ternary_regexp, create_ternary)
add_type(equals_regexp, create_equals)
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
    change(parts[2].length === 2 ? lhs == rhs : lhs === rhs)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FjY2Vzc29yLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL2FsdHIuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi9lbGVtZW50X25vZGUuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvZmlsdGVycy9hZGQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvaW5kZXguanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvbG9va3VwLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvZm9yLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaHRtbC5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL2lmLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RhZ3MvaW5jbHVkZS5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90YWdzL3RleHQuanMiLCIvVXNlcnMvbWljaGFlbGhheWVzL3dvcmsvYWx0ci9saWIvdGFncy93aXRoLmpzIiwiL1VzZXJzL21pY2hhZWxoYXllcy93b3JrL2FsdHIvbGliL3RlbXBsYXRlX3N0cmluZy5qcyIsIi9Vc2Vycy9taWNoYWVsaGF5ZXMvd29yay9hbHRyL2xpYi90ZXh0X25vZGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdElBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGxvb2t1cCA9IHJlcXVpcmUoJy4vbG9va3VwJylcbiAgLCBhY2Nlc3Nvcl90eXBlcyA9IFtdXG5cbnZhciBzdHJpbmdfcmVnZXhwID0gL15cXHMqKD86JygoPzpbXidcXFxcXXwoPzpcXFxcLikpKiknfFwiKCg/OlteXCJcXFxcXXwoPzpcXFxcLikpKilcIilcXHMqL1xuICAsIHRlcm5hcnlfcmVnZXhwID0gL15cXHMqKFteXFw/XSspXFw/KFteXFw/Ol0rKTooLiopXFxzKiQvXG4gICwgZXF1YWxzX3JlZ2V4cCA9IC9eXFxzKihbXj1dKykoPXsyLDN9KSguKilcXHMqJC9cbiAgLCBmaWx0ZXJfcmVnZXhwID0gL15cXHMqKFteKF0rKVxcKCguKilcXClcXHMqJC9cbiAgLCBudW1iZXJfcmVnZXhwID0gL15cXHMqKFxcZCooPzpcXC5cXGQrKT8pXFxzKiQvXG5cbm1vZHVsZS5leHBvcnRzID0gYWNjZXNzb3JcblxuYWRkX3R5cGUodGVybmFyeV9yZWdleHAsIGNyZWF0ZV90ZXJuYXJ5KVxuYWRkX3R5cGUoZXF1YWxzX3JlZ2V4cCwgY3JlYXRlX2VxdWFscylcbmFkZF90eXBlKGZpbHRlcl9yZWdleHAsIGNyZWF0ZV9maWx0ZXIpXG5hZGRfdHlwZShzdHJpbmdfcmVnZXhwLCBjcmVhdGVfc3RyaW5nX2FjY2Vzc29yKVxuYWRkX3R5cGUobnVtYmVyX3JlZ2V4cCwgY3JlYXRlX251bWJlcl9hY2Nlc3NvcilcbmFkZF90eXBlKC8uKi8sIGNyZWF0ZV9sb29rdXApXG5cbmZ1bmN0aW9uIGFkZF90eXBlKHJlZ2V4cCwgZm4pIHtcbiAgYWNjZXNzb3JfdHlwZXMucHVzaCh7dGVzdDogUmVnRXhwLnByb3RvdHlwZS50ZXN0LmJpbmQocmVnZXhwKSwgY3JlYXRlOiBmbn0pXG59XG5cbmZ1bmN0aW9uIGFjY2Vzc29yKGtleSwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0cyA9IGtleS5zcGxpdCgnfCcpXG4gICAgLCBjb250ZXh0XG4gICAgLCBuZXh0XG4gICAgLCBwcmV2XG5cbiAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHBhcnRzW2ldID0gYnVpbGRfcGFydC5jYWxsKHRoaXMsIHBhcnRzW2ldLCBjYWxsX25leHQuYmluZCh0aGlzLCBpICsgMSkpXG4gIH1cblxuICByZXR1cm4gY2FsbF9uZXh0LmJpbmQodGhpcywgMClcblxuICBmdW5jdGlvbiBjYWxsX25leHQoaSwgdmFsLCBjdHgpIHtcbiAgICBpZighaSkge1xuICAgICAgY29udGV4dCA9IGN0eCB8fCB2YWxcbiAgICB9XG5cbiAgICBpZihpID09PSBwYXJ0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBjaGFuZ2UuY2FsbCh0aGlzLCB2YWwsIGNvbnRleHQpXG4gICAgfVxuXG4gICAgcGFydHNbaV0odmFsLCBjb250ZXh0KVxuICB9XG5cbiAgZnVuY3Rpb24gZmluaXNoKHZhbCwgY29udGV4dCkge1xuICAgIGlmKHZhbCA9PT0gcHJldikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgcHJldiA9IHZhbFxuICAgIGNoYW5nZS5jYWxsKHRoaXMsIHZhbCwgY29udGV4dClcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZF9wYXJ0KHBhcnQsIGNoYW5nZSkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gYWNjZXNzb3JfdHlwZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYoYWNjZXNzb3JfdHlwZXNbaV0udGVzdChwYXJ0KSkge1xuICAgICAgcmV0dXJuIGFjY2Vzc29yX3R5cGVzW2ldLmNyZWF0ZS5jYWxsKHRoaXMsIHBhcnQsIGNoYW5nZSlcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX2xvb2t1cChwYXRoLCBjaGFuZ2UpIHtcbiAgaWYoIXBhdGguaW5kZXhPZignJGRhdGEnKSkge1xuICAgIHBhdGggPSBwYXRoLnNsaWNlKCckZGF0YS4nLmxlbmd0aClcbiAgfVxuXG4gIHJldHVybiBsb29rdXAocGF0aC5tYXRjaCgvXFxzKiguKlteXFxzXSlcXHMqLylbMV0sIGNoYW5nZSlcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2ZpbHRlcihmaWx0ZXJfbmFtZSwgY2hhbmdlKSB7XG4gIHZhciBwYXJ0cyA9IGZpbHRlcl9uYW1lLm1hdGNoKGZpbHRlcl9yZWdleHApXG4gICAgLCBmaWx0ZXIgPSB0aGlzLmZpbHRlcnNbcGFydHNbMV1dXG5cbiAgaWYoIWZpbHRlcikge1xuICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgZmlsdGVyOiAnICsgcGFydHNbMV0pXG4gIH1cblxuICByZXR1cm4gZmlsdGVyLmNhbGwodGhpcywgcGFydHNbMl0sIGNoYW5nZSlcbn1cblxuZnVuY3Rpb24gY3JlYXRlX3N0cmluZ19hY2Nlc3NvcihzdHJpbmcsIGNoYW5nZSkge1xuICB2YXIgbWF0Y2ggPSBzdHJpbmcubWF0Y2goc3RyaW5nX3JlZ2V4cClcblxuICBzdHJpbmcgPSBtYXRjaFsxXSB8fCBtYXRjaFsyXVxuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjaGFuZ2Uoc3RyaW5nKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9udW1iZXJfYWNjZXNzb3IobnVtLCBjaGFuZ2UpIHtcbiAgdmFyIG1hdGNoID0gbnVtLm1hdGNoKG51bWJlcl9yZWdleHApXG5cbiAgbnVtID0gK21hdGNoWzFdXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNoYW5nZShudW0pXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX3Rlcm5hcnkocGFydHMsIGNoYW5nZSkge1xuICBwYXJ0cyA9IHBhcnRzLm1hdGNoKHRlcm5hcnlfcmVnZXhwKVxuXG4gIHZhciBub3QgPSBhY2Nlc3NvcihwYXJ0c1szXSwgY2hhbmdlKVxuICAgICwgb2sgPSBhY2Nlc3NvcihwYXJ0c1syXSwgY2hhbmdlKVxuXG4gIHJldHVybiBhY2Nlc3NvcihwYXJ0c1sxXSwgdXBkYXRlKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwsIGNvbnRleHQpIHtcbiAgICB2YWwgPyBvayhjb250ZXh0KSA6IG5vdChjb250ZXh0KVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZV9lcXVhbHMocGFydHMsIGNoYW5nZSkge1xuICBwYXJ0cyA9IHBhcnRzLm1hdGNoKGVxdWFsc19yZWdleHApXG5cbiAgdmFyIGNoZWNrX2xocyA9IGFjY2Vzc29yKHBhcnRzWzFdLCB1cGRhdGUuYmluZChudWxsLCBmYWxzZSkpXG4gICAgLCBjaGVja19yaHMgPSBhY2Nlc3NvcihwYXJ0c1szXSwgdXBkYXRlLmJpbmQobnVsbCwgdHJ1ZSkpXG4gICAgLCBsaHMgPSB7fVxuICAgICwgcmhzID0ge31cblxuICByZXR1cm4gY29tcGFyZVxuXG4gIGZ1bmN0aW9uIGNvbXBhcmUoZGF0YSkge1xuICAgIGNoZWNrX2xocyhkYXRhKVxuICAgIGNoZWNrX3JocyhkYXRhKVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGlzX3JocywgdmFsKSB7XG4gICAgaXNfcmhzID8gcmhzID0gdmFsIDogbGhzID0gdmFsXG4gICAgY2hhbmdlKHBhcnRzWzJdLmxlbmd0aCA9PT0gMiA/IGxocyA9PSByaHMgOiBsaHMgPT09IHJocylcbiAgfVxufVxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIHRlbXBsYXRlX3N0cmluZyA9IHJlcXVpcmUoJy4vdGVtcGxhdGVfc3RyaW5nJylcbiAgLCBlbGVtZW50X25vZGUgPSByZXF1aXJlKCcuL2VsZW1lbnRfbm9kZScpXG4gICwgY3JlYXRlX2FjY2Vzc29yID0gcmVxdWlyZSgnLi9hY2Nlc3NvcicpXG4gICwgdGV4dF9ub2RlID0gcmVxdWlyZSgnLi90ZXh0X25vZGUnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcbmFsdHIuYWRkX3RhZyA9IGFkZF90YWdcbmFsdHIuYWRkX2ZpbHRlciA9IGFkZF9maWx0ZXJcblxuZnVuY3Rpb24gYWx0cihyb290LCBkYXRhLCBkb2MsIHN5bmMpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgYWx0cikpIHtcbiAgICByZXR1cm4gbmV3IGFsdHIocm9vdCwgZGF0YSwgZG9jLCBzeW5jKVxuICB9XG5cbiAgdGhpcy5yb290ID0gcm9vdFxuICB0aGlzLnN5bmMgPSBzeW5jXG4gIHRoaXMuZG9jdW1lbnQgPSBkb2MgfHwgZ2xvYmFsLmRvY3VtZW50XG4gIHRoaXMuaW5jbHVkZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMuaW5jbHVkZXMpXG5cbiAgaWYoZ2xvYmFsLkJ1ZmZlciAmJiByb290IGluc3RhbmNlb2YgZ2xvYmFsLkJ1ZmZlcikge1xuICAgIHJvb3QgPSByb290LnRvU3RyaW5nKClcbiAgfVxuXG4gIGlmKHR5cGVvZiByb290ID09PSAnc3RyaW5nJykge1xuICAgIHZhciB0ZW1wID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuXG4gICAgdGVtcC5pbm5lckhUTUwgPSByb290XG4gICAgdGhpcy5yb290ID0gdGhpcy5kb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcblxuICAgIHdoaWxlKHRlbXAuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy5yb290LmFwcGVuZENoaWxkKHRlbXAuZmlyc3RDaGlsZClcbiAgICB9XG4gIH1cblxuICB0aGlzLnJvb3Rfbm9kZXMgPSB0aGlzLnJvb3Qubm9kZVR5cGUgPT09IDExID9cbiAgICBbXS5zbGljZS5jYWxsKHRoaXMucm9vdC5jaGlsZE5vZGVzKSA6IFt0aGlzLnJvb3RdXG5cbiAgdGhpcy50cmVlID0gdGhpcy5jcmVhdGVfbm9kZSh7Y2hpbGROb2RlczogdGhpcy5yb290X25vZGVzfSlcblxuICBpZihkYXRhKSB7XG4gICAgdGhpcy51cGRhdGUoZGF0YSlcbiAgfVxufVxuXG5hbHRyLnByb3RvdHlwZS50ZW1wbGF0ZV9zdHJpbmcgPSB0ZW1wbGF0ZV9zdHJpbmdcbmFsdHIucHJvdG90eXBlLmNyZWF0ZV9hY2Nlc3NvciA9IGNyZWF0ZV9hY2Nlc3NvclxuYWx0ci5wcm90b3R5cGUudXBkYXRlX2NoaWxkcmVuID0gdXBkYXRlX2NoaWxkcmVuXG5hbHRyLnByb3RvdHlwZS5jcmVhdGVfbm9kZSA9IGNyZWF0ZV9ub2RlXG5hbHRyLnByb3RvdHlwZS50b1N0cmluZyA9IG91dGVyX2h0bWxcbmFsdHIucHJvdG90eXBlLmluY2x1ZGUgPSBpbmNsdWRlXG5hbHRyLnByb3RvdHlwZS5pbnRvID0gYXBwZW5kX3RvXG5hbHRyLnByb3RvdHlwZS51cGRhdGUgPSB1cGRhdGVcblxuYWx0ci5wcm90b3R5cGUuaW5jbHVkZXMgPSB7fVxuYWx0ci5wcm90b3R5cGUudGFnX2xpc3QgPSBbXVxuYWx0ci5wcm90b3R5cGUuZmlsdGVycyA9IHt9XG5hbHRyLnByb3RvdHlwZS50YWdzID0ge31cblxuYWx0ci5pbmNsdWRlID0gaW5jbHVkZS5iaW5kKGFsdHIucHJvdG90eXBlKVxuXG52YXIgbm9kZV9oYW5sZXJzID0ge31cblxubm9kZV9oYW5sZXJzWzFdID0gZWxlbWVudF9ub2RlXG5ub2RlX2hhbmxlcnNbM10gPSB0ZXh0X25vZGVcblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEsIHJvb3QpIHtcbiAgcm9vdCA9IHJvb3QgfHwgdGhpcy50cmVlXG5cbiAgaWYocm9vdC5ob29rcykge1xuICAgIHJvb3QuaG9va3MuZm9yRWFjaChmdW5jdGlvbih1cGRhdGUpIHtcbiAgICAgIHVwZGF0ZShkYXRhKVxuICAgIH0pXG4gIH1cblxuICBpZihyb290LnVwZGF0ZV9jaGlsZHJlbikge1xuICAgIHJvb3QudXBkYXRlX2NoaWxkcmVuKGRhdGEpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlX2NoaWxkcmVuKGRhdGEpIHtcbiAgZm9yKHZhciBpID0gMCwgbCA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgdXBkYXRlKGRhdGEsIHRoaXMuY2hpbGRyZW5baV0pXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlX25vZGUobm9kZSkge1xuICByZXR1cm4gbm9kZV9oYW5sZXJzW25vZGUubm9kZVR5cGVdID9cbiAgICBub2RlX2hhbmxlcnNbbm9kZS5ub2RlVHlwZV0uY2FsbCh0aGlzLCBub2RlKSA6XG4gICAgZGVmYXVsdF9ub2RlLmNhbGwodGhpcywgbm9kZSlcbn1cblxuZnVuY3Rpb24gYWRkX2ZpbHRlcihuYW1lLCBmaWx0ZXIpIHtcbiAgYWx0ci5wcm90b3R5cGUuZmlsdGVyc1tuYW1lXSA9IGZpbHRlclxufVxuXG5mdW5jdGlvbiBhZGRfdGFnKGF0dHIsIHRhZykge1xuICBhbHRyLnByb3RvdHlwZS50YWdzW2F0dHJdID0gdGFnXG4gIGFsdHIucHJvdG90eXBlLnRhZ19saXN0LnB1c2goe1xuICAgICAgYXR0cjogYXR0clxuICAgICwgY29uc3RydWN0b3I6IHRhZ1xuICB9KVxufVxuXG5mdW5jdGlvbiBvdXRlcl9odG1sKCkge1xuICByZXR1cm4gdGhpcy5yb290Lm91dGVySFRNTFxufVxuXG5mdW5jdGlvbiBkZWZhdWx0X25vZGUoZWwpIHtcbiAgcmV0dXJuIHtcbiAgICAgIGVsOiBlbFxuICAgICwgdXBkYXRlX2NoaWxkcmVuOiB0aGlzLnVwZGF0ZV9jaGlsZHJlblxuICAgICwgaG9va3M6IFtdXG4gICAgLCBjaGlsZHJlbjogYWRkX2NoaWxkcmVuLmNhbGwodGhpcylcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZF9jaGlsZHJlbigpIHtcbiAgICByZXR1cm4gW10ubWFwLmNhbGwoXG4gICAgICAgIGVsLmNoaWxkTm9kZXMgfHwgW11cbiAgICAgICwgdGhpcy5jcmVhdGVfbm9kZS5iaW5kKHRoaXMpXG4gICAgKS5maWx0ZXIoQm9vbGVhbilcbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBlbmRfdG8obm9kZSkge1xuICBmb3IodmFyIGkgPSAwLCBsID0gdGhpcy5yb290X25vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQodGhpcy5yb290X25vZGVzW2ldKVxuICB9XG59XG5cbmZ1bmN0aW9uIGluY2x1ZGUobmFtZSwgdGVtcGxhdGUpIHtcbiAgcmV0dXJuIHRoaXMuaW5jbHVkZXNbbmFtZV0gPSB0ZW1wbGF0ZVxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbm1vZHVsZS5leHBvcnRzID0gZ2xvYmFsLmFsdHIgPSByZXF1aXJlKCcuL2luZGV4JylcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZV9lbGVtZW50X25vZGVcblxuZnVuY3Rpb24gY3JlYXRlX2VsZW1lbnRfbm9kZShlbCkge1xuICB2YXIgYWx0cl90YWdzID0ge31cbiAgICAsIGFsdHIgPSB0aGlzXG4gICAgLCBhdHRyXG5cbiAgdmFyIG5vZGUgPSB7XG4gICAgICBlbDogZWxcbiAgICAsIHVwZGF0ZV9jaGlsZHJlbjogdGhpcy51cGRhdGVfY2hpbGRyZW5cbiAgICAsIGhvb2tzOiBbXVxuICB9XG5cbiAgdmFyIGF0dHJzID0gQXJyYXkucHJvdG90eXBlLmZpbHRlci5jYWxsKGVsLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKGF0dHIpIHtcbiAgICByZXR1cm4gYWx0ci50YWdzW2F0dHIubmFtZV0gP1xuICAgICAgKGFsdHJfdGFnc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZSkgJiYgZmFsc2UgOlxuICAgICAgdHJ1ZVxuICB9KVxuXG4gIGF0dHJzLmZvckVhY2goZnVuY3Rpb24oYXR0cikge1xuICAgIHZhciBhdHRyX2hvb2sgPSBhbHRyLnRlbXBsYXRlX3N0cmluZyhhdHRyLnZhbHVlLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZShhdHRyLm5hbWUsIHZhbClcbiAgICB9KVxuXG4gICAgaWYoYXR0cl9ob29rKSB7XG4gICAgICBub2RlLmhvb2tzLnB1c2goYXR0cl9ob29rKVxuICAgIH1cbiAgfSlcblxuICBmb3IodmFyIGkgPSAwLCBsID0gYWx0ci50YWdfbGlzdC5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBhdHRyID0gYWx0cl90YWdzW2FsdHIudGFnX2xpc3RbaV0uYXR0cl1cblxuICAgIGlmKGF0dHIpIHtcbiAgICAgIGFsdHIudGFnX2xpc3RbaV0uY29uc3RydWN0b3IuY2FsbChhbHRyLCBub2RlLCBhdHRyKVxuICAgIH1cbiAgfVxuXG4gIG5vZGUuY2hpbGRyZW4gPSBbXS5tYXAuY2FsbChcbiAgICAgIGVsLmNoaWxkTm9kZXNcbiAgICAsIGFsdHIuY3JlYXRlX25vZGUuYmluZChhbHRyKVxuICApLmZpbHRlcihCb29sZWFuKVxuXG4gIGlmKG5vZGUuY2hpbGRyZW4ubGVuZ3RoIHx8IG5vZGUuaG9va3MubGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5vZGVcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhY2Nlc3NvciwgY2hhbmdlKSB7XG4gIHZhciB2YWwsIG51bVxuXG4gIHZhciBjaGVja19udW0gPSB0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgZnVuY3Rpb24obmV3X251bSkge1xuICAgIGNoYW5nZSgobnVtID0gK25ld19udW0pICsgKHZhbCB8fCAwKSlcbiAgfSlcblxuICByZXR1cm4gZnVuY3Rpb24gYWRkKG5ld192YWwsIGNvbnRleHQpIHtcbiAgICB2YWwgPSArbmV3X3ZhbFxuICAgIGNoZWNrX251bShjb250ZXh0KVxuICB9XG59XG4iLCJ2YXIgaW5jbHVkZV90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaW5jbHVkZScpXG4gICwgYWRkX2ZpbHRlciA9IHJlcXVpcmUoJy4vZmlsdGVycy9hZGQnKVxuICAsIHRleHRfdGFnID0gcmVxdWlyZSgnLi90YWdzL3RleHQnKVxuICAsIGh0bWxfdGFnID0gcmVxdWlyZSgnLi90YWdzL2h0bWwnKVxuICAsIHdpdGhfdGFnID0gcmVxdWlyZSgnLi90YWdzL3dpdGgnKVxuICAsIGZvcl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvZm9yJylcbiAgLCBpZl90YWcgPSByZXF1aXJlKCcuL3RhZ3MvaWYnKVxuICAsIGFsdHIgPSByZXF1aXJlKCcuL2FsdHInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsdHJcblxuYWx0ci5hZGRfdGFnKCdhbHRyLWluY2x1ZGUnLCBpbmNsdWRlX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci10ZXh0JywgdGV4dF90YWcpXG5hbHRyLmFkZF90YWcoJ2FsdHItaHRtbCcsIGh0bWxfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLXdpdGgnLCB3aXRoX3RhZylcbmFsdHIuYWRkX3RhZygnYWx0ci1mb3InLCBmb3JfdGFnKVxuYWx0ci5hZGRfdGFnKCdhbHRyLWlmJywgaWZfdGFnKVxuXG5hbHRyLmFkZF9maWx0ZXIoJ2FkZCcsIGFkZF9maWx0ZXIpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGxvb2t1cFxuXG5mdW5jdGlvbiBsb29rdXAocGF0aCwgZG9uZSkge1xuICB2YXIgcGFydHMgPSBwYXRoID8gcGF0aC5zcGxpdCgnLicpIDogW11cblxuICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgZm9yKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgb2JqICYmIGkgPCBsOyArK2kpIHtcbiAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV1cbiAgICB9XG5cbiAgICBpZihpID09PSBsKSB7XG4gICAgICByZXR1cm4gZG9uZShvYmopXG4gICAgfVxuXG4gICAgZG9uZSgpXG4gIH1cbn1cbiIsInZhciBmb3JfcmVnZXhwID0gL14oLio/KVxccytpblxccysoLiokKS9cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JfaGFuZGxlclxuXG5mdW5jdGlvbiBmb3JfaGFuZGxlcihub2RlLCBhcmdzKSB7XG4gIHZhciBwYXJ0cyA9IGFyZ3MubWF0Y2goZm9yX3JlZ2V4cClcbiAgICAsIHRlbXBsYXRlID0gbm9kZS5lbC5pbm5lckhUTUxcbiAgICAsIGNoaWxkcmVuID0gW11cbiAgICAsIGFsdHIgPSB0aGlzXG4gICAgLCBpdGVtcyA9IFtdXG5cbiAgaWYoIXBhcnRzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGZvciB0YWc6ICcgKyBhcmdzKVxuICB9XG5cbiAgbm9kZS5lbC5pbm5lckhUTUwgPSAnJ1xuXG4gIHZhciBwcm9wID0gcGFydHNbMV1cbiAgICAsIGtleSA9IHBhcnRzWzJdXG5cbiAgbm9kZS5ob29rcy5wdXNoKGFsdHIuY3JlYXRlX2FjY2Vzc29yKGtleSwgdXBkYXRlKSlcblxuICBub2RlLnVwZGF0ZV9jaGlsZHJlbiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgaXRlbV9kYXRhXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgIGl0ZW1fZGF0YSA9IE9iamVjdC5jcmVhdGUoZGF0YSlcbiAgICAgIGl0ZW1fZGF0YVtwcm9wXSA9IGRhdGFba2V5XVtpXVxuICAgICAgaXRlbV9kYXRhWyckaW5kZXgnXSA9IGlcbiAgICAgIGFsdHIudXBkYXRlKGl0ZW1fZGF0YSwgbm9kZS5jaGlsZHJlbltpXSlcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUobmV3X2l0ZW1zKSB7XG4gICAgaWYoIUFycmF5LmlzQXJyYXkobmV3X2l0ZW1zKSkge1xuICAgICAgbmV3X2l0ZW1zID0gW11cbiAgICB9XG5cbiAgICB2YXIgbmV3X2NoaWxkcmVuID0gbmV3IEFycmF5KG5ld19pdGVtcy5sZW5ndGgpXG4gICAgICAsIHByZXYgPSBub2RlLmVsLmZpcnN0Q2hpbGRcbiAgICAgICwgb2Zmc2V0ID0gMFxuICAgICAgLCBpbmRleFxuICAgICAgLCBub2Rlc1xuXG4gICAgbm9kZS5jaGlsZHJlbiA9IFtdXG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gbmV3X2l0ZW1zLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgaW5kZXggPSBpdGVtcy5pbmRleE9mKG5ld19pdGVtc1tpXSlcblxuICAgICAgaWYoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IChjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpWzBdKVxuICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXgsIDEpXG5cbiAgICAgICAgaWYoaW5kZXggKyBvZmZzZXQgIT09IGkpIHtcbiAgICAgICAgICBwbGFjZShuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzKVxuICAgICAgICB9XG5cbiAgICAgICAgKytvZmZzZXRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld19jaGlsZHJlbltpXSA9IG1ha2VfY2hpbGRyZW4oKVxuICAgICAgICBwbGFjZShuZXdfY2hpbGRyZW5baV0uZG9tX25vZGVzKVxuICAgICAgICArK29mZnNldFxuICAgICAgfVxuXG4gICAgICBub2RlcyA9IG5ld19jaGlsZHJlbltpXS5kb21fbm9kZXNcbiAgICAgIHByZXYgPSBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXS5uZXh0U2libGluZ1xuICAgICAgbm9kZXMgPSBub2Rlcy5jb25jYXQobmV3X2NoaWxkcmVuW2ldLmRvbV9ub2RlcylcbiAgICAgIG5vZGUuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLmNvbmNhdChuZXdfY2hpbGRyZW5baV0uYWx0cl9ub2RlcylcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICBjaGlsZHJlbltpXS5kb21fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBjaGlsZHJlbiA9IG5ld19jaGlsZHJlbi5zbGljZSgpXG4gICAgaXRlbXMgPSBuZXdfaXRlbXMuc2xpY2UoKVxuXG4gICAgZnVuY3Rpb24gcGxhY2Uobm9kZXMpIHtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgbm9kZS5lbC5pbnNlcnRCZWZvcmUobm9kZXNbaV0sIHByZXYpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZV9jaGlsZHJlbigpIHtcbiAgICB2YXIgdGVtcCA9IGFsdHIuZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5vZGUuZWwubmFtZXNwYWNlVVJJLCAnZGl2JylcbiAgICAgICwgYWx0cl9ub2Rlc1xuICAgICAgLCBkb21fbm9kZXNcblxuICAgIHRlbXAuaW5uZXJIVE1MID0gdGVtcGxhdGVcblxuICAgIGRvbV9ub2RlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRlbXAuY2hpbGROb2RlcylcbiAgICBhbHRyX25vZGVzID0gZG9tX25vZGVzLm1hcChhbHRyLmNyZWF0ZV9ub2RlLmJpbmQoYWx0cikpLmZpbHRlcihCb29sZWFuKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZG9tX25vZGVzOiBkb21fbm9kZXNcbiAgICAgICwgYWx0cl9ub2RlczogYWx0cl9ub2Rlc1xuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBodG1sXG5cbmZ1bmN0aW9uIGh0bWwobm9kZSwgYWNjZXNzb3IpIHtcbiAgbm9kZS5ob29rcy5wdXNoKHRoaXMuY3JlYXRlX2FjY2Vzc29yKGFjY2Vzc29yLCB1cGRhdGUpKVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBub2RlLmVsLmlubmVySFRNTCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpZl90YWdcblxuZnVuY3Rpb24gaWZfdGFnKG5vZGUsIGFjY2Vzc29yKSB7XG4gIHZhciBwbGFjZWhvbGRlciA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnYWx0ci1pZi1wbGFjZWhvbGRlcicpXG4gICAgLCBwYXJlbnQgPSBub2RlLmVsLnBhcmVudE5vZGVcbiAgICAsIGhpZGRlbiA9IG51bGxcblxuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCBub2RlLmVsKVxuICBub2RlLmhvb2tzLnB1c2godGhpcy5jcmVhdGVfYWNjZXNzb3IoYWNjZXNzb3IsIHRvZ2dsZSkpXG5cbiAgZnVuY3Rpb24gaGlkZSgpIHtcbiAgICBpZighaGlkZGVuKSB7XG4gICAgICBoaWRkZW4gPSBub2RlLmNoaWxkcmVuIHx8IFtdXG4gICAgICBub2RlLmNoaWxkcmVuID0gW11cbiAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChub2RlLmVsKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3coKSB7XG4gICAgaWYoaGlkZGVuKSB7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUuZWwsIHBsYWNlaG9sZGVyKVxuICAgICAgbm9kZS5jaGlsZHJlbiA9IGhpZGRlblxuICAgICAgaGlkZGVuID0gbnVsbFxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRvZ2dsZSh2YWwpIHtcbiAgICB2YWwgPyBzaG93KCkgOiBoaWRlKClcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpbmNsdWRlXG5cbmZ1bmN0aW9uIGluY2x1ZGUobm9kZSwgbmFtZSkge1xuICBub2RlLmVsLmlubmVySFRNTCA9IHRoaXMuaW5jbHVkZXNbbmFtZV1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdGV4dFxuXG5mdW5jdGlvbiB0ZXh0KG5vZGUsIGFjY2Vzc29yKSB7XG4gIG5vZGUuaG9va3MucHVzaCh0aGlzLmNyZWF0ZV9hY2Nlc3NvcihhY2Nlc3NvciwgdXBkYXRlKSlcblxuICBmdW5jdGlvbiB1cGRhdGUodmFsKSB7XG4gICAgbm9kZS5lbC50ZXh0Q29udGVudCA9IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnID8gJycgOiB2YWxcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3aXRoX3RhZ1xuXG5mdW5jdGlvbiB3aXRoX3RhZyhub2RlLCBhY2Nlc3Nvcikge1xuICBub2RlLnVwZGF0ZV9jaGlsZHJlbiA9IHRoaXMuY3JlYXRlX2FjY2Vzc29yKFxuICAgICAgYWNjZXNzb3JcbiAgICAsIG5vZGUudXBkYXRlX2NoaWxkcmVuLmJpbmQobm9kZSlcbiAgKVxufVxuIiwidmFyIFRBRyA9IC97e1xccyooLio/KVxccyp9fS9cblxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZV9zdHJpbmdcblxuZnVuY3Rpb24gdGVtcGxhdGVfc3RyaW5nKHRlbXBsYXRlLCBjaGFuZ2UpIHtcbiAgaWYoIXRlbXBsYXRlLm1hdGNoKFRBRykpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0ZW1wbGF0ZVxuICAgICwgcGFydHMgPSBbXVxuICAgICwgaG9va3MgPSBbXVxuICAgICwgdGltZXJcbiAgICAsIGluZGV4XG4gICAgLCBuZXh0XG5cbiAgd2hpbGUocmVtYWluaW5nICYmIChuZXh0ID0gcmVtYWluaW5nLm1hdGNoKFRBRykpKSB7XG4gICAgaWYoaW5kZXggPSByZW1haW5pbmcuaW5kZXhPZihuZXh0WzBdKSkge1xuICAgICAgcGFydHMucHVzaChyZW1haW5pbmcuc2xpY2UoMCwgaW5kZXgpKVxuICAgIH1cblxuICAgIHBhcnRzLnB1c2goJycpXG4gICAgcmVtYWluaW5nID0gcmVtYWluaW5nLnNsaWNlKGluZGV4ICsgbmV4dFswXS5sZW5ndGgpXG4gICAgaG9va3MucHVzaChcbiAgICAgICAgdGhpcy5jcmVhdGVfYWNjZXNzb3IobmV4dFsxXSwgc2V0X3BhcnQuYmluZCh0aGlzLCBwYXJ0cy5sZW5ndGggLSAxKSlcbiAgICApXG4gIH1cblxuICByZXR1cm4gdXBkYXRlXG5cbiAgZnVuY3Rpb24gc2V0X3BhcnQoaWR4LCB2YWwpIHtcbiAgICBwYXJ0c1tpZHhdID0gdmFsXG5cbiAgICBpZih0aGlzLnN5bmMpIHtcbiAgICAgIHJldHVybiBjaGFuZ2UocGFydHMuam9pbignJykpXG4gICAgfVxuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuXG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgY2hhbmdlKHBhcnRzLmpvaW4oJycpKVxuICAgIH0sIDApXG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgIGhvb2tzLmZvckVhY2goZnVuY3Rpb24oaG9vaykge1xuICAgICAgaG9vayhkYXRhKVxuICAgIH0pXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gY3JlYXRlX3RleHRfbm9kZVxuXG5mdW5jdGlvbiBjcmVhdGVfdGV4dF9ub2RlKGVsKSB7XG4gIHZhciBob29rID0gdGhpcy50ZW1wbGF0ZV9zdHJpbmcoZWwudGV4dENvbnRlbnQsIHVwZGF0ZSlcblxuICBpZighaG9vaykge1xuICAgIHJldHVyblxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAgIGVsOiBlbFxuICAgICwgdGV4dDogZWwudGV4dENvbnRlbnRcbiAgICAsIGhvb2tzOiBbaG9va11cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSh2YWwpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHZhbFxuICB9XG59XG4iXX0=
