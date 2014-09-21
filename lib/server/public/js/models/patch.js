/*global Backbone:true,  _:true, $:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Models.Patch = Backbone.Model.extend({
  defaults: { 
    id: null,
    title: '', 
    width: 1024,
    height: 1024,
    view_w: 1024,
    view_h: 1024,
    x: 0,
    y: 0,
    z: 8,
    scale: 1
  },
  initialize: function() {
    //_.bindAll(this);
  },
  zoom: function(ox, oy, delta){

    var zoomFactor = 1.2;

    var z = this.get('scale');
    var origZ = z;

    var w, h, f, dx, dy;

    w = this.get('width');
    h = this.get('height');

    var vw = this.get('view_w');
    var vh = this.get('view_h');

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

    this.set({
      scale: z
    });

  },
  pan: function(dx, dy){

    var x, y;

    x = this.get('x') + dx;
    y = this.get('y') + dy;

    var z = this.get('scale');

    var w = this.get('w');
    var h = this.get('h');

    var vw = this.get('view_w');
    var vh = this.get('view_h');

    // if(x>0){
    //   x = 0;
    // }

    // if(y>0){
    //   y = 0;
    // }

    // if(y>this.get('view_h')){
    //   y = this.get('view_h');
    // }

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

    // if(x>this.get('view_w')){
    //   x = this.get('view_w');
    // }
    
    this.set({
      x: x,
      y: y
    });

  },

});

