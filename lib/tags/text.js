module.exports = text

function text (el, getter, lookups) {
  this.batch.add(lookups.on(getter, update))

  function update (val) {
    el.textContent = typeof val === 'undefined' ? '' : val
  }
}
