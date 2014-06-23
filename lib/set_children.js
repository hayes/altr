var get = require('./get_element')

module.exports = set_children

function set_children(root, nodes) {
  var prev = null
    , el

  for(var i = nodes.length - 1; i >= 0; --i) {
    el = get(nodes[i])

    if((prev && el.nextSibling !== prev) || root.lastChild !== el) {
      root.insertBefore(el, prev)
    }

    prev = el
  }

  while(root.firstChild !== prev) {
    root.removeChild(root.firstChild)
  }
}
