var set_children = require('../set_children')

module.exports = children

function children(el, accessor) {
  return this.batch.add(this.createAccessor(accessor, update))

  function update(val) {
    var nodes = Array.isArray(val) ? val : [val]

    set_children(el, nodes.filter(is_node))
  }
}

function is_node(el) {
  return el && el.nodeType
}
