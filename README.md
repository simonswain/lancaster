# Lancaster

Version 0.0.3

[![Build Status](https://travis-ci.org/simonswain/lancaster.png)](https://travis-ci.org/simonswain/lancaster)

Lancaster provides a REST based application server that lets you
configure processing topologies you inject data into and recieve
results from.

```javascript
// example message
{at: 1386197370482, value: 100.00}
```

Running the Lancaster server provides you with an empty topology.

You create nodes in the Lancaster topology. 

Any node in the toplogy can have a message injected in to it.

Each node has a procssing function that is applied to messages is
receives. The default function is a passthru that outputs the same
message it receives.

Nodes can have attributes set on them that can be changed at any time,
and can be used or changed by the node's function.

A predefined set of functions is available. User defined functions can
be provided to the topology as part of it's configuraion.

A node can have any number of source nodes, allowing you to create
signal processing and switching chains, and combine multiple inputs in
to a single output stream.

The topology can be managed via Node.js or a REST API.

Results can be streamed out in real time via a Node.js event emitter
or over http via sock.js.


## Installing

Landcaster requires Redis.

```bash
npm install lancaster
```

Either clone the repo, edit config.js and use `node server.js` or

```
var Lancaster = require('lancaster');
var config = require('config.js');
var server = new Lancaster(config);
server.start();
server.on('start', function(){
  // do stuff
});

```

The `server` object provides and api, and a REST server is started for
http access.

```bash
git clone https://github.com/simonswain/lancaster.git
cd lancaster
npm install
cp config.sample.js config.js
node server
```

## Topology methods

quit  (done)

reset (done)

setAttrs (id, attrs, done)

getAttrs (id, done)

attrs (id, attrs, done)

delAttrs (id, done)

addSource (id, source_id, done)

delSource (id, source_id, done)

getSources (id, done)

delSources (id, done) 

getTargets (id, done)

setData (id, data, done)

getData (id, done)

setSources (id, sources, done)

get (id, done)

all (done)

add (node, done)

del (id, done)

inject (id, data, done)

extract (done)



## Server REST methods


Get server config
```
GET /

{"lancaster":{"env":"dev","redis":{"host":"127.0.0.1","port":6379,"prefix":"lancaster_dev"},"host":"0.0.0.0","port":4002}}
```

Get server status
```
GET /

{"status":"ok"}
```


Ping test to check server is up

```
GET /ping

{pong: <unix-epoch-ms>}
```

Restore the topology to a pristine state (no nodes)
```
POST /reset
```


Get all nodes in the Topology
```
GET /nodes

{'id': {node}, ...}
```


Get a specific node
```
GET /nodes/:id

{node}
```


Add a node to topology
```
POST /nodes

{
  id: 'xxx',
  fn:'fn-slug',
  sources[id, id, id]
  '<attr>': <value>',
  '<attr>': <value>',
  ...
}
```

The `id, `fn` and `sources` keys are reserved. Any other keys can be
used for attrs. Attrs will be used by the fn to control it's
operation.


Change attrs on a node. Cannot change `id`, `sources` or `fn`
```
POST /nodes/:id

{
  '<attr>': <value>',
  '<attr>': <value>',
  ...
}
```

Inject a message in to a node
```
POST /nodes/:id/message

{message}
```

Delete a specific node
```
DELETE /nodes/:id
```


Inject a message in to a node
```
GET /nodes/:id/message

{message}
```

## curl examples

```bash
./lancaster start

curl -i -X GET http://localhost:4002/ping

{
  "pong": 1386800817607
}

curl -i -X GET http://localhost:4002/nodes

{}


curl -i -X GET http://localhost:4002/nodes/unknown-node

HTTP/1.1 404 Not Found

curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes/ -d '{"id":"my-node", "fn":"multiply","factor":10}'

curl -i -X GET http://localhost:4002/nodes/my-node

{
  "my-node": {
    "id": "my-node",
    "attrs": {
      "factor": "10"
    }
  }
}



curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes/ -d '{"id":"other-node", "fn":"multiply","factor":10, "sources":["my-node"]}'

curl -i -X GET http://localhost:4002/nodes


{
  "my-node": {
    "id": "my-node",
    "attrs": {
      "factor": 10
    },
    "sources": [
      "my-node"
    ]
  },
  "other-node": {
    "id": "other-node",
    "attrs": {
      "factor": 10
    },
    "sources": [
      "my-node"
    ]
  }
}

curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes/my-node/message -d '{"value":100}'

curl -i -X GET http://localhost:4002/nodes

{
  "my-node": {
    "id": "my-node",
    "message": {
      "value": 100
    },
    "attrs": {
      "factor": 10
    }
  },
  "other-node": {
    "id": "other-node",
    "message": {
      "value": 100
    },
    "attrs": {
      "factor": 10
    },
    "sources": [
      "my-node"
    ]
  }
}



curl -i -X DELETE http://localhost:4002/nodes/my-node

```





## Release History

* 23/11/2013 0.0.1 Initial release

## License
Copyright (c) 2013 Simon Swain
Licensed under the MIT license.
