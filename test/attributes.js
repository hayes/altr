var altr = require('../lib')
  , test = require('tape')

test('basic attributes', function(t) {
  var template = altr(
      '<h1 class="{{ class }}" quote="{{ q }}{{ \'!\' }}">text</h1>'
    , {class: 'big', q: '"'}
    , {sync: true}
  )

  t.plan(1)
  t.equal(template.toString(), '<h1 class="big" quote="&quot;!">text</h1>')
})

test('altr attributes', function(t) {
  var template = altr(
      '<h1 altr-attr-class="class">text</h1>'
    , {class: 'big'}
    , {sync: true}
  )

  t.plan(1)
  t.equal(template.toString(), '<h1 class="big">text</h1>')
})

test('remove attributes', function(t) {
  var template = altr(
      '<h1 altr-attr-class="class">text</h1>'
    , {class: null}
    , {sync: true}
  )

  t.plan(3)
  t.equal(template.toString(), '<h1>text</h1>')
  template.update({class: 'big'})
  t.equal(template.toString(), '<h1 class="big">text</h1>')
  template.update({})
  t.equal(template.toString(), '<h1>text</h1>')
})

test('boolean attributes', function(t) {
  var template = altr(
      '<h1 altr-attr-class="class">text</h1>'
    , {class: false}
    , {sync: true}
  )

  t.plan(2)
  t.equal(template.toString(), '<h1>text</h1>')
  template.update({class: true})
  t.equal(template.toString(), '<h1 class="true">text</h1>')
})

test('attr in for', function(t) {
  var template = altr(
      '<div altr-for="item in items"><input altr-attr-checked="selected === $index"></div>'
    , {items: [1,2], selected: 1}
    , {sync: true}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<div altr-for="item in items"><input><input checked="true"></div>'
  )
})
