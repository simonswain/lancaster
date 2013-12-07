"use strict";

var config = require('../config.js');

var async = require('async');

var http = require('nodeunit-httpclient').create({
  port: config.port,
  path: '/',
  status: 200
});

var Lancaster = require('../lib/lancaster.js');

exports['nodes'] = {

  'add-dup': function(test) {
    test.expect(1);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      async.series([
        server.reset,

        function(next){
          server.add({
            'id': 'counter',
            'fn': 'count'
          }, next);
        },

        // add dup node
        function(next){
          server.add({
            'id': 'counter',
            'fn': 'count'
          }, function(err){
            test.ok(err);
            server.stop();
          });
        }
      ]);

    });

    server.start();

  },

};
