var el = document.getElementById('main')
  , Template = require('./lib/index')
  , template = Template(el)

var state = {
    a: {b: 10}
  , show: false
  , dont: true
}

template.write(state)

setTimeout(function() {
  state.a.b = 5
  state.show = true
  state.dont = false
  template.write(state)
}, 1000)