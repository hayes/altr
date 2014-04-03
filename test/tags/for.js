var altr = require('../../lib/node')

var template = '<table> <tr altr-if="items"><ul altr-for="item in items">{{ item }}</ul></tr>  <a></a></table>'
  , t = altr(template, {items: [1,2,3]})

console.log(t.toString())

t.update({items: false})
console.log(t.toString())
t.update({items: [1,2,3]})
console.log(t.toString())

