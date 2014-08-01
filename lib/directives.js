module.exports = directives

function directives(el, attrs, lookups) {
  var self = this
    , hooks = []

  for(var i = 0, l = attrs.length; i < l; ++i) {
    hooks.push(create_directive(
        el
      , self.directives[attrs[i].name]
      , attrs[i].value
    ))
  }

  if(hooks.length) {
    return hooks.reduce(self.mergeHooks, {})
  }

  function create_directive(el, create, getter) {
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
