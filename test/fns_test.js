"use strict";

var config = require('../config.js');
var async = require('async');
var Lancaster = require('../lib/lancaster.js');

exports['nodes'] = {

  'add-with-defaults': function(test) {
    test.expect(2);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on(
      'start',
      function(){
        async.series([
          server.reset,

          function(next){
            server.add({
              id: 'counter',
              fn: 'count'
            }, function(err){
              next();
            });
          },

          function(next){
            server.get(
              'counter', 
              function(err, node){
                test.equals(node.id, 'counter');
                test.deepEqual(node.attrs, {total: 0});
                next();
              });
          }
        ], function(err){
          server.stop();
        });
      });

    server.start();

  },


};
