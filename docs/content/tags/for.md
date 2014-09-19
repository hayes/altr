---
linkTitle: for
title: The `for` tag
menu:
  main:
    parent: Tags
---

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