var through = require('through')
  , altr = require('./index')

module.exports = function() {
  var temaplte = altr.apply(null, Array.prototype.slice.call(arguments))

  temaplte.stream = through(temaplte.update.bind(temaplte))

  return temaplte
}
