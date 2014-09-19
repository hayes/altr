var altr = require('../../lib')
  , test = require('tape')

test('basic for loop', function(t) {
  var template = altr(
      '<ul altr-for="item in items">{{ item }}</ul>'
    , {items: [1,2,3]}
    , {sync: true}
  )

  t.plan(1)
  t.equal(template.toString(), '<ul altr-for="item in items">123</ul>')
})

test('for with elements', function(t) {
  var template = altr(
      '<ul altr-for="item in items"><li>{{ item }}</li></ul>'
    , {items: [1,2,3]}
    , {sync: true}
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
    , {sync: true}
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
    , {sync: true}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<ul altr-for="o in out"><ul altr-for="i in in">a1a2</ul>' +
      '<ul altr-for="i in in">b1b2</ul></ul>'
  )
})

test('for respects placeholder', function(t) {
  var template = altr(
      '<ul altr-for="item in items"><li altr-if="show">{{ item }}</li></ul>'
    , {show: true, items: [1,2,3]}
    , {sync: true}
  )

  t.plan(4)
  t.equal(
      template.toString()
    , '<ul altr-for="item in items"><li altr-if="show">1</li>' +
      '<li altr-if="show">2</li><li altr-if="show">3</li></ul>'
  )

  template.update({show: false, items: [3,2,1]})
  t.equal(
      template.toString()
    , '<ul altr-for="item in items"><!--altr-if-placeholder-->' +
      '<!--altr-if-placeholder--><!--altr-if-placeholder--></ul>'
  )

  template.update({show: true, items: [3,2,1]})
  t.equal(
      template.toString()
    , '<ul altr-for="item in items"><li altr-if="show">3</li>' +
      '<li altr-if="show">2</li><li altr-if="show">1</li></ul>'
  )

  template.update({show: true, items: [1,2,3]})
  t.equal(
      template.toString()
    , '<ul altr-for="item in items"><li altr-if="show">1</li>' +
      '<li altr-if="show">2</li><li altr-if="show">3</li></ul>'
  )
})

test('adding and removing', function(t) {
  var template = altr(
      '<ul altr-for="item in items"><li altr-if="show">{{ item }}</li></ul>'
    , {show: true, items: [1,2,3]}
    , {sync: true}
  )

  t.plan(4)
  t.equal(
      template.toString()
    , '<ul altr-for="item in items"><li altr-if="show">1</li>' +
      '<li altr-if="show">2</li><li altr-if="show">3</li></ul>'
  )

  template.update({show: false, items: [4,3,2,1]})
  t.equal(
      template.toString()
    , '<ul altr-for="item in items"><!--altr-if-placeholder-->' +
      '<!--altr-if-placeholder--><!--altr-if-placeholder-->' +
      '<!--altr-if-placeholder--></ul>'
  )

  template.update({show: true, items: [3,4,1]})
  t.equal(
      template.toString()
    , '<ul altr-for="item in items"><li altr-if="show">3</li>' +
      '<li altr-if="show">4</li><li altr-if="show">1</li></ul>'
  )

  template.update({show: true, items: [4,5,6]})
  t.equal(
      template.toString()
    , '<ul altr-for="item in items"><li altr-if="show">4</li>' +
      '<li altr-if="show">5</li><li altr-if="show">6</li></ul>'
  )
})
