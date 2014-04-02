module.exports = include

function include(node, name) {
  node.el.innerHTML = this.includes[name]
}
