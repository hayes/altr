var altr = require('../../lib/node')
  , test = require('tape')

test('basic if', function(t) {
  var template = altr(
      '<p altr-if="items">hi</p><p altr-if="!items">bye</p>'
    , {items: [1,2,3]}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<p altr-if="items">hi</p><!--altr-if-placeholder-->' +
      '<!--altr-if-placeholder-->'
  )
})

test('if with siblings', function(t) {
  var template = altr(
      '<p altr-if="items">hi</p> <p altr-if="items">bye</p>'
    , {items: [1,2,3]}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<p altr-if="items">hi</p><!--altr-if-placeholder--> ' +
      '<p altr-if="items">bye</p><!--altr-if-placeholder-->'
  )
})

test('nested if', function(t) {
  var template = altr(
      '<div altr-if="items">hi <div altr-if="items">bye</div> </div>'
    , {items: [1,2,3]}
  )

  t.plan(1)
  t.equal(
      template.toString()
    , '<div altr-if="items">hi ' +
      '<div altr-if="items">bye</div><!--altr-if-placeholder--> ' +
      '</div><!--altr-if-placeholder-->'
  )
})
