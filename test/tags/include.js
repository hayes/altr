var altr = require('../../lib')
var test = require('tape')

test('include tag', function (t) {
  var template = altr(
    '<div altr-include="template"></div>',
    {content: 'hi!!!', template: '<div altr-text="content"></div>'},
    {sync: true}
  )

  t.plan(1)
  t.equal(
    template.toString(),
    '<div altr-include="template"><div altr-text="content">hi!!!</div></div>'
  )
})
