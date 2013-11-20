var el = document.getElementById('main')
  , Template = require('./lib/index')
  , template = Template(el)

var state = {
    a: {b: 10}
  , show: false
  , dont: true
  , items: [4,5]
}

template.write(state)

setTimeout(function() {
  state.a.b = 5
  state.show = true
  state.dont = false
  state.items = [1,2,3]
  template.write(state)
}, 1000)