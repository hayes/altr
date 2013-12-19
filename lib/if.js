var Template = require('./index')
  , through = require('through')

module.exports = if_handler

function if_handler(template) {
  return through(init)

  function init(node) {
    var condition = node.getAttribute('altr-if')

    if(!condition) {
      return this.queue(node)
    }

    var hidden = document.createDocumentFragment()
      , child_template = Template(node.childNodes)
      , stream = template.value_stream(condition)

    hide(node.childNodes)

    stream.pipe(through(toggle))

    function hide(nodes) {
      for(var i = 0, len = nodes.length; i < len; ++i) {
        hidden.appendChild(nodes[i])
      }
    }

    function toggle(val) {
      if(!val) {
        return hide(node.childNodes)
      }

      node.appendChild(hidden)
      child_template.write(template.current)
    }
  }
}