"use strict";

var Lancaster = require('../lib/lancaster.js');
var config = require('../config.js');

exports['lancaster'] = {
  'exports': function(test) {
    test.expect(1);
    test.equal( typeof Lancaster, 'function', 'should be a function');
    test.done();
  },
  // clean up from any previous runs
  'create': function(test) {
    Lancaster(config, function(server){
      server.stop(function(){
        test.done();
      });
    });
  },

};
