/*
 * https://github.com/simonswain/lancaster
 *
 * Copyright (c) 2013 Simon Swain
 * Licensed under the MIT license.
 */

"use strict";

var async = require('async');
var Redis = require('redis');
var _ = require('underscore');
var Spitfire = require('spitfire');

module.exports = function(config, done){

  var self = this;

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
    topology = Spitfire.create({
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        prefix: config.redis.prefix
      }
    });
    next();
  };

  // Reset the database and topology to pristine state
  var reset = function(done){

    // redis
    redis.keys(
      config.redis.prefix + '*',
      function(err, keys){
        _.each(keys, function(key){
          redis.del(key);
        });
        return done();
      });

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

  // add a node to the topology, providing the correction function for
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

    // here look up and require fn

    // dummy process handler
    var fn = function(msg, done){
      done(null, msg);
    };

    return topology.add(opts, {process: fn}, node.sources, done);

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

  // Get everything running
  var start = function(){
    async.series(
      [connect, create, loadAll, listen, createServer, startServer],
      function(){
        done({
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





  // Make it run

  start();

};
