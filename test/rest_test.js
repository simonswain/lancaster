"use strict";

var config = require('../config.js');

var http = require('nodeunit-httpclient').create({
  port: config.port,
  path: '/',
  status: 200
});

var Lancaster = require('../lib/lancaster.js');

exports['rest'] = {

  'server-start-stop': function(test) {

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      server.reset(function(){
        server.stop();
      });
    });
    
    server.start();

  },

  'ping': function(test) {

    test.expect(2);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      server.reset(function(){
        http.get( test, 'ping', function(res) {
          test.ok(res.data.hasOwnProperty('pong'), 'Got Pong');
          server.stop();
        });
      });
    });
    
    server.start();

  },

  'inspect': function(test) {

    test.expect(2);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      server.reset(function(){
        http.get( test, 'nodes', function(res) {
          test.equal(typeof res.data, 'object');
          server.stop();
        });
      });
    });
    
    server.start();

  },

  'get-non-existant-node': function(test) {
    test.expect(1);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      server.reset(function(){
        http.get( 
          test, 
          'nodes/bogus', 
          {}, 
          {
            status: 404
          }, 
          function(res) {
            server.stop();
          });
      });
    });
    
    server.start();

  },

  'create-node': function(test) {
    test.expect(4);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      server.reset(function(){
        http.post(
          test, 
          'nodes', {
            data:{
              'id': 'test-node'
            }
          }, {
            status: 204
          }, function(res) {

            // inpsect to check nodes were created
            http.get( test, 'nodes', function(res) {
              test.equal(typeof res.data, 'object');
              test.ok(res.data.hasOwnProperty('test-node'));
              server.stop();
            });

          });

      });
    });
    
    server.start();

  },

  'delete-node': function(test) {
    test.expect(5);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      server.reset(function(){
        http.post(
          test, 
          'nodes', {
            data:{
              'id': 'test-node'
            }
          }, {
            status: 204
          }, function(res) {

            http.del(
              test, 
              'nodes/test-node', 
              {},
              {status: 204},
              function(res) {

                http.get( test, 'nodes', function(res) {
                  test.equal(typeof res.data, 'object');
                  test.equal(res.data.hasOwnProperty('test-node'), false);
                  server.stop();
                });
              });

          });
      });
    });
    
    server.start();

  },

  'inject': function(test) {
    //test.expect(5);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      server.reset(function(){
        http.post(
          test, 
          'nodes', 
          {data:{
            'id': 'test-node', 
            'factor':10,
            'fn': 'multiply'
          }},
          {status: 204}, 
          function(res) {
            var myMessage = {value: 1000.00};

            http.post(
              test, 
              'nodes/test-node/message', 
              {data: myMessage},
              {status: 204}, 
              function(res) {
                // get latched message
                http.get(
                  test, 
                  'nodes/test-node', 
                  function(res) {
                    test.equal(typeof res.data, 'object');
                    // should have latched most recent processed
                    // message
                    test.deepEqual(res.data.message, myMessage);
                    server.stop();
                  });
                
              });
          });
      });
    });
    
    server.start();

  },

};
