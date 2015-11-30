module.exports = withTag

function withTag (el, getter, lookups) {
  var children = this.initNodes(el.childNodes)
  var parts = getter.split(' as ')

  lookups.on(parts[0], update)

  return children.hooks

  function update (_val) {
    var val = Object.create(lookups.state)

    val[parts[1]] = _val
    children.lookups.update(val)
  }
}
