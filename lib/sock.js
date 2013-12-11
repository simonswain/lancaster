"use strict";

var http = require('http');
var sockjs = require('sockjs');

module.exports = function(opts)
{

  if(!opts.config.hasOwnProperty('sock')){
    opts.config.sock = {
      host: '127.0.0.1',
      port: 4042
    };
  }


  var server = http.createServer();

  var echo = sockjs.createServer({
    log: function(){}
  });

  var clients = {};

  echo.on('connection', function(conn) {

    clients[conn.id] = conn;

    conn.on('data', function(message) {
      // handle incoming request from client
    });

    conn.on('close', function() {
      delete clients[conn.id];
    });

  });

  var broadcast = function(message){
    var msg = JSON.stringify(message);
    for(var id in clients) {
      if(clients.hasOwnProperty(id)) {
        clients[id].write(msg);
      }
    }
  };

  echo.installHandlers(
    server, {
      prefix:'/stream'
    });

  var start = function(done){

    server.listen(
      opts.config.sock.port,
      opts.config.sock.host
    );

    if(done){
      done();
    }
  };

  var stop = function(done) {
    for(var id in clients) {
      if(clients.hasOwnProperty(id)) {
        clients[id].close();
      }
    }

    process.nextTick(function(){

      try {
        server.close();
      } catch(err) {
        // if server isn't running
        //console.log(err);
      }
      
      if(done){
        done();
      }

    });

  };

  return {
    start: start,
    broadcast: broadcast,
    stop: stop
  };

};
