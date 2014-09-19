# Lancaster

Version 0.0.4

[![Build Status](https://travis-ci.org/simonswain/lancaster.png)](https://travis-ci.org/simonswain/lancaster)

Lancaster is a dynamic reactive dataflow system

You use Lancaster to construct topologies of connected processing
nodes that consume and emit arbitrary JSON messages.

A worker process manages message processing.

Clients can access Lancaster either via a Javascript object (direct
api access) or via a REST/Websocket application server.


```javascript
// example message
{at: 1386197370482, value: 100.00}
```

Running the Lancaster server provides you with an empty topology.

You create nodes in the Lancaster topology, optionally defining a
processing function, and which other nodes it receives messages from.

Any node in the toplogy can have a message injected in to it from
outside the topology.

Each node has a procssing function that is applied to messages is
receives. The default function is a passthru that outputs the same
message it receives.

Nodes can have attributes set on them that can be changed at any time,
and can be used or changed by the node's function.

A predefined set of functions is available. User defined functions can
be provided to the topology as part of it's configuraion.

A node can have any number of source nodes, allowing you to create
signal processing and switching chains, and to combine multiple inputs
in to a single output stream.

The topology can be managed via a javascript interface, REST or Websockets.

Results can be streamed out in real time via a javascript event
emitter or Websockets.

## Quickstart

Lancaster comes bundled with a runner that starts up a server and a
worker. This is the easiest way to get going quickly.

```bash
sudo apt-get install redis-server
git clone https://github.com/simonswain/lancaster.git
cd lancaster
npm install
cp config.sample.js config.js
node run
```

Now surf to `http://localhost:4002` to see the REST server:

```javascript
{"lancaster":{"prefix":"df","env":"development","redis":{"host":"127.0.0.1","port":6379},"server":{"host":"127.0.0.1","port":4002}}}
```

You can use the `curl` examples at the bottom of this README to try it out. 


## Installing

Lancaster requires Redis.

```bash
sudo apt-get install redis-server
```

### Javascript API

To use Lancaster as a module in your own code, install via NPM.

```bash
npm install lancaster
```

```javascript
var Lancaster = require('lancaster');

// you can pass configuration options in here. If none are given,
// defaults will be used

var api = Lancaster.api();

// use the Topology

api.quit();
```

### REST/Websockets Server

To run the Lancaster webserver, follow the example in `server.js`. You
will probably still want to install Lancaster as a module, and manage
the server using the provided api.

```javascript
var Lancaster = require('lancaster');
var server = Lancaster.server();
server.start(function(){
  console.log( 'Lancaster Server Running...' );
});
```

A sample config file is provided in `config.sample.js`. Pass this file
in when you instantiate the api or server. The config object is the
same in both cases. The api only uses the `redis` and `prefix`
options.

The server needs all the options shown in the sample.

The `development` values shown in the sample are the same as the
defaults used if no config is provided.

Normally you'll create your own `config.js` based on the sample.

```javascript
var Lancaster = require('lancaster');
var config = { ... my config options ... };
var api = Lancaster.api(config);
// ...
```

The `server` object provides and api, and a REST server is started for
http access.


## Worker

The api and server as passive -- they modify the topology and
inject/receive messages.

The Worker is a long-running process that does the actual work of
moving messages around and running the nodes.

An example worker runner is in 'worker.js`. Most likely you will want
to implement a version of this in your own project so you have proper
control over the worker lifecycle.

```javascript
var Lancaster = require('lancaster');
var worker = Lancaster.worker();
worker.start(function(){
  console.log('Lancaster Worker running...');
});
```

Currently Lancaster only safely supports one singleton worker. If you
are happy your messages can be processed in parallel without causing
issues, there is nothing stopping you running more than one, and this
is a good way to scale up. If you are doing tasks like working out
averages or counting things, then parallel workers are probably not a
good idea.


## Nodes

a `node` has a structure like this:

```javascript
{
  id: 'my-node-id',
  sources: [],
  fn: 'my-fn'
  attrs: {}
}
```

`id` is arbitrary. You provide an ID when creating the node. Best to
stick to a short (say , up to 32 characters) alphanumeric string.

`sources` is an array of other node id's that this node will receive
messages from.

`fn` is the processing function applied to messages the node receives.
The output of this function is latched to the node's output (it
remains there available for reading until the next output is created)
and is injected in to any listening nodes.

`attrs` is an object for holding state. When the node is created, you
can provide seed attrs to override defaults provided by the nodes's
`fn`. `attrs` can be read and mutated by the node's `fn`. These attrs
are persisted after the function application is completed on each
message, so can be used to calculate running totals or store data
across multiple messages.



## Fns

The default set of fns is in `lib/fns.js`. It is expected you will
create your own set appropriate to your use-case and pass these in
when creating your topology

```javascript
var myFns = require('./path-to/my-fins.js');
var api = Lancaster.api({fns: myFns});
```

A `fn` has a signature like this:

```javascript
fns.count = {
  attrs: {
    total: 0
  },
  init: function(done){
    done();
  },
  process: function(attrs, message, done){
    attrs.total ++;
    done(null, attrs, {total:attrs.total});
  }
};
```

`attrs` are the default attrs for each node that uses the fn. When the
node is added, and `attrs` provided replace the defaults in the fn.

`init()` is called once when the node is created.

`process()` is passed each incoming message. messages are processed
sequentially - each message will be fully processed before the next is
started. The `attrs` passed in the process is the current state of the
function. Your process function can modify these. When `done` is
called, Lancaster will persist the changed attrs to storage.

When you have finished processing, call `done()` with an Error (if
any, or null), the attrs (which you may or may not have changed) and
the message to output, or if there is no message to output `undefined`
(i.e. leave blank).


```
## Hacking

Clone the repo

```bash
git clone https://github.com/simonswain/lancaster.git
cd lancaster
npm install
cp config.sample.js config.js
```

If you want to read the code, start with `lib/index.js` - this is the
main entry point. It is loaded (via the top level `index.js`) when you
`require('lancaster')`.

## Tests and Contributing

Ensure you have `grunt-cli` installed

```bash
npm install grunt-cli -g
```

Run lint and tests

```bash
git clone https://github.com/simonswain/lancaster.git
cd lancaster
npm install
cd lancaster

grunt
```

If you want to submit a pull request, please ensure it passes linting
and tests first, and follows the existing coding style. Thanks!

## Topology methods

```
var Lancaster = require('lancaster');
var api = Lancaster.server();
```

All api methods require a callback handler as their last argument.
This handler will be passed an error and (if appropriate) a value.

### `api.quit(done)`

Close the api client (disconnect from Redis) ready to exit.

### `api.reset(done)`

Destroy everything in the topology

### `api.add(node, done)`

Add a node to the topology.

Will callback with an error if the provided id already exists.

### `api.get(id, done)`

Get a JSON representation of a given node.

### `api.all(done)`

Get all nodes in the topology

### `api.del(id, done)`

Delete a given node

### `api.inject(id, data, done)`

Inject a message to a given node. The messages is placed on the end of
the inbound message queue, and will be processed by the worker when
all messages in front of it have been processed.

### `api.extract(done)`

Take a message off the front of the message queue. Internally this is
used by the worker to get the next message to be processed. You
probably don't need to use this method.

### `api.attrs(id, [attrs,] done)`

Convenience method to get attrs (`attrs('my-node-id')`) or set attrs
(`attrs('my-node-id', {foo: 'bar'})`). Setting attrs completely
replaces any existing attrs for the node.

### `api.setAttrs(id, attrs, done)`

Replace the `attrs` on a given node

### `api.getAttrs(id, done)`

Get the `attrs` object from a given node


### `api.delAttrs(id, done)`

Delete the attrs for a given node. Used internally when deleting a
node. You probably don't want to use this.

### `api.addSource(id, source_id, done)`

Make a given node listen to another node. `id` will receive all
messages output by `source_id`.

### `api.delSource(id, source_id, done)`

Disconnect `id` from listening to `source_id`

### `api.getSources(id, done)`

Get all the nodes that `id` is listening to.

### `api.setSources(id, sources, done)`

Replace any existing sources `id` has with the provided source ids.

### `api.delSources(id, done) `

Disconnect `id` from all nodes it's listening to.

### `api.getTargets(id, done)`

Get the nodes that are listening to `id`

### `api.setData(id, data, done)`

Latch a message to the output of a node (does not distribute the
message). Used internally by worker. You probably don't want to use
this method.

### `api.getData(id, done)`

The the last message (if any) output by `id`. Then the node's `fn` is
applied to a message, the output of that fn will be latched and
available using `getData`.


## Server REST methods

### `GET /`

Get server config

```
{"lancaster":{"prefix":"df","env":"development","redis":{"host":"127.0.0.1","port":6379},"server":{"host":"127.0.0.1","port":4002}}}
```

### `GET /status`

Get server status

```
{"status":"ok"}
```


### `GET /ping`

Ping test to check server is up

```
{pong: <unix-epoch-ms>}
```


### `POST /reset`

Restore the topology to a pristine state (no nodes)


### `GET /nodes`

Get all nodes in the Topology

```
'id': {node}, ...}
```


### `GET /nodes/:id`

Get a specific node

```
{node}
```


### `POST /nodes`

Add a node to topology

```
{
  id: 'xxx',
  fn:'fn-slug',
  sources: [id, id, id]
  '<attr>': <value>',
  '<attr>': <value>',
  ...
}
```

The `id, `fn` and `sources` keys are reserved. Any other keys can be
used for attrs. Attrs will be used by the fn to control it's
operation.


