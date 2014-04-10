altr.add_filter('svg_path', svg_path)
altr.add_filter('spread', spread)

var data = {
    points: [50, 30, 60, 80, 10, 40, 15, 60, 40, 50, 70, 90, 30, 15, 10, 11]
}

altr(document.getElementById('graph1'), data)

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
