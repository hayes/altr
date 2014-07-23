var set_children = require('../set_children')

module.exports = children

function children(el, accessor) {
  var current = []

  el.innerHTML = ''

  return this.batch.add(this.createAccessor(accessor, update.bind(this)))

  function update(val) {
    var nodes = (Array.isArray(val) ? val : [val]).filter(is_node)

    for(var i = 0, l = nodes.length; i < l; ++i) {
      if(nodes[i] !== current[i]) {
        break
      }
    }

    if(i === nodes.length === current.length) {
      return
    }

    current = nodes
    set_children.call(this, el, current)
  }
}

function is_node(el) {
  return el && el.nodeType
}
