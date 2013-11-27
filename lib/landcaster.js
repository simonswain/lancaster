/*
 * https://github.com/simonswain/landcaster
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

  // boot up a Landcaster server instance

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
          console.log(key);         
          redis.del(key);
        });
        return done();
      });

  };

  // save node details to Redis. The node param is JSON, not a node
  // instance. Should attributes be saved here, or separately (one key
  // per attr)
  var save = function(node, done){    
    // 
    var key = config.redis.prefix + ':nodes:' + node.id;
    var val = {
      id: node.id,
      fn: node.fn,
      sources: node.sources
    };

    console.log('SAVE', node, key);
    redis.set(key, JSON.stringify(val));

    return done();


  };

  // load node details from Redis
  var load = function(key, done){
    redis.get(key, function(err, node){
      node = JSON.parse(node);
      topology.add(node, done);
    });
  };


  // Pull any saved structure from db and recreate nodes
  var loadAll = function(next){
    // redis
    redis.keys( 
      config.redis.prefix + ':nodes:*', 
      function(err, keys){
        async.eachSeries(keys, load, next);
      });
  };

  var onMessage = function(message){
    // just a stub for now

    //console.log('MESSAGE', JSON.stringify(message));
  };

  // Set up listeners to write data from topo to db
  var listen = function(next){
    topology.on('message', onMessage);
    topology.start();
    next();
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
        return topology.add(node, done);
      });
    },
    
    remove: function(id, done){
      return topology.remove(id, done);
    },

    // Get value latched from last mesage processed
    val: function(id){
      return topology.val(id);
    },

    // Get a single node. Returns `undefined` if doesn't exist
    get: function(id){
      return topology.get(id);
    },

    set: function(id, attributes, done){
      return topology.set(id, done);
    },

    inject: function(id, message, done){
      return topology.inject(id, message, done);
    }

  };





  // Make it run

  start();

};
