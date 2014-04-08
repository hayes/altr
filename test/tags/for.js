var altr = require('../../lib/node')
  , test = require('tape')

test('basic for loop', function(t) {
  var template = altr(
      '<ul altr-for="item in items">{{ item }}</ul>'
    , {items: [1,2,3]}
  )

  t.plan(1)
  t.equal(template.toString(), '<ul altr-for="item in items">123</ul>')
})

test('for with elements', function(t) {
  var template = altr(
      '<ul altr-for="item in items"><li>{{ item }}</li></ul>'
    , {items: [1,2,3]}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<ul altr-for="item in items"><li>1</li><li>2</li><li>3</li></ul>'
  )
})

test('for with siblings', function(t) {
  var template = altr(
      '<p></p> <ul altr-for="item in items">{{ item }}</ul><p></p>'
    , {items: [1,2,3]}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<p></p> <ul altr-for="item in items">123</ul><p></p>'
  )
})

test('nested fors', function(t) {
  var template = altr(
      '<ul altr-for="o in out"><ul altr-for="i in in">{{ o + i }}</ul></ul>'
    , {out: ['a','b'], in: [1,2]}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<ul altr-for="o in out"><ul altr-for="i in in">a1a2</ul>' +
      '<ul altr-for="i in in">b1b2</ul></ul>'
  )
})
