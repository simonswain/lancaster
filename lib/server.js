"use strict";

var _ = require('underscore');
var async = require('async');
var Hapi = require('hapi');
var Path = require('path');
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

  var root = __dirname + '/server/public';

  var serverOptions = {
    views: {
      engines: {
        html: require('handlebars')
      },
      path: Path.join(__dirname, 'server/views')
    }
  };
  
  var server = Hapi.createServer(
    opts.server.host, 
    opts.server.port,
    serverOptions
  );

  var ws = new Ws.Server({
    server: server.listener
  });

  // ws methods

  var wsClients = [];

  ws.on('connection', function (socket) {
    
    // send events to socket
    var handler = function(method, id, args){
      console.log('>>>', [method, id, args]);
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
        console.log('ws got invalid command', command, args);
        return;
      }
      console.log('ws got command:', command, args);

      var id, msg;

      switch (command){
        
      case 'all':
        api.all(function(err, res){
          var msg = ['all', res];
          socket.send(JSON.stringify(msg));
        });
        break;
      case 'add':
        api.add(args, function(err, res){
          var msg = ['add', res];
          socket.send(JSON.stringify(msg));
        });
        break;

      case 'set':
        api.set(args[0].id, args[0], function(err, res){
          var msg = ['set', res];
          socket.send(JSON.stringify(msg));
        });

        break;

      default:
        console.log('ws unhandled command:', command, args);
        break;

      }

    });
    
  });

  // asset routes - css, js, images

  server.route({
    method: 'GET',
    path: '/images/{path*}',
    handler: {
      directory: {
        path: Path.join(__dirname, 'server/public/images'),
        listing: false,
        index: false
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/vendor/{path*}',
    handler: {
      directory: {
        path: Path.join(__dirname, 'server/public/vendor'),
        listing: false,
        index: false
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/js/{path*}',
    handler: {
      directory: {
        path: Path.join(__dirname, 'server/public/js'),
        listing: false,
        index: false
      }
    }
  });

  // less

  server.pack.register({
    plugin: require('hapi-less'),
    options: {
      home: Path.join(__dirname, 'server/public/less'),
      route: '/css/{filename*}',
      less: {
        compress: true
      }
    }
  }, function (err) {
    if (err) {
      console.log('Failed loading hapi-less');
    }
  });


  // view routes - html

  server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply.view('app');
    }
  });


  // rest methods

  server.route({
    method: 'GET',
    path: '/api',
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
          x: null,
          y: null ,
          attrs: {},
          sources: [],
        };

        var keys = ['id','fn','sources','attrs','x','y'];

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
      var id = request.params.id;
      api.get(id, function(err, node){
        if(!node || node === null){
          return reply('Not Found').code(404).takeover();
        }
        reply(node);
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

  // change a nodes properties
  server.route({
    method: 'PUT',
    path: '/nodes/{id}',
    handler: function (request, reply) {
      var id = request.params.id;
      api.get(id, function(err, node){
        if(typeof node !== 'object'){
          return reply('Not Found').code(404).takeover();
        }
        var keys = ['x','y'];
        var vals = {};
        _.each(keys, function(key){
          if(request.payload.hasOwnProperty(key)){
            vals[key] = request.payload[key];
          }
        });
        api.set(
          id,
          vals,
          function(){
            reply();
          });

      });

    }
  });

  // set attrs on a node
  server.route({
    method: 'POST',
    path: '/nodes/{id}/attrs',
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

  var methods = {
    server: server,
    api: api
  };

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
