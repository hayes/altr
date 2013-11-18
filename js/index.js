var Template = require('./template')

var el = document.getElementById('main')

var template = Template(el)

template.write({
    a: 10
})

var a = 0

setInterval(function() {
  for(var i = 0; i < 10000; ++i) {
    template.write({
        a: a = a + 1
    })
  }
}, 0)