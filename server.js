var config = require('./config.js');

var Lancaster = require('./index.js');
var server = Lancaster.server(config);

// handle shutdown gracefully
process.on( 'SIGINT', function() {
  if(config.env === 'development'){
    console.log( "\nShutting Down..." );
  }
  server.stop(function(){
    console.log( "Done..." );
  });
});

server.start(function(){
  if(config.env === 'development'){
    console.log(JSON.stringify(config, null, 2));
  }
});
