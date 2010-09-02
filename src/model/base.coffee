redis = require '../redis'

class Base
  constructor: (data) ->
    @data = data or {}

  id:         null
  name:       null
  properties: []
  data:       {}

  get: (name, def) ->
    if @data[name]? then @data[name] else def

  set: (name, value) ->
    @data[name] = value
    this

  exists: (cb) ->

  save: (cb) ->
    redis.saveModel this, cb

module.exports = Base
