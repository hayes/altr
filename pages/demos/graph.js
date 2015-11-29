var altr = require('../../lib/index')
  , scale = require('altr-scale')
  , ease = require('altr-ease')

altr.addFilter('svg_path', svg_path)
altr.addFilter('scale', scale)
altr.addFilter('ease', ease)

var data = {
    points: [[+new Date - 30000, 300]]
  , range: [
        [+new Date, +new Date]
      , [0, 300]
    ]
}

var template = altr(document.getElementById('graph1'), data)

for (var i = 29; i > 0; --i) {
  add_item(new Date - i * 1000)
}

setInterval(add_item, 2000)

function add_item(time) {
  data.points.push([
      time || +new Date
    , ~~(Math.random() * 300)
  ])

  data.points = data.points.slice(-100)
  data.range[0][0] = new Date - 30000
  data.range[0][1] = +new Date
  template.update(data)
}

function svg_path(parts, change) {
  return function(data) {
    var result = parts.slice()
      , data = data.slice()

    result.splice.apply(result, [1, 0].concat(data.map(function(p) {
      return 'L ' + p[0] + ' ' + p[1]
    })))

    change(result.join(' '))
  }
}
