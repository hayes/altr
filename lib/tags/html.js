module.exports = html

function html (el, accessor, lookups) {
  this.batch.add(lookups.on(accessor, update))

  function update (val) {
    el.innerHTML = typeof val === 'undefined' ? '' : val

    if (el.getAttribute('altr-run-scripts')) {
      [].forEach.call(el.getElementsByTagName('script'), run)
    }
  }
}

function run (script) {
  var fixed = document.createElement('script')
  var parent = script.parentNode
  var attrs = script.attributes

  for (var i = 0, l = attrs.length; i < l; ++i) {
    fixed.setAttribute(attrs[i].name, attrs[i].value)
  }

  fixed.textContent = script.textContent
  parent.insertBefore(fixed, script)
  parent.removeChild(script)
}
