var through = require('through')

module.exports = value

function value(template) {
  return through(init)

  function init(node) {
    var path

    if(path = node.getAttribute('altr-value')) {
      return template.value_stream(path).pipe(through(text))
    }

    if(path = node.getAttribute('altr-html')) {
      return template.value_stream(path).pipe(through(html))
    }

    this.queue(node)

    function text(val) {
      node.textContent = val
    }

    function html(val) {
      node.innerHTML = val
    }
  }
}