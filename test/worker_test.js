"use strict";

var async = require('async');

var Lancaster = require('../index.js');
var config = require('./config.js');

var topo, worker, myNode, myData;

myData = {value: 1000.00};

// test message queue

exports['process'] = {

  'create-topo': function(test) {

    // stub test to copy and change
    topo = new Lancaster.Topology(
      config,
      function(){
        test.done();
      });

  },

  'reset': function(test) {

    // stub test to copy and change
    topo.reset(
      function(){
        test.done();
      });

  },

  'create-worker': function(test) {

    // stub test to copy and change
    worker = new Lancaster.Worker(
      config,
      function(){
        test.done();
      });

  },

  // 'add-node': function(test) {
  //   myNode = {
  //     id: 'test',
  //     fn: 'thru'
  //   };
  //   topo.add(myNode, function(){
  //     test.done();
  //   });
  // },

  // 'get-data-pre': function(test) {
  //   //test.expect(1);
  //   topo.getData(
  //     myNode.id, 
  //     function(err, data){
  //       test.equals(data, null);
  //       test.done();
  //     });
  // }, 

  // 'inject': function(test){
  //   topo.inject(
  //     myNode.id,
  //     myData,
  //     function(err){
  //       test.done();
  //     }
  //   );
  // },

  // 'worker-tick': function(test) {
  //   test.expect(1);
  //   worker.tick(
  //     function(err, id, output){
  //       // check fn passed thru
  //       test.deepEqual(output, myData);
  //       test.done();
  //     });
  // }, 

  // // output should have been latched on node
  // 'get-data-post': function(test) {
  //   test.expect(1);
  //   topo.getData(
  //     myNode.id, 
  //     function(err, data){
  //       test.deepEqual(data, myData);
  //       test.done();
  //     });
  // }, 


  'send-receive': function(test){
    test.expect(5);
    async.series([

      function(next){ 
        topo.reset(next);
      },

      function(next){ 
        topo.purge(next);
      },

      function(next){
        topo.add({
          'id': 'sender', 
          'fn': 'thru'
        }, next);
      },

      function(next){
        topo.add({
          'id': 'receiver', 
          'fn': 'thru',
          'sources': ['sender']
        }, next);
      },

      function(next){
        topo.inject(
          'sender', 
          myData, 
          next
        );
      },

      // queue(sender) -> sender -> queue(receiver)
      function(next){
        worker.tick(function(err, id, output){
          test.equals(id, 'sender');
          test.deepEqual(output, myData); 
          next();
        });
      },

      // queue(receiver) -> receiver
      function(next){
        worker.tick(function(err, id, output){
          // no output
          test.equals(id, 'receiver');
          test.deepEqual(output, myData);
          next();
        });
      },

      // myData has been passed thru receiver
      function(next){
        topo.getData(
          'sender', 
          function(err, data){
            test.deepEqual(data, myData);
            test.done();
          });
      }

    ], function(){
      test.done();
    });


  },

  // 'count': function(test) {
  //   test.expect(3);

  //   var myMessage = {value: 1000.00};

  //   var server = new Lancaster(config);

  //   server.on('stop', function(){
  //     test.done();
  //   });

  //   server.on('message', function(msg){
  //     // got message from event
  //     test.deepEqual(msg.data, {total:1} );

  //     server.get('counter', function(err, node){
  //       // message was latched on node
  //       test.deepEqual(node.data, {total:1});

  //       // total was accumulated on attrs
  //       test.deepEqual(node.attrs, {total:1});
  //       server.stop();
  //     });
  //   });

  //   server.on('start', function(){
  //     async.series([
  //       server.reset,
  //       function(next){
  //         server.add({
  //           'id': 'counter', 
  //           'fn': 'count'
  //         }, next);
  //       },
  //       function(next){
  //         server.inject('counter', myMessage, next);
  //       }
  //     ]);

  //   });
    
  //   server.start(function(){
  //     server.startProcessing();
  //   });

  // },

  // // two counts running in parallel
  // 'count-two': function(test) {
  //   test.expect(1);

  //   var server = new Lancaster(config);

  //   server.on('stop', function(){
  //     test.done();
  //   });

  //   var expect = 10;
  //   var got = 0;

  //   server.on('message', function(msg){
      
  //     //console.log('MESSAGE', msg);

  //     if(msg.id !== 'sum'){
  //       return;
  //     }

  //     if(msg.data.total <5){
  //       return;
  //     }

  //     test.ok(true);
  //     server.stop();
        
  //   });

  //   server.on('start', function(){

  //       var add = function(node, done){
  //         server.add({
  //           'id': node.id, 
  //           'fn': node.fn,
  //           'sources': node.sources
  //         }, done);
  //       };
      
  //       var adds = function(done){
  //         async.eachSeries([
  //           {
  //             id:'count-1', 
  //             fn:'count'
  //           },
  //           {
  //             id:'count-2', 
  //             fn:'count'
  //           }, {
  //             id:'sum', 
  //             fn:'count',
  //             sources: ['count-1','count-2']
  //           }], add, done);
  //       };


  //       var inject = function(x, done){
  //         server.inject(x.id, x.msg, done);
  //       };
      
  //       var injects = function(done){
  //         async.eachSeries(
  //           [{
  //             id: 'count-2',
  //             msg: {value:100}
  //           }, {
  //             id: 'count-2',
  //             msg: {value:101}
  //           }, {
  //             id: 'count-2',
  //             msg: {value:101}
  //           }, {
  //             id: 'count-2',
  //             msg: {value:101}
  //           }, {
  //             id: 'count-1',
  //             msg: {value:102}
  //           }],
  //           inject,
  //           done);
  //       };

  //       async.series([
  //         server.reset,
  //         adds,
  //         injects
  //       ]);

  //   });
    
  //   server.start(function(){
  //     server.startProcessing();
  //   });

  //},


    // clean up after ourselves
  'reset-final': function(test) {

    // stub test to copy and change
    topo.reset(
      function(){
        test.done();
      });

  },

  'quit': function(test) {
    worker.quit(
      function(){
        topo.quit(
          function(){
            test.done();
          });
      });
  }

};
