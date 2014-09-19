---
linkTitle: Tags
title: Tags Overview
menu:
    main:
        weight: 30
---

`altr` tags are special attributes that can be set on any element to change how
that element and its children are rendered. With a few exceptions, `altr`
treats the value that the attribute points to as a template variable: When it
renders the template, it looks up the value against the template context and
replaces all instances of the variable with the value returned by the lookup.
