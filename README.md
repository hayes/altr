# altr

A small efficient dom-based templating engine.

## Why use altr over other alternatives.

* ##### performance:
  for most cases altr matches performance of more complicated engines such as react, without the added complexity of a virtual dom.

* ##### focus:
  altr focuses on providing you an easy and efficient way to keep your views in sync with your state, without making any assumptions about how you update that state or handle dom events.

* ##### extensibility:
  altr is fully extensible and supports adding your own tags and filters to give you maximum control.

* ##### animation:
  altr is ideal for creating dynamic animated views or components. all changes in altr modify existing dom elements rather than creating new elements, so css animations do not get recent.  it also uses requestAnimationFrame to batch updates for best performance. You can use filters to for animated transitions.

## Install:
#### in Node or browserify:
run `npm install altr`
then simply `var altr = require('altr')`
#### otherwise
download altr.js from the [here](https://github.com/hayes/altr/tree/master/dist)
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
to insert a dynamic value into your template, you can use the `{{ my_value }}` syntax as part of any text content.  You can also use this syntax in any attribute that is not one of the `tags` listed below.  You may also use `altr-attr-my-attribute="my_value"` to set `my-attribute`, if `my_value` is `null` or `undefined` or `false` the attribute will be omitted.  This is useful for attributes such as `checked` that a presence based, or for svg elements which do not permit invalid values in certain attributes.

These lookups are backed by [`altr-accessors`](https://github.com/hayes/altr-accessors) and support dot-path lookups, literals, a wide range of operators, as well as `filters` see the [documentation](https://github.com/hayes/altr-accessors/blob/master/README.md) for more details.

### Tags:
altr tags are special attributes that can be on any element, and will change the behavior of how that element and its children are rendered. altr currently supports 6 tags: `if`, `for`, `text`, `html`, `with` and `include`

#### if
```html
<div altr-if="my_val">!!my_val === true</div>
```
if the value in this tag is truthy, the element will be rendered as normal.  If it is not, the element will be completely removed from the dom until the value is truthy again.  Child nodes will not be updated until the value is truthy.

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

#### placeholder
```html
<div altr-placeholder="some.html_element"></div>
```
the `placeholder` tag will replace its element with the element that its value resolves to. This allows you to create smaller widgets with their own templates, event handlers and logic and dynamically render them into your template.

#### children
```html
<div altr-children="list_of_html_elements"></div>
```
the `children` tag will replace an elements content with the specified dom nodes.  `list_of_html_elements` should either resolve to a single dom node, or an array of dom nodes.

#### include
```html
<div altr-include="another_template"></div>
```
the `include` tag will render another template into its element. You will need to use one of the include methods described below to make the template available.

## API

### `altr(template, data, sync, doc)` -> altr instance
 create a new altr instance, which subclasses [Event Emitter](http://nodejs.org/api/events.html#events_class_events_eventemitter).

 * template: can be either a string or a dom element
 * data: initial data to render the template with
 * sync: when false, all dom updates are batched with `requestAnimationFrame`, defaults to true in node (and browserify)

### `altr.addTag(attr, constructor)`
specify a new tag that can be used in altr templates

 * attr: the attribute that initializes the tag
 * constructor: a function that takes an element and the contents of the specified attribute, and returns an update function.  the tag is responsible for updating its children.

### `altr.include(name, template)`
make a template available to include in any other template
 * name: the name of the template
 * template: the template string to be included
 
### `altr.addFilter(name, filter)`
add a filter to altr
 * name: name of the filter
 * filter: the filter constructor function, accepts parts, and an update function

returns a function that takes a state object that is used to update the template. if this new value changes the resulting template the callback will be called with the new value.
 
returns a that takes a new state. If this state change causes the value to change, or the all flag is set to true.  the callback will be called with the resulting value.

### `instance.update(data)`
update the template with new data

### `instance.into(el)`
insert the template into the passed element (useful if rendering the template from a string)

### `instance.toString()`
returns the current state of the template as a string

### `instance.initNode(node)`
takes a dom node and returns either null if it has no content to update, or a function that takes a new state object and updates that node with the new state.

### `instance.initNodes(nodes)`
take a list of nodes and returns an array of update functions described in `instance.initNode(node)

### `instance.updateNodes(nodes)`
takes a list of nodes and returns a function that takes a new state object, and updates the contents of that list of nodes.

### `instance.runBatch()`
immediately runs any outstanding dom updates that have been queued.

### `instance.templateString(template, callback)`
 * template: a template string, may contain `{{ my.value }}` type tags
 * callback: a function that will be called when the template result changes
 
### `altr.createAccessor(lookup, callback, all)`
 * lookup: a lookup string. May contain anything described in the value section above.
 * callback: a function that will be called when the resulting value changes
 * all: if true the callback will be called even if result has not changed.
 
### instance Properties
  * `instance.batch` is an instance of [`batch-queue`](https://github.com/hayes/batch-queue)

### instance Events
 * `update` is emitted with the templates current state after a dom update occurs.  the current state is not guaranteed to be the state that triggered the change.
 * `insert` is emitted any time altr inserts an element into the dom. It is emitted with 2 arguments, the element that was inserted and its parent.
 * `remove` is emitted any time altr removes an element from the dom. It is emitted with 2 arguments, the element that was inserted and its parent.
 * `replace` is emitted any time altr replaces an element in the dom. It is emitted with 3 arguments, the element that was removed, the element that was inserted, and the parent.
