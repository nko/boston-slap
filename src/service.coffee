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

idFromString = (string) ->
  string.trim().toLowerCase().replace /[^a-z0-9]+/ig, '-'

saveArtist = (song, tags, cb) ->
  artist = new Artist
    name: song.get 'artist_name'
  artist.lower = idFromString artist.get 'name'
  redis.getLink 'artist', artist.lower, (error, result) ->
    return cb error if error
    if result
      artist.id = result.toString()
      done()
    else artist.save saved
  saved = (error) ->
    return cb error if error
    song.set 'artist_id', artist.id
    done()
  done = -> saveAlbum artist, song, tags, cb

saveAlbum = (artist, song, tags, cb) ->
  album = new Album
    name: song.get 'album_name'
    year: tags.get('year') or ''
  album_lower = idFromString album.get 'name'
  song_lower  = idFromString song.get 'title'
  redis.getLink "artist:#{artist.id}", album_lower, (error, link) ->
    return cb error if error
    album.id = link.toString() if link
    album.save saved
  saved = (error, model) ->
    return cb error if error
    song.set 'album_id', album.id
    link_task = new Task
      song:    [redis.addLink, "song", "#{song_lower}:#{artist.lower}:#{album_lower}", song.id]
      artist:  [redis.addModelLink, artist, album]
      artist2: [redis.addLink, 'artist', artist.lower, artist.id]
      album:   [redis.addModelLink, album, song]
      album2:  [redis.addLink, "artist:#{artist.id}", album_lower, album.id]
    error = null
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
  mtime   = mtimes.pop().getTime()
  tags    = song = null
  redis.getLink 'path', path_e, (error, data) ->
    return if error
    if data then redis.getModel new Song, data.toString(), populate
    else populate null, new Song
  populate = (error, song_model) ->
    return next() if error
    song = song_model
    prev_mtime = +(song.get 'mtime', 0)
    return next() if prev_mtime >= mtime
    fs.readFile path, parseSong
  parseSong = (error, buffer) ->
    if error
      return redis.deleteLink 'path', path_e, -> next()
    tags = new ID3 buffer
    tags.parse()
    song.set 'title',       (tags.get 'title')  or 'Unknown'
    song.set 'artist_name', (tags.get 'artist') or 'Unknown'
    song.set 'album_name',  (tags.get 'album')  or 'Unknown'
    song.set 'mtime',       mtime
    song.set 'genre',       (tags.get 'genre')  or 'Unknown'
    song.set 'rating',      song.get 'rating', 0
    song.set 'path',        path
    song_lower  = idFromString song.get 'title'
    artist_id   = idFromString song.get 'artist_name'
    album_lower = idFromString song.get 'album_name'
    redis.getLink 'song', "#{song_lower}:#{artist_id}:#{album_lower}", saveSong
  saveSong = (error, song_id) ->
    return next() if error
    if song_id then song.id = song_id.toString()
    song.save path, addMore
    next()
  addMore = (error, model) ->
    return if error
    saveArtist song, tags, done
  done = (error) ->
    if error
      redis.deleteModel 'song', song.id, (error) -> return if error
      artist_id = song.get 'artist_id'
      album_id  = song.get 'album_id'
      actions   = []
      if artist_id
        actions.push "link:artist:#{artist_id}:album"
        actions.push "link:artist:#{artist_id}"
        redis.deleteModel 'artist', artist_id, (error) -> return if error
      if album_id
        actions.push "link:album:#{album_id}:song"
        redis.deleteModel 'album', album_id, (error) -> return if error
      redis.deleteLink  'path', path_e, (error) -> return if error
      redis.delete      actions,        (error) -> return if error
    else
      console.log "[Index] Added: #{song.get 'title'} - #{song.get 'artist_name'} (#{song.get 'album_name'})"
      song.save ->

next = ->
  working = no
  queueUpdated()

dirs = []
watchDirectory = (dir) ->
  return if dirs.indexOf(dir) isnt -1
  dirs.push dir
  fs.watchFile dir, (current, previous) ->
    scanDirectory dir
scanDirectory = (dir, cb) ->
  fs.readdir dir, (error, list) ->
    return console.error error if error
    task = new Task
    for filename in list
      if isMedia filename
        task.add filename, [fs.stat, path.join dir, filename]
      else if stat.isDirectory()
        ((dir) -> scanDirectory dir, -> watchDirectory dir)(path.join dir, filename)
    task.run (filename, error, stat) ->
      if not task then cb()
      else if stat
        addToQueue path.join(dir, filename), stat

isMedia = (filename) ->
  config.filetypes.indexOf(path_m.extname filename) isnt -1
fullScan = (cb) ->
  watchDirectory config.music_dir
  utils.directoryWalker config.music_dir, (filename, dirname, path) ->
    return watchDirectory path if @isDirectory()
    if isMedia filename then addToQueue path, this

# Do a full scan every 20 minutes and on startup
redis.onLoad fullScan
setInterval fullScan, config.service_interval * 60 * 1000

# Clean up, cleanup, everybody everywhere
cleanIndex = exports.cleanIndex = ->
  # TODO: Find broken paths, remove un-used albums
  # and artists

# Expires all the mtimes and forces a re-crawl
exports.reIndex = ->
  redis.getCollection 'song', (error, songs) ->
    return console.error error if error
    for song in songs
      song = song.toString()
      redis.hSet "song:#{song}", 'mtime', 0
    fullScan()
