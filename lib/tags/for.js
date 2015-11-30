var setChildren = require('../set-children')
var forRegexp = /^(.*?)\s+in\s+(.*$)/

module.exports = forHandler

function forHandler (root, args, lookups) {
  var template = root.cloneNode(true)
  var parts = args.match(forRegexp)
  var domNodes = []
  var children = []
  var altr = this
  var items = []

  if (!parts) {
    return console.error('invalid `for` tag: ' + args)
  }

  var runUpdates = altr.batch.add(runDomUpdates)

  root.innerHTML = ''

  var unique = parts[1].split(':')[1]
  var prop = parts[1].split(':')[0]
  var key = parts[2]

  lookups.on(key, update)
  lookups.on('this', updateChildren)

  return altr.mergeHooks(function () {
    return flatten(children)
  })

  function updateChildren (data) {
    for (var i = 0, l = children.length; i < l; ++i) {
      var scope = children[i].lookups.scope
      scope[prop] = items[i]
      scope.$index = i
      children[i].lookups.update(data)
    }
  }

  function update (newItems) {
    var i, l
    if (!Array.isArray(newItems)) {
      newItems = []
    }

    var newChildren = new Array(newItems.length)
    var removed = []
    var matched = {}
    var added = []
    var index

    domNodes = []

    for (i = 0, l = newItems.length; i < l; ++i) {
      index = findIndex(items, newItems[i], unique)

      if (index !== -1) {
        newChildren[i] = children[index]
        items[index] = children[index] = matched
      } else {
        added.push(newChildren[i] = makeChild())
      }

      domNodes = domNodes.concat(newChildren[i].nodes)
    }

    for (i = 0, l = children.length; i < l; ++i) {
      if (children[i] !== matched) {
        removed.push(children[i])
      }
    }

    children = newChildren.slice()
    items = newItems.slice()
    updateChildren(lookups.state)
    altr.destroy(flatten(removed), root, runUpdates.bind(
        altr
      , domNodes
      , flatten(added)
    ))
  }

  function findIndex (items, d, unique) {
    if (!unique) {
      return items.indexOf(d)
    }

    for (var i = 0, l = items.length; i < l; ++i) {
      if (items[i][unique] === d[unique]) {
        return i
      }
    }

    return -1
  }

  function makeChild () {
    var scope = Object.create(lookups.scope)
    scope.$index = undefined
    scope[prop] = undefined
    return altr.initNodes(template.cloneNode(true).childNodes, null, null, scope)
  }

  function runDomUpdates (children, added) {
    setChildren.call(this, root, children)
    altr.runHooks(added, 'insert', root)
  }
}

function flatten (list) {
  return list.reduce(function (all, part) {
    return part.hooks ? all.concat(part.hooks) : all
  }, [])
}
