module.exports = placeholder

function placeholder(original, accessor) {
  var current = original
    , altr = this

  return this.batch.add(this.createAccessor(accessor, update))

  function update(val) {
    if(!val || !val.nodeName || val === current) {
      return
    }

    altr.replace(current.parentNode, val, current)
    original._altr_placeholder = val
    current = val
  }
}
