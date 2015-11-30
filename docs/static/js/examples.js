_altr = altr.extend({delimiters: ['{%', '%}']})
_altr(document.body, {}, {
  decorators: {'altr-example': function(el) {
    setTimeout(playground.bind(this, el), 10)
  }}
})

function playground(root) {
  var state = {html: '', css: '', javascript: '', tabs: [], els: {}}
  var iframe = this.document.createElement('iframe')

  state.els.result = this.document.createElement('div')
  state.els.result.appendChild(iframe)

  $(root).on('click', '[name=tabs] > li', setTab)

  root.removeAttribute('altr-raw')

  state.root = root

  var html_el = root.querySelector('[data-type=html]')
  var css_el = root.querySelector('[data-type=css]')
  var js_el = root.querySelector('[data-type=javascript]')

  setup(js_el, 'javascript')
  setup(css_el, 'css')
  setup(html_el, 'html')
  state.tabs.push('result')
  state.activeTab = state.tabs[0]

  var template = _altr(root)
  update(state)

  function setup(el, key) {
    if (!el) {
      return
    }

    var content = clean(el.textContent.trim())

    el.innerHTML = ''
    state.els[key] = el
    el.parentNode.removeChild(el)

    var editor = ace.edit(el)

    editor.setTheme('ace/theme/monokai')
    editor.getSession().setMode('ace/mode/' + key)
    editor.setValue(content)
    editor.getSession().on('change', set)
    state[key] = content || ''
    state.tabs.push(key)

    function set(ev) {
      state[key] = editor.getValue()
      update(state)
    }
  }

  function setTab(ev) {
    ev.preventDefault()
    state.activeTab = ev.currentTarget.getAttribute('data-view')
    update(state)
    template.update(state, true)

    if (state.activeTab === 'result') {
      // chrome bug http://jsfiddle.net/78pH7/1/
      setTimeout(function() {
        state.els.result.removeChild(iframe)
        state.els.result.appendChild(iframe)
      }, 10)
    }
  }

  function update(state) {
    var content = '<!doctype html><head><style>' +
      state.css + '</style><script src="' + window.location.protocol +
      '//' + window.location.host + '/js/altr.js' + '"></script></head><body>' +
      state.html + '<' + 'script>' + state.javascript + '</' + 'script></body></html>'

    state.result = 'data:text/html;base64,' + btoa(clean(content))
    iframe.src = state.result
    template.update(state, true)
  }

  function clean(content) {
    return content.replace(/‘|’/g, '\'').replace(/“|”/g, '"')
  }
}
