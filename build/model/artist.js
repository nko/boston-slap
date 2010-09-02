var Artist, Base;
var __extends = function(child, parent) {
    var ctor = function(){};
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.prototype.constructor = child;
    if (typeof parent.extended === "function") parent.extended(child);
    child.__super__ = parent.prototype;
  };
Base = require('./base');
Artist = function() {
  return Base.apply(this, arguments);
};
__extends(Artist, Base);
Artist.prototype.name = 'artist';
Artist.prototype.properties = ['name'];
module.exports = Artist;