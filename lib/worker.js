"use strict";

var _ = require('underscore');
var async = require('async');
var Redis = require('redis');

var topology = require('./topology.js');

var Worker = function(config, done){

  config = config || {};

  this.prefix = '';

  var redisConfig = {
    host: '127.0.0.1',
    port: 6379
  };

  if(config.hasOwnProperty('redis')){
    redisConfig = config.redis;
  }

  // all redis keys are prefixed with this.prefix
  if(config.hasOwnProperty('prefix')){
    this.prefix = config.prefix;
  }

  // pass in require'd fns
  if(config.hasOwnProperty('fns')){
    this.fns = config.fns;
  } else {
    this.fns = require('./fns');
  }

  if(this.prefix !== ''){
    this.prefix = this.prefix + ':';
  }

  this.redis = Redis.createClient(redisConfig);


  this.processing = false;
  this.runTimer = false;

  done();

};

// start processing (polling for) messages
Worker.prototype.start = function(done){
  var self = this;

  this.processing = true;

  process.nextTick(function(){
    self.run();
  });

  if(done){
    done();
  }
};

Worker.prototype.stop = function(done){
  var self = this;
  // when runTimer is next called it will invoke the callback
  this.onStopProcessing = done;
  if(this.runTimer){
    clearTimeout(this.runTimer);
  }
  this.processing = false;
};

Worker.prototype.quit = function(done){

  async.series([
    this.stop,
    this.topology.stop
  ], function(){
    done();
  });

};

Worker.prototype.process = function(id, data, done){

  var self = this;

  this.topology.get(
    id,
    function(err, node){

      if(!node){
        return done(new Error('unknown-node'));
      }

      // processing method from the node's function
      var fn = self.fns[node.fn].process;

      // process with the node's attrs and incoming data
      fn(
        node.attrs,
        data,
        function(err, attrs, output){

          // no specific output data from fn -- no message to pass to
          // nodes that source this one, just save the node's
          // (possibly changed) state and get out of here
          if(typeof output === 'undefined'){
            self.topology.setAttrs(id, attrs, done);
          }

          // there is some output. save it and pass on to connected nodes

          async.parallel([

            // save the node's new state
            function(next){
              self.topology.setAttrs(id, attrs, next);
            },

            // latch the output on the node
            function(next){
              self.topology.setData(id, output, next);
            },

            // distribute to connected nodes via the queue
            function(next){

              self.getTargets(id, function(err, targets){

                if(targets.length === 0){
                  return next();
                }
                
                _.each(
                  targets,
                  function(target_id){
                    self.topology.inject(target_id, data);
                  });

                next();

              });

            },


          ], function(){
            
            // output the message as an event from the worker in case
            // the runner wants to distribute it outside the topology

            //self.emit('message', {id: id, data: output});
            done(false, output);

          });


        });

    });

};


// placeholder until event emitter done
Worker.prototype.emit = function(key, value){
  console.log('Event:', key, JSON.stringify(value));
};

Worker.prototype.on = function(k, v){
  console.log('BINDING', k);
};

Worker.prototype.off = function(k){
  console.log('UNBINDING', k);
};

// run one tick of the topology. Pull a message off the queue and have
// it processed by it's target node.
Worker.prototype.run = function(){

  var self = this;

  if(!this.processing){
    if(this.onStopProcessing){
      this.onStopProcessing();
    }
    return;
  }

  // pull a message off the queue
  this.topology.extract(function(err, id, data){

    // msg will be false if no result
    if(!data){
      // don't smash Redis
      self.runTimer = setTimeout(self.run, 250);
      return;
    }

    // id is node id to pass the data to  
    self.process(
      id,
      data,
      function(err){
        //console.log('processed, running again');

        // check for a message again immediately so queued messages
        // are processed fast as possible
        process.nextTick(self.run);
      });

  });

};

module.exports = Worker;
