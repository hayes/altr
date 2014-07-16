module.exports = with_tag

function with_tag(el, accessor) {
  var update = this.updateNodes(el.childNodes)

  return update ? this.createAccessor(accessor, update) : null
}
