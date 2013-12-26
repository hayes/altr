var Template = require('./index')
  , through = require('through')

module.exports = if_handler

function if_handler(node) {
  var stream = template.value_stream(node.getAttribute('altr-if'))
    , child_template = Template(node.childNodes)
    , hidden = document.createDocumentFragment()

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