### `POST /nodes/:id`

Change attrs on a node. Cannot change `id`, `sources` or `fn`

```
{
  '<attr>': <value>',
  '<attr>': <value>',
  ...
}
```

### `POST /nodes/:id/message`

Inject a message in to a node

```
{message}
```

### `DELETE /nodes/:id`

Delete a specific node



### `GET /nodes/:id/message`

Get message latched on node's output

```
{message}
```



## curl examples

follow the quickstart example at the top of the README

```bash
~/lancaster$ node run
```

Check we are running

```bash
curl -i -X GET http://localhost:4002
```

```javascript
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 132
cache-control: no-cache
accept-ranges: bytes
Date: Fri, 19 Sep 2014 05:09:15 GMT
Connection: keep-alive

{"lancaster":{"prefix":"df","env":"development","redis":{"host":"127.0.0.1","port":6379},"server":{"host":"127.0.0.1","port":4002}}}
```


Status

```
curl -i -X GET http://localhost:4002/status
```
```
{"status":"ok"}
```


Ping

```
curl -i -X GET http://localhost:4002/ping
```
```
{"pong": 1386800817607}
```


Reset the topology (delete everything)

```
curl -i -X POST http://localhost:4002/reset
```


See we have no nodes

```
curl -i -X GET http://localhost:4002/nodes
```

