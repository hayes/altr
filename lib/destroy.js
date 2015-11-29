module.exports = destroy

function destroy (children, el, done) {
  var altr = this

  altr.remove(children, el, function (el) {
    altr.runHooks(children, 'destroy', el)
    done()
  })
}
