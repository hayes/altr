module.exports.resolve = resolve
module.exports.add = add

function resolve(list, data, old) {
  for(var i = 0, len = list.length; i < len; ++i) {
    if(list[i].key) {
      list[i].fn.call(list[i].node, data[list[i].key])
    }

    list[i].fn.call(list[i].node, data, old)
  }
}

function add(node, key, fn) {
  var handler = node

  if(!fn) {
    fn = key
    key = null
  }

  while(!handler.dependencies) {
    handler = handler.parent
  }

  handler.dependencies.push({
      fn: fn
    , key: key
    , node: node
  })
}