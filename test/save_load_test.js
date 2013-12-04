"use strict";

var async = require('async');
var config = require('../config.js');

var http = require('nodeunit-httpclient').create({
  port: config.port,
  path: '/',
  status: 200
});

var lancaster = require('../lib/lancaster.js');

// create a topo, do some actions on them, stop and start the topo.
// the data from the actions should have been persisted

exports['rest'] = {

  // clean up from any previous runs
  'reset': function(test) {
    lancaster(config, function(server){
      server.reset(function(err){
        server.stop(function(){
          test.done();
        });
      });
    });
  },

  // create a node, stop/start. node should still be there
  'restore': function(test) {
    test.expect(4);
    var myServer;
    async.series([
      function(next){
        lancaster(config, function(server){
          myServer = server;
          server.reset(function(err){
            next();
          });
        });     
      },
      function(next){
        http.post(
          test,
          'nodes', {
            data:{
              'id': 'test-node',
              'factor': 10,
              'fn': 'multiply'
            }
          }, {
            status: 204
          }, function(res) {
            next();
          });
      },
      function(next){
        myServer.stop(function(){
          next();
        });
      },
      function(next){
        lancaster(config, function(server){
          myServer = server;
          // should have reloaded nodes
          http.get( test, 'nodes', function(res) {
            test.equal(typeof res.data, 'object');
            test.ok(res.data.hasOwnProperty('test-node'));
            next();
          });
        });     
      },
      function(next){
        myServer.reset(function(){
          myServer.stop(function(){
            next();
          });
        });
      },
    ], function(){
      test.done();
    });
  },

  // create a node and set some attributes on it. they should still be
  // there after stop/start

  'save-restore-attrs': function(test) {
    test.expect(6);
    var myServer;
    async.series([
      // clean state
      function(next){
        lancaster(config, function(server){
          myServer = server;
          server.reset(function(err){
            next();
          });
        });     
      },
      function(next){
        http.post(
          test,
          'nodes', {
            data:{
              'id': 'test-node',
              'factor': 10, // this is our attr
              'fn': 'multiply',
            }
          }, {
            status: 204
          }, function(res) {
            next();
          });
      },
      function(next){
        myServer.stop(function(){
          next();
        });
      },
      function(next){
        lancaster(config, function(server){
          myServer = server;
          // should have reloaded nodes
          http.get( test, 'nodes', function(res) {
            test.equal(typeof res.data, 'object');
            test.ok(res.data.hasOwnProperty('test-node'));
            test.ok(res.data['test-node'].hasOwnProperty('attributes'));
            test.equal(res.data['test-node']['attributes']['factor'], 10, 'should match set value');            
            next();
          });
        });     
      },
      function(next){
        myServer.reset(function(){
          myServer.stop(function(){
            next();
          });
        });
      },
    ], function(){
      test.done();
    });
  }

};
