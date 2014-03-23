;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
var template_string = require('./template_string')
  , element_node = require('./element_node')
  , create_accessor = require('./accessor')
  , text_node = require('./text_node')

module.exports = altr
altr.add_tag = add_tag
altr.add_filter = add_filter

function altr(root, data) {
  if(!(this instanceof altr)) {
    return new altr(root, data)
  }

  this.tree = this.create_node(root)

  if(data) {
    this.update(data)
  }
}

altr.prototype.template_string = template_string
altr.prototype.create_accessor = create_accessor
altr.prototype.update_children = update_children
altr.prototype.create_node = create_node
altr.prototype.update = update

altr.prototype.tag_list = []
altr.prototype.filters = {}
altr.prototype.tags = {}

var node_hanlers = {}

node_hanlers[document.ELEMENT_NODE] = element_node
node_hanlers[document.TEXT_NODE] = text_node

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

},{"./accessor":1,"./element_node":4,"./template_string":13,"./text_node":14}],3:[function(require,module,exports){
module.exports = window.altr = require('./index')

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
      attr.value = val
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
var add_filter = require('./filters/add')
  , text_tag = require('./tags/text')
  , html_tag = require('./tags/html')
  , with_tag = require('./tags/with')
  , for_tag = require('./tags/for')
  , if_tag = require('./tags/if')
  , altr = require('./altr')

module.exports = altr

altr.add_tag('altr-text', text_tag)
altr.add_tag('altr-html', html_tag)
altr.add_tag('altr-with', with_tag)
altr.add_tag('altr-for', for_tag)
altr.add_tag('altr-if', if_tag)

altr.add_filter('add', add_filter)

},{"./altr":2,"./filters/add":5,"./tags/for":8,"./tags/html":9,"./tags/if":10,"./tags/text":11,"./tags/with":12}],7:[function(require,module,exports){
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
    var temp = document.createElementNS(node.el.namespaceURI, 'div')
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
  var hidden = document.createDocumentFragment()

  node.hooks.push(this.create_accessor(accessor, toggle))

  function hide() {
    for(var i = 0, len = node.el.childNodes.length; i < len; ++i) {
      hidden.appendChild(node.el.childNodes[i])
    }

    node.hidden_children = node.children
    node.children = []
  }

  function show() {
    if(node.hidden_children) {
      node.children = node.hidden_children
    }

    node.el.appendChild(hidden)
  }

  function toggle(val) {
    if(!val) {
      return hide()
    }

    show()
  }
}

},{}],11:[function(require,module,exports){
module.exports = text

function text(node, accessor) {
  node.hooks.push(this.create_accessor(accessor, update))

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
        this.create_accessor(next[1], set_part.bind(null, parts.length - 1))
    )
  }

  return update

  function set_part(idx, val) {
    parts[idx] = val

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

},{}],14:[function(require,module,exports){
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
;