var createDirectives = require('./directives')
  , createAttr = require('./attributes')

module.exports = createElementNode

function createElementNode(el, lookups) {
  var directives = []
    , altr = this
    , hooks = {}
    , attr

  var attrs = Array.prototype.slice.call(el.attributes)
    , directives = []
    , altr_tags = {}
    , updates = []
    , tags = {}

  for(var i = 0, l = attrs.length; i < l; ++i) {
    if(altr.tags[attrs[i].name]) {
      altr_tags[attrs[i].name] = attrs[i].value
    } else if(altr.directives[attrs[i].name]) {
      directives.push(attrs[i])
    } else if(!attrs[i].name.lastIndexOf('altr-attr-', 0)) {
      updates.push(createAttr.altr.call(this, el, attrs[i], lookups))
    } else if(!attrs[i].name.lastIndexOf('altr-prop-', 0)) {
      updates.push(createAttr.prop.call(this, el, attrs[i], lookups))
    } else {
      updates.push(createAttr.raw.call(this, el, attrs[i], lookups))
    }
  }

  hooks.updates

  if(directives.length) {
    hooks = altr.mergeHooks(
        hooks
      , createDirectives.call(altr, el, directives, lookups)
    )
  }

  for(var i = 0, l = altr.tagList.length; i < l; ++i) {
    if(attr = altr_tags[altr.tagList[i].attr]) {
      return altr.mergeHooks(
          hooks
        , altr.tagList[i].constructor.call(altr, el, attr, lookups)
      )
    }
  }

  return altr.mergeHooks(hooks, altr.initNodes(el.childNodes, lookups))
}
