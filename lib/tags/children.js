var setChildren = require('../set-children')

module.exports = children

function children(el, getter, lookups) {
  var current = []

  el.innerHTML = ''
  this.batch.add(lookups.on(getter, update.bind(this)))

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
    setChildren.call(this, el, current)
  }
}

function is_node(el) {
  return el && el.nodeType
}
