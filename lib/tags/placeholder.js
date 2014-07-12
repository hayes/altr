module.exports = placeholder

function placeholder(el, accessor) {
  var altr = this

  return this.batch.add(this.createAccessor(accessor, update))

  function update(val) {
    if(!val.nodeName) {
      return
    }

    altr.replace(el.parentNode, val, el)
    el._altr_placeholder = val
    el = val
  }
}
