function Box(number) {
  this.count = -1
  this.number = number
  this.tick()
}

Box.prototype.tick = function() {
  this.count = ++this.count
  this.num = this.count % 100
  this.style = 'top: ' + Math.sin(this.count / 10) * 10 + 'px'
  this.style += '; left: ' + Math.cos(this.count / 10) * 10 + 'px'
  this.style += '; background: ' + 'rgb(0,0,' + this.count % 255 + ')'
}

var context = {
    boxes: []
}

for(var i = 0; i < 100; ++i) {
  context.boxes.push(new Box(i))
}

var template = altr(document.body, context)

var loopCount = null
  , totalTime = null
  , timeout = null

benchmarkLoop()

function benchmarkLoop() {
  var startDate = new Date()

  context.boxes.forEach(function(box) {
    box.tick()
  })

  template.update(context)

  totalTime += new Date - startDate
  loopCount++

  if(loopCount % 20 === 0) {
    context.timing = 'Performed ' + loopCount + ' iterations in ' +
      totalTime + ' ms (average ' + (totalTime / loopCount).toFixed(2) +
      ' ms per loop).'
  }

  timeout = setTimeout(benchmarkLoop, 0)
}
