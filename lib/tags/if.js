module.exports = if_tag

function if_tag(node, accessor) {
  var hidden = this.document.createDocumentFragment()

  node.hooks.push(this.create_accessor(accessor, toggle))

  function hide() {
    while(node.el.childNodes.length) {
      hidden.appendChild(node.el.childNodes[0])
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
