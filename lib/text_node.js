module.exports = create_text_node

function create_text_node(el) {
  var hook = this.template_string(el.textContent, this.batch.add(update))

  return hook ? [hook] : null

  function update(val) {
    el.textContent = val
  }
}
