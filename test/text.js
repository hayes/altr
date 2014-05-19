var altr = require('../lib/node')
  , test = require('tape')

test('text', function(t) {
  var template = altr(
      'Hello, {{ name }}! the value is {{ the.value }}'
    , {name: 'world', the: {value: 10}}
  )

  t.plan(2)
  t.equal(template.toString(), 'Hello, world! the value is 10')
  template.update({name: 'foo'})
  t.equal(template.toString(), 'Hello, foo! the value is ')
})
