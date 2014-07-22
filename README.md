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
#### In Node or browserify:
Run `npm install altr`.
Then, in your node module, `var altr = require('altr')`.
#### Otherwise:
Download altr.js from the [here](https://github.com/hayes/altr/tree/master/dist)
and include it in your html before your other JavaScript files
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
To insert a dynamic value into your template, you can use the `{{ my_value }}` syntax as part of any text content.  You can also use this syntax in any attribute that is not one of the `tags` listed below.  You may also use `altr-attr-my-attribute="my_value"` to set `my-attribute`. You can then refer to `{{ my-value }}` elsewhere in your templates. If `my_value` is `null` or `undefined` or `false` the attribute will be omitted.  This is useful for attributes such as `checked` which do not point to a value, or for svg elements which do not certain attributes to have invalid values.

Template variable lookups are backed by [`altr-accessors`](https://github.com/hayes/altr-accessors). `altr-accessors` supports dot-path lookups, literals, a wide range of operators, as well as `filters`. See the [documentation](https://github.com/hayes/altr-accessors/blob/master/README.md) for more details.

### Tags:
`altr` tags are special attributes that can be set on any element to change the behavior of how that element and its children are rendered. `altr` currently supports 6 tags: `if`, `for`, `text`, `html`, `with` and `include`.

#### if
```html
<div altr-if="my_val">!!my_val === true</div>
```
If the value in this tag is truthy, the element will be rendered as normal.  If it is not, the element will be completely removed from the DOM until the value is truthy again.  Child nodes will not be updated until the value is truthy.

#### for
```html
<ol altr-for="item in my_items"><li>{{ item.name }}<li></ol>
```
The `for` tag will take its `innerHtml` and use it as a template to render each item in the passed array. When the list of items changes, `altr` will remove the elements associated with items that have been removed, update the ones that are still part of the list, and create new elements for items that have been added.  By default `altr` will use `indexOf` to determine if an item is still part of the list and where it is located.  You can also specify a unique key if you want to pass in objects that *represent* the same item, but *is* a different object.
```html
<ol altr-for="item:my_unique_key in my_items"><li>{{ item.name }}<li></ol>
```
#### text
```html
<div altr-text="my_text"></div>
```
The `text` tag simply sets the [`TextContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node.textContent) of its element to its value. So the result of rendering the above is:

```html
<div>my_text</div>
```

#### html
```html
<div altr-html="my_html"></div>
```
The `html` tag works exactly like the `text` tag, but allows you to set the html content of the element instead.

#### with
```html
<div altr-with="data">{{ data.value }} === {{ value }}</div>
```
The `with` tag will make any property of the passed value directly accessible in any child nodes.  Values from the parent scope will still be accessible as well.

#### placeholder
```html
<div altr-placeholder="some.html_element"></div>
```
The `placeholder` tag will replace its element with the element that its value resolves to. This allows you to create smaller widgets with their own templates, event handlers and logic, and dynamically render them into your template.

#### children
```html
<div altr-children="list_of_html_elements"></div>
```
The `children` tag will replace an elements content with the specified DOM nodes.  `list_of_html_elements` should either resolve to a single DOM node, or an array of DOM nodes.

#### include
```html
<div altr-include="another_template"></div>
```
The `include` tag will render another template into its element. You will need to use one of the `include` methods described below to make the template available.

## API

### `altr(template, data, sync, doc)` -> altr instance
Create a new altr instance, which subclasses [Event Emitter](http://nodejs.org/api/events.html#events_class_events_eventemitter).

 * `template`: Can be either a string or a dom element.
 * `data`: Initial data to render the template with.
 * `sync`: When false, all DOM updates are batched with `requestAnimationFrame`. Otherwise, all updates happen in the turn of the event loop in which they are called. Defaults to true in node (and browserify).

### `altr.addTag(attr, constructor)`
Specify a new tag that can be used in `altr` templates

 * `attr`: The attribute that initializes the tag.
 * `constructor`: A function that takes an element and the value of `attr`, and returns an update function takes the template context as its argument, and updates the html as a side effect. The update function is responsible for updating its children.

### `altr.include(name, template)`
Make a template available for inclusion in any other template
 * `name`: the name of the template, a string.
 * `template`: the template string to be included.
 
### `altr.addFilter(name, filter)`
Add a filter to `altr`
 * `name`: The name of the filter.
 * `filter`: The filter constructor function. See [altr-accessors](https://www.npmjs.org/package/altr-accessors) for its expected signature.

Returns a function that expects a JavaScript object that is used as template context. If this new value changes the resulting template, `filter` will be called with the new value. The `all` flag determines whether the call to `filter` happens immediately, or when the next animation frame becomes available.
 
### `instance.update(data)`
Update the template with `data`.

### `instance.into(el)`
Insert the template into the `el`, which is expected to be a [DOM element](https://developer.mozilla.org/en-US/docs/Web/API/element) (useful if rendering the template from a string).

### `instance.toString()`
Returns the current state of the template as a string.

### `instance.initNode(node)`
Takes a DOM node and returns either `null` if it has no content to update, or a function that takes an object with which it updates `node`.

### `instance.initNodes(nodes)`
Take a list of nodes and returns an array of update functions described in `instance.initNode(node)`

### `instance.updateNodes(nodes)`
Takes an array of nodes and returns a function. The returned function expects a template context object, and updates the contents of `nodes`.

### `instance.runBatch()`
Immediately runs any outstanding DOM updates that have been queued.

### `instance.templateString(template, callback)`
 * `template`: a template string, may contain `{{ my.value }}` type tags.
 * `callback`: a function that will be called when the template result changes.
 
### `altr.createAccessor(lookup, callback, all)`
 * `lookup`: a lookup string. May contain anything described in the value section above.
 * `callback`: a function that will be called when the resulting value changes.
 * `all`: if true the callback will be called even if result has not changed.
 
### instance Properties
  * `instance.batch` is an instance of [`batch-queue`](https://github.com/hayes/batch-queue)

### instance Events
 * `update` is emitted with the templates current state after a dom update occurs.  the current state is not guaranteed to be the state that triggered the change.
 * `insert` is emitted any time altr inserts an element into the dom. It is emitted with 2 arguments, the element that was inserted and its parent.
 * `remove` is emitted any time altr removes an element from the dom. It is emitted with 2 arguments, the element that was inserted and its parent.
 * `replace` is emitted any time altr replaces an element in the dom. It is emitted with 3 arguments, the element that was removed, the element that was inserted, and the parent.
