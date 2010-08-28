sys = require 'sys'

module.exports = ->
  args = arguments
  (request, response, next) ->
    response.sendBody sys.inspect args
