"use strict";

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: '<json:package.json>',
    nodeunit: {
      files: [
        'test/**/*.js'
      ]
    },
    jshint: {
      files: [
        'Gruntfile.js',
        'config.sample.js',
        'index.js',
        'lib/*.js',
        'lib/server/public/js/**/*.js',
        'test/**/*.js'
      ],
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true
      }
    },
    env : {
      test : {
        NODE_ENV : 'test'
      },
      dev : {
        NODE_ENV : 'dev'
      },
      live : {
        NODE_ENV : 'live'
      }
    },
    docco: {
      debug: {
        src: ['lib/**/*.js'],
        options: {
          output: 'docs/'
        }
      }
    }
  });

  grunt.loadTasks('tasks');

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-docco2');

  grunt.registerTask('test', ['jshint', 'env:test', 'nodeunit:files']);

  grunt.registerTask('default', ['test']);

};
