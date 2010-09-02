var Album, Artist, ID3, Song, Task, addToQueue, config, dirs, fs, fullScan, isMedia, mtimes, next, path_m, queue, queueUpdated, redis, saveAlbum, saveArtist, scanDirectory, utils, watchDirectory, working;
ID3 = require('id3');
redis = require('./redis');
utils = require('./utils');
config = require('./config');
fs = require('fs');
path_m = require('path');
Song = require('./model/song');
Artist = require('./model/artist');
Album = require('./model/album');
Task = require('parallel').Task;
saveArtist = function(song, tags, cb) {
  var artist;
  artist = new Artist({
    name: song.get('artist_name')
  });
  console.dir(artist);
  artist.id = artist.get('name').trim().toLowerCase().replace(/\s+/g, '_');
  return artist.save(function(error, id) {
    if (error) {
      return cb(error);
    }
    artist.id = id;
    song.set('artist_id', id);
    return saveAlbum(artist, song, tags, cb);
  });
};
saveAlbum = function(artist, song, tags, cb) {
  var album;
  album = new Album({
    name: song.get('album_name'),
    year: tags.get('year') || ''
  });
  return album.save(function(error, id) {
    var link_task;
    if (error) {
      return cb(error);
    }
    album.id = id;
    link_task = new Task({
      artist: [redis.addModelLink, artist, album],
      album: [redis.addModelLink, album, song]
    });
    error = null;
    return link_task.run(function(task, err) {
      if (err) {
        error = err;
      }
      if (!task) {
        if (error) {
          return cb(error);
        }
        return cb(null, song);
      }
    });
  });
};
working = false;
queue = [];
mtimes = [];
addToQueue = function(filename, stat) {
  if (queue.indexOf(filename) === -1) {
    queue.unshift(filename);
    mtimes.unshift(stat.mtime);
  }
  return queueUpdated();
};
queueUpdated = function() {
  var addMore, createSong, done, mtime, path, path_e, populate, song, tags;
  if (working) {
    return null;
  }
  if (queue.length === 0) {
    return null;
  }
  working = true;
  path = queue.pop();
  path_e = encodeURI(path);
  mtime = mtimes.pop();
  tags = (song = null);
  fs.readFile(path, function(error, buffer) {
    if (error) {
      return next();
    }
    tags = new ID3(buffer);
    tags.parse();
    console.log(path_e);
    redis.getLink('path', path_e, createSong);
    return next();
  });
  createSong = function(error, data) {
    if (error) {
      return null;
    }
    return data ? redis.getModel(new Song(), data, populate) : populate(null, new Song());
  };
  populate = function(error, song_model) {
    if (error) {
      return null;
    }
    song = song_model;
    song.set('title', (tags.get('title')) || 'Unknown');
    song.set('artist_name', (tags.get('artist')) || 'Unknown');
    song.set('album_name', (tags.get('album')) || 'Unknown');
    song.set('mtime', mtime.getTime());
    song.set('genre', (tags.get('genre')) || 'Unknown');
    song.set('rating', song.get('rating', 0));
    return song.save(path, addMore);
  };
  addMore = function(error, id) {
    if (error) {
      return null;
    }
    song.id = id;
    return saveArtist(song, tags, done);
  };
  return (done = function(error) {
    var album_id, artist_id;
    if (error) {
      redis.deleteModel('song', song.id, function() {});
      artist_id = song.get('artist_id');
      album_id = song.get('album_id');
      if (artist_id) {
        actions.push("link:artist:" + (artist_id) + ":song");
        redis.deleteModel('artist', artist_id, function() {});
      }
      if (album_id) {
        actions.push("link:album:" + (album_id) + ":song");
        redis.deleteModel('album', album_id, function() {});
      }
      redis.deleteLink('path', path_e, function(error) {
        if (error) {
          return null;
        }
      });
      return redis["delete"](actions, function(error) {
        if (error) {
          return null;
        }
      });
    } else {
      return song.save(function() {});
    }
  });
};
next = function() {
  working = false;
  return queueUpdated();
};
dirs = [];
watchDirectory = function(dir) {
  if (dirs.indexOf(dir) !== -1) {
    return null;
  }
  dirs.push(dir);
  return fs.watchFile(dir, function(current, previous) {
    return current.getTime() > previous.getTime() ? scanDirectory(dir) : null;
  });
};
scanDirectory = function(dir, cb) {
  return fs.readdir(dir, function(error, list) {
    var _a, _b, _c, _d;
    if (error) {
      console.error(error);
    }
    _a = []; _c = list;
    for (_b = 0, _d = _c.length; _b < _d; _b++) {
      (function() {
        var filename = _c[_b];
        return _a.push(isMedia(filename) ? fs.stat(filename, function(error, stat) {
          if (error) {
            return null;
          }
          return addToQueue(path_m.join(filename, dir), stat);
        }) : null);
      })();
    }
    return _a;
  });
};
isMedia = function(filename) {
  return config.filetypes.indexOf(path_m.extname(filename)) !== -1;
};
fullScan = function(cb) {
  return utils.directoryWalker(config.music_dir, function(filename, dirname, path) {
    if (this.isDirectory()) {
      return watchDirectory(path);
    }
    return isMedia(filename) ? addToQueue(path, this) : null;
  });
};
fullScan();
setInterval(fullScan, 1200000);