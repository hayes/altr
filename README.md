# altr

A small efficient DOM-based templating engine. It updates the parts of the dom
that need to change, and keeps everything else intact.

## Why use altr over other alternatives.

altr provides a powerful and expressive templating solution without becoming
your front end framework.  Other alternatives with similar capabilities
(React, Ractive.js, etc) provide much more than a template, and enforece a
specific way of writing your ui code.  For some cases this is great and creates
internal consistancy in your code.  If you want a solution that does one
(small) thing well, and stays out of your way everywhere else, altr might be a
great fit.

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

Template variable lookups are backed by [`dirtybit`][dirtybit].
`dirtybit` supports dot-path lookups, literals, a wide range of
operators, as well as `helpers`. See the
[documentation](https://github.com/hayes/dirtybit/blob/master/README.md)
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

#### replace
```html
<div altr-replace="some.html_element"></div>
```
`some.html_element` must evaluate to a [DOM node][element].

The `replace` tag will replace its element `some.html_element`. This allows
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
The `include` tag will takes an expression that resolves to a string, this string should be a valid altr template. If the string that the expression changes, the contents will be blown away and new content will be rendered based on the new template string.

#### raw
```html
<div altr-raw="true"></div>
```
The `raw` tag tells altr to ignore everything inside the current element, and
just render it as-is.

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

### `altr.render(template, data, el)` -> altr instance
  * `template`: either a template name added using altr.incude, or a
    full template (same as first argument to the default constructor).
  * `data`: Initial data to render the template with.
  * `el`: (optional) an element to render the template into.

### `altr.addHelper(name, helper)`
Add a helper to `altr`
 * `name`: The name of the helper.
 * `helper`: The helper constructor function. See [dirtybit][dirtybit] for its
   expected signature.

### `instance.update(data[, sync])`
Update the template with `data`. If `sync` is true, the template will be updated
synchronously rather than on the next animation frame.

### `instance.into(el)`
Insert the template into the `el`, which is expected to be a [DOM
element][element] (useful if rendering the template from a string).

### `instance.toString()`
Returns the current state of the template as a string.

### `instance.runBatch()`
Immediately runs any outstanding DOM updates that have been queued.

### `instance.templateString(template, callback)`
 * `template`: a template string, may contain `{{ my.value }}` type tags.
 * `callback`: a function that will be called when the template result changes.

### instance Properties
  * `instance.batch` is an instance of
  [`batch-queue`](https://github.com/hayes/batch-queue)
  * `instance.lookups` is an instance of [`dirtybit`][dirtybit]

### instance Events
 * `update` is emitted with the templates current state any time the template
    state is updated
 * `draw` is emitted with the templates current state after a dom update
    occurs.  the current state is not guaranteed to be the state that triggered
    the change.

[textContent]: https://developer.mozilla.org/en-US/docs/Web/API/Node.textContent
[dirtybit]: https://www.npmjs.org/package/dirtybit
[element]: https://developer.mozilla.org/en-US/docs/Web/API/element
