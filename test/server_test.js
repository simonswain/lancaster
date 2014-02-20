 "use strict";

var config = require('./config.js');

var Lancaster = require('../index.js');

var http = require('nodeunit-httpclient')
  .create({
    port: config.port,
    path: '/',
    status: 200
  });

var server, topo, worker;

exports['server'] = {

  'new-topo': function(test) {
    topo = new Lancaster.Topology(config, function(){
      test.done();
    });
  },

  'new-worker': function(test) {
    worker = new Lancaster.Worker(config, function(){
      test.done();
    });
  },

  'new-server': function(test) {
    server = new Lancaster.Server(config, function(){
      test.done();
    });
  },

  // 'reset': function(test) {
  //   topo.reset(function(){
  //     test.done();
  //   });
  // },

  'start': function(test) {
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

  'config': function(test) {
    test.expect(2);
    http.get(
      test,
      '',
      function(res) {
        test.ok(res.data.hasOwnProperty('lancaster'));
        test.done();
      });
  },

  'ping': function(test) {
    test.expect(2);
    http.get(
      test,
      'ping',
      function(res) {
        test.ok(res.data.hasOwnProperty('pong'));
        test.done();
      });
  },

  'inspect': function(test) {
    test.expect(2);
    http.get(
      test,
      'nodes',
      function(res) {
        test.equal(typeof res.data, 'object');
        test.done();
      });
  },

  'get-non-existant-node': function(test) {
    test.expect(1);

    http.get(
      test,
      'nodes/bogus',
      {},
      {
        status: 404
      },
      function(res) {
        test.done();
      });
  },

  'create-node': function(test) {
    test.expect(4);

    http.post(
      test,
      'nodes', {
        data:{
          'id': 'test-node'
        }
      }, {
        status: 200
      }, function(res) {

        // inpsect to check nodes were created
        http.get(
          test,
          'nodes/test-node',
          function(res) {
            test.equal(typeof res.data, 'object');
            test.equals(res.data.id, 'test-node');
            test.done();
          });
      });

  },

  'create-dup-node': function(test) {
    test.expect(1);
    http.post(
      test,
      'nodes', {
        data:{
          'id': 'test-node'
        }
      }, {
        status: 409
      }, function(res) {
        test.done();
      });

  },

  'inspect-again': function(test) {
    test.expect(3);
    http.get(
      test,
      'nodes',
      function(res) {
        test.equal(typeof res.data, 'object');
        test.ok(res.data.hasOwnProperty('test-node'));
        test.done();
      });
  },

  'delete-node': function(test) {

    test.expect(2);
    http.del(
      test,
      'nodes/test-node',
      function(res) {
        // inpsect to check node was deleted
        http.get(
          test,
          'nodes/test-node',
          {},
          {status: 404},
          function(res) {
            test.done();
          });

      });
  },


  'inject': function(test) {
    //test.expect(5);
    http.post(
      test, 
      'nodes', 
      {data:{
        'id': 'test-node', 
        'factor':10,
        'fn': 'thru'
      }},
      {status: 200}, 
      function(res) {
        var myMessage = {value: 1000.00};

        http.post(
          test, 
          'nodes/test-node/message', 
          {data: myMessage},
          {status: 200}, 
          function(res) {
            // get latched message
            worker.tick(function(err, id, output){            
              http.get(
                test, 
                'nodes/test-node', 
                function(res) {
                  var node = res.data;
                  test.equal(typeof node, 'object');
                  // should have latched most recent processed
                  // message
                  test.equal(node.data.value, myMessage.value);
                  test.done();
                });
              
            });
          });
      });
  },

  'create-with-attrs': function(test) {
    test.expect(4);

    http.post(
      test,
      'nodes',
      {data:{
        'id': 'test-attrs',
        'fn': 'thru',
        attrs:{'my-value': 500}
      }},
      function(res) {
        http.get(
          test,
          'nodes/test-attrs',
          function(res) {
            test.equal(typeof res.data, 'object');
            test.equal(res.data.attrs['my-value'], 500);
            // should have latched most recent processed
            // message
            //test.deepEqual(res.data.message, myMessage);
            test.done();
          });
      });
  },

  'set-attrs': function(test) {
    test.expect(4);
    http.post(
      test,
      'nodes/test-attrs',
      {data: {'my-value': 1000}},
      function(res) {
        
        // get latched message
        http.get(
          test,
          'nodes/test-attrs',
          function(res) {
            test.equal(typeof res.data, 'object'); 
            test.equal(res.data.attrs['my-value'], 1000);
            test.done();
          });
      });
  },


  'stop': function(test) {
    server.stop(function(){
      test.done();
    });
  }


};
