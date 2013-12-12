"use strict";

var fns = module.exports = {};

fns.default = {
  init: function(done){
    done();
  },
  process: function(message, done){
    done(null, message);
  },
  stop: function(done){
    done();
  }
};

fns.thru = {
  process: function(message, done){
    return done(null, message);
  }
};

fns.count = {
  init: function(done){
    this.count = 0;
    done();
  },
  process: function(message, done){
    this.count ++;
    return done(null, {count: this.count});
  }
};

fns.scale = {
  init: function(done){
    this.factor = 1;
    done();
  },
  process: function(message, done){
    this.count ++;
    return done(null, {count: this.count});
  }
};

