var config = require('./config.js');

var Lancaster = require('./index.js');
var worker = new Lancaster.Worker(config);

// handle shutdown gracefully
process.on( 'SIGINT', function() {
  //console.log( "\nShutting Down..." );
  worker.stop(function(){
  });
});

worker.start(function(){
  //console.log(JSON.stringify(config));
});
