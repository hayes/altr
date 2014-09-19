module.exports = ifTag

function ifTag(el, getter, lookups) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , children = this.initNodes(el.childNodes)
    , lastVal = null
    , hidden = null
    , altr = this

  var update = this.batch.add(function(show) {
    if(!hidden && !show) {
      el.parentNode.replaceChild(placeholder, el)
      altr.runHooks(children, 'insert')
      el._altrPlaceholder = placeholder
      hidden = true
    } else if(hidden && show) {
      placeholder.parentNode.replaceChild(el, placeholder)
      delete el._altrPlaceholder
      hidden = false
    }
  })

  lookups.on(getter, toggle, true)

  return {
      insert: insert
    , remove: remove
    , destroy: altr.runHooks.bind(altr, children, 'destroy')
  }

  function toggle(val) {
    lastVal = val

    if(!val) {
      return update(false)
    }

    update(true)
    children.lookups.update(lookups.state)
  }

  function insert() {
    if(lastVal) {
      update(true)
    }
  }

  function remove(done) {
    if(hidden) {
      done()

      return update(false)
    }
    
    altr.remove(children, function() {
      update(false)
      done()
    })
  }
}

