"use strict";

module.exports = function(app, opts){

  var api = opts.api;

  // # REST methods #

  // Cgeck API is up
  app.get (
    '/ping',
    function(req, res) {
      res.send(200, {pong: new Date().getTime()});
    });

  // app.post (
  //   '/reset',
  //   function(req, res) {
  //     api.reset(function(){
  //       res.send(204);
  //     });
  //   });

  // Inpsect nodes
  app.get (
    '/nodes',
    function(req, res) {
      res.send(200, api.inspect());
    });

  // Create a node
  app.post (
    '/nodes',
    function(req, res) {

      // id
      // fn
      // sources []
      // ... attributes

      if(!req.body.hasOwnProperty('id')){
        return res.send(400);
      }

      var node = {
        sources: []
      };

      for(var key in req.body){
        node[key] = req.body[key];
      }

      api.add(node, function(){
        res.send(204);
      });

    });

  app.get (
    '/nodes/:id',
    function(req, res) {
      api.fetch(req.params.id, function(err, node){
        if(!node){
          return res.send(404);
        }
        res.send(200, node);
      });
    });

  app.del (
    '/nodes/:id',
    function(req, res) {

      if(!api.get(req.params.id)){
        return res.send(404);
      }

      api.remove(req.params.id, function(){
        res.send(204);
      });

    });

  // Set attributes on a node
  app.post (
    '/nodes/:id',
    function(req, res) {
      if(!api.get(req.params.id)){
        return res.send(404);
      }

      var attributes = req.body;
      
      api.set(
        req.params.id, 
        attributes, 
        function(){
          res.send(204);
      });      

    });

  // Inject a message to a node
  app.post (
    '/nodes/:id/message',
    function(req, res) {

      if(!api.get(req.params.id)){
        return res.send(404);
      }

      var message = req.body;

      api.inject(
        req.params.id, 
        message,
        function(){
          res.send(204);
        });
    }); 

};
