var get = require('./get_element')

module.exports = set_children

function set_children(root, nodes) {
  var prev = null
    , el

  for(var i = nodes.length - 1; i >= 0; --i) {
    el = get(nodes[i])
    this.insert(root, el, prev)
    prev = el
  }

  while((el = root.firstChild) !== prev) {
    this.remove(root, el)
  }
}
