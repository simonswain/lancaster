"use strict";

var Hapi = require('hapi');
var async = require('async');

var Topology = require('./topology.js');

var Server = function(config, done){

  var self = this;

  config = config || {};

  if(!config.hasOwnProperty('host')){
    config.host = '0.0.0.0';
  }

  if(!config.hasOwnProperty('port')){
    config.port = 4002;
  }

  var server = this.server = Hapi.createServer(config.host, config.port);
  
  server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply({'lancaster':config});
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
      self.topo.reset(function(){
        reply();
      });
    }
  });

  // get all nodes
  server.route({
    method: 'GET',
    path: '/nodes',
    handler: function (request, reply) {
      self.topo.all(function(err, nodes){
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
      self.topo.get(id, function(err, existingNode){

        if(existingNode){ 
          return reply('Duplicate').code(409).takeover();
        }

        var node = {
          sources: []
        };

        for(var key in request.payload){
          node[key] = request.payload[key];
        }

        self.topo.add(node, function(err, nodes){
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
      self.topo.get(
        request.params.id, 
        function(err, node){
          
          var id = request.params.id;
          self.topo.get(id, function(err, node){
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
      
      self.topo.get(id, function(err, node){

        if(!node){ 
          return reply('Not Found').code(404).takeover();
        }

        self.topo.del(id, function(err, node){
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

      self.topo.get(id, function(err, node){

        if(typeof node !== 'object'){ 
          return reply('Not Found').code(404).takeover();
        }
        
        self.topo.attrs(
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

      self.topo.get(id, function(err, node){

        if(typeof node !== 'object'){ 
          return reply('Not Found').code(404).takeover();
        }

        
        self.topo.inject(
          id, 
          message, 
          function(){
            reply();
          });      

      });
      
    }
  });


  // server.route({
  //   method: 'POST',
  //   path: '/nodes',
  //   handler: function (request, reply) {

  //     if(!request.payload.hasOwnProperty('id')){
  //       return reply('Invalid').code(400);
  //     }

  //     var node = {
  //       sources: []
  //     };

  //     for(var key in request.payload){
  //       node[key] = request.payload[key];
  //     }

  //     self.topo.add(node, function(){
  //       self.topo.get(node.id, function(err, node){
  //         if(!node){ 
  //           return reply('Not Found').code(404);
  //         }
  //         reply(node);
  //       });
  //     });

  //   }
  // });

  // server.route({
  //   method: 'DELETE',
  //   path: '/nodes/{id}',
  //   handler: function (request, reply) {
  //     self.topo.del(request.params.id, function(){
  //       reply();
  //     });
  //   }
  // });


  // server.route({
  //   method: 'POST',
  //   path: '/nodes/{id}/message',
  //   handler: function (request, reply) {

  //     var msg = request.payload;
  //     self.topo.get(request.params.id, function(err, node){
        
  //       if(!node){ 
  //         return reply('Not Found').code(404);
  //       }
  //       self.topo.inject(
  //         node.id, 
  //         msg,
  //         function(){
  //           reply(node);
  //         });
  //     });
  //   }
  // });


  // server.route({
  //   method: 'POST',
  //   path: '/nodes/{id}',
  //   handler: function (request, reply) {

  //     var attrs = request.payload;
  //     self.topo.get(request.params.id, function(err, node){
        
  //       if(!node){ 
  //         return reply('Not Found').code(404);
  //       }
  //       self.topo.set(
  //         node.id, 
  //         attrs,
  //         function(){
  //           reply(node);
  //         });
  //     });
  //   }
  // });


  this.topo = new Topology(config, function(){
    done();
  });

};

Server.prototype.start = function(done){
  this.server.start(function(){
    done();
  });
};

Server.prototype.stop = function(done){
  var self = this;
  this.server.stop(function(){    
    self.topo.quit(function(){
      done();
    });
  });
};

module.exports = Server;


module.exportsOLD = function(opts)
{

  var fs = require('fs');

  var express = require('express');
  var app = express();
  app.config = opts.config;
  app.port = opts.config.port;

  var server;
  var routes;

  if(app.config.env === 'live') {
  }

  if(app.config.env === 'dev') {
    console.log('Development');
    app.use(express.logger('dev'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.locals.pretty = true;
  }

  if(app.config.env === 'test') {
  }

  app.disable('x-powered-by');

  app.use(express.json());
  app.use(express.urlencoded());

  // catch malformed json
  var clientErrorHandler = function(err, req, res, next) {
    if (err) {
      console.log('ERROR', err);
      res.writeHead(400);
      res.end('Invalid Request');
    } else {
      next();
    }
  };

  app.use(clientErrorHandler);
  app.use(app.router);
  routes = require('./rest-routes.js')(app, opts);

  var start = function(done){
    var listen;
    if(app.config.listen){
      // listen on unix socket for nginx
      listen = app.config.listen;

      // remove stale socket
      fs.unlinkSync(listen);
    } else {
      // listen on localhost:port
      listen = app.config.port;
    }

    server = require('http').createServer(app);
    server.listen(
      listen,
      function() {

        // ensure nginx can access the socket
        if(app.config.listen){
          fs.chmodSync(listen, '0777');
        }

        if(!app.config.listen && process.env.NODE_ENV !== 'test'){
          console.log('Lancaster REST server running on', app.config.port);
        }

        if(app.config.listen && process.env.NODE_ENV !== 'test'){
          console.log('Lancaster REST server listening at', listen);
        }

        if(done){
          done();
        }

      });
  };

  var stop = function(done){
    server.close(function(){
      if(done){
        if(process.env.NODE_ENV !== 'test'){
          console.log('Lancaster REST server shut down');
        }
        done();
      }
    });
  };

  return {
    start: start,
    stop: stop
  };

};
