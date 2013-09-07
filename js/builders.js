var dep = require('./dependency')
  , parser = require('./parser')

module.exports.builders = {
    text: build_text_node
  , flow: build_flow_node
  , root: build_root_node
  , value: build_value_node
  , element: build_element_node
  , attribute: build_attribute_node
  , attribute_list: build_attribute_list
}

var defaults = module.exports.defaults = ['element', 'value', 'flow', 'text']

function build_root_node(parent) {
  return {
      raw: ''
    , type: 'root'
    , children: []
    , dependencies: []
    , builders: defaults
    , remaining: parent.remaining
    , node: document.createDocumentFragment()
  }
}

function build_text_node(parent) {
  var value = parent.remaining.match(/^(.*?)(?:<|{{|{%|$)/)

  if(!value || !value[1]) {
    return
  }

  return {
      type: 'text'
    , raw: value[1]
    , node: document.createTextNode(value[1])
  }
}

function build_element_node(parent) {
  var remaining = parent.remaining
    , node = {}
    , start

  start = remaining.match(/^<(\w+)\s*(.*?)>/)

  if(!start) {
    return
  }

  node.children = []
  node.raw = start[0]
  node.type = 'element'
  node.close = /^<\/.*?>/
  node.raw_attributes = start[2]
  node.builders = parent.builders
  node.node = document.createElement(start[1])
  node.remaining = !start[0].match(/\/>$/) && remaining.match(/^<.+?>(.*)/)[1]

  if(node.raw_attributes) {
    node.attribute_list = build_attribute_list(node)
    parser.add_children(node.attribute_list)
    node.init = init_element
  }

  return node
}

function init_element(el) {
  el.attribute_list.children.forEach(function(attr) {
    el.node.setAttributeNode(attr.node)
  })
}

function build_attribute_list(parent) {
  var node = {
      raw: ''
    , children: []
    , parent: parent
    , dependencies: []
    , type: 'attribute_list'
    , builders: ['attribute']
    , remaining: parent.raw_attributes
  }

  dep.add(node, function(data, old) {
    if(this.dependencies) {
      dep.resolve(this.dependencies, data, old)
    }
  })

  return node
}

function build_attribute_node(parent) {
  var value = parent.remaining.match(/^\s*([\w\-_]+)(?:=(".*?"|'.*?'))?\s*/)

  if(!value || !value[1]) {
    return
  }

  var attr = {
      type: 'text'
    , raw: value[0]
    , node: document.createAttribute(value[1])
  }

  attr.node.nodeValue = value[2].slice(1,-1)

  return attr
}

function build_value_node(parent) {
  var value = parent.remaining.match(/^{{\s*(.*?)\s}}/)
    , node = {}

  if(value) {
    node.value = ''
    node.type = 'value'
    node.raw = value[0]
    node.parent = parent
    dep.add(node, value[1], update)
    node.node = document.createTextNode('')

    return node
  }

  function update(value) {
    this.value = value
    this.node.nodeValue = value
  }
}

function build_flow_node(parent) {
  var start = parent.remaining.match(/^{%\s*(\w*?)\s+(.+?)\s%}/)
    , node = {}

  if(!start) {
    return
  }

  node.type = 'flow'
  node.children = []
  node.raw = start[0]
  node.skip_children = true
  node.builders = parent.builders
  node.remaining = parent.remaining.slice(start[0].length)
  node.node = document.createTextNode('this will be flow')
  node.close = new RegExp('^{%\\s*(end' + start[1] + ')\\s*%}')

  return node
}
