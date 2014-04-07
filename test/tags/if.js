var template = '<div><div altr-if="lol">{{ lol }}</div><div altr-if="lol">{{ uhoh }}</div><div altr-if="lol">{ lol }}</div><div altr-if="lol">{ lol }}</div><div altr-if="lol">{ lol }}</div></div>'
  , altr = require('../../lib/node')

console.log(altr(template, {lol: 'lol', uhoh: 'uhoh'}).toString())
