var through = require('through')

module.exports = function(num) {
  console.log(num)
  num = +num

  return through(add)

  function add(val) {
    this.queue(+val + num)
  }
}