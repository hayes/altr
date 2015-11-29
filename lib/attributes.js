module.exports.raw = rawAttribute
module.exports.altr = altrAttribute
module.exports.prop = altrProperty

function rawAttribute (el, attr, lookups) {
  this.templateString(
      attr.value
    , this.batch.add(el.setAttribute.bind(el, attr.name))
    , lookups
  )
}

function altrAttribute (el, attr, lookups) {
  var name = attr.name.slice('altr-attr-'.length)

  lookups.on(attr.value, this.batch.add(update))
  el.removeAttribute(attr.name)

  function update (val) {
    if (!val && val !== '' && val !== 0) {
      return el.removeAttribute(name)
    }

    el.setAttribute(name, val)
  }
}

function altrProperty (el, attr, lookups) {
  var name = attr.name.slice('altr-prop-'.length)

  el.removeAttribute(attr.name)
  lookups.on(attr.value, this.batch.add(update))

  function update (val) {
    el[name] = val
  }
}
