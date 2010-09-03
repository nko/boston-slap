path = require 'path'

module.exports =
  # The music directory
  music_dir: '/home/tim/Music'

  # Compared to path.extname output
  filetypes: ['.mp3', '.m4a']

  # Serve API on which port?
  http_port: 8080

  # Redis locations
  redis_exec:    'deps/redis/src/redis-server'
  redis_conf:    'redis.conf'
  redis_port:    7373
  # How often to optimize append-onle file
  redis_rewrite: 20

  # Service options
  service_workers:  2
  # How often to rescan filesystem
  service_interval: 20
