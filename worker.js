var config = require('./config.js');

var Lancaster = require('./index.js');
var worker = Lancaster.worker(config);

// handle shutdown gracefully
process.on( 'SIGINT', function() {
  if(config.env === 'development'){
    console.log( "\nShutting Down..." );
  }
  worker.quit(function(){
    console.log( "Done..." );
  });
});

worker.start(function(){
  if(config.env === 'development'){
    console.log(JSON.stringify(config, null, 2));
  }
});
