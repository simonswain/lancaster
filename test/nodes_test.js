"use strict";

var config = require('../config.js');
var async = require('async');
var Lancaster = require('../lib/lancaster.js');

exports['nodes'] = {

  'get-unknown': function(test) {
    test.expect(1);

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
            server.get(
              'test', 
              function(err, node){
                test.equals(node, null);
                next();
              });
          }
  
        ], function(err){
          server.stop();
        });
      });

    server.start();

  },

  'add': function(test) {
    test.expect(1);

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
              'id': 'test'
            }, function(err){
              next();
            });
          },

          function(next){
            server.get(
              'test', 
              function(err, node){
                test.equals(node.id, 'test');
                next();
              });
          }
        ], function(err){
          server.stop();
        });
      });

    server.start();

  },

 'del': function(test) {
    test.expect(1);

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
              'id': 'test'
            }, function(err){
              next();
            });
          },

          function(next){
            server.del(
              'test', 
              function(err){
              next();
              });
          },

          function(next){
            server.get(
              'test', 
              function(err, node){
                test.equals(node, null);
                next();
              });
          }
        ], function(err){
          server.stop();
        });
      });

    server.start();

  },

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
              'id': 'test'
            }, function(err){
              next();
            });
          },
        
        // add dup node
        function(next){
          server.add({
            'id': 'test'
          }, function(err){
            test.ok(err);
            next();
          });
        }], function(err){
          server.stop();
        });

    });

    server.start();

  },


  'add-with-attrs': function(test) {
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
              'id': 'test',
              'attrs': {foo: 'bar'}
            }, function(err){
              next();
            });
          },

          function(next){
            server.get(
              'test', 
              function(err, node){
                test.equals(node.id, 'test');
                test.deepEqual(node.attrs, {foo:'bar'});
                next();
              });
          }
        ], function(err){
          server.stop();
        });
      });

    server.start();

  },


  'set-attrs': function(test) {
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
              'id': 'test',
              'attrs': {foo: 'bar'}
            }, function(err){
              next();
            });
          },

          function(next){
            server.set(
              'test',
              {foo: 'quxx'}, 
              function(err){
                next();
              });
          },

          function(next){
            server.get(
              'test', 
              function(err, node){
                test.equals(node.id, 'test');
                test.deepEqual(node.attrs, {foo:'quxx'});
                next();
              });
          }
        ], function(err){
          server.stop();
        });
      });

    server.start();

  },


  'add-with-sources': function(test) {
    test.expect(2);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on(
      'start',
      function(){

        var mysources = ['input', 'another'];
        async.series([
          server.reset,

          function(next){
            server.add({
              'id': 'test',
              'sources': mysources
            }, function(err){
              next();
            });
          },

          function(next){
            server.get(
              'test', 
              function(err, node){
                test.equals(node.id, 'test');
                test.deepEqual(node.sources, mysources);
                next();
              });
          }
        ], function(err){
          server.stop();
        });
      });

    server.start();

  },


  'all': function(test) {
    test.expect(4);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on(
      'start',
      function(){

        var mynode = {
              'id': 'test',
              'attrs': {foo:'bar'},
              'sources': ['input']
        };

        async.series([
          server.reset,

          function(next){
            server.add(
              mynode,
              function(err){
              next();
            });
          },

          function(next){
            server.all(
              function(err, nodes){
                // response will have targets supplied also
                test.equals(nodes['test'].id, mynode.id);
                test.equals(nodes['test'].fn, mynode.fn);
                test.deepEqual(nodes['test'].attrs, mynode.attrs);
                test.deepEqual(nodes['test'].sources, mynode.sources);
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
