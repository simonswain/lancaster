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


  worker.process = function(id, data, done){

    api.get(
      id,
      function(err, node){

        if(!node){
          return done(new Error('unknown-node'));
        }

        // processing method from the node's function
        var fn = api.fns(node.fn).process;

        // process with the node's attrs and incoming data
        fn(
          node.attrs,
          data,
          function(err, attrs, output){

            // no attrs provided - don't change them
            if(typeof attrs === 'undefined'){
              return done();
            }

            // no specific output data from fn -- no message to pass to
            // nodes that source this one, just save the node's
            // (possibly changed) state and get out of here
            if(typeof output === 'undefined'){
              return api.setAttrs(id, attrs, done);
            }

            // there is some output. save it and pass on to connected nodes

            async.series([

              // save the node's new state
              function(next){
                api.setAttrs(id, attrs, function(){
                  next();
                });
              },

              // latch the output on the node
              function(next){
                api.setData(id, output, function(){
                  next();
                });
              },

              // distribute to connected nodes via the queue
              function(next){

                api.getTargets(
                  id,
                  function(err, targets){
                    if(targets.length === 0){
                      return next();
                    }
                    async.eachSeries(
                      targets,
                      function(target_id, done){
                        api.inject(target_id, output, done);
                      }, function(){
                        next();
                      });
                  });
              }
            ], function(){

              // output the message as an event from the worker in case
              // the runner wants to distribute it outside the topology

              //worker.emit('message', {id: id, data: output});
              done(false, output);

            });
          });
      });

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
      worker.process(
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
