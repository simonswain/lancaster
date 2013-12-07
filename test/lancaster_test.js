"use strict";

var Lancaster = require('../lib/lancaster.js');
var config = require('../config.js');

exports['lancaster'] = {
  'exports': function(test) {
    test.expect(1);
    test.equal( typeof Lancaster, 'function', 'should be a function');
    test.done();
  },

  'create': function(test) {
    test.expect(3);
    var server = new Lancaster(config);

    server.on('start', function(){
      test.ok(true);
    });

    server.on('stop', function(){
      test.ok(true);
      test.done();
    });

    server.start(function(){
      test.ok(true);
      server.stop(function(){
      });
    });
  }

};
