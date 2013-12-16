"use strict";

var fns = module.exports = {};

fns.thru = {

  process: function(attrs, message, done){
    done(null, attrs, message);
  }

};

fns.count = {

  attrs: {
    total: 0
  },

  init: function(done){
    done();
  },

  process: function(attrs, message, done){
    attrs.total ++;
    done(null, attrs, {total:attrs.total});
  }

};
