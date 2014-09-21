/*global Backbone:true,  _:true, $:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

$(function(){
  App.start();
});

Backbone.View.prototype.close = function(){
  this.stopListening();
  if (this.onClose){
    this.onClose();
  }
  this.remove();
};

var App = {
  self: this,
  Models: {},
  Collections: {},
  Views: {},
  views: {},
  controller: null,
  start: function(){

    var self = this;

    self.controller = new App.Models.Controller({
      orgs: self.orgs
    });

    self.patch = new App.Models.Patch([], {
      controller: self.controller
    });

    self.socket = new App.Socket({
      controller: self.controller,
      patch: self.patch,
    });

    //self.router = new App.Router();

    self.views.patch = new App.Views.Patch({
      controller: self.controller,
      patch: self.patch,
      el: $('<div />')
        .addClass('patch')
        .appendTo($('#app'))
    });

    //Backbone.history.start({pushState: true});

    $(document).on("click", "a:not([data-bypass])", function(e) {
      var href = $(this).attr("href");
      var protocol = this.protocol + "//";
      if (href.slice(0, protocol.length) !== protocol) {
        e.preventDefault();
        App.router.navigate(href, true);
      }
    });
  }
};


/*global Backbone:true,  _:true, $:true, backbone:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Socket = Backbone.Model.extend({
  initialize: function(opts){
    _.bindAll(this,
              'watchdog','connect',
              'onopen','onmessage','onerror','onclose',
              'handle'
             );

    this.controller = opts.controller;
    this.patch = opts.patch;

    this.ws = null;
    this.timer = null;

    this.connect();
    this.timer = setInterval(this.watchdog, 5000);

  },
  watchdog: function(){

    if(!this.ws){
      this.connect();
      return;
    }

    if(this.ws.readyState === 3){
      this.connect();
    }

  },
  connect: function(){

    if(this.ws && this.ws.readyState !== 3){
      return;
    }

    var uri;
    var l = window.location;
    uri = ((l.protocol === "https:") ? "wss://" : "ws://") + l.hostname + (((l.port !== 80) && (l.port !== 443)) ? ':' + l.port : '');

    this.ws = new WebSocket(uri);
    this.ws.onopen = this.onopen;
    this.ws.onerror = this.onerror;
    this.ws.onmessage = this.onmessage;
    this.ws.onclose = this.onclose;

  },
  onopen: function(){
    // identify ourselves with the token the server gave us over REST
    this.controller.set({'socket': true});
    this.ws.send(JSON.stringify(['all']));
  },
  onmessage: function(e){
    var msg;
    try{
      msg = JSON.parse(e.data);
    } catch(err) {
      return;
    } finally {
      this.handle(msg);
    }
  },
  onerror: function(err){
    //console.log('socket err', err);
  },
  onclose: function(){
    //console.log('socket closed');
    this.controller.set({'socket': false});
  },
  handle: function(msg){
    console.log(msg);
  }
});
