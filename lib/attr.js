var through = require('through')

module.exports = value

function value(template) {
  return through(init)

  function init(node) {
    var attrs = node.getAttribute('altr-attr')
      , parts

    if(!attrs) {
      return this.queue(node)
    }

    while(parts = attrs.match(/\s*(.+?)\s*:\s*(.+?)\s*?;?/)) {
      attrs = attrs.slice(parts[0].length)
      template.value_stream(parts[2]).pipe(set(parts[1]))
    }

    function set(name) {
      return through(function(val) {
        node.setAttribute(name, val)
      })
    }
  }
}