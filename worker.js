// Command line runner for worker

var config = require('./config.js');
var Lancaster = require('./index.js');
var worker = new Lancaster.Worker(config);

worker.on('stop', function(){
  process.exit(0);
});

worker.on('start', function(){
  worker.startProcessing();
});

// handle shutdown gracefully
process.on( 'SIGINT', function() {
  console.log( "\nShutting Down..." );
  worker.stop();
});

worker.start();
