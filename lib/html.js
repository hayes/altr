module.exports = html

function html(node) {
  return this.value_stream(node.getAttribute('altr-html')).on('data', update)

  function update(val) {
    node.innerHTML = val
  }
}