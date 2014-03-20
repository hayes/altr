var for_regexp = /^(.*?)\s+in\s+(.*$)/

module.exports = for_handler

function for_handler(node, args) {
  var parts = args.match(for_regexp)
    , template = node.el.innerHTML
    , children = []
    , altr = this
    , items = []

  node.innerHTML = ''

  if(!parts) {
    throw new Error('invalid for tag: ' + args)
  }

  var prop = parts[1]
    , key = parts[2]

  node.hooks.push(altr.create_accessor(key, update))

  node.update_children = function(data) {
    var item_data

    for(var i = 0, l = node.children.length; i < l; ++i) {
      item_data = Object.create(data)
      item_data[prop] = data[key][i]
      altr.update(item_data, node.children[i])
    }
  }

  function update(new_items) {
    if(!Array.isArray(new_items)) {
      new_items = []
    }

    var new_children = new Array(new_items.length)
      , index

    node.el.innerHTML = ''
    node.children = []

    for(var i = 0, len = new_items.length; i < len; ++i) {
      index = items.indexOf(new_items[i])

      if(index !== -1) {
        new_children[i] = (children.splice(index, 1)[0])
        items.splice(index, 1)
      } else {
        new_children[i] = make_children()
      }

      node.children = node.children.concat(new_children[i].altr_nodes)
    }

    children = new_children.slice()
    items = new_items.slice()

    for(var i = 0, l = new_children.length; i < l; ++i) {
      for(var j = 0, l2 = new_children[i].dom_nodes.length; j < l2; ++j) {
        node.el.appendChild(new_children[i].dom_nodes[j])
      }
    }
  }

  function make_children() {
    var temp = document.createElement('div')
      , altr_nodes
      , dom_nodes

    temp.innerHTML = template

    dom_nodes = Array.prototype.slice.call(temp.childNodes)
    altr_nodes = dom_nodes.map(altr.create_node.bind(altr)).filter(Boolean)

    return {
        dom_nodes: dom_nodes
      , altr_nodes: altr_nodes
    }
  }
}
