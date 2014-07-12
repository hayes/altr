module.exports = remove

function remove(parent, el) {
  parent.removeChild(el)
  this.emit('remove', el, parent)
}
