var altr = require('../../lib/node')
  , test = require('tape')

test('text tag', function(t) {
  var template = altr(
      '<div altr-with="a"><div altr-text="content"></div></div>'
    , {a: {content: 'hi!!!'}}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<div altr-with="a"><div altr-text="content">hi!!!</div></div>'
  )
})
