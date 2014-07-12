var altr = require('../../lib')
  , test = require('tape')

test('text tag', function(t) {
  var template = altr(
      '<div altr-text="content"></div>'
    , {content: 'this is <span>text!</span>'}
    , true
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<div altr-text="content">this is &lt;span&gt;text!&lt;/span&gt;</div>'
  )
})
