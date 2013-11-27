"use strict";

var async = require('async');
var config = require('../config.js');

var http = require('nodeunit-httpclient').create({
  port: config.port,
  path: '/',
  status: 200
});

var landcaster = require('../lib/landcaster.js');

exports['rest'] = {

  'reset': function(test) {
    //test.expect(4);
    landcaster(config, function(server){
      server.reset(function(err){
          server.stop(function(){
            test.done();
          });
      });
    });
  },
  'restore': function(test) {
    test.expect(4);
    var myServer;
    async.series([
      function(next){
        landcaster(config, function(server){
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
        landcaster(config, function(server){
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
        myServer.stop(function(){
          next();
        });
      },
    ], function(){
      test.done();
    })

    // })

     // http.post(
     //    test,
     //    'reset', {
     //      data:{}
     //    }, {
     //      status: 200
     //    }, function(res) {
     //      console.log('GOT', res.body);
     //      server.stop(function(){
     //        test.done();
     //      });

     //      // // inpsect to check nodes were created
     //      // http.get( test, 'nodes', function(res) {
     //      //   test.equal(typeof res.data, 'object');
     //      //   test.ok(res.data.hasOwnProperty('test-node'));
     //      //   server.stop(function(){
     //      //     test.done();
     //      //   });
     //      // });

     //    });


  // },
  // 'create-node': function(test) {
  //   test.expect(4);
  //   landcaster(config, function(server){
  //     http.post(
  //       test,
  //       'nodes', {
  //         data:{
  //           'id': 'test-node',
  //           'factor': 10,
  //           'fn': 'multiply'
  //         }
  //       }, {
  //         status: 204
  //       }, function(res) {

  //         // inpsect to check nodes were created
  //         http.get( test, 'nodes', function(res) {
  //           test.equal(typeof res.data, 'object');
  //           test.ok(res.data.hasOwnProperty('test-node'));
  //           server.stop(function(){
  //             test.done();
  //           });
  //         });

  //       });
  //   });
  // },

  // 'delete-node': function(test) {
  //   test.expect(5);

  //   landcaster(config, function(server){
  //     // create
  //     http.post(
  //       test,
  //       'nodes', {
  //         data:{
  //           'id': 'test-node'
  //         }
  //       }, {
  //         status: 204
  //       }, function(res) {

  //         http.del(
  //           test,
  //           'nodes/test-node',
  //           {},
  //           {status: 204},
  //           function(res) {

  //             http.get( test, 'nodes', function(res) {
  //               test.equal(typeof res.data, 'object');
  //               test.equal(res.data.hasOwnProperty('test-node'), false);
  //               server.stop(function(){
  //                 test.done();
  //               });
  //             });
  //           });

  //       });
  //   });
  // },

  // 'inject': function(test) {
  //   test.expect(5);
  //   landcaster(config, function(server){

  //     http.post(
  //       test,
  //       'nodes',
  //       {data:{'id': 'test-node'}},
  //       {status: 204},
  //       function(res) {

  //         var myMessage = {value: 1000.00};

  //         http.post(
  //           test,
  //           'nodes/test-node/message',
  //           {data: myMessage},
  //           {status: 204},
  //           function(res) {

  //             // get val
  //             http.get(
  //               test,
  //               'nodes/test-node',
  //               function(res) {
  //                 test.equal(typeof res.data, 'object');
  //                 // should have latched most recent processed message
  //                 test.deepEqual(res.data.val, myMessage);
  //                 server.stop(function(){
  //                   test.done();
  //                 });
  //               });

  //           });
  //       });

  //   });
  }

};
