module.exports = include

function include(el, name, lookups) {
  el.innerHTML = this.includes[name]

  return this.initNodes(el.childNodes, lookups)
}
