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
    //_.bindAll(this);
  }

});

