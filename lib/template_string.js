var TAG = /{{\s*(.*?)\s*}}/

module.exports = template_string

function template_string(template, change) {
  if(!template.match(TAG)) {
    return
  }

  var remaining = template
    , parts = []
    , hooks = []
    , timer
    , index
    , next

  while(remaining && (next = remaining.match(TAG))) {
    if(index = remaining.indexOf(next[0])) {
      parts.push(remaining.slice(0, index))
    }

    parts.push('')
    remaining = remaining.slice(index + next[0].length)
    hooks.push(
        this.create_accessor(next[1], set_part.bind(null, parts.length - 1))
    )
  }

  return update

  function set_part(idx, val) {
    parts[idx] = val

    clearTimeout(timer)

    timer = setTimeout(function() {
      change(parts.join(''))
    }, 0)
  }

  function update(data) {
    hooks.forEach(function(hook) {
      hook(data)
    })
  }
}
