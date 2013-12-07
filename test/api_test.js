"use strict";

var config = require('../config.js');

var async = require('async');

var http = require('nodeunit-httpclient').create({
  port: config.port,
  path: '/',
  status: 200
});

var Lancaster = require('../lib/lancaster.js');

exports['api'] = {

  'default': function(test) {

    // stub test to copy and change
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

  'count': function(test) {
    test.expect(2);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('message', function(msg){
      // got message from event
      test.deepEqual(msg.msg, {count:1});

      var node = server.get('counter');
      // message was latched on node
      test.deepEqual(node.message, {count:1});
      server.stop();
    });

    server.on('start', function(){
      var myMessage = {value: 1000.00};
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
      ], function(){
      });

    });
    
    server.start();

  },


  // // two counts running in parallel
  'count-two': function(test) {
    test.expect(1);

    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    var expect = 10;
    var got = 0;

    server.on('message', function(msg){
      // got message from event
      //test.deepEqual(msg.msg, {count:1});

      got ++;

      if(got < expect){
        return;
      }

      var nodes = server.inspect();
      test.equals(
        nodes.sum.message.count, 
        5, 
        'Should have summed 5 messages'
      );
      server.stop();

    });

    server.on('start', function(){

        var inspect = function(done){
          console.log(server.inspect());
          done();
        };

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
    
    server.start();

  },

};
