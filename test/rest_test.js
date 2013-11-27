"use strict";

var config = require('../config.js');

var http = require('nodeunit-httpclient').create({
  port: config.port,
  path: '/',
  status: 200
});

var landcaster = require('../lib/landcaster.js');

exports['rest'] = {

  'server-start-stop': function(test) {
    landcaster(config, function(server){
      server.stop(function(){
        test.done();
      });
    });
  },

  'ping': function(test) {
    test.expect(2);
    landcaster(config, function(server){
      http.get( test, 'ping', function(res) {
        test.ok(res.data.hasOwnProperty('pong'), 'Got Pong back from Ping');
        server.stop(function(){
          test.done();
        });
      });
    });
  },

  'inspect': function(test) {
    test.expect(2);
    landcaster(config, function(server){
      http.get( test, 'nodes', function(res) {
        test.equal(typeof res.data, 'object');
        server.stop(function(){
          test.done();
        });
      });
    });
  },

  'get-non-existant-node': function(test) {
    test.expect(1);
    landcaster(config, function(server){
      http.get( 
        test, 
        'nodes/bogus', 
        {}, 
        {
          status: 404
        }, 
        function(res) {
          server.stop(function(){
            test.done();
          });
        });
    });
  },

  'create-node': function(test) {
    test.expect(4);
    landcaster(config, function(server){
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
            server.stop(function(){
              test.done();
            });
          });

        });
    });
  },

  'delete-node': function(test) {
    test.expect(5);

    landcaster(config, function(server){
      // create
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
                server.stop(function(){
                  test.done();
                });
              });
            });

        });
    });
  },

  'inject': function(test) {
    //test.expect(5);
    landcaster(config, function(server){
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
                // get val
                http.get(
                  test, 
                  'nodes/test-node', 
                  function(res) {
                    test.equal(typeof res.data, 'object');
                    // should have latched most recent processed message
                    test.deepEqual(res.data.val, myMessage);
                    server.reset(function(){
                      server.stop(function(){
                        test.done();
                      });
                    });
                  });
                
              });
          });
      });      
    });
  },

};
