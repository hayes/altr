var through = require('through')

module.exports = attr

function attr(node, ready) {
  var attrs = node.getAttribute('altr-attr')
    , parts

  while(parts = attrs.match(/\s*(.+?)\s*:\s*(.+?)\s*?;?/)) {
    attrs = attrs.slice(parts[0].length)
    this.value_stream(parts[2]).pipe(set(parts[1]))
  }

  ready()

  function set(name) {
    return through(function(val) {
      node.setAttribute(name, val)
    })
  }
}