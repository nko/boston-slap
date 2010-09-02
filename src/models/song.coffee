
class Song
  constructor: (data) ->
    @data = data or {}

  get: (name, def) ->
    if @data[name]? then @data[name] else def

  set: (name, value) ->
    @data[name] = value

module.exports = Song
