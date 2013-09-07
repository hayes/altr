var through = require('through')
  , parser = require('./parser')

function template(raw) {
  this.remaining = raw

  this.stream = through(this.set_values.bind(this))
  this.root = parser.parse(this)
  parser.initialize(this.root)
}

var proto = template.prototype

proto.set_values = function(data) {

}



var instance = new template('<div class="gonna-get-lost">{% if x %}x = {{ x }}{% endif %}</div>')
  , d = document.createElement('div')

d.appendChild(instance.root.node)
console.log(instance.root)

console.log(d.innerHTML)
instance.stream.write({x: 5})
console.log(d.innerHTML)