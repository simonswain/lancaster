var async = require('async');

var config = require('../config.js');
var Lancaster = require('../lib/lancaster.js');

var myData = {value: 1000.00};

var server = new Lancaster(config);

server.on(
  'stop',
  function(){
    console.log('done');
  });

server.on(
  'message', 
  function(msg){

    // got message from event
    console.log('GOT MESSAGE', msg);

    server.get('counter', function(err, node){
      // data was latched on node
      if(Number(node.attrs.total) === 5){
        server.stop();
      }
      
    });

  });

server.on(
  'start', 
  function(){
    async.series([

      server.reset,

      function(next){
        server.add({
          'id': 'counter', 
          'fn': 'count',
        }, next);
      },

      function(next){
        server.inject('counter', myData, next);
        server.inject('counter', myData, next);
        server.inject('counter', myData, next);
        server.inject('counter', myData, next);
        server.inject('counter', myData, next);
      }

    ]);

  });

server.start(function(){
  server.startProcessing();
});
