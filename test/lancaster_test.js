"use strict";

var Lancaster = require('../lib/lancaster.js');

exports['lancaster'] = {
  'exports': function(test) {
    test.expect(1);
    test.equal( typeof Lancaster, 'function', 'should be a function');
    test.done();
  }
};
