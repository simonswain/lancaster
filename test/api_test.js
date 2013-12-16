"use strict";

var config = require('../config.js');

var async = require('async');

var http = require('nodeunit-httpclient').create({
  port: config.port,
  path: '/',
  status: 200
});

var Lancaster = require('../lib/lancaster.js');

exports['api'] = {

  'default': function(test) {

    // stub test to copy and change
    var server = new Lancaster(config);

    server.on('stop', function(){
      test.done();
    });

    server.on('start', function(){
      server.reset(function(){
        server.stop();
      });
    });
    
    server.start();
  },

};
