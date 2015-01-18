module.exports = ifTag

function ifTag(el, getter, lookups, decorators) {
  var placeholder = this.document.createComment('altr-if-placeholder')
  var children = this.initNodes(el.childNodes)
  var all = children.hooks.concat(decorators)
  var lastVal = null
  var hidden = null
  var first = true
  var altr = this

  var update = this.batch.add(function(show, origin) {
    if(!hidden && !show) {
      el.parentNode.replaceChild(placeholder, el)
      el._altrPlaceholder = placeholder
      hidden = true
    } else if(hidden && show) {
      placeholder.parentNode.replaceChild(el, placeholder)
      altr.runHooks(all, 'insert', origin)
      delete el._altrPlaceholder
      hidden = false
    } else if(first) {
      first = false
      altr.runHooks(all, 'insert', origin)
    }
  })

  lookups.on(getter, toggle, true)

  return {
      insert: insert
    , remove: remove
    , destroy: destroy
  }

  function destroy(el) {
    altr.runHooks(children.hooks, 'destroy', el)
  }

  function toggle(val) {
    lastVal = val

    if(val) {
      update(true, el)
      children.lookups.update(lookups.state)
    } else {
      altr.remove(all, el, function() {
        return update(false, el)
      })
    }
  }

  function insert(el) {
    if(lastVal) {
      update(true, el)
    }
  }

  function remove(el, done) {
    if(hidden) {
      done()

      return update(false)
    }

    altr.remove(children.hooks, el, function() {
      update(false)
      done()
    })
  }
}
