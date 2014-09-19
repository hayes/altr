---
title: API
linkTitle: API
menu:
    main:
        weight: 60
---

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

### `altr.include(name, template)`
Make a template available for inclusion in any other template
 * `name`: the name of the template, a string.
 * `template`: the template string to be included.

### `altr.addFilter(name, filter)`
Add a filter to `altr`
 * `name`: The name of the filter.
 * `filter`: The filter constructor function. See [dirtybit][dirtybit] for its
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
