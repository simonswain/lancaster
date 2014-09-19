"use strict";

// some simple default fns. App using the library will replace these
// with it's own when instantiating the Topology.

var fns = module.exports = {};

fns.thru = {

  process: function(attrs, message, done){
    done(null, attrs, message);
  }

};

fns.count = {

  // default atts for the fn
  attrs: {
    total: 0
  },

  init: function(done){
    done();
  },

  // attrs are passed in by reference, and changed as require by fn to
  // update state

  process: function(attrs, message, done){
    attrs.total ++;
    done(null, attrs, {total:attrs.total});
  }

};

fns.multiply = {

  // default atts for the fn
  attrs: {
    factor: 10
  },

  init: function(done){
    done();
  },

  // attrs are passed in by reference, and changed as require by fn to
  // update state

  process: function(attrs, message, done){
    var ans = Number(message.value) * Number(attrs.factor);
    done(null, attrs, {value: ans});
  }

};
