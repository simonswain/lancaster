/*
 * landcaster
 * https://github.com/simonswain/landcaster
 *
 * Copyright (c) 2013 Simon Swain
 * Licensed under the MIT license.
 */

"use strict";

var async = require('async');
var Redis = require('redis');

var Spitfire = require('spitfire');

module.exports = function(config, done){

  var self = this;

  // boot up a Landcaster server instance

  var redis;
  var topology, rest;

  // ## Startup ##

  // Here are a set of routines for booting up the server

  // Establish database connections
  var connect = function(next){
    // Set some defaults if they were not supplied
    if(!config.hasOwnProperty('redis')){
      config.redis = {
        host: '127.0.0.1',
        port: 6379
      };
    }

    if(!config.redis.hasOwnProperty('prefix')){
      config.redis.prefix = '';
    } else {
      config.redis.prefix = ':' + config.redis.prefix;
    }

    redis = Redis.createClient();
    next();

  };

  // Create a new empty topology.
  var create = function(next){
    topology = Spitfire.create();
    next();
  };

  // Pull any saved structure from db and recreate nodes
  var load = function(next){
    next();
  };

  // Set up listeners to write data from topo to db
  var listen = function(next){
    topology = Spitfire.create();
    next();
  };

  // Initialize the REST API/Socket.io server
  var createServer = function(next){
    rest = require('./rest.js')({
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
      [connect, create, load, createServer, startServer],
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
      topology.stop
    ], function(){
      redis.quit();
      return done();
    });
  };

  // Restore the database to a pristine state
  var reset = function(done){
    return done();
  };


  // ## Make it run ##

  start();

};
