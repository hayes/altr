module.exports = html

function html(node, accessor) {
  node.hooks.push(this.create_accessor(accessor, update))

  function update(val) {
    node.el.innerHTML = typeof val === 'undefined' ? '' : val
  }
}
