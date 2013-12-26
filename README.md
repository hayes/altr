A simple dom aware templating enginge that only updates what it needs.

##install:
`npm install altr`

#Ussage:

this is still a work in progress so for now it is expected to be used in code that get browserified.

js: 
```
var altr = require('altr')

var el = document.getElementById('root')
  , template = alter(el)
  
template.write({
    name: "world"
  , list: [1,2,3]
})

//later
template.write(new_state)

```

html:
```
<div id="root">
  <h1>hello, {{ name }}!</h1>
  <ul altr-for="item in list">
    <li altr-value="item"></li>
  </ul>
</div>
```

##Tags:
altr currently supports these tags: `if`, `for`, `value`, `html` and more will be added soon

and can be used by adding an altr attribute to an element eg. `<div altr-html="obj.my_html">`
that element will now update its contents every time you write to the template.

##Values:
You can also insert values into text nodes ussing the following syntax (attrubutes almost work)
`{{ dot.path.to.value }}`

##Filters:
I have not added any filters yet, but the api is functional. `{{ user.createdAt|format }}` or `<h1 altr-value="user.name|capitalize"></h1>`
Filters are through streams, so they can be used to do async stuff, or update values over time (eg. a countdown or transition)

