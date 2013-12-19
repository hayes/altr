var through = require('through')
  , lookup = require('./lookup')

function Template(root) {
  if(!(this instanceof Template)) {
    return new Template(root)
  }

  if(root.length === undefined) {
    root = [root]
  } else {
    root = [].slice.call(root)
  }

  this.root_nodes = root
  this.watchers = []
  this.current = {}
  this.trigger = through()
  this.init(root)
}

var proto = Template.prototype
  , cons = Template

proto.constructor = cons
cons.prototype = proto

var node_types = [
    document.ELEMENT_NODE
  , document.TEXT_NODE
  , document.DOCUMENT_NODE
  , document.DOCUMENT_TYPE_NODE
  , document.DOCUMENT_FRAGMENT_NODE
]

cons.node_handlers = node_types.reduce(function(handlers, type) {
  handlers[type] = []

  return handlers
}, {})

cons.register_node_handler = function(type, handler) {
  this.node_handlers[type].push(handler)
}

proto.init = function(nodes) {
  var self = this

  this.handlers = Object.keys(cons.node_handlers)
    .reduce(to_stream, {})

  for(var i = 0, len = nodes.length; i < len; ++i) {
    this.init_node(nodes[i])
  }

  function to_stream(handlers, type) {
    if(cons.node_handlers[type].length) {
      var stream = cons.node_handlers[type][0](self)

      handlers[type] = stream

      for(var i = 1, len = cons.node_handlers[type].length; i < len; ++i) {
        stream = stream.pipe(cons.node_handlers[type][i](self))
      }

      stream.pipe(through(self.init_children.bind(self)))
    }

    return handlers
  }
}

proto.init_node = function(node) {
  var handler = this.handlers[node.nodeType]

  if(!handler) {
    return this.init_children(node)
  }

  handler.write(node)
}

proto.init_children = function(node) {
  for(var i = 0, len = node.childNodes.length; i < len; ++i) {
    this.init_node(node.childNodes[i])
  }
}

proto.value_stream = function(key, all) {
  var parts = key.split('|')
    , stream

  stream = this.make_filter(parts[0])

  for(var i = 1, len = parts.length; i < len; ++i) {
    stream = stream.pipe(this.make_filter[i])
  }

  if(all) {
    return stream
  }

  return stream.pipe(no_repeat())
}

proto.make_filter = function(str) {
  var parts = str.match(/^[^(]+(\(.*\)$)?/)

  if(!parts) {
    throw new Error('could not parse string to stream')
  } else if(parts[1]) {
    return cons.filters[parts[0]].call(this, parts[1])
  }

  return this.lookup_stream(parts[0])
}

proto.lookup_stream = function(val) {
  return this.trigger.pipe(through(lookup(val)))
}

proto.write = function(obj) {
  this.current = obj
  this.trigger.write(obj)
}

module.exports = Template

function no_repeat() {
  var first = true
    , prev

  return through(function(val) {
    if(val !== prev || first) {
      prev = val
      first = false
      this.queue(val)
    }
  })
}