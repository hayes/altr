module.exports = include

function include(el, getter, lookups) {
  var removeListeners = []
  var children = null
  var content = ''
  var altr = this

  lookups.on(getter, set)
  lookups.on('this', update)

  return {insert: insert, remove: remove, destroy: destroy}

  function set(data) {
    content = typeof data === 'string' ? data : ''
    if(children) remove(el, insert)
  }

  function insert() {
    if(children) {
      return
    }

    el.innerHTML = content
    children = altr.initNodes(el.childNodes, null, lookups.state)
  }

  function remove(el, done) {
    if(!children) {
      return done()
    }

    if(removeListeners.push(done) > 1) {
      return
    }

    altr.destroy(children, el, function() {
      var listener

      if(!children) {
        el.innerHTML = ''
      }

      while(listener = removeListeners.pop()) {
        listener()
      }
    })

    children = null
  }

  function update(state) {
    children && children.lookups.update(state)
  }

  function destroy() {
    lookups.removeListener('this', update)
    lookups.removeListener(getter, set)
  }
}
