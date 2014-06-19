module.exports = if_tag

function if_tag(el, accessor) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , update_children = this.updateNodes(el.childNodes)
    , hidden = null

  var hide = this.batch.add(function() {
    if(!hidden) {
      el.parentNode.replaceChild(placeholder, el)
      el._altr_placeholder = placeholder
      hidden = true
    }
  })

  var show = this.batch.add(function() {
    if(hidden) {
      placeholder.parentNode.replaceChild(el, placeholder)
      delete el._altr_placeholder
      hidden = false
    }
  })

  return this.createAccessor(accessor, toggle)

  function toggle(val, data) {
    if(!val) {
      return hide()
    }

    show()
    update_children(data)
  }
}
