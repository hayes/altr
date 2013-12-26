var text_handler = require('./text')
  , through = require('through')
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
  this.current = {}
  this.trigger = through()
  this.init(root)
}

var proto = Template.prototype
  , cons = Template

proto.constructor = cons
cons.prototype = proto

cons.tags = {}
cons.filters = {}

cons.add_tag = function(name, handler) {
  this.tags[name] = handler
}

cons.add_filter = function(name, handler) {
  this.filters[name] = handler
}

proto.init = function(nodes) {
  for(var i = 0, len = nodes.length; i < len; ++i) {
    switch(nodes[i].nodeType) {
      case document.ELEMENT_NODE:
        this.init_element(nodes[i])
        break
      case document.TEXT_NODE:
        this.init_text(nodes[i])
        break
      default:
        break
    }
  }
}

proto.init_element = function(node) {
  var attrs = node.attributes
    , altr_attrs = []
    , self = this
    , done = 0
    , handler
    , total

  for(var i = 0, len = attrs.length; i < len; ++i) {
    handler = cons.tags[attrs[i].name]

    if(handler) {
      altr_attrs.push(handler)
    } else {
      self.init_attr(node, attrs[i].name)
    }
  }

  if(!(total = altr_attrs.length)) {
    return self.init(node.childNodes)
  }

  for(var i = 0; i < total; ++i) {
    altr_attrs[i].call(self, node, ready)
  }

  function ready() {
    if(++done !== total) {
      return
    }

    self.init(node.childNodes)
  }
}

proto.init_text = function(node) {
  text_handler.call(this, node.textContent, function(val) {
    node.nodeValue = val
  })
}

proto.init_attr = function(node, attr) {
  text_handler.call(this, node.getAttribute(attr), function(val) {
    node.setAttribute(attr, val)
  })
}

proto.value_stream = function(key, all) {
  var parts = key.split('|')
    , stream

  stream = this.make_filter(parts[0])

  for(var i = 1, len = parts.length; i < len; ++i) {
    stream = stream.pipe(this.make_filter(parts[i]))
  }

  if(all) {
    return stream
  }

  return stream.pipe(no_repeat())
}

proto.make_filter = function(str) {
  var parts = str.match(/^([^(]+)(?:\((.*)\)$)?/)

  if(!parts) {
    throw new Error('could not parse string to stream')
  } else if(parts[2]) {
    if(!cons.filters[parts[1]]) {
      console.log(cons.filters)
      throw new Error('could not find filter: ' + parts[1])
    }

    return cons.filters[parts[1]].call(this, parts[2])
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