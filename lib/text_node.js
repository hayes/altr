module.exports = create_text_node

function create_text_node(el) {
  return this.template_string(el.textContent, this.batch.add(update))

  function update(val) {
    el.textContent = val
  }
}
