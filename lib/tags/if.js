module.exports = ifTag

function ifTag(el, getter, lookups) {
  var placeholder = this.document.createComment('altr-if-placeholder')
    , children = this.initNodes(el.childNodes)
    , lastVal = null
    , hidden = null
    , altr = this

  var hide = this.batch.add(function() {
    var parent = el.parentNode

    if(!hidden) {
      altr.replace(el.parentNode, placeholder, el)
      altr.runHooks(children, 'insert')
      el._altrPlaceholder = placeholder
      hidden = true
    }
  })

  var show = this.batch.add(function() {
    if(hidden) {
      altr.replace(placeholder.parentNode, el, placeholder)
      altr.runHooks(children, 'remove')
      delete el._altrPlaceholder
      hidden = false
    }
  })

  lookups.register(getter, toggle, true)

  return {insert: insert, remove: remove, destroy: children.destroy}

  function toggle(val) {
    lastVal = val

    if(!val) {
      return hide()
    }

    show()
    children.lookups.update(lookups.state)
  }

  function insert() {
    if(lastVal) {
      show()
    }
  }

  function remove() {
    hide()
  }
}
