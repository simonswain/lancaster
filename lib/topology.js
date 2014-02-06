/*
 * https://github.com/simonswain/lancaster
 *
 * Copyright (c) 2014 Simon Swain
 * Licensed under the MIT license.
 */

"use strict";

var _ = require('underscore');
var async = require('async');
var Redis = require('redis');

// methods for working on the topology datastructure.

// The topology is held in Redis.

var Topology = function(config, done) {

  // Set some defaults if they were not supplied

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

  this.processing = true;

  process.nextTick(done);

};

Topology.prototype.quit = function(done){
  this.redis.quit();
  return done();
};

// ## Methods for working on the topology ##

// Delete all nodes and other data (eg queues) from the topology


// Reset the database and topology to pristine state
Topology.prototype.reset = function(done){

  var self = this;

  var deleteKeys = function(next){
    // redis
    self.redis.keys(
      self.prefix + '*',
      function(err, keys){
        _.each(keys, function(key){
          self.redis.del(key);
        });
        next();
      });
  };

  async.parallel(
    [deleteKeys], 
    done
  );

};

// a node's sources are persistend as a redis set

// each node in the sources list has a set of targets. the source
// node id is maintained in that set

// Set attrs on a node by persisting them them in Redis as a hash


// set attrs on a node
Topology.prototype.setAttrs = function(id, attrs, done){
  var self = this;
  this.redis.hmset(
    self.prefix + 'attrs:' + id,
    attrs,
    done
  );
};

Topology.prototype.getAttrs = function(id, done){
  var self = this;
  this.redis.hgetall(
    self.prefix + 'attrs:' + id,
    function(err, res){
      if(!res){
        res = {};
      }
      done(false, res);
    });
};

// set with #attrs(id, {}, done) or get with #attrs(id, done)

Topology.prototype.attrs = function(id, attrs, done){
  if(arguments.length === 2){
    done = attrs;
    return this.getAttrs(id, done);
  }
  return this.setAttrs(id, attrs, done);
};

// used when deleting a node
Topology.prototype.delAttrs = function(id, done){
  var self = this;
  this.redis.del(
    self.prefix + 'attrs:' + id,
    done
  );
};

// add a source to a node
Topology.prototype.addSource = function(id, source_id, done){
  
  var self = this;

  async.parallel([
    function(next){
      self.redis.sadd(
        self.prefix + 'sources:' + id,
        source_id,
        next
      );
    },
    function(next){
      self.redis.sadd(
        self.prefix + 'targets:' + source_id,
        id,
        next
      );
    }], done);
};

// remove a source from a node
Topology.prototype.delSource = function(id, source_id, done){
  this.redis.srem(
    this.prefix + 'sources:' + id,
    source_id
  );
  this.redis.srem(
    this.prefix + 'targets:' + source_id,
    id
  );
  return done();
};

// get all sources a node has
Topology.prototype.getSources = function(id, done){
  this.redis.smembers(
    this.prefix + 'sources:' + id,
    function(err, sources){
      if(!sources){
        sources = [];
      }
      return done(false, sources);
    });  
};

// remove all sources from a node
Topology.prototype.delSources = function(id, done){ 
  var self = this;
  this.getSources(
    id, 
    function(err, sources){
      if(!sources){
        return done();
      }
      async.eachSeries(
        sources, 
        function(source_id, next){
          self.delSource(id, source_id, next);
        },
        done
      );
    });
};


Topology.prototype.getTargets = function(id, done){
  var self = this;
  this.redis.smembers(
    self.prefix + 'targets:' + id,
    function(err, targets){
      if(!targets){
        targets = [];
      }
      return done(false, targets);
    });  
};

// set/get in Redis last message output by node
Topology.prototype.setData = function(id, data, done){
  var self = this;
  this.redis.set(
    self.prefix + 'data:' + id,
    JSON.stringify(data),
    done
  );
};

Topology.prototype.getData = function(id, done){
  var self = this;
  this.redis.get(
    self.prefix + 'data:' + id,
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
Topology.prototype.setSources = function(id, sources, done){
  var self = this;
  this.delSources(id, function(){ 
    if(!sources){
      return done();
    }
    async.eachSeries(
      sources, 
      function(source_id, next){
        self.addSource(id, source_id, next);
      },
      done
    );
  });
};



// load a node from Redis
// Get a single node. Callback provides null if doesn't exist

Topology.prototype.get = function(id, done){

  var self = this;

  var node = {};

  this.redis.get(
    self.prefix + 'nodes:' + id,
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
          self.getSources(id, function(err, sources){
            node.sources = sources;
            next();
          });
        },
        function(next){
          self.getAttrs(id, function(err, res){
            node.attrs = res;
            next();
          });
        },
        function(next){
          self.getData(id, function(err, data){
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
Topology.prototype.all = function(done){

  var self = this;

  var keys = [];
  var nodes = {};

  async.series([
    function(next){
      self.redis.keys(
        self.prefix + 'nodes:*',
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
          self.get(id, function(err, node){
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
Topology.prototype.add = function(node, done){

  var self = this;

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

      if(!node.hasOwnProperty('fn')){
        node.fn = 'thru';
      }
      
      var fn = self.fns[node.fn];

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
          var key = self.prefix + 'nodes:' + node.id;
          var val = {
            id: node.id,
            fn: node.fn
          };
          self.redis.set(key, JSON.stringify(val));
          next();
        },

        function(next){
          // set the inital sources on the node
          self.setSources(node.id, node.sources, next);
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
          self.setAttrs(node.id, node.attrs, next);
        }

      ], function(){
        done();
      });
    });  

};


// remove a node from the topology
Topology.prototype.del = function(id, done){

  var self = this;

  this.get(
    id, 
    function(err, n){

      if(!n){
        return done();
      }

      async.series([

        function(next){          
          // id and fn are immutable
          var key = self.prefix + 'nodes:' + id;
          self.redis.del(key);
          next();
        },

        function(next){
          self.delSources(id, next);
        },

        function(next){
          self.delAttrs(id, next);
        }

      ], done);
    });  

};


// inject a message in to a node

// message handler does process then emits event (redis pub) and
// distributes message to targets (redis queue)
Topology.prototype.inject = function(id, data, done){

  var self = this;
  
  var message = {
    at: new Date().getTime(),
    id: id,
    data: data
  };

  this.redis.lpush(
    self.prefix + 'queue',
    JSON.stringify(message),
    function(err){
      if(done){
        done(null);
      }
    });
};

// delete all messages off queue
Topology.prototype.purge = function(done){

  var self = this;

  this.redis.del(
    self.prefix + 'queue',
    function(err){
      if(done){
        done(null);
      }
    });
};


Topology.prototype.extract = function(done){

  var self = this;

  if(!this.processing){
    if(self.onStopProcessing){
      self.onStopProcessing();
    }
    return;
  }

  this.redis.rpop(
    this.prefix + 'queue',
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


module.exports = Topology;
