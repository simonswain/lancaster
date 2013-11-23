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

  var connect = function(next){

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

  // create topo
  // pull structure from db
  // set up topo from structure
  var create = function(next){
    topology = Spitfire.create();
    next();
  };

  // set up listeners to write data from topo to db
  var listen = function(next){
    topology = Spitfire.create();
    next();
  };

  // start up the REST API/Socket.io server
  var createServer = function(next){
    rest = require('./rest.js')({
      config: config,
      topology: topology
    });
    next();
  };

  // start up the REST API/Socket.io server
  var startServer = function(next){
    rest.start(next);
  };

  var stop = function(done){
    async.series([
      rest.stop,
      topology.stop
    ], function(){
      redis.quit();
      return done();
    });
  };

  var reset = function(done){
    return done();
  };

  var start = function(){
    async.series(
      [connect, create, createServer, startServer],
      function(){
        done({
          stop: stop,
          reset: reset
        });
      }
    );
  };

  start();

};
