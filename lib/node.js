var document = require('micro-dom').document
  , through = require('through')
  , altr = require('./index')

module.exports = function(root, data, doc) {
  var template = altr(root, data, doc || document, true)

  template.stream = through(template.update.bind(template))

  return template
}
