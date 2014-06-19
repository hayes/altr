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
altr.prototype.getElement = get_el
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
    node.appendChild(get_el(root_nodes[i]))
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

function get_el(el) {
  while(el && el._altr_placeholder) {
    el = el._altr_placeholder
  }

  return el
}
