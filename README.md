# altr

A small efficient DOM-based templating engine.

## Why use altr over other alternatives.

* ##### performance:
  For most cases `altr` matches performance of more complicated engines such as
  react, without the added complexity of a virtual DOM.

* ##### focus:
  `altr` focuses on providing you an easy and efficient way to keep your views
  in sync with your state, without making any assumptions about how you update
  that state or handle dom events.

* ##### extensibility:
  `altr` is fully extensible and supports adding your own tags and filters to
  give you maximum control.

* ##### animation:
  `altr` is ideal for creating dynamic animated views or components. All
  changes in `altr` modify existing DOM elements rather than creating new
  elements, so CSS animations do not get recent.  It also uses
  requestAnimationFrame to batch updates for best performance. You can use
  filters to for animated transitions.

## Install:
#### In Node or browserify:
Run `npm install altr`.

Then, in your node module, `var altr = require('altr')`.

#### Otherwise:

Download altr.js from the
[here](https://github.com/hayes/altr/tree/master/dist) and include it in your
html before your other JavaScript files

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

`altr` will do a lookup of a variable name `my_value` in when either of the
following are true:
  - `{{ my_value }}` appears in any DOM node's [`textContent`][textContent] or
    in any DOM node attribute that is not prefixed by `altr`.
  - DOM attribute matches `altr-attr-*="my_value"`. 

The `altr-attr-my-attribute="my_value"` syntax will set the `my-attribute`
attribute on the DOM node to whatever `my_value` evaluates to in the current
template context. When the template context is updated, this will update as
well. If `my_value` evaluates to `null`, `undefined` or `false`, then
`my-attribute` will simply be excluded, which is useful for boolean attributes
such as `checked` (which can also have a value), or for SVG elements which will
throw errors for illegal values.

Template variable lookups are backed by [`altr-accessors`][accessors].
`altr-accessors` supports dot-path lookups, literals, a wide range of
operators, as well as `filters`. See the
[documentation](https://github.com/hayes/altr-accessors/blob/master/README.md)
for more details.

### Tags:
`altr` tags are special attributes that can be set on any element to change how
that element and its children are rendered. With a few exceptions, `altr`
treats the value that the attribute points to as a template variable: When it
renders the template, it looks up the value against the template context and
replaces all instances of the variable with the value returned by the lookup.

The supported tags are as follows:

#### if
```html
<div altr-if="my_val">!!my_val === true</div>
```
Looks up `my_value` in the current template context and tests its truthiness.
If `my_value` is truthy, the element will be rendered as normal. If it is not,
the element will be completely removed from the DOM until the value is truthy
again.  Child nodes will not be updated until the value is truthy.

#### for
```html
<ol altr-for="item in my_items"><li>{{ item.name }}<li></ol>
```
Looks up `my_items` in the current template context. The iterator variable is a
new context variable which can be looked up in the body of the for loop (the
inner HTML of the DOM element on which the attribute was defined).

The `for` tag will take its `innerHtml` and use it as a template to render each
item in the passed array. When the list of items changes, `altr` will will
update the DOM to reflect the changes. In particular it:

  - Removes elements associated with items that have been removed
  - Updates elements that are still part of the list if necessary
  - Create new elements for items that have been added.  
  
By default `altr` will use `indexOf` to determine if an item is still part of
the list and where it is located.  You can also specify a unique key if you
want to pass in objects that *represent* the same item, but point to a
different object:
```html
<ol altr-for="item:my_unique_key in my_items"><li>{{ item.name }}<li></ol>
```

#### text
```html
<div altr-text="my_text"></div>
```

The `text` tag looks up `my_text` in the current template context and uses the
result to set the [`TextContent`][textContent] on its element. So if the
current template context set `context.my_text = 'What wonderful hat!'`, then
the result of rendering the above is:

```html
<div>What a wonderful hat!</div>
```

#### html
```html
<div altr-html="my_html"></div>
```
The `html` tag works exactly like the `text` tag, but sets the
[`innerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element.innerHTML)
of the element instead of the `textContent`.

#### with
```html
<div altr-with="data">{{ data.value }} === {{ value }}</div>
```
The `with` tag will make any property of the passed value directly accessible
in any child nodes.  Values from the parent scope will still be accessible as
well.

#### placeholder
```html
<div altr-placeholder="some.html_element"></div>
```
`some.html_element` must evaluate to a [DOM node][element].

The `placeholder` tag will replace its element `some.html_element`. This allows
you to create smaller widgets with their own templates, event handlers and
logic, and dynamically render them into your template.

#### children
```html
<div altr-children="list_of_html_elements"></div>
```
The `children` tag will replace an elements content with the specified DOM
nodes.  `list_of_html_elements` should either resolve to a single DOM node, or
an array of DOM nodes.

#### include
```html
<div altr-include="another_template"></div>
```
The `include` tag will render another template into its element. You will need
to use one of the `include` methods described below to make the template
available.

## API

### `altr(template, data, sync, doc)` -> altr instance
Create a new altr instance, which subclasses [Event
Emitter](http://nodejs.org/api/events.html#events_class_events_eventemitter).

 * `template`: Can be either a string or a [DOM element][element].
 * `data`: Initial data to render the template with.
 * `sync`: When false, all DOM updates are batched with 
   `requestAnimationFrame`. Otherwise, all updates happen in the turn of the
   event loop in which they are called. Defaults to true in node (and
   browserify).

### `altr.addTag(attr, constructor)`
Specify a new tag that can be used in `altr` templates

 * `attr`: The attribute that initializes the tag.
 * `constructor`: A function that takes an element and the value of `attr`, and
   returns an update function takes the template context as its argument, and
   updates the html as a side effect. The update function is responsible for
   updating its children.

### `altr.include(name, template)`
Make a template available for inclusion in any other template
 * `name`: the name of the template, a string.
 * `template`: the template string to be included.
 
### `altr.addFilter(name, filter)`
Add a filter to `altr`
 * `name`: The name of the filter.
 * `filter`: The filter constructor function. See
   [altr-accessors][accessors] for its
   expected signature.

Returns a function that expects a JavaScript object that is used as template
context. If this new value changes the resulting template, `filter` will be
called with the new value. 
 
### `instance.update(data)`
Update the template with `data`.

### `instance.into(el)`
Insert the template into the `el`, which is expected to be a [DOM
element][element] (useful if
rendering the template from a string).

### `instance.toString()`
Returns the current state of the template as a string.

### `instance.initNode(node)`
Takes a DOM node and returns either `null` if it has no content to update, or a
function that takes an object with which it updates `node`.

### `instance.initNodes(nodes)`
Take a list of nodes and returns an array of update functions described in
`instance.initNode(node)`

### `instance.updateNodes(nodes)`
Takes an array of nodes and returns a function. The returned function expects a
template context object, and updates the contents of `nodes`.

### `instance.runBatch()`
Immediately runs any outstanding DOM updates that have been queued.

### `instance.templateString(template, callback)`
 * `template`: a template string, may contain `{{ my.value }}` type tags.
 * `callback`: a function that will be called when the template result changes.
 
### `altr.createAccessor(lookup, callback)`
 * `lookup`: a lookup string. May contain anything described in the value
   section above.
 * `callback`: a function that will be called when the resulting value changes.
 
### instance Properties
  * `instance.batch` is an instance of [`batch-queue`](https://github.com/hayes/batch-queue)

### instance Events
 * `update` is emitted with the templates current state after a dom update
   occurs.  the current state is not guaranteed to be the state that triggered
   the change.
 * `insert` is emitted any time altr inserts an element into the dom. It is
   emitted with 2 arguments, the element that was inserted and its parent.
 * `remove` is emitted any time altr removes an element from the dom. It is
   emitted with 2 arguments, the element that was inserted and its parent.
 * `replace` is emitted any time altr replaces an element in the dom. It is
   emitted with 3 arguments, the element that was removed, the element that was
   inserted, and the parent.

[textContent]: https://developer.mozilla.org/en-US/docs/Web/API/Node.textContent
[accessors]: https://www.npmjs.org/package/altr-accessors
[element]: https://developer.mozilla.org/en-US/docs/Web/API/element
