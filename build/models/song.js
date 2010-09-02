var Song;
Song = function(data) {
  this.data = data || {};
  return this;
};
Song.prototype.get = function(name, def) {
  var _a;
  return (typeof (_a = this.data[name]) !== "undefined" && _a !== null) ? this.data[name] : def;
};
Song.prototype.set = function(name, value) {
  return (this.data[name] = value);
};
module.exports = Song;