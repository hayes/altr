module.exports = value

function value(node) {
  return this.value_stream(node.getAttribute('altr-value')).on('data', update)

  function update(val) {
    node.textContent = val
  }
}