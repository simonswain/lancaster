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

Backbone.sync = function(method, model, options){
  console.log('SYNC', method, model.toJSON());
  App.socket.command(['add', model.toJSON()]);
};

var App = {
  Models: {},
  Collections: {},
  Views: {},
  start: function(){

    this.controller = new App.Models.Controller({
      orgs: this.orgs
    });

    this.patch = new App.Models.Patch([], {
      controller: this.controller
    });

    this.socket = new App.Socket({
      controller: this.controller,
      patch: this.patch,
    });

    this.views = {
      patch: new App.Views.Patch({
        controller: this.controller,
        patch: this.patch,
        socket: this.socket,
        el: $('<div />')
          .addClass('patch')
          .appendTo($('#app'))
      })
    };

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
              'handle',
              'handleAll','handleAdd','handleDel'
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
    this.command(['all']);
  },
  command: function(command){
    // command = [method, ...arg, arg...]
    console.log('to >WS command', command);
    this.ws.send(JSON.stringify(command));
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
    //console.log('from WS>',msg);
    var command = msg[0];
    var args = msg;
    args.shift();
    switch (command){
      case 'all':
      this.handleAll(args);
      break;

      case 'add':
      this.handleAdd(args);
      break;

      case 'set':
      this.handleSet(args);
      break;

      case 'del':
      this.handleDel(args);
      break;

      case 'addSource':
      this.handleAddSource(args);

      case 'setData':
      this.handleSetData(args);
      break;


    }
  },
  handleAll: function(args){
    var nodes = _.toArray(args[0]);
    this.patch.nodes.add(nodes);
  },
  handleAdd: function(args){
    var node = args[1];
    //console.log('ADD', node);
    this.patch.nodes.add([node]);
  },
  handleSet: function(args){
    var id = args[0];
    var node = this.patch.nodes.get(this.patch.nodes.get(id));
    node.set(args);
  },
  handleDel: function(args){
    var id = args[0];
    this.patch.nodes.remove(this.patch.nodes.get(id));
  },
  handleAddSource: function(args){
    var id = args.shift();
    //console.log('Addsource', id, args);
    var node = this.patch.nodes.get(this.patch.nodes.get(id));
    if(!node){
      return;
    }
    //console.log(node);
    var sources = node.get('sources');
    sources.push(args[0]);
    node.set({sources: sources});
  },
  handleSetData: function(args){
    var id = args[0];
    //console.log('setData!', id, args);
    var node = this.patch.nodes.get(this.patch.nodes.get(id));
    node.set({data:args[1]});
  }

});
