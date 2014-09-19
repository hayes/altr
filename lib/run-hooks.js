module.exports = runHooks

function runHooks(hooks, type, el) {
  for(var i = 0, l = hooks.length; i < l; i++) {
    hooks[i][type] && hooks[i][type](el)
  }
}
