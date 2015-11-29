// Change N to change the number of drawn circles.

var N = 100
var _ = window._
var $ = window.$
var altr = window.altr
var Backbone = window.Backbone

// The Backbone implementation:
;(function () {
  var Box = Backbone.Model.extend({
    defaults: {
      top: 0,
      left: 0,
      color: 0,
      content: 0
    },

    initialize: function () {
      this.count = 0
    },

    tick: function () {
      var count = this.count += 1
      this.set({
        top: Math.sin(count / 10) * 10,
        left: Math.cos(count / 10) * 10,
        color: (count) % 255,
        content: count % 100
      })
    }
  })

  var BoxView = Backbone.View.extend({
    className: 'box-view',
    template: _.template($('#underscore-template').html()),
    initialize: function () {
      this.model.bind('change', this.render, this)
    },
    render: function () {
      this.$el.html(this.template(this.model.attributes))
      return this
    }
})

var boxes

var backboneInit = function() {
    boxes = _.map(_.range(N), function(i) {
        var box = new Box({number: i});
        var view = new BoxView({model: box});
        $('#grid').append(view.render().el);
        return box;
    });
};

var backboneAnimate = function() {
    for (var i = 0, l = boxes.length; i < l; i++) {
      boxes[i].tick();
    }
};

window.runBackbone = function() {
    reset();
    backboneInit();
    benchmarkLoop(backboneAnimate);
};

})();

// The Backbone implementation, fixed:
(function(){

var Box = Backbone.Model.extend({

    defaults: {
        top: 0,
        left: 0,
        color: 0,
        content: 0
    },

    initialize: function() {
        this.count = 0;
    },

    tick: function() {
        var count = this.count += 1;
        this.set({
            top: Math.sin(count / 10) * 10,
            left: Math.cos(count / 10) * 10,
            color: (count) % 255,
            content: count % 100
        });
    }

});


var BoxView = Backbone.View.extend({

    className: 'box-view',

    template: _.template($('#underscore-template').html()),

    initialize: function() {
        this.model.bind('change', this.update, this);
    },

    render: function() {
        this.$el.html(this.template(this.model.attributes));
        this.box = this.$el.find('.box')[0];
        this.text = this.box.firstChild;
        return this;
    },

    update: function () {
        this.box.style.top = this.model.get('top') + 'px';
        this.box.style.left = this.model.get('left') + 'px';
        this.box.style.background = 'rgb(0,0,' + this.model.get('color') + ')';

        this.text.data = this.model.get('content');
    }

});

var boxes;

var backboneInit = function() {
    boxes = _.map(_.range(N), function(i) {
        var box = new Box({number: i});
        var view = new BoxView({model: box});
        $('#grid').append(view.render().el);
        return box;
    });
};

var backboneAnimate = function() {
    for (var i = 0, l = boxes.length; i < l; i++) {
      boxes[i].tick();
    }
};

window.runBackboneFast = function() {
    reset();
    backboneInit();
    benchmarkLoop(backboneAnimate);
};

})();

// The Ember implementation:
(function(){

var Box = Ember.Object.extend({

    top: 0,
    left: 0,
    content: 0,
    count: 0,

    tick: function() {
        var count = this.get('count') + 1;
        this.set('count', count);
        this.set('top', Math.sin(count / 10) * 10);
        this.set('left', Math.cos(count / 10) * 10);
        this.set('color', count % 255);
        this.set('content', count % 100);
        this.set('style', this.computeStyle());
    },

    computeStyle: function() {
        return 'top: ' + this.get('top') + 'px; left: ' +  this.get('left') +'px; background: rgb(0,0,' + this.get('color') + ');';
    }

});

var htmlbarsTemplate = Ember.HTMLBars.compile($('#htmlbars-box').text().trim());

var BoxView = Ember.View.extend({
    usingHTMLBars: true,
    template: htmlbarsTemplate,
    classNames: ['box-view']
});

var boxes;

// var App = Ember.Application.create();

var emberInit = function() {
    boxes = _.map(_.range(N), function(i) {
        var box = Box.create();
        var view = BoxView.create({context: box});
        view.appendTo('#grid');
        box.set('number', i);
        return box;
    });
};

var emberAnimate = function() {
    Ember.run(function() {
        for (var i = 0, l = boxes.length; i < l; i++) {
          boxes[i].tick();
        }
    });
};


window.runEmber = function() {
    reset();
    emberInit();
    benchmarkLoop(emberAnimate);
};

})();

