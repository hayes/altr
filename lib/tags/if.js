module.exports = if_tag

function if_tag(node, accessor) {
  var hidden = document.createDocumentFragment()

  node.hooks.push(this.create_accessor(accessor, toggle))

  function hide() {
    for(var i = 0, len = node.el.childNodes.length; i < len; ++i) {
      hidden.appendChild(node.el.childNodes[i])
    }

    node.hidden_children = node.children
    node.children = []
  }

  function show() {
    if(node.hidden_children) {
      node.children = node.hidden_children
    }

    node.el.appendChild(hidden)
  }

  function toggle(val) {
    if(!val) {
      return hide()
    }

    show()
  }
}
