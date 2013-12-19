var VALUE_TAG = /{{\s*(.*?)\s*}}/
  , through = require('through')

module.exports = function(template) {
  return through(watch_node)

  function watch_node(node) {
    var self = this

    watch_values(template, node.textContent, set_value)

    function set_value(val) {
      node.textContent = val
    }
  }
}

function watch_values(template, original, set_val) {
  var result = original
    , values = []
    , keys = []
    , next

  while(next = result.match(VALUE_TAG)) {
    keys.push(next[1])
    result = result.replace(next[0], '')
  }

  keys.forEach(function(key, i) {
    template.value_stream(key)
      .on('data', update.bind(null, i))
  })

  function update(idx, val) {
    var result = original
      , index = 0
      , tag

    values[idx] = val

    while(tag = result.match(VALUE_TAG)) {
      result = result.replace(VALUE_TAG, values[index++])
    }

    set_val(result)
  }
}
