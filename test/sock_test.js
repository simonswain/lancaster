// "use strict";

// var config = require('../config.js');

// var async = require('async');
// var sockjs = require('sockjs-client');


// var Lancaster = require('../lib/lancaster.js');

// exports['sock'] = {

//   'stream': function(test) {
//     //test.expect(5);

//     var client;

//     var server = new Lancaster(config);

//     server.on('stop', function(){
//       test.done();
//     });

//     server.on('message', function(msg){
//       //console.log('API GOT', msg);
//     });

//     server.on('start', function(){

//       var connect = function(next){
//         client = sockjs.create("http://127.0.0.1:4042/stream");

//         client.on('error', function (err) { 
//           console.log('ERR', err);
//         });

//         client.on('data', function (msg) {
//           msg = JSON.parse(msg);
//           //console.log('CLIENT GOT', msg);
//           client.close();
//           server.stop();
//         });
        
//         client.on('connection', function () {
//           //console.log('Connected');
//           next();
//         });

//       };

//       var myMessage = {value: 1000.00};

//       async.series([
//         server.reset,
//         connect,
//         function(next){
//           server.add({
//             'id': 'counter', 
//             'fn': 'thru'
//           }, next);
//         },
//         function(next){
//           server.inject('counter', myMessage, next);
//         }
//       ]);

//     });
    
//     server.start();
    
//   }

// };
