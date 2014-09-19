---
linkTitle: with
title: The `with` tag
menu:
  main:
    parent: Tags
---

```html
<div altr-with="data">{{ data.value }} === {{ value }}</div>
```
The `with` tag will make any property of the passed value directly accessible
in any child nodes.  Values from the parent scope will still be accessible as
well.
