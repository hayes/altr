module.exports = merge

function merge(children) {
  var altr = this

  return {
      insert: each.bind(null, 'insert')
    , destroy: each.bind(null, 'destroy')
    , remove: remove
  }

  function each(type) {
    var nodes = children()

    for(var i = 0, l = nodes.length; i < l; i++) {
      nodes[i][type] && nodes[i][type]()
    }
  }

  function remove(ready) {
    altr.remove(children(), ready)
  }
}