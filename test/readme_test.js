"use strict";

var config = require('../config.sample.js');

var Lancaster = require('../index.js');

var http = require('nodeunit-httpclient')
  .create({
    host: config.server.host,
    port: config.server.port,
    path: '/',
    status: 200
  });

var api, worker, server;

exports.readme = {

  'new-api': function(test) {
    api =  Lancaster.api(config);
    test.done();
  },

  'new-worker': function(test) {
    worker =  Lancaster.worker(config);
    test.done();
  },

  'new-server': function(test) {
    server =  Lancaster.server(config);
    test.done();
  },

  'start-server': function(test) {
    server.start(function(){
      test.done();
    });
  },

  'reset': function(test) {
    test.expect(1);
    http.post(
      test,
      'reset',
      function(res) {
        test.done();
      });
  },

  'create-my-node': function(test) {
    test.expect(1);
    http.post(
      test,
      'nodes', {
        data:{"id":"my-node", "fn":"multiply","attrs":{"factor":10}}
      }, {
        status: 200
      }, function(res) {
        test.done();
      });
  },

  'check-my-node': function(test) {
    test.expect(5);
    http.get(
      test,
      'nodes/my-node',
      function(res) {
        test.equal(typeof res.data, 'object');
        test.equals(res.data.id, 'my-node');
        test.equals(res.data.fn, 'multiply');
        test.equals(res.data.attrs.factor, 10);
        test.done();
      });
  },

  'create-other-node': function(test) {
    test.expect(1);
    http.post(
      test,
      'nodes', {
        data:{"id":"other-node", "fn":"multiply","attrs":{"factor":2}, "sources":["my-node"]}
      }, {
        status: 200
      }, function(res) {
        test.done();
      });
  },

  'check-other-node': function(test) {
    test.expect(5);
    http.get(
      test,
      'nodes/other-node',
      function(res) {
        test.equal(typeof res.data, 'object');
        test.equals(res.data.id, 'other-node');
        test.equals(res.data.fn, 'multiply');
        test.equals(res.data.attrs.factor, 2);
        test.done();
      });
  },

  'inject': function(test) {
    http.post(
      test,
      'nodes/my-node/message', {
        data: {value: 100},
      }, {
        status: 200
      }, function(res) {
        test.done();
      });
  },

  'tick-1': function(test) {
    test.expect(2);
    worker.tick(function(err, id, output){
      test.equal(id, 'my-node');
      test.deepEqual(output, {value: 1000});
      test.done();
    });
  },

  'get-my-node': function(test) {
    test.expect(3);
    http.get(
      test,
      'nodes/my-node',
      function(res) {
        // should have latched most recent processed
        // message
        var node = res.data;
        test.equal(typeof node, 'object');
        test.equal(node.data.value, 1000);
        test.done();
      });
  },

  'tick-2': function(test) {
    test.expect(2);
    worker.tick(function(err, id, output){
      test.equal(id, 'other-node');
      test.deepEqual(output, {value: 2000});
      test.done();
    });
  },

  'get-other-node': function(test) {
    test.expect(3);
    http.get(
      test,
      'nodes/other-node',
      function(res) {
        // should have latched most recent processed
        // message
        var node = res.data;
        test.equal(typeof node, 'object');
        test.equal(node.data.value, 2000);
        test.done();
      });
  },


  'quit-server': function(test) {
    server.stop(function(){
      test.done();
    });
  },

  'quit-worker': function(test) {
    worker.quit(function(){
      test.done();
    });
  },

  'quit-api': function(test) {
    api.quit(function(){
      test.done();
    });
  }

};
