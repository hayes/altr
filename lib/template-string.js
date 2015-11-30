module.exports = templatString

function templatString (template, change, lookups) {
  if (!template.match(this.tagRegExp)) {
    return
  }

  var remaining = template
  var parts = []
  var index
  var next

  while (remaining && (next = remaining.match(this.tagRegExp))) {
    if ((index = remaining.indexOf(next[0]))) {
      parts.push(remaining.slice(0, index))
    }

    parts.push('')
    remaining = remaining.slice(index + next[0].length)
    lookups.on(next[1], setPart.bind(this, parts.length - 1))
  }

  if (remaining) {
    setPart(parts.length, remaining)
  }

  function setPart (idx, val) {
    parts[idx] = val

    change(parts.join(''))
  }
}
