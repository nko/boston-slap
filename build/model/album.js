var Album, Base;
var __extends = function(child, parent) {
    var ctor = function(){};
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.prototype.constructor = child;
    if (typeof parent.extended === "function") parent.extended(child);
    child.__super__ = parent.prototype;
  };
Base = require('./base');
Album = function() {
  return Base.apply(this, arguments);
};
__extends(Album, Base);
Album.prototype.name = 'album';
Album.prototype.properties = ['name', 'year'];
module.exports = Album;