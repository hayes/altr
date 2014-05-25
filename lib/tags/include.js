module.exports = include

function include(el, name) {
  el.innerHTML = this.includes[name]

  return this.update_nodes(el.childNodes)
}
