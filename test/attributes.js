var altr = require('../lib/node')
  , test = require('tape')

test('basic attributes', function(t) {
  var template = altr(
      '<h1 class="{{ class }}" quote="{{ q }}">text</h1>'
    , {class: 'big', q: '"'}
  )

  t.plan(1)
  t.equal(template.toString(), '<h1 class="big" quote="&quot;">text</h1>')
})

test('altr attributes', function(t) {
  var template = altr(
      '<h1 altr-attr-class="{{ class }}">text</h1>'
    , {class: 'big'}
  )

  t.plan(1)
  t.equal(template.toString(), '<h1 class="big">text</h1>')
})
