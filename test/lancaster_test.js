"use strict";

var async = require('async');

var Lancaster = require('../lib/lancaster.js');
var config = require('../config.js');

exports['lancaster'] = {
  'exports': function(test) {
    test.expect(1);
    test.equal( 
      typeof Lancaster, 
      'function', 
      'should be a function'
    );
    test.done();
  },

  'start-stop': function(test) {
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
  },


  'reset': function(test) {
    test.expect(1);
    var server = new Lancaster(config);

    server.on('stop', function(){
      test.ok(true);
      test.done();
    });

    server.on('start', function(){
      async.series([
        server.reset,
        server.stop
      ]);
    });

    server.start();

  }


};
