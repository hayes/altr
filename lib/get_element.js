module.exports = get_el

function get_el(el) {
  while(el && el._altr_placeholder) {
    el = el._altr_placeholder
  }

  return el
}
