module.exports = with_tag

function with_tag(el, accessor) {
  return this.create_accessor(accessor, this.update_nodes(el.childNodes))
}
