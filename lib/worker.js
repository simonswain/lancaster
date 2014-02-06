"use strict";

var _ = require('underscore');
var async = require('async');

var Topology = require('./topology.js');

var Worker = function(config, done){

  config = config || {};

  this.processing = false;
  this.runTimer = false;

  this.topology = new Topology(
    config, 
    function(){
      done();
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


Worker.prototype.quit = function(done){
  this.topology.quit(function(){
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
      var fn = self.topology.fns[node.fn].process;

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


          async.series([

            // save the node's new state
            function(next){
              self.topology.setAttrs(id, attrs, function(){
                next();
              });
            },

            // latch the output on the node
            function(next){
              self.topology.setData(id, output, function(){
                next();
              });
            },

            // distribute to connected nodes via the queue
            function(next){

              self.topology.getTargets(
                id, 
                function(err, targets){
                  if(targets.length === 0){
                    return next();
                  }                  
                  async.eachSeries(
                    targets,
                    function(target_id, done){
                      self.topology.inject(target_id, data, done);
                    }, function(){
                      next();
                    });
                });
            }
          ], function(){
            
            // output the message as an event from the worker in case
            // the runner wants to distribute it outside the topology

            //self.emit('message', {id: id, data: output});
            done(false, output);

          });
        });
    });

};



// process messages from the queue until told to stop
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

// stop processing messages from the queue
Worker.prototype.stop = function(done){

  var self = this;

  // when runTimer is next called it will invoke the callback
  this.onStopProcessing = done;

  if(this.runTimer){
    clearTimeout(this.runTimer);
  }
  this.processing = false;
};


// if exists process one message from the queue
Worker.prototype.tick = function(done){

  var self = this;
  // pull a message off the queue
  this.topology.extract(function(err, id, data){

    // nothing on queue
    if(!id){
      return done(null, null, null);
    }

    // id is node id to pass the data to  
    self.process(
      id,
      data,
      function(err, output){
        return done(null, id, output);
      });

  });

};


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

    // nothing on queue
    if(!!id){
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
