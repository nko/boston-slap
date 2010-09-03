var path;
path = require('path');
module.exports = {
  music_dir: '/home/tim/Music',
  filetypes: ['.mp3', '.m4a'],
  http_port: 8080,
  redis_exec: 'deps/redis/src/redis-server',
  redis_conf: 'redis.conf',
  redis_port: 7373,
  redis_rewrite: 20,
  service_workers: 2,
  service_interval: 20
};