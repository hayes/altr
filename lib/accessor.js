var lookup = require('./lookup')
  , accessor_types = []

var string_regexp = /^\s*(?:'((?:[^'\\]|(?:\\.))*)'|"((?:[^"\\]|(?:\\.))*)")\s*/
  , filter_regexp = /^\s*([^(]+)\((.*)\)\s*$/
  , number_regexp = /^\s*(\d*(?:\.\d+)?)\s*$/

module.exports = accessor

accessor_types.push({
    test: RegExp.prototype.test.bind(filter_regexp)
  , create: create_filter
})
accessor_types.push({
    test: RegExp.prototype.test.bind(string_regexp)
  , create: create_string_accessor
})
accessor_types.push({
    test: RegExp.prototype.test.bind(number_regexp)
  , create: create_number_accessor
})
accessor_types.push({
    test: RegExp.prototype.test.bind(/.*/)
  , create: create_lookup
})

function accessor(key, change) {
  var parts = key.split('|')
    , context
    , next
    , prev

  for(var i = 0, l = parts.length; i < l; ++i) {
    parts[i] = build_part.call(this, parts[i], call_next.bind(this, i + 1))
  }

  return call_next.bind(this, 0)

  function call_next(i, val) {
    if(!i) {
      context = val
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

  return lookup(path, change)
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