// The React implementation:
(function(){

var BoxView = React.createClass({

    render: function() {
        var count = this.props.count + 1;
        return (
            React.DOM.div(
                {className: "box-view"},
                React.DOM.div(
                    {
                        className: "box",
                        style: {
                            top: Math.sin(count / 10) * 10,
                            left: Math.cos(count / 10) * 10,
                            background: 'rgb(0, 0,' + count % 255 + ')'
                        }
                    },
                    count % 100
                )
            )
        );
    }

});

var BoxesView = React.createClass({

    render: function() {
        var boxes = _.map(_.range(N), function(i) {
            return BoxView({key: i, count: this.props.count});
        }, this);
        return React.DOM.div(null, boxes);
    }

});

var counter;
var reactInit = function() {
    counter = -1;
    reactAnimate();
};

var reactAnimate = function() {
    React.renderComponent(
        BoxesView({count: counter++}),
        document.getElementById('grid')
    );
};

window.runReact = function() {
    reset();
    reactInit();
    benchmarkLoop(reactAnimate);
};

})();

// The Ractive implementation
(function () {
    var ractive, boxes, count;

    function ractiveInit () {
        var i = N;

        boxes = [];
        while ( i-- ) {
            boxes[i] = { top: 0, left: 0, color: 0, content: 0 };
        }

        ractive = window.ractive = new Ractive({
            el: 'grid',
            template: '#ractive-template',
            data: { boxes: boxes }
        });

        count = 0;
    }

    function ractiveAnimate () {
        var i, box;

        count += 1;

        i = boxes.length;
        while ( i-- ) {
            box = boxes[i];

            box.top = Math.sin(count / 10) * 10;
            box.left = Math.cos(count / 10) * 10;
            box.color = (count) % 255;
            box.content = count % 100;
        }

        ractive.update( 'boxes' );
    }

    window.runRactive = function () {
        reset();
        ractiveInit();
        benchmarkLoop(ractiveAnimate);
    };
}());

// The altr implementation
(function () {
  var altrTemplate = '' +
  '<div altr-for="box in boxes">' +
    '<div class="box-view">' +
      '<div class="box" style="top: {{box.top}}px; left: {{box.left}}px; background: rgb(0,0,{{box.color}});">' +
          '{{box.content}}' +
      '</div>' +
  '</div>'

  var el = document.getElementById('grid')

  window.runAltr = function () {
      reset()
      el.innerHTML = altrTemplate
      benchmarkLoop(altrInit())
  }

  function altrInit () {
    var i = N
    var boxes = []
    var state = {boxes: boxes}
    while (i--) {
      boxes[i] = {top: 0, left: 0, color: 0, content: 0}
    }

     var instance = altr(el, state)
     var count = 0

     return animate

     function animate () {
       var i, box
       count += 1

       i = boxes.length
       while (i--) {
         box = boxes[i]
         box.top = Math.sin(count / 10) * 10
         box.left = Math.cos(count / 10) * 10
         box.color = (count) % 255
         box.content = count % 100
       }

       instance.update(state, true)
     }
  }
}())

