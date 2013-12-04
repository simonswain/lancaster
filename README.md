# Lancaster

Version 0.0.1

[![Build Status](https://travis-ci.org/simonswain/lancaster.png)](https://travis-ci.org/simonswain/lancaster)

Lancaster provides a REST based application server that lets you
configure processing topologies you inject data into and recieve
results from.

Lancaster is designed to work with messages containing a time (UTC
epoch milliseconds) and a value (Number)

```json
{at: 1386197370482, value: 100.00}
```

Running the Lancaster server provids you with an empty topology.

You create nodes in the Lancaster topology.

Each node processes messages it receives with a specified function,
and outputting the result of that function.

Landcaster contains a predefined set of functions for averaging,
filtering and alerting data.

Some functions have parameters that control their operation.

Once set for a node a function cannot be changed, but parameters can
be adjusted.

Some functions are stateful (eg average over time) and such state is
stored and will be retrieved in case of restarting the server.

A node can have any number of source nodes, allowing you to create
signal processing and switching chains, and combine multiple inputs in
to a single output stream.

Any node in the toplogy can have a value injected in to it.

All data points (outputs of nodes) are stored and history of a node
can be retrieved.

Results can be streamed out in real time via sock.js.

## Installing

Landcaster requires Redis and Cassandra


```bash
npm install lancaster
```

Either clone the repo, edit config.js and use `node server.js` or

```
npm install lancaster
var lancaster = require('lancaster');
var server = lancaster({ ... opts ... });
```

```bash
git clone https://github.com/simonswain/lancaster.git
cd lancaster
npm install
cp config.sample.js config.js
node server
```

## REST methods

Ping test to check server is up
```
GET /ping

{pong: <unix-epoch-ms>}
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


Change attributes on a node. Cannot change `id`, `sources` or `fn`
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
curl -i -X GET http://localhost:4002/ping
curl -i -X GET http://localhost:4002/nodes
curl -i -X GET http://localhost:4002/nodes/unknown-node

curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes/ -d '{"id":"my-node", "fn":"multiply","factor":10}'

curl -i -X GET http://localhost:4002/nodes/my-node

{
  "my-node": {
    "id": "my-node",
    "attributes": {
      "factor": "10"
    }
  }
}



curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes/ -d '{"id":"other-node", "fn":"multiply","factor":10, "sources":["my-node"]}'

curl -i -X GET http://localhost:4002/nodes


{
  "my-node": {
    "id": "my-node",
    "attributes": {
      "factor": 10
    },
    "sources": [
      "my-node"
    ]
  },
  "other-node": {
    "id": "other-node",
    "attributes": {
      "factor": 10
    },
    "sources": [
      "my-node"
    ]
  }
}

curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes/my-node/message -d '{"value":100}'

{
  "my-node": {
    "id": "my-node",
    "val": {
      "value": 100
    },
    "attributes": {
      "factor": "10"
    }
  }
}

```





## Release History

* 23/11/2013 0.0.1 Initial release

## License
Copyright (c) 2013 Simon Swain
Licensed under the MIT license.
