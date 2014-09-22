/*global Backbone:true,  _:true, App:true */
/*jshint browser:true */
/*jshint strict:false */

App.Collections.Nodes = Backbone.Collection.extend({
  model: App.Models.Node,
  initialize: function(models) {
    //_.bindAll(this, '');
  },
  comparator: function(model) {
    return model.get('id');
  }
});
