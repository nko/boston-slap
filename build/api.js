var Task, not_found, redis;
redis = require('./redis');
Task = require('parallel').Task;
module.exports = {
  get: function(resource, id, action, cb) {
    var model;
    if (!(resource)) {
      return cb(not_found);
    }
    action || (action = 'show');
    action = action.toLowerCase();
    resource = resource.toLowerCase();
    try {
      model = require("./model/" + (resource));
    } catch (error) {
      return cb(error);
    }
    return !id ? redis.getCollection(resource, function(error, result) {
      var _a, _b, _c, id, results, task;
      if (error) {
        return cb(error);
      }
      task = new Task();
      _b = result;
      for (_a = 0, _c = _b.length; _a < _c; _a++) {
        id = _b[_a];
        id = id.toString();
        task.add(id, [redis.getModel, new model(), id]);
      }
      error = null;
      results = [];
      return task.run(function(task, err, instance) {
        if (err) {
          error = err;
        }
        if (!task) {
          if (error) {
            return cb(error);
          }
          return cb(null, results);
        } else {
          instance.set('_id', task);
          return results.push(instance);
        }
      });
    }) : redis.getModel(new model(), id, function(error, result) {
      if (error) {
        return cb(error);
      }
      result.set('_id', id);
      return cb(null, result);
    });
  }
};
not_found = new Error('Not Found');