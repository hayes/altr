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

module.exports.addFilter = altr.addFilter.bind(altr)
module.exports.addTag = altr.addTag.bind(altr)
module.exports.include = altr.include.bind(altr)
module.exports.render = altr.render
