"use strict";

var config = require('../config.js');

var async = require('async');

var http = require('nodeunit-httpclient').create({
  port: config.port,
  path: '/',
  status: 200
});

var lancaster = require('../lib/lancaster.js');

exports['fns'] = {

  // 'count': function(test) {
  //   //test.expect(5);
  //   lancaster(config, function(server){
  //     server.reset(function(){

  //       http.post(
  //         test, 
  //         'nodes', 
  //         {data:{
  //           'id': 'counter', 
  //           'fn': 'count'
  //         }},
  //         {status: 204}, 
  //         function(res) {
  //           var myMessage = {value: 1000.00};

  //           http.post(
  //             test, 
  //             'nodes/counter/message', 
  //             {data: myMessage},
  //             {status: 204}, 
  //             function(res) {
  //               // get latched message
  //               http.get(
  //                 test, 
  //                 'nodes/counter', 
  //                 function(res) {
  //                   test.equal(typeof res.data, 'object');
  //                   // should have latched most recent processed
  //                   // message
  //                   console.log(':::', res.data)
  //                   test.deepEqual(res.data.message, {count:1});
  //                   server.reset(function(){
  //                     server.stop(function(){
  //                       test.done();
  //                     });
  //                   });
  //                 });
                
  //             });
  //         });
  //     });      
  //   });
  // },
  // two counts running in parallel
  'count-two': function(test) {
    //test.expect(5);
    lancaster(config, function(server){
      server.reset(function(){

        var add = function(node, done){
          http.post(
            test, 
            'nodes', 
            {data:{
              'id': node.id, 
              'fn': node.fn,
              'sources': node.sources
            }},
            {status: 204}, 
            function(){
              done();
            }
          );
        };

        var adds = function(done){
          async.eachSeries([
            {
              id:'count-1', 
              fn:'count'
            },
            {
              id:'count-2', 
              fn:'count'
            }, {
              id:'sum', 
              fn:'count',
              sources: ['count-1','count-2']
            }], add, done);
        };


        var inject = function(x, done){
          http.post(
            test, 
            'nodes/' + x.id + '/message', 
            {data: x.msg},
            {status: 204}, 
            function(res) {
              done();
            });
        };

        var injects = function(done){
          async.eachSeries(
            [{
              id: 'count-1',
              msg: {value:100}
            }, {
              id: 'count-1',
              msg: {value:101}
            }, {
              id: 'count-1',
              msg: {value:102}
            }],
            inject,
            done);
        };

        async.series([
          adds,
          injects
        ], function(){
          console.log(server.api.inspect());
          server.stop(function(){
            test.done();
          });
        })

        // http.post(
        //   test, 
        //   'nodes/counter/message', 
        //   {data: myMessage},
        //   {status: 204}, 
        //   function(res) {
        //     // get latched message
        //     http.get(
        //       test, 
        //       'nodes/counter', 
        //       function(res) {
        //         test.equal(typeof res.data, 'object');
        //         // should have latched most recent processed
        //         // message
        //         console.log(':::', res.data)
        //         test.deepEqual(res.data.message, {count:1});
        //         server.reset(function(){
        //           server.stop(function(){
        //             test.done();
        //           });
        //         });
        //       });
            
        //   });

      });      
    });
  },

};
