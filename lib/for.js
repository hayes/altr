var Template = require('./index')
  , through = require('through')

module.exports = if_handler

function if_handler(template) {
  return through(init)

  function init(node) {
    var condition = node.getAttribute('altr-for')
      , content = node.innerHTML

    if(!condition || !content) {
      return this.queue(node)
    }

    var items = condition.match(/^(.*?)\s+in\s+(.*$)/)
      , getter = items[2]
      , key = items[1]
      , children = []
      , items = []

    node.innerHTML = ''
    template.value_stream(getter, true)
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
}