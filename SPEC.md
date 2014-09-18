Topology Server
---------------

The server provides a persistent (survives restarts) dynamic (can add
and remove nodes at will) dataflow system.

Nodes are identified by a user-supplied id (uri friendly slug format
-- all lower case, a-z and -)

Nodes receive and output messages.

Messages can be injected in to any node in the topology. Which nodes
will depend on use-case.

Messages can be streamed out of the topology, and a node's most recent
output is latched and can be read directly.

Each node can have one or more inputs from other nodes (`sources`) and
may choose to output or not when in receives a message.

Each node has a hash of attributes. Attributes can be changed at any
time, and are persisted.

The API allows for addition, deletion of nodes, injection of messages
to a node and and changing attributes on a node.

Each node is assigned a processing function. Functions are pre-defined
per server instance. The built-in functions can be augmented by
user-provided functions, but they are intended to be preset before the
server is started, not added dynamically.

Processing functions can use attributes as inputs (eg a value to
compare against) and can modify attributes as outputs (eg maintaining
a count, average or time).

An example use case is for the low level implementation a real-time
data processing system where end-users are configuring some kind of
logic. The application would hide detail of the topology, connect
several nodes together in the background and start feeding data
through, just providing a simple friendly interface, while using the
server to do the heavy lifiting.

Messages streamed out of the topology could be listened to and stored
in a database to provide historical data

Operation
---------

* When nodes are created or attrs set they are saved in Redis
* Messages are injected in to a Redis queue.
* A main loop pulls messages (containing a target node_id and data) off the queue
* The node is instantiated (pulling description and state from Redis)
* The node's function is applied to the message
* Node attrs (they may have been changed) are saved back to Redis,
* Result of the function is latched on the node's output (saved to Redis)
* The output message is distributed to any other nodes that source from this node (by injecting them in to the message queue)
* The message is output to the stream

This works for a single instance now.

The reason for the saving/loading to Redis is to allow it to scale

Multiple workers instances (different processes, cpus or machines)
will pull messages from the queue.

Each one will read, process, write, repeat.

To stop rapid messages for one node being processed in parallel
(creating a race condition on that node's data) I think there will
have to be multiple queues, with the node_id's hashed to distribute
them across machines.

Each machine will pull from it's own queue, managing the processing
for a subset of the nodes.

The master will have to take care of distributing messages in to the
appropriate queue - this will only scale so far though.

This limits the thruput for any given node to what one cpu can
achieve.

A master process will have to monitor (with keepalive pings) the
workers and if one goes down reallocate any pending messages it has to
other workers (either notify the new worker it has another queue to
pull from, or simply inject the messages in to an existing queue).

The master will have to have a secondary ready to take over if it
fails. Possibly this is something the workers can do between
themselves.

The master will also identify and new machines joining the cluster,
provide them with config data (ie where is Redis) and start
distributing messages to them.

Ideally it should be possible to add/remove machines at any time to
scale up/down. Incoming machines should only have to know where the
master(s) are, report for duty and await instructions.

Each machine, when it pulls a message from the queue should write it
to a 'to be processed' queue (redis has an atomic command for this)
and then clear it once successfully processed. This will allow for
recovery and retry of messages lost when a node dies.


API
---

Client apps can use via node's require() the API directly (which
basically just reads/writes to Redis so long as it's not processing
messages) with an event emitter to provide output messages.

The workers instances use exactly the same codebase, but call a method
to start processing.

The primary interface will be a lightweight REST server for commands,
with websockets streaming out all messages as they are produced. This
can be load-balanced to scale up, and runs independant of the
processing workers.



