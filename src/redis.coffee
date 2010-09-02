redis  = require '../deps/redis-client/lib/redis-client'
config = require './config'
spawn  = require('child_process').spawn
Task   = require('parallel').Task

server = exports.server = spawn config.redis_exec, [config.redis_conf]

server.stdout.on 'data', (data) -> console.log "[redis] " + data.toString()
server.stderr.on 'data', (data) -> console.log "[redis] " + data.toString()

client = exports.client = redis.createClient config.redis_port

# Rewrite append onle file every 10 minutes and on startup
console.log '[redis] Re-writing append-only file'
client.sendCommand 'BGREWRITEAOF'
setInterval ->
  client.sendCommand 'BGREWRITEAOF'
, 300000

exports.delete  = client.del
exports.hDelete = client.hdel

exports.saveModel = (model, cb) ->
  model_key = keys = null
  is_new    = no

  insert = (error, id) ->
    return cb error if error
    model.id  = id.toString()
    model_key = "#{model.name}:#{id}"
    data      = [model_key]
    keys      = Object.keys model.data
    for key in keys
      data.push key
      data.push model.data[key]
    console.dir data
    client.hmset data, afterInsert

  if model.id then insert null, model.id
  else
    is_new = yes
    client.incr "ids:#{model.name}", insert

  afterInsert = (error, result) ->
    return cb error if error
    client.sadd "collection:#{model.name}", model.id, ->
    return client.hkeys model_key, deleteKeys unless is_new
    cb null, model
  deleteKeys = (error, result) ->
    return cb error if error
    delete_task = new Task
    for key in keys when result.indexOf(key) isnt -1
      delete_task.add key, [client.hdel, model_key, key]
    error = null
    delete_task.run (task, err) ->
      error = err if err
      if not task
        return cb error if error
        cb null, model

exports.getModel = (model, id, cb) ->
  props = model.properties
  client.hmget "#{model.name}:#{id}", props, (error, result) ->
    return cb error if error
    model.id = id
    for i, prop in props
      model.set prop, result[i]
    cb null, model

exports.deleteModel = (type, id, cb) ->
  task = new Task
    collection: [client.srem, "collection:#{type}", id]
    model:      [client.del, "#{type}:#{id}"]
  error = null
  task.run (task, err) ->
    error = err if err
    if not task
      return cb error if error
      cb null, true

exports.addLink = (type, from, to, cb) ->
  client.hset "link:#{type}", from, to.id, cb

exports.getLink = (type, id, cb) ->
  client.hget "link:#{type}", id, cb

exports.deleteLink = (type, id, cb) ->
  client.hdel "link:#{type}", id, cb

exports.addModelLink = (from, to, cb) ->
  cb new Error 'id missing' if not from.id or to.id
  client.sadd "link:#{from.name}:#{from.id}:#{to.name}", to.id, cb

exports.getModelLinks = (type, model, cb) ->
  cb new Error 'id missing' if not model.id
  client.smembers "link:#{model.name}:#{model.id}:#{type}", cb

exports.deleteModelLinks = (type, model, cb) ->
  cb new Error 'id missing' if not model.id
  client.del "link:#{model.name}:#{model.id}:#{type}", cb
