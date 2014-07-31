module.exports = merge

var types = ['update', 'insert', 'remove', 'destroy']

function merge(_lhs, _rhs) {
  var out = {}
    , type

  var lhs = _lhs || {}
    , rhs = _rhs || {}

  for(var i = 0, l = types.length; i < l; ++i) {
    type = arrayify(lhs[types[i]]).concat(arrayify(rhs[types[i]]))

    if(type.length) {
      out[types[i]] = type
    }
  }

  return Object.keys(out).length ? out : null
}

function arrayify(obj) {
  return obj ? Array.isArray(obj) ? obj.filter(Boolean) : [obj] : []
}
