"use strict";

var _ = require('underscore');
var async = require('async');

module.exports = function(opts){

  var api = require('./').api(opts);

  var processing = false;
  var runTimer = false;
  var onStopProcessing;

  // methods we'll export
  var worker = {};

  worker.quit = function(done){
    async.series(
      [worker.stop, api.quit],
      done
    );
  };


  // process messages from the queue until told to stop
  worker.start = function(done){

    processing = true;

    var go = function(){
      worker.run();
    };

    process.nextTick(go);

    if(done){
      done();
    }

  };

  // stop processing messages from the queue
  worker.stop = function(done){

    if(!processing){
      if(done){
        done();
      }
      return;
    }

    // when runTimer is next called it will invoke the callback
    onStopProcessing = function(){
      if(done){
        done();
      }
    };

    processing = false;

  };


  worker.run = function(){

    if(!processing){
      if(onStopProcessing){
        onStopProcessing();
      }
      return;
    }

    var go = function(){
      if(!processing){
        if(onStopProcessing){
          onStopProcessing();
        }
        return;
      }
      worker.run();
    };

    api.tick(function(err, id, data){
      if(id === null){
        // don't smash Redis
        runTimer = setTimeout(go, 250);
        return;
      }
      //console.log('processed, running again');
      // check for a message again immediately so queued messages
      // are processed fast as possible
      process.nextTick(go);
    });

  };

  return worker;

};
