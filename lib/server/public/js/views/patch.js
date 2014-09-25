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
    _.bindAll(this, 'render','flatten', 'draw','keydown','keyup','mouseenter', 'mouseleave','mousedown','mouseup','mousemove','zoom', 'pan', 'mousewheel');

    this.controller = opts.controller;   
    this.patch = opts.patch;

    this.shift = false;
    this.ctrl = false;
    this.btn = false;

    this.hoverNode = false;
    this.fromNode = false;
    this.connecting = false;

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

    this.listenTo(this.patch.nodes, 'change add remove', this.flatten);
    this.flatNodes = [];
    this.render();
  },
  onClose: function(){
    $(window).off('resize', this.render); 
  },
  flatten: function(){
    var flat = this.flatNodes = [];
    this.patch.nodes.each(function(x){
      var j = x.toJSON();
      flat.push([j.id, Number(j.x), Number(j.y)]);
    });
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
    // clicked in space while connecting
    if(!this.hoverNode && this.connecting){
      this.connecting = false;
      this.fromNode = false;
      return;
    }

    // clicked on target when connecting
    if(this.hoverNode && this.connecting){

      if(this.hoverNode !== this.fromNode){
        this.patch.connect(this.fromNode[0], this.hoverNode[0]);
      }
      
      // clear 
      this.connecting = false;
      this.fromNode = false;
      return;
    }

    // clicked a node to connect from 
    // need at least two nodes
    if(this.hoverNode && !this.connecting && this.flatNodes.length>1){
      this.connecting = true;
      this.fromNode = this.hoverNode;
      return;
    }

    if(this.ctrl){
      this.btn = false;     
      var xy = this.pageXYtoGrid(e.pageX, e.pageY, true);     
      this.patch.nodes.create({
        id: 'node-' + new Date().getTime(),
        x: xy[0],
        y: xy[1]
      });
    } else {
      this.btn = true;
      this.startX = e.pageX;
      this.startY = e.pageY;
    }
  },
  mouseup: function(e){
    e.preventDefault();
    if(this.btn && !this.ctrl){
      this.startX = null;
      this.startY = null;
    }
    this.btn = false;     
  },
  mouseenter: function(e) {
    this.mousein = true;
    this.btn = false;     
    this.startX = null;
    this.startY = null;
  },
  mouseleave: function(e) {
    this.mousein = false;
    this.btn = false;     
    this.startX = null;
    this.startY = null;
  },
  mousewheel: function(e) {
    this.zoom(e.deltaY, e.pageX, e.pageY);
    var xy = this.pageXYtoGrid(e.pageX, e.pageY);
    this.mx = xy[0];
    this.my = xy[1];
    this.hoverDetect();
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
    var xy = this.pageXYtoGrid(e.pageX, e.pageY);
    this.mx = xy[0];
    this.my = xy[1];
    this.hoverDetect();
  },
  hoverDetect: function(){
    var mx = this.mx;
    var my = this.my;
    var mr = Math.sqrt((this.mx * this.mx) + (this.my * this.my));
    var hover = _.find(this.flatNodes, function(n){
      var r = Math.sqrt(Math.pow(mx-n[1], 2) + Math.pow(my-n[2],2));
      return (r < 16);
    });
    if(!hover){
      this.hoverNode = false;
      return;
    }
    this.hoverNode = hover;
  },
  pageXYtoView: function(x, y){
    // mouse position to absolute position within canvas
    x = x - this.px;
    y = y - this.py;
    return [x, y];
  },
  pageXYtoGrid: function(x, y, snap){
    // mouse position to position on patch grid
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
  gridXYtoView: function(x, y){
    // position on grid to actual pixel position on canvas
    x = ((x + this.px) + this.x) * this.scale;
    y = ((y + this.py) + this.y) * this.scale;
    return [x, y];
  },
  zoom: function(delta, ox, oy){

    // zoom on origin ox, oy

    // mouse postition on grid before zoom
    var xy = this.pageXYtoGrid(ox, oy);     
    var dx, dy;
    var zoomFactor = 1.2;

    if(delta < 0){
      zoomFactor = 1/zoomFactor;
    }

    var z = this.scale * zoomFactor;

    // constrain min/max zoom depth
    
    if(z < 0.5 ) {
      z = 0.5;
    }

    if(z > 2 ) {
      z = 2;
    }

    // nothing to do
    if(this.scale === z){
      return;
    }

    // do the zoom
    this.scale = z;

    // convert previous grid mouse position to new screen position
    var sxy = this.pageXYtoGrid(ox, oy);     

    // diff with original screen mouse position  
    dx = (sxy[0] - xy[0]) * this.scale;
    dy = (sxy[1] - xy[1]) * this.scale;

    // pan by that amount to center on mouse
    this.pan(dx, dy);
    

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

    var i, j, k, ii, jj;
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

    // connection from click-to-connect

    if(this.mousein && this.connecting){
      ctx.strokeStyle = '#0cc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.fromNode[1], this.fromNode[2]);
      ctx.lineTo(this.mx, this.my);
      ctx.stroke();
    }


    // stash xy positions of each node so we can quickly find them for
    // drawing connections

    var nodes = {};

    var hoverNode = this.hoverNode[0];
    var fromNode = this.fromNode[0];
    this.patch.nodes.each(function(node){
      var data = node.toJSON();
      nodes[data.id] = data;
      if(hoverNode === data.id){
        ctx.strokeStyle = '#0cc';
        ctx.fillStyle = '#000';
      } else if(fromNode === data.id){
        ctx.strokeStyle = '#077';
        ctx.fillStyle = '#000';
      } else {
        ctx.strokeStyle = '#900';
        ctx.fillStyle = '#222';
      }
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(data.x, data.y, 25, 0, 2 * Math.PI, true);
      ctx.fill();
      ctx.closePath();     
      ctx.stroke();
    });

    ctx.strokeStyle = '#099';
    ctx.lineWidth = 2;

    _.each(nodes, function(node){
      var source;
      if(node.sources.length === 0){
        return;
      }
      for(var j=0, jj=node.sources.length; j<jj; j++){
        source = node.sources[j];
        ctx.beginPath();
        ctx.moveTo(nodes[source].x, nodes[source].y);
        ctx.lineTo(node.x, node.y);
        ctx.closePath();     
        ctx.stroke();
      }
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

    ctx.fillStyle = '#aaa';
    ctx.font = '12pt arial';
    ctx.fillText(Math.floor(this.x) + ' ' + Math.floor(this.y) + ' ' + this.scale.toFixed(2), 20, 20);
    ctx.fillText(Math.floor(this.mx) + ' ' + Math.floor(this.my), 20, 40);
    ctx.fillText(this.hoverNode + ' ' + this.fromNode, 20, 60);

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

