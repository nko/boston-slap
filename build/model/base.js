var Base, redis;
redis = require('../redis');
Base = function(data) {
  this.data = data || {};
  return this;
};
Base.prototype.id = null;
Base.prototype.name = null;
Base.prototype.properties = [];
Base.prototype.data = {};
Base.prototype.get = function(name, def) {
  var _a;
  return (typeof (_a = this.data[name]) !== "undefined" && _a !== null) ? this.data[name] : def;
};
Base.prototype.set = function(name, value) {
  this.data[name] = value;
  return this;
};
Base.prototype.exists = function(cb) {};
Base.prototype.save = function(cb) {
  return redis.saveModel(this, cb);
};
module.exports = Base;