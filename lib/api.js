"use strict";

var _ = require('underscore');
var async = require('async');
var Redis = require('redis');

module.exports = function(opts){

  opts = opts || {};

  var env = process.env.NODE_ENV || 'development';

  if(!opts.redis){
    opts.redis = {
      host: '127.0.0.1',
      port: 6379,
    };
  }

  if(!opts.prefix){
    opts.prefix = 'df:' + env;
  }

  var fns;

  if(opts.hasOwnProperty('fns')){
    fns = opts.fns;
  } else {
    fns = require('./fns');
  }

  var redis = Redis.createClient(
    opts.redis.port,
    opts.redis.host
  );

  var api = {};

  // cleanup for exit
  api.quit = function(next) {
    redis.quit();
    next();
  };

  // Delete all nodes and other data (eg queues) from the topology

  // Delete all nodes. Reset the database and topology to pristine state
  api.reset = function(done) {

    var nodes;

    // delete nodes one by one to emit del messages
    var all = function(next){
      api.all(function(err, n){
        nodes = _.toArray(n);
        next();
      });
    };

    var del = function(x, next){
      api.del(x.id, next);
    };

    var delAll = function(next){
      async.eachSeries(nodes, del, next);
    };

    // delete remaining keys to clear queue
    var deleteKeys = function(next){
      redis.keys(
        opts.prefix + ':*',
        function(err, keys){
          _.each(keys, function(key){
            redis.del(key);
          });
          next();
        });
    };

    async.series(
      [all, delAll, deleteKeys],
      done
    );

  };

  // make fns available (worker uses these)
  api.fns = function(x){
    return fns[x];
  };

  // a node's sources are persisted as a Redis set

  // each node in the sources list has a set of targets. the source
  // node id is maintained in that set

  // Set attrs on a node by persisting them them in Redis as a hash

  // set attrs on a node
  api.setAttrs = function(id, attrs, done){
    redis.hmset(
      opts.prefix + ':attrs:' + id,
      attrs,
      done
    );
  };


  api.getAttrs = function(id, done){
    redis.hgetall(
      opts.prefix + ':attrs:' + id,
      function(err, res){
        if(!res){
          res = {};
        }
        done(false, res);
      });
  };

  // set with #attrs(id, {}, done) or get with #attrs(id, done)

  api.attrs = function(id, attrs, done){
    if(arguments.length === 2){
      done = attrs;
      return api.getAttrs(id, done);
    }
    return api.setAttrs(id, attrs, done);
  };

  // used when deleting a node
  api.delAttrs = function(id, done){
    redis.del(
      opts.prefix + ':attrs:' + id,
      done
    );
  };

  // add a source to a node
  api.addSource = function(id, source_id, done){

    async.parallel([
      function(next){
        redis.sadd(
          opts.prefix + ':sources:' + id,
          source_id,
          next
        );
      },
      function(next){
        redis.sadd(
          opts.prefix + ':targets:' + source_id,
          id,
          next
        );
      }], function(){
        api.emit('addSource', id, [source_id], done);
      });
  };

  // remove a source from a node
  api.delSource = function(id, source_id, done){
    redis.srem(
      opts.prefix + ':sources:' + id,
      source_id
    );
    redis.srem(
      opts.prefix + ':targets:' + source_id,
      id
    );
    return done();
  };

  // get all sources a node has
  api.getSources = function(id, done){
    redis.smembers(
      opts.prefix + ':sources:' + id,
      function(err, sources){
        if(!sources){
          sources = [];
        }
        return done(false, sources);
      });
  };

  // remove all sources from a node
  api.delSources = function(id, done){
    this.getSources(
      id,
      function(err, sources){
        if(!sources){
          return done();
        }
        async.eachSeries(
          sources,
          function(source_id, next){
            api.delSource(id, source_id, next);
          },
          done
        );
      });
  };


  api.getTargets = function(id, done){
    redis.smembers(
      opts.prefix + ':targets:' + id,
      function(err, targets){
        if(!targets){
          targets = [];
        }
        return done(false, targets);
      });
  };

  // set/get in Redis last message output by node
  api.setData = function(id, data, done){
    redis.set(
      opts.prefix + ':data:' + id,
      JSON.stringify(data),
      function(){
        api.emit('setData', id, data, done);
      }
    );
  };

  api.getData = function(id, done){
    redis.get(
      opts.prefix + ':data:' + id,
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
  api.setSources = function(id, sources, done){
    this.delSources(id, function(){
      if(!sources){
        return done();
      }
      async.eachSeries(
        sources,
        function(source_id, next){
          api.addSource(id, source_id, next);
        },
        done
      );
    });
  };

  // load a node from Redis
  // Get a single node. Callback provides null if doesn't exist

  api.get = function(id, done){
    var node = {};

    redis.get(
      opts.prefix + ':nodes:' + id,
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
        node.x = res.x;
        node.y = res.y;

        async.parallel([
          function(next){
            api.getSources(id, function(err, sources){
              node.sources = sources;
              next();
            });
          },
          function(next){
            api.getAttrs(id, function(err, res){
              node.attrs = res;
              next();
            });
          },
          function(next){
            api.getData(id, function(err, data){
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


  // get all nodes in the topology
  api.all = function(done){

    var keys = [];
    var nodes = {};

    async.series([
      function(next){
        redis.keys(
          opts.prefix + ':nodes:*',
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
            api.get(id, function(err, node){
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
  api.add = function(node, done){

    this.get(
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

        if(!node.hasOwnProperty('x')){
          node.x = null;
        }

        if(!node.hasOwnProperty('y')){
          node.y = null;
        }

        if(!node.hasOwnProperty('fn') || !node.fn){
          node.fn = 'thru';
        }

        if(!fns.hasOwnProperty(node.fn)){
          node.fn = 'thru';
        }

        // copy default attrs from fn definition

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
            var key = opts.prefix + ':nodes:' + node.id;
            var val = {
              id: node.id,
              fn: node.fn,
              x: node.x,
              y: node.y
            };
            redis.set(key, JSON.stringify(val));
            next();
          },

          function(next){          
            // set the inital sources on the node
            api.setSources(node.id, node.sources, next);
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
            api.setAttrs(node.id, node.attrs, next);
          }

        ], function(){
          api.emit('add', node.id, node, done);
        });
      });

  };


  // change a nodes's properties (just x and y for now)
  api.set = function(id, newVals, done){
        
    api.get(
      id,
      function(err, node){

        if(!node){
          return done();
        }
        
        var keys = ['x','y'];
        var vals = {};
        _.each(keys, function(key){
          if(newVals.hasOwnProperty(key)){
            vals[key] = newVals[key];
          }
        });

        var set = function(next){
          var key = opts.prefix + ':nodes:' + node.id;
          var val = {
            id: node.id,
            fn: node.fn,
            x: vals.x,
            y: vals.y
          };

          redis.set(
            key, 
            JSON.stringify(val),
            next
          );
        };

        async.series([
          set
        ], function(){
          api.emit('set', id, vals, done);
        });
      });
  };

  // remove a node from the topology
  api.del = function(id, done){

    this.get(
      id,
      function(err, n){

        if(!n){
          return done();
        }

        async.series([

          function(next){
            // id and fn are immutable
            var key = opts.prefix + ':nodes:' + id;
            redis.del(key);
            next();
          },

          function(next){
            api.delSources(id, next);
          },

          function(next){
            api.delAttrs(id, next);
          }

        ], function(){
          api.emit('del', id, done);
        });
      });

  };


  // inject a message in to a node

  // message handler does process then emits event (redis pub) and
  // distributes message to targets (redis queue)
  api.inject = function(id, data, done){

    var message = {
      at: new Date().getTime(),
      id: id,
      data: data
    };

    redis.lpush(
      opts.prefix + ':queue',
      JSON.stringify(message),
      function(err){
        return done();
      });
  };

  // delete all messages off queue
  api.purge = function(done){

    redis.del(
      opts.prefix + ':queue',
      function(err){
        if(done){
          return done(null);
        }
      });
  };


  api.extract = function(done){

    redis.rpop(
      opts.prefix + ':queue',
      function(err, reply){

        if(err){
          console.log('#run error', err);
          return done(err, null, null);
        }

        if (!reply){
          // timed out, no message
          return done(null, null, null);
        }

        var id, msg, input;

        try {
          msg = JSON.parse(reply);
          // if brpop use this instead
          //input = JSON.parse(reply[1]);
        } catch (e) {
          // bad json
          console.log('bad json', e, reply);
          return done(err, null, null);
        }

        return done(null, msg.id, msg.data);

      });
  };

  api.process = function(id, data, done){

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
              done(false, output);
            });
          });
      });

  };


  // if exists process one message from the queue
  api.tick = function(done){
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

  // events stream

  api.emit = function(method, id, args, done){

    if (typeof args === 'function'){
      done = args;
      args = false;
    }

    //console.log('EMIT:', method, id, JSON.stringify(args));
    
    redis.publish(
      opts.prefix + ':events:' + id + ':' + method,
      JSON.stringify(args),
      done
    );
  };

  // list of events listeners
  var list = [];

  api.listener = function(id, handler){
    var key;
    
    // if no id supplied, then get all events (global listener)

    if(typeof id === 'function'){
      handler = id;
      id = false;
      key = opts.prefix + ':events:*';
    } else {
      key = opts.prefix + ':events:' + id + ':*';
    }

    var sub = Redis.createClient(
      opts.redis.port,
      opts.redis.host
    );

    sub.psubscribe(key);

    sub.on('pmessage', function(pattern, channel, msg){
      //console.log('**', msg, typeof msg);
      var args;
      if(msg && typeof msg !== 'undefined' && msg !== 'undefined'){
        args = JSON.parse(msg);
      }

      // key may have prefixes, so count from the end
      // e.g: df:test:events:my-node-id:setData
      var keys = channel.split(':');
      var id = keys[keys.length-2];
      var method = keys[keys.length-1];
      handler(method, id, args);
    });

    var quit = function(){
      sub.quit();
    };

    return {
      quit: quit
    };

  };

  api.worker = require('./worker');

  return api;

};
