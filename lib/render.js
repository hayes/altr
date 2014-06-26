module.exports = render

function render(template, el) {
  if(this.includes[template]) {
    template = this.includes[template]
  }

  var instance = this(template)

  if(el) {
    el.innerHTML = ''
    instance.into(el)
  }

  return instance
}
