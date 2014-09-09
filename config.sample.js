var env = process.env.NODE_ENV || 'development';

var key = 'lancaster';

var redis = {
  host: '127.0.0.1',
  port: 6379,
  prefix: key + '_' + env
};

exports.host = localhost;

switch ( env ) {
case 'test' :
  exports.port = 4003;
  break;

case 'development' :
  exports.port = 4002;
  break;

case 'production' :
  exports.port = 4001;
  break;
}

module.exports = {
  env: env,
  redis: redis
};
