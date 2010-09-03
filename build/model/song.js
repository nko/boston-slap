var Base, Song, redis;
var __bind = function(func, context) {
    return function(){ return func.apply(context, arguments); };
  }, __extends = function(child, parent) {
    var ctor = function(){};
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.prototype.constructor = child;
    if (typeof parent.extended === "function") parent.extended(child);
    child.__super__ = parent.prototype;
  };
Base = require('./base');
redis = require('../redis');
Song = function() {
  return Base.apply(this, arguments);
};
__extends(Song, Base);
Song.prototype.name = 'song';
Song.prototype.properties = ['title', 'album_id', 'artist_id', 'artist_name', 'album_name', 'genre', 'rating', 'mtime', 'path'];
Song.prototype.save = function(path, cb) {
  if (!cb) {
    cb = path;
    path = null;
  }
  return Song.__super__.save.call(this, __bind(function(error, song) {
    if (error) {
      return cb(error);
    }
    return !path ? cb(null, this) : redis.addLink('path', encodeURI(path), this.id, function(error) {
      if (error) {
        return cb(error);
      }
      return cb(null, this);
    });
  }, this));
};
module.exports = Song;