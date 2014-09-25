module.exports = function(env){

  var env = process.env.NODE_ENV || 'development';

  var prefix = 'df:' + env;

  var redis = {
    host: '127.0.0.1',
    port: 6379,
  };

  var server = {
    host: '127.0.0.1',
    port: 4002
  };

  switch ( env ) {
  case 'test' :
    server.port = 4003;
    break;

  case 'development' :
    server.port = 4002;
    break;

  case 'production' :
    server.port = 4001;
    break;
  }

  return {
    prefix: prefix,
    env: env,
    redis: redis,
    server: server
  };

};
