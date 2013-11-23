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
  }

};
