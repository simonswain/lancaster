var config = require('./config.js');

var Lancaster = require('./index.js');
var worker = new Lancaster.Worker(config);

// handle shutdown gracefully
process.on( 'SIGINT', function() {
  if(config.env === 'dev'){
    console.log( "\nShutting Down..." );
  }
  worker.stop(function(){});
});

worker.start(function(){
  if(config.env === 'dev'){
    console.log(JSON.stringify(config));
  }
});
