module.exports = placeholder

function placeholder(original, getter, lookups) {
  var current = original
    , altr = this

  this.batch.add(lookups.register(getter, update))

  function update(val) {
    if(!val || !val.nodeName || val === current) {
      return
    }

    altr.replace(current.parentNode, val, current)
    original._altrPlaceholder = val
    current = val
  }
}
