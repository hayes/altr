##Goals:
  * templates are valid html
  * updates only the parts of the dom that change
  * async built in. filters and tags can be async without adding complexity

##Install:
`npm install altr`

#Usage:

this is still a work in progress so for now it needs to be used with browserify

js: 
```js
var altr = require('altr')

var el = document.getElementById('root')
  , template = altr(el)
  
template.write({
    name: "world"
  , list: [1,2,3]
})

//later
template.write(new_state)

```

html:
```html
<div id="root">
  <h1>hello, {{ name }}!</h1>
  <ul altr-for="item in list">
    <li altr-value="item"></li>
  </ul>
</div>

```

##Tags:
altr currently supports these tags: `if`, `for`, `value`, `html`, `attr` and more will be added soon

and can be used by adding an altr attribute to an element eg. `<div altr-html="obj.my_html">`
that element will now update its contents every time you write to the template.

##Values:
You can also insert values into text nodes or non altr-* attributes using the following syntax
`{{ dot.path.to.value }}`

## Filters:
I have only written an add filter so far, but the api is functional. `{{ num|add(5) }}`
Filters are through streams, so they can be used to do async stuff, or update values over time (eg. a countdown or transition)

