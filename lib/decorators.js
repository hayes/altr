module.exports = decorators

function decorators(el, attrs, lookups) {
  var altr = this
    , hooks = []

  return attrs.map(createDecorator)

  function createDecorator(attr) {
    var decorator = altr.decorators[attr.name](el)
    var hooks = {insert: decorator.insert, remove: decorator.remove}
    var expression = '[' + attr.value + ']'

    if(!decorator) {
      return
    }

    if(decorator.update) {
      lookups.on(expression, update)
    }

    hooks.destroy = destroy

    return hooks

    function destroy() {
      lookups.removeListener(expression, update)

      if(decorator.destroy) {
        decorator.destroy()
      }
    }

    function update(args) {
      decorator.update.apply(null, args)
    }
  }
}
