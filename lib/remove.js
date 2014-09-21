module.exports = remove

function remove(hooks, ready) {
  var remaining = hooks.length
  var c = 0

  for(var i = 0, l = remaining; i < l; i++) {
    hooks[i].remove ? hooks[i].remove(done) : --remaining
  }

  if(!remaining) {
    ready()
  }

  function done() {
    if(!--remaining) {
      remaining = -1
      ready()
    }
  }
}