var config = require('./config.js');
var lancaster = require('./index.js');

lancaster(config, function(server){

  // handle shutdown gracefully
  process.on( 'SIGINT', function() {
    console.log( "\nShutting Down..." );
    server.stop(function(){
      process.exit();
    });
  });

});
