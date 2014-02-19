var config = require('./config.js');

var Lancaster = require('./index.js');
var server = new Lancaster.Server(config, function(){
});

// handle shutdown gracefully
process.on( 'SIGINT', function() {
  //console.log( "\nShutting Down..." );
  server.stop(function(){
  });
});

server.start(function(){
  //console.log(JSON.stringify(config));
});
