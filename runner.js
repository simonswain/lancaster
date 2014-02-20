"strict";

var fs = require('fs');
var util = require('util');
var events = require('events');
var fork = require('child_process').fork;
var pad = require('padder');

function Runner (service_f, opts, done) {

  events.EventEmitter.call(this);
  process.setMaxListeners(0);

  var self = this;

  this.debug = true;
  this.stopping = false;

  var child;

  this.start = function(done) {

    // startedCallback is called on STARTED from child process
    self.startedCallback = done;

    self.stopping = false;

    child = fork(
      __dirname + '/' + service_f,
      {silent: true}
    );
    
    child.on('exit', this.onChildExit);
    
    child.stdout.on('data', this.onStdout);
    child.stderr.on('data', this.onStderr);

    done(null, {pid: child.pid});

  };

  this.onChildExit = function(code) {
    if (self.debug && code !== 0) {
      console.log(
        pad.timestamp(),
        'EXITED  ',
        pad.space(service_f, 20),
        code
      );
    }

    child.removeAllListeners();
    child = null;

    if (self.stoppedCallback) {
      return self.stoppedCallback();
    }
    
    // auto respawn

    // if (!self.stopping) {
    //   self.start();
    // }

  };

  this.onStdout = function(data){

    if (!self.debug) {
      return;
    }

    var s = data.toString().trim();

    if ( s === '') {
      return;
    }

    var x = s.split("\n");

    if (x.length === 0) {
      return;
    }

    var t = pad.timestamp();
    var log = [];
    for ( var i=0, ii = x.length; i < ii ; i++) {
      
      console.log(
        t,
        'STDOUT  ',
        pad.space(service_f, 20),
        x[i]);

      log.push(t + ' ' + x[i], "\n");

    }

    // if ( self.logFile && log.length > 0 ) {
    //   fs.appendFile(def.log, log.join(''));
    // }

  };

  this.onStderr = function(data){
    if ( self.debug ) {
      console.log(
        pad.timestamp(),
        'STDERR  ',
        pad.space(service_f, 20),
        data.toString().trim()
      );
    }
  };

  this.start(done);

}

util.inherits(Runner, events.EventEmitter);

module.exports = Runner;
