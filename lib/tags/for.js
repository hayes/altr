var setChildren = require('../set-children')
  , for_regexp = /^(.*?)\s+in\s+(.*$)/

module.exports = forHandler

function forHandler(root, args, lookups) {
  var parts = args.match(for_regexp)
    , template = root.innerHTML
    , domNodes = []
    , children = []
    , altr = this
    , items = []

  if(!parts) {
    throw new Error('invalid for tag: ' + args)
  }

  root.innerHTML = ''

  var unique = parts[1].split(':')[1]
    , prop = parts[1].split(':')[0]
    , key = parts[2]

  var runUpdates = this.batch.add(runDomUpdates)

  lookups.register(key, update)

  return {destroy: destroy}

  function updateChildren(data) {
    var itemData

    for(var i = 0, l = children.length; i < l; ++i) {
      itemData = Object.create(data)
      itemData[prop] = items[i]
      itemData['$index'] = i
      children[i].lookups.update(itemData)
    }
  }

  function destroy() {
    for(var i = 0, l = children.length; i < l; ++i) {
      altr.destroy(children[i].hooks)
    }
  }

  function update(newItems) {
    if(!Array.isArray(newItems)) {
      newItems = []
    }

    var newChildren = new Array(newItems.length)
      , matched = {}
      , index

    domNodes = []

    for(var i = 0, l = newItems.length; i < l; ++i) {
      index = findIndex(items, newItems[i], unique)

      if(index !== -1) {
        newChildren[i] = children[index]
        items[index] = children[index] = matched
      } else {
        newChildren[i] = makeChild()
      }

      domNodes = domNodes.concat(newChildren[i].nodes)
    }

    for(var i = 0, l = children.length; i < l; ++i) {
      if(children[i] !== matched) {
        altr.destroy(children[i].hooks)
      }
    }

    children = newChildren.slice()
    items = newItems.slice()
    runUpdates.call(altr)
    updateChildren(lookups.state)
  }

  function findIndex(items, d, unique) {
    if(!unique) {
      return items.indexOf(d)
    }

    for(var i = 0, l = items.length; i < l; ++i) {
      if(items[i][unique] === d[unique]) {
        return i
      }
    }

    return -1
  }

  function makeChild() {
    var temp = altr.document.createElementNS(root.namespaceURI, 'div')

    temp.innerHTML = template

    var child = altr.initNodes(Array.prototype.slice.call(temp.childNodes))

    altr.runHooks(child.hooks, 'insert')

    return child
  }

  function runDomUpdates() {
    setChildren.call(this, root, domNodes)
  }
}
