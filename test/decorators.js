var altr = require('../lib')
var test = require('tape')

test('decorator', function (t) {
  altr.addDecorator('foo-dir', foo)

  t.plan(2)

  altr(
      '<div foo-dir="name, the.value">'
    , {name: 'world', the: {value: 10}}
    , true
  )

  function foo (el) {
    return {update: update}

    function update (name, val) {
      t.equal(val, 10)
      t.equal(name, 'world')
    }
  }
})

test('destroy decorator', function (t) {
  altr.addDecorator('destroy', destroy)

  var template = altr(
    '<ul altr-for="item in items"><li destroy="item"></li></ul>',
    {items: [1, 2, 3]},
    true
  )

  t.plan(6)
  template.update()
  t.end()

  function destroy (el) {
    t.ok(true)

    return {destroy: t.ok.bind(t, true)}
  }
})

test('nested for destroy decorator', function (t) {
  altr.addDecorator('nested-destroy', destroy)

  var template = altr(
    '<ul altr-for="outer in items"><li altr-for="inner in outer">' +
    '<div nested-destroy="item">{{inner}}</div></li></ul>',
    {items: [[1, 2, 3]]},
    {sync: true}
  )

  t.plan(6)
  template.update()
  t.end()

  function destroy (el) {
    t.ok(true)

    return {destroy: t.ok.bind(t, true)}
  }
})

test('insert is fired for initial if', function (t) {
  altr.addDecorator('nested-if-insert', nested)
  t.plan(1)

  altr(
    '<div altr-if="true"><div nested-if-insert="true"></div></div>',
    {},
    {sync: true}
  )

  function nested () {
    return {insert: insert}

    function insert () {
      t.ok(true)
    }
  }
})

test('remove', function (t) {
  altr.addDecorator('nested-if-remove', nested)
  t.plan(1)

  var template = altr(
    '<div altr-if="!removed"><div nested-if-remove="true"></div></div>',
    {},
    {sync: true}
  )

  template.update({removed: true})

  function nested () {
    return {remove: remove}

    function remove (el, done) {
      t.ok(true)
      done()
    }
  }
})
