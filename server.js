var config = require('./config.js');
var Lancaster = require('./index.js');
var server = new Lancaster(config);

server.on('stop', function(){
  process.exit(0);
});

server.on('start', function(){
});

// handle shutdown gracefully
process.on( 'SIGINT', function() {
  console.log( "\nShutting Down..." );
  server.stop();
});

server.start();
