var altr = require('./lib/index')
  , N = 100

var BoxView = function(number) {
  this.count = -1
  this.number = number
  this.tick()
}

BoxView.prototype.tick = function() {
  this.count = ++this.count
  this.top = Math.sin(this.count / 10) * 10 + 'px'
  this.left = Math.cos(this.count / 10) * 10 + 'px'
  this.background = 'rgb(0,0,' + this.count % 255 + ')'
  this.num = this.count % 100

  this.style = 'top: ' + this.top
  this.style += '; left: ' + this.left
  this.style += '; background: ' + this.background
}

var context = {
    count: 0
}

var template

var init = function() {
  context.boxes = []

  for(var i = 0; i < N; ++i) {
    context.boxes.push(new BoxView(i))
  }

  template = altr(document.getElementById('grid'), context)
}

var animate = function() {
  context.boxes.forEach(function(box) {
    box.tick()
  })

  template.update(context)
}

window.runAltr = function() {
  init()
  benchmarkLoop(animate)
}

var loopCount = null
  , totalTime = null
  , timeout = null

function benchmarkLoop(fn) {
  var startDate = new Date()

  fn()
  totalTime += new Date - startDate
  loopCount++

  if(loopCount % 20 === 0) {
    document.getElementById('timing').textContent = 'Performed ' +
      loopCount + ' iterations in ' + totalTime + ' ms (average ' +
      (totalTime / loopCount).toFixed(2) + ' ms per loop).'
  }

  timeout = setTimeout(benchmarkLoop.bind(null, fn), 0)
}
