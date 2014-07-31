var altr = require('../../lib')
  , test = require('tape')

test('children tag', function(t) {
  var template = altr(
      '<div altr-children="els"></div>'
    , {els: []}
    , true
  )

  var state = {els: []}

  t.plan(9)
  t.equal(
      template.toString()
    , '<div altr-children="els"></div>'
  )

  state.els.push(template.document.createElement('div'))
  template.update(state)
  t.equal(
      template.toString()
    , '<div altr-children="els"><div></div></div>'
  )

  state.els.push(template.document.createElement('a'))
  template.update(state)
  t.equal(
      template.toString()
    , '<div altr-children="els"><div></div><a></a></div>'
  )

  state.els.unshift(template.document.createElement('li'))
  template.update(state)
  t.equal(
      template.toString()
    , '<div altr-children="els"><li></li><div></div><a></a></div>'
  )

  state.els.splice(1,1)
  template.update(state)
  t.equal(
      template.toString()
    , '<div altr-children="els"><li></li><a></a></div>'
  )

  state.els.reverse()
  template.update(state)
  t.equal(
      template.toString()
    , '<div altr-children="els"><a></a><li></li></div>'
  )

  state.els.pop()
  template.update(state)
  t.equal(
      template.toString()
    , '<div altr-children="els"><a></a></div>'
  )

  state.els = []
  template.update(state)
  t.equal(
      template.toString()
    , '<div altr-children="els"></div>'
  )

  state.els = [template.document.createElement('div')]
  state.els[0]._altrPlaceholder = template.document.createElement('a')
  template.update(state)
  t.equal(
      template.toString()
    , '<div altr-children="els"><a></a></div>'
  )
})
