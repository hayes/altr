var builders = require('./builders').builders

module.exports.parse = parse
module.exports.build = build
module.exports.add_children = add_children
module.exports.initialize = initialize

function parse(base) {
  return build('root', base)
}

function build(type, parent) {
  var node = builders[type](parent)

  if(node && node.builders && node.remaining) {
    node.parent = parent
    add_children(node)
  }

  return node
}

function add_children(parent) {
  var length
    , close
    , child

  while(parent.remaining) {
    length = parent.remaining.length
    close = parent.close && parent.remaining.match(parent.close)

    if(close) {
      parent.raw += close[0]
      parent.remaining = parent.remaining.slice(close[0].length)

      break
    }

    child = add_child(parent)
    child && parent.children.push(child)

    if(length === parent.remaining.length) {
      console.log('could not generate nodes from remaining content')

      break
    }
  }

  return parent
}

function add_child(parent) {
  var child

  for(var i = 0, len = parent.builders.length; i < len; ++i) {
    child = build(parent.builders[i], parent)

    if(child) {
      parent.raw += child.raw
      parent.remaining = parent.remaining.slice(child.raw.length)

      return child
    }
  }
}

function initialize(parent) {
  parent.children.forEach(function(child) {
    parent.node.appendChild(child.node)

    if(!child.skip_children) {
      initialize(child)
    }

    child.init && child.init(child)
  })
}