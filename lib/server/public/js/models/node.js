/*global Backbone:true,  _:true, $:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Models.Node = Backbone.Model.extend({
  defaults: { 
    id: null,
    x: null,
    y: null,
    fn: 'thru',
    data: {},
    attrs: {},
    title: '',
    sources: []
  },
  initialize: function() {
    //_.bindAll(this);
  }
});
