var VALUE_TAG = /{{\s*(.*?)\s*}}/

module.exports = function text(original, set_val) {
  var remaining = original
    , parts = []
    , keys = []
    , index
    , next

  while(next = remaining.match(VALUE_TAG)) {
    keys.push(next[1])

    if(index = remaining.indexOf(next[0])) {
      parts.push(remaining.slice(0, index))
    }

    parts.push('')
    remaining = remaining.slice(parts[0].length)
  }

  for(var i = 0, len = keys.length; i < len; ++i) {
    this.value_stream(keys[i]).on('data', update.bind(null, i))
  }

  function update(idx, val) {
    values[idx] = val
    set_val(values.join(''))
  }
}
