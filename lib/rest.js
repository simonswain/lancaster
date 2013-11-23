module.exports = function(opts){

  var fs = require('fs');

  var express = require('express');
  var app = express();
  app.config = opts.config;
  app.port = opts.config.port;

  var topology = opts.topology;

  var server;
  var routes = {};

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

  app.get (
    '/ping',
    function(req, res) {
      res.send(200, {pong: new Date().getTime()});
    });

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
          console.log('Landcaster REST server running on', app.config.port);
        }

        if(app.config.listen && process.env.NODE_ENV !== 'test'){
          console.log('Landcaster REST server listening at', listen);
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
          console.log('Landcaster REST server shut down');
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
