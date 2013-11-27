# Landcaster

Version 0.0.1

[![Build Status](https://travis-ci.org/simonswain/landcaster.png)](https://travis-ci.org/simonswain/landcaster)

Lancaster provides a REST based application server that lets you
configure processing topologies you inject data into and recieve
results from. 

Landcaster is designed to work with floats (javascript Numbers)

Running the Landcaster server provids you with an empty topology. 

You create nodes in the Landcaster topology.

Each node receives messages it receives, processing it with a
specified function, and outputting the result of that function.

A node can have any number of source nodes, allowing you to create signal processing chains.

Any node in the toplogy can have a value injected in to it.

All data points are stored. 

Results can be streamed out in real time over socket.io.

```bash
npm install landcaster
```

Either clone the repo, edit config.js and use `node server.js` or

```
npm install landcaster
var landcaster = require('landcaster');
var server = landcaster({ ... opts ... });
```

```bash
git clone https://github.com/simonswain/landcaster.git
cd landcaster
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


Change attributes on a node. Cannot change id, sources or fn
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
GET /nodes/:id/values
     
{message}
```



## Release History

* 23/11/2013 0.0.1 Initial release

## License
Copyright (c) 2013 Simon Swain
Licensed under the MIT license.
