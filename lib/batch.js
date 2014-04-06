module.exports = batch

function batch(sync) {
  if(!(this instanceof batch)) {
    return new batch(sync)
  }

  this.jobs = []
  this.sync = sync
  this.frame = null
  this.run = this.run.bind(this)
}

batch.prototype.request_frame = request_frame
batch.prototype.add = add
batch.prototype.run = run

function add(fn) {
  var index = this.jobs.length
    , batch = this
    , self
    , args

  batch.jobs[index] = null

  return function() {
    self = this
    args = Array.prototype.slice.call(arguments)

    if(batch.sync) {
      return fn.apply(self, args)
    }

    batch.jobs[index] = call
    batch.request_frame()
  }

  function call() {
    fn.apply(self, args)
  }
}

function run() {
  this.frame = null

  for(var i = 0, l = this.jobs.length; i < l; ++i) {
    this.jobs[i] && this.jobs[i]()
    this.jobs[i] = null
  }
}

function request_frame() {
  if(this.frame) {
    return
  }

  if(!global.requestAnimationFrame) {
    return this.frame = setTimeout(this.run, 0)
  }

  this.frame = requestAnimationFrame(this.run)
}
