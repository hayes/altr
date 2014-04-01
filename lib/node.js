var document = require('micro-dom').document
  , through = require('through')
  , altr = require('./index')

module.exports = function(root, data, doc) {
  var temaplte = altr(root, data, doc || document)

  temaplte.stream = through(temaplte.update.bind(temaplte))

  return temaplte
}
