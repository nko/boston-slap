var Task, client, config, redis, server, spawn;
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
client = (exports.client = redis.createClient(config.redis_port));
console.log('[redis] Re-writing append-only file');
client.sendCommand('BGREWRITEAOF');
setInterval(function() {
  return client.sendCommand('BGREWRITEAOF');
}, 300000);
exports["delete"] = client.del;
exports.hDelete = client.hdel;
exports.saveModel = function(model, cb) {
  var afterInsert, deleteKeys, insert, is_new, keys, model_key;
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
    console.dir(data);
    return client.hmset(data, afterInsert);
  };
  if (model.id) {
    insert(null, model.id);
  } else {
    is_new = true;
    client.incr("ids:" + (model.name), insert);
  }
  afterInsert = function(error, result) {
    if (error) {
      return cb(error);
    }
    client.sadd("collection:" + (model.name), model.id, function() {});
    if (!(is_new)) {
      return client.hkeys(model_key, deleteKeys);
    }
    return cb(null, model);
  };
  return (deleteKeys = function(error, result) {
    var _a, _b, _c, delete_task, key;
    if (error) {
      return cb(error);
    }
    delete_task = new Task();
    _b = keys;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      key = _b[_a];
      if (result.indexOf(key) !== -1) {
        delete_task.add(key, [client.hdel, model_key, key]);
      }
    }
    error = null;
    return delete_task.run(function(task, err) {
      if (err) {
        error = err;
      }
      if (!task) {
        if (error) {
          return cb(error);
        }
        return cb(null, model);
      }
    });
  });
};
exports.getModel = function(model, id, cb) {
  var props;
  props = model.properties;
  return client.hmget("" + (model.name) + ":" + (id), props, function(error, result) {
    var _a, _b, i, prop;
    if (error) {
      return cb(error);
    }
    model.id = id;
    _a = props;
    for (prop = 0, _b = _a.length; prop < _b; prop++) {
      i = _a[prop];
      model.set(prop, result[i]);
    }
    return cb(null, model);
  });
};
exports.deleteModel = function(type, id, cb) {
  var error, task;
  task = new Task({
    collection: [client.srem, ("collection:" + (type)), id],
    model: [client.del, ("" + (type) + ":" + (id))]
  });
  error = null;
  return task.run(function(task, err) {
    if (err) {
      error = err;
    }
    if (!task) {
      if (error) {
        return cb(error);
      }
      return cb(null, true);
    }
  });
};
exports.addLink = function(type, from, to, cb) {
  return client.hset("link:" + (type), from, to.id, cb);
};
exports.getLink = function(type, id, cb) {
  return client.hget("link:" + (type), id, cb);
};
exports.deleteLink = function(type, id, cb) {
  return client.hdel("link:" + (type), id, cb);
};
exports.addModelLink = function(from, to, cb) {
  if (!from.id || to.id) {
    cb(new Error('id missing'));
  }
  return client.sadd("link:" + (from.name) + ":" + (from.id) + ":" + (to.name), to.id, cb);
};
exports.getModelLinks = function(type, model, cb) {
  if (!model.id) {
    cb(new Error('id missing'));
  }
  return client.smembers("link:" + (model.name) + ":" + (model.id) + ":" + (type), cb);
};
exports.deleteModelLinks = function(type, model, cb) {
  if (!model.id) {
    cb(new Error('id missing'));
  }
  return client.del("link:" + (model.name) + ":" + (model.id) + ":" + (type), cb);
};