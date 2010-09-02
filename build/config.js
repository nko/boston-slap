var path;
path = require('path');
module.exports = {
  music_dir: '/home/tim/Music',
  filetypes: ['.mp3', '.m4a'],
  redis_exec: 'deps/redis/src/redis-server',
  redis_conf: 'redis.conf',
  redis_port: 7373,
  service_workers: 2
};