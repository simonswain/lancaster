"use strict";

var env = process.env.NODE_ENV || 'dev';

var key = 'lancaster';

var redis = {
  host: '127.0.0.1',
  port: 6379,
  prefix: key + '_' + env
};

switch ( env ) {
case 'test' :
  exports.port = 4003;
  break;

case 'dev' :
  exports.port = 4002;
  break;

case 'live' :
  exports.listen = '/tmp/' + key + '.sock';
  break;
}

module.exports = {
  env: env,
  redis: redis
};
