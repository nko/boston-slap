var Task, callbacks, client, config, redis, server, spawn;
redis = require('../deps/redis-client/lib/redis-client');
config = require('./config');
spawn = require('child_process').spawn;
Task = require('parallel').Task;
server = (exports.server = spawn(config.redis_exec, [config.redis_conf]));
server.stdout.on('data', function(data) {
  return console.log("[redis] " + data.toString());
});
server.stderr.on('data', function(data) {
  return console.log("[redis] " + data.toString());
});
client = (exports.client = null);
callbacks = [];
setTimeout(function() {
  var _a, _b, _c, callback;
  client = (exports.client = redis.createClient(config.redis_port));
  _b = callbacks;
  for (_a = 0, _c = _b.length; _a < _c; _a++) {
    callback = _b[_a];
    callback();
  }
  return (callbacks = []);
}, 500);
exports.onLoad = function(callback) {
  return callbacks.push(callback);
};
exports.onLoad(function() {
  console.log('[redis] Re-writing append-only file');
  return client.sendCommand('BGREWRITEAOF');
});
setInterval(function() {
  return client.sendCommand('BGREWRITEAOF');
}, config.redis_rewrite * 60 * 1000);
process.on('exit', function() {
  return server.kill();
});
exports["delete"] = function() {
  return client.del.apply(client, arguments);
};
exports.hDelete = function() {
  return client.hdel.apply(client, arguments);
};
exports.hSet = function() {
  return client.hset.apply(client, arguments);
};
exports.keyExists = function(key, cb) {
  return client.exists(key, cb);
};
exports.hKeyExists = function(hash, key, cb) {
  return client.hexists(hash);
};
exports.saveModel = function(model, cb) {
  var afterInsert, insert, is_new, keys, model_key;
  model_key = (keys = null);
  is_new = false;
  insert = function(error, id) {
    var _a, _b, _c, data, key;
    if (error) {
      return cb(error);
    }
    model.id = id.toString();
    model_key = ("" + (model.name) + ":" + (id));
    data = [model_key];
    keys = Object.keys(model.data);
    _b = keys;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      key = _b[_a];
      data.push(key);
      data.push(model.data[key]);
    }
    return client.hmset(data, afterInsert);
  };
  afterInsert = function(error, result) {
    if (error) {
      return cb(error);
    }
    client.sadd("collection:" + (model.name), model.id, function() {});
    return cb(null, model);
  };
  if (model.id) {
    return insert(null, model.id);
  } else {
    is_new = true;
    return client.incr("ids:" + (model.name), insert);
  }
};
exports.getModel = function(model, id, cb) {
  var props;
  if (!id) {
    return cb(new Error('id missing'));
  }
  props = [("" + (model.name) + ":" + (id))];
  props.push.apply(props, model.properties);
  return client.hmget(props, function(error, result) {
    var _a, _b, i, prop;
    if (error) {
      return cb(error);
    }
    _a = model.properties;
    for (i = 0, _b = _a.length; i < _b; i++) {
      prop = _a[i];
      if (result[i]) {
        model.set(prop, result[i].toString());
      }
    }
    if (Object.keys(model.data).length === 0) {
      return cb(null, model);
    }
    model.id = id;
    return cb(null, model);
  });
};
exports.deleteModel = function(type, id, cb) {
  if (!(id)) {
    return cb(new Error('id missing'));
  }
  return client.srem("collection:" + (type), id, function(error, result) {
    if (error) {
      return cb(error);
    }
    return client.del("" + (type) + ":" + (id), cb);
  });
};
exports.deleteModelField = function(model, field, cb) {
  if (!(model.id)) {
    return cb(new Error('id missing'));
  }
  return client.hdel("" + (model.name) + ":" + (model.id), field, cb);
};
exports.addLink = function(type, from, to, cb) {
  return client.hset("link:" + (type), from, to, cb);
};
exports.getLink = function(type, id, cb) {
  return client.hget("link:" + (type), id, cb);
};
exports.deleteLink = function(type, id, cb) {
  return client.hdel("link:" + (type), id, cb);
};
exports.linkExists = function(type, id, cb) {
  return client.hexists("link:" + (type), id, cb);
};
exports.addModelLink = function(from, to, cb) {
  if (!(from.id && to.id)) {
    return cb(new Error('id missing'));
  }
  return client.sadd("link:" + (from.name) + ":" + (from.id) + ":" + (to.name), to.id, cb);
};
exports.getModelLinks = function(model, type, cb) {
  if (!(model.id)) {
    return cb(new Error('id missing'));
  }
  return client.smembers("link:" + (model.name) + ":" + (model.id) + ":" + (type), cb);
};
exports.deleteModelLinks = function(model, type, cb) {
  if (!(model.id)) {
    return cb(new Error('id missing'));
  }
  return client.del("link:" + (model.name) + ":" + (model.id) + ":" + (type), cb);
};
exports.getCollection = function(type, cb) {
  return client.smembers("collection:" + (type), cb);
};