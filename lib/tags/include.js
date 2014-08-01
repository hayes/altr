module.exports = include

function include(el, name, lookups) {
  var children = null
    , altr = this

  lookups.register('this', update)

  return {insert: insert, remove: remove, destroy: destroy}

  function insert() {
    if(children) {
      return
    }

    el.innerHTML = altr.includes[name]
    children = altr.initNodes(el.childNodes, null, lookups.state)
  }

  function remove() {
    el.innerHTML = ''
    children = null
    altr.destroy(children.hooks)
  }

  function update(state) {
    children && children.lookups.update(state)
  }

  function destroy() {
    children && altr.destroy(children.hooks)
    lookups.deregister('this', update)
  }
}
