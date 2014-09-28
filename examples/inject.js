"use strict";

var config = require('../config.js');
var Lancaster = require('../index.js');
var api = Lancaster.api(config);

var t = new Date().getTime();

var inject =  function() {

  var tt = new Date().getTime() - t;
  var msg = {
    value: Math.floor(tt / 100)
  };

  api.inject('my-node', msg, function(){
    console.log(msg);
  });

};

setInterval(inject, 100);
