/*global Backbone:true,  _:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Collections.Nodes = Backbone.Collection.extend({
  model: App.Models.Node,
  initialize: function(models) {
    //_.bindAll(this, '');
  },
  url: function(){
    var url = '/nodes';
    return url;
  },
  comparator: function(model) {
    return model.get('id');
  }
});
