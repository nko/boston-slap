# Scan for music and stuff, update database
ID3    = require 'id3'
redis  = require './redis'
utils  = require './utils'
config = require './config'
fs     = require 'fs'
path_m = require 'path'
Song   = require './model/song'
Artist = require './model/artist'
Album  = require './model/album'
Task   = require('parallel').Task

saveArtist = (song, tags, cb) ->
  artist = new Artist
    name: song.get 'artist_name'
  console.dir artist
  artist.id = artist.get('name').trim().toLowerCase().replace /\s+/g, '_'
  artist.save (error, id) ->
    return cb error if error
    artist.id = id
    song.set 'artist_id', id
    saveAlbum artist, song, tags, cb

saveAlbum = (artist, song, tags, cb) ->
  album = new Album
    name: song.get 'album_name'
    year: tags.get('year') or ''
  album.save (error, id) ->
    return cb error if error
    album.id  = id
    link_task = new Task
      artist: [redis.addModelLink, artist, album]
      album:  [redis.addModelLink, album, song]
    error     = null
    link_task.run (task, err) ->
      error = err if err
      if not task
        return cb error if error
        cb null, song

working = no
queue   = []
mtimes  = []
addToQueue = (filename, stat) ->
  if queue.indexOf(filename) is -1
    queue.unshift  filename
    mtimes.unshift stat.mtime
  queueUpdated()
queueUpdated = ->
  return if working
  return if queue.length is 0

  working = yes
  path    = queue.pop()
  path_e  = encodeURI path
  mtime   = mtimes.pop()
  tags    = song = null
  fs.readFile path, (error, buffer) ->
    return next() if error
    tags = new ID3 buffer
    tags.parse()
    console.log path_e
    redis.getLink 'path', path_e, createSong
    next()
  createSong = (error, data) ->
    return if error
    if data then redis.getModel new Song, data, populate
    else populate null, new Song
  populate = (error, song_model) ->
    return if error
    song = song_model
    song.set 'title',       (tags.get 'title')  or 'Unknown'
    song.set 'artist_name', (tags.get 'artist') or 'Unknown'
    song.set 'album_name',  (tags.get 'album')  or 'Unknown'
    song.set 'mtime',       mtime.getTime()
    song.set 'genre',       (tags.get 'genre')  or 'Unknown'
    song.set 'rating',      song.get 'rating', 0
    song.save path, addMore
  addMore = (error, id) ->
    return if error
    song.id = id
    saveArtist song, tags, done
  done = (error) ->
    if error
      redis.deleteModel 'song', song.id, ->
      artist_id = song.get 'artist_id'
      album_id  = song.get 'album_id'
      if artist_id
        actions.push "link:artist:#{artist_id}:song"
        redis.deleteModel 'artist', artist_id, ->
      if album_id
        actions.push "link:album:#{album_id}:song"
        redis.deleteModel 'album', album_id, ->
      redis.deleteLink  'path', path_e, (error) -> return if error
      redis.delete      actions,        (error) -> return if error
    else song.save ->

next = ->
  working = no
  queueUpdated()

dirs = []
watchDirectory = (dir) ->
  return if dirs.indexOf(dir) isnt -1
  dirs.push dir
  fs.watchFile dir, (current, previous) ->
    if current.getTime() > previous.getTime()
      scanDirectory dir
scanDirectory = (dir, cb) ->
  fs.readdir dir, (error, list) ->
    console.error error if error
    for filename in list
      if isMedia filename
        fs.stat filename, (error, stat) ->
          return if error
          addToQueue path_m.join(filename, dir), stat
isMedia = (filename) ->
  config.filetypes.indexOf(path_m.extname filename) isnt -1
fullScan = (cb) ->
  utils.directoryWalker config.music_dir, (filename, dirname, path) ->
    return watchDirectory path if @isDirectory()
    if isMedia filename then addToQueue path, this

# Do a full scan every 20 minutes and on startup
fullScan()
setInterval fullScan, 1200000
