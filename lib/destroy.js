module.exports = destroy

function destroy(children, done) {
  var altr = this

  altr.remove(children, function() {
    altr.runHooks(children, 'destroy')
    done()
  })
}
