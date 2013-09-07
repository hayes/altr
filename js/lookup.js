modules.exports = lookup

function lookup(params) {
  var contexts = [].slice.call(arguments, 1)
    , result

  if(Array.isArray(params)) {
    params.join('.')
  }

  params = params.split('.')

  for(var i = 0, len = contexts.length; i < len; ++i) {
    result = check_context(contexts[i], params)

    if(typeof result !== 'undefined') {
      return result
    }
  }
}

function check_context(obj, path) {
  for(var i = 0, len = path.length; i < len; ++i) {
    if(!obj) {
      return obj
    }

    obj = obj[path[i]]
  }

  return obj
}