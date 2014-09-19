---
linkTitle: Decorators
title: Decorators
menu:
    main:
        weight: 40
---

## Overview

Decorators are a very powerful yet simple way to hook into altr to add
new functionality.  Once a decorator has been defined (see below) it can be
used to decorate any element in a template.

Decorators provide 5 places in an elements lifecyle that can be hooked into:
`create`, `insert`, `update`, `remove`, and `destroy`.

## Defining

To add a new decorator to altr:

```javascript
altr.addDecorator('unique-attribute', create)
altr(
    '<div unique-attribute="a.b.c, 5 * 10, 'foo'"></div>'
  , {a: {b: {c: 123}}}
)

function create(el) {
  return {
      insert: function(el) {}
    , update: function(arg1, arg2, argn) {}
    , remove: function(el, done) {setTimeout(done, 500)})
    , destroy: function() {}
  }
}
```

The first argument is the attribute the decorator will be bound to.  Any time
an element is created in an `altr` template that has this attribute the create
function will be called with that element.

### `create(el)`
Each time an element with a matching attribute is added to the template this
function will be called.

Most elements in altr are initialized when the template is first created.  This means that even if the decorated element is
initially inside an [if tag](../tags/if) that is `falsy` the create function will
still be called.  This is because altr was written with the understand that the
state of a template is likely to change.  Because of this, it is good to use
an update hook if the decorator has expectations about the current state.

The main exception to the above, is the [for tag](../tags/for).  For tags
create a sub template for each item it its list. A decorator on an element
will only be created once for each item, even if there are multiple updates
that change that items index in the list. the documentation for the [for tag]
(../tags/for) has more details on how uniqueness and presence in a list is
determined.

To hook in to the other lifecycle hooks, the create function may return an
object with any/all of the below methods.

The create function is called with the altr instance that it is part of as
its context.

Decorators should use `this.document` rather than the global document if they
need to, this maintains compatability with node.

### `update(arg1[, arg2, ...argN])`

A decorators attribute value can specify a comma seperated list of
[expressions](../expressions) to watch.  When the the decorator is first
create and any time any of the watched values change, the decorators `update`
function is called, with the current values as arguments.

### `insert(el)`

A decorators insert function is called any time its element is inserted into
the dom.  It receives 1 argument, `el`.  This is the element responsible for
the insertion. this is generally either an [if tag](../tags/if) or a  [for tag]
(../tags/for).  `el` may also be `null` if the entire template is being
inserted into a new node.

### `remove(el, done)`

A decorators remove function is called any time its element is inserted into
the dom.  It receives 2 arguments, `el` amd `done`.  el is the same as the
the first agument for insert. `done` is a call back that MUST be called once
the decorator is ready to be removed. `done` MAY be called asynchronously, but
MUST only be called once.

`remove` is asynchronus to allow for exit transitions before an element is
removed form the dom.

### `destroy()`

`destroy` is called once the decorators element has been removed from the dom
and will not be reinserted. This allows a decorator to clean up any remaining
event listeners or other state such as `setInterval` calls.

## Examples

### escape HTML
{{% example height=150 %}}
{{% code javascript %}}
```
altr.addDecorator('altr-escape', escape)
altr(document.body, {})

function escape(el) {
  var pre = this.document.createElement('pre')

  pre.textContent = el.innerHTML
  el.innerHTML = ''
  el.appendChild(pre)
}
```
{{% /code %}}
{{% code html %}}
```
<div altr-raw altr-escape>
  <h1>hello, World!</h1>
</div>
```
{{% /code %}}
{{% /example %}}

### fade out
{{% example height=450 %}}
{{% code javascript %}}
```
altr.addDecorator('fade-out', fade)
var template = altr(document.body, {})

document.addEventListener('click', function() {
  template.update({remove: true})
})

function fade(root) {
  return {remove: remove}

  function remove(el, done) {
    var start = new Date

    step()

    function step() {
      var diff = new Date - start

      if(diff > 1000) {
        return done()
      }

      el.style.opacity = 1 - (diff / 1000)
      setTimeout(step, 15)
    }
  }
}
```
{{% /code %}}
{{% code html %}}
```
<div altr-if="!remove" fade-out>
  <div>click to fade out!</div>
</div>
```
{{% /code %}}
{{% /example %}}

### 2-way binding
