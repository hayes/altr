module.exports = include

function include(el, name) {
  el.innerHTML = this.includes[name]

  return this.init_nodes(el.childNodes)
}
