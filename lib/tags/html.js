module.exports = html

function html(el, accessor) {
  return this.batch.add(this.create_accessor(accessor, update))

  function update(val) {
    el.innerHTML = typeof val === 'undefined' ? '' : val
  }
}
