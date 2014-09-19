---
linkTitle: if
title: The `if` tag
menu:
  main:
    parent: Tags
---

```html
<div altr-if="my_val">!!my_val === true</div>
```
Looks up `my_value` in the current template context and tests its truthiness.
If `my_value` is truthy, the element will be rendered as normal. If it is not,
the element will be completely removed from the DOM until the value is truthy
again.  Child nodes will not be updated until the value is truthy.