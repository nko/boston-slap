sys = require 'sys'

module.exports = ->
  (request, response, next) ->
    response.sendBody sys.inspect arguments
