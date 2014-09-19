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

var Ws = require('ws');

var api, worker, server, ws;

exports.ws = {

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

  'ws-client': function(test) {
    ws = new Ws('ws://' + config.server.host + ':' + config.server.port);
    test.done();
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

  'set-attrs': function(test) {
    var data = [
      'setAttrs',
      'my-node',
      {'my-value': 500}
    ];  
    var s = JSON.stringify(data);
    ws.send(s, function(){
      test.done();
    });
  },

  'set-attrs-test': function(test) {
    http.get(
      test,
      'nodes/my-node',
      function(res) {
        test.equal(typeof res.data, 'object'); 
        test.equal(res.data.attrs['my-value'], 500);
        test.done();
      });
  },

  'quit-ws': function(test) {
    ws.terminate();
    test.done();
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
