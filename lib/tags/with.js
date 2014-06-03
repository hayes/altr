module.exports = with_tag

function with_tag(el, accessor) {
  return this.createAccessor(accessor, this.updateNodes(el.childNodes))
}
