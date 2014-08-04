module.exports = decorators

function decorators(el, attrs, lookups) {
  var self = this
    , hooks = []

  for(var i = 0, l = attrs.length; i < l; ++i) {
    hooks.push(createDecorator(
        el
      , self.decorators[attrs[i].name]
      , attrs[i].value
    ))
  }

  if(hooks.length) {
    return hooks.reduce(self.mergeHooks, {})
  }

  function createDecorator(el, create, getter) {
    var hooks = create(el)

    if(!hooks) {
      return
    }

    if(hooks.update) {
      lookups.register(getter, hooks.update)
      delete hooks.update
    }

    return hooks
  }
}
