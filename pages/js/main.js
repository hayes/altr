var altr = require('../../lib/browser')
  , concat = require('concat-stream')
  , parse_md = require('./parse-md')
  , http = require('http')

var main_template = altr(document.body)
  , context = {}

window.onhashchange = hash_change
hash_change()

function hash_change() {
  var file = window.location.hash.slice(1)

  if(!file) {
    return window.location.hash = '#/altr/README.md'
  }

  context.file = file
  main_template.update(context)
  http.get({path: file}, function(res) {
    res.pipe(concat(on_file)).on('error', on_error)
  }).on('error', on_error)
}

function on_file(file) {
  context.content = parse_md(file)
  main_template.update(context)
}

function on_error(err) {
  console.log(err)
}
