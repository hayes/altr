var _ease = require('ease-component')

altr.add_filter('svg_range', svg_range)
altr.add_filter('svg_path', svg_path)
altr.add_filter('ease', ease)

var data = {
    points: [[+new Date, 300]]
  , range: [
        [new Date - 10000, +new Date]
      , [0, 300]
    ]
}

var template = altr(document.getElementById('graph1'), data)

setInterval(function() {
  data.points.push([
      +new Date
    , ~~(Math.random() * 300)
  ])

  data.points = data.points.slice(-50)
  data.range[0][0] = new Date - 10000
  data.range[0][1] = +new Date
  template.update(data)
}, 250)

function svg_path(parts, change) {
  parts = parts.split(',')

  return function(data) {
    var result = parts.slice()

    result.splice.apply(result, [1, 0].concat(data.map(function(p) {
      return 'L ' + p[0] + ' ' + p[1]
    })))

    change(result.join(' '))
  }
}

function ease(parts, change) {
  var target = 0
    , prev = 0
    , timer
    , start

  parts = parts.split(',')

  var fn = (parts[1] && parts[1].replace(/\s/g, '')) || 'linear'
    , ms = +parts[0]

  return update

  function update(d) {
    clearTimeout(timer)
    timer = setTimeout(animate, 5)
    prev = target
    target = d || target
    start = new Date
  }

  function animate() {
    var diff = new Date - start
      , p = diff / ms

    if(p >= 1) {
      p = 1
    } else {
      timer = setTimeout(animate, 5)
    }

    p = _ease[fn](p)

    change((prev || 0) + (target - (prev || 0)) * p)
  }
}

function svg_range(parts, change) {
  parts = parts.split(',')

  var out = [parts[0],  parts[1]]
    , input = [0, 0]
    , prev

  var out_range = out[1] - out[0]

  var update_start = this.create_part(parts[2], function(d) {
    input[0] = d
    map(prev)
  })

  var update_end = this.create_part(parts[3], function(d) {
    input[1] = d
    map(prev)
  })

  return map

  function map(data, ctx) {
    if(ctx) {
      update_start(data, ctx)
      update_end(data, ctx)
    }

    prev = data

    var range = input[1] - input[0]
      , scale = out_range / range
      , offset = input[0]

    change(data.map(function(d) {
      return [(d[0] - offset) * scale, d[1]]
    }))
  }
}
