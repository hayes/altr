var accessor = require('../../lib/accessor')

var access = accessor('0 * 4 ? 10 : 15 ? 20 - 5 : 25', function(val) {
  console.log(val)
})

access()
