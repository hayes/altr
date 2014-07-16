var altr = require('../lib')
  , test = require('tape')

test('basic attributes', function(t) {
  var template = altr(
      '<h1 class="{{ class }}" quote="{{ q }}{{ \'!\' }}">text</h1>'
    , {class: 'big', q: '"'}
    , true
  )

  t.plan(1)
  t.equal(template.toString(), '<h1 class="big" quote="&quot;!">text</h1>')
})

test('altr attributes', function(t) {
  var template = altr(
      '<h1 altr-attr-class="class">text</h1>'
    , {class: 'big'}
    , true
  )

  t.plan(1)
  t.equal(template.toString(), '<h1 class="big">text</h1>')
})

test('remove attributes', function(t) {
  var template = altr(
      '<h1 altr-attr-class="class">text</h1>'
    , {class: null}
    , true
  )

  t.plan(3)
  t.equal(template.toString(), '<h1>text</h1>')
  template.update({class: 'big'})
  t.equal(template.toString(), '<h1 class="big">text</h1>')
  template.update({})
  t.equal(template.toString(), '<h1>text</h1>')
})
