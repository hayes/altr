module.exports = render

function render (template, state, el) {
  if (this.includes[template]) {
    template = this.includes[template]
  }

  var instance = this(template)

  instance.update(state || {}, true)

  if (el) {
    instance.into(el)
  }

  return instance
}
