var hljs = require('highlight.js')
  , marked = require('marked')

module.exports = parse

marked.setOptions({
    highlight: highlight
})

function highlight(code, lang) {
  var val = hljs.highlight(lang, code).value

  return val
}

function parse(md) {
  return marked(md)
}
