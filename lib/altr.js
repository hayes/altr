var accessors = require('altr-accessors')
  , EE = require('events').EventEmitter
  , batch = require('batch-queue')

var template_string = require('./template_string')
  , element_node = require('./element_node')
  , text_node = require('./text_node')
  , get_el = require('./get_element')
  , toString = require('./to_string')
  , replace = require('./replace')
  , render = require('./render')
  , insert = require('./insert')
  , remove = require('./remove')
  , raf = require('./raf')

var dom_module = 'micro-dom'

altr.filters = {}
altr.includes = {}
altr.render = render
altr.addTag = add_tag
altr.include = include
altr.addFilter = add_filter

module.exports = altr

function altr(root, data, sync, doc) {
  if(!(this instanceof altr)) {
    return new altr(root, data, sync, doc)
  }

  EE.call(this)
  this.sync = !!sync
  this.root = root
  this.document = doc || global.document || require(dom_module).document
  this.filters = Object.create(altr.filters)
  this.includes = Object.create(altr.includes)
  this.accessors = accessors(this.filters, false)
  this.batch = batch((function() {
    if(!this.sync) {
      raf(this.runBatch.bind(this))
    }
  }).bind(this))

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
    this.update(data, true)
  }
}

altr.prototype = Object.create(EE.prototype)
altr.prototype.constructor = altr

altr.prototype.templateString = template_string
altr.prototype.createAccessor = create_accessor
altr.prototype.updateNodes = update_nodes
altr.prototype.initNodes = init_nodes
altr.prototype.rootNodes = root_nodes
altr.prototype.addFilter = add_filter
altr.prototype.runBatch = run_batch
altr.prototype.initNode = init_node
altr.prototype.toString = toString
altr.prototype.getElement = get_el
altr.prototype.include = include
altr.prototype.replace = replace
altr.prototype.into = append_to
altr.prototype.update = update
altr.prototype.insert = insert
altr.prototype.remove = remove
altr.prototype.tagList = []
altr.prototype.tags = {}

var node_handlers = {}

node_handlers[1] = element_node
node_handlers[3] = text_node

function update(data, sync) {
  this.state = data
  this._update && this._update(data)

  if(sync || this.sync) {
    this.runBatch()
  }
}

function update_nodes(nodes) {
  var hooks = this.initNodes(nodes)
    , self = this

  return hooks.length ? update : null

  function update(data, ctx) {
    for(var i = 0, l = hooks.length; i < l; ++i) {
      hooks[i].call(self, data, ctx)
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
  return this.root.nodeType === this.document.DOCUMENT_FRAGMENT_NODE ?
    [].slice.call(this.root.childNodes) :
    [this.root]
}

function add_filter(name, filter) {
  altr.filters[name] = filter
}

function add_tag(attr, tag) {
  altr.prototype.tags[attr] = tag
  altr.prototype.tagList.push({
      attr: attr
    , constructor: tag
  })
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

function create_accessor(description, change, all) {
  return this.accessors.create(description, change, all || false)
}

function add_filter(name, fn) {
  return this.filters[name] = fn
}

function run_batch() {
  this.batch.run() && this.emit('update', this.state)
}
