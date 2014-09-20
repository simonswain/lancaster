"use strict";

var async = require('async');
var Hapi = require('hapi');
var Ws = require('ws');

module.exports = function(opts){

  opts = opts || {};

  if(!opts.hasOwnProperty('server')){
    opts.server = {
      host: '127.0.0.1',
      port: 4002
    };
  }

  if(!opts.server.hasOwnProperty('host')){
    opts.server.host = '127.0.0.1';
  }

  if(!opts.server.hasOwnProperty('port')){
    opts.server.port = 4002;
  }

  var api = require('../lib').api(opts);
  
  var server = Hapi.createServer(opts.server.host, opts.server.port);

  var ws = new Ws.Server({
    server: server.listener
  });

  // ws methods

  var wsClients = [];

  ws.on('connection', function (socket) {
    
    // send events to socket
    var handler = function(method, id, args){
      socket.send(JSON.stringify([method, id, args]));
    };

    var listener = api.listener(handler);

    socket.on('close', function (message) {
      listener.quit();
    });

    // receive commands from socket
    socket.on('message', function (message) {
      var args;
      try{
        args = JSON.parse(message);
      } catch(e){
        console.log(e);
        return;
      }

      var command = args.shift();
      
      if(!api.hasOwnProperty(command)){
        return;
      }

      args.push(function(err, res){
        //console.log('done', err, res);
      });

      api[command].apply(api, args);
    });

  });

  // rest methods

  server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply({'lancaster':opts});
    }
  });

  // ping
  server.route({
    method: 'GET',
    path: '/ping',
    handler: function (request, reply) {
      reply({pong: new Date().getTime()});
    }
  });

  // system status
  server.route({
    method: 'GET',
    path: '/status',
    handler: function (request, reply) {
      reply({status: 'ok'});
    }
  });

  // nuke database
  server.route({
    method: 'POST',
    path: '/reset',
    handler: function (request, reply) {
      api.reset(function(err, res){
        reply();
      });
    }
  });

  // get all nodes
  server.route({
    method: 'GET',
    path: '/nodes',
    handler: function (request, reply) {
      api.all(function(err, nodes){
        reply(nodes);
      });
    }
  });

  //create node
  server.route({
    method: 'POST',
    path: '/nodes',
    handler: function (request, reply) {

      // id
      // fn
      // sources []
      // ... attrs

      if(!request.payload.hasOwnProperty('id')){
        return reply('Invalid').code(400).takeover();
      }

      var id = request.payload.id;

      // duplicate node
      api.get(id, function(err, existingNode){

        if(existingNode){
          return reply('Duplicate').code(409).takeover();
        }

        var node = {
          id: null,
          fn: null,
          attrs: {},
          sources: [],
        };

        var keys = ['id','fn','sources','attrs'];

        for(var key in request.payload){
          if(keys.indexOf(key) !== -1){
            node[key] = request.payload[key];
          }
        }

        api.add(node, function(err, nodes){
          reply();
        });

      });

    }
  });

  // get node by id
  server.route({
    method: 'GET',
    path: '/nodes/{id}',
    handler: function (request, reply) {
      api.get(
        request.params.id,
        function(err, node){

          var id = request.params.id;
          api.get(id, function(err, node){
            if(!node || node === null){
              return reply('Not Found').code(404).takeover();
            }
            reply(node);
          });
        });
    }
  });

  // delete node
  server.route({
    method: 'DELETE',
    path: '/nodes/{id}',
    handler: function (request, reply) {

      var id = request.params.id;

      api.get(id, function(err, node){

        if(!node){
          return reply('Not Found').code(404).takeover();
        }

        api.del(id, function(err, node){
          reply();
        });

      });
    }
  });

  // set attrs on a node
  server.route({
    method: 'POST',
    path: '/nodes/{id}',
    handler: function (request, reply) {

      var id = request.params.id;
      var attrs = request.payload;

      api.get(id, function(err, node){

        if(typeof node !== 'object'){
          return reply('Not Found').code(404).takeover();
        }

        api.attrs(
          id,
          attrs,
          function(){
            reply();
          });

      });

    }
  });

  // inject a message to a node
  server.route({
    method: 'POST',
    path: '/nodes/{id}/message',
    handler: function (request, reply) {

      var id = request.params.id;
      var message = request.payload;

      api.get(id, function(err, node){

        if(typeof node !== 'object'){
          return reply('Not Found').code(404).takeover();
        }

        api.inject(
          id,
          message,
          function(){
            reply();
          });

      });

    }
  });



  // control server

  var methods = {};

  methods.start = function(done){
    server.start(function(){
      done();
    });
  };

  methods.stop = function(done){
    ws.close();
    server.stop(function(){
      api.quit(function(){
        done();
      });
    });
    // async.series([
    //   server.stop,
    //   api.quit
    // ], done);
  };

  return methods;

};
