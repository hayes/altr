module.exports = remove

function remove (hooks, el, ready) {
  var remaining = hooks.length

  for (var i = 0, l = remaining; i < l; i++) {
    hooks[i].remove ? hooks[i].remove(el, done) : --remaining
  }

  if (!remaining) {
    ready()
  }

  function done () {
    if (!--remaining) {
      remaining = -1
      ready()
    }
  }
}
