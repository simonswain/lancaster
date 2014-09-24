/*global Backbone:true,  _:true, $:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Models.Patch = Backbone.Model.extend({
  defaults: { 
    id: null,
    title: '', 
    width: 1024,
    height: 1024
  },
  initialize: function() {
    this.nodes = new App.Collections.Nodes([]);

    // this.socket is set directly in App 

    _.bindAll(this, 'connect');
  },
  connect: function(from_id, to_id){
    console.log(from_id + ' ' + to_id);
    App.socket.command(['addSource', to_id, from_id]);
  }

});

