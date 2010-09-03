Base  = require './base'
redis = require '../redis'

class Song extends Base
  name: 'song'

  properties: [
    'title',       'album_id',   'artist_id'
    'artist_name', 'album_name', 'genre'
    'rating',      'mtime',      'path'
  ]

  save: (path, cb) ->
    if not cb
      cb   = path
      path = null
    super (error, song) =>
      return cb error if error
      if not path then cb null, this
      else redis.addLink 'path', encodeURI(path), @id, (error) ->
        return cb error if error
        cb null, this

module.exports = Song
