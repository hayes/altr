var get = require('./get-element')

module.exports = setChildren

function setChildren (root, nodes) {
  var prev = null
  var el

  for (var i = nodes.length - 1; i >= 0; --i) {
    el = get(nodes[i])
    root.insertBefore(el, prev)
    prev = el
  }

  while ((el = root.firstChild) !== prev) {
    root.removeChild(el)
  }
}
