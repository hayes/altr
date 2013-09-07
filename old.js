function template(raw) {
  this.raw = raw
  this.doc = create_fragment(raw)

  this.create_root(this.doc)
}

var proto = template.prototype

proto.create_root = function(html) {
  var temp = document.createElement('body')
    , ref = document.createTextNode('')

  this.frag = document.createDocumentFragment()
  this.frag.appendChild(ref)
  this.parse_parent(frag, [].slice.call(temp.childNodes))
}

proto.parse_parent = function(node, children) {
  if(!children) {
    children = [].map.call(function(child) {
      return node.removeChild(child)
    })
  }

  for(var i = 0, len = children.length; i < len; ++i) {
    if(!children[i]) {
      continue
    }

    if(children[i].childNodes) {
      node.appendChild(parse_parent(children[i]))
    } else {
      this.parse_text_node(childrend[i], parent)
    }

    return node
  }
}

proto.parse_text_node = function(node, parent) {
  var text = node.nodeValue
    , tag

  if(this.handle_flow_tag(text, node, parent)) {
    return
  }

  tag = val.match(/{{\s*(.)+?\s*}}/)

  if(!tag) {
    return parent.appendChild(node)
  }

  var start = text.indexOf(tag[0])
    , end = start + tag[0].length
    , rest = text.slice(end)

  node.nodeValue = text.slice(0, start)
  parent.appendChild(node)
  parent.appendChild(create_value(tag[0]))
  parse_text_node(document.createTextNode(rest), parent)
}

proto.handle_flow_tag = function(text, node, parent) {
  var tag = text.match(/{%\s*(\w+).+?%}/)

  if(!tag) {
    return
  }

  var start = text.indexOf(tag[0])
    , end = start + tag[0].length
    , name = tag[1]

  return complete_flow({
      name: name
    , full: tag[0]
    , start: start
    , end: end
    , before: text.slice(0, start)
    , after: text.slice(end)
    , closing: !name.indexOf('end')
    , node: node
    , parent: parent
    , body: ''
  })
}

proto.construct_flow_tag = function(tag) {
  tag = this.complete_flow(tag)

  if(tag.before) {
    this.parse_text_node(document.createTextNode(tag.before), tag.parent)
  }

  tag.parent.appendChild(this.create_flow(tag))

  if(tag.after) {
    this.parse_text_node(document.createTextNode(tag.after), tag.parent)
  }

  return tag
}

proto.complete_flow = function(tag, offset) {
  var next = find_flow_tag(tag.after.slice(offset), tag.node, tag.parent)

  if(next && next.closing) {
    tag.body += tag.after.slice(0, next.start)
    tag.outer = tag.full + tag.body + next.full
    tag.after = next.after
    tag.node = next.node

    return tag
  }

  if(next) {
    next = complete_flow(next)
    tag.body += next.outer
    tag.node = next.node

    return this.get_flow_tag_body(tag, next.after)
  }

  return this.complete_flow_with_next(tag)
}

proto.complete_flow_with_next = function(tag) {
  tag.body += tag.after
  tag.node = tag.node.nextSibling

  if(tag.node) {
    if(tag.node.childNodes) {
      tag.body += tag.node.outerHTML
      tag.after = ''

      return complete_flow_with_next(tag)
    }

    tag.after = tag.nodeValue

    return complete_flow(tag)
  }
}

proto.create_value = function(val) {
  return document.createTextNode('placeholder value')
}

proto.create_flow = function(tag) {
  return document.createTextNode('placeholder flow')
}
