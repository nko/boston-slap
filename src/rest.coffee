sys   = require 'sys'
redis = require './redis'
api   = require './api'
fs    = require 'fs'
pathm = require 'path'

module.exports = ->
  (request, response, next, path) ->
    [resource, id, action] = path.split '/'
    if resource is 'song' and action is 'download'
      api.get 'song', id, null, (error, song) ->
        return respondWith404 request, response if error or not song.id
        sendFile request, response, song.get 'path'
    else
      api.get resource, id, null, (error, result) ->
        return respondWith404 request, response if error
        handleResult request, response, result

handleResult = (request, response, result) ->
  if Buffer.isBuffer result
    result.toString()
  else if Array.isArray result
    result = model.data for model in result
  else if result.data then result = result.data
  response.sendJson 200,
    result: result

sendFile = (request, response, path) ->
  fs.stat path, (error, stat) ->
    return respondWith404 request, response if error
    mime = switch pathm.extname path
      when '.m4a' then 'audio/mp4a-latm'
      else 'audio/mpeg'
    response.writeHead 200,
      'Content-Type':   mime
      'Content-Length': stat.size
      'Last-Modified':  stat.mtime.toUTCString()
      'Expires':        new Date(Date.now() + 31536000000).toUTCString()
      'Cache-Control': 'public max-age=' + 31536000
    file = fs.createReadStream path
    sys.pump file, response
    file.on 'end', -> response.end()

respondWith404 = (request, response) ->
  response.sendJson 404,
    error: "Resource not found"
