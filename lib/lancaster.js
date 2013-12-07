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
var Spitfire = require('spitfire');

var Lancaster = module.exports = function(config, done){

  var self = this;

  // could come from config -- merge in from config.fns
  var fns = require('./fns');

  // boot up a Lancaster server instance

  var redis;
  var api, topology, rest;

  // ## Startup ##

  // Here are a set of routines for booting up the server. They are
  // run in series when the instance is created.

  // Establish database connections
  var connect = function(next){
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

    redis = Redis.createClient({
      host: config.redis.host,
      port: config.redis.port,
      prefix: config.redis.prefix
    });

    next();

  };

  // Create a new empty topology.
  var create = function(next){
    var self = this;
    topology = Spitfire.create({
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        prefix: config.redis.prefix
      }
    });
    topology.on('message', function(message){
      //self.emit('message', message);
      console.log('EMIT', message.id, message.msg.count);
    });
    next();
  };

  // Reset the database and topology to pristine state
  var reset = function(done){

    var topo = function(next){
      topology.reset(next);
    };

    var keys = function(next){
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

    async.parallel([topo, keys], done);

  };

  // save node details to Redis. The node param is JSON, not a node
  // instance. Should attrs be saved here, or separately (one key
  // per attr)
  var save = function(node, done){
    //
    var key = config.redis.prefix + ':nodes:' + node.id;
    var val = {
      id: node.id,
      fn: node.fn,
      sources: node.sources
    };

    redis.set(key, JSON.stringify(val));

    var attrs = {};
    _.each(node, function(v,k){
      if(k !== 'id' && k !== 'fn' && k !== 'sources' ){
        attrs[k] = v;
      }
    });
    set(node.id, attrs, done);

  };

  // add a node to the topology, providing the correct function for
  // it's process handler
  var add = function(node, done){

    if(!node.hasOwnProperty('sources')){
      node.sources = [];
    }
    var opts = {
      id: node.id
    };

    _.each(node, function(v,k){
      if(k !== 'id' && k !== 'fn' && k !== 'sources' ){
        opts[k] = v;
      }
    });

    // attach processing fns
    
    var methods = {};

    if(node.hasOwnProperty('fn') && fns.hasOwnProperty(node.fn)){
      
      if(fns[node.fn].hasOwnProperty('init')){
        methods.init = fns[node.fn].init;
      }

      if(fns[node.fn].hasOwnProperty('process')){
        methods.process = fns[node.fn].process;
      }

      if(fns[node.fn].hasOwnProperty('stop')){
        methods.stop = fns[node.fn].stop;
      }   

    }

    // dummy process handler
    if(!methods.hasOwnProperty('process')){
      methods.process = function(msg, done){
        done(null, msg);
      };
    }

    return topology.add(opts, methods, node.sources, done);

  };

  var fetch = function(id, done){
    var node = topology.get(id);
    if(!node){
      return done(null, false);
    }
    redis.get(
      config.redis.prefix + ':nodes:' + id,
      function(err, n){
        n = JSON.parse(n);
        node.fn = n.fn;
        node.sources = n.sources;
        done(null, node);
      });
  };


  // load node details from Redis
  var load = function(id, done){
    redis.get(
      config.redis.prefix + ':nodes:' + id,
      function(err, node){
        node = JSON.parse(node);
        add(node, function(){
          loadAttrs(id, done);
        });
      });
  };


  // Pull any saved structure from db and recreate nodes
  var loadAll = function(next){
    // redis
    redis.keys(
      config.redis.prefix + ':nodes:*',
      function(err, keys){
        async.eachSeries(
          keys,
          function(key, done){
            var id = _.last(key.split(':'));
            load(id, done);
          },
          next);
      });
  };

  // load all attrs for a given node
  var loadAttrs = function(id, done){
    var attrs = {};
    redis.keys(
      config.redis.prefix + ':attrs:' + id + ':*',
      function(err, keys){
        async.eachSeries(
          keys,
          function(k, next){
            redis.get(k, function(err, val){
              var key = _.last(k.split(':'));
              topology.set(id, key, val);
              next();
            });
          },
          done
        );
      });
  };


  var set = function(id, attrs, done){

    attrs = _.map(attrs, function(v, k){
      return {
        key: k,
        value: v
      };
    });

    async.each(
      attrs,
      function(attr, next){
        redis.set(
          config.redis.prefix + ':attrs:' + id + ':' + attr.key,
          attr.value,
          next
        );
      },
      done
    );

  };


  var onMessage = function(message){
    // just a stub for now

    //console.log('MESSAGE', JSON.stringify(message));
  };

  // Set up listeners to write data from topo to db
  var listen = function(next){
    topology.on('message', onMessage);
    topology.start(function(){
      next();
    });
  };

  // Initialize the REST API/Socket.io server
  var createServer = function(next){
    rest = require('./rest.js')({
      api: api,
      config: config,
      topology: topology
    });
    next();
  };

  // Start up the REST API/Socket.io server
  var startServer = function(next){
    rest.start(next);
  };

  // # API #

  // This API is provided to REST and any other front-ends. It's the
  // only way they should be touching the Topology

  api = {

    // Reset the database and topology to pristine state
    reset: function(done){
      return reset(done);
    },

    // Get all nodes and their sources
    inspect: function(){
      return topology.inspect();
    },

    // Add a node to the Topology
    add: function(node, done){
      // save to redis
      save(node, function(err){
        if(err){
          return done(err);
        }
        // add to topology
        add(node, done);
      });
    },

    fetch: function(id, done){
      return fetch(id, done);
    },

    remove: function(id, done){
      return topology.remove(id, done);
    },

    // Get value latched from last mesage processed
    message: function(id){
      return topology.message(id);
    },

    // Get a single node. Returns `undefined` if doesn't exist
    get: function(id){
      return topology.get(id);
    },

    set: function(id, attrs, done){
      return set(id, attrs, done);
    },

    inject: function(id, message, done){
      return topology.inject(id, message, done);
    }

  };


  // Get everything running
  var start = function(){
    async.series(
      [connect, create, loadAll, listen, createServer, startServer],
      function(){
        done({
          api: api,
          stop: stop,
          reset: reset
        });
      }
    );
  };

  // Take everything down cleanly
  var stop = function(done){
    async.series([
      rest.stop,
      function(next){
        topology.off('message', onMessage);
        next();
      },
      topology.stop
    ], function(){
      redis.quit();
      return done();
    });
  };

  // Make it run

  start();

};


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
