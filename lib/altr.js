var EE = require('events').EventEmitter
var batch = require('batch-queue')
var dirtybit = require('dirtybit')

var templateString = require('./template-string')
var elementNode = require('./element-node')
var mergeHooks = require('./merge-hooks')
var textNode = require('./text-node')
var toString = require('./to-string')
var runHooks = require('./run-hooks')
var getEl = require('./get-element')
var destroy = require('./destroy')
var render = require('./render')
var remove = require('./remove')
var raf = require('./raf')

// dynamic require so it does not make it into the browserify bundle
var domModule = 'micro-dom'

altr.filters = {}
altr.includes = {}
altr.decorators = {}
altr.render = render
altr.addTag = addTag
altr.include = include
altr.addFilter = addFilter
altr.addDecorator = addDecorator

module.exports = altr

function altr(root, data, sync, doc) {
  if(!(this instanceof altr)) {
    return new altr(root, data, sync, doc)
  }

  this.sync = !!sync
  this.root = root
  this.document = doc || global.document || require(domModule).document
  this.filters = Object.create(altr.filters)
  this.includes = Object.create(altr.includes)
  this.decorators = Object.create(altr.decorators)
  this.lookups = dirtybit(data, {filters: this.filters})
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

  this.children = this.initNodes(this.rootNodes(), this.lookups)
  this.runHooks(this.children.hooks, 'insert')
  this.runBatch()
}

altr.prototype = Object.create(EE.prototype)
altr.prototype.constructor = altr

altr.prototype.templateString = templateString
altr.prototype.addDecorator = addDecorator
altr.prototype.mergeHooks = mergeHooks
altr.prototype.initNodes = initNodes
altr.prototype.rootNodes = rootNodes
altr.prototype.addFilter = addFilter
altr.prototype.runBatch = runBatch
altr.prototype.toString = toString
altr.prototype.runHooks = runHooks
altr.prototype.getElement = getEl
altr.prototype.include = include
altr.prototype.destroy = destroy
altr.prototype.remove = remove
altr.prototype.into = appendTo
altr.prototype.update = update
altr.prototype.tagList = []
altr.prototype.tags = {}

var node_handlers = {}

node_handlers[1] = elementNode
node_handlers[3] = textNode

function update(data, sync) {
  this.state = data
  this.lookups.update(data)

  if(sync || this.sync) {
    this.runBatch()
  }
}

function initNodes(_nodes, _lookups, state) {
  var altr = this
  var lookups = _lookups || dirtybit(state, {filters: this.filters})
  var nodes = Array.prototype.slice.call(_nodes)
  var hooks = nodes.reduce(join, []).filter(Boolean)

  return {hooks: hooks, lookups: lookups, nodes: nodes}

  function join(list, node) {
    var hooks = initNode.call(altr, lookups, node)

    return hooks ? list.concat(hooks) : list
  }
}

function initNode(lookups, el) {
  return node_handlers[el.nodeType] ?
    node_handlers[el.nodeType].call(this, el, lookups) :
    el.childNodes && el.childNodes.length ?
    this.initNodes(lookups, el.childNodes) :
    null
}

function rootNodes() {
  return this.root.nodeType === this.document.DOCUMENT_FRAGMENT_NODE ?
    [].slice.call(this.root.childNodes) :
    [this.root]
}

function addFilter(name, filter) {
  altr.filters[name] = filter
}

function addTag(attr, tag) {
  altr.prototype.tags[attr] = tag
  altr.prototype.tagList.push({
      attr: attr
    , constructor: tag
  })
}

function appendTo(node) {
  var rootNodes = this.rootNodes()

  for(var i = 0, l = rootNodes.length; i < l; ++i) {
    node.appendChild(getEl(rootNodes[i]))
  }
}

function include(name, template) {
  return this.includes[name] = template
}

function addFilter(name, fn) {
  return this.filters[name] = fn
}

function addDecorator(name, fn) {
  return this.decorators[name] = fn
}

function runBatch() {
  this.batch.run() && this.emit('update', this.state)
}