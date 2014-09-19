---
linkTitle: Getting Started
title: Getting Started
menu:
    main:
        weight: 10
---

### Instalation:
##### In Node or browserify:
  * Run `npm install altr`.
  * in your module: `var altr = require('altr')`

##### Otherwise:
  * Download altr.js from [here]
  (https://github.com/hayes/altr/tree/master/dist)
  * include it in your html before your other JavaScript files

### Basic Usage:
{{% example height=250 %}}
{{% code javascript %}}
```javascript
var state = {name: "world", list: [1, 2, 3, 4, 5]}
var template = altr(document.getElementById('root'), state)
var i = 5

setInterval(function() {
  state.list.push(++i)
  state.list = state.list.slice(-5)
  template.update(state)
}, 500)
```

{{% /code %}}
{{% code html %}}
```html
<div id="root">
  <h1>hello, {{ name }}!</h1>
  If you highlight an item below, you can see how elements are bound to data.
  <ul altr-for="item in list">
    <li altr-text="item"></li>
  </ul>
</div>
```
{{% /code %}}
{{% /example %}}
