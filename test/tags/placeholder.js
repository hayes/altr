var altr = require('../../lib/node')
  , test = require('tape')

test('text tag', function(t) {
  var template = altr('<div altr-placeholder="el"></div>')

  var el = template.document.createElement('div')

  el.textContent = 'hello, World!'

  template.update({el: el})
  t.plan(1)
  t.equal(
      template.toString()
    , '<div>hello, World!</div>'
  )
})
