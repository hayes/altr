var altr = require('../../lib')
  , test = require('tape')

test('basic if', function(t) {
  var template = altr(
      '<p altr-if="items">hi</p><p altr-if="!items">bye</p>'
    , {items: [1,2,3]}
    , {sync: true}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<p altr-if="items">hi</p><!--altr-if-placeholder-->'
  )
})

test('if with siblings', function(t) {
  var template = altr(
      '<p altr-if="items">hi</p> <p altr-if="items">bye</p>'
    , {items: [1,2,3]}
    , {sync: true}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<p altr-if="items">hi</p> <p altr-if="items">bye</p>'
  )
})

test('nested if', function(t) {
  var template = altr(
      '<div altr-if="items">hi <div altr-if="items">bye</div> </div>'
    , {items: [1,2,3]}
    , {sync: true}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<div altr-if="items">hi <div altr-if="items">bye</div> </div>'
  )
})

test('3 in a row', function(t) {
  var template = altr(
      '<p altr-if="0">1</p> <p altr-if="0">2</p> <p altr-if="0">3</p>'
    , {}
    , {sync: true}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<!--altr-if-placeholder--> <!--altr-if-placeholder--> ' +
      '<!--altr-if-placeholder-->'
  )
})

test('for respects placeholder', function(t) {
  var template = altr(
      '<ul altr-for="item in items"><li altr-if="show">{{ item }}</li></ul>'
    , {show: true, items: [1,2,3]}
    , {sync: true}
  )

  t.plan(3)
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
})

test('vars in if always get updated while shown', function(t) {
  var template = altr(
      '<div altr-if="show">{{x}}</div>'
    , {show: true, x: 5}
  )

  t.plan(2)
  t.equal(template.toString(), '<div altr-if="show">5</div>')
  template.update({show: true, x: 15}, true)
  t.equal(template.toString(), '<div altr-if="show">15</div>')
})
