var extend = require('extend')

module.exports = altrExtend

function altrExtend(base, options) {
  var baseOptions = extend(true, base, options)
  var altr = this

  extension.render = altr.render.bind(altr, baseOptions)
  extension.extend = altr.extend.bind(altr)
  extension.addTag = altr.addTag.bind(altr)
  extension.include = altr.include.bind(altr)
  extension.addHelper = altr.addHelper.bind(altr)
  extension.addDecorator = altr.addDecorator.bind(altr)

  return extension

  function extension(root, state, options) {
    return new altr(root, state, extend(
        true
      , Object.create(baseOptions)
      , options || {}
    ))
  }
}
