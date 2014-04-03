var lookup = require('./lookup')
  , accessor_types = []

var string_regexp = /^\s*(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")\s*/
  , filter_regexp = /^\s*([^(]+)\((.*)\)\s*$/
  , number_regexp = /^\s*(\d*(?:\.\d+)?)\s*$/
  , ternary_regexp = /^\s*(.+?)\s*\?(.*)\s*$/
  , not_regexp = /^\s*!(.+?)\s*$/

module.exports = accessor

accessor_types.push(create_ternary)
add_binary(['|\\\|'])
add_binary(['&&'])
add_binary(['|'])
add_binary(['^'])
add_binary(['|'])
add_binary(['==', '===', '!=', '!=='])
add_binary(['>=', '<=', '>', '<', ' in ', ' instanceof '])
add_binary(['<<', '>>', '>>>'])
add_binary(['+', '-'])
add_binary(['*', '/', '%'])
add_unary(['!', '+', '-', '~', 'typeof '])
accessor_types.push(create_filter)
accessor_types.push(create_string_accessor)
accessor_types.push(create_number_accessor)
accessor_types.push(create_lookup)

function add_binary(list) {
  var regex = new RegExp(
      '^\\s*(.+?)\\s\*(\\' +
      list.join('|\\') +
      ')\\s*(.+?)\\s*$'
  )

  accessor_types.push(create_binary.bind(null, regex))
}

function add_unary(list) {
  var regex = new RegExp(
      '^\\s*(\\' +
      list.join('|\\') +
      ')\\s*(.+?)\\s*$'
  )

  accessor_types.push(create_unary.bind(null, regex))
}

function accessor(key, change) {
  var parts = key.split('|')
    , context
    , next
    , prev

  for(var i = 0, l = parts.length; i < l; ++i) {
    parts[i] = build_part.call(this, parts[i], call_next.bind(this, i + 1))
  }

  return call_next.bind(this, 0)

  function call_next(i, val, ctx) {
    if(!i) {
      context = ctx || val
    }

    if(i === parts.length) {
      return change.call(this, val, context)
    }

    parts[i](val, context)
  }

  function finish(val, context) {
    if(val === prev) {
      return
    }

    prev = val
    change.call(this, val, context)
  }
}

function build_part(part, change) {
  var accessor

  for(var i = 0, l = accessor_types.length; i < l; ++i) {
    if(accessor = accessor_types[i].call(this, part, change)) {
      return accessor
    }
  }
}

function create_lookup(path, change) {
  if(!path.indexOf('$data')) {
    path = path.slice('$data.'.length)
  }

  return lookup(path.match(/\s*(.*[^\s])\s*/)[1], change)
}

function create_filter(parts, change) {
  if(!(parts = parts.match(filter_regexp))) {
    return
  }

  var filter = this.filters[parts[1]]

  if(!filter) {
    throw new Error('could not find filter: ' + parts[1])
  }

  return filter.call(this, parts[2], change)
}

function create_string_accessor(parts, change) {
  if(!(parts = parts.match(string_regexp))) {
    return
  }

  return function() {
    change(parts[1] || parts[2])
  }
}

function create_number_accessor(parts, change) {
  if(!(parts = parts.match(number_regexp))) {
    return
  }

  return function() {
    change(+parts[1])
  }
}

function create_ternary(parts, change) {
  if(!(parts = parts.match(ternary_regexp))) {
    return
  }

  var condition = parts[1]
    , rest = parts[2]
    , count = 1

  for(var i = 0, l = rest.length; i < l; ++i) {
    if(rest[i] === ':') {
      --count
    } else if(rest[i] === '?') {
      ++count
    }

    if(!count) {
      break
    }
  }

  if(!i || i === rest.length) {
    throw new Error('Unmatched ternary: ' + parts[0])
  }

  var not = accessor(rest.slice(i + 1), change)
    , ok = accessor(rest.slice(0, i), change)

  return accessor(condition, update)

  function update(val, context) {
    return val ? ok(context) : not(context)
  }
}

function create_binary(regex, parts, change) {
  if(!(parts = parts.match(regex))) {
    return
  }

  var check_lhs = accessor(parts[1], update.bind(null, false))
    , check_rhs = accessor(parts[3], update.bind(null, true))
    , lhs
    , rhs

  var changed = Function(
      'change, lhs, rhs'
    , 'return change(lhs ' + parts[2] + ' rhs)'
  ).bind(null, change)

  return compare

  function compare(data) {
    check_lhs(data)
    check_rhs(data)
  }

  function update(is_rhs, val) {
    is_rhs ? rhs = val : lhs = val
    changed(lhs, rhs)
  }
}

function create_unary(regex, parts, change) {
  if(!(parts = parts.match(regex))) {
    return
  }

  var changed = Function(
      'val'
    , 'return change(' + parts[1] + 'val)'
  )

  return accessor(parts[2], changed)
}
