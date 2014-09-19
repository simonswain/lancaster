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


  // placeholder until event emitter done
  worker.emit = function(key, value){
    console.log('Event:', key, JSON.stringify(value));
  };

  worker.on = function(k, v){
    console.log('BINDING', k);
  };

  worker.off = function(k){
    console.log('UNBINDING', k);
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


  // if exists process one message from the queue
  worker.tick = function(done){

    // pull a message off the queue
    api.extract(function(err, id, data){

      // nothing on queue
      if(!id){
        return done(null, null, null);
      }

      // id is node id to pass the data to
      api.process(
        id,
        data,
        function(err, output){
          return done(null, id, output);
        });

    });

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

    // pull a message off the queue
    api.extract(function(err, id, data){

      // nothing on queue
      if(id === null){
        // don't smash Redis
        worker.runTimer = setTimeout(go, 250);
        return;
      }

      // id is node id to pass the data to
      worker.process(
        id,
        data,
        function(err){
          //console.log('processed, running again');

          // check for a message again immediately so queued messages
          // are processed fast as possible
          process.nextTick(go);
        });

    });

  };

  return worker;

};
