"strict";

var fs = require('fs');
var async = require('async');

var Runner = require('./runner.js');

var Run = function(done){

var self = this;

  var opts = {
    pidsfile: __dirname + '.pids'
  }

  var pids = [];

  var services = [
    
    'server.js',
    'worker.js',

  ]

  this.__nodes = {};
  this.__runners = {};

  // create new node runner
  this.spawn = function(service_f, done) {
    this.__runners[service_f] = new Runner (
      service_f,
      {}, // opts
      function(err, res) {
        //console.log('*** SPAWNED', res.pid, service_f);
        done(err, res.pid);
      });
  };

  this.start = function(done){
    
    async.eachSeries(
      services, 
      function(service, next) {
        self.spawn(
          service, 
          function(err, pid){
            pids[service] = pid;
            next();
          });
      }, function(){
        
        if(opts.pidsfile){
          fs.writeFileSync(opts.pidsfile, JSON.stringify(pids));
        }

        if(done && typeof done === 'function'){
          done(null);
        }

      });
  };

  this.stop = function(done){

    // try to kill dangling processes from a previous run
    
    if(!opts.pidsfile || ! fs.existsSync(opts.pidsfile)) {
      return done();
    }

    var pids = JSON.parse(fs.readFileSync(opts.pidsfile));
    
    async.eachSeries(pids, function(pid, next){
      try{
        process.kill(pid, 'SIGHUP');
      } catch (err){
        // catch error if no process
        //console.log(err);
      }
      next();
    }, function(){
      done();
    });
    
  };

  // try to kill dangling processes from a previous run
  this.stop(function(){
    process.nextTick(function(){
      done();
    });
  });

};

var run = new Run(function(){
  run.start(function(){
    //console.log('started');
  });

});

process.on( 'SIGINT', function() {
  console.log( 'info','Shutting Down...' );
  run.stop(function(){
    console.log( 'info','Finished.' );
  });
});
