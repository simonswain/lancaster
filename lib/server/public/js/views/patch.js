/*global Backbone:true, $:true, _:true, App:true */
/*jshint multistr:true */
/*jshint browser:true */
/*jshint strict:false */

App.Views.Patch = Backbone.View.extend({
  template: _.template('<div class="tray">\
</div>\
<div class="canvas"></div>'),
  initialize : function(opts) {
    var self = this;
    _.bindAll(this, 'render');
    this.controller = opts.controller;
    this.patch = opts.patch;
    this.render();
  },
  render: function() {
    _.each(this.views, function(x){
      x.close();
    });
    $(this.el).html('');
    this.views = {};
    $(this.el).html(this.template());

    this.views.tray = new App.Views.Tray({
      controller: this.controller,
      patch: this.patch,
      el: $('<div />')
        .appendTo($('.tray'))
    });

    this.views.canvas = new App.Views.Canvas({
      controller: this.controller,
      patch: this.patch,
      el: $('<div />')
        .addClass('patch')
        .appendTo($('.canvas'))
    });

  }
});


App.Views.Tray = Backbone.View.extend({
  template: _.template('<h1>Lancaster</h1>\
<dl>\
<dt>w</dt><dd><%= width %></dd>\
<dt>h</dt><dd><%= height %></dd>\
<dt>x</dt><dd><%= Math.floor(x) %></dd>\
<dt>y</dt><dd><%= Math.floor(y) %></dd>\
<dt>z</dt><dd><%= scale.toFixed(2) %></dd>\
<dt>ws</dt><dd><%= socket %></dd>\
</dl>'),
  initialize : function(opts) {
    var self = this;
    _.bindAll(this, 'render');
    this.controller = opts.controller;
    this.patch = opts.patch;
    this.listenTo(this.controller, 'change', this.render);
    this.listenTo(this.patch, 'change', this.render);
    this.render();
  },
  render: function() {
    var data = this.patch.toJSON();
    data.socket = this.controller.get('socket');
    $(this.el).html(this.template(data));
  }
});


App.Views.Canvas = Backbone.View.extend({
  initialize : function(opts) {
    var self = this;
    _.bindAll(this, 'render','draw','keydown','keyup','mousedown','mouseup','mousemove','click','zoom');
    this.controller = opts.controller;   
    this.patch = opts.patch;
    this.btn = false;
    this.drag = false;
    this.startX = 0;
    this.startY = 0;

    $(document).bind('keydown', this.keydown);
    $(document).bind('keyup', this.keyup);

    this.render();
  },
  events: {
    'mousemove': 'mousemove',
    'mousedown': 'mousedown',
    'mouseup': 'mouseup',
    'mousewheel': 'zoom'
  },
  keydown: function(e){
    //console.log('dn', e.which);
    var code = e.which;
    switch(code){
    case 32: 
      this.drag = true;
      break;
    }
  },
  keyup: function(e){
    //console.log('up', e.which);
    var code = e.which;
    switch(code){
    case 32: 
      this.drag = false;
      break;
    }
  },
  mousedown: function(e){
    e.preventDefault();
    this.btn = true;
    this.startX = e.pageX;
    this.startY = e.pageY;
  },
  mouseup: function(e){
    e.preventDefault();
    if(this.btn && this.drag){
      this.startX = null;
      this.startY = null;
    } else {
      this.patch.nodes.add({
        id: 'node-' + new Date().getTime(),
        x: e.pageX,
        y: e.pageY
      });
    }
    this.btn = false;     
  },
  click: function(e){
  },
  zoom: function(e) {
    this.patch.zoom(e.pageX, e.pageY, e.deltaY);
  },
  mousemove: function(e){
    if(this.btn && this.drag){
      var dx = e.pageX - this.startX;
      var dy = e.pageY - this.startY;
      this.startX = e.pageX;
      this.startY = e.pageY;
      this.patch.pan(dx, dy);
    }
  },
  draw: function(){   
    
    var cw = this.cw;
    var ch = this.ch;

    var w = this.w;
    var h = this.h;

    var patch = this.patch.toJSON();
    var i, j, k, x, y, z;
    var sf = 1; //(cw / w) * (patch.scale / 100);
    var ctx = this.cview.getContext('2d');
    ctx.save();
    ctx.clearRect(0,0,cw,ch);
    ctx.translate(patch.x, patch.y);
    ctx.scale(patch.scale, patch.scale);

    // gridlines
    ctx.strokeStyle = '#660';
    for (i=0; i<=1024; i+=64){
      // horiz
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
      // vert
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }


    ctx.fillStyle = '#444';
    ctx.strokeStyle = '#0cc';
    ctx.lineWidth = 2;

    for (i=128; i<1024; i+=128){
      for (j=128; j<1024; j+=128){
        ctx.beginPath();
        //ctx.arc(patch.x, patch.y, patch.z*24, 0, 2 * Math.PI, true);
        ctx.beginPath();
        ctx.arc(i, j, 25, 0, 2 * Math.PI, true);
        ctx.fill();
        ctx.closePath();
        ctx.stroke();
      }
    }

    this.patch.nodes.each(function(node){
      var data = node.toJSON();

      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#900';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(data.x, data.y, 25, 0, 2 * Math.PI, true);
      ctx.fill();
      ctx.closePath();     
      ctx.stroke();
    });





    ctx.restore();


  },
  render: function() {
    var self = this;

    var data = this.patch.toJSON();
    console.log(data);

    $(this.el).html('<canvas id="patcher" class="patcher"></canvas>');

    this.cview = document.getElementById('patcher');
    this.cw = this.cview.width = this.$('.patcher').width();
    this.ch = this.cview.height = this.$('.patcher').height();

    this.w = this.patch.get('width');
    this.h = this.patch.get('height');

    this.controller.set({
      view_w: this.w,
      view_h: this.h
    });
    
    $('#my_elem').on('mousewheel', function(event) {
      console.log(event.deltaX, event.deltaY, event.deltaFactor);
    }); 

    var run = function () {
      self.draw();
      window.requestAnimationFrame(run);
    };

    run();

  }
});

