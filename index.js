var el = document.getElementById('main')
  , altr = require('./lib/index')
  , template = altr(el)

var state = {
    a: {b: 10}
  , show: false
  , dont: true
  , items: [4,5]
  , attr: 'attrs work'
  , text: 'this was inserted by the text tag'
  , html: '<strong>inserted by the html tag</strong>'
  , num: 5
  , num2: 11
  , color: 'red'
}

template.update(state)

var state2 = Object.create(state)

state2.a.b = 5
state2.show = true
state2.dont = false
state2.items = [1,2,3]

var counter = 0

setTimeout(function() {
  template.update(++counter % 2 ? state2 : state)
}, 0)
