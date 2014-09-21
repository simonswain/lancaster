/*global Backbone:true,  _:true, $:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Models.Nodeb = Backbone.Model.extend({
  defaults: { 
    id: null,
    title: '', 
  },
  initialize: function() {
    //_.bindAll(this);
  }
});

