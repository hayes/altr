module.exports = placeholder

function placeholder(el, accessor) {
  var parent = el.parentNode

  return this.batch.add(this.createAccessor(accessor, update))

  function update(val) {
    if(!val.nodeName) {
      return
    }

    parent.insertBefore(val, el)
    parent.removeChild(el)
    el._altr_placeholder = val
    el = val
  }
}
