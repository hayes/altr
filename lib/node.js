var document = require('micro-dom').document
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

module.exports.add_filter = altr.add_filter
module.exports.add_tag = altr.add_tag
module.exports.include = altr.include
