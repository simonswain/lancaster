"use strict";

var async = require('async');

var config = require('../config.sample.js')(process.env.NODE_ENV);
var Lancaster = require('../index.js');

var api;

var myNode, myData;

// test message queue

exports.queue = {

  'new-api': function(test) {
    api = Lancaster.api(config);
    test.done();
  },

  'reset': function(test) {
    api.reset(function() {
      test.done();
    });
  },

  'add-node': function(test) {
    myNode = {
      id: 'test',
      fn: 'thru'
    };
    api.add(myNode, function(){
      test.done();
    });
  },

  'get-data-pre': function(test) {
    test.expect(1);
    api.getData(
      myNode.id, 
      function(err, data){
        test.equals(data, null);
        test.done();
      });
  }, 

  'inject': function(test){
    myData = {value: 1000.00};
    api.inject(
      myNode.id,
      myData,
      function(err){
        test.done();
      }
    );
  },

  'api-tick': function(test) {
    test.expect(1);
    api.tick(
      function(err, id, output){
        // check fn passed thru
        test.deepEqual(output, myData);
        test.done();
      });
  }, 

  // output should have been latched on node
  'get-data-post': function(test) {
    test.expect(1);
    api.getData(
      myNode.id, 
      function(err, data){
        test.deepEqual(data, myData);
        test.done();
      });
  }, 


  'send-receive': function(test){
    test.expect(5);
    async.series([

      function(next){ 
        api.reset(next);
      },

      function(next){ 
        api.purge(next);
      },

      function(next){
        api.add({
          'id': 'sender', 
          'fn': 'thru'
        }, next);
      },

      function(next){
        api.add({
          'id': 'receiver', 
          'fn': 'thru',
          'sources': ['sender']
        }, next);
      },

      function(next){
        api.inject(
          'sender', 
          myData, 
          next
        );
      },

      // queue(sender) -> sender -> queue(receiver)
      function(next){
        api.tick(function(err, id, output){
          test.equals(id, 'sender');
          test.deepEqual(output, myData); 
          next();
        });
      },

      // queue(receiver) -> receiver
      function(next){
        api.tick(function(err, id, output){
          // no output
          test.equals(id, 'receiver');
          test.deepEqual(output, myData);
          next();
        });
      },

      // myData has been passed thru receiver
      function(next){
        api.getData(
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


  'count-parallel': function(test){
    //test.expect(5);


    var add = function(node, done){
      api.add({
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
      api.inject(x.id, x.msg, done);
    };

    // the values don't matter. just handy for tracking flow throught redis
    var messages = [{
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
    }];
    
    var injects = function(done){
      async.eachSeries(
        messages,
        inject,
        function(){
          done();
        });
    };

    var run = function(done){
      async.timesSeries(
        messages.length, 
        function(x, next){
          api.tick(function(err, id, output){
            next();
          });
        }, function(){
          done();
        });
    };
    

    // count should have accumulated on node
    var check = function(done){
    api.get(
      'count-2', 
      function(err, node){
        test.equal(node.attrs.total, 4);
        done();
      });
    };

    async.series([
      function(next){ 
        api.reset(function(){
          next();
        });
      },
      adds,
      injects,
      run,
      check
    ], function(){
      test.done();
    });


  },

  // clean up after ourselves
  'reset-final': function(test) {

    // stub test to copy and change
    api.reset(
      function(){
        test.done();
      });

  },

  'quit-api': function(test) {
    api.quit(function() {
      test.done();
    });
  }

};
