var altr = require('../../lib')
var test = require('tape')

test('html tag', function (t) {
  var template = altr(
      '<div altr-html="content"></div>'
    , {content: 'this is <span>html!</span>'}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<div altr-html="content">this is <span>html!</span></div>'
  )
})
