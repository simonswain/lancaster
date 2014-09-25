"use strict";

module.exports = function (grunt) {
  grunt.registerMultiTask(
    'env',
    'Specify an ENV configuration for future tasks in the chain',
    function() {
      grunt.util._.extend(process.env, this.options(), this.data);
    });
};
