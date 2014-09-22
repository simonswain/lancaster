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
<dt>ws</dt><dd><%= socket %></dd>\
</dl>\
<button type="button" notab>Reset</button>'),
  initialize : function(opts) {
    var self = this;
    _.bindAll(this, 'render');
    this.controller = opts.controller;
    this.patch = opts.patch;
    this.listenTo(this.controller, 'change', this.render);
    this.listenTo(this.patch, 'change', this.render);
    this.render();
  },
  events: {
    'click button': 'onReset'
  },
  onReset: function(e){
    e.preventDefault();
    $(e).blur();
    App.socket.command(['reset']);
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
    _.bindAll(this, 'render','draw','keydown','keyup','mouseenter', 'mouseleave','mousedown','mouseup','mousemove','zoom', 'pan', 'mousewheel');

    this.controller = opts.controller;   
    this.patch = opts.patch;

    this.shift = false;
    this.ctrl = false;
    this.btn = false;

    this.startX = 0;
    this.startY = 0;

    this.x = 0;
    this.y = 0;

    this.grid = 64;

    this.mx = 0;
    this.my = 0;

    // size of viewport (canvas)
    this.cw = 320;
    this.ch = 320;

    // size of patch
    this.w = 1024;
    this.h = 1024;

    this.scale = 1;
    
    $(document).bind('keydown', this.keydown);
    $(document).bind('keyup', this.keyup);

    $(window).on('resize', this.render); 

    this.render();
  },
  onClose: function(){
    $(window).off('resize', this.render); 
  },
  events: {
    'mouseenter': 'mouseenter',
    'mouseleave': 'mouseleave',
    'mousemove': 'mousemove',
    'mousedown': 'mousedown',
    'mouseup': 'mouseup',
    'mousewheel': 'mousewheel'
  },
  keydown: function(e){
    //console.log('dn', e.which);
    var code = e.which;
    switch(code){
    case 16: 
      this.shift = true;
      break;
    case 17: 
      this.ctrl = true;
      break;
    }
  },
  keyup: function(e){
    //console.log('up', e.which);
    var code = e.which;
    switch(code){
    case 16: 
      this.shift = false;
      break;
    case 17: 
      this.ctrl = false;
      break;
    }
  },
  mousedown: function(e){
    e.preventDefault();
    this.btn = true;
    if(this.ctrl){
      this.btn = false;     
      var xy = this.viewToCanvas(e.pageX, e.pageY, true);
      
      this.patch.nodes.create({
        id: 'node-' + new Date().getTime(),
        attrs: {
          x: xy[0],
          y: xy[1]
        }
      });     
    } else {
      this.startX = e.pageX;
      this.startY = e.pageY;
    }
  },
  mouseup: function(e){
    e.preventDefault();
    if(this.btn && ! this.ctrl){
      this.startX = null;
      this.startY = null;
    }
    this.btn = false;     
  },
  mouseenter: function(e) {
    console.log('enter');
    this.mousein = true;
    this.btn = false;     
    this.startX = null;
    this.startY = null;
  },
  mouseleave: function(e) {
    console.log('leave');
    this.mousein = false;
    this.btn = false;     
    this.startX = null;
    this.startY = null;
  },
  mousewheel: function(e) {
    this.zoom(e.pageX, e.pageY, e.deltaY);
  },
  mousemove: function(e){
    this.mousein = true;
    if(this.btn && !this.ctrl){
      var dx = e.pageX - this.startX;
      var dy = e.pageY - this.startY;
      this.startX = e.pageX;
      this.startY = e.pageY;
      this.pan(dx, dy);
    }
    var xy = this.viewToCanvas(e.pageX, e.pageY);
    this.mx = xy[0];
    this.my = xy[1];

  },
  viewToCanvas: function(x, y, snap){
    x = ((x - this.px) - this.x) / this.scale;
    y = ((y - this.py) - this.y) / this.scale;
    if(x<0){
      x = 0;
    }
    if(x > this.w) {
      x = this.w;
    }
    if(y<0){
      y = 0;
    }   
    if(y > this.h) {
      y = this.h;
    }

    if(snap){
      x = (Math.floor(x/this.grid) * this.grid) + (this.grid/2);
      y = Math.floor(y/this.grid) * this.grid + (this.grid/2);

      if(x > this.w) {
        x = this.w - (this.grid/2);
      }
      if(y > this.h) {
        y = this.h - (this.grid/2);
      }

    }


    return [x, y];
  },
  zoom: function(ox, oy, delta){

    var zoomFactor = 1.2;

    var z = this.scale;
    var origZ = z;

    var w, h, f, dx, dy;

    w = this.w;
    h = this.h;

    var vw = this.cw;
    var vh = this.ch;

    if(delta < 0){
      z = z / zoomFactor;
    }

    if(delta > 0){
      z = z * zoomFactor;
    }

    if(z < 0.5 ) {
      z = 0.5;
    }

    if(z > 2 ) {
      z = 2;
    }

    if (origZ !== z) {
      f = vw * z;
      dx = f * (zoomFactor - 1) / 2;
      dy = f * (w / h) * (zoomFactor - 1) / 2;

      if(delta > 0){
          dx *= -1;
          dy *= -1;
      }

      this.pan(dx, dy);
    }
    

    this.scale = z;

  },
  pan: function(dx, dy){

    var x, y;

    x = this.x + dx;
    y = this.y + dy;

    var z = this.scale;

    var w = this.w;
    var h = this.h;

    var vw = this.cw;
    var vh = this.ch;

    if(x>(w+(w*z))){
      x = w+(w*z);
    }

    if(y>(w+(h*z))){
      y = w+(h*z);
    }

    if(x<(0 - (w*z))){
      x = 0 - (w*z);
    }

    if(y<(0 - (h*z))){
      y = 0 - (h*z);
    }
    
    this.x = x;
    this.y = y;

  },
  draw: function(){   
    
    var cw = this.cw;
    var ch = this.ch;

    var w = this.w;
    var h = this.h;

    var x = this.x;
    var y = this.y;

    var i, j, k;
    var sf = 1; //(cw / w) * (patch.scale / 100);
    var ctx = this.cview.getContext('2d');
    ctx.save();
    ctx.clearRect(0,0,cw,ch);
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

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


    // ctx.fillStyle = '#444';
    // ctx.strokeStyle = '#0cc';
    // ctx.lineWidth = 2;

    // for (i=128; i<1024; i+=128){
    //   for (j=128; j<1024; j+=128){
    //     ctx.beginPath();
    //     //ctx.arc(patch.x, patch.y, patch.z*24, 0, 2 * Math.PI, true);
    //     ctx.beginPath();
    //     ctx.arc(i, j, 25, 0, 2 * Math.PI, true);
    //     ctx.fill();
    //     ctx.closePath();
    //     ctx.stroke();
    //   }
    // }

   
    this.patch.nodes.each(function(node){
      var data = node.toJSON();

      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#900';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(data.attrs.x, data.attrs.y, 25, 0, 2 * Math.PI, true);
      ctx.fill();
      ctx.closePath();     
      ctx.stroke();
    });

    // cursor

    // vert
    if(this.mousein){
      ctx.strokeStyle = '#ff0';
      ctx.beginPath();
      ctx.moveTo(this.mx - 16, this.my);
      ctx.lineTo(this.mx + 16, this.my);
      ctx.stroke();
      // horiz
      ctx.beginPath();
      ctx.moveTo(this.mx, this.my - 16);
      ctx.lineTo(this.mx, this.my + 16);
      ctx.stroke();
    }

    ctx.restore();

    ctx.fillStyle = '#666';
    ctx.fillText(Math.floor(this.x) + ' ' + Math.floor(this.y) + ' ' + this.scale.toFixed(2), 20, 20);
    ctx.fillText(Math.floor(this.mx) + ' ' + Math.floor(this.my), 20, 40);

  },
  render: function() {
    var self = this;

    var running = false;

    var data = this.patch.toJSON();

    $(this.el).html('<canvas id="patcher" class="patcher"></canvas>');

    this.w = this.patch.get('width');
    this.h = this.patch.get('height');

    this.cview = document.getElementById('patcher');
    this.cw = this.cview.width = this.$('.patcher').width();
    this.ch = this.cview.height = this.$('.patcher').height();

    this.px = this.$('.patcher').offset().left;
    this.py = this.$('.patcher').offset().top;
    console.log(this.px, this.py);
    var run = function () {
      if(!running){
        return;
      }
      self.draw();
      window.requestAnimationFrame(run);
    };

    running = true;
    run();

  }
});

