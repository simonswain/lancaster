/*
 * https://github.com/simonswain/lancaster
 *
 * Copyright (c) 2013 Simon Swain
 * Licensed under the MIT license.
 */

"use strict";

var _ = require('underscore');
var async = require('async');

var Redis = require('redis');

var Lancaster = function(config){
  
  var self = this;

  // boot up a Lancaster server instance

  var api = {};
  var redis;
  var rest, sock;

  var processing = false;

  var fns = require('./fns');

  // ## Startup ##

  // Here are a set of routines for booting up the server. They are
  // run in series when the instance is created.

  var defaults = function(next){

    // Set some defaults if they were not supplied

    if(!config.hasOwnProperty('redis')){
      config.redis = {
        host: '127.0.0.1',
        port: 6379,
        prefix: ''
      };
    }

    if(!config.redis.hasOwnProperty('prefix')){
      config.redis.prefix = '';
    }

    next();

  };

  // Establish Redis connection
  var connect = function(next){

    redis = Redis.createClient({
      host: config.redis.host,
      port: config.redis.port,
      prefix: config.redis.prefix
    });

    next();

  };

  // ## Methods for working on the topology ##

  // Delete all nodes and other data (eg queues) from the topology

  var reset = function(done){

    var deleteKeys = function(next){
      // redis
      redis.keys(
        config.redis.prefix + '*',
        function(err, keys){
          _.each(keys, function(key){
            redis.del(key);
          });
          next();
        });
    };

    async.parallel(
      [deleteKeys], 
      done
    );

  };


  // fetch (id)
  // all -> (topo)

  // process (id, message) -> message

  // message handler does process then emits event (redis pub) and
  // distributes message to targets (redis queue)

  // Set attrs on a node by persisting them them in Redis as a hash

  var setAttrs = function(id, attrs, done){
    redis.hmset(
      config.redis.prefix + ':attrs:' + id,
      attrs,
      done
    );
  };
  
  var getAttrs = function(id, done){
    redis.hgetall(
      config.redis.prefix + ':attrs:' + id,
      function(err, res){
        if(!res){
          res = {};
        }
        done(false, res);
      });
  };
  
  var delAttrs = function(id, done){
    redis.del(
      config.redis.prefix + ':attrs:' + id,
      done
    );
  };

  // a node's sources are persistend as a redis set

  // each node in the sources list has a set of targets. the source
  // node id is maintained in that set

  var addSource = function(id, source_id, done){
    async.parallel([
      function(next){
        redis.sadd(
          config.redis.prefix + ':sources:' + id,
          source_id,
          next
        );
      },
      function(next){
        redis.sadd(
          config.redis.prefix + ':targets:' + source_id,
          id,
          next
        );
      }], done);
  };


  var delSource = function(id, source_id, done){
    redis.srem(
      config.redis.prefix + ':sources:' + id,
      source_id
    );
    redis.srem(
      config.redis.prefix + ':targets:' + source_id,
      id
    );
    return done();
  };


  var getSources = function(id, done){
    redis.smembers(
      config.redis.prefix + ':sources:' + id,
      function(err, sources){
        if(!sources){
          sources = [];
        }
        return done(false, sources);
      });  
  };

  var getTargets = function(id, done){
    redis.smembers(
      config.redis.prefix + ':targets:' + id,
      function(err, targets){
        if(!targets){
          targets = [];
        }
        return done(false, targets);
      });  
  };

  // remove all sources from a node
  var delSources = function(id, done){ 
    getSources(
      id, 
      function(err, sources){
        if(!sources){
          return done();
        }
        async.eachSeries(
          sources, 
          function(source_id, next){
            delSource(id, source_id, next);
          },
          done
        );
      });
  };

  // set/get last message output by node

  var setData = function(id, data, done){
    redis.set(
      config.redis.prefix + ':data:' + id,
      JSON.stringify(data),
      done
    );
  };
  
  var getData = function(id, done){
    redis.get(
      config.redis.prefix + ':data:' + id,
      function(err, res){
        var data = null;
        if(res){
          data = JSON.parse(res);
        }
        done(false, data);
      });
  };


  // remove any existing sources a node has and replace with provided
  // set
  var setSources = function(id, sources, done){
    delSources(id, function(){ 
      if(!sources){
        return done();
      }
      async.eachSeries(
        sources, 
        function(source_id, next){
          addSource(id, source_id, next);
        },
        done
      );
    });
  };



  // load node from Redis
  var get = function(id, done){

    var node = {};

    redis.get(
      config.redis.prefix + ':nodes:' + id,
      function(err, res){

        if(err){
          console.log('ERROR', err);
          return done(err);
        }

        if(!res){
          return done(null, null);
        }

        res = JSON.parse(res);
        node.id = res.id;
        node.fn = res.fn;

        async.parallel([
          function(next){
            getSources(id, function(err, sources){
              node.sources = sources;
              next();
            });
          },
          function(next){
            getAttrs(id, function(err, res){
              node.attrs = res;
              next();
            });
          },
          function(next){
            getData(id, function(err, data){
              node.data = data;
              next();
            });
          }
        ], function(err){
          if(err){
            console.log(err);
            return done(err, null);
          }
          done(false, node);
        });
      });

  };


  // get all nodes
  var all = function(done){

    var keys = [];
    var nodes = {};

    async.series([
      function(next){
        redis.keys(
          config.redis.prefix + ':nodes:*',
          function(err, res){
            if(res){
              keys = res;
            }
            next();
          });
      },
      function(next){
        async.eachSeries(
          keys,
          function(key, next){
            var id = _.last(key.split(':')); 
            get(id, function(err, node){
              nodes[node.id] = node;
              next();
            });
          }, function(){
            next();
          });
      }], function(){
        done(false, nodes);
      });
  };


  // add a node to the topology
  var add = function(node, done){

    get(
      node.id, 
      function(err, n){

        // Duplicate node ids generate an error

       if(n){
         return done(new Error('duplicate-id'));
       }        
       
        if(!node.hasOwnProperty('sources')){
          node.sources = [];
        }

        if(!node.hasOwnProperty('attrs')){
          node.attrs = {};
        }

        if(!node.hasOwnProperty('fn')){
          node.fn = 'thru';
        }
       
        var fn = fns[node.fn];

        if(fn.hasOwnProperty('attrs')){
          _.each(fn.attrs, function(v, k){
            if(!node.attrs.hasOwnProperty(k)){
              node.attrs[k] = v;
            }
          });
        }

        async.series([

          function(next){          
            // save node. id and fn are immutable
            var key = config.redis.prefix + ':nodes:' + node.id;
            var val = {
              id: node.id,
              fn: node.fn
            };
            redis.set(key, JSON.stringify(val));
            next();
          },

          function(next){
            // set the inital sources on the node
            setSources(node.id, node.sources, next);
          },

          function(next){
            // init node
            if(!fn.hasOwnProperty('init')){
              return next();
            }

            // allow init to run. It may set some attrs
            fn.attrs = node.attrs;
            fn.init(next);
          },

          function(next){
            // set the initial attrs on the node
            setAttrs(node.id, node.attrs, next);
          }

        ], function(){
          done();
        });
      });  

  };


  // add a node to the topology, providing the correct function for
  // it's process handler
  var del = function(id, done){

    get(
      id, 
      function(err, n){

        if(!n){
          return done();
        }

        async.series([

          function(next){          
            // id and fn are immutable
            var key = config.redis.prefix + ':nodes:' + id;
            redis.del(key);
            next();
          },

          function(next){
            delSources(id, next);
          },

          function(next){
            delAttrs(id, next);
          }

        ], done);
      });  

  };

  // queue processing

  // do init when first adding node to top, then save attrs that init
  // might create

  // var processor = new fns[node.fn];
  // processor.init(function(){
  // });




  // push a message in to a node for processing, get the result (if
  // any) and push it on to the message queue. emit the message to
  // listeners

  var processMessage = function(id, data, done){

    get(
      id, 
      function(err, node){

        if(!node){
          return done(new Error('unknown-node'));
        }
        
        var process = fns[node.fn].process;
        process(
          node.attrs,
          data, 
          function(err, attrs, output){

            if(typeof output === 'undefined'){           
              setAttrs(id, attrs, done);
            }

            async.parallel([

              function(next){
                setAttrs(id, attrs, next);
              },

              function(next){
                setData(id, output, next);
              },

              function(next){

                getTargets(id, function(err, targets){

                  if(targets.length === 0){
                    return next();
                  }
                  
                  // if this node has any listeners, distribute the data
                  // to them via the queue

                  _.each(
                    targets,
                    function(target_id){
                      inject(target_id, data);
                    });

                  next();

                });

              },


            ], function(){

              self.emit('message', {id: id, data: output});
              done(false, output);

            });


          });

      });

  };

var runTimer = null;

  // run one tick of the topology. Pull a message off the queue and
  // have it processed by it's target node.
  var run = function(){

    if(!processing){
      return;
    }

    redis.rpop(
      config.redis.prefix + ':queue',
      function(err, reply){
        if(err){
          console.log('#run error', err);
          run();
          return;
        }
        if (!reply){
          // timed out, no message

          // don't smash Redis.
          runTimer = setTimeout(run, 250);
          //process.nextTick(run);
          return;
        }
        var id, msg, input;
        try {
          input = JSON.parse(reply);

          // if brpop
          //input = JSON.parse(reply[1]);
        } catch (e) {
          // bad json
          console.log('bad json', e, reply);
          process.nextTick(run);
          return;
        }       
        processMessage(
          input.id,
          input.data,
          function(err){
            //console.log('processed, running again');
            process.nextTick(run);
          });
      });
  };


  var inject = function(id, data, done){
    
    var message = {
      at: new Date().getTime(),
      id: id,
      data: data
    };

    redis.lpush(
      config.redis.prefix + ':queue',
      JSON.stringify(message),
      function(err){
        if(done){
          done();
        }
      });
  };


  // start accepting (polling for) messages
  this.startProcessing = function(done){
    processing = true;
    process.nextTick(function(){
      run();
    });
    if(done){
      done();
    }
  };

  // stop processing after the next message
  this.stopProcessing = function(cb){
    self.onStopProcessing = cb;
    if(runTimer){
      clearTimeout(runTimer);
    }
    processing = false;
  };


  // Get everything running
  var start = function(done){
    async.series(
      [
        defaults, connect
      ],
      function(){
        self.emit('start');
        process.nextTick(function(){
          if(done) {
            done();
          }
        });
      }
    );
  };

  // Take everything down cleanly
  var stop = function(done){

    if(processing){
      processing = false;
    }

    async.series([
      function(next){
        redis.quit();
        next();
      }
    ], function(){
      self.emit('stop');
      process.nextTick(function(){
        if(done) {
          done();
        }
      });
    });
  };


  // # API #

  // methods we want to expose

  // start up
  this.start = function(done){
    return start(done);
  };

  // shut down
  this.stop = function(done){
    return stop(done);
  };

  // Reset the database and topology to pristine state
  this.reset = function(done){
    return reset(done);
  };

  // Get all nodes, sources and attrs
  this.all = all;

  // Get a single node. Callback provides null if doesn't exist
  this.get = get;

  // add a node to the topology
  this.add = add;

  // remove a node from the topology
  this.del = del;

  // set attrs on a node
  this.set = setAttrs;

  // // inject a message in to a node

  this.inject = inject;

  // api.inject = this.inject = function(id, message, done){
  //   return topology.inject(id, message, done);
  // };

  // // Get last message processed output by node
  // api.message = this.message = function(id){
  //   return topology.message(id);
  // };


  // start/stop processing messages

  // this.run = run
  
  // this.halt = halt

  return this;

};


