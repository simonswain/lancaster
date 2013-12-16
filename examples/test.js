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


var count = 0;

server.on(
  'message', 
  function(msg){

    count ++;

    // got message from event
    console.log('GOT MESSAGE', count, msg);

    if(count <2){
      return;
    }


    server.get('receiver', function(err, node){
      console.log('NODE', node);
      // data was latched on node
      server.stop();
      
    });

  });

server.on(
  'start', 
  function(){
    async.series([

      server.reset,

      function(next){
        server.add({
          'id': 'sender', 
          'fn': 'thru',
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
