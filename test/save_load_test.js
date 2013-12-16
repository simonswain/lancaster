"use strict";

var async = require('async');
var config = require('../config.js');

var Lancaster = require('../lib/lancaster.js');

// create a topo, do some actions on them, stop and start the topo.
// the data from the actions should have been persisted

exports['save-load'] = {

  // create a node, stop/start. node and it's attrs should still be
  // there

  'restore': function(test) {
    test.expect(4);

    var first = function(done){

      var server = new Lancaster(config);

      server.on('stop', function(){       
        done();
      });

      server.on('start', function(){
        async.series([
          server.reset,
          function(next){
            server.add({
              id: 'test-node',
              attrs:{
                factor: 10
              }
            }, next);
          },

          function(next){
            next();
          },
          server.stop
        ]);
      });

      server.start();
    };

    var second = function(done){

      var server = new Lancaster(config);

      server.on('stop', function(){
        test.done();
      });

      server.on('start', function(){
        async.series([
          function(next){
            // should have reloaded node
            server.get(
              'test-node',
              function(err, node){
                test.equal(typeof node, 'object');
                test.equal(node.id, 'test-node');
                test.equal(typeof node.attrs, 'object');
                test.equal(node.attrs.factor, 10);
                next();
              });

          },
          server.stop
        ]);
      });

      server.start();
      
    };

    async.series([first, second]);
    
  }

};
