var lookup = require('./lookup')
  , accessor_types = []

var string_regexp = /^\s*(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")\s*/
  , ternary_regexp = /^\s*([^\?]+)\?([^\?:]+):(.*)\s*$/
  , equals_regexp = /^\s*([^=]+)(={2,3})(.*)\s*$/
  , filter_regexp = /^\s*([^(]+)\((.*)\)\s*$/
  , number_regexp = /^\s*(\d*(?:\.\d+)?)\s*$/

module.exports = accessor

add_type(ternary_regexp, create_ternary)
add_type(equals_regexp, create_equals)
add_type(filter_regexp, create_filter)
add_type(string_regexp, create_string_accessor)
add_type(number_regexp, create_number_accessor)
add_type(/.*/, create_lookup)

function add_type(regexp, fn) {
  accessor_types.push({test: RegExp.prototype.test.bind(regexp), create: fn})
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
  for(var i = 0, l = accessor_types.length; i < l; ++i) {
    if(accessor_types[i].test(part)) {
      return accessor_types[i].create.call(this, part, change)
    }
  }
}

function create_lookup(path, change) {
  if(!path.indexOf('$data')) {
    path = path.slice('$data.'.length)
  }

  return lookup(path.match(/\s*(.*[^\s])\s*/)[1], change)
}

function create_filter(filter_name, change) {
  var parts = filter_name.match(filter_regexp)
    , filter = this.filters[parts[1]]

  if(!filter) {
    throw new Error('could not find filter: ' + parts[1])
  }

  return filter.call(this, parts[2], change)
}

function create_string_accessor(string, change) {
  var match = string.match(string_regexp)

  string = match[1] || match[2]

  return function() {
    change(string)
  }
}

function create_number_accessor(num, change) {
  var match = num.match(number_regexp)

  num = +match[1]

  return function() {
    change(num)
  }
}

function create_ternary(parts, change) {
  parts = parts.match(ternary_regexp)

  var not = accessor(parts[3], change)
    , ok = accessor(parts[2], change)

  return accessor(parts[1], update)

  function update(val, context) {
    val ? ok(context) : not(context)
  }
}

function create_equals(parts, change) {
  parts = parts.match(equals_regexp)

  var check_lhs = accessor(parts[1], update.bind(null, false))
    , check_rhs = accessor(parts[3], update.bind(null, true))
    , lhs = {}
    , rhs = {}

  return compare

  function compare(data) {
    check_lhs(data)
    check_rhs(data)
  }

  function update(is_rhs, val) {
    is_rhs ? rhs = val : lhs = val
    change(parts[2].length === 2 ? lhs == rhs : lhs === rhs)
  }
}
