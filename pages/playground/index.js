var state = window.location.toString().split('?')[1]

state = state ? JSON.parse(atob(state)) : {}

playground(document.getElementById('playground'), state, set_url)

function set_url(state) {
  window.history.replaceState(null, null, window.location.pathname.split(
      '?'
  )[0] + '?' + btoa(JSON.stringify(state)))
}

function playground(el, initial, change) {
  var self = this

  self.result = el.querySelector('[name=result]')
  self.result_parent = result.parentNode
  self.state = {view: 'result'}
  self.template = altr(el)
  self.el = el

  setup('html', initial.html)
  setup('javascript', initial.javascript)
  setup('css', initial.css)
  update(self.state)
  el.querySelector('[name=tabs]').addEventListener('click', select_tab)

  function select_tab(ev) {
    var view = ev.target.getAttribute('data-view')

    if (!view) {
      return
    }

    self.state.view = view
    template.update(state)

    if (view === 'result') {
      // chrome bug http://jsfiddle.net/78pH7/1/
      setTimeout(function() {
        self.result_parent.removeChild(self.result)
        self.result_parent.appendChild(self.result)
      }, 10)
    }
  }

  function setup(key, content) {
    var editor = ace.edit(self.el.querySelector('[name=' + key + ']'))

    editor.setTheme('ace/theme/monokai')
    editor.getSession().setMode('ace/mode/' + key)
    editor.setValue(content)
    editor.getSession().on('change', set)
    self.state[key] = content || ''

    function set(ev) {
      state[key] = editor.getValue()
      update(state)
    }
  }

  function update(state) {
    var content = '<!doctype html><head><style>' +
      state.css + '</style></head><body>' +
      state.html + '<' + 'script>' + state.javascript + '</' + 'script>'

    state.result = 'data:text/html;base64,' + btoa(content)
    template.update(state)
    change({
        html: state.html
      , css: state.css
      , javascript: state.javascript
    })
  }
}
