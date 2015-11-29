var altr = require('../../lib')
var test = require('tape')

test('replace tag', function (t) {
  var template = altr('<div altr-replace="el"></div>', null, true)

  var el = template.document.createElement('div')

  el.textContent = 'hello, World!'

  template.update({el: el})
  t.plan(1)
  t.equal(
    template.toString(),
    '<div>hello, World!</div>'
  )
})
