---
linkTitle: replace
title: The `replace` tag
menu:
  main:
    parent: Tags
---

```html
<div altr-replace="some.html_element"></div>
```
`some.html_element` must evaluate to a [DOM node][element].

The `replace` tag will replace its element `some.html_element`. This allows
you to create smaller widgets with their own templates, event handlers and
logic, and dynamically render them into your template.