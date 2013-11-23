"use strict";

var Landcaster = require('../lib/landcaster.js');

exports['landcaster'] = {
  'exports': function(test) {
    test.expect(1);
    test.equal( typeof Landcaster, 'function', 'should be a function');
    test.done();
  }
};
