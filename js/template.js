var text_handler = require('./text')
  , through = require('through')
  , lookup = require('./lookup')

function Template(root) {
  this.root = root
  this.watchers = []
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

cons.registerNodeHandler = function(type, handler) {
  this.node_handlers[type].push(handler)
}

proto.init = function(root) {
  var self = this

  this.handlers = Object.keys(cons.node_handlers)
    .reduce(to_stream, {})

  this.init_node(root)

  function to_stream(handlers, type) {
    if(cons.node_handlers[type].length) {
      var stream = cons.node_handlers[type][0](self)
      for(var i = 1, len = cons.node_handlers[type].length; i < len; ++i) {
        stream = stream.pipe(handlers[i](self))
      }

      handlers[type] = stream
    }

    return handlers
  }
}

proto.init_node = function(node) {
  var handler = this.handlers[node.nodeType]
    , self = this


  if(!handler) {
    return init_children(node)
  }

  handler.pipe(through(init_children))
  handler.write(node)

  function init_children(node) {
    for(var i = 0, len = node.childNodes.length; i < len; ++i) {
      self.init_node(node.childNodes[i])
    }
  }
}

proto.value_stream = function(key) {
  var parts = key.split('|')
    , stream

  stream = this.make_filter(parts[0])

  for(var i = 1, len = parts.length; i < len; ++i) {
    stream = stream.pipe(this.make_filter[i])
  }

  return stream
}

proto.make_filter = function(str) {
  var parts = str.match(/^.+?(\(.*\)$)?/)
    , filter

  if(!parts) {
    throw new Error('could not parse string to stream')
  } else if(parts[1]) {
    filter = cons.filters[parts[0]].call(this, parts[1])
  } else {
    filter = this.lookup_stream(parts[0])
  }

  return filter.pipe(no_repeat())
}

proto.lookup_stream = function(val) {
  return this.trigger.pipe(through(lookup(val)))
}

proto.write = function(obj) {
  this.current = obj
  this.trigger.write(obj)
}

cons.registerNodeHandler(document.TEXT_NODE, text_handler)

return module.exports = function(root) {
  return new Template(root)
}

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