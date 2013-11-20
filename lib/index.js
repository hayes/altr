var Template = module.exports = require('./main')
  , for_handler = require('./for')
  , if_handler = require('./if')
  , text = require('./text')

Template.register_node_handler(document.TEXT_NODE, text)
Template.register_node_handler(document.ELEMENT_NODE, if_handler)
Template.register_node_handler(document.ELEMENT_NODE, for_handler)
