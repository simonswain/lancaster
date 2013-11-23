"use strict";

module.exports = function(app, opts){

  var topology = opts.topology;

  // REST methods

  app.get (
    '/ping',
    function(req, res) {
      res.send(200, {pong: new Date().getTime()});
    });


  app.get (
    '/nodes',
    function(req, res) {
      res.send(200, topology.inspect());
    });

  // create a node
  app.post (
    '/nodes',
    function(req, res) {
      // here add attributes, process function, sources.

      topology.add({
        id: req.body.id
      }, function(){
        res.send(204);
      });

    });




};
