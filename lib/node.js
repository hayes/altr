var document = global.document || require('micro-dom').document
  , through = require('through')
  , altr = require('./index')

module.exports = function(root, data, sync, doc) {
  var template = altr(
      root
    , data
    , typeof sync === 'undefined' ? true : sync
    , doc || document
  )

  template.stream = through(template.update.bind(template))

  return template
}

Object.keys(altr).forEach(function(key) {
  module.exports[key] = altr[key]
})