// The basis.js implementation
basis.ready(function(){
basis.require('basis.ui');

var BoxView = basis.ui.Node.subclass({
    container: document.getElementById('grid'),

    count: 0,
    number: null,

    template: 'id:basis-template',
    binding: {
        id: 'number',
        top: 'data:',
        left: 'data:',
        color: 'data:',
        content: 'data:'
    },

    tick: function() {
        var count = this.count += 1;
        this.update({
            top: Math.sin(count / 10) * 10,
            left: Math.cos(count / 10) * 10,
            color: (count) % 255,
            content: count % 100
        });
    },

    init: function(){
        basis.ui.Node.prototype.init.call(this);
        this.data = {
            top: 0,
            left: 0,
            color: 0,
            content: 0
        };
    }
});

var boxes;

var basisInit = function() {
    boxes = basis.array.create(N, function(idx) {
        return new BoxView({
            number: idx
        });
    });
};

var basisAnimate = function() {
    for (var i = 0, l = boxes.length; i < l; i++) {
        boxes[i].tick();
    }
};

window.runBasis = function() {
    reset();
    basisInit();
    benchmarkLoop(basisAnimate);
};

});

// The basis.js raw template implementation
basis.ready(function(){
basis.require('basis.template.html');

var boxTemplate = new basis.template.html.Template('id:basis-template');
var boxes;

var basisTemplateInit = function() {
    boxes = basis.array.create(N, function(idx) {
        var box = boxTemplate.createInstance();
        document.getElementById('grid').appendChild(box.element);
        box.set('id', idx);
        box.set('top', 0);
        box.set('left', 0);
        box.set('color', 0);
        box.set('content', 0);
        box.count = 0;
        return box;
    });
};

var basisTemplateAnimate = function() {
    for (var i = 0, l = boxes.length; i < l; i++) {
        var box = boxes[i];
        var count = box.count += 1;
        box.set('top', Math.sin(count / 10) * 10);
        box.set('left', Math.cos(count / 10) * 10);
        box.set('color', count % 255);
        box.set('content', count % 100);
    }
};

window.runBasisTemplate = function() {
    reset();
    basisTemplateInit();
    benchmarkLoop(basisTemplateAnimate);
};

});

    // rawdog
(function(){

var BoxView = function(number){
    this.el = document.createElement('div');
    this.el.className = 'box-view';
    this.el.innerHTML = '<div class="box" id="box-' + number + '"></div>';
    this.count = 0;
    this.render()
}

BoxView.prototype.render = function(){
     var count = this.count
     var el = this.el.firstChild
     el.style.top = Math.sin(count / 10) * 10 + 'px';
     el.style.left = Math.cos(count / 10) * 10 + 'px';
     el.style.background = 'rgb(0,0,' + count % 255 + ')';
     el.textContent = String(count % 100);
}

BoxView.prototype.tick = function(){
    this.count++;
    this.render();
}

var boxes;

var init = function() {
    boxes = _.map(_.range(N), function(i) {
        var view = new BoxView(i);
        $('#grid').append(view.el);
        return view;
    });
};

var animate = function() {
    for (var i = 0, l = boxes.length; i < l; i++) {
      boxes[i].tick();
    }
};

window.runRawdog = function() {
    reset();
    init();
    benchmarkLoop(animate);
};

})();


window.timeout = null;
window.totalTime = null;
window.loopCount = null;
window.reset = function() {
    if (window.ractive) {
        window.ractive.teardown();
    }
    $('#grid').empty();
    $('#timing').html('&nbsp;');
    $('#timing500').html('&nbsp;');
    clearTimeout(timeout);
    loopCount = 0;
    totalTime = 0;
};

var perfTime = performance
  ? function(){ return performance.now(); }
  : function(){ return new Date(); };

window.benchmarkLoop = function(fn) {
    var startDate = perfTime();
    // for (var i = 0; i < 100; ++i) {

    fn();
    // }
    var endDate = perfTime();
    totalTime += endDate - startDate;
    loopCount++;
    if (loopCount % 20 === 0) {
        $('#timing').text('Performed ' + loopCount + ' iterations in ' + parseInt(totalTime) + ' ms (average ' + (totalTime / loopCount).toFixed(2) + ' ms per loop).');
    }
    if (loopCount % 500 === 0) {
        $('#timing500').text('Performed ' + loopCount + ' iterations in ' + parseInt(totalTime) + ' ms (average ' + (totalTime / loopCount).toFixed(2) + ' ms per loop).');
    }
    timeout = _.defer(benchmarkLoop, fn);
};
