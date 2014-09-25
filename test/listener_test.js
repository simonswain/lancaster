"use strict";

var config = require('../config.sample.js')(process.env.NODE_ENV);
var Lancaster = require('../index.js');

var myNode, myData;
var api;

exports.listener = {

  'new-api': function(test) {
    api = Lancaster.api(config);
    test.done();
  },

  'reset': function(test) {
    api.reset(function() {
      test.done();
    });
  },

  'add-node': function(test) {
    myNode = {
      id: 'test',
      fn: 'thru'
    };
    api.add(myNode, function(){
      test.done();
    });
  },


  'inject': function(test){
    myData = {value: 1000.00};
    api.inject(
      myNode.id,
      myData,
      function(err){
        test.done();
      }
    );
  },

  'api-tick': function(test) {
    var listener;
    test.expect(3);
    var handle = function(method, id, args){
      test.equals(method, 'setData');
      test.equals(id, myNode.id);
      test.deepEqual(args, myData);
    };
    listener = api.listener(handle);
    api.tick(
      function(err, id, output){
        listener.quit();
        test.done();
      });
  }, 

  'quit-api': function(test) {
    api.quit(function(){
      test.done();
    });
  }

};
