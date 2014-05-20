# Altr

A small dom-based templating engine.

## Why another templating engine?

Traditional string based templating engines (`handlebars`, `nunjucks`, many others) have a major drawback in that they blow away any existing dom when anything changes.  This issue has been solved in many existing frameworks (`angular`, `knockout`, `react`) in some really cool ways.  Unfortunately, to take advantage you need to be using one of these frameworks.  Altr is just a templating engine that does one thing well, and lets you write the rest of your application in your own way.  After initially rendering a template, all subsequent changes only modify the existing dom, elements that don't change are not touched and the ones that do are modified rather than replaced.  This gives you more flexibility in the way you use event handlers, css transitions and much more.

## Install:
#### in Node or browserify:
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

### result:
```html
<div id="root">
  <h1>hello, world!</h1>
  <ul altr-for="item in list">
    <li altr-text="item">1</li>
    <li altr-text="item">2</li>
    <li altr-text="item">3</li>
  </ul>
</div>
```

## Overview
### Values:
to insert a dynamic value into your template, you can use the `{{ my_value }}` syntax as part of any text content.  You can also use this syntax in any attribute that is not one of the `tags` listed below.  You may also use `altr-attr-my-attribute="{{my_value}}"` to set `my-attribute`.  This is useful for svg which does not permit invalid values in its attributes.

To access an object's property: `{{ my_obj.my_prop }}`.  These lookups are safe, and will simply return an empty string if any part of the lookup fails.

Value tags my also contain literals (numbers and strings). `{{ 42 }}` or `{{ 'some text' }}`

Value tags also support a wide range of operators.
`||`, `&&`, `|`, `^`, `&`, `===`, `!==`, `==`, `!=`, `>=`, `<=`, `>`, `<`, `in`, `instanceof`, `+`, `-` `*`, `/`, `%`, `!`, `~`, and the ternary operator are all supported and follow the same precedence as javascript. Parens `(`, `)` will also work as expected.

And lastly altr supports filters. `{{ my_val -> my_filter(arg) }}`.  altr does not ship with any built in filters, but they are described in more detail below.

### Tags:
altr tags are special attributes that can be on any element, and will change the behavior of how that element and its children are rendered. altr currently supports 6 tags: `if`, `for`, `text`, `html`, `with` and `include`

#### if
```html
<div altr-if="my_val">!!my_val === true</div>
```
if the value in this tag is truthy, the element will be rendered as normal.  If it is not, the element will be completly removed from the dom until the value is truthy again.  Child nodes will not be updated until the value is truthy.

#### for
```html
<ol altr-for="item in my_items"><li>{{ item.name }}<li></ol>
```
the `for` tag will take its `innerHtml` and use it as a template to render each item it is passed. When the list of items changes, altr will remove the elements associated with items that have been removed, update the ones that are still part of the list, and create new elements for items that have been added.  By default altr will use `indexOf` to determine if an item is still part of the list and where it is located.  You can also specify a unique key if you want to pass in objects that represent the same item, but may not be the exact same object.
```html
<ol altr-for="item:my_unique_key in my_items"><li>{{ item.name }}<li></ol>
```
#### text
```html
<div altr-text="my_text"></div>
```
The `text` tag simply sets the text content of its element to the value it is passed

#### html
```html
<div altr-html="my_html"></div>
```
The `html` tag works exactly like the `text` tag, but allows you to set the html content of the element instead

#### with
```html
<div altr-with="data">{{ data.value }} === {{ value }}</div>
```
the `with` tag will make any property of the passed value directly accessible in any child nodes.  Values from the parent scope will still be accessible as well.

#### include
```html
<div altr-include="another_template"></div>
```
the `include` tag will render another template into its element. You will need to use one of the include methods described below to make the template available.

## API

### `altr(template, data, sync, doc)` -> altr instance
 create a new altr instance

 * template: can be either a string or a dom element
 * data: initial data to render the template with
 * sync: when false, all dom updates are batched with `requestAnimationFrame`, defaults to true in node (and browserify)

### `altr.add_tag(attr, constructor)`
specify a new tag that can be used in altr templates

 * attr: the attribute that initializes the tag
 * constructor: a function that takes an element and the contents of the specified attribute, and returns an update function.  the tag is responsible for updating its children.

### `altr.include(name, template)`
make a template avaiable to include in any other template
 * name: the name of the template
 * template: the template string to be included
 
### `altr.add_filter(name, filter)`
add a filter to altr
 * name: name of the filter
 * filter: the filter constructor function, accepts parts, and an update function

### `instance.include(name, template)`
make a template avaiable to include in the current template
 * name: the name of the template
 * template: the template string to be included

### `instance.add_filter(name, filter)`
add a filter to an altr instance
 * name: name of the filter
 * filter: the filter constructor function, accepts parts, and an update function
 
### `instance.update(data)`
update the template with new data

### `instance.into(el)`
insert the template into the passed element (useful if rendering the template from a string)

### `instance.toString()`
returns the current state of the template as a string

### `instance.init_el(el)` -> update function
takes an element and returns a function that will update that element with passed data

### `instance.init_nodes(nodes)` -> update function
same as instance.init_el but takes an array of elements or a nodeList


