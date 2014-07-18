module.exports = create_element_node

function create_element_node(el) {
  var altr_tags = {}
    , altr = this
    , hooks = []
    , attr

  var attrs = Array.prototype.filter.call(el.attributes, function(attr) {
    return altr.tags[attr.name] ?
      (altr_tags[attr.name] = attr.value) && false :
      true
  })

  attrs.forEach(function(attr) {
    var value = attr.value
      , name = attr.name
      , attr_hook
      , altr_attr

    if(altr_attr = !name.indexOf('altr-attr-')) {
      name = attr.name.slice('altr-attr-'.length)
      el.removeAttribute(attr.name)
    }

    attr_hook = altr_attr ?
      altr.createAccessor(value, altr.batch.add(update)) :
      altr.templateString(
          value
        , altr.batch.add(el.setAttribute.bind(el, name))
      )

    if(attr_hook) {
      hooks.push(attr_hook)
    }

    function update(val) {
      if(!val && val !== '' && val !== 0) {
        return el.removeAttribute(name)
      }

      if(val === true) {
        return el.setAttribute(name, '')
      }

      el.setAttribute(name, val)
    }
  })

  for(var i = 0, l = altr.tagList.length; i < l; ++i) {
    if(attr = altr_tags[altr.tagList[i].attr]) {
      hooks.push(altr.tagList[i].constructor.call(altr, el, attr))

      return hooks
    }
  }

  return hooks.concat(altr.initNodes(el.childNodes))
}
