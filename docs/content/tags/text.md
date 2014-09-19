---
linkTitle: text
title: The `text` tag
menu:
  main:
    parent: Tags
---

-

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
