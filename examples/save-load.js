var async = require('async');

var config = require('../config.js');
var Lancaster = require('../lib/lancaster.js');

var myData = {value: 1000.00};

var first = function(done){

  var server = new Lancaster(config);

  server.on('stop', function(){       
    done();
  });

  server.on('start', function(){
    async.series([
      server.reset,
      function(next){
        server.add({
          'id': 'test-node',
          'factor': 10
        }, next);
      },

      function(next){
        next();
      },
      server.stop
    ]);
  });

  server.start();
};

var second = function(done){

  var server = new Lancaster(config);

  server.on('stop', function(){
    console.log('done');
  });

  server.on('start', function(){
    async.series([
      function(next){
        // should have reloaded node
        server.get(
          'test-node',
          function(err, node){
            console.log(node);
            next();
          }
        );
      },
      server.stop
    ]);
  });

  server.start();
};

async.series([first, second]);
