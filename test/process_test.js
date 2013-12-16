"use strict";

var config = require('../config.js');

var async = require('async');

var http = require('nodeunit-httpclient').create({
  port: config.port,
  path: '/',
  status: 200
});

var Lancaster = require('../lib/lancaster.js');

exports['process'] = {

  'default': function(test) {

    // stub test to copy and change
    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      server.reset(
        function(){
          server.stop();
        });
    });
    
    server.start();

  },

  'thru': function(test) {
    test.expect(2);

    var myData = {value: 1000.00};
    
    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('message', function(msg){
      // got message from event
      test.deepEqual(msg.data, myData);

      server.get('test', function(err, node){
        // data was latched on node
        test.deepEqual(node.data, myData);
        server.stop();
      });
    });

    server.on('start', function(){
      async.series([

        server.reset,

        function(next){
          server.add({
            'id': 'test', 
            'fn': 'thru'
          }, next);
        },

        function(next){
          server.inject('test', myData, next);
        }

      ]);


    });
    
    server.start(function(){
      server.startProcessing();
    });
    
  },


  'process': function(test) {
    test.expect(1);

    var myData = {value: 1000.00};
    
    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('message', function(msg){
      if(msg.id !== 'receiver'){
        return;
      }
      // got message from event
      test.deepEqual(msg.data, myData);
      server.stop();

    });

    server.on('start', function(){
      async.series([

        server.reset,

        function(next){
          server.add({
            'id': 'sender', 
            'fn': 'thru'
          }, next);
        },

      function(next){
        server.add({
          'id': 'receiver', 
          'fn': 'thru',
          'sources': ['sender']
        }, next);
      },

        function(next){
          server.inject('sender', myData, next);
        }

      ]);


    });
    
    server.start(function(){
      server.startProcessing();
    });
    
  },

  'count': function(test) {
    test.expect(3);

    var myMessage = {value: 1000.00};

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('message', function(msg){
      // got message from event
      test.deepEqual(msg.data, {total:1} );

      server.get('counter', function(err, node){
        // message was latched on node
        test.deepEqual(node.data, {total:1});

        // total was accumulated on attrs
        test.deepEqual(node.attrs, {total:1});
        server.stop();
      });
    });

    server.on('start', function(){
      async.series([
        server.reset,
        function(next){
          server.add({
            'id': 'counter', 
            'fn': 'count'
          }, next);
        },
        function(next){
          server.inject('counter', myMessage, next);
        }
      ]);

    });
    
    server.start(function(){
      server.startProcessing();
    });

  },

  // two counts running in parallel
  'count-two': function(test) {
    test.expect(1);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    var expect = 10;
    var got = 0;

    server.on('message', function(msg){
      
      //console.log('MESSAGE', msg);

      if(msg.id !== 'sum'){
        return;
      }

      if(msg.data.total <5){
        return;
      }

      test.ok(true);
      server.stop();
        
    });

    server.on('start', function(){

        var add = function(node, done){
          server.add({
            'id': node.id, 
            'fn': node.fn,
            'sources': node.sources
          }, done);
        };
      
        var adds = function(done){
          async.eachSeries([
            {
              id:'count-1', 
              fn:'count'
            },
            {
              id:'count-2', 
              fn:'count'
            }, {
              id:'sum', 
              fn:'count',
              sources: ['count-1','count-2']
            }], add, done);
        };


        var inject = function(x, done){
          server.inject(x.id, x.msg, done);
        };
      
        var injects = function(done){
          async.eachSeries(
            [{
              id: 'count-2',
              msg: {value:100}
            }, {
              id: 'count-2',
              msg: {value:101}
            }, {
              id: 'count-2',
              msg: {value:101}
            }, {
              id: 'count-2',
              msg: {value:101}
            }, {
              id: 'count-1',
              msg: {value:102}
            }],
            inject,
            done);
        };

        async.series([
          server.reset,
          adds,
          injects
        ]);

    });
    
    server.start(function(){
      server.startProcessing();
    });

  }

};