// Events

var eventSplitter = /\s+/;

Lancaster.prototype.on = function(events, callback, context) {
  var calls, event, list;
  if ( ! callback ) {
    return this;
  }

  events = events.split(eventSplitter);
  calls = this._callbacks || (this._callbacks = {});

  while (event = events.shift()) {
    list = calls[event] || (calls[event] = []);
    list.push(callback, context);
  }

  return this;
};

Lancaster.prototype.off = function(events, callback, context) {
  var event, calls, list, i;

  // No events, or removing *all* events.
  if ( ! ( calls = this._callbacks ) ) {
    return this;
  }

  if ( ! ( events || callback || context ) ) {
    delete this._callbacks;
    return this;
  }

  events = events ? events.split(eventSplitter) : _.keys(calls);

  // Loop through the callback list, splicing where appropriate.
  while (event = events.shift()) {
    if (!(list = calls[event]) || !(callback || context)) {
      delete calls[event];
      continue;
    }

    for (i = list.length - 2; i >= 0; i -= 2) {
      if (!(callback && list[i] !== callback || context && list[i + 1] !== context)) {
        list.splice(i, 2);
      }
    }
  }

  return this;

};

Lancaster.prototype.emit = function(events) {
  var event, calls, list, i, length, args, all, rest;
  if (!(calls = this._callbacks)){
    return this;
  }

  rest = [];
  events = events.split(eventSplitter);

  // Fill up `rest` with the callback arguments.  Since we're only copying
  // the tail of `arguments`, a loop is much faster than Array#slice.
  for (i = 1, length = arguments.length; i < length; i++) {
    rest[i - 1] = arguments[i];
  }

  // For each event, walk through the list of callbacks twice, first to
  // trigger the event, then to trigger any `"all"` callbacks.
  while (event = events.shift()) {
    // Copy callback lists to prevent modification.
    if (all = calls.all) {
      all = all.slice();
    }

    if (list = calls[event]) {
      list = list.slice();
    }

    // Execute event callbacks.
    if (list) {
      for (i = 0, length = list.length; i < length; i += 2) {
        list[i].apply(list[i + 1] || this, rest);
      }
    }

    // Execute "all" callbacks.
    if (all) {
      args = [event].concat(rest);
      for (i = 0, length = all.length; i < length; i += 2) {
        all[i].apply(all[i + 1] || this, args);
      }
    }
  }

  return this;
};

module.exports = Lancaster;
