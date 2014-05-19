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

module.add_tag = altr.add_tag
module.add_filter = altr.add_filter
module.exports.include = altr.include
