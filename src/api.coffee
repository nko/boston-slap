sys = require 'sys'

module.exports = ->
  (request, response, next, path) ->
    response.sendJson
      result:
        path: path

respondWith404 = (request, response) ->
  response.sendBody 404,
    error: "Resource not found"
