var TAG = /{{\s*(.*?)\s*}}/

module.exports = templatString

function templatString(template, change, lookups) {
  if(!template.match(TAG)) {
    return
  }

  var remaining = template
    , parts = []
    , hooks = []
    , index
    , next

  while(remaining && (next = remaining.match(TAG))) {
    if(index = remaining.indexOf(next[0])) {
      parts.push(remaining.slice(0, index))
    }

    parts.push('')
    remaining = remaining.slice(index + next[0].length)
    lookups.register(next[1], setPart.bind(this, parts.length - 1))
  }

  if(remaining) {
    parts.push(remaining)
  }

  function setPart(idx, val) {
    parts[idx] = val
    change(parts.join(''))
  }
}
