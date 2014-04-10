var ease = require('ease-component')

altr.add_filter('svg_path', svg_path)
altr.add_filter('ease_array', ease_array)
altr.add_filter('spread', spread)

var data = {
    points: []
}

var template = altr(document.getElementById('graph1'), data)

setInterval(function() {
  data.points = []

  for(var i = 0; i < 20; ++i) {
    data.points.push(~~(Math.random() * 100))
  }

  template.update(data)
}, 1000)

function spread(range, change) {
  range = +range

  return function(data) {
    change(data.map(function(d, i) {
      return [(range / (data.length - 1)) * i, d]
    }))
  }
}

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

function ease_array(parts, change) {
  var target = []
    , prev = []
    , timer
    , start

  parts = parts.split(',')

  var fn = parts[1] || 'linear'
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

    change(target.map(function(d, i) {
      return prev[i] + (target[i] - (prev[i] || 0)) * p
    }))
  }
}
