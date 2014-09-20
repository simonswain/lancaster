// "use strict";

// var config = require('../config.sample.js');

// var Lancaster = require('../index.js');

// var myNode, myData;

// var http = require('nodeunit-httpclient')
//   .create({
//     host: config.server.host,
//     port: config.server.port,
//     path: '/',
//     status: 200
//   });

// var Ws = require('ws');

// var api, worker, server, ws;

// exports.ws = {

//   'new-api': function(test) {
//     api =  Lancaster.api(config);
//     test.done();
//   },

//   'new-worker': function(test) {
//     worker =  Lancaster.worker(config);
//     test.done();
//   },

//   'new-server': function(test) {
//     server =  Lancaster.server(config);
//     test.done();
//   },

//   'start-server': function(test) {
//     server.start(function(){
//       test.done();
//     });
//   },

//   'reset': function(test) {
//     test.expect(1);
//     http.post(
//       test,
//       'reset',
//       function(res) {
//         test.done();
//       });
//   },

//   'ws-client': function(test) {
//     ws = new Ws('ws://' + config.server.host + ':' + config.server.port);
//     test.done();
//   },

//   'create-my-node': function(test) {
//     test.expect(1);
//     myNode = {
//       "id":"my-node", 
//       "fn":"multiply",
//       "attrs":{
//         "factor":10
//       }
//     };

//     http.post(
//       test,
//       'nodes', {
//         data: myNode
//       }, {
//         status: 200
//       }, function(res) {
//         test.done();
//       });
//   },

//   'set-attrs': function(test) {
//     var data = [
//       'setAttrs',
//       myNode.id,
//       {'my-value': 500}
//     ];  
//     var s = JSON.stringify(data);
//     ws.send(s, function(){
//       test.done();
//     });
//   },

//   'set-attrs-test': function(test) {
//     http.get(
//       test,
//       'nodes/my-node',
//       function(res) {
//         test.equal(typeof res.data, 'object'); 
//         test.equal(res.data.attrs['my-value'], 500);
//         test.done();
//       });
//   },

//   'inject': function(test){
//     myData = {value: 1000.00};
//     api.inject(
//       myNode.id,
//       myData,
//       function(err){
//         test.done();
//       }
//     );
//   },

//   'api-tick': function(test) { 
//     // receive outputs over websockets
//     var myWs = new Ws('ws://' + config.server.host + ':' + config.server.port);
//     var handler = function(x){
//       x = JSON.parse(x);
//       var method = x[0];
//       var id = x[1];
//       var args = x[2];
//       test.equals(method, 'setData');
//       test.equals(id, myNode.id);
//       // check result from node fn
//       test.equals(args.value, myData.value * myNode.attrs.factor);
//       myWs.terminate();
//       test.done();
//     };
//     myWs.on('message', handler);
//     api.tick(
//       function(err, id, output){
//       });
//   }, 

//   'quit-ws': function(test) {
//     ws.terminate();
//     test.done();
//   },

//   'quit-server': function(test) {
//     server.stop(function(){
//       test.done();
//     });
//   },

//   'quit-worker': function(test) {
//     worker.quit(function(){
//       test.done();
//     });
//   },

//   'quit-api': function(test) {
//     api.quit(function(){
//       test.done();
//     });
//   }

// };
