var el = document.getElementById('main')
  , Template = require('./lib/index')
  , template = Template(el)

template.write({
    a: 10
})