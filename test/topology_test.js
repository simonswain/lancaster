"use strict";

var Lancaster = require('../index.js');
var config = require('./config.js');

var async = require('async');

var topo, myNode, myData, myId;

exports['topology'] = {

  'create': function(test) {
    topo = new Lancaster.Topology(
      config,
      function(){
        test.done();
      });
  },

  'reset': function(test) {
    topo.reset(
      function(){
        test.done();
      });
  },

  'nodes-none': function(test) {
    test.expect(1);
    topo.all(
      function(err, nodes){
        test.deepEqual(nodes, {});
        test.done();
      });
  },
  
  'get-none': function(test) {
    test.expect(1);
    topo.get(
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
    topo.add(myNode, function(){
      test.done();
    });
  },

  'get': function(test) {
    test.expect(1);
    topo.get(
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
    topo.add(myNode, function(err){
      test.ok(err);
      test.done();
    });
  },

  'nodes-all': function(test) {
    test.expect(2);
    topo.all(
      function(err, nodes){
        test.equal(typeof nodes.test, 'object');
        test.equal(nodes.test.id, myNode.id);
        test.done();
      });
  },

  'delete': function(test) {
    test.expect(1);
    topo.del(
      'test', 
      function(){
        topo.get(
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
    topo.add(myNode, function(){
      topo.get('test-attrs', function(err, node){
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
    topo.attrs(
      myNode.id, 
      myNode.attrs,
      function(){
        topo.get(
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
    topo.attrs(
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
    topo.setAttrs(
      myNode.id, 
      myNode.attrs,
      function(){
        topo.getAttrs(
          myNode.id, 
          function(err, attrs){
            test.deepEqual(attrs, myNode.attrs);
            test.done();
          });
        
      });
  },

  'del-attrs': function(test) {
    test.expect(1);
    topo.delAttrs(
      myNode.id, 
      function(){
        topo.getAttrs(
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

    topo.add(
      myNode,
      function(){
        topo.get(
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
    topo.addSource(
      myNode.id,
      'robots',
      function(){
        topo.getSources(
          myNode.id, 
          function(err, sources){
            test.ok(sources.indexOf('robots') > -1);
            test.done();
          });
        
      });
  },

  'get-sources': function(test) {
    test.expect(2);
    topo.getSources(
      myNode,
      function(){
        topo.getSources(
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
    topo.addSource(
      'test-attrs',
      'test-source',
      function(){
        topo.getTargets(
          'test-source', 
          function(err, targets){
            test.equals(targets[0], 'test-attrs');
            test.done();
          });
        
      });
  }, 

  'del-source': function(test) {
    test.expect(1);
    topo.delSource(
      myNode.id,
      myNode.sources[0],
      function(){
        topo.getSources(
          myNode.id, 
          function(err, sources){
            test.ok(sources.indexOf(myNode.sources[0]) === -1);
            test.done();
          });
        
      });
  },


  'del-sources': function(test) {
    test.expect(1);
    topo.delSources(
      myNode.id,
      function(){
        topo.getSources(
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

    topo.setData(
      myNode.id,
      myData,
      function(){
        topo.getData(
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

    topo.inject(
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
    topo.extract(
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

    topo.inject(
      myId,
      myData,
      function(err){

        topo.purge(
          function(err){

            topo.extract(
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

    topo.reset(
      function(){
        test.done();
      });

  },

  'reset-clean?': function(test) {
    test.expect(1);
    topo.all(
      function(err, nodes){
        test.deepEqual(nodes, {});
        test.done();
      });
  },


  'quit': function(test) {
    topo.quit(
      function(){
        test.done();
      });
  }


};
