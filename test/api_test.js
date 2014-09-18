"use strict";

var async = require('async');
var api = require('../lib').api();

var myNode, myData, myId;

exports.api = {
  'reset': function(test) {
    api.reset(function() {
      test.done();
    });
  },
  'nodes-none': function(test) {
    test.expect(1);
    api.all(
      function(err, nodes){
        test.deepEqual(nodes, {});
        test.done();
      });
  },
  'get-none': function(test) {
    test.expect(1);
    api.get(
      'foo', 
      function(err, node){
        test.equal(node, null);
        test.done();
      });
  },

  'add': function(test) {
    myNode = {
      'id': 'test'
    };
    api.add(myNode, function(){
      test.done();
    });
  },

  'get': function(test) {
    test.expect(1);
    api.get(
      'test', 
      function(err, node){
        test.equal(node.id, myNode.id);
        test.done();
      });
  },

  'add-dup': function(test) {
    test.expect(1);
    myNode = {
      'id': 'test'
    };
    api.add(myNode, function(err){
      test.ok(err);
      test.done();
    });
  },

  'nodes-all': function(test) {
    test.expect(2);
    api.all(
      function(err, nodes){
        test.equal(typeof nodes.test, 'object');
        test.equal(nodes.test.id, myNode.id);
        test.done();
      });
  },

  'delete': function(test) {
    test.expect(1);
    api.del(
      'test', 
      function(){
        api.get(
          'test', 
          function(err, node){
            test.equal(node, null);
            test.done();
          });
      });
  },

  'add-attrs': function(test) {
    test.expect(2);
    myNode = {
      'id': 'test-attrs',
      'attrs': {foo: 'bar'}
    };
    api.add(myNode, function(){
      api.get('test-attrs', function(err, node){
        test.equals(node.id, myNode.id);
        test.deepEqual(node.attrs, myNode.attrs);
        test.done();
      });

    });
  },


  'attrs': function(test) {
    test.expect(2);
    myNode = {
      'id': 'test-attrs',
      'attrs': {foo: 'baz'}
    };
    api.attrs(
      myNode.id, 
      myNode.attrs,
      function(){
        api.get(
          myNode.id, 
          function(err, node){
            test.equals(node.id, myNode.id);
            test.deepEqual(node.attrs, myNode.attrs);
            test.done();
          });
        
      });
  },

  'attrs-get': function(test) {
    test.expect(1);
    api.attrs(
      myNode.id, 
      function(err, attrs){
        test.deepEqual(attrs, myNode.attrs);
        test.done();
      });
  },


  'set-attrs-get-attrs': function(test) {
    test.expect(1);
    myNode = {
      'id': 'test-attrs',
      'attrs': {foo: 'qux'}
    };
    api.setAttrs(
      myNode.id, 
      myNode.attrs,
      function(){
        api.getAttrs(
          myNode.id, 
          function(err, attrs){
            test.deepEqual(attrs, myNode.attrs);
            test.done();
          });
        
      });
  },

  'del-attrs': function(test) {
    test.expect(1);
    api.delAttrs(
      myNode.id, 
      function(){
        api.getAttrs(
          myNode.id, 
          function(err, attrs){
            test.deepEqual(attrs, {});
            test.done();
          });
        
      });
  },

  'set-with-sources': function(test) {
    test.expect(3);
    myNode = {
      'id': 'test-sources',
      'sources': ['input', 'another']
    };

    api.add(
      myNode,
      function(){
        api.get(
          myNode.id, 
          function(err, node){
            test.equals(node.id, myNode.id);
            test.ok(node.sources.indexOf(myNode.sources[0]) > -1);
            test.ok(node.sources.indexOf(myNode.sources[1]) > -1);

            test.done();
          });
        
      });
  },

  'add-source': function(test) {
    test.expect(1);
    api.addSource(
      myNode.id,
      'robots',
      function(){
        api.getSources(
          myNode.id, 
          function(err, sources){
            test.ok(sources.indexOf('robots') > -1);
            test.done();
          });
        
      });
  },

  'get-sources': function(test) {
    test.expect(2);
    api.getSources(
      myNode,
      function(){
        api.getSources(
          myNode.id, 
          function(err, sources){
            test.ok(sources.indexOf(myNode.sources[0]) > -1);
            test.ok(sources.indexOf(myNode.sources[1]) > -1);
            test.done();
          });
        
      });
  },

  'get-targets': function(test) {
    test.expect(1);
    api.addSource(
      'test-attrs',
      'test-source',
      function(){
        api.getTargets(
          'test-source', 
          function(err, targets){
            test.equals(targets[0], 'test-attrs');
            test.done();
          });
        
      });
  }, 

  'del-source': function(test) {
    test.expect(1);
    api.delSource(
      myNode.id,
      myNode.sources[0],
      function(){
        api.getSources(
          myNode.id, 
          function(err, sources){
            test.ok(sources.indexOf(myNode.sources[0]) === -1);
            test.done();
          });
        
      });
  },


  'del-sources': function(test) {
    test.expect(1);
    api.delSources(
      myNode.id,
      function(){
        api.getSources(
          myNode.id, 
          function(err, sources){
            test.equals(sources.length, 0);
            test.done();
          });
        
      });
  },



  'set-data-get-data': function(test) {
    test.expect(1);

    var myData = {foo: 'bar'};

    api.setData(
      myNode.id,
      myData,
      function(){
        api.getData(
          myNode.id, 
          function(err, data){
            test.deepEqual(data, myData);
            test.done();
          });
        
      });
  },

  'inject': function(test){
    test.expect(1);

    myData = {value: 1000.00};
    myId = 'test-id';

    api.inject(
      myId,
      myData,
      function(err){
        test.equals(err, null);
        test.done();
      }
    );

  },

  'extract': function(test){
    test.expect(3);
    api.extract(
      function(err, id, data){
        test.equals(err, null);
        test.equals(id, myId);
        test.deepEqual(data, myData);
        test.done();
      }
    );

  },

  'purge': function(test){
    test.expect(3);

    api.inject(
      myId,
      myData,
      function(err){

        api.purge(
          function(err){

            api.extract(
              function(err, id, data){
                test.equals(err, null);
                test.equals(id, null);
                test.equals(data, null);
                test.done();
              });
          });
      });

  },

  'reset-final': function(test) {
    api.reset(
      function(){
        test.done();
      });
  },

  'reset-clean?': function(test) {
    test.expect(1);
    api.all(
      function(err, nodes){
        test.deepEqual(nodes, {});
        test.done();
      });
  },

  'quit': function(test) {
    api.quit(function() {
      test.done();
    });
  }

};
