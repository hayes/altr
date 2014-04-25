[![Build Status](https://travis-ci.org/hayes/altr.png?branch=master)](https://travis-ci.org/hayes/altr)

## What is altr and why would I use it?

altr is a lightweight templating engine that is backed by the native DOM.

Rather than blowing away large portions of the DOM and recreating those nodes
with each update, altr modifies only the nodes that have changed. As a result
of this approach, altr is [performant][performance] and a good citizen of the
DOM: altr updates do not interfere with DOM event listeners or CSS3 animations.

## Install:
#### if you are using browserify (you should)
run `npm install altr`,
then simply `var altr = require('altr')`.
#### otherwise
download [altr.js](#)
and include it in your html before your other JavaScript files
```html
<script type="text/javascript" src="/path/to/altr.js"></script>
```

## Basic Usage:
### js:
```js
var el = document.getElementById('root')
  , template = altr(el)

template.update({
    name: "world"
  , list: [1,2,3]
})

//later
template.update(new_state)

```

### html:
```html
<div id="root">
  <h1>hello, {{ name }}!</h1>
  <ul altr-for="item in list">
    <li altr-text="item"></li>
  </ul>
</div>
```

##Tags:
altr currently supports these tags: `if`, `for`, `value`, `html`, `attr`, and
`text`. It is under active development, more will be added soon.

##Values:
You can also insert values into text nodes or non altr-\* attributes using the
syntax: `{{ dot.path.to.value }}`.

## Filters:
I have only written an addition filter so far, but the API is functional.  They
look like `{{ num|add(5) }}`.

Filters are [through streams][through], so they can be used synchronously,
asynchronously, or to update values over time (e.g. a countdown or transition).

[react]: http://facebook.github.io/react/
[swig]: http://paularmstrong.github.io/swig/
[through]: https://www.npmjs.org/package/through
[plates]: https://github.com/flatiron/plates
[performance]: http://altr.hayes.io/pages/demos/perf.html
