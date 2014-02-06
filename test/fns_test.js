"use strict";

var async = require('async');
var _ = require('underscore');

var fns = require('../lib/fns.js')

var myAttrs, myMessage

exports['fns'] = {

  'thru': function(test){
    test.expect(2);

    myAttrs = {};
    myMessage = {
      foo: 'bar'
    };

    fns.thru.process(
      myAttrs,
      myMessage,
      function(err, attrs, message){
        test.deepEqual(attrs, myAttrs);
        test.deepEqual(message, myMessage);
        test.done();
      });
    
  },

  'count': function(test){
    test.expect(2);

    myAttrs = _.clone(fns.count.attrs);

    myMessage = {
      foo: 'bar'
    };

    fns.count.process(
      myAttrs,
      myMessage,
      function(err, attrs, message){
        test.equal(attrs.total, 1);
        test.equal(message.total, 1);
        test.done();
      });
    
  }

};
