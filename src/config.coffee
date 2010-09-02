path = require 'path'

module.exports =
  # The music directory
  music_dir: '/home/tim/Music'

  # Compared to path.extname output
  filetypes: ['.mp3', '.m4a']

  # Redis locations
  redis_exec: 'deps/redis/src/redis-server'
  redis_conf: 'redis.conf'
  redis_port: 7373

  # Service options
  service_workers: 2
