module.exports = get

function get (_el) {
  var el = _el

  while (el && el._altrPlaceholder) {
    el = el._altrPlaceholder

    if (el === _el) {
      throw new Error('placeholder circular refference')
    }
  }

  return el
}
