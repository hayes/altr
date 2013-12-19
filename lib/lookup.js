module.exports = lookup

function lookup(path) {
  path = path.split('.')

  return find

  function find(obj) {
    for(var i = 0, len = path.length; i < len; ++i) {
      if(obj === null || obj === undefined) {
        return this.queue('')
      }

      obj = obj[path[i]]
    }

    this.queue(obj === null || obj === undefined ? '' : obj)
  }
}