module.exports = decorators

function decorators (el, attrs, lookups) {
  var altr = this

  return attrs.map(createDecorator)

  function createDecorator (attr) {
    var decorator = altr.decorators[attr.name].call(altr, el)
    var expression = '[' + attr.value + ']'

    if (!decorator) {
      return
    }

    var hooks = {insert: decorator.insert, remove: decorator.remove}

    if (decorator.update) {
      lookups.on(expression, update)
    }

    hooks.destroy = destroy

    return hooks

    function destroy () {
      if (decorator.update) lookups.removeListener(expression, update)

      if (decorator.destroy) {
        decorator.destroy()
      }
    }

    function update (args) {
      decorator.update.apply(null, args)
    }
  }
}
