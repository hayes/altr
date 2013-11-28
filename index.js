var el = document.getElementById('main')
  , Template = require('./lib/index')
  , template = Template(el)
  , state1 = {}
  , state2 = {}
  , odd = true

state1.a = {b: 5}
state1.show = true
state1.dont = false
state1.items = [1,2,3]

state2.a = {b: 10}
state2.show = true
state2.dont = false
state2.items = [4,5,6]
template.write(state1)

setInterval(function() {
  odd = !odd

  template.write(odd ? state1 : state2)
},0)
