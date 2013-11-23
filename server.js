var config = require('./config.js');
var landcaster = require('./index.js');

landcaster(config, function(server){

  // handle shutdown gracefully
  process.on( 'SIGINT', function() {
    console.log( "\nShutting Down..." );
    server.stop(function(){
      process.exit();
    });
  });

});
