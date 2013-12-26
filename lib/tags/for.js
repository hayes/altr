var Template = require('../index')
  , through = require('through')

var for_regexp = /^(.*?)\s+in\s+(.*$)/

module.exports = for_handler

function for_handler(node) {
  var parts = node.getAttribute('altr-for').match(for_regexp)
    , content = node.innerHTML
    , getter = parts[2]
    , template = this
    , key = parts[1]
    , children = []
    , items = []

  node.innerHTML = ''
  this.value_stream(getter, true)
    .pipe(through(set_items))

  function set_items(new_items) {
    if(!Array.isArray(new_items)) {
      new_items = []
    }

    var new_children = new Array(new_items.length)
      , context
      , index

    while(node.firstChild) {
      node.removeChild(node.firstChild)
    }

    for(var i = 0, len = new_items.length; i < len; ++i) {
      index = items.indexOf(new_items[i])

      if(index !== -1) {
        new_children[i] = (children.splice(index, 1)[0])
        items.splice(index, 1)
      } else {
        new_children[i] = make_child()
      }

      context = Object.create(template.current)
      context[key] = new_items[i]

      new_children[i].write(context)
      new_children[i].root_nodes.forEach(append)
    }

    children = new_children.slice()
    items = new_items.slice()
  }

  function make_child() {
    var temp = document.createElement(node.nodeName)

    temp.innerHTML = content

    return Template(temp.childNodes)
  }

  function append(child) {
    node.appendChild(child)
  }
}