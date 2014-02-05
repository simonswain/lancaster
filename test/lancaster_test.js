"use strict";

var async = require('async');

var Lancaster = require('../index.js');
var config = require('./config.js');

var topo;

exports['lancaster'] = {
  'exports': function(test) {
    test.expect(4);
    test.equal(typeof Lancaster, 'object');
    test.equal(typeof Lancaster.Topology, 'function');
    test.equal(typeof Lancaster.Worker, 'function');
    test.equal(typeof Lancaster.Client, 'function');
    //test.equal(typeof Lancaster.Server, 'function');
    test.done();
  }

};
