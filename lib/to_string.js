module.exports = toString

function toString() {
  return this.rootNodes().map(function(node) {
    switch(node.nodeType) {
      case this.document.DOCUMENT_FRAGMENT_NODE:
      case this.document.COMMENT_NODE: return clone.call(this, node)
      case this.document.TEXT_NODE: return node.textContent
      default: return node.outerHTML
    }
  }, this).join('')

  function clone(node) {
    var temp = this.document.createElement('div')

    temp.appendChild(node.cloneNode())

    return temp.innerHTML
  }
}
