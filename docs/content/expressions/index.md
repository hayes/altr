---
title: Expressions
linkTitle: Expressions
menu:
    main:
        weight: 20
---

Expressions in `altr` are a combination of [values lookups], [operations], and
[filters] which watch for changes and report any changes to their resulting
value. Expressions can be used in several places, in any [textContent] in your
template, in `attributes`, and as arguments to most [tags].

To use an expression in textContent, simple place the expression between double
currly braces (eg. `{{ my_value }}`).

{{% example height=50 %}}
{{% code javascript %}}
altr(document.body, {my_value: "hello, World!"})
{{% /code %}}
{{% code html %}}
{{ my_value }}
{{% /code %}}
{{% /example %}}


`altr` will do a lookup of a variable name `my_value` in when either of the
following are true:
  - `{{ my_value }}` appears in any DOM node's [textContent] or
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
operators, as well as `filters`. See the
[documentation](https://github.com/hayes/dirtybit/blob/master/README.md)
for more details.

[textContent]: https://developer.mozilla.org/en-US/docs/Web/API/Node.textContent
[tags]: /tags
