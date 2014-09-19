---
linkTitle: Overview
title: Overview
url: "index.html"
menu:
    main:
        weight: 0
---

`altr` is small efficient DOM-based templating engine. It updates the parts of
the dom that need to change, and keeps everything else intact.

{{% example height=50 %}}
{{% code javascript %}}
```javascript
altr.render('hello, {{ name }}!', {name: 'world'}, document.body)
```
{{% /code %}}
{{% /example %}}

Its api was designed to so it can be easily integrated and mixed with other
view or templating libraries. Components built using other tools can easily be
included in a template by including the component's root element the template's
[context](./tags/replace) or dynamically instantiated and updated using
[decorators](./decorators).

`altr` is not designed to be a complete front-end framework like `React` or
`Ractive.js`.  altr is a way to keep the dom in sync with your state, it does
not provide event handling or delegation.  Instead, it makes it simple to
build up templates from small components that each handle their own events.
This makes it easy to mix and match, or itegrate with existing solutions.
