## What is altr and why would I use it?
altr is a lightweight templating engine that is backed by the dom rather than
strings. This means that rather than blowing away large portions of the dom and recreating those nodes with each update, it can quickly modify only the nodes that have changed. Updating only the nodes that have changed provides 2 main benafits. performance and the abilility to attach behavior such as event listeners or css animations to elements that would be destroyed with every change in a string based templating system.

## Install:
#### if you are using browserify (you should):
run `npm install altr`
then simply `var altr = require('altr')`
#### otherwise
download altr.js from the [here](#)
and include it in your html before your other javascript files
```html
<script type="text/javascript" src="/path/to/altr.js"></script>
```

## Basic Usage:
### js:
```js
var el = document.getElementById('root')
  , template = altr(el)

template.update({
    name: "world"
  , list: [1,2,3]
})

//later
template.update(new_state)

```

### html:
```html
<div id="root">
  <h1>hello, {{ name }}!</h1>
  <ul altr-for="item in list">
    <li altr-text="item"></li>
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