```
{}
```

Try to get a node that doesn't exist

```
curl -i -X GET http://localhost:4002/nodes/unknown-node

HTTP/1.1 404 Not Found
```

Create a node

```
curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes -d '{"id":"my-node", "fn":"multiply","factor":10}'
```

Get it

```
curl -i -X GET http://localhost:4002/nodes/my-node
```
```
{
  "my-node": {
    "fn": "multiply",
    "id": "my-node",
    "attrs": {
      "factor": "10"
    },
    "sources": [],
    "data": null
  }
}
```


Create another node, using the same fn with different attrs, and listen to the first one:

```
curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes -d '{"id":"other-node", "fn":"multiply","factor":2, "sources":["my-node"]}'
```


Get all our nodes. They are returned as an object keyed by id.

These nodes have null data because they have not processed any messages yet.

```
curl -i -X GET http://localhost:4002/nodes
```

```javascript
{
  "my-node": {
    "id": "my-node",
    "attrs": {
      "factor": 10
    },
    "fn": "multiply",
    "sources": [
      "my-node"
    ],
    "data": null
  },
  "other-node": {
    "id": "other-node",
    "attrs": {
      "factor": 2
    },
    "fn": "multiply",
    "sources": [
      "my-node"
    ],
    "data": null
  }
}
```

Inject a message to `my-node`. Since the worker is running, it will be processed immediately.

```
curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes/my-node/message -d '{"value":100}'
```

See how it gets processed by inspecting the data (latched outputs) of each node. The data field will contain the most recent message output by the node.

```
curl -i -X GET http://localhost:4002/nodes
```

```
{
  "my-node": {
    "id": "my-node",
    "attrs": {
      "factor": 10
    },
    "fn": "multiply",
    "sources": [
      "my-node"
    ],
    "data": {
      "value": 1000
    },
  },
  "other-node": {
    "id": "other-node",
    "attrs": {
      "factor": 2
    },
    "fn": "multiply",
    "sources": [
      "my-node"
    ],
    "data": {
      "value": 2000
    },
  }
}
```


## Release History

* 23/11/2013 0.0.1 Initial release

## License
Copyright (c) 2014 Simon Swain
Licensed under the MIT license.
