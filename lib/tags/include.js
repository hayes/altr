module.exports = include

function include(el, name, lookups) {
  var removing = false
  var children = null
  var altr = this

  lookups.on('this', update)

  return {insert: insert, remove: remove, destroy: destroy}

  function insert() {
    if(children) {
      return
    }

    el.innerHTML = altr.includes[name]
    children = altr.initNodes(el.childNodes, null, lookups.state)
  }

  function remove(done) {
    if(!children || removing) {
      return
    }

    children = null
    removing = true
    altr.destroy(children, function() {
      removing = false

      if(!children) {
        el.innerHTML = ''
      }

      done()
    })

  }

  function update(state) {
    children && children.lookups.update(state)
  }

  function destroy() {
    lookups.removeListener('this', update)
  }
}
