#!/bin/bash

curl -i -X POST http://localhost:4002/reset
curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes -d '{"id":"my-node", "x":192, "y":64, "fn":"multiply","attrs":{"factor":10}}'
curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes -d '{"id":"other-node", "x":256, "y":64, "fn":"multiply","attrs":{"factor":2}, "sources":["my-node"]}'
curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes/my-node/message -d '{"value":100}'

# inject
#curl -i -H "Content-Type: application/json" -X POST http://localhost:4002/nodes/my-node/message -d '{"value":100}'
