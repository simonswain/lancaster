var env = process.env.NODE_ENV || 'dev';

var key = 'lc';

var redis = {
  host: '127.0.0.1',
  port: 6379,
  prefix: key + '_' + env
};

var cassandra = {
  hosts: ['localhost:9042','localhost:9042'],
  keyspace: key + '_' + env,
  quorum: 1
};

switch ( env ) {
case 'test' :
  exports.port = 4003;
  cassandra.keyspace = key + '_test';
  break;

case 'dev' :
  exports.port = 4002;
  cassandra.keyspace = key + '_dev';
  break;

case 'live' :
  exports.listen = '/tmp/' + key + '.sock';
  cassandra.keyspace = key + '_live';
  break;
}

exports.env = env;
//exports.cassandra = cassandra;
exports.redis = redis;
