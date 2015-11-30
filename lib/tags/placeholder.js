module.exports = placeholder

function placeholder (original, getter, lookups) {
  var current = original

  this.batch.add(lookups.on(getter, update))

  function update (val) {
    if (!val || !val.nodeName || val === current) {
      return
    }

    current.parentNode.replaceChild(val, current)
    original._altrPlaceholder = val
    current = val
  }
}
